import Anthropic from "@anthropic-ai/sdk";
import { getAnthropic, MISSING_CLAUDE_KEY, replyText } from "@/lib/anthropicServer";
import { assertSameOrigin, rateLimit, readJsonBody } from "@/lib/apiGuard";
import { DAILY_LIMIT_REACHED, LEXY_RESTING, SIGN_IN_BROKEN, SIGN_IN_NEEDED, type LexyErrorCode } from "@/lib/lexyApi";
import { buildLexyTask } from "@/lib/lexyTasks";
import { LEXY_MODEL } from "@/lib/model";
import { parseModelJson } from "@/lib/parseJson";
import { currentUserId, signInBroken } from "@/lib/serverAuth";
import { spendAllowance } from "@/lib/usage";
import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 60;

/** Room for a handwriting photo (Vercel caps request bodies at 4.5 MB). */
const MAX_BODY_BYTES = 4_400_000;

/**
 * POST /api/lexy  { task, input }
 *
 * Runs one of Lexy's named Claude tasks. The prompt, model and length are fixed on the server
 * (lib/lexyTasks.ts); callers must be signed in, and each call spends from a daily allowance.
 */

function fail(status: number, message: string, code?: LexyErrorCode) {
  return NextResponse.json(
    { error: code ? { message, code } : { message } },
    { status, headers: { "Cache-Control": "no-store" } }
  );
}

export async function POST(req: NextRequest) {
  const originErr = assertSameOrigin(req);
  if (originErr) return originErr;

  const userId = await currentUserId();
  if (!userId) return signInBroken() ? fail(503, SIGN_IN_BROKEN) : fail(401, SIGN_IN_NEEDED, "signin");

  const rateErr = rateLimit(req, "lexy", 60, 60_000);
  if (rateErr) return rateErr;

  const parsed = await readJsonBody(req, MAX_BODY_BYTES);
  if ("error" in parsed) return parsed.error;

  const built = buildLexyTask(parsed.data.task, parsed.data.input);
  if ("error" in built) return fail(400, built.error);

  const client = getAnthropic();
  if (!client) return fail(500, MISSING_CLAUDE_KEY);

  const allowance = await spendAllowance(userId);
  if (allowance === "user") return fail(429, DAILY_LIMIT_REACHED, "quota");
  if (allowance === "everyone") return fail(429, LEXY_RESTING, "quota");

  let text: string;
  try {
    const msg = await client.messages.create({
      model: LEXY_MODEL,
      max_tokens: built.maxTokens,
      ...(built.system ? { system: built.system } : {}),
      messages: [{ role: "user", content: built.content }],
    });
    if (msg.stop_reason === "refusal") return fail(422, "Lexy can't help with that one.");
    text = replyText(msg);
  } catch (e) {
    if (e instanceof Anthropic.RateLimitError) return fail(429, "Lexy is busy — try again in a moment.");
    if (e instanceof Anthropic.APIError) {
      console.error(`lexy ${built.task}: Claude error`, e.status, e.message);
      return fail(502, "Could not reach Claude — try again.");
    }
    throw e;
  }

  if (built.output === "text") {
    const trimmed = text.trim();
    if (!trimmed) return fail(502, "Lexy got an empty answer — try again.");
    return NextResponse.json({ text: trimmed }, { headers: { "Cache-Control": "no-store" } });
  }

  let data: unknown;
  try {
    data = parseModelJson<unknown>(text);
  } catch {
    console.error(`lexy ${built.task}: reply was not JSON`);
    return fail(502, "Lexy got a garbled answer — try again.");
  }
  return NextResponse.json({ data }, { headers: { "Cache-Control": "no-store" } });
}
