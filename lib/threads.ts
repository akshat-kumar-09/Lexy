/**
 * User-defined “threads” — free-text themes that steer Deep Dive & Metaphors.
 * Legacy preset genres are migrated from localStorage once.
 */

const LEGACY_GENRE_TITLES: Record<string, string> = {
  nature: "Nature & weather",
  science: "Science & cosmos",
  art_design: "Art & design",
  music: "Music & sound",
  food: "Food & kitchens",
  philosophy: "Mind & philosophy",
  myth: "Myth & folklore",
  tech: "Tech & systems",
  travel: "Places & movement",
  performance: "Stage & screen",
  craft: "Fashion & making",
  body_motion: "Body & motion",
};

export function migrateLegacyGenreIds(ids: string[]): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const id of ids) {
    const label = LEGACY_GENRE_TITLES[id] ?? id;
    const n = normalizeThreadLabel(label);
    if (!n) continue;
    const k = n.toLowerCase();
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(n);
  }
  return out;
}

export const MAX_EXPLORATION_THREADS = 5;

export function normalizeThreadLabel(raw: string): string {
  const t = raw.replace(/\s+/g, " ").trim().slice(0, 100);
  return t;
}

export function normalizeThreadList(list: unknown): string[] {
  if (!Array.isArray(list)) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of list) {
    const n = normalizeThreadLabel(String(item ?? ""));
    if (!n) continue;
    const k = n.toLowerCase();
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(n);
    if (out.length >= MAX_EXPLORATION_THREADS) break;
  }
  return out;
}

/** Shown on the home preview card — Spirituality, Discipline, Wealth, Love, Beauty first. */
export const THREAD_PREVIEW_HIGHLIGHTS = [
  "Spirituality",
  "Discipline",
  "Wealth",
  "Love",
  "Beauty",
] as const;

const THREAD_INSPIRATION_MORE: string[] = [
  "Spiritual Grammar",
  "Religious Grammar",
  "Greatness",
  "Nature",
  "Consciousness",
  "Divinity",
  "Devotion and Surrender",
  "Actions and reactions",
  "Seasons of life",
  "Yoga and Silence",
  "Urban Infrastructure",
  "Sanskrit roots in English",
  "Grace and Strength",
  "Gratitude",
  "Grief made expressible",
  "Parent love and psychology",
  "Friendship",
  "Ocean and tide",
  "Old growth forest and trees",
  "Types of Humans",
  "Starlight and scale",
  "Hardwork",
  "Music as prayer",
  "Elements of nature",
  "Modern love",
  "Startup exhaustion",
  "Soul and spirit",
  "Sleep and dream",
  "Attention economy",
  "Slow reading",
  "Medicine",
  "Code as craft",
  "Self Realisation",
];

/** Rich examples so people see what “a thread” can mean — not presets, just imagination fuel. */
export const THREAD_INSPIRATION_EXAMPLES: string[] = (() => {
  const hl = new Set(THREAD_PREVIEW_HIGHLIGHTS.map((s) => s.toLowerCase()));
  const rest = THREAD_INSPIRATION_MORE.filter((s) => !hl.has(s.toLowerCase()));
  return [...THREAD_PREVIEW_HIGHLIGHTS, ...rest];
})();

/**
 * Text block appended to model prompts when the user named exploration threads.
 */
export function threadsContextForPrompt(threads: string[]): string {
  const cleaned = normalizeThreadList(threads);
  if (!cleaned.length) return "";

  const lines = cleaned.map((t) => `• ${t}`);
  return `User-chosen exploration themes (free phrases — treat each as a semantic anchor, not a rigid category):
${lines.join("\n")}

Instructions for these themes:
- Suggest real vocabulary a thoughtful reader would use when writing or speaking in orbit of these ideas: precise terms, register shifts, near-synonyms, and evocative lemmas — not only literal compounds of the theme words.
- Include some words that illuminate adjacent shades (synonym clouds, contrasting registers) so the grid feels exploratory, not repetitive.
- Stay respectful if a theme is religious or cultural: prefer literary, philosophical, and everyday language that fits sincere use — no caricature or exoticism.
`;
}
