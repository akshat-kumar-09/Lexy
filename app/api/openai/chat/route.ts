import { NextRequest, NextResponse } from "next/server";
import { COOKIE_NAME } from "@/app/api/openai-key/route";

/** Proxies chat completions to OpenAI so the browser is not blocked by CORS. */
export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: { message: "Invalid JSON body" } }, { status: 400 });
  }

  // Prefer the key sent by the client; fall back to the device cookie so calls
  // still work when localStorage was wiped but the durable cookie survived.
  const bodyKey = typeof body.apiKey === "string" ? body.apiKey.trim() : "";
  const cookieKey = req.cookies.get(COOKIE_NAME)?.value?.trim() ?? "";
  const apiKey = bodyKey || cookieKey;
  if (!apiKey) {
    return NextResponse.json({ error: { message: "Missing OpenAI API key" } }, { status: 400 });
  }

  const openaiPayload = { ...body };
  delete openaiPayload.apiKey;

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
