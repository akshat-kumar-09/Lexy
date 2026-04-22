import type {
  LexiconData,
  MetaphorDayEntry,
  MetaphorGridItem,
  ScribbleRewriteEntry,
} from "@/lib/types";

/** Legacy daily-word rows from older Lexy versions. */
interface LegacyDailyRow {
  date?: string;
  word?: string;
  definition?: string;
  pronunciation?: string;
  part_of_speech?: string;
  example_sentences?: unknown[];
  origin?: string;
  usage_challenge?: string;
  why_today?: string;
}

/** Legacy single-metaphor day entry (before grid of 10). */
interface LegacyMetaphorFlat {
  date?: string;
  metaphor?: string;
  unpacking?: string;
  image_strength?: string;
  example_sentences?: unknown[];
  try_today?: string;
  why_today?: string;
  suggestions?: unknown[];
}

function toGridItemFromLegacy(o: LegacyMetaphorFlat): MetaphorGridItem {
  const examples = Array.isArray(o.example_sentences) ? o.example_sentences.map(String) : [];
  while (examples.length < 3) examples.push("");
  return {
    metaphor: String(o.metaphor ?? ""),
    unpacking: String(o.unpacking ?? ""),
    image_strength: typeof o.image_strength === "string" ? o.image_strength : "",
    example_sentences: examples.slice(0, 3),
    why_for_you: String(o.why_today ?? o.try_today ?? ""),
  };
}

function normalizeMetaphorDayRow(r: unknown): MetaphorDayEntry | null {
  if (!r || typeof r !== "object") return null;
  const o = r as LegacyMetaphorFlat;
  const date = String(o.date ?? "");
  if (Array.isArray(o.suggestions) && o.suggestions.length > 0) {
    const suggestions = o.suggestions
      .map((s) => {
        if (!s || typeof s !== "object") return null;
        const m = s as Record<string, unknown>;
        const ex = Array.isArray(m.example_sentences) ? m.example_sentences.map(String) : [];
        while (ex.length < 3) ex.push("");
        return {
          metaphor: String(m.metaphor ?? ""),
          unpacking: String(m.unpacking ?? ""),
          image_strength: String(m.image_strength ?? ""),
          example_sentences: ex.slice(0, 3),
          why_for_you: String(m.why_for_you ?? ""),
        } satisfies MetaphorGridItem;
      })
      .filter((x): x is MetaphorGridItem => x !== null && Boolean(x.metaphor));
    if (suggestions.length) return { date, suggestions };
  }
  if (typeof o.metaphor === "string" && o.metaphor && typeof o.unpacking === "string") {
    return { date, suggestions: [toGridItemFromLegacy(o)] };
  }
  return null;
}

export function migrateLegacyDailyRows(rows: unknown[]): MetaphorDayEntry[] {
  const out: MetaphorDayEntry[] = [];
  for (const r of rows) {
    if (r && typeof r === "object" && "suggestions" in r && Array.isArray((r as LegacyMetaphorFlat).suggestions)) {
      continue;
    }
    const legacy = r as LegacyDailyRow & LegacyMetaphorFlat;
    if (typeof legacy.metaphor === "string" && legacy.metaphor && typeof legacy.unpacking === "string") {
      const normalized = normalizeMetaphorDayRow(legacy);
      if (normalized) out.push(normalized);
      continue;
    }
    const row = r as LegacyDailyRow;
    const metaphor = String(row.word ?? "");
    const unpacking = String(row.definition ?? "");
    if (!metaphor && !unpacking) continue;
    const examples = Array.isArray(row.example_sentences) ? row.example_sentences.map(String) : [];
    while (examples.length < 3) examples.push("");
    out.push({
      date: String(row.date ?? ""),
      suggestions: [
        {
          metaphor,
          unpacking,
          image_strength: row.origin ? String(row.origin) : "",
          example_sentences: examples.slice(0, 3),
          why_for_you: String(row.why_today ?? row.usage_challenge ?? ""),
        },
      ],
    });
  }
  return out;
}

function normalizeScribbleRewrites(raw: unknown): ScribbleRewriteEntry[] {
  if (!Array.isArray(raw)) return [];
  const out: ScribbleRewriteEntry[] = [];
  for (const r of raw) {
    if (!r || typeof r !== "object") continue;
    const o = r as Record<string, unknown>;
    if (typeof o.upgraded_version !== "string" || !o.upgraded_version) continue;
    out.push({
      id:
        typeof o.id === "string" && o.id
          ? o.id
          : `sr-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
      saved_at: typeof o.saved_at === "string" ? o.saved_at : new Date().toISOString(),
      source_excerpt: typeof o.source_excerpt === "string" ? o.source_excerpt : "",
      upgraded_version: o.upgraded_version,
    });
  }
  return out;
}

/** Normalize API/import payloads: `metaphor_history` or legacy `daily_history`. */
export function normalizeLexiconPayload(data: unknown): LexiconData | null {
  if (!data || typeof data !== "object") return null;
  const o = data as Record<string, unknown>;
  if (!o.words || typeof o.words !== "object") return null;

  let metaphor_history: MetaphorDayEntry[] = [];
  if (Array.isArray(o.metaphor_history)) {
    for (const row of o.metaphor_history) {
      const n = normalizeMetaphorDayRow(row);
      if (n) metaphor_history.push(n);
      else {
        const [legacy] = migrateLegacyDailyRows([row]);
        if (legacy) metaphor_history.push(legacy);
      }
    }
  } else if (Array.isArray(o.daily_history)) {
    metaphor_history = migrateLegacyDailyRows(o.daily_history);
  }

  const scribble_rewrites = normalizeScribbleRewrites(o.scribble_rewrites);

  return {
    words: o.words as LexiconData["words"],
    metaphor_history,
    scribble_rewrites,
  };
}
