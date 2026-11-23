/**
 * A word's "story" — everything the Deep Dive card shows — built in three small parts that
 * are generated in parallel and cached once for everyone (a word's story isn't personal).
 *
 * Shared by the /api/word-story route (prompts, validation) and the browser (types, keys).
 */
import { clampVocabLevel, levelPromptBlock } from "@/lib/vocabLevels";
import type { DeepDiveResult, RelatedFormDefinition } from "@/lib/types";

/** Bump when a prompt or a part's shape changes, so old cached stories are ignored. */
export const WORD_STORY_VERSION = 1;

export const WORD_STORY_PARTS = ["meaning", "usage", "extras"] as const;
export type WordStoryPart = (typeof WORD_STORY_PARTS)[number];

export type WordStoryMeaning = Pick<
  DeepDiveResult,
  | "word"
  | "pronunciation"
  | "pronunciation_source"
  | "part_of_speech"
  | "level"
  | "reference_definition"
  | "reference_source"
  | "lexy_definition"
  | "nuance"
>;
export type WordStoryUsage = Pick<DeepDiveResult, "example_sentences" | "conversation_phrases" | "origin">;
export type WordStoryExtras = Pick<DeepDiveResult, "related_words" | "used_by" | "related_form_definitions">;

export type WordStoryPartData = WordStoryMeaning | WordStoryUsage | WordStoryExtras;

const JSON_ONLY = "Respond with ONLY the JSON object — no markdown code fences, no commentary before or after.";

const MEANING_SYSTEM = `You are Lexy — a literary lexicographer. Return ONLY valid JSON:
{
  "word": "the headword as normally written",
  "pronunciation": "IPA in slashes — British and American when they differ, British first",
  "pronunciation_source": "Oxford English Dictionary or Cambridge English Pronouncing Dictionary — pick the best match",
  "part_of_speech": "string",
  "level": 3,
  "reference_definition": "precise dictionary-style gloss — as Oxford would phrase it (1–2 sentences max)",
  "reference_source": "Oxford English Dictionary",
  "lexy_definition": "Lexy's gloss: one vivid sentence, plain English, easy to remember — what the word FEELS like to use",
  "nuance": "what this word captures that near-synonyms do not"
}

${levelPromptBlock()}

Rules:
- level must match the word's real-world difficulty (most deep-dive words are 3–5).
- reference_definition and lexy_definition MUST differ in tone: reference = precise/authoritative; lexy = memorable/everyday.
- pronunciation_source and reference_source must name real references (Oxford English Dictionary, Merriam-Webster, Cambridge Dictionary, etc.).
- Pronunciation is mandatory.
- If a sense is given, define that sense; otherwise the word's most common sense.
${JSON_ONLY}`;

const USAGE_SYSTEM = `You are Lexy — a literary lexicographer. Return ONLY valid JSON:
{
  "example_sentences": ["three sentences"],
  "conversation_phrases": ["two or three short, natural one-liners a real person could actually say out loud today — texting a friend, small talk, venting about work, a quick aside — using this word in casual spoken register, not literary or written-page style"],
  "origin": "etymology — concise"
}

Rules:
- example_sentences length 3, each using the word naturally.
- conversation_phrases length 2 or 3, genuinely sayable out loud (contractions, casual tone are good).
- If a sense is given, every sentence uses that sense; otherwise the word's most common sense.
${JSON_ONLY}`;

const EXTRAS_SYSTEM = `You are Lexy. Return ONLY valid JSON:
{
  "related_words": ["three related words"],
  "used_by": "a memorable literary appearance — author or work",
  "related_form_definitions": [
    { "word": "lemma", "part_of_speech": "adjective|noun|etc", "definition": "short gloss — meaning only" }
  ]
}
All fields required except you may omit related_form_definitions if truly none exist (prefer including them).
related_words length 3.
related_form_definitions: 3 to 8 entries when the headword has common inflected or derived English forms (e.g. perspicacity → perspicacious, perspicaciously). Exclude the headword itself. Each entry is ONLY word + part_of_speech + definition — no etymology, no examples. If the word is an invariant lemma with no distinct surface forms worth listing, use [].
${JSON_ONLY}`;

export const WORD_STORY_SPECS: Record<WordStoryPart, { system: string; maxTokens: number }> = {
  meaning: { system: MEANING_SYSTEM, maxTokens: 1200 },
  usage: { system: USAGE_SYSTEM, maxTokens: 1200 },
  extras: { system: EXTRAS_SYSTEM, maxTokens: 1500 },
};

export function isWordStoryPart(x: unknown): x is WordStoryPart {
  return typeof x === "string" && (WORD_STORY_PARTS as readonly string[]).includes(x);
}

/** A word or short phrase someone could look up: letters first, then letters, spaces, hyphens, apostrophes. */
export function cleanWordInput(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const w = raw.normalize("NFC").replace(/\s+/g, " ").trim();
  if (!w || w.length > 64) return null;
  if (!/^[\p{L}\p{M}][\p{L}\p{M}'’\- .]*$/u.test(w)) return null;
  return w;
}

export function wordStoryKey(word: string): string {
  return word.normalize("NFC").replace(/\s+/g, " ").trim().toLowerCase().replace(/’/g, "'");
}

/** The sense to cover, when we already know it (a grid word's one-line definition). */
export function cleanSenseHint(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const s = raw.replace(/\s+/g, " ").trim().slice(0, 240);
  return s || null;
}

export function wordStoryUserMessage(word: string, sense: string | null): string {
  return sense ? `Full story of the word: "${word}"\nThe sense to cover: ${sense}` : `Full story of the word: "${word}"`;
}

function str(x: unknown): string {
  return typeof x === "string" ? x.trim() : "";
}

function strList(x: unknown, max: number): string[] {
  if (!Array.isArray(x)) return [];
  return x.map(str).filter(Boolean).slice(0, max);
}

/** Validate and tidy one part of a model reply. Returns null when it isn't usable (and so must not be cached). */
export function normalizeWordStoryPart(
  part: WordStoryPart,
  raw: unknown,
  fallbackWord: string
): WordStoryPartData | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;

  if (part === "meaning") {
    const reference_definition = str(r.reference_definition) || str(r.definition);
    const lexy_definition = str(r.lexy_definition) || reference_definition;
    const pronunciation = str(r.pronunciation);
    if (!reference_definition || !pronunciation) return null;
    return {
      word: str(r.word) || fallbackWord,
      pronunciation,
      pronunciation_source: str(r.pronunciation_source) || "Oxford English Dictionary",
      part_of_speech: str(r.part_of_speech),
      level: clampVocabLevel(r.level),
      reference_definition,
      reference_source: str(r.reference_source) || "Oxford English Dictionary",
      lexy_definition,
      nuance: str(r.nuance),
    } satisfies WordStoryMeaning;
  }

  if (part === "usage") {
    const example_sentences = strList(r.example_sentences, 3);
    if (!example_sentences.length) return null;
    return {
      example_sentences,
      conversation_phrases: strList(r.conversation_phrases, 3),
      origin: str(r.origin),
    } satisfies WordStoryUsage;
  }

  const forms: RelatedFormDefinition[] = Array.isArray(r.related_form_definitions)
    ? (r.related_form_definitions as unknown[])
        .map((f) => {
          const o = (f ?? {}) as Record<string, unknown>;
          return { word: str(o.word), part_of_speech: str(o.part_of_speech), definition: str(o.definition) };
        })
        .filter((f) => f.word && f.definition)
        .slice(0, 8)
    : [];
  return {
    related_words: strList(r.related_words, 3),
    used_by: str(r.used_by),
    related_form_definitions: forms,
  } satisfies WordStoryExtras;
}

/** True once every part has arrived — only then is a story worth keeping on this device. */
export function isCompleteStory(s: Partial<DeepDiveResult>): s is DeepDiveResult {
  return Boolean(s.reference_definition && s.example_sentences && Array.isArray(s.related_words));
}
