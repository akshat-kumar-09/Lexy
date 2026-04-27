"use client";

import { IPA } from "@/components/IPA";
import Link from "next/link";
import { useMemo } from "react";
import { useLexicon } from "@/lib/store";
import type { LexiconWord } from "@/lib/types";

import { FAVOURITE_THRESHOLD } from "@/lib/lexyCopy";

export function ScribbleLexiconSidebar() {
  const words = useLexicon((s) => s.words);

  const sorted = useMemo(() => {
    return Object.values(words).sort((a, b) => b.rating - a.rating);
  }, [words]);

  return (
    <aside className="rounded-2xl border border-[#EDE8E0] bg-white shadow-sm lg:sticky lg:top-6 lg:max-h-[min(85vh,calc(100vh-8rem))] lg:flex lg:flex-col">
      <div className="border-b border-[#F5F0EA] px-4 py-3">
        <h2 className="font-serif text-lg font-bold text-[#1C1917]">My Lexy</h2>
        <p className="mt-0.5 text-[10px] font-medium uppercase tracking-[0.12em] text-[#B0A898]">
          {sorted.length} word{sorted.length === 1 ? "" : "s"} · beside you as you write
        </p>
        <Link
          href="/lexicon"
          className="mt-2 inline-block text-xs font-medium text-[#8B7355] underline-offset-2 hover:underline"
        >
          Open full lexicon
        </Link>
      </div>

      <div className="overflow-y-auto px-3 py-2 lg:flex-1 lg:min-h-0">
        {sorted.length === 0 ? (
          <p className="px-1 py-6 text-center font-serif text-sm italic leading-relaxed text-[#B0A898]">
            Your lexicon is empty. The words you love are waiting to be found.
          </p>
        ) : (
          <ul className="space-y-0 divide-y divide-[#F5F0EA]">
            {sorted.map((w) => (
              <LexiconRow key={w.word.toLowerCase()} w={w} />
            ))}
          </ul>
        )}
      </div>
    </aside>
  );
}

function LexiconRow({ w }: { w: LexiconWord }) {
  const fav = w.rating >= FAVOURITE_THRESHOLD;
  return (
    <li className="py-3 px-1">
      <div className="flex items-baseline justify-between gap-2">
        <span className="font-serif text-[15px] font-bold leading-tight text-[#1C1917]">{w.word}</span>
        <span
          className={`shrink-0 text-xs font-semibold tabular-nums ${fav ? "text-[#1C7A40]" : "text-[#6A6360]"}`}
        >
          {w.rating.toFixed(1)}
        </span>
      </div>
      <IPA className="mt-0.5 block text-[11px] leading-snug">{w.pronunciation}</IPA>
      <p className="mt-1.5 line-clamp-2 text-[11px] leading-relaxed text-[#6A6360]">{w.definition}</p>
    </li>
  );
}
