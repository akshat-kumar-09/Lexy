/** Ratings run 1.0–10.0 in tenths: affluence 9.9, lightning 3.3. */
export const RATING_MIN = 1;
export const RATING_MAX = 10;

export function clampRating(v: number): number {
  if (!Number.isFinite(v)) return RATING_MIN;
  const tenths = Math.round(v * 10) / 10;
  return Math.min(RATING_MAX, Math.max(RATING_MIN, tenths));
}

/** Where along the bar (0 = left edge, 1 = right edge) maps to which rating. */
export function ratingFromFraction(fraction: number): number {
  const f = Math.min(1, Math.max(0, fraction));
  return clampRating(RATING_MIN + f * (RATING_MAX - RATING_MIN));
}

export function fractionFromRating(v: number): number {
  return (clampRating(v) - RATING_MIN) / (RATING_MAX - RATING_MIN);
}

/**
 * Digits typed straight onto the bar: "9.9" and "99" both mean 9.9, "10" means 10,
 * "7" means 7. Returns null when the keys so far can't be a rating yet.
 */
export function parseTypedRating(buffer: string): number | null {
  const s = buffer.trim();
  if (!s || !/^[0-9.]+$/.test(s)) return null;
  if (s.includes(".")) {
    if ((s.match(/\./g) ?? []).length > 1) return null;
    const n = Number(s.endsWith(".") ? s.slice(0, -1) : s);
    if (!Number.isFinite(n) || n < RATING_MIN || n > RATING_MAX) return null;
    return clampRating(n);
  }
  if (s === "10" || s === "100") return 10;
  if (s.length === 1) {
    const n = Number(s);
    return n >= RATING_MIN ? n : null;
  }
  if (s.length === 2) {
    const n = Number(s[0]) + Number(s[1]) / 10;
    return n >= RATING_MIN ? clampRating(n) : null;
  }
  return null;
}

/** True when another key could still change what's typed ("1" might become "10" or "1.5"). */
export function typedRatingMayContinue(buffer: string): boolean {
  const s = buffer.trim();
  if (!s) return true;
  if (s.endsWith(".")) return true;
  if (s.includes(".")) return s.split(".")[1].length < 1;
  return s.length < 2;
}
