"use client";

import { LEXY_GENRES } from "@/lib/genres";
import { MAX_GENRES, useTasteProfile } from "@/lib/store";

type Props = {
  /** Tighter padding and smaller type for tool pages */
  compact?: boolean;
  className?: string;
};

export function GenreStrip({ compact, className = "" }: Props) {
  const genreIds = useTasteProfile((s) => s.genreIds);
  const toggleGenre = useTasteProfile((s) => s.toggleGenre);
  const clearGenres = useTasteProfile((s) => s.clearGenres);

  return (
    <div className={`space-y-3 ${className}`}>
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p
            className={`font-semibold uppercase tracking-[0.14em] text-[#B0A898] ${compact ? "text-[9px]" : "text-[10px]"}`}
          >
            Interest lenses
          </p>
          <p className={`mt-1 text-[#8B7355] ${compact ? "text-[11px]" : "text-xs"}`}>
            Pick up to {MAX_GENRES} — Daily and Deep Dive lean into these worlds.
          </p>
        </div>
        {genreIds.length > 0 && (
          <button
            type="button"
            onClick={clearGenres}
            className="min-h-10 shrink-0 px-2 text-[10px] font-semibold uppercase tracking-[0.1em] text-[#8B7355] underline-offset-2 active:opacity-70 sm:min-h-0"
          >
            Clear
          </button>
        )}
      </div>

      <div className="-mx-1 md:mx-0">
        <div
          className={`snap-x-scroll flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] md:flex-wrap md:overflow-x-visible md:pb-0 [&::-webkit-scrollbar]:hidden ${compact ? "" : "md:gap-2.5"}`}
        >
          {LEXY_GENRES.map((g) => {
            const on = genreIds.includes(g.id);
            const atCap = !on && genreIds.length >= MAX_GENRES;
            return (
              <button
                key={g.id}
                type="button"
                title={g.tagline}
                disabled={atCap}
                onClick={() => toggleGenre(g.id)}
                className={`snap-card shrink-0 scroll-mx-1 rounded-full border px-3 py-2 text-left transition first:ml-1 last:mr-1 md:ml-0 md:mr-0 md:py-1.5 ${
                  compact ? "max-w-[85vw] sm:max-w-[11rem]" : "max-w-[min(85vw,16rem)] sm:max-w-[14rem]"
                } ${
                  on
                    ? "border-[#8B7355] bg-[#F5EFE0] text-[#1C1917] shadow-sm"
                    : "border-[#EDE8E0] bg-white text-[#4A4340] active:border-[#8B7355]/45"
                } ${atCap ? "cursor-not-allowed opacity-45" : ""}`}
              >
                <span className={`block font-serif font-bold leading-tight ${compact ? "text-xs" : "text-sm"}`}>
                  {g.title}
                </span>
                {!compact && (
                  <span className="mt-0.5 block text-[10px] leading-snug text-[#8B7355]">{g.tagline}</span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
