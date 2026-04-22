import type { LexiconData, MetaphorDayEntry } from "@/lib/types";

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

export function migrateLegacyDailyRows(rows: unknown[]): MetaphorDayEntry[] {
  const out: MetaphorDayEntry[] = [];
  for (const r of rows) {
    if (!r || typeof r !== "object") continue;
    const o = r as Record<string, unknown>;
    if (typeof o.metaphor === "string" && typeof o.unpacking === "string") {
      out.push({
        date: String(o.date ?? ""),
        metaphor: o.metaphor,
        unpacking: o.unpacking,
        image_strength: typeof o.image_strength === "string" ? o.image_strength : undefined,
        example_sentences: Array.isArray(o.example_sentences) ? o.example_sentences.map(String) : [],
        try_today: typeof o.try_today === "string" ? o.try_today : undefined,
        why_today: typeof o.why_today === "string" ? o.why_today : undefined,
      });
      continue;
    }
    const legacy = r as LegacyDailyRow;
    out.push({
      date: String(legacy.date ?? ""),
      metaphor: String(legacy.word ?? ""),
      unpacking: String(legacy.definition ?? ""),
      image_strength: legacy.origin ? String(legacy.origin) : undefined,
      example_sentences: Array.isArray(legacy.example_sentences)
        ? legacy.example_sentences.map(String)
        : [],
      try_today: legacy.usage_challenge ? String(legacy.usage_challenge) : undefined,
      why_today: legacy.why_today ? String(legacy.why_today) : undefined,
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
    metaphor_history = migrateLegacyDailyRows(o.metaphor_history);
  } else if (Array.isArray(o.daily_history)) {
    metaphor_history = migrateLegacyDailyRows(o.daily_history);
  }

  return {
    words: o.words as LexiconData["words"],
    metaphor_history,
  };
}
