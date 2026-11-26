import {
  isBlockingLexyError,
  LexyRequestError,
  type LexyErrorCode,
  type LexyTaskName,
} from "@/lib/lexyApi";
import { clampVocabLevel } from "@/lib/vocabLevels";
import type {
  DeepDiveResult,
  FeelingNameCandidate,
  FeelingNameResult,
  LexiconWord,
  MetaphorGridItem,
  MetaphorGridResponse,
  ScribbleAnalysis,
  SharpenResult,
  SharpenSwap,
  SharpenVersion,
  SharpenWord,
  TasteGridResponse,
  TasteGridWord,
} from "@/lib/types";

/**
 * Lexy's Claude features, from the browser's side. Each call names a task and sends its inputs to
 * /api/lexy, which builds the prompt on the server (lib/lexyTasks.ts), checks sign-in and the
 * daily allowance, and calls Claude with Lexy's key. Batching, merging and tidying stay here.
 */

const TASK_URL = "/api/lexy";

/** Run one named task. JSON tasks resolve to the parsed reply; handwriting resolves to text. */
async function runTask<T>(task: LexyTaskName, input: Record<string, unknown>): Promise<T> {
  const res = await fetch(TASK_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ task, input }),
  });

  const raw = await res.text();
  let body: { data?: unknown; text?: string; error?: string | { message?: string; code?: LexyErrorCode } };
  try {
    body = JSON.parse(raw) as typeof body;
  } catch {
    throw new LexyRequestError(raw.slice(0, 200) || `Lexy error ${res.status}`, res.status);
  }

  if (!res.ok) {
    const err = body.error;
    const message = typeof err === "string" ? err : err?.message;
    const code = typeof err === "object" ? err?.code : undefined;
    throw new LexyRequestError(message || `Lexy error ${res.status}`, res.status, code);
  }
  return (body.data ?? body.text) as T;
}

/** A failed batch is skipped (the fill call covers it) — unless sign-in or the daily limit stopped it. */
function skipUnlessBlocking<T>(fallback: T) {
  return (e: unknown): T => {
    if (isBlockingLexyError(e)) throw e;
    return fallback;
  };
}

function asObject(v: unknown): Record<string, unknown> {
  return v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {};
}

export async function readHandwriting(base64: string, mediaType: string): Promise<string> {
  const text = (await runTask<string>("handwriting", { image: base64, mediaType }))?.trim();
  if (!text) throw new Error("Could not read handwriting");
  return text;
}

/** Two parallel completions (rewrite + ideas/vocab) so wall-clock time tracks the slower call instead of one long one. */
export async function analyseScribble(text: string): Promise<ScribbleAnalysis> {
  const [rewrite, ideas] = await Promise.all([
    runTask<Pick<ScribbleAnalysis, "upgraded_version" | "word_upgrades">>("scribble-rewrite", { text }),
    runTask<Pick<ScribbleAnalysis, "key_idea_expansions" | "vocabulary_candidates">>("scribble-ideas", { text }),
  ]);
  return { ...rewrite, ...ideas };
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

/** Four parallel batches of three — the server pins each to its own concrete domain. */
const METAPHOR_GRID_BATCHES = 4;

/**
 * Exactly 12 metaphors for the grid — same rhythm as Deep Dive's 25-word grid, fewer cells.
 * Uses four parallel requests (3 each), each pinned to a different concrete domain, so
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
  const known = Object.keys(lexicon).slice(0, 40);
  const excludeSet = new Set(excludeMetaphors.map((m) => m.toLowerCase().trim()).filter(Boolean));
  const shared = { known, threads: explorationThreads, exclude: [...excludeSet].slice(0, 120) };

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
    Array.from({ length: METAPHOR_GRID_BATCHES }, (_, batch) =>
      runTask<MetaphorGridResponse>("metaphor-batch", { ...shared, batch })
        .then((r) => {
          emit(Array.isArray(r?.suggestions) ? r.suggestions : []);
          return r;
        })
        .catch(skipUnlessBlocking({ suggestions: [] as MetaphorGridItem[] }))
    )
  );

  const suggestions = mergeMetaphorSuggestions(
    batches.map((b) => (Array.isArray(b?.suggestions) ? b.suggestions : [])),
    excludeSet
  );

  if (suggestions.length < 12) {
    const fill = await runTask<MetaphorGridResponse>("metaphor-fill", {
      ...shared,
      need: 12 - suggestions.length,
      have: suggestions.map((s) => s.metaphor),
    }).catch(skipUnlessBlocking({ suggestions: [] as MetaphorGridItem[] }));
    const fillItems = Array.isArray(fill?.suggestions) ? fill.suggestions : [];
    emit(fillItems);
    for (const s of fillItems) {
      if (suggestions.length >= 12) break;
      const k = s.metaphor?.toLowerCase().trim();
      if (k && !excludeSet.has(k) && !suggestions.some((x) => x.metaphor.toLowerCase() === k)) {
        suggestions.push(s);
      }
    }
  }

  return { suggestions: suggestions.slice(0, 12) };
}

/** What the server needs to know about their taste: each word and its rating. */
function lexiconRows(lexicon: Record<string, LexiconWord>) {
  return Object.values(lexicon).map((w) => ({ word: w.word, rating: w.rating }));
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

/** Five parallel batches of five. */
const TASTE_GRID_BATCHES = 5;

/**
 * Exactly 25 words tailored to current ratings. Excludes words already in the lexicon.
 * Call again after each rating so the grid reflects refined taste.
 *
 * Uses five parallel requests (5 words each) instead of one huge completion — wall-clock
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
  const lastRated =
    context?.lastRatedWord && context.lastRating != null
      ? { word: context.lastRatedWord, rating: context.lastRating }
      : undefined;
  const shared = { lexicon: lexiconRows(lexicon), threads: explorationThreads };

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
    Array.from({ length: TASTE_GRID_BATCHES }, (_, batch) =>
      runTask<{ suggestions: TasteGridWord[] }>("taste-batch", { ...shared, batch, lastRated })
        .then((r) => {
          emit(Array.isArray(r?.suggestions) ? r.suggestions : []);
          return r;
        })
        .catch(skipUnlessBlocking({ suggestions: [] as TasteGridWord[] }))
    )
  );

  let filtered = filterGridLevels(
    mergeTasteSuggestions(
      batches.map((b) => (Array.isArray(b?.suggestions) ? b.suggestions : [])),
      exclude
    )
  );

  if (filtered.length < 25) {
    const fill = await runTask<{ suggestions: TasteGridWord[] }>("taste-fill", {
      ...shared,
      need: 25 - filtered.length,
      have: filtered.map((f) => f.word),
    }).catch(skipUnlessBlocking({ suggestions: [] as TasteGridWord[] }));
    const fillWords = Array.isArray(fill?.suggestions) ? fill.suggestions : [];
    emit(fillWords);
    for (const s of fillWords) {
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

/**
 * A few fresh grid words to take the place of ones just rated — one small call, informed by the
 * ratings so far (and the latest one most of all), so the grid visibly bends toward your taste.
 */
export async function generateTasteReplacements(
  lexicon: Record<string, LexiconWord>,
  count: number,
  keepOut: string[],
  lastRated?: { word: string; rating: number },
  explorationThreads: string[] = []
): Promise<TasteGridWord[]> {
  const n = Math.max(1, Math.min(5, Math.round(count)));
  const exclude = new Set([...Object.keys(lexicon), ...keepOut].map((k) => k.toLowerCase().trim()));

  const r = await runTask<{ suggestions: TasteGridWord[] }>("taste-replace", {
    lexicon: lexiconRows(lexicon),
    threads: explorationThreads,
    keepOut: keepOut.slice(0, 60),
    count: n,
    lastRated,
  });

  const seen = new Set<string>();
  return (Array.isArray(r?.suggestions) ? r.suggestions : [])
    .map(normalizeTasteGridWord)
    .filter((s) => {
      const k = s.word?.toLowerCase().trim();
      if (!k || exclude.has(k) || seen.has(k) || s.level === 1) return false;
      seen.add(k);
      return true;
    })
    .slice(0, n);
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

function asCandidate(raw: unknown): FeelingNameCandidate | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const word = typeof o.word === "string" ? o.word.trim() : "";
  if (!word) return null;
  return {
    word,
    pronunciation: typeof o.pronunciation === "string" ? o.pronunciation : "",
    part_of_speech: typeof o.part_of_speech === "string" ? o.part_of_speech : "",
    definition: typeof o.definition === "string" ? o.definition : "",
    origin: typeof o.origin === "string" ? o.origin : "",
    why: typeof o.why === "string" ? o.why : "",
    rewritten_phrase: typeof o.rewritten_phrase === "string" ? o.rewritten_phrase : "",
  };
}

/**
 * Find the precise lemma (and a paste-ready rewrite) for a feeling described in the user's own words.
 */
export async function nameFeeling(text: string): Promise<FeelingNameResult> {
  const raw = asObject(await runTask<unknown>("name-feeling", { text: text.trim() }));

  const primary = asCandidate(raw.primary);
  if (!primary) throw new Error("Could not name that feeling — try a little more of the scene.");

  const seen = new Set([primary.word.toLowerCase()]);
  const neighbors: FeelingNameCandidate[] = [];
  for (const n of Array.isArray(raw.neighbors) ? raw.neighbors : []) {
    const c = asCandidate(n);
    if (!c) continue;
    const k = c.word.toLowerCase();
    if (seen.has(k)) continue;
    seen.add(k);
    neighbors.push(c);
    if (neighbors.length >= 3) break;
  }

  return {
    vague_label: typeof raw.vague_label === "string" && raw.vague_label.trim() ? raw.vague_label.trim() : "that feeling",
    why_not_that: typeof raw.why_not_that === "string" ? raw.why_not_that : "",
    primary,
    neighbors,
  };
}

export interface SharpenInput {
  line: string;
  /** What they really mean — optional. */
  intent?: string;
  /** The tone they want — optional; their own if empty. */
  tone?: string;
}

const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");

/** Keep only well-formed parts of a Sharpen reply; the line's own vague phrases must really be in it. */
export function normalizeSharpenResult(raw: unknown, line: string): SharpenResult {
  const o = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const lowerLine = line.toLowerCase();

  const vague = (Array.isArray(o.vague) ? o.vague : [])
    .map((v) => {
      const r = (v ?? {}) as Record<string, unknown>;
      return { phrase: str(r.phrase), why: str(r.why) };
    })
    .filter((v) => v.phrase && lowerLine.includes(v.phrase.toLowerCase()))
    .slice(0, 4);

  const versions: SharpenVersion[] = (Array.isArray(o.versions) ? o.versions : [])
    .map((v) => {
      const r = (v ?? {}) as Record<string, unknown>;
      const swaps: SharpenSwap[] = (Array.isArray(r.swaps) ? r.swaps : [])
        .map((s) => {
          const w = (s ?? {}) as Record<string, unknown>;
          return { from: str(w.from), to: str(w.to), why: str(w.why) };
        })
        .filter((s) => s.from && s.to);
      return { tone: str(r.tone) || "Sharper", text: str(r.text), swaps };
    })
    .filter((v) => v.text)
    .slice(0, 3);

  const seen = new Set<string>();
  const words: SharpenWord[] = [];
  for (const w of Array.isArray(o.words) ? o.words : []) {
    const r = (w ?? {}) as Record<string, unknown>;
    const word = str(r.word);
    if (!word || seen.has(word.toLowerCase())) continue;
    seen.add(word.toLowerCase());
    words.push({
      word,
      pronunciation: str(r.pronunciation),
      part_of_speech: str(r.part_of_speech),
      definition: str(r.definition),
      why: str(r.why),
    });
    if (words.length >= 5) break;
  }

  return { intent: str(o.intent), vague, versions, words };
}

/**
 * Sharpen: their best attempt at a line → the same thought in exact words, in three registers.
 */
export async function sharpenLine(input: SharpenInput): Promise<SharpenResult> {
  const line = input.line.trim();
  const raw = await runTask<unknown>("sharpen", {
    line,
    intent: input.intent?.trim() ?? "",
    tone: input.tone?.trim() ?? "",
  });
  const result = normalizeSharpenResult(raw, line);
  if (!result.versions.length) throw new Error("Lexy couldn't sharpen that one — try adding what you mean.");
  return result;
}
