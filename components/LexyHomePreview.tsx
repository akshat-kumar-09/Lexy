"use client";

import { LEXY_GENRES, getLexyGenre } from "@/lib/genres";
import { MAX_GENRES, useTasteProfile } from "@/lib/store";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

/**
 * Interactive home card: pick today's threads and watch sample words surface.
 * Chips use wrapped text on narrow screens so labels are never clipped mid-word.
 */
export function LexyHomePreview() {
  const genreIds = useTasteProfile((s) => s.genreIds);
  const toggleGenre = useTasteProfile((s) => s.toggleGenre);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const id = window.setInterval(() => setTick((t) => t + 1), 2800);
    return () => window.clearInterval(id);
  }, []);

  const floating = useMemo(() => {
    if (genreIds.length) {
      const words = genreIds.map((id) => getLexyGenre(id)?.previewWords ?? []).flat();
      const dedup = [...new Set(words)];
      const i = tick % Math.max(dedup.length, 1);
      return dedup.length ? dedup.slice(i).concat(dedup.slice(0, i)).slice(0, 8) : [];
    }
    return [];
  }, [genreIds, tick]);

  const hint =
    genreIds.length === 0
      ? "Choose a thread — words rise to match."
      : `${genreIds.length} thread${genreIds.length === 1 ? "" : "s"} · surfacing samples.`;

  return (
    <div className="relative overflow-hidden rounded-[1.25rem] border border-[#2A2520] bg-[#1C1917] px-3.5 py-6 shadow-xl sm:rounded-[1.35rem] sm:px-5 sm:py-8 md:px-8 md:py-10">
      <div className="pointer-events-none absolute -left-10 bottom-0 h-36 w-36 rounded-full bg-[#8B7355]/12 sm:h-40 sm:w-40" />
      <div className="pointer-events-none absolute -right-6 -top-6 h-28 w-28 rounded-full bg-[#8B7355]/10 sm:-right-8 sm:-top-8 sm:h-36 sm:w-36" />

      <p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-[#8B7355] sm:text-[10px]">This moment</p>
      <h2 className="mt-2.5 font-serif text-[1.35rem] font-normal italic leading-[1.2] tracking-tight text-[#F5EFE0] sm:mt-3 sm:text-2xl md:text-[1.75rem]">
        How do you feel this instant?
      </h2>
      <p className="mt-2 max-w-md text-[13px] italic leading-relaxed text-[#A8A098] sm:text-sm">{hint}</p>

      <div className="mt-5 -mx-0.5 sm:mt-6 sm:-mx-1">
        <div className="snap-x-scroll flex gap-2 overflow-x-auto overscroll-x-contain py-0.5 pl-0.5 pr-1 [-ms-overflow-style:none] [scrollbar-width:none] md:flex-wrap md:overflow-x-visible md:px-0 [&::-webkit-scrollbar]:hidden">
          {LEXY_GENRES.map((g) => {
            const on = genreIds.includes(g.id);
            const atCap = !on && genreIds.length >= MAX_GENRES;
            return (
              <div key={g.id} className="group/chip relative shrink-0 snap-start">
                <button
                  type="button"
                  title={g.tagline}
                  disabled={atCap}
                  onClick={() => toggleGenre(g.id)}
                  className={`flex min-h-[2.75rem] w-[7.25rem] flex-col items-center justify-center rounded-2xl border px-2 py-2 text-center transition active:scale-[0.98] sm:min-h-0 sm:w-[7.75rem] sm:px-2.5 sm:py-2.5 md:w-[8.25rem] ${
                    on
                      ? "border-[#8B7355] bg-[#2A2520] text-[#F5EFE0] shadow-[0_0_0_1px_rgba(139,115,85,0.25)]"
                      : "border-[#3D3830] bg-[#252220] text-[#C8BFB0] active:border-[#8B7355]/55"
                  } ${atCap ? "cursor-not-allowed opacity-40" : ""}`}
                >
                  <span className="text-balance font-serif text-[11px] font-semibold leading-snug sm:text-xs">
                    {g.title}
                  </span>
                </button>
                <div
                  className="pointer-events-none absolute bottom-full left-1/2 z-20 mb-2 hidden w-max max-w-[min(18rem,calc(100vw-2.5rem))] -translate-x-1/2 rounded-xl border border-[#3D3830] bg-[#1C1917] px-3 py-2 text-center text-[10px] leading-snug text-[#C8BFB0] opacity-0 shadow-xl transition duration-150 group-hover/chip:opacity-100 md:block"
                  role="tooltip"
                >
                  {g.tagline}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-5 flex min-h-[3.5rem] flex-wrap justify-center gap-2 sm:mt-6 sm:min-h-[4rem] md:min-h-[4.5rem]">
        {genreIds.length === 0 ? (
          <p className="max-w-[20rem] text-center text-[12px] leading-relaxed text-[#7a7268] sm:text-xs">
            Threads match Deep Dive &amp; Metaphor — pick one to see language gather here.
          </p>
        ) : (
          <AnimatePresence mode="popLayout">
            {floating.map((w, i) => (
              <motion.span
                key={`${tick}-${w}-${i}`}
                layout
                initial={{ opacity: 0, scale: 0.88, y: 8 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.92 }}
                transition={{ type: "spring", stiffness: 440, damping: 30, delay: i * 0.04 }}
                className="rounded-full border border-[#2A2520] bg-[#252220] px-2.5 py-1.5 font-serif text-[13px] italic text-[#C8BFB0] shadow-sm sm:px-3 sm:text-sm"
              >
                {w}
              </motion.span>
            ))}
          </AnimatePresence>
        )}
      </div>

      <p className="mt-6 text-center text-[10px] leading-relaxed text-[#6A6360] sm:mt-8 sm:text-[11px]">
        <Link href="/dive" className="font-semibold text-[#8B7355] active:text-[#C8BFB0] sm:hover:text-[#C8BFB0]">
          Deep Dive
        </Link>
        <span className="mx-2 text-[#4A4340]">·</span>
        <Link href="/metaphors" className="font-semibold text-[#8B7355] active:text-[#C8BFB0] sm:hover:text-[#C8BFB0]">
          Today&apos;s metaphor
        </Link>
      </p>
    </div>
  );
}
