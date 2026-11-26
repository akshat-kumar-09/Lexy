import Anthropic from "@anthropic-ai/sdk";

/** One shared Claude client for Lexy's server routes — null when the key isn't set. */
let client: Anthropic | null = null;

export function getAnthropic(): Anthropic | null {
  const apiKey = process.env.ANTHROPIC_API_KEY?.trim();
  if (!apiKey) return null;
  client ??= new Anthropic({ apiKey, maxRetries: 1 });
  return client;
}

export const MISSING_CLAUDE_KEY = "Lexy's server is missing its Claude key. Set ANTHROPIC_API_KEY.";

/** All the text a reply carries, in order. */
export function replyText(msg: Anthropic.Message): string {
  return msg.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("");
}
