"use client";

type Props = {
  word: string;
  value: string;
  onChange: (v: string) => void;
  onBlur?: () => void;
  id?: string;
};

/** Your own sentence with the word — optional now; it's kept with the word and comes back when you review it. */
export function SentenceCapture({ word, value, onChange, onBlur, id = "sentence" }: Props) {
  return (
    <div>
      <div className="flex items-baseline justify-between gap-2">
        <label htmlFor={id} className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#B0A898]">
          Make it yours
        </label>
        <span className="shrink-0 text-[10px] font-medium text-[#B0A898]">Optional</span>
      </div>
      <textarea
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        rows={2}
        placeholder={`Write a sentence using “${word}”…`}
        className="mt-2 w-full resize-none rounded-xl border border-[#EDE8E0] bg-[#FDFBF7] px-3.5 py-2.5 text-sm leading-relaxed text-[#1C1917] outline-none ring-[#8B7355]/15 placeholder:text-[#B0A898] focus:border-[#8B7355] focus:ring-4"
      />
    </div>
  );
}
