"use client";

import { LEXY_GENRES, getLexyGenre } from "@/lib/genres";
import { useTasteProfile } from "@/lib/store";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

/** Demo card on the home page: words “pop” under the user’s chosen genres (or a gentle rotation). */
export function LexyHomePreview() {
  const genreIds = useTasteProfile((s) => s.genreIds);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const id = window.setInterval(() => setTick((t) => t + 1), 3200);
    return () => window.clearInterval(id);
  }, []);

  const floating = useMemo(() => {
    if (genreIds.length) {
      const words = genreIds
        .map((id) => getLexyGenre(id)?.previewWords ?? [])
        .flat();
      const dedup = [...new Set(words)];
      const i = tick % Math.max(dedup.length, 1);
      return dedup.length ? dedup.slice(i).concat(dedup.slice(0, i)).slice(0, 8) : [];
    }
    const all = [...new Set(LEXY_GENRES.flatMap((g) => g.previewWords))];
    const chunk = 8;
    const start = (tick * 2) % Math.max(all.length, 1);
    return [...all.slice(start, start + chunk), ...all.slice(0, Math.max(0, start + chunk - all.length))].slice(0, chunk);
  }, [genreIds, tick]);

  const headlineGenre =
    genreIds.length > 0 ? getLexyGenre(genreIds[genreIds.length - 1])?.title ?? "Your lenses" : "Every kind of curiosity";

  return (
    <div className="relative overflow-hidden rounded-[1.35rem] border border-[#2A2520] bg-[#1C1917] px-4 py-7 shadow-xl sm:px-5 sm:py-8 md:px-8 md:py-10">
      <div className="pointer-events-none absolute -left-12 bottom-0 h-40 w-40 rounded-full bg-[#8B7355]/12" />
      <div className="pointer-events-none absolute -right-8 -top-8 h-36 w-36 rounded-full bg-[#8B7355]/10" />

      <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#8B7355]">Preview</p>
      <h2 className="mt-3 font-serif text-2xl font-bold leading-tight text-[#F5EFE0] md:text-3xl">
        Words keep surfacing
      </h2>
      <p className="mt-2 max-w-md text-sm italic leading-relaxed text-[#A8A098]">
        Under <span className="text-[#E8DFD0] not-italic">{headlineGenre}</span> — and whatever you save in your lexicon.
        Same app: your taste, your angles.
      </p>

      <div className="mt-8 flex min-h-[4.5rem] flex-wrap justify-center gap-2 md:min-h-[5rem]">
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
      </div>

      <p className="mt-10 text-center text-[11px] text-[#6A6360]">
        <Link href="/dive" className="font-semibold text-[#8B7355] hover:text-[#C8BFB0]">
          Open Deep Dive
        </Link>
        <span className="mx-2 text-[#4A4340]">·</span>
        <Link href="/daily" className="font-semibold text-[#8B7355] hover:text-[#C8BFB0]">
          Daily Word
        </Link>
      </p>
    </div>
  );
}
