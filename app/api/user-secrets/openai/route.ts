import { assertSameOrigin, readJsonBody } from "@/lib/apiGuard";
import { auth } from "@clerk/nextjs/server";
import { getSql } from "@/lib/db";
import { decryptSecret, encryptSecret } from "@/lib/secretCrypto";
import { NextRequest, NextResponse } from "next/server";

const MAX_BODY_BYTES = 8 * 1024;

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
    if (!row?.openai_api_key) {
      return NextResponse.json({ key: null as string | null });
    }
    const key = decryptSecret(row.openai_api_key);
    return NextResponse.json({ key });
  } catch (e) {
    console.error("user_secrets GET", e);
    return NextResponse.json({ key: null as string | null });
  }
}

/** PUT: body `{ "key": "sk-..." }` — empty string deletes server copy. */
export async function PUT(req: NextRequest) {
  const originErr = assertSameOrigin(req);
  if (originErr) return originErr;

  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const sql = getSql();
  if (!sql) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }

  const parsed = await readJsonBody(req, MAX_BODY_BYTES);
  if ("error" in parsed) return parsed.error;

  const key = typeof parsed.data.key === "string" ? parsed.data.key.trim() : "";

  try {
    if (!key) {
      await sql`DELETE FROM user_secrets WHERE user_id = ${userId}`;
      return NextResponse.json({ ok: true });
    }
    const stored = encryptSecret(key);
    await sql`
      INSERT INTO user_secrets (user_id, openai_api_key, updated_at)
      VALUES (${userId}, ${stored}, NOW())
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
