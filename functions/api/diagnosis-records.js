const DEFAULT_LINE_HARNESS_API_URL = "https://line-harness.takumi-baseball04010.workers.dev";
const MAX_LIMIT = 200;

export async function onRequest(context) {
  const { request, env } = context;
  const headers = {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store"
  };

  if (request.method !== "GET") {
    return json({ success: false, error: "Method not allowed" }, 405, headers);
  }

  const authKey = request.headers.get("X-Admin-Key") || "";
  const allowedKey = env.ADMIN_VIEW_KEY || env.LINE_HARNESS_API_KEY || "";
  if (!allowedKey || authKey !== allowedKey) {
    return json({ success: false, error: "Unauthorized" }, 401, headers);
  }

  try {
    const url = new URL(request.url);
    const limit = clampNumber(url.searchParams.get("limit"), 1, MAX_LIMIT, 100);
    const offset = clampNumber(url.searchParams.get("offset"), 0, 100000, 0);
    const search = stringValue(url.searchParams.get("search"));

    const client = createLineHarnessClient(env, env.LINE_HARNESS_API_KEY);
    const friends = await client.get("/api/friends", {
      limit: String(limit),
      offset: String(offset),
      includeTags: "true",
      ...(search ? { search } : {})
    });

    const data = friends?.data || {};
    const items = Array.isArray(data.items) ? data.items : [];

    return json({
      success: true,
      data: {
        items: items.map(normalizeFriend),
        total: Number(data.total || items.length || 0),
        page: Number(data.page || Math.floor(offset / limit) + 1),
        limit,
        offset,
        hasNextPage: Boolean(data.hasNextPage)
      }
    }, 200, headers);
  } catch (error) {
    console.error("GET /api/diagnosis-records error:", error);
    return json({ success: false, error: publicErrorMessage(error) }, 500, headers);
  }
}

function createLineHarnessClient(env, apiKey) {
  const baseUrl = (env.LINE_HARNESS_API_URL || DEFAULT_LINE_HARNESS_API_URL).replace(/\/+$/, "");

  async function get(path, params = {}) {
    const url = new URL(`${baseUrl}${path}`);
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== "") {
        url.searchParams.set(key, value);
      }
    });

    const response = await fetch(url.toString(), {
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      }
    });
    const text = await response.text();
    const payload = text ? safeJson(text) : null;
    if (!response.ok || payload?.success === false) {
      throw new Error(payload?.error || payload?.message || text || `LINE Harness API ${response.status}`);
    }
    return payload;
  }

  return { get };
}

function normalizeFriend(friend) {
  const metadata = isObject(friend.metadata) ? friend.metadata : {};
  const diagnosis = isObject(metadata.ryujinDiagnosis) ? metadata.ryujinDiagnosis : {};
  const result = isObject(diagnosis.result) ? diagnosis.result : {};
  const profile = isObject(diagnosis.profile) ? diagnosis.profile : {};
  const tags = Array.isArray(friend.tags) ? friend.tags.map((tag) => stringValue(tag.name)).filter(Boolean) : [];

  return {
    friendId: stringValue(friend.id),
    lineUserId: stringValue(friend.lineUserId),
    lineName: stringValue(friend.displayName),
    pictureUrl: stringValue(friend.pictureUrl),
    isFollowing: Boolean(friend.isFollowing),
    refCode: stringValue(friend.refCode),
    userId: stringValue(friend.userId),
    createdAt: stringValue(friend.createdAt),
    updatedAt: stringValue(friend.updatedAt),
    tags,
    diagnosisId: stringValue(diagnosis.diagnosisId) || stringValue(metadata.ryujin_diagnosis_id),
    completedAt: stringValue(diagnosis.occurredAt) || stringValue(metadata.ryujin_last_completed_at),
    entry: stringValue(diagnosis.entry) || stringValue(metadata.ryujin_entry),
    mainType: stringValue(result.mainType) || stringValue(metadata.ryujin_main_type),
    mainTypeName: stringValue(result.mainTypeName) || stringValue(metadata.ryujin_main_type_name),
    subType: stringValue(result.subType) || stringValue(metadata.ryujin_sub_type),
    subLabel: stringValue(result.subLabel) || stringValue(metadata.ryujin_sub_label),
    nickname: stringValue(profile.nickname),
    birthdate: stringValue(profile.birthdate),
    gender: stringValue(profile.gender),
    ageRange: stringValue(profile.ageRange),
    prefecture: stringValue(profile.prefecture),
    occupation: stringValue(profile.occupation),
    incomeRange: stringValue(profile.incomeRange),
    familyStructure: stringValue(profile.familyStructure),
    mainConcern: stringValue(profile.mainConcern),
    interestTheme: stringValue(profile.interestTheme),
    buyingIntent: stringValue(profile.buyingIntent),
    freeNote: stringValue(profile.freeNote),
    metadata
  };
}

function clampNumber(value, min, max, fallback) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.max(min, Math.min(max, Math.floor(number)));
}

function json(payload, status = 200, headers = {}) {
  return new Response(JSON.stringify(payload), { status, headers });
}

function safeJson(text) {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function stringValue(value) {
  return typeof value === "string" ? value.trim() : "";
}

function isObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function publicErrorMessage(error) {
  const message = error instanceof Error ? error.message : String(error || "");
  return message.slice(0, 300) || "Internal server error";
}
