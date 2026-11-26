/**
 * Turn a phrase: one worn word or phrase, and a ladder of substitutes that climbs from a
 * subtle everyday swap to a Shakespearean flourish. Shared by the curated everyday phrases
 * (lib/everydayPhrases.ts) and the ones Claude finds for your own line.
 */

export type RungId = "subtle" | "polished" | "literary" | "shakespearean";

export interface RungDef {
  id: RungId;
  label: string;
  hint: string;
}

export const RUNGS: readonly RungDef[] = [
  { id: "subtle", label: "Subtle", hint: "Still sounds like you, only fresher" },
  { id: "polished", label: "Polished", hint: "Assured enough for work and good writing" },
  { id: "literary", label: "Literary", hint: "What a novelist would reach for" },
  { id: "shakespearean", label: "Shakespearean", hint: "Theatrical, Elizabethan, unashamed" },
];

export interface LadderOption {
  text: string;
  /** The exact shade this substitute carries. */
  note: string;
  /** Their line with this substitute swapped in — absent when the phrase was the whole line. */
  line?: string;
}

export interface LadderRung {
  level: RungId;
  options: LadderOption[];
}

export interface PhraseLadderResult {
  /** The words being replaced. */
  target: string;
  /** What those words are doing in the line. */
  sense: string;
  rungs: LadderRung[];
}

const collapse = (s: string) => s.replace(/\s+/g, " ").trim();

/* ---------- Picking words in a line ---------- */

export interface Token {
  text: string;
  start: number;
  end: number;
}

/** The line's words, with where each sits — punctuation stays attached, as typed. */
export function tokenize(line: string): Token[] {
  const out: Token[] = [];
  for (const m of line.matchAll(/\S+/g)) {
    const start = m.index ?? 0;
    out.push({ text: m[0], start, end: start + m[0].length });
  }
  return out;
}

const EDGE_PUNCTUATION = /^[\s"“”'‘’()[\]{}.,;:!?…—–-]+|[\s"“”'‘’()[\]{}.,;:!?…—–-]+$/g;

/** The words from token `from` to token `to`, without the punctuation around them. */
export function selectedText(line: string, tokens: Token[], from: number, to: number): string {
  const a = tokens[Math.min(from, to)];
  const b = tokens[Math.max(from, to)];
  if (!a || !b) return "";
  return collapse(line.slice(a.start, b.end).replace(EDGE_PUNCTUATION, ""));
}

export type Selection = readonly [number, number] | null;

/** Tap a word to pick it; tap another to take in the phrase between; tap again to start over. */
export function nextSelection(sel: Selection, tapped: number): Selection {
  if (!sel) return [tapped, tapped];
  if (sel[0] === sel[1]) {
    if (tapped === sel[0]) return null;
    return [Math.min(sel[0], tapped), Math.max(sel[0], tapped)];
  }
  return [tapped, tapped];
}

/**
 * Their line with `target` swapped for `replacement` (first match, any case). A capital at the
 * start of the target carries over; "a" before a vowel sound becomes "an", and the other way round.
 */
export function swapInto(line: string, target: string, replacement: string): string {
  const t = collapse(target);
  const lineFlat = collapse(line);
  const at = lineFlat.toLowerCase().indexOf(t.toLowerCase());
  if (!t || at < 0) return lineFlat;
  const original = lineFlat.slice(at, at + t.length);
  let next = replacement;
  if (/^[A-Z]/.test(original)) next = next.replace(/^([^A-Za-z]*)([a-z])/, (_, lead: string, c: string) => lead + c.toUpperCase());
  let before = lineFlat.slice(0, at);
  const article = /(^|\s)(a|an|A|An)\s$/.exec(before);
  if (article && /^(the|a|an|my|our|your|his|her|their|its|this|that)\s/i.test(next)) {
    // "a masterpiece" → "the crown of my labours", not "a the crown…"
    const capital = article[2][0] === "A";
    before = before.slice(0, before.length - article[2].length - 1);
    if (capital) next = next[0].toUpperCase() + next.slice(1);
  } else if (article) {
    const vowel = /^[aeiou]/i.test(next) && !/^(uni|use|one|eu)/i.test(next);
    const capital = article[2][0] === "A";
    const fixed = vowel ? (capital ? "An" : "an") : capital ? "A" : "a";
    before = before.slice(0, before.length - article[2].length - 1) + fixed + " ";
  }
  return before + next + lineFlat.slice(at + t.length);
}

/* ---------- Tidying what Claude sends back ---------- */

const str = (v: unknown) => (typeof v === "string" ? collapse(v) : "");
const unquote = (s: string) => s.replace(/^["“'‘]+|["”'’]+$/g, "").trim();

function rungIdOf(v: unknown): RungId | null {
  const s = str(v).toLowerCase().replace(/[^a-z]/g, "");
  if (s.startsWith("shakespear") || s === "elizabethan") return "shakespearean";
  return RUNGS.find((r) => r.id === s)?.id ?? null;
}

/**
 * Keep only well-formed rungs, in Lexy's order; options are deduplicated across the whole ladder
 * and never repeat the words being replaced. Each option carries their line with it swapped in.
 */
export function normalizePhraseLadder(raw: unknown, line: string, target: string): PhraseLadderResult {
  const o = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const lineFlat = collapse(line);
  const t = collapse(target) || lineFlat;
  const whole = t.toLowerCase() === lineFlat.toLowerCase();

  const byLevel = new Map<RungId, unknown[]>();
  for (const r of Array.isArray(o.rungs) ? o.rungs : []) {
    const rr = (r ?? {}) as Record<string, unknown>;
    const id = rungIdOf(rr.level);
    if (id && !byLevel.has(id) && Array.isArray(rr.options)) byLevel.set(id, rr.options);
  }

  const seen = new Set<string>([t.toLowerCase()]);
  const rungs: LadderRung[] = [];
  for (const def of RUNGS) {
    const options: LadderOption[] = [];
    for (const item of byLevel.get(def.id) ?? []) {
      const ii = (item ?? {}) as Record<string, unknown>;
      const text = unquote(str(ii.text));
      const key = text.toLowerCase();
      if (!text || seen.has(key)) continue;
      seen.add(key);
      const given = str(ii.line);
      const option: LadderOption = { text, note: str(ii.note) };
      if (!whole) {
        option.line = given && given.toLowerCase().includes(key) ? given : swapInto(lineFlat, t, text);
      }
      options.push(option);
      if (options.length >= 3) break;
    }
    if (options.length) rungs.push({ level: def.id, options });
  }

  return { target: t, sense: str(o.sense), rungs };
}
