"use client";

type Props = {
  value: number;
  onChange: (v: number) => void;
  id?: string;
  label?: string;
};

export function RatingDial({ value, onChange, id = "rating", label = "Your rating" }: Props) {
  return (
    <div className="space-y-2">
      <div className="flex justify-between text-[10px] font-medium uppercase tracking-[0.14em] text-[#B0A898]">
        <label htmlFor={id}>{label}</label>
        <span className="tabular-nums text-[#1C1917]">{value.toFixed(1)}</span>
      </div>
      <div className="relative py-2 min-[420px]:py-1">
        <input
          id={id}
          type="range"
          min={1}
          max={10}
          step={0.1}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="rating-dial h-3 w-full cursor-pointer appearance-none rounded-full bg-[#EDE8E0]"
        />
      </div>
    </div>
  );
}
