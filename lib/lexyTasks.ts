import type Anthropic from "@anthropic-ai/sdk";
import { isLexyTask, type LexyTaskName } from "@/lib/lexyApi";
import { normalizeThreadList, threadsContextForPrompt } from "@/lib/threads";
import { levelPromptBlock } from "@/lib/vocabLevels";

/**
 * Every Claude call Lexy makes, built on the server. The browser names a task and sends its
 * inputs; the prompt, model and length are fixed here, so /api/lexy can't be used as a general
 * Claude endpoint on Lexy's key.
 */

export interface BuiltLexyTask {
  task: LexyTaskName;
  system?: string;
  content: string | Anthropic.ContentBlockParam[];
  maxTokens: number;
  /** "json": the reply is parsed as JSON on the server; "text": returned as plain text. */
  output: "json" | "text";
}

export type LexyTaskBuild = BuiltLexyTask | { error: string };

const JSON_ONLY = "Respond with ONLY the JSON object — no markdown code fences, no commentary before or after.";

const SCRIBBLE_REWRITE_SYSTEM = `You are Lexy — warm, literary, never corporate. You are a master editor and lexicographer.
Analyse the user's morning writing and return ONLY valid JSON matching this shape:
{
  "upgraded_version": "string — full text rewritten in richer, more precise language; same voice, elevated expression",
  "word_upgrades": [
    {
      "original_phrase": "string",
      "upgraded_word": "string",
      "pronunciation": "IPA in slashes like /wɜːd/",
      "why": "why this upgrade sharpens the line"
    }
  ]
}
Rules:
- word_upgrades: exactly 4 or 5 items (pick the best four or five spots).
- Keep their voice in upgraded_version; do not sound generic.
${JSON_ONLY}`;

const SCRIBBLE_IDEAS_SYSTEM = `You are Lexy — warm, literary, never corporate. You are a master editor and lexicographer.
Analyse the user's morning writing and return ONLY valid JSON matching this shape:
{
  "key_idea_expansions": [
    { "idea": "short label", "expansion": "beautiful expansion in 2-4 sentences" }
  ],
  "vocabulary_candidates": [
    {
      "word": "lowercase lemma",
      "pronunciation": "IPA",
      "part_of_speech": "noun|verb|adjective|etc",
      "definition": "clear definition",
      "example_sentence": "example in their voice",
      "origin": "etymology, concise",
      "why_relevant": "This one felt right for you because…"
    }
  ]
}
Rules:
- key_idea_expansions: 1 or 2 items.
- vocabulary_candidates: 5 or 6 words tied to their themes; every word MUST include IPA pronunciation.
${JSON_ONLY}`;

const HANDWRITING_INSTRUCTION =
  "Read this handwritten text exactly as written. Preserve punctuation, line breaks, and voice. Output plain text only — no preamble.";

function metaphorGridSystem(itemCount: number, includeTheme: boolean): string {
  return `You are Lexy — a working poet's ear for image, not a corporate copywriter. Return ONLY valid JSON:
{
  "suggestions": [
    {
      "metaphor": "a genuinely striking figurative phrase, 3-8 words, built from ONE concrete, specific, sensory image — the kind a real writer would reach for, not a stock phrase",
      "unpacking": "plain language: what the image means, and why THIS specific image (not a generic one) captures it",
      "image_strength": "one sentence naming the precise sensory or physical detail that makes it land — not an abstract restatement",
      "example_sentences": ["three natural sentences using or alluding to this metaphor"],
      "why_for_you": "one short line: why this fits their taste and their exploration themes"${
        includeTheme
          ? `,
      "theme": "the exact exploration theme label (copied verbatim from the list in the user message) this metaphor best fits"`
          : ""
      }
    }
  ]
}

The bar: each metaphor should make someone stop and feel something — recognition, a small ache, a laugh, a chill — not nod along politely. If it would sit comfortably on a motivational poster or in a corporate deck, it has failed.

Hard ban — never produce these, or close cousins of them in any phrasing: a rollercoaster of emotions, a puzzle piece (missing or falling into place), a double-edged sword, a blank canvas, a ship/boat navigating storms, a garden that needs tending or watering, a tapestry of anything, a symphony of anything, walls closing in, a house of cards, riding the waves, an anchor in a storm, a book with unwritten pages, a butterfly emerging or breaking free, a phoenix rising from ashes, a mirror reflecting something, a maze or labyrinth, a dance between two things, threads weaving together, a compass guiding you, planting seeds, building bridges, a marathon not a sprint.

Instead, reach for ONE concrete, specific, physical image per metaphor, drawn from a real domain: a particular craft or trade, a specific animal's behaviour, weather at a precise moment, food and its exact texture or taste, an object worn down by a very specific use, a bodily sensation, one very particular everyday scene. Ground it in something you could photograph or touch — never an abstract concept wearing a costume.

Rules:
- suggestions must contain EXACTLY ${itemCount} items.
- Each item needs all fields. example_sentences must have exactly 3 strings.
- Metaphors must be distinct from each other and drawn from different domains — no two from the same well (not two kitchen images, not two weather images).
- Do not repeat any metaphor phrase listed in the user message exclusion list (case-insensitive), and do not just reskin one of them with a synonym.
- Another completion fills the rest of this grid in parallel — steer toward a noticeably different domain and register so batches rarely collide (overlap discarded).${
    includeTheme
      ? `\n- Every item's "theme" field must be EXACTLY one of the exploration theme labels listed in the user message — copy it verbatim, picking whichever one that metaphor best fits.`
      : ""
  }
${JSON_ONLY}`;
}

const METAPHOR_GRID_BATCH_SIZES = [3, 3, 3, 3] as const;
const METAPHOR_GRID_BATCH_LABELS = ["A", "B", "C", "D"] as const;
/** Assigning each parallel call its own concrete domain does more for variety than hoping the model self-diversifies. */
const METAPHOR_GRID_BATCH_DOMAINS = [
  "weather, animals, or the outdoors at one precise moment",
  "an ordinary object — what a hand actually holds, wears down, or repairs",
  "food, cooking, or a specific craft/trade — the exact texture or technique of making something",
  "the body — one precise physical sensation or spatial feeling",
] as const;

function tasteGridSystem(itemCount: number, includeTheme: boolean): string {
  return `You are Lexy — warm, literary, never corporate. Return ONLY valid JSON:
{
  "suggestions": [
    {
      "word": "lemma",
      "pronunciation": "IPA with slashes — mandatory on every word",
      "part_of_speech": "noun|verb|adjective|etc",
      "level": 3,
      "definition": "one concise line (max ~18 words)",
      "why_for_you": "one short line: why this word fits their emerging taste (not generic)"${
        includeTheme
          ? `,
      "theme": "the exact exploration theme label (copied verbatim from the list in the user message) this word best fits"`
          : ""
      }
    }
  ]
}

${levelPromptBlock()}

Rules:
- suggestions must contain EXACTLY ${itemCount} items.
- Every word MUST have IPA pronunciation in slashes and an integer level 1–5.
- Do not include any word the user already has in their lexicon (case-insensitive match on lemma).
- Infer taste from high-rated words (lean that direction); note low-rated patterns to avoid pushing similar words unless clearly distinct.
- Diversify: not all rare words in the same semantic cluster — give them a spread that still feels coherent to *their* sensibility.
- Level 3 words should be CONVERSATION-READY: someone could use them in a text or meeting without sounding like they're showing off.
- If user-chosen exploration themes are provided in the user message, at least half of YOUR suggestions should clearly orbit those themes (spread across them): vocabulary, near-synonyms, and register fits — while the rest can bridge outward so the batch still feels varied.${
    includeTheme
      ? `\n- Every item's "theme" field must be EXACTLY one of the exploration theme labels listed in the user message — copy it verbatim, picking whichever one that word best fits.`
      : ""
  }
- Another completion fills the rest of the same grid in parallel — bias toward lemmas from distinct semantic clusters so batches rarely duplicate ideas (overlap will be discarded).
${JSON_ONLY}`;
}

const TASTE_GRID_BATCH_SIZES = [5, 5, 5, 5, 5] as const;
const TASTE_GRID_BATCH_LABELS = ["A", "B", "C", "D", "E"] as const;

const NAME_FEELING_SYSTEM = `You are Lexy — warm, literary, never corporate. You are a lexicographer of inner life: you find the exact English lemma for a feeling as it actually happened, not a prettier synonym of the word they reached for.

Return ONLY valid JSON matching this shape:
{
  "vague_label": "the imprecise word or short phrase they reached for (e.g. disappointment)",
  "why_not_that": "one or two sentences: what their vague label names, and why it misses THIS situation",
  "primary": {
    "word": "lowercase lemma they should actually use",
    "pronunciation": "IPA in slashes like /ʃəˈɡrɪn/",
    "part_of_speech": "noun|adjective|verb|etc",
    "definition": "one concise line (max ~22 words)",
    "origin": "etymology, concise",
    "why": "why THIS word captures the situation — the scene, not the category",
    "rewritten_phrase": "their thought, same voice and roughly the same length, using this word naturally — ready to paste"
  },
  "neighbors": [
    {
      "word": "lowercase lemma",
      "pronunciation": "IPA in slashes",
      "part_of_speech": "noun|adjective|verb|etc",
      "definition": "one concise line",
      "origin": "etymology, concise",
      "why": "when you would pick this instead of the primary — a distinct shade, not a duplicate",
      "rewritten_phrase": "their thought rewritten with THIS word, same voice"
    }
  ]
}

The bar: name the situation, not the emotion-category. If they said they feel disappointed for starting books and failing to keep the commitment, do not return a synonym of disappointment (let down, saddened, or disheartened as a mere swap). Reach for the word that names the specific sting — e.g. chagrin (embarrassment at failing oneself), akrasia (the will slipping against better judgment), self-reproach (the scolding after). The primary should be the best single fit; neighbors are real alternatives a careful speaker might choose instead.

Hard ban:
- Lazy synonym swaps with no situational fit (sad → melancholy, angry → irate, happy → joyful, disappointed → disheartened) unless the situation truly is that shade and nothing sharper exists.
- Motivational-poster language, therapy-speak, and invented or overly technical nonce words a serious reader would never say or write.
- Returning their own vague label as the primary.

Rules:
- primary is required; all of its fields are required.
- neighbors: exactly 2 or 3 items, each a distinct shade of the same situation — not near-duplicates of the primary or of each other.
- Every word MUST have IPA pronunciation in slashes.
- rewritten_phrase keeps their voice (contractions, register, first person if they used it). Do not inflate it into an essay; one or two sentences, paste-ready.
- Prefer one exact English lemma a serious reader would actually say or write. Rare is fine when it is the right word; obscure for its own sake is not.
- If they described a situation without naming an emotion, infer vague_label from the nearest common word they might have used.
${JSON_ONLY}`;

const SHARPEN_SYSTEM = `You are Lexy's sharpening editor — warm, literary, never corporate. Someone hands you their best attempt at a line. They can feel that more exact words exist; they just can't reach them. Sometimes they also tell you what they really mean and the tone they want.

Your job: keep their meaning and their voice, and replace the vague, hedged or generic parts with words that name exactly what they mean.

Return ONLY valid JSON matching this shape:
{
  "intent": "what they are actually trying to say, in one plain sentence — so they can check you understood",
  "vague": [
    { "phrase": "an exact substring of their line", "why": "what makes it vague, in a few words" }
  ],
  "versions": [
    {
      "tone": "one or two words naming the register (e.g. Direct, Diplomatic, Vivid, Warm, Formal)",
      "text": "their whole line, sharpened",
      "swaps": [
        { "from": "an exact substring of their line", "to": "the exact substring of text that replaced it", "why": "the precise shade the new words capture" }
      ]
    }
  ],
  "words": [
    {
      "word": "lowercase lemma",
      "pronunciation": "IPA in slashes",
      "part_of_speech": "noun|adjective|verb|etc",
      "definition": "one concise line",
      "why": "the exact shade it adds over the vague phrase it replaces"
    }
  ]
}

Example — they wrote "the orbs are actually not the best looking", meant "they look cheap; I want them to feel premium", tone Direct:
- vague: "not the best looking" (a hedge that names no actual flaw), "actually" (filler).
- versions: Direct "The orbs look cheap — they need to feel premium." · Diplomatic "The orbs feel a little unrefined; they could look far more luxurious." · Vivid "The orbs read as plasticky when they should feel like polished glass."
- words: unrefined, plasticky, lustrous, lackluster.

The bar:
- Name the actual quality. "Not the best looking" is a hedge; "cheap", "garish", "lackluster", "unrefined" each name a different flaw — pick the one that is true for their situation, using their note when they give one.
- Precision over ornament. No thesaurus inflation, purple prose, corporate filler or therapy-speak. A plain exact word beats a rare decorative one.
- Keep their voice: same person, tense and contractions; similar length (never more than about one and a half times theirs). A line stays a line.

Rules:
- versions: exactly 3, each a genuinely different register that still fits the situation — not a reshuffle of the same words. The first is your best fit in the tone they asked for (or in their own tone if they asked for none).
- vague: 1 to 4 items, each phrase copied exactly from their line. If the line is already precise, return [] and keep the versions light-touch.
- swaps: every "from" is an exact substring of their line; every "to" is an exact substring of that version's text.
- words: 3 to 5 lemmas used in the versions that are worth adding to a personal vocabulary — skip everyday words (look, want, need).
- Every word has IPA pronunciation in slashes.
${JSON_ONLY}`;

/* ---------- Input checks ---------- */

class TaskInputError extends Error {}

const LIMITS = {
  lexiconRows: 1000,
  word: 80,
  scribble: 12_000,
  feeling: 4000,
  line: 1500,
  intent: 800,
  tone: 60,
  imageChars: 4_200_000,
  /** Arrays longer than this are refused outright rather than trimmed. */
  rawList: 3000,
} as const;

const IMAGE_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"] as const;
type ImageType = (typeof IMAGE_TYPES)[number];

const CONTROL_CHARS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;

function record(v: unknown): Record<string, unknown> {
  if (!v || typeof v !== "object" || Array.isArray(v)) throw new TaskInputError("Lexy couldn't read that request.");
  return v as Record<string, unknown>;
}

/** Free text the person wrote: kept whole, or refused if empty or too long. */
function text(v: unknown, max: number, what: string): string {
  const t = typeof v === "string" ? v.replace(CONTROL_CHARS, "").trim() : "";
  if (!t) throw new TaskInputError(`Write ${what} first.`);
  if (t.length > max) throw new TaskInputError(`That ${what} is longer than Lexy can take in one go — try a shorter piece.`);
  return t;
}

function optionalText(v: unknown, max: number, what: string): string {
  if (v == null || (typeof v === "string" && !v.trim())) return "";
  return text(v, max, what);
}

/** A word or short phrase on one line. */
function oneLine(v: unknown): string {
  if (typeof v !== "string") return "";
  return v.replace(CONTROL_CHARS, " ").replace(/\s+/g, " ").trim().slice(0, LIMITS.word);
}

function list(v: unknown): unknown[] {
  if (v == null) return [];
  if (!Array.isArray(v) || v.length > LIMITS.rawList) throw new TaskInputError("Lexy couldn't read that request.");
  return v;
}

/** Up to `max` distinct one-line words, in the order given. */
function wordList(v: unknown, max: number): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of list(v)) {
    const w = oneLine(item);
    const k = w.toLowerCase();
    if (!w || seen.has(k)) continue;
    seen.add(k);
    out.push(w);
    if (out.length >= max) break;
  }
  return out;
}

function intIn(v: unknown, min: number, max: number): number {
  if (typeof v !== "number" || !Number.isInteger(v) || v < min || v > max) {
    throw new TaskInputError("Lexy couldn't read that request.");
  }
  return v;
}

function ratingOf(v: unknown): number | null {
  if (typeof v !== "number" || !Number.isFinite(v)) return null;
  return Math.round(Math.min(10, Math.max(1, v)) * 10) / 10;
}

interface LexRow {
  word: string;
  rating: number;
}

/** Their rated words, highest first — trimmed to what a prompt can sensibly carry. */
function lexiconRows(v: unknown): LexRow[] {
  const rows: LexRow[] = [];
  for (const item of list(v)) {
    if (!item || typeof item !== "object") continue;
    const o = item as Record<string, unknown>;
    const word = oneLine(o.word);
    const rating = ratingOf(o.rating);
    if (word && rating != null) rows.push({ word, rating });
  }
  return rows.sort((a, b) => b.rating - a.rating).slice(0, LIMITS.lexiconRows);
}

function lastRatedOf(v: unknown): LexRow | null {
  if (!v || typeof v !== "object") return null;
  const o = v as Record<string, unknown>;
  const word = oneLine(o.word);
  const rating = ratingOf(o.rating);
  return word && rating != null ? { word, rating } : null;
}

function lowerSet(words: string[]): Set<string> {
  return new Set(words.map((w) => w.toLowerCase().trim()).filter(Boolean));
}

function lexiconTastePayload(rows: LexRow[]): string {
  return rows.length ? rows.map((w) => `${w.word}: ${w.rating}`).join("\n") : "(empty — infer a literary, curious reader)";
}

/* ---------- Taste grid (Deep Dive) ---------- */

function tasteContext(input: Record<string, unknown>) {
  const rows = lexiconRows(input.lexicon);
  const threads = normalizeThreadList(input.threads);
  return {
    rows,
    threads,
    includeTheme: threads.length > 2,
    threadBlock: threadsContextForPrompt(threads),
    exclude: lowerSet(rows.map((r) => r.word)),
  };
}

function tasteBatch(input: Record<string, unknown>): BuiltLexyTask {
  const i = intIn(input.batch, 0, TASTE_GRID_BATCH_SIZES.length - 1);
  const { rows, includeTheme, threadBlock, exclude } = tasteContext(input);
  const lastRated = lastRatedOf(input.lastRated);
  const excludeList = [...exclude].slice(0, 200).join(", ") || "(none)";
  const last = lastRated
    ? `They just rated "${lastRated.word}" at ${lastRated.rating}/10 — let that inform the next grid.\n`
    : "";
  const baseUser = `${last}Words already in their lexicon (do NOT suggest these again): ${excludeList}

Their lexicon with ratings (higher = more love):
${lexiconTastePayload(rows)}
${threadBlock}`;
  const size = TASTE_GRID_BATCH_SIZES[i];
  return {
    task: "taste-batch",
    system: tasteGridSystem(size, includeTheme),
    content: `${baseUser}

Return ONLY batch ${TASTE_GRID_BATCH_LABELS[i]}: exactly ${size} NEW words — one fifth of a 25-word taste grid (four other completions supply the rest, in parallel). Bias toward a distinct semantic corner so batches rarely overlap.`,
    maxTokens: 1536,
    output: "json",
  };
}

function tasteFill(input: Record<string, unknown>): BuiltLexyTask {
  const need = intIn(input.need, 1, 25);
  const have = wordList(input.have, 25);
  const { rows, includeTheme, threadBlock, exclude } = tasteContext(input);
  const excludeList = [...exclude].slice(0, 200).join(", ") || "(none)";
  return {
    task: "taste-fill",
    system: `${tasteGridSystem(25, includeTheme)}\nThe merged batches had too few valid items after exclusions. Return a JSON object with "suggestions" containing EXACTLY ${need} new items only (same shape). Do not repeat: ${have.join(", ")}.`,
    content: `Still exclude from lexicon: ${excludeList}\nStill tuned to:\n${lexiconTastePayload(rows)}\n${threadBlock}`,
    maxTokens: 2560,
    output: "json",
  };
}

function tasteReplace(input: Record<string, unknown>): BuiltLexyTask {
  const n = intIn(input.count, 1, 5);
  const { rows, includeTheme, threadBlock } = tasteContext(input);
  const keepOut = wordList(input.keepOut, 60);
  const exclude = lowerSet([...rows.map((r) => r.word), ...keepOut]);
  const lastRated = lastRatedOf(input.lastRated);
  const last = lastRated
    ? `They just rated "${lastRated.word}" at ${lastRated.rating}/10 — let that steer these picks most of all.\n`
    : "";
  return {
    task: "taste-replace",
    system: tasteGridSystem(n, includeTheme),
    content: `${last}Words already in their lexicon or on their grid (do NOT suggest these): ${[...exclude].slice(0, 240).join(", ") || "(none)"}

Their lexicon with ratings (higher = more love):
${lexiconTastePayload(rows)}
${threadBlock}

Return exactly ${n} NEW word${n === 1 ? "" : "s"} to replace the ones they just rated on their grid.`,
    maxTokens: 1024,
    output: "json",
  };
}

/* ---------- Metaphors ---------- */

function metaphorContext(input: Record<string, unknown>) {
  const known = wordList(input.known, 40);
  const threads = normalizeThreadList(input.threads);
  const excludeList = [...lowerSet(wordList(input.exclude, 120))].join(", ") || "(none)";
  return {
    knownText: known.length ? known.join(", ") : "none yet — infer a thoughtful, image-minded reader",
    includeTheme: threads.length > 2,
    threadBlock: threadsContextForPrompt(threads),
    excludeList,
  };
}

function metaphorBatch(input: Record<string, unknown>): BuiltLexyTask {
  const i = intIn(input.batch, 0, METAPHOR_GRID_BATCH_SIZES.length - 1);
  const { knownText, includeTheme, threadBlock, excludeList } = metaphorContext(input);
  const baseUser = `They already keep these words/phrases: ${knownText}
${threadBlock}
Already shown or saved today (do NOT repeat these images): ${excludeList}`;
  const size = METAPHOR_GRID_BATCH_SIZES[i];
  return {
    task: "metaphor-batch",
    system: metaphorGridSystem(size, includeTheme),
    content: `${baseUser}

Return ONLY batch ${METAPHOR_GRID_BATCH_LABELS[i]}: exactly ${size} NEW metaphors — one quarter of today's grid (three other completions supply the rest, in parallel). Draw specifically from this domain: ${METAPHOR_GRID_BATCH_DOMAINS[i]}. Fresh, specific, felt — never stock phrasing.`,
    maxTokens: 1536,
    output: "json",
  };
}

function metaphorFill(input: Record<string, unknown>): BuiltLexyTask {
  const need = intIn(input.need, 1, 12);
  const have = wordList(input.have, 12);
  const { knownText, includeTheme, threadBlock, excludeList } = metaphorContext(input);
  return {
    task: "metaphor-fill",
    system: `${metaphorGridSystem(12, includeTheme)}\nThe merged batches had too few valid items. Return JSON with "suggestions" containing EXACTLY ${need} new items only. Do not repeat: ${have.join("; ")}.`,
    content: `Still exclude: ${excludeList}\nStill tuned to:\n${knownText}\n${threadBlock}`,
    maxTokens: 2048,
    output: "json",
  };
}

/* ---------- Writing tools ---------- */

function scribble(task: "scribble-rewrite" | "scribble-ideas", input: Record<string, unknown>): BuiltLexyTask {
  const body = text(input.text, LIMITS.scribble, "scribble");
  return {
    task,
    system: task === "scribble-rewrite" ? SCRIBBLE_REWRITE_SYSTEM : SCRIBBLE_IDEAS_SYSTEM,
    content: `Morning scribble:\n\n${body}`,
    maxTokens: 2048,
    output: "json",
  };
}

function handwriting(input: Record<string, unknown>): BuiltLexyTask {
  const mediaType = input.mediaType;
  if (typeof mediaType !== "string" || !(IMAGE_TYPES as readonly string[]).includes(mediaType)) {
    throw new TaskInputError("Lexy can read JPEG, PNG, GIF or WebP photos.");
  }
  const data = typeof input.image === "string" ? input.image.replace(/\s+/g, "") : "";
  if (!data || !/^[A-Za-z0-9+/]+={0,2}$/.test(data)) throw new TaskInputError("Lexy couldn't read that photo.");
  if (data.length > LIMITS.imageChars) throw new TaskInputError("That photo is too large — try a smaller one.");
  return {
    task: "handwriting",
    content: [
      { type: "image", source: { type: "base64", media_type: mediaType as ImageType, data } },
      { type: "text", text: HANDWRITING_INSTRUCTION },
    ],
    maxTokens: 4000,
    output: "text",
  };
}

function nameFeeling(input: Record<string, unknown>): BuiltLexyTask {
  const body = text(input.text, LIMITS.feeling, "feeling");
  return {
    task: "name-feeling",
    system: NAME_FEELING_SYSTEM,
    content: `They wrote:\n\n${body}`,
    maxTokens: 1536,
    output: "json",
  };
}

function sharpen(input: Record<string, unknown>): BuiltLexyTask {
  const line = text(input.line, LIMITS.line, "line");
  const intent = optionalText(input.intent, LIMITS.intent, "note");
  const tone = oneLine(input.tone).slice(0, LIMITS.tone);
  return {
    task: "sharpen",
    system: SHARPEN_SYSTEM,
    content: [
      `Their line:\n"""${line}"""`,
      `What they really mean: ${intent || "(not given — infer it from the line)"}`,
      `Tone they want: ${tone || "their own — keep it"}`,
    ].join("\n\n"),
    maxTokens: 1800,
    output: "json",
  };
}

/** Turn a named task and its inputs into the exact Claude request Lexy makes — or say why not. */
export function buildLexyTask(task: unknown, rawInput: unknown): LexyTaskBuild {
  if (!isLexyTask(task)) return { error: "Unknown task." };
  try {
    const input = record(rawInput);
    switch (task) {
      case "taste-batch":
        return tasteBatch(input);
      case "taste-fill":
        return tasteFill(input);
      case "taste-replace":
        return tasteReplace(input);
      case "metaphor-batch":
        return metaphorBatch(input);
      case "metaphor-fill":
        return metaphorFill(input);
      case "scribble-rewrite":
      case "scribble-ideas":
        return scribble(task, input);
      case "handwriting":
        return handwriting(input);
      case "name-feeling":
        return nameFeeling(input);
      case "sharpen":
        return sharpen(input);
    }
  } catch (e) {
    if (e instanceof TaskInputError) return { error: e.message };
    throw e;
  }
}
