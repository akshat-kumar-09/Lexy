"use client";

import { IPA } from "@/components/IPA";
import { RateBar } from "@/components/RateBar";
import { VocabLevelBadge } from "@/components/VocabLevelBadge";
import { useLexicon } from "@/lib/store";
import type { LexiconWord } from "@/lib/types";
import { FAVOURITE_THRESHOLD, NOT_FOR_ME_BELOW } from "@/lib/lexyCopy";
import Link from "next/link";
import { useEffect, useMemo, useState, type MouseEvent } from "react";

export default function LexiconPage() {
  const words = useLexicon((s) => s.words);
  const updateRating = useLexicon((s) => s.updateRating);
  const removeWord = useLexicon((s) => s.removeWord);
  const exportText = useLexicon((s) => s.exportText);
  const exportLexiconJson = useLexicon((s) => s.exportLexiconJson);

  const sorted = useMemo(() => {
    return Object.values(words).sort((a, b) => b.rating - a.rating);
  }, [words]);

  const kept = sorted.filter((w) => w.rating >= NOT_FOR_ME_BELOW);
  const favourites = kept.filter((w) => w.rating >= FAVOURITE_THRESHOLD);
  const rest = kept.filter((w) => w.rating < FAVOURITE_THRESHOLD);
  const notForMe = sorted.filter((w) => w.rating < NOT_FOR_ME_BELOW);

  const total = kept.length;
  const avg = sorted.length ? sorted.reduce((a, w) => a + w.rating, 0) / sorted.length : 0;

  const [pick, setPick] = useState<string | null>(null);

  useEffect(() => {
    if (sorted.length === 0) {
      setPick(null);
      return;
    }
    if (!pick || !words[pick]) {
      setPick(sorted[0].word.toLowerCase());
    }
  }, [sorted, pick, words]);

  const selected = pick ? words[pick] : null;

  function downloadExport() {
    const blob = new Blob([exportText()], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `lexy-lexicon-${new Date().toISOString().slice(0, 10)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function downloadJson() {
    const blob = new Blob([exportLexiconJson()], { type: "application/json;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `lexy-lexicon-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="mx-auto max-w-4xl space-y-10 lg:max-w-7xl xl:max-w-[84rem]">
      <div>
        <h1 className="font-serif text-3xl font-bold text-[#1C1917]">My Lexy</h1>
        <p className="mt-2 font-serif text-sm italic leading-relaxed text-[#8B7355]">
          Your personal library — every word rated, none forgotten. This is where Lexy compounds.
        </p>
        <p className="mt-3 text-xs leading-relaxed text-[#6A6360]">
          Your lexicon is <strong className="font-medium text-[#4A4340]">saved automatically on this device</strong>.{" "}
          <strong className="font-medium text-[#4A4340]">Sign in</strong> to keep it in sync across your phone and
          laptop. You can always download a .txt or .json backup below.
        </p>
      </div>

      {sorted.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[#EDE8E0] bg-white/80 px-8 py-20 text-center">
          <p className="font-serif text-xl text-[#B0A898]">Your lexicon is empty.</p>
          <p className="mt-3 text-sm leading-relaxed text-[#C8C0B8]">
            The words you love are waiting to be found — try naming a feeling, a morning scribble, a deep dive, or today&apos;s metaphor.
          </p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-2 sm:gap-3">
            <div className="rounded-2xl border border-[#EDE8E0] bg-white px-2 py-4 text-center sm:px-4 sm:py-5">
              <p className="font-serif text-2xl font-bold tabular-nums text-[#1C1917] sm:text-3xl">{total}</p>
              <p className="mt-1 text-[9px] font-semibold uppercase tracking-[0.1em] text-[#B0A898] sm:text-[10px]">
                Kept
              </p>
            </div>
            <div className="rounded-2xl border border-[#EDE8E0] bg-white px-2 py-4 text-center sm:px-4 sm:py-5">
              <p className="font-serif text-2xl font-bold tabular-nums text-[#1C7A40] sm:text-3xl">{favourites.length}</p>
              <p className="mt-1 text-[9px] font-semibold uppercase tracking-[0.1em] text-[#B0A898] sm:text-[10px]">
                Favourites
              </p>
            </div>
            <div className="rounded-2xl border border-[#EDE8E0] bg-white px-2 py-4 text-center sm:px-4 sm:py-5">
              <p className="font-serif text-2xl font-bold tabular-nums text-[#1C1917] sm:text-3xl">{avg.toFixed(1)}</p>
              <p className="mt-1 text-[9px] font-semibold uppercase tracking-[0.1em] text-[#B0A898] sm:text-[10px]">
                Avg rating
              </p>
            </div>
          </div>

          {total > 50 && (
            <p className="text-center font-serif text-sm italic text-[#8B7355]">You&apos;re building something rare.</p>
          )}

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={downloadExport}
              className="rounded-full border border-[#8B7355] px-6 py-2.5 text-xs font-semibold uppercase tracking-[0.08em] text-[#8B7355]"
            >
              Download .txt
            </button>
            <button
              type="button"
              onClick={downloadJson}
              className="rounded-full border border-[#8B7355] px-6 py-2.5 text-xs font-semibold uppercase tracking-[0.08em] text-[#8B7355]"
            >
              Download .json backup
            </button>
          </div>

          {favourites.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#1C7A40]">Favourites</h2>
              <div className="divide-y divide-[#F5F0EA] rounded-2xl border border-[#EDE8E0] bg-white lg:grid lg:grid-cols-2 lg:gap-4 lg:divide-y-0 lg:rounded-none lg:border-0 lg:bg-transparent">
                {favourites.map((w) => (
                  <WordRow key={w.word} w={w} onRemove={() => removeWord(w.word)} />
                ))}
              </div>
            </section>
          )}

          {rest.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#B0A898]">Kept words</h2>
              <div className="divide-y divide-[#F5F0EA] rounded-2xl border border-[#EDE8E0] bg-white lg:grid lg:grid-cols-2 lg:gap-4 lg:divide-y-0 lg:rounded-none lg:border-0 lg:bg-transparent">
                {rest.map((w) => (
                  <WordRow key={w.word} w={w} onRemove={() => removeWord(w.word)} />
                ))}
              </div>
            </section>
          )}

          <section className="rounded-2xl border border-[#EDE8E0] bg-[#F9F6F0] p-6">
            <h2 className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#8B7355]">Re-rate a word</h2>
            <p className="mt-1 text-xs text-[#B0A898]">Tastes shift. Your lexicon can shift with them.</p>
            <div className="mt-4 flex flex-col gap-4 md:flex-row md:items-end">
              <div className="flex-1">
                <label className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#B0A898]">Word</label>
                <select
                  className="mt-1 w-full rounded-xl border border-[#EDE8E0] bg-white px-3 py-2.5 text-sm"
                  value={pick ?? ""}
                  onChange={(e) => setPick(e.target.value)}
                >
                  {sorted.map((w) => (
                    <option key={w.word} value={w.word.toLowerCase()}>
                      {w.word} · {w.rating.toFixed(1)}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex-[2]">
                <RateBar
                  key={pick ?? ""}
                  value={selected ? selected.rating : null}
                  onCommit={(v) => selected && updateRating(selected.word, v)}
                  label="New rating"
                />
              </div>
              <button
                type="button"
                disabled={!selected}
                onClick={() => {
                  if (!selected) return;
                  if (
                    typeof window !== "undefined" &&
                    !window.confirm(`Remove “${selected.word}” from your lexicon?`)
                  )
                    return;
                  removeWord(selected.word);
                }}
                className="rounded-full border border-red-200 bg-white px-6 py-3 text-sm font-semibold text-red-800 transition hover:bg-red-50 disabled:opacity-40"
              >
                Delete word
              </button>
            </div>
          </section>

          <details className="group rounded-2xl border border-[#EDE8E0] bg-white">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-5 py-4 text-sm font-medium text-[#4A4340] [&::-webkit-details-marker]:hidden">
              <span>
                All {sorted.length} words you&apos;ve rated
                {notForMe.length > 0 && <span className="text-[#B0A898]"> · {notForMe.length} not for you</span>}
              </span>
              <span className="text-[#8B7355] transition group-open:rotate-180" aria-hidden>
                ▾
              </span>
            </summary>
            <p className="px-5 text-xs leading-relaxed text-[#B0A898]">
              Every rating stays on record — it&apos;s how Lexy learns your taste. Words under {NOT_FOR_ME_BELOW} live
              only here, out of your lists and reviews.
            </p>
            <ul className="mt-3 divide-y divide-[#F5F0EA] border-t border-[#F5F0EA]">
              {sorted.map((w) => {
                const low = w.rating < NOT_FOR_ME_BELOW;
                return (
                  <li key={w.word}>
                    <Link
                      href={`/dive?word=${encodeURIComponent(w.word)}`}
                      className="flex items-center justify-between gap-3 px-5 py-2.5 text-sm transition hover:bg-[#FDFBF7]"
                    >
                      <span className={`min-w-0 truncate font-serif ${low ? "text-[#8A8178]" : "text-[#1C1917]"}`}>
                        {w.word}
                        {low && (
                          <span className="ml-2 font-sans text-[10px] uppercase tracking-[0.1em] text-[#B0A898]">
                            not for me
                          </span>
                        )}
                      </span>
                      <span
                        className={`shrink-0 tabular-nums ${
                          w.rating >= FAVOURITE_THRESHOLD
                            ? "font-semibold text-[#1C7A40]"
                            : low
                              ? "text-[#B0A898]"
                              : "text-[#1C1917]"
                        }`}
                      >
                        {w.rating.toFixed(1)}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </details>
        </>
      )}
    </div>
  );
}

function WordRow({ w, onRemove }: { w: LexiconWord; onRemove: () => void }) {
  const fav = w.rating >= FAVOURITE_THRESHOLD;
  const href = `/dive?word=${encodeURIComponent(w.word)}`;

  function handleRemove(e: MouseEvent<HTMLButtonElement>) {
    e.preventDefault();
    if (typeof window !== "undefined" && !window.confirm(`Remove “${w.word}” from your lexicon?`)) return;
    onRemove();
  }

  return (
    <div className="flex flex-col gap-3 px-5 py-4 md:flex-row md:items-start md:gap-6 lg:rounded-2xl lg:border lg:border-[#EDE8E0] lg:bg-white lg:p-5 lg:shadow-sm lg:transition lg:hover:border-[#8B7355]/40 lg:hover:shadow-md">
      <Link
        href={href}
        className="min-w-0 flex-1 rounded-xl outline-none ring-[#8B7355]/0 transition hover:bg-[#FDFBF7] focus-visible:ring-4 md:flex md:gap-6 lg:hover:bg-transparent"
      >
        <div className="min-w-[140px] md:min-w-[160px]">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-serif text-lg font-bold text-[#1C1917]">{w.word}</span>
            {w.level != null && <VocabLevelBadge level={w.level} compact />}
          </div>
          <IPA className="mt-0.5 block text-xs">{w.pronunciation}</IPA>
          <p className="mt-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#8B7355]">
            Open full page →
          </p>
        </div>
        <div className="mt-3 min-w-0 flex-1 md:mt-0">
          <p className="line-clamp-3 text-sm leading-relaxed text-[#6A6360]">{w.definition}</p>
          {w.user_sentence && (
            <p className="mt-2 line-clamp-2 border-l-2 border-[#EDE8E0] pl-3 font-serif text-sm italic leading-relaxed text-[#8B7355]">
              &ldquo;{w.user_sentence}&rdquo;
            </p>
          )}
        </div>
      </Link>
      <div className="flex shrink-0 flex-row items-center gap-3 md:flex-col md:items-end">
        <span
          className={`text-sm font-semibold tabular-nums ${fav ? "text-[#1C7A40]" : "text-[#1C1917]"}`}
        >
          {w.rating.toFixed(1)}
        </span>
        <button
          type="button"
          onClick={handleRemove}
          className="rounded-full border border-[#EDE8E0] px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-[#6A6360] transition hover:border-red-200 hover:text-red-800"
        >
          Delete
        </button>
      </div>
    </div>
  );
}
