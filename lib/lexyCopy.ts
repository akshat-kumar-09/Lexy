/** Product copy and thresholds — keep UI aligned with behaviour. */

export const FAVOURITE_THRESHOLD = 7.7 as const;

export function tasteRatingsLine(threshold: number = FAVOURITE_THRESHOLD): string {
  return `Rate what you love — Lexy learns your taste. ${threshold}+ saves a favourite to your lexicon.`;
}

export const LEXICON_NOD = "Lexy — short for lexicon. The words you keep, worn daily.";

export const HOME_HERO_SUPPORT = `Every rating teaches Lexy your taste. Favourites land in your lexicon at ${FAVOURITE_THRESHOLD} and up. Name threads below in your own words — Metaphor and Deep Dive orbit those ideas.`;
