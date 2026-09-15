import { assertSameOrigin, rateLimit, readJsonBody } from "@/lib/apiGuard";
import { COOKIE_NAME } from "@/lib/types";
import { NextRequest, NextResponse } from "next/server";

const MAX_BODY_BYTES = 6 * 1024 * 1024; // vision uploads with base64 handwriting
const MAX_TOKENS = 4096;
const ALLOWED_MODELS = new Set(["gpt-4o", "gpt-4o-mini"]);

/** Proxies chat completions to OpenAI so the browser is not blocked by CORS. */
export async function POST(req: NextRequest) {
  const originErr = assertSameOrigin(req);
  if (originErr) return originErr;

  const rateErr = rateLimit(req, "openai-chat", 40, 60_000);
  if (rateErr) return rateErr;

  const parsed = await readJsonBody(req, MAX_BODY_BYTES);
  if ("error" in parsed) return parsed.error;

  const body = parsed.data;

  const bodyKey = typeof body.apiKey === "string" ? body.apiKey.trim() : "";
  const cookieKey = req.cookies.get(COOKIE_NAME)?.value?.trim() ?? "";
  const apiKey = bodyKey || cookieKey;
  if (!apiKey) {
    return NextResponse.json({ error: { message: "Missing OpenAI API key" } }, { status: 400 });
  }

  const model = typeof body.model === "string" ? body.model : "";
  if (!ALLOWED_MODELS.has(model)) {
    return NextResponse.json({ error: { message: "Model not allowed" } }, { status: 400 });
  }

  const openaiPayload = { ...body };
  delete openaiPayload.apiKey;

  if (typeof openaiPayload.max_tokens === "number") {
    openaiPayload.max_tokens = Math.min(Math.max(1, openaiPayload.max_tokens), MAX_TOKENS);
  }

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(openaiPayload),
  });

  const text = await res.text();
  return new NextResponse(text, {
    status: res.status,
    headers: { "Content-Type": "application/json" },
  });
}
