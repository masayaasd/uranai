import { Hono, type Context } from 'hono';
import {
  addTagToFriend,
  createTag,
  enrollFriendInScenario,
  getFriendByLineUserId,
  getLineAccountById,
  getLineAccounts,
  getScenarios,
  getTags,
  jstNow,
} from '@line-crm/db';
import type { Tag as DbTag } from '@line-crm/db';
import { fireEvent } from '../services/event-bus.js';
import type { Env } from '../index.js';

export const diagnosisTags = new Hono<Env>();

type DiagnosisPayload = {
  idToken?: string;
  event?: 'diagnosis_completed' | 'line_cta_clicked';
  occurredAt?: string;
  lineUserIdHint?: string;
  entry?: string;
  delivery?: string;
  diagnosisId?: string;
  tags?: string[];
  result?: {
    mainType?: string;
    mainTypeName?: string;
    subType?: string;
    subLabel?: string;
    scores?: Record<string, number>;
  };
  profile?: Record<string, unknown>;
  source?: Record<string, unknown>;
  page?: Record<string, unknown>;
};

function serializeTag(row: DbTag) {
  return {
    id: row.id,
    name: row.name,
    color: row.color,
    createdAt: row.created_at,
  };
}

function normalizeTags(values: unknown): string[] {
  if (!Array.isArray(values)) return [];
  const seen = new Set<string>();
  const tags: string[] = [];
  for (const value of values) {
    if (typeof value !== 'string') continue;
    const tag = value.trim().slice(0, 64);
    if (!tag || seen.has(tag)) continue;
    seen.add(tag);
    tags.push(tag);
    if (tags.length >= 30) break;
  }
  return tags;
}

function tagColor(name: string): string {
  if (name.includes('白龍')) return '#F8FAFC';
  if (name.includes('緑龍')) return '#22C55E';
  if (name.includes('月龍')) return '#A78BFA';
  if (name.includes('金龍')) return '#F59E0B';
  if (name.includes('診断')) return '#06B6D4';
  return '#3B82F6';
}

function parseMetadata(value: string | null | undefined): Record<string, unknown> {
  if (!value) return {};
  try {
    return JSON.parse(value) as Record<string, unknown>;
  } catch {
    return {};
  }
}

async function verifyLineIdToken(c: Context<Env>, idToken: string) {
  const channelIds = [c.env.LINE_LOGIN_CHANNEL_ID].filter(Boolean);
  const accounts = await getLineAccounts(c.env.DB);
  for (const account of accounts) {
    if (account.login_channel_id && !channelIds.includes(account.login_channel_id)) {
      channelIds.push(account.login_channel_id);
    }
  }

  for (const channelId of channelIds) {
    const response = await fetch('https://api.line.me/oauth2/v2.1/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ id_token: idToken, client_id: channelId }),
    });
    if (!response.ok) continue;
    const verified = await response.json<{ sub?: string }>();
    if (verified.sub) return verified.sub;
  }
  return null;
}

async function ensureTags(db: D1Database, names: string[]): Promise<DbTag[]> {
  let existing = await getTags(db);
  const byName = new Map(existing.map((tag) => [tag.name, tag]));
  const ensured: DbTag[] = [];

  for (const name of names) {
    const current = byName.get(name);
    if (current) {
      ensured.push(current);
      continue;
    }

    try {
      const created = await createTag(db, { name, color: tagColor(name) });
      byName.set(name, created);
      ensured.push(created);
    } catch {
      existing = await getTags(db);
      const refetched = existing.find((tag) => tag.name === name);
      if (refetched) {
        byName.set(name, refetched);
        ensured.push(refetched);
      }
    }
  }

  return ensured;
}

async function resolveLineContext(c: Context<Env>, lineAccountId: string | null | undefined) {
  if (!lineAccountId) {
    return {
      lineAccessToken: c.env.LINE_CHANNEL_ACCESS_TOKEN,
      lineAccountId: null,
    };
  }

  const account = await getLineAccountById(c.env.DB, lineAccountId);
  return {
    lineAccessToken: account?.channel_access_token || c.env.LINE_CHANNEL_ACCESS_TOKEN,
    lineAccountId,
  };
}

async function attachTagWithEffects(
  c: Context<Env>,
  friend: { id: string; line_account_id?: string | null },
  tagId: string,
) {
  const db = c.env.DB;
  const lineContext = await resolveLineContext(c, friend.line_account_id);
  const friendId = friend.id;

  await addTagToFriend(db, friendId, tagId);

  const scenarios = await getScenarios(db);
  for (const scenario of scenarios) {
    if (
      scenario.trigger_type === 'tag_added' &&
      scenario.is_active &&
      scenario.trigger_tag_id === tagId
    ) {
      const existing = await db
        .prepare('SELECT id FROM friend_scenarios WHERE friend_id = ? AND scenario_id = ?')
        .bind(friendId, scenario.id)
        .first();
      if (!existing) {
        await enrollFriendInScenario(db, friendId, scenario.id);
      }
    }
  }

  await fireEvent(db, 'tag_change', {
    friendId,
    eventData: { tagId, action: 'add', source: 'diagnosis_tags' },
  }, lineContext.lineAccessToken, lineContext.lineAccountId);
}

function buildDiagnosisMetadata(body: DiagnosisPayload, tagNames: string[]) {
  return {
    ryujinDiagnosis: {
      diagnosisId: body.diagnosisId || '',
      event: body.event || '',
      entry: body.entry || '',
      delivery: body.delivery || '',
      occurredAt: body.occurredAt || jstNow(),
      tags: tagNames,
      result: body.result || {},
      profile: body.profile || {},
      source: body.source || {},
      page: body.page || {},
    },
    ryujin_diagnosis_id: body.diagnosisId || '',
    ryujin_main_type: body.result?.mainType || '',
    ryujin_main_type_name: body.result?.mainTypeName || '',
    ryujin_sub_type: body.result?.subType || '',
    ryujin_sub_label: body.result?.subLabel || '',
    ryujin_entry: body.entry || '',
    ryujin_last_event: body.event || '',
    ryujin_last_completed_at: body.occurredAt || jstNow(),
  };
}

diagnosisTags.post('/api/liff/diagnosis-tags', async (c) => {
  try {
    const body = await c.req.json<DiagnosisPayload>();
    if (!body.idToken) {
      return c.json({ success: false, error: 'idToken is required' }, 400);
    }
    if (!body.event || !['diagnosis_completed', 'line_cta_clicked'].includes(body.event)) {
      return c.json({ success: false, error: 'event is invalid' }, 400);
    }

    const lineUserId = await verifyLineIdToken(c, body.idToken);
    if (!lineUserId) {
      return c.json({ success: false, error: 'Invalid ID token' }, 401);
    }

    const friend = await getFriendByLineUserId(c.env.DB, lineUserId);
    if (!friend) {
      return c.json({ success: false, error: 'Friend not found' }, 404);
    }

    const tagNames = normalizeTags(body.tags);
    const tags = await ensureTags(c.env.DB, tagNames);
    for (const tag of tags) {
      await attachTagWithEffects(c, friend, tag.id);
    }

    const existingMetadata = parseMetadata(friend.metadata);
    const metadata = {
      ...existingMetadata,
      ...buildDiagnosisMetadata(body, tagNames),
    };

    await c.env.DB
      .prepare('UPDATE friends SET metadata = ?, updated_at = ? WHERE id = ?')
      .bind(JSON.stringify(metadata), jstNow(), friend.id)
      .run();

    return c.json({
      success: true,
      data: {
        friendId: friend.id,
        lineUserId,
        assignedTags: tags.map(serializeTag),
        metadata,
      },
    });
  } catch (error) {
    console.error('POST /api/liff/diagnosis-tags error:', error);
    return c.json({ success: false, error: 'Internal server error' }, 500);
  }
});
