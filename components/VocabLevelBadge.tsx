import { VOCAB_LEVELS, clampVocabLevel, type VocabLevel } from "@/lib/vocabLevels";

const LEVEL_STYLE: Record<VocabLevel, string> = {
  1: "border-[#D4CCC0] bg-[#F5F0EA] text-[#7A7268]",
  2: "border-[#D9D1C5] bg-[#F9F6F0] text-[#6A6360]",
  3: "border-[#8B7355]/40 bg-[#F5EFE0] text-[#8B7355]",
  4: "border-[#6A6360]/30 bg-[#EDE8E0] text-[#4A4340]",
  5: "border-[#1C1917]/20 bg-[#1C1917] text-[#F5EFE0]",
};

type Props = {
  level: VocabLevel | number | undefined;
  /** compact = "L3" only; default shows tagline too */
  compact?: boolean;
  className?: string;
};

export function VocabLevelBadge({ level: raw, compact, className = "" }: Props) {
  const level = clampVocabLevel(raw);
  const meta = VOCAB_LEVELS[level];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] ${LEVEL_STYLE[level]} ${className}`}
      title={meta.audience}
    >
      <span>L{level}</span>
      {!compact && <span className="normal-case tracking-normal opacity-90">{meta.tagline}</span>}
    </span>
  );
}
