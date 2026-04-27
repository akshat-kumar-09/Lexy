import { threadsContextForPrompt } from "@/lib/threads";
import type {
  DeepDiveResult,
  LexiconWord,
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

/**
 * Exactly 10 metaphors for the grid — same rhythm as Deep Dive’s 25-word grid, fewer cells.
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

  const system = `You are Lexy — warm, literary, never corporate. Return ONLY valid JSON:
{
  "suggestions": [
    {
      "metaphor": "vivid figurative phrase someone could adopt — not a single dictionary lemma",
      "unpacking": "plain language: what the image means",
      "image_strength": "one sentence: why this image lands",
      "example_sentences": ["three natural sentences using or alluding to this metaphor"],
      "why_for_you": "one short line: why this fits their taste and their exploration themes"
    }
  ]
}
Rules:
- suggestions must contain EXACTLY 10 items.
- Each item needs all fields. example_sentences must have exactly 3 strings.
- Metaphors must be distinct — no near-duplicates.
- Do not repeat any metaphor phrase listed in the user message exclusion list (case-insensitive).`;

  const user = `They already keep these words/phrases: ${known}
${threadBlock}
Already shown or saved today (do NOT repeat these images): ${excludeList}

Return 10 NEW wearable metaphors — fresh, specific; clichés only if subverted. Spread across varied images while still coherent with their lexicon and any exploration themes they named.`;

  const raw = await chatJson<MetaphorGridResponse>(apiKey, "gpt-4o-mini", system, user, 0.72);

  let suggestions = Array.isArray(raw.suggestions) ? raw.suggestions : [];
  suggestions = suggestions.filter(
    (s) => s.metaphor && !excludeSet.has(s.metaphor.toLowerCase().trim())
  );

  if (suggestions.length < 10) {
    const need = 10 - suggestions.length;
    const fill = await chatJson<MetaphorGridResponse>(
      apiKey,
      "gpt-4o-mini",
      `${system}\nThe previous reply had too few valid items. Return JSON with "suggestions" containing EXACTLY ${need} new items only. Do not repeat: ${suggestions.map((s) => s.metaphor).join("; ")}.`,
      `Still exclude: ${excludeList}\nStill tuned to:\n${known}\n${threadBlock}`,
      0.68
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

/**
 * Exactly 25 words tailored to current ratings. Excludes words already in the lexicon.
 * Call again after each rating so the grid reflects refined taste.
 */
export async function generateTasteGrid(
  apiKey: string,
  lexicon: Record<string, LexiconWord>,
  context?: { lastRatedWord?: string; lastRating?: number },
  explorationThreads: string[] = []
): Promise<TasteGridResponse> {
  const exclude = new Set(Object.keys(lexicon).map((k) => k.toLowerCase()));
  const excludeList = [...exclude].slice(0, 200).join(", ") || "(none)";

  const threadBlock = threadsContextForPrompt(explorationThreads);

  const system = `You are Lexy — warm, literary, never corporate. Return ONLY valid JSON:
{
  "suggestions": [
    {
      "word": "lemma",
      "pronunciation": "IPA with slashes — mandatory on every word",
      "part_of_speech": "noun|verb|adjective|etc",
      "definition": "one concise line (max ~18 words)",
      "why_for_you": "one short line: why this word fits their emerging taste (not generic)"
    }
  ]
}
Rules:
- suggestions must contain EXACTLY 25 items.
- Every word MUST have IPA pronunciation in slashes.
- Do not include any word the user already has in their lexicon (case-insensitive match on lemma).
- Infer taste from high-rated words (lean that direction); note low-rated patterns to avoid pushing similar words unless clearly distinct.
- Diversify: not all rare words in the same semantic cluster — give them a spread that still feels coherent to *their* sensibility.
- Words should be real English vocabulary a serious reader would meet (include some uncommon gems).
- If user-chosen exploration themes are provided in the user message, at least half the suggestions should clearly orbit those themes (spread across them): vocabulary, near-synonyms, and register fits — while the rest can bridge outward so the grid still feels varied.`;

  const last =
    context?.lastRatedWord && context.lastRating != null
      ? `They just rated "${context.lastRatedWord}" at ${context.lastRating}/10 — let that inform the next grid.\n`
      : "";

  const user = `${last}Words already in their lexicon (do NOT suggest these again): ${excludeList}

Their lexicon with ratings (higher = more love):
${lexiconTastePayload(lexicon)}
${threadBlock}
Generate 25 NEW words for the grid — this grid is how Lexy learns and mirrors their taste. Refresh the palette: new lemmas only, tuned to what the ratings imply.`;

  const raw = await chatJson<{ suggestions: TasteGridWord[] }>(
    apiKey,
    "gpt-4o-mini",
    system,
    user,
    0.75
  );

  const suggestions = Array.isArray(raw.suggestions) ? raw.suggestions : [];
  const filtered = suggestions.filter((s) => s.word && !exclude.has(s.word.toLowerCase().trim()));
  if (filtered.length < 25) {
    const need = 25 - filtered.length;
    const fill = await chatJson<{ suggestions: TasteGridWord[] }>(
      apiKey,
      "gpt-4o-mini",
      `${system}\nThe previous reply had too few valid items after exclusions. Return a JSON object with "suggestions" containing EXACTLY ${need} new items only (same shape). Do not repeat: ${filtered.map((f) => f.word).join(", ")}.`,
      `Still exclude from lexicon: ${excludeList}\nStill tuned to:\n${lexiconTastePayload(lexicon)}\n${threadBlock}`,
      0.7
    );
    for (const s of fill.suggestions ?? []) {
      if (filtered.length >= 25) break;
      const k = s.word?.toLowerCase().trim();
      if (k && !exclude.has(k) && !filtered.some((x) => x.word.toLowerCase() === k)) filtered.push(s);
    }
  }

  return { suggestions: filtered.slice(0, 25) };
}

export async function deepDiveWord(
  apiKey: string,
  word: string
): Promise<DeepDiveResult> {
  const system = `You are Lexy. Return ONLY valid JSON:
{
  "word": "the word",
  "pronunciation": "IPA with slashes",
  "part_of_speech": "string",
  "definition": "precise definition",
  "nuance": "what this word captures that near-synonyms do not",
  "example_sentences": ["three sentences"],
  "origin": "etymology",
  "related_words": ["three related words"],
  "used_by": "a memorable literary appearance — author or work"
}
All fields required. example_sentences length 3. related_words length 3. Pronunciation mandatory.`;

  return chatJson<DeepDiveResult>(
    apiKey,
    "gpt-4o-mini",
    system,
    `Full story of the word: "${word.trim()}"`
  );
}
