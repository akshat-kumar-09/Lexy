import { VOCAB_LEVELS, clampVocabLevel, type VocabLevel } from "@/lib/vocabLevels";

/** How often other people use this word — a line, not a numbered level. */
export function WordUse({
  level: raw,
  className = "",
}: {
  level: VocabLevel | number | undefined;
  className?: string;
}) {
  const meta = VOCAB_LEVELS[clampVocabLevel(raw)];
  return (
    <p className={className}>
      <span className="block text-[10px] font-semibold uppercase tracking-[0.14em] text-[#B0A898]">
        How often others use it
      </span>
      <span className="mt-1.5 block font-serif text-[15px] italic leading-snug text-[#1C1917]">
        {meta.howOften}
      </span>
      <span className="mt-1 block text-[12.5px] leading-relaxed text-[#6A6360]">{meta.howOftenDetail}</span>
    </p>
  );
}
