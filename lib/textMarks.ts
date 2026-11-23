/** A run of text, marked with the index of the phrase it matched (or null). */
export interface Segment {
  text: string;
  mark: number | null;
}

/**
 * Splits text so each phrase's first occurrence becomes its own marked segment —
 * case-insensitive, longest phrases first, never overlapping.
 */
export function splitByPhrases(text: string, phrases: string[]): Segment[] {
  const lower = text.toLowerCase();
  const hits: { start: number; end: number; mark: number }[] = [];
  const order = phrases
    .map((p, mark) => ({ p: p.trim().toLowerCase(), mark }))
    .filter((x) => x.p)
    .sort((a, b) => b.p.length - a.p.length);

  for (const { p, mark } of order) {
    for (let at = lower.indexOf(p); at >= 0; at = lower.indexOf(p, at + 1)) {
      const end = at + p.length;
      if (hits.some((h) => at < h.end && end > h.start)) continue;
      hits.push({ start: at, end, mark });
      break;
    }
  }

  hits.sort((a, b) => a.start - b.start);
  const out: Segment[] = [];
  let pos = 0;
  for (const h of hits) {
    if (h.start > pos) out.push({ text: text.slice(pos, h.start), mark: null });
    out.push({ text: text.slice(h.start, h.end), mark: h.mark });
    pos = h.end;
  }
  if (pos < text.length) out.push({ text: text.slice(pos), mark: null });
  return out;
}
