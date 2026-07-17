import { auth } from "@clerk/nextjs/server";
import { getSql } from "@/lib/db";
import { normalizeLexiconPayload } from "@/lib/lexiconMigrate";
import { NextResponse } from "next/server";

/** GET: list this user's checkpoints (newest first) — id, timestamp, and word count only. */
export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const sql = getSql();
  if (!sql) {
    return NextResponse.json({ checkpoints: [] });
  }
  let rows: Record<string, unknown>[];
  try {
    rows = await sql`
      SELECT id, payload, created_at FROM lexicon_history
      WHERE user_id = ${userId}
      ORDER BY created_at DESC
    `;
  } catch (e) {
    console.error("lexicon_history query failed", e);
    return NextResponse.json({ checkpoints: [] });
  }
  const checkpoints = rows.map((r) => {
    const row = r as { id: number; payload: unknown; created_at: string };
    const normalized = normalizeLexiconPayload(row.payload);
    return {
      id: row.id,
      created_at: row.created_at,
      word_count: normalized ? Object.keys(normalized.words).length : 0,
    };
  });
  return NextResponse.json({ checkpoints });
}
