"use client";

import { IPA } from "@/components/IPA";
import { RatingDial } from "@/components/RatingDial";
import { useLexicon } from "@/lib/store";
import type { LexiconWord } from "@/lib/types";
import { FAVOURITE_THRESHOLD } from "@/lib/lexyCopy";
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

  const favourites = sorted.filter((w) => w.rating >= FAVOURITE_THRESHOLD);
  const rest = sorted.filter((w) => w.rating < FAVOURITE_THRESHOLD);

  const total = sorted.length;
  const avg = total ? sorted.reduce((a, w) => a + w.rating, 0) / total : 0;

  const [pick, setPick] = useState<string | null>(null);
  const [editRating, setEditRating] = useState(5);

  useEffect(() => {
    if (sorted.length === 0) {
      setPick(null);
      return;
    }
    if (!pick || !words[pick]) {
      const k = sorted[0].word.toLowerCase();
      setPick(k);
      setEditRating(sorted[0].rating);
    }
  }, [sorted, pick, words]);

  useEffect(() => {
    if (pick && words[pick]) setEditRating(words[pick].rating);
  }, [pick, words]);

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
          Your lexicon is <strong className="font-medium text-[#4A4340]">saved automatically in this browser</strong>{" "}
          (same device &amp; browser). After you add Clerk and a database URL in{" "}
          <code className="rounded bg-[#F5F0EA] px-1 py-0.5 text-[11px]">.env.local</code>, use{" "}
          <strong className="font-medium text-[#4A4340]">Sign in</strong> in the nav to sync it to your account. You
          can always download a .txt or .json backup below — keep a copy somewhere safe.
        </p>
      </div>

      {total === 0 ? (
        <div className="rounded-2xl border border-dashed border-[#EDE8E0] bg-white/80 px-8 py-20 text-center">
          <p className="font-serif text-xl text-[#B0A898]">Your lexicon is empty.</p>
          <p className="mt-3 text-sm leading-relaxed text-[#C8C0B8]">
            The words you love are waiting to be found — try a morning scribble, a deep dive, or today&apos;s metaphor.
          </p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-2 sm:gap-3">
            <div className="rounded-2xl border border-[#EDE8E0] bg-white px-2 py-4 text-center sm:px-4 sm:py-5">
              <p className="font-serif text-2xl font-bold tabular-nums text-[#1C1917] sm:text-3xl">{total}</p>
              <p className="mt-1 text-[9px] font-semibold uppercase tracking-[0.1em] text-[#B0A898] sm:text-[10px]">
                Words
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
                Average
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
              <h2 className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#B0A898]">All words</h2>
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
                  onChange={(e) => {
                    const k = e.target.value;
                    setPick(k);
                    const wd = words[k];
                    if (wd) setEditRating(wd.rating);
                  }}
                >
                  {sorted.map((w) => (
                    <option key={w.word} value={w.word.toLowerCase()}>
                      {w.word}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex-1">
                <RatingDial value={editRating} onChange={setEditRating} id="edit-rating" label="New rating" />
              </div>
              <button
                type="button"
                disabled={!selected}
                onClick={() => selected && updateRating(selected.word, editRating)}
                className="rounded-full bg-[#1C1917] px-8 py-3 text-sm font-semibold text-[#F5EFE0] disabled:opacity-40"
              >
                Save
              </button>
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
          <span className="font-serif text-lg font-bold text-[#1C1917]">{w.word}</span>
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
