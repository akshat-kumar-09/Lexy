import { auth } from "@clerk/nextjs/server";
import { mergeLexiconPreferLocal, normalizeLexiconPayload } from "@/lib/lexiconMigrate";
import { NextResponse } from "next/server";
import type { LexiconData } from "@/lib/types";
import { getSql } from "@/lib/db";

function parseBody(data: unknown): LexiconData | null {
  return normalizeLexiconPayload(data);
}

function parseDeletedWords(data: unknown): string[] {
  if (!data || typeof data !== "object") return [];
  const raw = (data as Record<string, unknown>).deleted_words;
  if (!Array.isArray(raw)) return [];
  const out: string[] = [];
  const seen = new Set<string>();
  for (const x of raw) {
    if (typeof x !== "string") continue;
    const k = x.toLowerCase().trim();
    if (!k || seen.has(k)) continue;
    seen.add(k);
    out.push(k);
    if (out.length >= 2000) break;
  }
  return out;
}

const EMPTY: LexiconData = { words: {}, metaphor_history: [], scribble_rewrites: [] };

/** Checkpoints are cheap (JSONB copy) but bounded — one per 6h window, last 30 kept. */
const HISTORY_MIN_GAP_HOURS = 6;
const HISTORY_KEEP = 30;

async function maybeWriteHistoryCheckpoint(
  sql: ReturnType<typeof getSql>,
  userId: string,
  payload: LexiconData
) {
  if (!sql) return;
  // Skip empty snapshots — nothing worth a rollback point.
  if (!Object.keys(payload.words).length) return;
  const recent = await sql`
    SELECT created_at FROM lexicon_history
    WHERE user_id = ${userId}
    ORDER BY created_at DESC
    LIMIT 1
  `;
  const last = (recent[0] as { created_at: string } | undefined)?.created_at;
  if (last && Date.now() - new Date(last).getTime() < HISTORY_MIN_GAP_HOURS * 60 * 60 * 1000) {
    return;
  }
  await sql`
    INSERT INTO lexicon_history (user_id, payload)
    VALUES (${userId}, ${JSON.stringify(payload)}::jsonb)
  `;
  await sql`
    DELETE FROM lexicon_history
    WHERE user_id = ${userId}
      AND id NOT IN (
        SELECT id FROM lexicon_history WHERE user_id = ${userId} ORDER BY created_at DESC LIMIT ${HISTORY_KEEP}
      )
  `;
}

export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const sql = getSql();
  if (!sql) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }
  const rows = await sql`
    SELECT payload, updated_at FROM lexicon_snapshots WHERE user_id = ${userId}
  `;
  const row = rows[0] as { payload: unknown; updated_at: string } | undefined;
  if (!row) {
    return NextResponse.json({
      ...EMPTY,
      updated_at: null,
    });
  }
  const normalized = normalizeLexiconPayload(row.payload) ?? EMPTY;
  return NextResponse.json({
    ...normalized,
    updated_at: row.updated_at,
  });
}

/**
 * PUT is a SERVER-SIDE MERGE, never a blind replace.
 *
 * Two devices writing in quick succession used to race: the later PUT replaced
 * the row, so anything the other device added between its GET and this PUT was
 * erased ("I came back and my words were gone"). We now load the existing
 * snapshot, union it with the incoming one (incoming wins on word conflicts so
 * fresh ratings stick), then apply the client's explicit `deleted_words`
 * tombstones so genuine deletes still propagate. Old clients without
 * `deleted_words` get safe additive behaviour automatically.
 */
export async function PUT(req: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const sql = getSql();
  if (!sql) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const incoming = parseBody(body);
  if (!incoming) {
    return NextResponse.json({ error: "Invalid lexicon shape" }, { status: 400 });
  }
  const deletedWords = parseDeletedWords(body);

  const rows = await sql`
    SELECT payload FROM lexicon_snapshots WHERE user_id = ${userId}
  `;
  const existingRaw = (rows[0] as { payload: unknown } | undefined)?.payload;
  const existing: LexiconData = normalizeLexiconPayload(existingRaw) ?? EMPTY;

  const merged = mergeLexiconPreferLocal(existing, incoming);

  if (deletedWords.length) {
    for (const k of deletedWords) {
      delete merged.words[k];
    }
  }

  // Checkpoint the pre-write state before overwriting it, so a bad merge or
  // wrong-device sync is always recoverable from Settings. Best-effort: if the
  // history table isn't migrated yet, don't let that break the actual save.
  try {
    await maybeWriteHistoryCheckpoint(sql, userId, existing);
  } catch (e) {
    console.error("lexicon_history checkpoint failed", e);
  }

  const payload = JSON.stringify(merged);
  await sql`
    INSERT INTO lexicon_snapshots (user_id, payload, updated_at)
    VALUES (${userId}, ${payload}::jsonb, NOW())
    ON CONFLICT (user_id) DO UPDATE SET
      payload = EXCLUDED.payload,
      updated_at = NOW()
  `;

  return NextResponse.json({ ok: true, ...merged });
}
