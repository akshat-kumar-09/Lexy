import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import type { LexiconData } from "@/lib/types";
import { getSql } from "@/lib/db";

function parseBody(data: unknown): LexiconData | null {
  if (!data || typeof data !== "object") return null;
  const o = data as Record<string, unknown>;
  if (!o.words || typeof o.words !== "object") return null;
  if (!Array.isArray(o.daily_history)) return null;
  return {
    words: o.words as LexiconData["words"],
    daily_history: o.daily_history as LexiconData["daily_history"],
  };
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
  const row = rows[0] as { payload: LexiconData; updated_at: string } | undefined;
  if (!row) {
    return NextResponse.json({ words: {}, daily_history: [], updated_at: null });
  }
  return NextResponse.json({
    ...row.payload,
    updated_at: row.updated_at,
  });
}

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
  const parsed = parseBody(body);
  if (!parsed) {
    return NextResponse.json({ error: "Invalid lexicon shape" }, { status: 400 });
  }
  const payload = JSON.stringify(parsed);
  await sql`
    INSERT INTO lexicon_snapshots (user_id, payload, updated_at)
    VALUES (${userId}, ${payload}::jsonb, NOW())
    ON CONFLICT (user_id) DO UPDATE SET
      payload = EXCLUDED.payload,
      updated_at = NOW()
  `;
  return NextResponse.json({ ok: true });
}
