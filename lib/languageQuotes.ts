/** One inspiring line per main route — the weight of good language. */

const DEFAULT =
  "Expression deepens by wearing language, not only studying it — every choice you keep teaches the next sentence.";

export const ESSENCE_BY_PATH: Record<string, string> = {
  "/":
    "To find the right word is to refuse noise — clarity is courage, and every sentence is a chance to mean exactly what you intend.",
  "/dive":
    "Depth in vocabulary is not snobbery; it is the freedom to nuance what others can only approximate.",
  "/metaphors":
    "Metaphor is how the mind makes bridges — good language lets you see one thing through the lens of another, truly.",
  "/lexicon":
    "A lexicon you curate is a portrait of your mind: what you keep close is what you are willing to see clearly.",
  "/scribble":
    "First thoughts deserve second sight — revision is not betrayal of voice; it is loyalty to what you almost said.",
  "/start":
    "A little setup now saves a thousand explanations later — let the taps teach what words alone would bury.",
  "/settings":
    "The tools we choose for language shape the thoughts we can have; tending them is tending the inner life.",
  "/sign-in":
    "Sign in, and your words stay yours — continuity of voice across days is how a wardrobe of language grows.",
  "/sign-up":
    "Begin as you mean to go on: with language honest enough to carry the self you are becoming.",
};

export function getEssenceLine(pathname: string | null): string {
  if (!pathname) return DEFAULT;
  const key = pathname.replace(/\/$/, "") || "/";
  if (key.startsWith("/sign-in")) return ESSENCE_BY_PATH["/sign-in"]!;
  if (key.startsWith("/sign-up")) return ESSENCE_BY_PATH["/sign-up"]!;
  if (key.startsWith("/start")) return ESSENCE_BY_PATH["/start"]!;
  return ESSENCE_BY_PATH[key] ?? DEFAULT;
}
