import { normalizeDeepDiveResult } from "@/lib/claude";
import type { DeepDiveResult } from "@/lib/types";
import {
  isCompleteStory,
  WORD_STORY_PARTS,
  WORD_STORY_VERSION,
  wordStoryKey,
  type WordStoryPart,
  type WordStoryPartData,
} from "@/lib/wordStory";

/** Stories this device has already opened — reopening one is instant, even offline. */
const LOCAL_KEY = "lexy-word-stories";
const LOCAL_MAX = 150;

type LocalEntry = { v: number; t: number; r: DeepDiveResult };

function readLocal(): Record<string, LocalEntry> {
  try {
    const raw = localStorage.getItem(LOCAL_KEY);
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? (parsed as Record<string, LocalEntry>) : {};
  } catch {
    return {};
  }
}

function saveLocal(word: string, r: DeepDiveResult) {
  try {
    const all = readLocal();
    all[wordStoryKey(word)] = { v: WORD_STORY_VERSION, t: Date.now(), r };
    const keys = Object.keys(all);
    if (keys.length > LOCAL_MAX) {
      keys
        .sort((a, b) => (all[a]?.t ?? 0) - (all[b]?.t ?? 0))
        .slice(0, keys.length - LOCAL_MAX)
        .forEach((k) => delete all[k]);
    }
    localStorage.setItem(LOCAL_KEY, JSON.stringify(all));
  } catch {
    // Storage full or blocked — the story still shows, it just won't be instant next time.
  }
}

export function cachedWordStory(word: string): DeepDiveResult | null {
  const e = readLocal()[wordStoryKey(word)];
  return e && e.v === WORD_STORY_VERSION && e.r && isCompleteStory(e.r) ? e.r : null;
}

async function fetchPart(
  word: string,
  part: WordStoryPart,
  sense: string | null,
  signal?: AbortSignal
): Promise<WordStoryPartData> {
  const q = new URLSearchParams({ word, part });
  if (sense) q.set("sense", sense);
  const res = await fetch(`/api/word-story?${q.toString()}`, { signal });
  const text = await res.text();
  let body: { data?: WordStoryPartData; error?: { message?: string } };
  try {
    body = JSON.parse(text) as typeof body;
  } catch {
    throw new Error(text.slice(0, 200) || `Could not open that word (${res.status})`);
  }
  if (!res.ok || !body.data) throw new Error(body.error?.message ?? `Could not open that word (${res.status})`);
  return body.data;
}

/**
 * Open a word's story: from this device if it's been opened before, otherwise three small parts
 * fetched in parallel (each cached on the server for everyone). `onUpdate` fires with the story
 * so far each time a part lands, so the card fills in as it arrives.
 */
export async function fetchWordStory(
  word: string,
  opts: { sense?: string | null; onUpdate?: (story: Partial<DeepDiveResult>) => void; signal?: AbortSignal } = {}
): Promise<Partial<DeepDiveResult>> {
  const cached = cachedWordStory(word);
  if (cached) {
    opts.onUpdate?.(cached);
    return cached;
  }

  let story: Partial<DeepDiveResult> = {};
  const errors: unknown[] = [];
  await Promise.all(
    WORD_STORY_PARTS.map((part) =>
      fetchPart(word, part, opts.sense ?? null, opts.signal)
        .then((data) => {
          story = { ...story, ...data };
          opts.onUpdate?.(story);
        })
        .catch((e: unknown) => {
          errors.push(e);
        })
    )
  );

  if (!story.reference_definition) {
    const first = errors[0];
    throw first instanceof Error ? first : new Error("Could not open that word");
  }
  if (isCompleteStory(story)) {
    const full = normalizeDeepDiveResult(story);
    saveLocal(word, full);
    return full;
  }
  return story;
}
