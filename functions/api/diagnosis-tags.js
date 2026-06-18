const DEFAULT_LINE_HARNESS_API_URL = "https://line-harness.takumi-baseball04010.workers.dev";
const DEFAULT_LINE_LOGIN_CHANNEL_ID = "2010382261";
const ALLOWED_EVENTS = new Set(["diagnosis_completed", "line_cta_clicked"]);

export async function onRequest(context) {
  const { request, env } = context;
  const headers = corsHeaders(request, env);

  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers });
  }

  if (request.method !== "POST") {
    return json({ success: false, error: "Method not allowed" }, 405, headers);
  }

  try {
    const apiKey = env.LINE_HARNESS_API_KEY;
    if (!apiKey) {
      return json({ success: false, error: "LINE_HARNESS_API_KEY is not configured" }, 500, headers);
    }

    const body = await request.json();
    const idToken = stringValue(body.idToken);
    const event = stringValue(body.event);

    if (!idToken) {
      return json({ success: false, error: "idToken is required" }, 400, headers);
    }
    if (!ALLOWED_EVENTS.has(event)) {
      return json({ success: false, error: "event is invalid" }, 400, headers);
    }

    const verified = await verifyLineIdToken(idToken, env);
    if (!verified.lineUserId) {
      return json({ success: false, error: "Invalid ID token" }, 401, headers);
    }

    const client = createLineHarnessClient(env, apiKey);
    const friend = await resolveFriend(client, verified.lineUserId);
    if (!friend?.id) {
      return json({ success: false, error: "Friend not found" }, 404, headers);
    }

    const tagNames = normalizeTags(body.tags);
    const assignedTags = await ensureTags(client, tagNames);

    for (const tag of assignedTags) {
      await client.post(`/api/friends/${encodeURIComponent(friend.id)}/tags`, { tagId: tag.id });
    }

    const metadata = buildDiagnosisMetadata(body, tagNames);
    await client.put(`/api/friends/${encodeURIComponent(friend.id)}/metadata`, metadata);

    return json({
      success: true,
      data: {
        friendId: friend.id,
        lineUserId: verified.lineUserId,
        assignedTags,
        metadata
      }
    }, 200, headers);
  } catch (error) {
    console.error("POST /api/diagnosis-tags error:", error);
    return json({ success: false, error: "Internal server error" }, 500, headers);
  }
}

function corsHeaders(request, env) {
  const origin = request.headers.get("Origin") || "";
  const allowedOrigins = (env.ALLOWED_ORIGINS || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
  const allowAny = allowedOrigins.length === 0 || allowedOrigins.includes("*");
  const allowOrigin = allowAny || allowedOrigins.includes(origin) ? (origin || "*") : allowedOrigins[0];

  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
    "Content-Type": "application/json; charset=utf-8",
    "Vary": "Origin"
  };
}

function json(payload, status = 200, headers = {}) {
  return new Response(JSON.stringify(payload), { status, headers });
}

function stringValue(value) {
  return typeof value === "string" ? value.trim() : "";
}

async function verifyLineIdToken(idToken, env) {
  const channelId = env.LINE_LOGIN_CHANNEL_ID || DEFAULT_LINE_LOGIN_CHANNEL_ID;
  const response = await fetch("https://api.line.me/oauth2/v2.1/verify", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ id_token: idToken, client_id: channelId })
  });

  if (!response.ok) {
    return { lineUserId: "" };
  }

  const data = await response.json();
  return {
    lineUserId: stringValue(data.sub),
    name: stringValue(data.name),
    email: stringValue(data.email)
  };
}

function createLineHarnessClient(env, apiKey) {
  const baseUrl = (env.LINE_HARNESS_API_URL || DEFAULT_LINE_HARNESS_API_URL).replace(/\/+$/, "");

  async function request(path, options = {}) {
    const response = await fetch(`${baseUrl}${path}`, {
      method: options.method || "GET",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
        ...(options.headers || {})
      },
      body: options.body === undefined ? undefined : JSON.stringify(options.body)
    });

    const text = await response.text();
    const payload = text ? safeJson(text) : null;
    if (!response.ok || payload?.success === false) {
      throw new Error(payload?.error || payload?.message || text || `LINE Harness API ${response.status}`);
    }
    return payload;
  }

  return {
    get: (path) => request(path),
    post: (path, body) => request(path, { method: "POST", body }),
    put: (path, body) => request(path, { method: "PUT", body })
  };
}

function safeJson(text) {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

async function resolveFriend(client, lineUserId) {
  const profile = await client.post("/api/liff/profile", { lineUserId });
  return profile?.data || null;
}

function normalizeTags(values) {
  if (!Array.isArray(values)) return [];
  const seen = new Set();
  const tags = [];

  for (const value of values) {
    const tag = stringValue(value).slice(0, 64);
    if (!tag || seen.has(tag)) continue;
    seen.add(tag);
    tags.push(tag);
    if (tags.length >= 30) break;
  }

  return tags;
}

async function ensureTags(client, names) {
  const current = await client.get("/api/tags");
  const byName = new Map((current?.data || []).map((tag) => [tag.name, tag]));
  const ensured = [];

  for (const name of names) {
    const existing = byName.get(name);
    if (existing) {
      ensured.push(existing);
      continue;
    }

    try {
      const created = await client.post("/api/tags", { name, color: tagColor(name) });
      const tag = created?.data;
      if (tag) {
        byName.set(name, tag);
        ensured.push(tag);
      }
    } catch (error) {
      const refetched = await client.get("/api/tags");
      const tag = (refetched?.data || []).find((item) => item.name === name);
      if (!tag) throw error;
      byName.set(name, tag);
      ensured.push(tag);
    }
  }

  return ensured;
}

function tagColor(name) {
  if (name.includes("白龍")) return "#F8FAFC";
  if (name.includes("緑龍")) return "#22C55E";
  if (name.includes("月龍")) return "#A78BFA";
  if (name.includes("金龍")) return "#F59E0B";
  if (name.includes("診断")) return "#06B6D4";
  if (name.includes("老後") || name.includes("支払い")) return "#EF4444";
  if (name.includes("家族")) return "#10B981";
  if (name.includes("相談")) return "#8B5CF6";
  return "#3B82F6";
}

function buildDiagnosisMetadata(body, tagNames) {
  const occurredAt = stringValue(body.occurredAt) || new Date().toISOString();
  const result = isObject(body.result) ? body.result : {};

  return {
    ryujinDiagnosis: {
      diagnosisId: stringValue(body.diagnosisId),
      event: stringValue(body.event),
      entry: stringValue(body.entry),
      delivery: stringValue(body.delivery),
      occurredAt,
      tags: tagNames,
      result,
      profile: isObject(body.profile) ? body.profile : {},
      source: isObject(body.source) ? body.source : {},
      page: isObject(body.page) ? body.page : {}
    },
    ryujin_diagnosis_id: stringValue(body.diagnosisId),
    ryujin_main_type: stringValue(result.mainType),
    ryujin_main_type_name: stringValue(result.mainTypeName),
    ryujin_sub_type: stringValue(result.subType),
    ryujin_sub_label: stringValue(result.subLabel),
    ryujin_entry: stringValue(body.entry),
    ryujin_last_event: stringValue(body.event),
    ryujin_last_completed_at: occurredAt
  };
}

function isObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
