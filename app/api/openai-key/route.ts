import { assertSameOrigin, readJsonBody } from "@/lib/apiGuard";
import { COOKIE_NAME } from "@/lib/types";
import { NextRequest, NextResponse } from "next/server";

/**
 * Device-durable storage for the user's OpenAI key, independent of sign-in.
 *
 * The key lives in a 1-year httpOnly cookie. Server-set cookies are exempt from
 * Safari/iOS' 7-day script-storage cap, so the key survives even when an
 * installed PWA's localStorage is evicted. Same-origin only; never sent anywhere
 * but Lexy's own server (which already relays it to OpenAI on each request).
 */

const MAX_AGE = 60 * 60 * 24 * 365; // 1 year
const MAX_BODY_BYTES = 8 * 1024;

function isSecure() {
  return process.env.NODE_ENV === "production";
}

/** GET: return the saved key for this device (null if none). */
export async function GET(req: NextRequest) {
  const key = req.cookies.get(COOKIE_NAME)?.value ?? null;
  return NextResponse.json({ key });
}

/** POST: body `{ "key": "sk-..." }` — empty string clears the cookie. */
export async function POST(req: NextRequest) {
  const originErr = assertSameOrigin(req);
  if (originErr) return originErr;

  const parsed = await readJsonBody(req, MAX_BODY_BYTES);
  if ("error" in parsed) return parsed.error;

  const raw = parsed.data.key;
  const key = typeof raw === "string" ? raw.trim() : "";

  const res = NextResponse.json({ ok: true });
  if (!key) {
    res.cookies.set(COOKIE_NAME, "", { path: "/", maxAge: 0 });
    return res;
  }
  res.cookies.set(COOKIE_NAME, key, {
    httpOnly: true,
    secure: isSecure(),
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE,
  });
  return res;
}
