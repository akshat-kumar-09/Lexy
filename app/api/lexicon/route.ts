import { auth } from "@clerk/nextjs/server";
import { normalizeLexiconPayload } from "@/lib/lexiconMigrate";
import { NextResponse } from "next/server";
import type { LexiconData } from "@/lib/types";
import { getSql } from "@/lib/db";

function parseBody(data: unknown): LexiconData | null {
  return normalizeLexiconPayload(data);
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
      words: {},
      metaphor_history: [],
      scribble_rewrites: [],
      updated_at: null,
    });
  }
  const normalized = normalizeLexiconPayload(row.payload) ?? {
    words: {},
    metaphor_history: [],
    scribble_rewrites: [],
  };
  return NextResponse.json({
    ...normalized,
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
