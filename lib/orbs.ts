import { NOT_FOR_ME_BELOW } from "@/lib/lexyCopy";
import type { LexiconData, WordSource } from "@/lib/types";

/**
 * The orb home: every way of growing your language is a bubble on one sky.
 *
 * Sizes come from two places:
 * - what you actually do in Lexy — visits, words kept, pages written, days of
 *   metaphors — decaying over time so the sky follows your current habits;
 * - a little app logic — morning favours Scribble, unrevealed metaphors call,
 *   a growing lexicon swells, a brand-new Lexy points at Deep Dive.
 *
 * Every orb carries one honest line on why it is the size it is.
 */

export type OrbId = "dive" | "metaphors" | "feeling" | "sharpen" | "phrases" | "articulate" | "scribble" | "lexicon";

export interface OrbDef {
  id: OrbId;
  href: string;
  label: string;
  tagline: string;
  /** Highlight, body and rim of the sphere, its glow, and the ink drawn on it. */
  hi: string;
  core: string;
  rim: string;
  glow: string;
  ink: string;
}

/** All in Lexy's own palette — ink, gold, umber, graphite, oxblood, sand, parchment, champagne. */
export const ORBS: readonly OrbDef[] = [
  {
    id: "dive",
    href: "/dive",
    label: "Deep Dive",
    tagline: "Words chosen for your taste",
    hi: "#6B6158",
    core: "#2A2420",
    rim: "#0E0B09",
    glow: "rgba(28,25,23,0.16)",
    ink: "#F5EFE0",
  },
  {
    id: "metaphors",
    href: "/metaphors",
    label: "Metaphors",
    tagline: "See one thing through another",
    hi: "#E2CFA9",
    core: "#8B7355",
    rim: "#3A2E1F",
    glow: "rgba(139,115,85,0.22)",
    ink: "#FBF6EC",
  },
  {
    id: "feeling",
    href: "/articulate#feeling",
    label: "Name a feeling",
    tagline: "Find the exact word",
    hi: "#B59A7C",
    core: "#5C4632",
    rim: "#21170E",
    glow: "rgba(92,70,50,0.18)",
    ink: "#F5EFE0",
  },
  {
    id: "sharpen",
    href: "/sharpen",
    label: "Sharpen",
    tagline: "Say exactly what you mean",
    hi: "#8A8580",
    core: "#3B3835",
    rim: "#121110",
    glow: "rgba(59,56,53,0.16)",
    ink: "#F5EFE0",
  },
  {
    id: "phrases",
    href: "/phrases",
    label: "Turn a phrase",
    tagline: "From everyday to Shakespeare",
    hi: "#B98A7C",
    core: "#6E3A31",
    rim: "#24110D",
    glow: "rgba(110,58,49,0.18)",
    ink: "#F5EFE0",
  },
  {
    id: "articulate",
    href: "/articulate",
    label: "Articulate",
    tagline: "Tone, body and breath",
    hi: "#F1E4CB",
    core: "#B89C74",
    rim: "#5A4630",
    glow: "rgba(184,156,116,0.22)",
    ink: "#1C1917",
  },
  {
    id: "scribble",
    href: "/scribble",
    label: "Morning Scribble",
    tagline: "Write, then hear it lifted",
    hi: "#FFFFFF",
    core: "#F3ECDD",
    rim: "#B8A88C",
    glow: "rgba(184,168,140,0.2)",
    ink: "#1C1917",
  },
  {
    id: "lexicon",
    href: "/lexicon",
    label: "My Lexy",
    tagline: "Your words, kept",
    hi: "#F7E9C8",
    core: "#C2A06A",
    rim: "#5E4626",
    glow: "rgba(194,160,106,0.3)",
    ink: "#1C1917",
  },
];

/** At the heart of the chart: your own words, which every other planet circles. */
export const SUN: OrbId = "lexicon";

export function orbById(id: OrbId): OrbDef {
  return ORBS.find((o) => o.id === id)!;
}

/** Which orb a route belongs to. Name a feeling lives on Articulate, at #feeling. */
export function orbIdForLocation(pathname: string, hash = ""): OrbId | null {
  const path = pathname.replace(/\/$/, "") || "/";
  if (path === "/articulate") return hash === "#feeling" ? "feeling" : "articulate";
  return ORBS.find((o) => o.href === path)?.id ?? null;
}

/** The sphere's body: lit from the upper left, falling into a deep rim. */
export function orbBackground(def: OrbDef): string {
  return `radial-gradient(circle at 34% 28%, ${def.hi} 0%, ${def.core} 46%, ${def.rim} 100%)`;
}

// ── Usage ─────────────────────────────────────────────────────

export type VisitLog = Partial<Record<OrbId, { score: number; at: number }>>;

const DAY_MS = 86_400_000;
/** Activity loses half its pull every two weeks — the sky follows your current habits. */
export const HALF_LIFE_DAYS = 14;
/** Reloads and quick back-and-forth inside this window count as one visit. */
export const VISIT_DEDUPE_MS = 20 * 60_000;

function decayed(score: number, at: number, now: number): number {
  if (!Number.isFinite(score) || !Number.isFinite(at) || score <= 0) return 0;
  const days = Math.max(0, now - at) / DAY_MS;
  return score * Math.pow(0.5, days / HALF_LIFE_DAYS);
}

export function bumpVisit(log: VisitLog, id: OrbId, now: number): VisitLog {
  const prev = log[id];
  if (prev && now - prev.at < VISIT_DEDUPE_MS) return log;
  const score = (prev ? decayed(prev.score, prev.at, now) : 0) + 1;
  return { ...log, [id]: { score, at: now } };
}

const SOURCE_ORB: Record<WordSource, OrbId> = {
  deep_dive: "dive",
  metaphor: "metaphors",
  daily: "metaphors",
  scribble: "scribble",
  articulate: "feeling",
  sharpen: "sharpen",
  phrases: "phrases",
};

/** Keeping a word, writing a page and revealing a day of metaphors weigh more than a visit. */
const WORD_KEPT = 1.2;
const PAGE_WRITTEN = 2;
const METAPHOR_DAY = 1;

function dateMs(s: string | undefined): number | null {
  if (!s) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (m) return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 12).getTime();
  const t = Date.parse(s);
  return Number.isFinite(t) ? t : null;
}

export function localISODate(ms: number): string {
  const d = new Date(ms);
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

// ── Sizing ────────────────────────────────────────────────────

export interface OrbContext {
  now: number;
  lexicon: LexiconData;
  visits: VisitLog;
  /** Words sitting in the current Deep Dive grid. */
  gridWords: string[];
}

export interface OrbState {
  id: OrbId;
  def: OrbDef;
  /** Relative size — each orb's area is proportional to this. */
  weight: number;
  /** Decayed activity behind this orb. */
  usage: number;
  /** Why the orb is the size it is; falls back to the tagline. */
  line: string;
  /** Untouched while you're active elsewhere — gets a soft shimmer. */
  fresh: boolean;
  /** Words kept from this planet — they circle it as moons. */
  kept: number;
}

/** How much your own habits can grow an orb, at full confidence. */
const HABIT_PULL = 1.6;
/** Activity needed before habits count fully — a first click shouldn't reshape the sky. */
const CONFIDENT_AT = 8;

type Pull = { amount: number; line?: string; pin?: boolean };

export function computeOrbs(ctx: OrbContext): OrbState[] {
  const { now } = ctx;
  const hour = new Date(now).getHours();
  const today = localISODate(now);
  const words = Object.values(ctx.lexicon.words ?? {});
  const scribbles = ctx.lexicon.scribble_rewrites ?? [];
  const metaphorDays = ctx.lexicon.metaphor_history ?? [];

  const usage = Object.fromEntries(ORBS.map((o) => [o.id, 0])) as Record<OrbId, number>;
  const keptHere = Object.fromEntries(ORBS.map((o) => [o.id, 0])) as Record<OrbId, number>;
  for (const def of ORBS) {
    const v = ctx.visits?.[def.id];
    if (v) usage[def.id] += decayed(v.score, v.at, now);
  }
  for (const w of words) {
    const id = SOURCE_ORB[w.source];
    if (id) keptHere[id] += 1;
    const t = dateMs(w.added);
    if (id && t != null) usage[id] += decayed(WORD_KEPT, t, now);
  }
  for (const s of scribbles) {
    const t = dateMs(s.saved_at);
    if (t != null) usage.scribble += decayed(PAGE_WRITTEN, t, now);
  }
  for (const m of metaphorDays) {
    const t = dateMs(m.date);
    if (t != null) usage.metaphors += decayed(METAPHOR_DAY, t, now);
  }

  const values = Object.values(usage);
  const total = values.reduce((a, b) => a + b, 0);
  const top = Math.max(...values);
  const confidence = Math.min(1, total / CONFIDENT_AT);

  const kept = new Set(words.map((w) => w.word.toLowerCase()));
  const waiting = ctx.gridWords.filter((w) => !kept.has(w.toLowerCase())).length;
  const scribbledToday = scribbles.some((s) => {
    const t = dateMs(s.saved_at);
    return t != null && localISODate(t) === today;
  });
  const metaphorsToday = metaphorDays.some((m) => m.date === today);
  const morning = hour >= 5 && hour < 11;
  const evening = hour >= 19 || hour < 2;

  return ORBS.map((def) => {
    const habit = top > 0 ? usage[def.id] / top : 0;
    const pulls: Pull[] = [];

    const habitAmount = HABIT_PULL * confidence * habit;
    if (habit === 1 && confidence >= 0.5) {
      pulls.push({ amount: habitAmount, line: "Where you spend the most time" });
    } else if (habit >= 0.5 && confidence >= 0.5) {
      pulls.push({ amount: habitAmount, line: "One of your habits" });
    } else {
      pulls.push({ amount: habitAmount });
    }

    switch (def.id) {
      case "dive":
        if (words.length === 0) pulls.push({ amount: 0.6, line: "Start here — words picked for you" });
        else if (waiting > 0)
          pulls.push({ amount: 0.2, line: `${waiting} ${waiting === 1 ? "word" : "words"} waiting in your grid` });
        break;
      case "metaphors":
        pulls.push(
          metaphorsToday
            ? { amount: 0.05, line: "Today's metaphors are out" }
            : { amount: 0.45, line: "Today's metaphors are waiting" }
        );
        break;
      case "feeling":
        if (evening) pulls.push({ amount: 0.4, line: "Evening — name what today felt like" });
        break;
      case "scribble":
        if (scribbledToday) pulls.push({ amount: -0.2, line: "Today's page is written" });
        else if (morning) pulls.push({ amount: 0.7, line: "Morning — a blank page is waiting" });
        break;
      case "lexicon":
        pulls.push(
          words.length === 0
            ? { amount: -0.15, line: "Empty — for now" }
            : {
                amount: Math.min(1.1, Math.log2(1 + words.length) / 6),
                line: `${words.length} ${words.length === 1 ? "word" : "words"} kept`,
                pin: true,
              }
        );
        break;
      case "articulate":
        break;
    }

    const fresh = usage[def.id] === 0 && total >= 3;
    if (fresh) pulls.push({ amount: 0, line: "Not explored yet" });

    const weight = Math.max(0.6, 1 + pulls.reduce((a, p) => a + p.amount, 0));
    const voiced = pulls.filter((p) => p.line);
    const pinned = voiced.find((p) => p.pin);
    const loudest = voiced.reduce<Pull | null>(
      (best, p) => (!best || Math.abs(p.amount) > Math.abs(best.amount) ? p : best),
      null
    );
    const line = (pinned ?? loudest)?.line ?? def.tagline;

    return { id: def.id, def, weight, usage: usage[def.id], line, fresh, kept: keptHere[def.id] };
  });
}

// ── Layout ────────────────────────────────────────────────────

export interface Point {
  x: number;
  y: number;
}

const EDGE_PAD = 6;
/** Where the first orb sits on the ring — slightly off vertical, so the ring never looks like a clock face. */
const HOME_ANGLE = -Math.PI / 2 - 0.35;

function clamp(v: number, lo: number, hi: number): number {
  if (lo > hi) return (lo + hi) / 2;
  return Math.min(hi, Math.max(lo, v));
}

/**
 * Area proportional to weight, filling a comfortable share of the field. `roomy` leaves more
 * open sky between them — for the chart, where the orbits need room to show.
 */
export function computeRadii(weights: number[], width: number, height: number, roomy = false): number[] {
  const short = Math.min(width, height);
  const fill = (width > height ? 0.3 : 0.38) * (roomy ? 0.8 : 1);
  const total = weights.reduce((a, b) => a + b, 0) || 1;
  const minR = Math.min(46, short * 0.14);
  const maxR = short * 0.3;
  return weights.map((w) => clamp(Math.sqrt((width * height * fill * w) / total / Math.PI), minR, maxR));
}

/**
 * The chart's bodies: small planets that grow with use, and a larger sun at `sunAt` that grows
 * with your words. Names sit beneath the planets, so the planets themselves can stay small and
 * leave open sky for their orbits.
 */
export function chartBodyRadii(weights: number[], width: number, height: number, sunAt: number): number[] {
  const short = Math.min(width, height);
  return weights.map((w, i) =>
    i === sunAt
      ? clamp(short * 0.12 * Math.sqrt(Math.max(1, w / 1.3)), short * 0.11, short * 0.17)
      : clamp(short * 0.068 * Math.sqrt(Math.max(0.1, w)), short * 0.05, short * 0.11)
  );
}

/** Pairs of circles that overlap by more than `slack` pixels. */
export function overlapCount(pos: Point[], r: number[], slack = 0.5): number {
  let n = 0;
  for (let i = 0; i < pos.length; i++) {
    for (let j = i + 1; j < pos.length; j++) {
      if (Math.hypot(pos[j].x - pos[i].x, pos[j].y - pos[i].y) < r[i] + r[j] - slack) n++;
    }
  }
  return n;
}

function relax(
  r: number[],
  width: number,
  height: number,
  seed: (Point | undefined)[],
  pin: number | undefined
): Point[] {
  const n = r.length;
  const cx = width / 2;
  const cy = height / 2;
  // Around a sun the planets keep a little more distance, so their orbits show between them.
  const gap = pin == null ? clamp(Math.min(width, height) * 0.03, 8, 22) : clamp(Math.min(width, height) * 0.045, 12, 30);
  const meanR = r.reduce((a, b) => a + b, 0) / Math.max(1, n);
  const stretch = Math.sqrt(width / height);
  const pinned = (i: number) => i === pin;
  const ring = pin == null ? n : n - 1;

  // Seed from where orbs were last time (so a size change is a nudge, not a reshuffle);
  // otherwise each orb starts in its own fixed direction from the centre, so the sky
  // keeps its shape as sizes change and you learn where things live. A pinned orb — the
  // sun — always sits at the centre.
  const pos: Point[] = r.map((_, i) => {
    if (pinned(i)) return { x: cx, y: cy };
    const s = seed[i];
    if (s && Number.isFinite(s.x) && Number.isFinite(s.y)) return { x: s.x, y: s.y };
    const k = pin != null && i > pin ? i - 1 : i;
    const angle = HOME_ANGLE + (k / ring) * Math.PI * 2;
    const dist = meanR * (pin == null ? 1.6 : 2.4);
    return { x: cx + Math.cos(angle) * dist * stretch, y: cy + (Math.sin(angle) * dist) / stretch };
  });

  // Gravity is stronger along the short axis, so the cluster spreads along the long one.
  const gx = width >= height ? 0.012 : 0.03;
  const gy = width >= height ? 0.03 : 0.012;

  const step = (gravity: boolean) => {
    if (gravity) {
      for (const p of pos) {
        p.x += (cx - p.x) * gx;
        p.y += (cy - p.y) * gy;
      }
    }
    if (pin != null) pos[pin] = { x: cx, y: cy };
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        let dx = pos[j].x - pos[i].x;
        let dy = pos[j].y - pos[i].y;
        let d = Math.hypot(dx, dy);
        const min = r[i] + r[j] + gap;
        if (d >= min) continue;
        if (d < 1e-6) {
          dx = Math.cos(i + j);
          dy = Math.sin(i + j);
          d = 1;
        }
        const push = min - d;
        // Bigger orbs give way less; the sun doesn't give way at all.
        const wi = pinned(i) ? 0 : pinned(j) ? 1 : r[j] / (r[i] + r[j]);
        const wj = pinned(j) ? 0 : pinned(i) ? 1 : r[i] / (r[i] + r[j]);
        pos[i].x -= (dx / d) * push * wi;
        pos[i].y -= (dy / d) * push * wi;
        pos[j].x += (dx / d) * push * wj;
        pos[j].y += (dy / d) * push * wj;
      }
    }
    for (let i = 0; i < n; i++) {
      pos[i].x = clamp(pos[i].x, r[i] + EDGE_PAD, width - r[i] - EDGE_PAD);
      pos[i].y = clamp(pos[i].y, r[i] + EDGE_PAD, height - r[i] - EDGE_PAD);
    }
  };

  for (let it = 0; it < 320; it++) step(true);
  for (let it = 0; it < 80; it++) step(false);
  if (pin != null && Math.abs(pos[pin].x - cx) > 0.5) pos[pin] = { x: cx, y: cy };
  return pos;
}

/**
 * Packs the orbs into the field: gathered toward the middle, never overlapping,
 * never past the edges. If they can't fit, everything shrinks a little and tries again.
 */
export function layoutOrbs(
  radii: number[],
  width: number,
  height: number,
  seed: (Point | undefined)[] = [],
  /** Index of an orb held at the centre — the sun the others circle. */
  pin?: number
): { positions: Point[]; radii: number[] } {
  const p = pin != null && pin >= 0 && pin < radii.length ? pin : undefined;
  let r = radii.slice();
  let positions = relax(r, width, height, seed, p);
  for (let attempt = 0; attempt < 6 && overlapCount(positions, r) > 0; attempt++) {
    r = r.map((x) => x * 0.9);
    positions = relax(r, width, height, seed, p);
  }
  return { positions, radii: r };
}

/**
 * The orbit a planet travels: an ellipse around the sun that passes through the planet,
 * stretched to the shape of the sky (`aspect` = height ÷ width of the orbit).
 */
export function orbitThrough(planet: Point, sun: Point, aspect: number): { rx: number; ry: number } {
  const dx = planet.x - sun.x;
  const dy = planet.y - sun.y;
  const rx = Math.hypot(dx, dy / aspect);
  return { rx, ry: rx * aspect };
}

/** Constellations: each star joined to its nearest neighbour, when it's near enough. */
export function constellationLines(stars: Point[], reach: number): [number, number][] {
  const lines: [number, number][] = [];
  const seen = new Set<string>();
  stars.forEach((a, i) => {
    let best = -1;
    let bestD = Infinity;
    stars.forEach((b, j) => {
      if (i === j) return;
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      if (d < bestD) {
        bestD = d;
        best = j;
      }
    });
    if (best < 0 || bestD > reach) return;
    const key = i < best ? `${i}-${best}` : `${best}-${i}`;
    if (seen.has(key)) return;
    seen.add(key);
    lines.push([Math.min(i, best), Math.max(i, best)]);
  });
  return lines;
}

// ── The sky of words behind the orbs ──────────────────────────

const SKY_FALLBACK = [
  "petrichor", "halcyon", "lambent", "susurrus", "apricity", "numinous", "gossamer",
  "palimpsest", "saudade", "limerence", "redolent", "liminal", "quiddity", "ineffable",
  "mellifluous", "reverie", "incandescent", "verdant", "hiraeth", "eudaimonia",
  "serendipity", "wistful", "luminous", "solace",
];

/** Your own words become the stars; until there are enough, a few beautiful ones keep you company. */
export function skyWords(lexicon: LexiconData["words"], count = 30): string[] {
  const all = Object.values(lexicon ?? {});
  // Words rated "not for me" stay on record but never become stars.
  const mine = all
    .filter((w) => w.rating >= NOT_FOR_ME_BELOW)
    .sort((a, b) => (b.added ?? "").localeCompare(a.added ?? ""))
    .map((w) => w.word)
    .slice(0, count);
  const seen = new Set(all.map((w) => w.word.toLowerCase()));
  const fill = SKY_FALLBACK.filter((w) => !seen.has(w)).slice(0, Math.max(0, Math.min(count, 22) - mine.length));
  return [...mine, ...fill];
}

/** Small stable hash — places each sky word in the same spot every visit. */
export function hashString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
