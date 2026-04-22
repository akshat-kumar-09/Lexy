import { NextRequest, NextResponse } from "next/server";

/** Proxies chat completions to OpenAI so the browser is not blocked by CORS. */
export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: { message: "Invalid JSON body" } }, { status: 400 });
  }

  const apiKey = body.apiKey;
  if (typeof apiKey !== "string" || !apiKey.trim()) {
    return NextResponse.json({ error: { message: "Missing OpenAI API key" } }, { status: 400 });
  }

  const openaiPayload = { ...body };
  delete openaiPayload.apiKey;

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey.trim()}`,
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
