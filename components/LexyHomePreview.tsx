"use client";

import { GenreStrip } from "@/components/GenreStrip";

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
        Name what you want language to explore
      </p>
      <p className="mt-2 max-w-md text-[13px] leading-relaxed text-[#A8A098] sm:text-sm">
        Type your own themes — Lexy spins words and metaphors around those ideas (synonyms, registers, and fresh angles).
      </p>

      <div className="mt-5 sm:mt-6">
        <GenreStrip variant="dark" hideBrandTitle />
      </div>
    </div>
  );
}
