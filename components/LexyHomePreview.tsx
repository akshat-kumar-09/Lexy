"use client";

import { GenreStrip } from "@/components/GenreStrip";
import { THREAD_PREVIEW_HIGHLIGHTS } from "@/lib/threads";

/**
 * Home jewel card: full thread editor with dark styling — same data as Settings / Deep Dive / Metaphors.
 */
export function LexyHomePreview() {
  return (
    <div className="relative overflow-hidden rounded-[1.25rem] border border-[#2A2520] bg-[#1C1917] px-3.5 py-6 shadow-xl sm:rounded-[1.35rem] sm:px-5 sm:py-8 md:px-8 md:py-10">
      <div className="pointer-events-none absolute -left-10 bottom-0 h-36 w-36 rounded-full bg-[#8B7355]/12 sm:h-40 sm:w-40" />
      <div className="pointer-events-none absolute -right-6 -top-6 h-28 w-28 rounded-full bg-[#8B7355]/10 sm:-right-8 sm:-top-8 sm:h-36 sm:w-36" />

      <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-[#B0A898] sm:text-[10px]">Your threads</p>
      <p className="mt-2.5 max-w-md font-serif text-lg font-bold leading-tight tracking-tight text-[#F5EFE0] sm:mt-3 sm:text-xl md:text-2xl">
        Your imagination is the limit.
      </p>
      <p className="mt-2 max-w-md text-[13px] leading-relaxed text-[#A8A098] sm:text-sm">
        Name what you want language to explore — Lexy spins words and metaphors around your themes (synonyms, registers,
        and fresh angles).
      </p>

      <div className="mt-4 flex flex-wrap gap-2">
        {THREAD_PREVIEW_HIGHLIGHTS.map((label) => (
          <span
            key={label}
            className="rounded-full border border-[#3D3830] bg-[#252220] px-3 py-1 text-[11px] font-medium tracking-tight text-[#C8BFB0]"
          >
            {label}
          </span>
        ))}
      </div>

      <div className="mt-5 sm:mt-6">
        <GenreStrip variant="dark" hideBrandTitle />
      </div>
    </div>
  );
}
