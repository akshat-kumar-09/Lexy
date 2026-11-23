import Anthropic from "@anthropic-ai/sdk";
import { assertSameOrigin, rateLimit } from "@/lib/apiGuard";
import { getSql } from "@/lib/db";
import { LEXY_MODEL } from "@/lib/model";
import { parseModelJson } from "@/lib/parseJson";
import {
  cleanSenseHint,
  cleanWordInput,
  isWordStoryPart,
  normalizeWordStoryPart,
  WORD_STORY_SPECS,
  WORD_STORY_VERSION,
  wordStoryKey,
  wordStoryUserMessage,
  type WordStoryPart,
  type WordStoryPartData,
} from "@/lib/wordStory";
import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 60;

/**
 * GET /api/word-story?word=affluence&part=meaning[&sense=…]
 *
 * One part of a word's Deep Dive story. Stories aren't personal, so each part is generated once
 * (server-side, with Lexy's own prompt — callers can't inject content) and then served to everyone
 * from Postgres, with a long CDN cache on top.
 */

type Sql = NonNullable<ReturnType<typeof getSql>>;

let anthropic: Anthropic | null = null;
function getAnthropic(): Anthropic | null {
  const apiKey = process.env.ANTHROPIC_API_KEY?.trim();
  if (!apiKey) return null;
  anthropic ??= new Anthropic({ apiKey, maxRetries: 1 });
  return anthropic;
}

let tableReady: Promise<void> | null = null;
function ensureTable(sql: Sql): Promise<void> {
  tableReady ??= (async () => {
    await sql`
      CREATE TABLE IF NOT EXISTS word_stories (
        word TEXT NOT NULL,
        part TEXT NOT NULL,
        version INT NOT NULL,
        payload JSONB NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        PRIMARY KEY (word, part, version)
      )
    `;
  })().catch((e: unknown) => {
    tableReady = null;
    throw e;
  });
  return tableReady;
}

async function readCached(sql: Sql, key: string, part: WordStoryPart): Promise<WordStoryPartData | null> {
  await ensureTable(sql);
  const rows = await sql`
    SELECT payload FROM word_stories
    WHERE word = ${key} AND part = ${part} AND version = ${WORD_STORY_VERSION}
  `;
  const row = rows[0] as { payload: WordStoryPartData } | undefined;
  return row?.payload ?? null;
}

async function writeCached(sql: Sql, key: string, part: WordStoryPart, data: WordStoryPartData) {
  await ensureTable(sql);
  await sql`
    INSERT INTO word_stories (word, part, version, payload)
    VALUES (${key}, ${part}, ${WORD_STORY_VERSION}, ${JSON.stringify(data)}::jsonb)
    ON CONFLICT (word, part, version) DO NOTHING
  `;
}

function fail(status: number, message: string) {
  return NextResponse.json({ error: { message } }, { status, headers: { "Cache-Control": "no-store" } });
}

function ok(part: WordStoryPart, data: WordStoryPartData, cached: boolean) {
  return NextResponse.json(
    { part, data, cached },
    {
      headers: {
        // A word's story doesn't change between visits — let the CDN answer repeats.
        "Cache-Control": "public, max-age=86400, s-maxage=2592000, stale-while-revalidate=604800",
      },
    }
  );
}

export async function GET(req: NextRequest) {
  const originErr = assertSameOrigin(req);
  if (originErr) return originErr;

  const params = req.nextUrl.searchParams;
  const word = cleanWordInput(params.get("word"));
  const part = params.get("part");
  if (!word) return fail(400, "That doesn't look like a word Lexy can open.");
  if (!isWordStoryPart(part)) return fail(400, "Unknown part.");
  const sense = cleanSenseHint(params.get("sense"));
  const key = wordStoryKey(word);

  const sql = getSql();
  if (sql) {
    try {
      const hit = await readCached(sql, key, part);
      if (hit) return ok(part, hit, true);
    } catch (e) {
      console.error("word-story cache read failed", e);
    }
  }

  // Only fresh generations count against the limit — cached words are free to open.
  const rateErr = rateLimit(req, "word-story", 90, 60_000);
  if (rateErr) return rateErr;

  const client = getAnthropic();
  if (!client) return fail(500, "Lexy's server is missing its Claude key. Set ANTHROPIC_API_KEY.");

  const spec = WORD_STORY_SPECS[part];
  let text: string;
  try {
    const msg = await client.messages.create({
      model: LEXY_MODEL,
      max_tokens: spec.maxTokens,
      system: spec.system,
      messages: [{ role: "user", content: wordStoryUserMessage(word, sense) }],
    });
    if (msg.stop_reason === "refusal") return fail(422, "Lexy can't open that word.");
    text = msg.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("");
  } catch (e) {
    if (e instanceof Anthropic.RateLimitError) return fail(429, "Lexy is busy — try that word again in a moment.");
    if (e instanceof Anthropic.APIError) {
      console.error("word-story Claude error", e.status, e.message);
      return fail(502, "Could not reach Claude — try again.");
    }
    throw e;
  }

  let data: WordStoryPartData | null = null;
  try {
    data = normalizeWordStoryPart(part, parseModelJson<unknown>(text), word);
  } catch {
    data = null;
  }
  if (!data) return fail(502, "Lexy got a garbled answer — try again.");

  if (sql) {
    try {
      await writeCached(sql, key, part, data);
    } catch (e) {
      console.error("word-story cache write failed", e);
    }
  }
  return ok(part, data, false);
}
