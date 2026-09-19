import type { DeepDiveResult } from "@/lib/types";
import { VOCAB_LEVELS, clampVocabLevel, type VocabLevel } from "@/lib/vocabLevels";

/**
 * A shared word carries the word, not Lexy: no wordmark, no link, nothing to open.
 * The point is that the recipient learns a word, not that they install anything.
 */
export type ShareWordCard = {
  word: string;
  pronunciation: string;
  part_of_speech: string;
  reference_definition: string;
  reference_source: string;
  plain_meaning: string;
  nuance: string;
  example: string;
  level: VocabLevel;
};

export function shareCardFromDeepDive(r: DeepDiveResult): ShareWordCard {
  const reference = (r.reference_definition?.trim() || r.definition?.trim() || "").trim();
  const plain = (r.lexy_definition ?? "").trim();
  return {
    word: r.word.trim(),
    pronunciation: (r.pronunciation ?? "").trim(),
    part_of_speech: (r.part_of_speech ?? "").trim(),
    reference_definition: reference,
    reference_source: (r.reference_source ?? "").trim(),
    // When only one gloss exists, the card shows it once rather than repeating itself.
    plain_meaning: plain && plain !== reference ? plain : "",
    nuance: (r.nuance ?? "").trim(),
    example: (r.example_sentences ?? []).find((s) => s?.trim())?.trim() ?? "",
    level: clampVocabLevel(r.level),
  };
}

/** Plain-text twin of the card, for places that take text but not images. */
export function buildShareText(c: ShareWordCard): string {
  const tier = VOCAB_LEVELS[c.level].tagline.toLowerCase();
  const head = [c.word, c.pronunciation].filter(Boolean).join("  ");
  const kind = [c.part_of_speech, tier].filter(Boolean).join(" · ");

  const blocks: string[] = [head];
  if (kind) blocks.push(kind);
  if (c.reference_definition) blocks.push(c.reference_definition);
  if (c.plain_meaning) blocks.push(`In plain words: ${c.plain_meaning}`);
  if (c.nuance) blocks.push(`The nuance: ${c.nuance}`);
  if (c.example) blocks.push(`“${c.example}”`);

  return blocks.join("\n\n");
}

export function shareCardFilename(word: string): string {
  const slug = word.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return `${slug || "word"}.png`;
}

/** Greedy wrap against a measuring function so layout can be unit-tested without a canvas. */
export function wrapText(text: string, maxWidth: number, measure: (s: string) => number): string[] {
  const clean = text.replace(/\s+/g, " ").trim();
  if (!clean) return [];

  const lines: string[] = [];
  let line = "";
  for (const word of clean.split(" ")) {
    const candidate = line ? `${line} ${word}` : word;
    if (line && measure(candidate) > maxWidth) {
      lines.push(line);
      line = word;
    } else {
      line = candidate;
    }
  }
  if (line) lines.push(line);
  return lines;
}

/** Largest size from the list whose text still fits on one line; smallest if none do. */
export function fitFontSize(
  sizes: readonly number[],
  maxWidth: number,
  measureAt: (size: number) => number
): number {
  for (const size of sizes) {
    if (measureAt(size) <= maxWidth) return size;
  }
  return sizes[sizes.length - 1];
}

const CARD_WIDTH = 1080;
const PAD = 96;
const FRAME_INSET = 40;
const CONTENT_WIDTH = CARD_WIDTH - PAD * 2;

const PARCHMENT = "#FEFCF8";
const INK = "#1C1917";
const BODY = "#3F3933";
const MUTED = "#6A6360";
const GOLD = "#8B7355";
const FAINT = "#B0A898";
const RULE = "#E8DFD0";

const TIER_STROKE_HEIGHTS = [0.42, 0.58, 0.72, 0.86, 1] as const;
const TIER_FILL: Record<VocabLevel, string> = {
  1: "#C4BAAB",
  2: "#AE9F88",
  3: "#8B7355",
  4: "#6B5A45",
  5: "#1C1917",
};

function cssFont(variable: string, fallback: string): string {
  if (typeof window === "undefined") return fallback;
  const value = getComputedStyle(document.documentElement).getPropertyValue(variable).trim();
  return value ? `${value}, ${fallback}` : fallback;
}

type Fonts = { serif: string; sans: string };

type Block =
  | { kind: "label"; text: string; color: string; gapBefore: number }
  | { kind: "lines"; lines: string[]; font: string; lineHeight: number; color: string; gapBefore: number }
  | { kind: "quote"; lines: string[]; font: string; lineHeight: number; gapBefore: number }
  | { kind: "rule"; gapBefore: number };

function blockHeight(b: Block): number {
  switch (b.kind) {
    case "label":
      return 20;
    case "lines":
    case "quote":
      return b.lines.length * b.lineHeight;
    case "rule":
      return 1;
  }
}

function layout(ctx: CanvasRenderingContext2D, c: ShareWordCard, fonts: Fonts) {
  const measureWith = (font: string) => (s: string) => {
    ctx.font = font;
    return ctx.measureText(s).width;
  };

  const wordSize = fitFontSize([124, 110, 96, 84, 74, 64], CONTENT_WIDTH, (size) => {
    ctx.font = `700 ${size}px ${fonts.serif}`;
    return ctx.measureText(c.word).width;
  });
  const wordFont = `700 ${wordSize}px ${fonts.serif}`;
  const wordLines = wrapText(c.word, CONTENT_WIDTH, measureWith(wordFont));

  const blocks: Block[] = [];

  if (c.reference_definition) {
    const font = `400 32px ${fonts.sans}`;
    if (c.reference_source) {
      blocks.push({ kind: "label", text: c.reference_source, color: GOLD, gapBefore: 56 });
      blocks.push({
        kind: "lines",
        lines: wrapText(c.reference_definition, CONTENT_WIDTH, measureWith(font)),
        font,
        lineHeight: 48,
        color: BODY,
        gapBefore: 20,
      });
    } else {
      blocks.push({
        kind: "lines",
        lines: wrapText(c.reference_definition, CONTENT_WIDTH, measureWith(font)),
        font,
        lineHeight: 48,
        color: BODY,
        gapBefore: 56,
      });
    }
  }

  if (c.plain_meaning) {
    const font = `400 34px ${fonts.serif}`;
    blocks.push({ kind: "label", text: "In plain words", color: FAINT, gapBefore: 48 });
    blocks.push({
      kind: "lines",
      lines: wrapText(c.plain_meaning, CONTENT_WIDTH, measureWith(font)),
      font,
      lineHeight: 52,
      color: INK,
      gapBefore: 20,
    });
  }

  if (c.nuance) {
    const font = `400 30px ${fonts.sans}`;
    blocks.push({ kind: "label", text: "The nuance", color: FAINT, gapBefore: 48 });
    blocks.push({
      kind: "lines",
      lines: wrapText(c.nuance, CONTENT_WIDTH, measureWith(font)),
      font,
      lineHeight: 46,
      color: MUTED,
      gapBefore: 20,
    });
  }

  if (c.example) {
    const font = `italic 400 32px ${fonts.serif}`;
    blocks.push({ kind: "rule", gapBefore: 54 });
    blocks.push({
      kind: "quote",
      lines: wrapText(`“${c.example}”`, CONTENT_WIDTH - 34, measureWith(font)),
      font,
      lineHeight: 50,
      gapBefore: 44,
    });
  }

  const headerHeight = 30 + 36 + wordLines.length * (wordSize * 1.08) + (c.pronunciation ? 52 : 0);
  const bodyHeight = blocks.reduce((sum, b) => sum + b.gapBefore + blockHeight(b), 0);
  const height = Math.max(1080, Math.round(PAD * 2 + headerHeight + bodyHeight));

  return { wordFont, wordSize, wordLines, blocks, height };
}

function paintBackground(ctx: CanvasRenderingContext2D, width: number, height: number) {
  ctx.fillStyle = PARCHMENT;
  ctx.fillRect(0, 0, width, height);

  const warm = ctx.createRadialGradient(width * 0.12, height * 0.06, 0, width * 0.12, height * 0.06, width * 0.9);
  warm.addColorStop(0, "rgba(139, 115, 85, 0.07)");
  warm.addColorStop(1, "rgba(139, 115, 85, 0)");
  ctx.fillStyle = warm;
  ctx.fillRect(0, 0, width, height);

  ctx.strokeStyle = RULE;
  ctx.lineWidth = 1;
  ctx.strokeRect(FRAME_INSET + 0.5, FRAME_INSET + 0.5, width - FRAME_INSET * 2 - 1, height - FRAME_INSET * 2 - 1);

  // Gold corner ticks: the frame reads as bound paper rather than a plain box.
  const tick = 26;
  ctx.strokeStyle = GOLD;
  ctx.lineWidth = 2;
  const corners: [number, number, number, number][] = [
    [FRAME_INSET, FRAME_INSET, 1, 1],
    [width - FRAME_INSET, FRAME_INSET, -1, 1],
    [FRAME_INSET, height - FRAME_INSET, 1, -1],
    [width - FRAME_INSET, height - FRAME_INSET, -1, -1],
  ];
  for (const [x, y, dx, dy] of corners) {
    ctx.beginPath();
    ctx.moveTo(x + dx * tick, y);
    ctx.lineTo(x, y);
    ctx.lineTo(x, y + dy * tick);
    ctx.stroke();
  }
}

function paintTierMark(ctx: CanvasRenderingContext2D, x: number, baseline: number, level: VocabLevel) {
  const size = 22;
  const stroke = 3.4;
  const gap = 4.2;
  ctx.fillStyle = TIER_FILL[level];
  TIER_STROKE_HEIGHTS.forEach((ratio, i) => {
    const h = size * ratio;
    ctx.fillStyle = i < level ? TIER_FILL[level] : "#E4DCCE";
    ctx.beginPath();
    ctx.roundRect(x + i * (stroke + gap), baseline - h, stroke, h, stroke / 2);
    ctx.fill();
  });
  return 5 * stroke + 4 * gap;
}

function paintLabel(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, color: string, font: string) {
  ctx.save();
  ctx.font = font;
  ctx.fillStyle = color;
  if ("letterSpacing" in ctx) ctx.letterSpacing = "2.4px";
  ctx.fillText(text.toUpperCase(), x, y);
  ctx.restore();
}

/** Renders the word page as a standalone image. Browser only — needs canvas and loaded fonts. */
export async function renderWordCard(c: ShareWordCard): Promise<Blob> {
  if (typeof document === "undefined") throw new Error("Card rendering needs a browser");

  const fonts: Fonts = {
    serif: cssFont("--font-libre-baskerville", "Georgia, serif"),
    sans: cssFont("--font-dm-sans", "system-ui, sans-serif"),
  };

  if (document.fonts?.ready) await document.fonts.ready;

  const probe = document.createElement("canvas");
  const probeCtx = probe.getContext("2d");
  if (!probeCtx) throw new Error("Could not prepare the card");
  const plan = layout(probeCtx, c, fonts);

  const canvas = document.createElement("canvas");
  canvas.width = CARD_WIDTH;
  canvas.height = plan.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not draw the card");

  ctx.textBaseline = "alphabetic";
  paintBackground(ctx, CARD_WIDTH, plan.height);

  let y = PAD + 22;

  const tierLabel = VOCAB_LEVELS[c.level].tagline;
  const markWidth = paintTierMark(ctx, PAD, y, c.level);
  paintLabel(ctx, tierLabel, PAD + markWidth + 14, y - 3, GOLD, `600 20px ${fonts.sans}`);
  if (c.part_of_speech) {
    ctx.save();
    ctx.font = `600 20px ${fonts.sans}`;
    ctx.fillStyle = FAINT;
    if ("letterSpacing" in ctx) ctx.letterSpacing = "2.4px";
    ctx.textAlign = "right";
    ctx.fillText(c.part_of_speech.toUpperCase(), CARD_WIDTH - PAD, y - 3);
    ctx.restore();
  }

  y += 40;
  ctx.font = plan.wordFont;
  ctx.fillStyle = INK;
  for (const line of plan.wordLines) {
    y += plan.wordSize * 0.86;
    ctx.fillText(line, PAD, y);
    y += plan.wordSize * 0.22;
  }

  if (c.pronunciation) {
    y += 34;
    ctx.font = `italic 400 34px ${fonts.serif}`;
    ctx.fillStyle = GOLD;
    ctx.fillText(c.pronunciation, PAD, y);
    y += 8;
  }

  for (const block of plan.blocks) {
    y += block.gapBefore;
    if (block.kind === "label") {
      paintLabel(ctx, block.text, PAD, y, block.color, `600 19px ${fonts.sans}`);
      y += 2;
      continue;
    }
    if (block.kind === "rule") {
      ctx.strokeStyle = RULE;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(PAD, y + 0.5);
      ctx.lineTo(CARD_WIDTH - PAD, y + 0.5);
      ctx.stroke();
      continue;
    }

    const quote = block.kind === "quote";
    if (quote) {
      const h = block.lines.length * block.lineHeight;
      ctx.fillStyle = "#DFD3BE";
      ctx.beginPath();
      ctx.roundRect(PAD, y - block.lineHeight * 0.72, 3, h, 1.5);
      ctx.fill();
    }

    ctx.font = block.font;
    ctx.fillStyle = quote ? GOLD : block.color;
    const x = quote ? PAD + 34 : PAD;
    for (const line of block.lines) {
      ctx.fillText(line, x, y);
      y += block.lineHeight;
    }
    y -= block.lineHeight - block.lineHeight * 0.72;
  }

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("Could not export the card"));
    }, "image/png");
  });
}
