import { NextRequest, NextResponse } from "next/server";

const rateBuckets = new Map<string, { count: number; resetAt: number }>();

/** Reject cross-site POST/PUT to same-origin API routes (CSRF). */
export function assertSameOrigin(req: NextRequest): NextResponse | null {
  const host = req.headers.get("host");
  if (!host) {
    return NextResponse.json({ error: { message: "Forbidden" } }, { status: 403 });
  }

  const origin = req.headers.get("origin");
  if (origin) {
    try {
      if (new URL(origin).host !== host) {
        return NextResponse.json({ error: { message: "Forbidden" } }, { status: 403 });
      }
    } catch {
      return NextResponse.json({ error: { message: "Forbidden" } }, { status: 403 });
    }
    return null;
  }

  const referer = req.headers.get("referer");
  if (referer) {
    try {
      if (new URL(referer).host !== host) {
        return NextResponse.json({ error: { message: "Forbidden" } }, { status: 403 });
      }
    } catch {
      return NextResponse.json({ error: { message: "Forbidden" } }, { status: 403 });
    }
    return null;
  }

  // Non-browser clients (curl, etc.) have no Origin/Referer — block mutating calls.
  return NextResponse.json({ error: { message: "Forbidden" } }, { status: 403 });
}

/** Best-effort per-IP sliding window (per serverless instance). */
export function rateLimit(req: NextRequest, bucket: string, max: number, windowMs: number): NextResponse | null {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    "unknown";
  const key = `${bucket}:${ip}`;
  const now = Date.now();
  let entry = rateBuckets.get(key);
  if (!entry || now >= entry.resetAt) {
    entry = { count: 0, resetAt: now + windowMs };
    rateBuckets.set(key, entry);
  }
  entry.count += 1;

  // Occasional cleanup so the map doesn't grow without bound.
  if (rateBuckets.size > 5000) {
    for (const [k, v] of rateBuckets) {
      if (now >= v.resetAt) rateBuckets.delete(k);
    }
  }

  if (entry.count > max) {
    return NextResponse.json({ error: { message: "Too many requests" } }, { status: 429 });
  }
  return null;
}

export async function readJsonBody(
  req: Request,
  maxBytes: number
): Promise<{ data: Record<string, unknown> } | { error: NextResponse }> {
  const contentLength = req.headers.get("content-length");
  if (contentLength) {
    const n = Number.parseInt(contentLength, 10);
    if (Number.isFinite(n) && n > maxBytes) {
      return { error: NextResponse.json({ error: "Payload too large" }, { status: 413 }) };
    }
  }

  const buf = await req.arrayBuffer();
  if (buf.byteLength > maxBytes) {
    return { error: NextResponse.json({ error: "Payload too large" }, { status: 413 }) };
  }

  try {
    const parsed = JSON.parse(new TextDecoder().decode(buf)) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return { error: NextResponse.json({ error: "Invalid JSON body" }, { status: 400 }) };
    }
    return { data: parsed as Record<string, unknown> };
  } catch {
    return { error: NextResponse.json({ error: "Invalid JSON body" }, { status: 400 }) };
  }
}
