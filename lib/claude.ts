import { normalizeThreadList, threadsContextForPrompt } from "@/lib/threads";
import type {
  DeepDiveResult,
  LexiconWord,
  MetaphorGridItem,
  MetaphorGridResponse,
  ScribbleAnalysis,
  TasteGridResponse,
  TasteGridWord,
} from "@/lib/types";

/** Same-origin proxy avoids browser CORS blocks on api.anthropic.com — server holds the one shared key. */
const CHAT = "/api/claude/chat";
const MODEL = "claude-haiku-4-5";

const JSON_ONLY = "Respond with ONLY the JSON object — no markdown code fences, no commentary before or after.";

function stripCodeFence(raw: string): string {
  return raw
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();
}

async function chatJson<T>(
  system: string,
  user: string,
  maxTokens = 2048,
  temperature = 0.4
): Promise<T> {
  const res = await fetch(CHAT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: maxTokens,
      temperature,
      system,
      messages: [{ role: "user", content: user }],
    }),
  });

  const rawText = await res.text();
  let data: {
    error?: { message?: string };
    content?: { type: string; text?: string }[];
  };
  try {
    data = JSON.parse(rawText) as typeof data;
  } catch {
    throw new Error(rawText.slice(0, 280) || `Claude error ${res.status}`);
  }

  if (!res.ok) {
    const msg = data.error?.message ?? rawText.slice(0, 280);
    throw new Error(msg || `Claude error ${res.status}`);
  }

  const block = data.content?.find((b) => b.type === "text");
  const raw = block?.text;
  if (!raw) throw new Error("Empty response from model");
  return JSON.parse(stripCodeFence(raw)) as T;
}

export async function readHandwriting(
  base64: string,
  mediaType: string
): Promise<string> {
  const res = await fetch(CHAT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 4000,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: { type: "base64", media_type: mediaType, data: base64 },
            },
            {
              type: "text",
              text: "Read this handwritten text exactly as written. Preserve punctuation, line breaks, and voice. Output plain text only — no preamble.",
            },
          ],
        },
      ],
    }),
  });
  const rawText = await res.text();
  let data: {
    error?: { message?: string };
    content?: { type: string; text?: string }[];
  };
  try {
    data = JSON.parse(rawText) as typeof data;
  } catch {
    throw new Error(rawText.slice(0, 280) || `Vision error ${res.status}`);
  }
  if (!res.ok) {
    throw new Error(data.error?.message ?? `Vision error ${res.status}`);
  }
  const block = data.content?.find((b) => b.type === "text");
  const text = block?.text?.trim();
  if (!text) throw new Error("Could not read handwriting");
  return text;
}

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

/** Two parallel completions (rewrite + ideas/vocab) so wall-clock time tracks the slower call instead of one long one. */
export async function analyseScribble(text: string): Promise<ScribbleAnalysis> {
  const user = `Morning scribble:\n\n${text}`;
  const [rewrite, ideas] = await Promise.all([
    chatJson<Pick<ScribbleAnalysis, "upgraded_version" | "word_upgrades">>(
      SCRIBBLE_REWRITE_SYSTEM,
      user,
      2048
    ),
    chatJson<Pick<ScribbleAnalysis, "key_idea_expansions" | "vocabulary_candidates">>(
      SCRIBBLE_IDEAS_SYSTEM,
      user,
      2048
    ),
  ]);
  return { ...rewrite, ...ideas };
}

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

function mergeMetaphorSuggestions(batches: MetaphorGridItem[][], excludeSet: Set<string>): MetaphorGridItem[] {
  const seen = new Set<string>();
  const out: MetaphorGridItem[] = [];
  for (const batch of batches) {
    for (const s of batch) {
      const k = s.metaphor?.toLowerCase().trim();
      if (!k || excludeSet.has(k) || seen.has(k)) continue;
      seen.add(k);
      out.push(s);
    }
  }
  return out;
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

/**
 * Exactly 12 metaphors for the grid — same rhythm as Deep Dive's 25-word grid, fewer cells.
 * Uses four parallel API requests (3 each), each pinned to a different concrete domain, so
 * latency tracks the slowest call and the set doesn't collapse into one register.
 *
 * `onBatch`, if given, fires as soon as each parallel completion lands (and again for the
 * fallback fill, if needed) so the UI can paint results as they arrive instead of waiting
 * for the whole grid.
 */
export async function generateMetaphorGrid(
  lexicon: Record<string, LexiconWord>,
  explorationThreads: string[] = [],
  excludeMetaphors: string[] = [],
  onBatch?: (items: MetaphorGridItem[]) => void
): Promise<MetaphorGridResponse> {
  const keys = Object.keys(lexicon).slice(0, 40);
  const known = keys.length
    ? keys.join(", ")
    : "none yet — infer a thoughtful, image-minded reader";

  const threadBlock = threadsContextForPrompt(explorationThreads);
  const includeTheme = normalizeThreadList(explorationThreads).length > 2;
  const excludeSet = new Set(excludeMetaphors.map((m) => m.toLowerCase().trim()).filter(Boolean));
  const excludeList = [...excludeSet].slice(0, 120).join(", ") || "(none)";

  const baseUser = `They already keep these words/phrases: ${known}
${threadBlock}
Already shown or saved today (do NOT repeat these images): ${excludeList}`;

  const dispatched = new Set<string>();
  function emit(items: MetaphorGridItem[]) {
    if (!onBatch) return;
    const fresh = items.filter((s) => {
      const k = s.metaphor?.toLowerCase().trim();
      if (!k || excludeSet.has(k) || dispatched.has(k)) return false;
      dispatched.add(k);
      return true;
    });
    if (fresh.length) onBatch(fresh);
  }

  const batches = await Promise.all(
    METAPHOR_GRID_BATCH_SIZES.map((size, i) =>
      chatJson<MetaphorGridResponse>(
        metaphorGridSystem(size, includeTheme),
        `${baseUser}

Return ONLY batch ${METAPHOR_GRID_BATCH_LABELS[i]}: exactly ${size} NEW metaphors — one quarter of today's grid (three other completions supply the rest, in parallel). Draw specifically from this domain: ${METAPHOR_GRID_BATCH_DOMAINS[i]}. Fresh, specific, felt — never stock phrasing.`,
        1536,
        0.85
      ).then((r) => {
        emit(Array.isArray(r.suggestions) ? r.suggestions : []);
        return r;
      })
    )
  );

  const suggestions = mergeMetaphorSuggestions(
    batches.map((b) => (Array.isArray(b.suggestions) ? b.suggestions : [])),
    excludeSet
  );

  const baseSystem12 = metaphorGridSystem(12, includeTheme);

  if (suggestions.length < 12) {
    const need = 12 - suggestions.length;
    const fill = await chatJson<MetaphorGridResponse>(
      `${baseSystem12}\nThe merged batches had too few valid items. Return JSON with "suggestions" containing EXACTLY ${need} new items only. Do not repeat: ${suggestions.map((s) => s.metaphor).join("; ")}.`,
      `Still exclude: ${excludeList}\nStill tuned to:\n${known}\n${threadBlock}`,
      2048,
      0.8
    );
    emit(Array.isArray(fill.suggestions) ? fill.suggestions : []);
    for (const s of fill.suggestions ?? []) {
      if (suggestions.length >= 12) break;
      const k = s.metaphor?.toLowerCase().trim();
      if (k && !excludeSet.has(k) && !suggestions.some((x) => x.metaphor.toLowerCase() === k)) {
        suggestions.push(s);
      }
    }
  }

  return { suggestions: suggestions.slice(0, 12) };
}

function lexiconTastePayload(lexicon: Record<string, LexiconWord>): string {
  const rows = Object.values(lexicon)
    .sort((a, b) => b.rating - a.rating)
    .map((w) => `${w.word}: ${w.rating}`);
  return rows.length ? rows.join("\n") : "(empty — infer a literary, curious reader)";
}

function tasteGridSystem(itemCount: number, includeTheme: boolean): string {
  return `You are Lexy — warm, literary, never corporate. Return ONLY valid JSON:
{
  "suggestions": [
    {
      "word": "lemma",
      "pronunciation": "IPA with slashes — mandatory on every word",
      "part_of_speech": "noun|verb|adjective|etc",
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
Rules:
- suggestions must contain EXACTLY ${itemCount} items.
- Every word MUST have IPA pronunciation in slashes.
- Do not include any word the user already has in their lexicon (case-insensitive match on lemma).
- Infer taste from high-rated words (lean that direction); note low-rated patterns to avoid pushing similar words unless clearly distinct.
- Diversify: not all rare words in the same semantic cluster — give them a spread that still feels coherent to *their* sensibility.
- Words should be real English vocabulary a serious reader would meet (include some uncommon gems).
- If user-chosen exploration themes are provided in the user message, at least half of YOUR suggestions should clearly orbit those themes (spread across them): vocabulary, near-synonyms, and register fits — while the rest can bridge outward so the batch still feels varied.${
    includeTheme
      ? `\n- Every item's "theme" field must be EXACTLY one of the exploration theme labels listed in the user message — copy it verbatim, picking whichever one that word best fits.`
      : ""
  }
- Another completion fills the rest of the same grid in parallel — bias toward lemmas from distinct semantic clusters so batches rarely duplicate ideas (overlap will be discarded).
${JSON_ONLY}`;
}

function mergeTasteSuggestions(
  batches: TasteGridWord[][],
  exclude: Set<string>
): TasteGridWord[] {
  const seen = new Set<string>();
  const out: TasteGridWord[] = [];
  for (const batch of batches) {
    for (const s of batch) {
      const k = s.word?.toLowerCase().trim();
      if (!k || exclude.has(k) || seen.has(k)) continue;
      seen.add(k);
      out.push(s);
    }
  }
  return out;
}

const TASTE_GRID_BATCH_SIZES = [5, 5, 5, 5, 5] as const;
const TASTE_GRID_BATCH_LABELS = ["A", "B", "C", "D", "E"] as const;

/**
 * Exactly 25 words tailored to current ratings. Excludes words already in the lexicon.
 * Call again after each rating so the grid reflects refined taste.
 *
 * Uses five parallel API requests (5 words each) instead of one huge completion — wall-clock
 * time tracks the slowest 5-word batch instead of a 25-word (or even 13-word) completion.
 *
 * `onBatch`, if given, fires as soon as each of those five completions lands (and again for the
 * fallback fill, if needed) so the UI can paint words as they arrive instead of waiting for the
 * whole grid.
 */
export async function generateTasteGrid(
  lexicon: Record<string, LexiconWord>,
  context?: { lastRatedWord?: string; lastRating?: number },
  explorationThreads: string[] = [],
  onBatch?: (words: TasteGridWord[]) => void
): Promise<TasteGridResponse> {
  const exclude = new Set(Object.keys(lexicon).map((k) => k.toLowerCase()));
  const excludeList = [...exclude].slice(0, 200).join(", ") || "(none)";

  const threadBlock = threadsContextForPrompt(explorationThreads);
  const includeTheme = normalizeThreadList(explorationThreads).length > 2;

  const last =
    context?.lastRatedWord && context.lastRating != null
      ? `They just rated "${context.lastRatedWord}" at ${context.lastRating}/10 — let that inform the next grid.\n`
      : "";

  const baseUser = `${last}Words already in their lexicon (do NOT suggest these again): ${excludeList}

Their lexicon with ratings (higher = more love):
${lexiconTastePayload(lexicon)}
${threadBlock}`;

  const dispatched = new Set<string>();
  function emit(words: TasteGridWord[]) {
    if (!onBatch) return;
    const fresh = words.filter((s) => {
      const k = s.word?.toLowerCase().trim();
      if (!k || exclude.has(k) || dispatched.has(k)) return false;
      dispatched.add(k);
      return true;
    });
    if (fresh.length) onBatch(fresh);
  }

  const batches = await Promise.all(
    TASTE_GRID_BATCH_SIZES.map((size, i) =>
      chatJson<{ suggestions: TasteGridWord[] }>(
        tasteGridSystem(size, includeTheme),
        `${baseUser}

Return ONLY batch ${TASTE_GRID_BATCH_LABELS[i]}: exactly ${size} NEW words — one fifth of a 25-word taste grid (four other completions supply the rest, in parallel). Bias toward a distinct semantic corner so batches rarely overlap.`,
        640,
        0.75
      ).then((r) => {
        emit(Array.isArray(r.suggestions) ? r.suggestions : []);
        return r;
      })
    )
  );

  const filtered = mergeTasteSuggestions(
    batches.map((b) => (Array.isArray(b.suggestions) ? b.suggestions : [])),
    exclude
  );

  const baseSystem25 = tasteGridSystem(25, includeTheme);

  if (filtered.length < 25) {
    const need = 25 - filtered.length;
    const fill = await chatJson<{ suggestions: TasteGridWord[] }>(
      `${baseSystem25}\nThe merged batches had too few valid items after exclusions. Return a JSON object with "suggestions" containing EXACTLY ${need} new items only (same shape). Do not repeat: ${filtered.map((f) => f.word).join(", ")}.`,
      `Still exclude from lexicon: ${excludeList}\nStill tuned to:\n${lexiconTastePayload(lexicon)}\n${threadBlock}`,
      2560,
      0.7
    );
    emit(Array.isArray(fill.suggestions) ? fill.suggestions : []);
    for (const s of fill.suggestions ?? []) {
      if (filtered.length >= 25) break;
      const k = s.word?.toLowerCase().trim();
      if (k && !exclude.has(k) && !filtered.some((x) => x.word.toLowerCase() === k)) filtered.push(s);
    }
  }

  return { suggestions: filtered.slice(0, 25) };
}

const DEEP_DIVE_CORE_SYSTEM = `You are Lexy. Return ONLY valid JSON:
{
  "word": "the word",
  "pronunciation": "IPA with slashes",
  "part_of_speech": "string",
  "definition": "precise definition",
  "nuance": "what this word captures that near-synonyms do not",
  "example_sentences": ["three sentences"],
  "conversation_phrases": ["two or three short, natural one-liners a real person could actually say out loud today — texting a friend, small talk, venting about work, a quick aside — using this word in casual spoken register, not literary or written-page style"],
  "origin": "etymology"
}
All fields required. example_sentences length 3. conversation_phrases length 2 or 3, genuinely sayable out loud (contractions, casual tone are good). Pronunciation mandatory.
${JSON_ONLY}`;

const DEEP_DIVE_EXTRAS_SYSTEM = `You are Lexy. Return ONLY valid JSON:
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

type DeepDiveCore = Omit<DeepDiveResult, "related_words" | "used_by" | "related_form_definitions">;

/**
 * Two parallel completions (core facts + related/etymology extras) so wall-clock latency tracks
 * the slower half, not the sum. `onCore`, if given, fires as soon as the core half lands — the
 * word, pronunciation, definition, nuance, examples, and origin — so the UI can show the word
 * immediately instead of waiting on the (slower-to-matter) related-words/etymology extras too.
 */
export async function deepDiveWord(word: string, onCore?: (core: DeepDiveCore) => void): Promise<DeepDiveResult> {
  const trimmed = word.trim();
  const user = `Full story of the word: "${trimmed}"`;

  const [core, extras] = await Promise.all([
    chatJson<DeepDiveCore>(DEEP_DIVE_CORE_SYSTEM, user, 1536).then((c) => {
      onCore?.(c);
      return c;
    }),
    chatJson<Pick<DeepDiveResult, "related_words" | "used_by" | "related_form_definitions">>(
      DEEP_DIVE_EXTRAS_SYSTEM,
      user,
      1536,
      0.5
    ),
  ]);

  return { ...core, ...extras };
}
