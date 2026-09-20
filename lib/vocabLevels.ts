/** Lexy vocabulary tiers — 1 (everyone knows) through 5 (rare). */

export type VocabLevel = 1 | 2 | 3 | 4 | 5;

export const VOCAB_LEVELS: Record<
  VocabLevel,
  {
    label: string;
    tagline: string;
    audience: string;
    /** How often other people actually use this word — shown on Deep Dive, never as L1–L5. */
    howOften: string;
    howOftenDetail: string;
  }
> = {
  1: {
    label: "Level 1",
    tagline: "Everyone knows",
    audience: "Basic — the words of daily life (happy, run, good).",
    howOften: "Almost everyone uses this",
    howOftenDetail: "Daily speech — the first word most people reach for.",
  },
  2: {
    label: "Level 2",
    tagline: "Everyday",
    audience: "Common educated speech — most adults use these regularly.",
    howOften: "Used often",
    howOftenDetail: "Most adults say this in ordinary conversation.",
  },
  3: {
    label: "Level 3",
    tagline: "Conversation upgrade",
    audience: "Subtle precision — drop into normal talk and sound sharper, not showy.",
    howOften: "Used when people want to be exact",
    howOftenDetail: "Not rare — just more precise than the first word that comes.",
  },
  4: {
    label: "Level 4",
    tagline: "Literary",
    audience: "Serious readers know these; context usually carries the meaning.",
    howOften: "Seldom used in talk",
    howOftenDetail: "More often read than said. Context usually carries the meaning.",
  },
  5: {
    label: "Level 5",
    tagline: "Rare",
    audience: "Uncommon gems — reach for when ordinary words fall short.",
    howOften: "Rarely used",
    howOftenDetail: "Few people reach for this — a word for when ordinary ones fall short.",
  },
};

/** Target mix for a 25-word Deep Dive batch. Levels 1–2 appear rarely. */
export const GRID_LEVEL_TARGETS: Record<VocabLevel, { min: number; max: number }> = {
  1: { min: 0, max: 0 },
  2: { min: 0, max: 2 },
  3: { min: 14, max: 18 },
  4: { min: 5, max: 8 },
  5: { min: 2, max: 4 },
};

export const WHY_ELEVATED_WORDS = `The point isn't to sound fancy — it's to say exactly what you mean. "Good" and "bad" are buckets; wistful isn't sad, candid isn't just honest, reluctant isn't merely unwilling. A sharper word lets you nuance a feeling or idea in one breath — and when people feel understood, they listen. You think more clearly too: the word you reach for shapes the thought you can have.`;

export function clampVocabLevel(n: unknown): VocabLevel {
  const v = typeof n === "number" ? Math.round(n) : Number.parseInt(String(n ?? 3), 10);
  if (v <= 1) return 1;
  if (v >= 5) return 5;
  return v as VocabLevel;
}

export function levelPromptBlock(): string {
  return `VOCABULARY LEVELS (assign every word an integer level 1–5):
- Level 1: Everyone alive knows it (happy, run, good). Do NOT suggest unless unavoidable — max 0 per batch.
- Level 2: Everyday educated speech (resilient, obvious, candid). Rare — max 2 per batch.
- Level 3: CONVERSATION UPGRADES — precise, subtle, wearable in normal talk without sounding pretentious (wistful, reluctant, terse, candid, frayed). THIS IS THE SWEET SPOT. Most of the batch should be level 3 (~14–18 of 25).
- Level 4: Literary / educated-reader words — not everyone knows, but context carries it (perspicacious, liminal, sonder).
- Level 5: Rare, uncommon — use sparingly (~2–4 per batch).

The grid exists to upgrade how people speak — not to quiz them on basics. Bias heavily toward level 3, then 4, then 5. Almost never 1 or 2.`;
}
