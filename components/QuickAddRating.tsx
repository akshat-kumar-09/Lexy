"use client";

import { useState, type KeyboardEvent } from "react";

type Props = {
  onAdd: (rating: number) => void;
  disabled?: boolean;
};

/** Type a rating, hit enter — adds straight from the grid card, no detail page, no sentence. */
export function QuickAddRating({ onAdd, disabled }: Props) {
  const [value, setValue] = useState("");

  function submit() {
    const n = Number(value);
    if (!Number.isFinite(n) || n < 1 || n > 10) return;
    onAdd(Math.round(n * 10) / 10);
    setValue("");
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") submit();
  }

  return (
    <div
      className="flex shrink-0 items-center gap-1"
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
    >
      <input
        type="number"
        inputMode="decimal"
        min={1}
        max={10}
        step={0.5}
        value={value}
        disabled={disabled}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={onKeyDown}
        placeholder="Rate"
        aria-label="Quick rate (1-10)"
        className="w-14 rounded-full border border-[#EDE8E0] bg-[#FDFBF7] px-1.5 py-1 text-center text-xs text-[#1C1917] outline-none focus:border-[#8B7355] disabled:opacity-40"
      />
      <button
        type="button"
        disabled={disabled || !value.trim()}
        onClick={submit}
        className="rounded-full bg-[#1C1917] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.06em] text-[#F5EFE0] disabled:opacity-30"
      >
        Add
      </button>
    </div>
  );
}
