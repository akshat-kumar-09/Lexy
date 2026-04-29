import { auth } from "@clerk/nextjs/server";
import { getSql } from "@/lib/db";
import { NextResponse } from "next/server";

/** GET: return saved key for this Clerk user (null if none). */
export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const sql = getSql();
  if (!sql) {
    return NextResponse.json({ key: null as string | null });
  }
  try {
    const rows = await sql`
      SELECT openai_api_key FROM user_secrets WHERE user_id = ${userId}
    `;
    const row = rows[0] as { openai_api_key: string } | undefined;
    return NextResponse.json({ key: row?.openai_api_key ?? null });
  } catch {
    return NextResponse.json({ key: null as string | null });
  }
}

/** PUT: body `{ "key": "sk-..." }` — empty string deletes server copy. */
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
  const key = typeof (body as { key?: unknown }).key === "string" ? (body as { key: string }).key.trim() : "";

  try {
    if (!key) {
      await sql`DELETE FROM user_secrets WHERE user_id = ${userId}`;
      return NextResponse.json({ ok: true });
    }
    await sql`
      INSERT INTO user_secrets (user_id, openai_api_key, updated_at)
      VALUES (${userId}, ${key}, NOW())
      ON CONFLICT (user_id) DO UPDATE SET
        openai_api_key = EXCLUDED.openai_api_key,
        updated_at = NOW()
    `;
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("user_secrets PUT", e);
    return NextResponse.json({ error: "Could not save key" }, { status: 500 });
  }
}
