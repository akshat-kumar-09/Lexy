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
const FAINT = "#A99F92";
const RULE = "#E8DFD0";

/** Baseline sits this far below a text block's top edge — leaves even leading above the caps. */
const ASCENT_RATIO = 0.72;
const LABEL_CAP_HEIGHT = 14;

const TIER_STROKE_HEIGHTS = [0.42, 0.58, 0.72, 0.86, 1] as const;
const TIER_FILL: Record<VocabLevel, string> = {
  1: "#AFA492",
  2: "#9A8869",
  3: "#8B7355",
  4: "#63523D",
  5: "#1C1917",
};
const TIER_EMPTY = "#DFD6C6";
const TIER_SIZE = 22;
const TIER_STROKE = 3.4;
const TIER_GAP = 4.2;
const TIER_WIDTH = TIER_STROKE * 5 + TIER_GAP * 4;

function cssFont(variable: string, fallback: string): string {
  if (typeof window === "undefined") return fallback;
  const value = getComputedStyle(document.documentElement).getPropertyValue(variable).trim();
  return value ? `${value}, ${fallback}` : fallback;
}

type Fonts = { serif: string; sans: string };

type TextBlock = {
  kind: "text";
  lines: string[];
  font: string;
  lineHeight: number;
  color: string;
  gapBefore: number;
  /** Gold hairline down the left, for the quoted sentence. */
  quoted?: boolean;
};

type Block =
  | TextBlock
  | { kind: "label"; text: string; color: string; gapBefore: number }
  | { kind: "rule"; gapBefore: number };

type Plan = {
  wordFont: string;
  wordSize: number;
  wordLines: string[];
  pronunciationLines: string[];
  blocks: Block[];
};

function plan(ctx: CanvasRenderingContext2D, c: ShareWordCard, fonts: Fonts): Plan {
  const measureWith = (font: string) => (s: string) => {
    ctx.font = font;
    return ctx.measureText(s).width;
  };

  const wordSize = fitFontSize([124, 110, 96, 84, 74, 64], CONTENT_WIDTH, (size) => {
    ctx.font = `700 ${size}px ${fonts.serif}`;
    return ctx.measureText(c.word).width;
  });
  const wordFont = `700 ${wordSize}px ${fonts.serif}`;

  const pronunciationFont = `italic 400 34px ${fonts.serif}`;
  const blocks: Block[] = [];

  const pushSection = (
    label: string,
    text: string,
    font: string,
    lineHeight: number,
    color: string,
    labelColor: string
  ) => {
    if (!text) return;
    if (label) blocks.push({ kind: "label", text: label, color: labelColor, gapBefore: blocks.length ? 46 : 54 });
    blocks.push({
      kind: "text",
      lines: wrapText(text, CONTENT_WIDTH, measureWith(font)),
      font,
      lineHeight,
      color,
      gapBefore: label ? 12 : blocks.length ? 46 : 54,
    });
  };

  pushSection(
    c.reference_source,
    c.reference_definition,
    `400 32px ${fonts.sans}`,
    48,
    BODY,
    GOLD
  );
  pushSection("In plain words", c.plain_meaning, `400 34px ${fonts.serif}`, 52, INK, FAINT);
  pushSection("The nuance", c.nuance, `400 30px ${fonts.sans}`, 46, MUTED, FAINT);

  if (c.example) {
    const font = `italic 400 32px ${fonts.serif}`;
    blocks.push({ kind: "rule", gapBefore: 54 });
    blocks.push({
      kind: "text",
      lines: wrapText(`“${c.example}”`, CONTENT_WIDTH - 40, measureWith(font)),
      font,
      lineHeight: 50,
      color: GOLD,
      gapBefore: 44,
      quoted: true,
    });
  }

  return {
    wordFont,
    wordSize,
    wordLines: wrapText(c.word, CONTENT_WIDTH, measureWith(wordFont)),
    pronunciationLines: wrapText(c.pronunciation, CONTENT_WIDTH, measureWith(pronunciationFont)),
    blocks,
  };
}

function drawTierMark(ctx: CanvasRenderingContext2D, x: number, baseline: number, level: VocabLevel) {
  TIER_STROKE_HEIGHTS.forEach((ratio, i) => {
    const h = TIER_SIZE * ratio;
    ctx.fillStyle = i < level ? TIER_FILL[level] : TIER_EMPTY;
    ctx.beginPath();
    ctx.roundRect(x + i * (TIER_STROKE + TIER_GAP), baseline - h, TIER_STROKE, h, TIER_STROKE / 2);
    ctx.fill();
  });
}

function drawLabel(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  baseline: number,
  color: string,
  font: string,
  align: CanvasTextAlign = "left"
) {
  ctx.save();
  ctx.font = font;
  ctx.fillStyle = color;
  ctx.textAlign = align;
  if ("letterSpacing" in ctx) ctx.letterSpacing = "2.4px";
  ctx.fillText(text.toUpperCase(), x, baseline);
  ctx.restore();
}

function drawFrame(ctx: CanvasRenderingContext2D, width: number, height: number) {
  ctx.fillStyle = PARCHMENT;
  ctx.fillRect(0, 0, width, height);

  const warm = ctx.createRadialGradient(width * 0.12, height * 0.05, 0, width * 0.12, height * 0.05, width);
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

/**
 * One pass both measures and paints, so the canvas is exactly as tall as the words need —
 * no clipped nuance, no lake of empty parchment under the quote.
 */
function renderPass(
  ctx: CanvasRenderingContext2D,
  c: ShareWordCard,
  p: Plan,
  fonts: Fonts,
  paint: boolean
): number {
  let y = PAD;

  const tierBaseline = y + TIER_SIZE;
  if (paint) {
    drawTierMark(ctx, PAD, tierBaseline, c.level);
    drawLabel(
      ctx,
      VOCAB_LEVELS[c.level].tagline,
      PAD + TIER_WIDTH + 14,
      tierBaseline - 3,
      GOLD,
      `600 20px ${fonts.sans}`
    );
    if (c.part_of_speech) {
      drawLabel(
        ctx,
        c.part_of_speech,
        CARD_WIDTH - PAD,
        tierBaseline - 3,
        FAINT,
        `600 20px ${fonts.sans}`,
        "right"
      );
    }
  }
  y = tierBaseline + 30;

  if (paint) {
    ctx.font = p.wordFont;
    ctx.fillStyle = INK;
  }
  for (const line of p.wordLines) {
    const baseline = y + p.wordSize * 0.76;
    if (paint) {
      ctx.font = p.wordFont;
      ctx.fillStyle = INK;
      ctx.fillText(line, PAD, baseline);
    }
    y = baseline + p.wordSize * 0.2;
  }

  if (p.pronunciationLines.length) {
    y += 14;
    for (const line of p.pronunciationLines) {
      const baseline = y + 26;
      if (paint) {
        ctx.font = `italic 400 34px ${fonts.serif}`;
        ctx.fillStyle = GOLD;
        ctx.fillText(line, PAD, baseline);
      }
      y = baseline + 10;
    }
  }

  for (const block of p.blocks) {
    y += block.gapBefore;

    if (block.kind === "label") {
      const baseline = y + LABEL_CAP_HEIGHT;
      if (paint) drawLabel(ctx, block.text, PAD, baseline, block.color, `600 19px ${fonts.sans}`);
      y = baseline + 2;
      continue;
    }

    if (block.kind === "rule") {
      if (paint) {
        ctx.strokeStyle = RULE;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(PAD, y + 0.5);
        ctx.lineTo(CARD_WIDTH - PAD, y + 0.5);
        ctx.stroke();
      }
      y += 1;
      continue;
    }

    const top = y;
    const height = block.lines.length * block.lineHeight;
    const x = block.quoted ? PAD + 36 : PAD;

    if (paint) {
      if (block.quoted) {
        ctx.fillStyle = "#DFD3BE";
        ctx.beginPath();
        ctx.roundRect(PAD, top + 6, 3, height - 12, 1.5);
        ctx.fill();
      }
      ctx.font = block.font;
      ctx.fillStyle = block.color;
      block.lines.forEach((line, i) => {
        ctx.fillText(line, x, top + block.lineHeight * ASCENT_RATIO + i * block.lineHeight);
      });
    }

    y = top + height;
  }

  return Math.round(y + PAD);
}

/** Renders the word page as a standalone image. Browser only — needs canvas and loaded fonts. */
export async function renderWordCard(c: ShareWordCard): Promise<Blob> {
  if (typeof document === "undefined") throw new Error("Card rendering needs a browser");

  const fonts: Fonts = {
    serif: cssFont("--font-libre-baskerville", "Georgia, serif"),
    sans: cssFont("--font-dm-sans", "system-ui, sans-serif"),
  };

  if (document.fonts?.ready) await document.fonts.ready;

  const canvas = document.createElement("canvas");
  canvas.width = CARD_WIDTH;
  canvas.height = 10;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not draw the card");
  ctx.textBaseline = "alphabetic";

  const layout = plan(ctx, c, fonts);
  const height = renderPass(ctx, c, layout, fonts, false);

  canvas.height = height;
  ctx.textBaseline = "alphabetic";
  drawFrame(ctx, CARD_WIDTH, height);
  renderPass(ctx, c, layout, fonts, true);

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("Could not export the card"));
    }, "image/png");
  });
}
