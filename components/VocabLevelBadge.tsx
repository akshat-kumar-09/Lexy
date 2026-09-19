import { VOCAB_LEVELS, clampVocabLevel, type VocabLevel } from "@/lib/vocabLevels";

/**
 * Rarity reads better as a rising figure than as a coloured "L4" chip: five strokes,
 * filled to the level, so the eye ranks words without decoding a code.
 */
const STROKE_HEIGHTS = [0.42, 0.58, 0.72, 0.86, 1] as const;

const LEVEL_INK: Record<VocabLevel, { filled: string; label: string }> = {
  1: { filled: "#C4BAAB", label: "text-[#8B8377]" },
  2: { filled: "#AE9F88", label: "text-[#7A7268]" },
  3: { filled: "#8B7355", label: "text-[#8B7355]" },
  4: { filled: "#6B5A45", label: "text-[#5E5243]" },
  5: { filled: "#1C1917", label: "text-[#1C1917]" },
};

const EMPTY_STROKE = "#E4DCCE";

function TierMark({ level, size = 13 }: { level: VocabLevel; size?: number }) {
  const gap = size * 0.19;
  const stroke = size * 0.155;
  const width = stroke * 5 + gap * 4;
  const { filled } = LEVEL_INK[level];

  return (
    <svg
      viewBox={`0 0 ${width} ${size}`}
      width={width}
      height={size}
      aria-hidden="true"
      className="shrink-0 overflow-visible"
    >
      {STROKE_HEIGHTS.map((ratio, i) => {
        const h = size * ratio;
        return (
          <rect
            key={i}
            x={i * (stroke + gap)}
            y={size - h}
            width={stroke}
            height={h}
            rx={stroke / 2}
            fill={i < level ? filled : EMPTY_STROKE}
          />
        );
      })}
    </svg>
  );
}

type Props = {
  level: VocabLevel | number | undefined;
  /** Mark only — for dense rows and grid cards. Default pairs it with the tier name. */
  compact?: boolean;
  className?: string;
};

export function VocabLevelBadge({ level: raw, compact, className = "" }: Props) {
  const level = clampVocabLevel(raw);
  const meta = VOCAB_LEVELS[level];
  const title = `${meta.label} · ${meta.tagline} — ${meta.audience}`;

  if (compact) {
    return (
      <span
        className={`inline-flex translate-y-[1px] items-end ${className}`}
        title={title}
        aria-label={`${meta.label}, ${meta.tagline}`}
      >
        <TierMark level={level} size={12} />
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full border border-[#EDE8E0] bg-white/70 py-1 pl-2.5 pr-3 ${className}`}
      title={title}
      aria-label={`${meta.label}, ${meta.tagline}`}
    >
      <TierMark level={level} size={13} />
      <span
        className={`font-serif text-[11px] font-bold italic leading-none tracking-tight ${LEVEL_INK[level].label}`}
      >
        {meta.tagline}
      </span>
    </span>
  );
}

/** The mark on its own — for legends and keys that supply their own wording. */
export function VocabTierMark({
  level: raw,
  size = 13,
  className = "",
}: {
  level: VocabLevel | number | undefined;
  size?: number;
  className?: string;
}) {
  const level = clampVocabLevel(raw);
  return (
    <span className={`inline-flex items-end ${className}`} aria-hidden="true">
      <TierMark level={level} size={size} />
    </span>
  );
}
