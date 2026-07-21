"use client";

const PRESETS = [
  { value: 6, label: "Like it" },
  { value: 8, label: "Love it" },
  { value: 9.5, label: "Obsessed" },
] as const;

type Props = {
  onPick: (value: number) => void;
  disabled?: boolean;
};

/** One-tap rate + add — skips the dial for the common case of "just add it already". */
export function QuickRate({ onPick, disabled }: Props) {
  return (
    <div className="flex flex-wrap gap-2">
      {PRESETS.map((p) => (
        <button
          key={p.value}
          type="button"
          disabled={disabled}
          onClick={() => onPick(p.value)}
          className="min-w-[92px] flex-1 rounded-full border border-[#EDE8E0] bg-[#FDFBF7] px-3 py-2.5 text-xs font-semibold text-[#6A6360] transition active:scale-[0.97] active:border-[#8B7355]/50 active:bg-[#F5EFE0] disabled:opacity-40 sm:hover:border-[#8B7355]/50 sm:hover:bg-[#F5EFE0]"
        >
          {p.label}
        </button>
      ))}
    </div>
  );
}
