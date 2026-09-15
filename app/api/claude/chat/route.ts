import { assertSameOrigin, rateLimit, readJsonBody } from "@/lib/apiGuard";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "edge";

const MAX_BODY_BYTES = 512 * 1024;

/**
 * Proxies Messages API calls to Anthropic so the browser is not blocked by CORS.
 * Uses Lexy's single shared server key — no user ever needs to bring their own.
 */
export async function POST(req: NextRequest) {
  const originErr = assertSameOrigin(req);
  if (originErr) return originErr;

  const rateErr = rateLimit(req, "claude-chat", 40, 60_000);
  if (rateErr) return rateErr;

  const parsed = await readJsonBody(req, MAX_BODY_BYTES);
  if ("error" in parsed) return parsed.error;
  const body = parsed.data;

  const apiKey = process.env.ANTHROPIC_API_KEY?.trim();
  if (!apiKey) {
    return NextResponse.json(
      { error: { message: "Lexy's server is missing its Claude key. Set ANTHROPIC_API_KEY." } },
      { status: 500 }
    );
  }

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const text = await res.text();
  return new NextResponse(text, {
    status: res.status,
    headers: { "Content-Type": "application/json" },
  });
}
