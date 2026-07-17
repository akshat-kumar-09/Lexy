import { auth } from "@clerk/nextjs/server";
import { getSql } from "@/lib/db";
import { mergeLexiconPreferLocal, normalizeLexiconPayload } from "@/lib/lexiconMigrate";
import type { LexiconData } from "@/lib/types";
import { NextResponse } from "next/server";

const EMPTY: LexiconData = { words: {}, metaphor_history: [], scribble_rewrites: [] };

/**
 * POST: restore a checkpoint. Never a blind overwrite — the checkpoint's words
 * are unioned into the current live snapshot, with the current snapshot
 * winning on conflicts, so restoring can only bring words back, never clobber
 * anything added since.
 */
export async function POST(_req: Request, context: { params: Promise<{ id: string }> }) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await context.params;
  const checkpointId = Number(id);
  if (!Number.isInteger(checkpointId)) {
    return NextResponse.json({ error: "Invalid checkpoint id" }, { status: 400 });
  }
  const sql = getSql();
  if (!sql) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }

  const checkpointRows = await sql`
    SELECT payload FROM lexicon_history WHERE id = ${checkpointId} AND user_id = ${userId}
  `;
  const checkpointRaw = (checkpointRows[0] as { payload: unknown } | undefined)?.payload;
  const checkpoint = normalizeLexiconPayload(checkpointRaw);
  if (!checkpoint) {
    return NextResponse.json({ error: "Checkpoint not found" }, { status: 404 });
  }

  const liveRows = await sql`
    SELECT payload FROM lexicon_snapshots WHERE user_id = ${userId}
  `;
  const liveRaw = (liveRows[0] as { payload: unknown } | undefined)?.payload;
  const live = normalizeLexiconPayload(liveRaw) ?? EMPTY;

  const restored = mergeLexiconPreferLocal(checkpoint, live);

  const payload = JSON.stringify(restored);
  await sql`
    INSERT INTO lexicon_snapshots (user_id, payload, updated_at)
    VALUES (${userId}, ${payload}::jsonb, NOW())
    ON CONFLICT (user_id) DO UPDATE SET
      payload = EXCLUDED.payload,
      updated_at = NOW()
  `;

  return NextResponse.json({ ok: true, ...restored });
}
