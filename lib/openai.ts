import { clampVocabLevel, levelPromptBlock } from "@/lib/vocabLevels";
import { threadsContextForPrompt } from "@/lib/threads";
import type {
  DeepDiveResult,
  LexiconWord,
  MetaphorGridItem,
  MetaphorGridResponse,
  ScribbleAnalysis,
  TasteGridResponse,
  TasteGridWord,
} from "@/lib/types";

/** Same-origin proxy avoids browser CORS blocks on api.openai.com */
const CHAT = "/api/openai/chat";

async function chatJson<T>(
  apiKey: string,
  model: string,
  system: string,
  user: string,
  temperature = 0.4
): Promise<T> {
  const res = await fetch(CHAT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      apiKey,
      model,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      temperature,
      response_format: { type: "json_object" },
    }),
  });

  const rawText = await res.text();
  let data: {
    error?: { message?: string };
    choices?: { message?: { content?: string } }[];
  };
  try {
    data = JSON.parse(rawText) as typeof data;
  } catch {
    throw new Error(rawText.slice(0, 280) || `OpenAI error ${res.status}`);
  }

  if (!res.ok) {
    const msg = data.error?.message ?? rawText.slice(0, 280);
    throw new Error(msg || `OpenAI error ${res.status}`);
  }

  const raw = data.choices?.[0]?.message?.content;
  if (!raw) throw new Error("Empty response from model");
  return JSON.parse(raw) as T;
}

export async function readHandwriting(
  apiKey: string,
  base64: string,
  mediaType: string
): Promise<string> {
  const res = await fetch(CHAT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      apiKey,
      model: "gpt-4o",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Read this handwritten text exactly as written. Preserve punctuation, line breaks, and voice. Output plain text only — no preamble.",
            },
            {
              type: "image_url",
              image_url: {
                url: `data:${mediaType};base64,${base64}`,
                detail: "high",
              },
            },
          ],
        },
      ],
      max_tokens: 4000,
    }),
  });
  const rawText = await res.text();
  let data: {
    error?: { message?: string };
    choices?: { message?: { content?: string } }[];
  };
  try {
    data = JSON.parse(rawText) as typeof data;
  } catch {
    throw new Error(rawText.slice(0, 280) || `Vision error ${res.status}`);
  }
  if (!res.ok) {
    throw new Error(data.error?.message ?? `Vision error ${res.status}`);
  }
  const text = data.choices?.[0]?.message?.content?.trim();
  if (!text) throw new Error("Could not read handwriting");
  return text;
}

const SCRIBBLE_SYSTEM = `You are Lexy — warm, literary, never corporate. You are a master editor and lexicographer.
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
  ],
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
- word_upgrades: exactly 4 or 5 items (pick the best four or five spots).
- key_idea_expansions: 1 or 2 items.
- vocabulary_candidates: 5 or 6 words tied to their themes; every word MUST include IPA pronunciation.
- Keep their voice in upgraded_version; do not sound generic.`;

export async function analyseScribble(
  apiKey: string,
  text: string
): Promise<ScribbleAnalysis> {
  return chatJson<ScribbleAnalysis>(
    apiKey,
    "gpt-4o-mini",
    SCRIBBLE_SYSTEM,
    `Morning scribble:\n\n${text}`
  );
}

function metaphorGridSystem(itemCount: number): string {
  return `You are Lexy — warm, literary, never corporate. You create WEARABLE English metaphors: short phrases a thoughtful person could actually say or write.

Return ONLY valid JSON:
{
  "suggestions": [
    {
      "metaphor": "2–7 word phrase — concrete image mapped to a feeling or idea",
      "unpacking": "One plain sentence: SOURCE IMAGE (concrete) → TARGET (abstract). Start with 'Like' or 'As if'.",
      "image_strength": "one sentence: why this image lands emotionally",
      "example_sentences": ["three natural sentences that USE this exact metaphor phrase"],
      "why_for_you": "one short line: why this fits their taste and exploration themes"
    }
  ]
}

GOOD (clear image → clear meaning):
- "a furnace of worry" → mind constantly burning with anxiety
- "walking on glass" → fragile, careful, expecting to break something
- "the fog hasn't lifted" → confusion still hasn't cleared

BAD (never produce):
- Random poetic fragments with no clear mapping ("echo of silence", "velvet thunder")
- Abstract-on-abstract with no sensory image
- Single dictionary words or lemmas
- Invented-sounding literary nonsense that fails: "It felt like ___"

Rules:
- suggestions must contain EXACTLY ${itemCount} items.
- Each metaphor MUST pass: fill in "It felt like [metaphor]" OR "His mind was [metaphor]" — the sentence must make sense.
- Use a CONCRETE, sensory source (water, fire, weight, light, weather, road, body, glass, fog, furnace, anchor, etc.).
- unpacking MUST name both the image and what it stands for.
- example_sentences must embed the metaphor phrase verbatim at least once per sentence.
- Metaphors must be distinct — no near-duplicates.
- Do not repeat any phrase in the user exclusion list (case-insensitive).
- Another completion fills the rest of this grid in parallel — use different source domains (water vs fire vs weight vs light).`;
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

/**
 * Exactly 10 metaphors for the grid — same rhythm as Deep Dive’s 25-word grid, fewer cells.
 * Uses two parallel API requests (5 + 5) so latency tracks the slower call.
 */
export async function generateMetaphorGrid(
  apiKey: string,
  lexicon: Record<string, LexiconWord>,
  explorationThreads: string[] = [],
  excludeMetaphors: string[] = []
): Promise<MetaphorGridResponse> {
  const keys = Object.keys(lexicon).slice(0, 40);
  const known = keys.length
    ? keys.join(", ")
    : "none yet — infer a thoughtful, image-minded reader";

  const threadBlock = threadsContextForPrompt(explorationThreads);
  const excludeSet = new Set(excludeMetaphors.map((m) => m.toLowerCase().trim()).filter(Boolean));
  const excludeList = [...excludeSet].slice(0, 120).join(", ") || "(none)";

  const baseUser = `They already keep these words/phrases: ${known}
${threadBlock}
Already shown or saved today (do NOT repeat these images): ${excludeList}`;

  const system5a = metaphorGridSystem(5);
  const system5b = metaphorGridSystem(5);

  const user5a = `${baseUser}

Return ONLY batch A: exactly 5 NEW wearable metaphors — first half of today’s grid (another completion supplies batch B). Each must be a concrete image mapped to a clear feeling. Test every one in "It felt like ___".`;

  const user5b = `${baseUser}

Return ONLY batch B: exactly 5 NEW wearable metaphors — second half of the same grid (batch A covered water/weather). Use different domains: fire, weight, road, body, light, glass, anchor. Each must pass "It felt like ___".`;

  const [rawA, rawB] = await Promise.all([
    chatJson<MetaphorGridResponse>(apiKey, "gpt-4o", system5a, user5a, 0.55),
    chatJson<MetaphorGridResponse>(apiKey, "gpt-4o", system5b, user5b, 0.55),
  ]);

  const suggestions = mergeMetaphorSuggestions(
    [Array.isArray(rawA.suggestions) ? rawA.suggestions : [], Array.isArray(rawB.suggestions) ? rawB.suggestions : []],
    excludeSet
  );

  const baseSystem10 = metaphorGridSystem(10);

  if (suggestions.length < 10) {
    const need = 10 - suggestions.length;
    const fill = await chatJson<MetaphorGridResponse>(
      apiKey,
      "gpt-4o",
      `${baseSystem10}\nThe merged batches had too few valid items. Return JSON with "suggestions" containing EXACTLY ${need} new items only. Do not repeat: ${suggestions.map((s) => s.metaphor).join("; ")}.`,
      `Still exclude: ${excludeList}\nStill tuned to:\n${known}\n${threadBlock}`,
      0.5
    );
    for (const s of fill.suggestions ?? []) {
      if (suggestions.length >= 10) break;
      const k = s.metaphor?.toLowerCase().trim();
      if (k && !excludeSet.has(k) && !suggestions.some((x) => x.metaphor.toLowerCase() === k)) {
        suggestions.push(s);
      }
    }
  }

  return { suggestions: suggestions.slice(0, 10) };
}

function lexiconTastePayload(lexicon: Record<string, LexiconWord>): string {
  const rows = Object.values(lexicon)
    .sort((a, b) => b.rating - a.rating)
    .map((w) => `${w.word}: ${w.rating}`);
  return rows.length ? rows.join("\n") : "(empty — infer a literary, curious reader)";
}

function tasteGridSystem(itemCount: number): string {
  return `You are Lexy — warm, literary, never corporate. Return ONLY valid JSON:
{
  "suggestions": [
    {
      "word": "lemma",
      "pronunciation": "IPA with slashes — mandatory on every word",
      "part_of_speech": "noun|verb|adjective|etc",
      "level": 3,
      "definition": "one concise line (max ~18 words)",
      "why_for_you": "one short line: why this word fits their emerging taste (not generic)"
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
- If user-chosen exploration themes are provided in the user message, at least half of YOUR suggestions should clearly orbit those themes (spread across them): vocabulary, near-synonyms, and register fits — while the rest can bridge outward so the batch still feels varied.
- Another completion fills the rest of the same grid in parallel — bias toward lemmas from distinct semantic clusters so batches rarely duplicate ideas (overlap will be discarded).`;
}

function normalizeTasteGridWord(s: TasteGridWord): TasteGridWord {
  return { ...s, level: clampVocabLevel(s.level) };
}

/** Drop level-1 words and cap level-2 — the grid is for upgrades, not basics. */
function filterGridLevels(words: TasteGridWord[]): TasteGridWord[] {
  let twos = 0;
  return words.map(normalizeTasteGridWord).filter((w) => {
    if (w.level === 1) return false;
    if (w.level === 2) {
      twos += 1;
      return twos <= 2;
    }
    return true;
  });
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
      out.push(normalizeTasteGridWord(s));
    }
  }
  return out;
}

/**
 * Exactly 25 words tailored to current ratings. Excludes words already in the lexicon.
 * Fetched when the user opens Deep Dive or taps New batch — not on every rating.
 *
 * Uses two parallel API requests (13 + 12 words) so wall-clock time tracks the slower call instead of one huge completion.
 */
export async function generateTasteGrid(
  apiKey: string,
  lexicon: Record<string, LexiconWord>,
  explorationThreads: string[] = []
): Promise<TasteGridResponse> {
  const exclude = new Set(Object.keys(lexicon).map((k) => k.toLowerCase()));
  const excludeList = [...exclude].slice(0, 200).join(", ") || "(none)";

  const threadBlock = threadsContextForPrompt(explorationThreads);

  const baseUser = `Words already in their lexicon (do NOT suggest these again): ${excludeList}

Their lexicon with ratings (higher = more love):
${lexiconTastePayload(lexicon)}
${threadBlock}`;

  const system13 = tasteGridSystem(13);
  const system12 = tasteGridSystem(12);

  const user13 = `${baseUser}

Return ONLY batch A: exactly 13 NEW words — half of a 25-word taste grid (another completion supplies the other half).`;

  const user12 = `${baseUser}

Return ONLY batch B: exactly 12 NEW words — the other half of the same grid (another completion supplied batch A).`;

  const [rawA, rawB] = await Promise.all([
    chatJson<{ suggestions: TasteGridWord[] }>(apiKey, "gpt-4o-mini", system13, user13, 0.75),
    chatJson<{ suggestions: TasteGridWord[] }>(apiKey, "gpt-4o-mini", system12, user12, 0.75),
  ]);

  let filtered = filterGridLevels(
    mergeTasteSuggestions(
      [Array.isArray(rawA.suggestions) ? rawA.suggestions : [], Array.isArray(rawB.suggestions) ? rawB.suggestions : []],
      exclude
    )
  );

  const baseSystem25 = tasteGridSystem(25);

  if (filtered.length < 25) {
    const need = 25 - filtered.length;
    const fill = await chatJson<{ suggestions: TasteGridWord[] }>(
      apiKey,
      "gpt-4o-mini",
      `${baseSystem25}\nThe merged batches had too few valid items after exclusions. Return a JSON object with "suggestions" containing EXACTLY ${need} new items only (same shape). Do not repeat: ${filtered.map((f) => f.word).join(", ")}.`,
      `Still exclude from lexicon: ${excludeList}\nStill tuned to:\n${lexiconTastePayload(lexicon)}\n${threadBlock}`,
      0.7
    );
    for (const s of fill.suggestions ?? []) {
      if (filtered.length >= 25) break;
      const k = s.word?.toLowerCase().trim();
      if (!k || exclude.has(k) || filtered.some((x) => x.word.toLowerCase() === k)) continue;
      const normalized = normalizeTasteGridWord(s);
      if (normalized.level === 1) continue;
      if (normalized.level === 2 && filtered.filter((x) => x.level === 2).length >= 2) continue;
      filtered.push(normalized);
    }
  }

  filtered = filterGridLevels(filtered);
  return { suggestions: filtered.slice(0, 25) };
}

/** Fill in dual definitions and sources when the model returns a legacy shape. */
export function normalizeDeepDiveResult(raw: DeepDiveResult): DeepDiveResult {
  const reference_definition =
    raw.reference_definition?.trim() || raw.definition?.trim() || "";
  const lexy_definition =
    raw.lexy_definition?.trim() || raw.definition?.trim() || reference_definition;
  return {
    ...raw,
    reference_definition,
    reference_source: raw.reference_source?.trim() || "Oxford English Dictionary",
    lexy_definition,
    pronunciation_source: raw.pronunciation_source?.trim() || "Oxford English Dictionary",
    level: clampVocabLevel(raw.level),
  };
}

export async function deepDiveWord(
  apiKey: string,
  word: string
): Promise<DeepDiveResult> {
  const system = `You are Lexy — a literary lexicographer. Return ONLY valid JSON:
{
  "word": "the word",
  "pronunciation": "IPA in slashes — British and American when they differ, British first",
  "pronunciation_source": "Oxford English Dictionary or Cambridge English Pronouncing Dictionary — pick the best match",
  "part_of_speech": "string",
  "reference_definition": "precise dictionary-style gloss — as Oxford would phrase it (1–2 sentences max)",
  "reference_source": "Oxford English Dictionary",
  "lexy_definition": "Lexy's gloss: one vivid sentence, plain English, easy to remember — what the word FEELS like to use",
  "level": 3,
  "nuance": "what this word captures that near-synonyms do not",
  "example_sentences": ["three sentences"],
  "origin": "etymology — concise",
  "related_words": ["three related words"],
  "used_by": "a memorable literary appearance — author or work",
  "related_form_definitions": [
    { "word": "lemma", "part_of_speech": "adjective|noun|etc", "definition": "short gloss — meaning only" }
  ]
}
${levelPromptBlock()}

Rules:
- level must match the word's real-world difficulty (most deep-dive words are 3–5).
- reference_definition and lexy_definition MUST differ in tone: reference = precise/authoritative; lexy = memorable/everyday.
- pronunciation_source and reference_source must name real references (Oxford English Dictionary, Merriam-Webster, Cambridge Dictionary, etc.).
- example_sentences length 3. related_words length 3. Pronunciation mandatory.
- related_form_definitions: 3 to 8 entries when the headword has common inflected or derived English forms. Exclude the headword. If none, use [].`;

  const raw = await chatJson<DeepDiveResult>(
    apiKey,
    "gpt-4o-mini",
    system,
    `Full story of the word: "${word.trim()}"`
  );
  return normalizeDeepDiveResult(raw);
}
