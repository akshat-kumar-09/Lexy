"use client";

import { LEXY_GENRES, getLexyGenre } from "@/lib/genres";
import { MAX_GENRES, useTasteProfile } from "@/lib/store";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

/**
 * Interactive home card: pick today's threads and watch sample words surface for those angles.
 * Desktop: hover a thread for its tagline; mobile: uses native `title` on tap/long-press.
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
      ? "Tap a thread below — words will surface for that angle."
      : `Surfacing words for ${genreIds.length} thread${genreIds.length === 1 ? "" : "s"} you chose today.`;

  return (
    <div className="relative overflow-hidden rounded-[1.35rem] border border-[#2A2520] bg-[#1C1917] px-4 py-7 shadow-xl sm:px-5 sm:py-8 md:px-8 md:py-10">
      <div className="pointer-events-none absolute -left-12 bottom-0 h-40 w-40 rounded-full bg-[#8B7355]/12" />
      <div className="pointer-events-none absolute -right-8 -top-8 h-36 w-36 rounded-full bg-[#8B7355]/10" />

      <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#8B7355]">Try today&apos;s threads</p>
      <h2 className="mt-3 font-serif text-2xl font-bold leading-tight text-[#F5EFE0] md:text-3xl">
        Words that fit the door you open
      </h2>
      <p className="mt-2 max-w-md text-sm italic leading-relaxed text-[#A8A098]">{hint}</p>

      <div className="mt-6 -mx-1">
        <div className="snap-x-scroll flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] md:flex-wrap md:overflow-x-visible [&::-webkit-scrollbar]:hidden">
          {LEXY_GENRES.map((g) => {
            const on = genreIds.includes(g.id);
            const atCap = !on && genreIds.length >= MAX_GENRES;
            return (
              <div key={g.id} className="group/chip relative shrink-0 first:ml-1 last:mr-1">
                <button
                  type="button"
                  title={g.tagline}
                  disabled={atCap}
                  onClick={() => toggleGenre(g.id)}
                  className={`snap-card scroll-mx-1 rounded-full border px-3 py-2 text-left transition md:py-1.5 ${
                    on
                      ? "border-[#8B7355] bg-[#2A2520] text-[#F5EFE0]"
                      : "border-[#3D3830] bg-[#252220] text-[#C8BFB0] active:border-[#8B7355]/60"
                  } ${atCap ? "cursor-not-allowed opacity-40" : ""} max-w-[min(88vw,14rem)]`}
                >
                  <span className="block font-serif text-xs font-bold leading-tight">{g.title}</span>
                </button>
                <div
                  className="pointer-events-none absolute bottom-full left-1/2 z-20 mb-2 hidden w-max max-w-[min(16rem,calc(100vw-2rem))] -translate-x-1/2 rounded-lg border border-[#3D3830] bg-[#1C1917] px-2.5 py-1.5 text-center text-[10px] leading-snug text-[#C8BFB0] opacity-0 shadow-lg transition duration-150 group-hover/chip:opacity-100 md:block"
                  role="tooltip"
                >
                  {g.tagline}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-6 flex min-h-[4rem] flex-wrap justify-center gap-2 md:min-h-[4.5rem]">
        {genreIds.length === 0 ? (
          <p className="max-w-sm text-center text-xs leading-relaxed text-[#6A6360]">
            No thread selected yet — the chips above are the same ones on Deep Dive and Metaphors. Choose one or two and
            watch samples appear here.
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
                className="rounded-full border border-[#2A2520] bg-[#252220] px-3 py-1.5 font-serif text-sm italic text-[#C8BFB0] shadow-sm"
              >
                {w}
              </motion.span>
            ))}
          </AnimatePresence>
        )}
      </div>

      <p className="mt-8 text-center text-[11px] text-[#6A6360]">
        <Link href="/dive" className="font-semibold text-[#8B7355] hover:text-[#C8BFB0]">
          Deep Dive
        </Link>
        <span className="mx-2 text-[#4A4340]">·</span>
        <Link href="/metaphors" className="font-semibold text-[#8B7355] hover:text-[#C8BFB0]">
          Today&apos;s metaphor
        </Link>
      </p>
    </div>
  );
}
