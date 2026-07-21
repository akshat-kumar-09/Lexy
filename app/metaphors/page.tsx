"use client";

import { AddWordBurst } from "@/components/AddWordBurst";
import { GenreStrip } from "@/components/GenreStrip";
import { QuickRate } from "@/components/QuickRate";
import { RatingDial } from "@/components/RatingDial";
import { SentenceCapture } from "@/components/SentenceCapture";
import { generateMetaphorGrid } from "@/lib/claude";
import { playLexiconChime } from "@/lib/sound";
import { useLexicon, useTasteProfile, todayISODate } from "@/lib/store";
import type { MetaphorGridItem } from "@/lib/types";
import { motion, AnimatePresence } from "framer-motion";
import { FAVOURITE_THRESHOLD } from "@/lib/lexyCopy";
import { useBodyScrollLock } from "@/hooks/useBodyScrollLock";
import { useEffect, useMemo, useState } from "react";

export default function MetaphorsPage() {
  const explorationThreads = useTasteProfile((s) => s.threads);
  const metaphor_history = useLexicon((s) => s.metaphor_history);
  const appendMetaphor = useLexicon((s) => s.appendMetaphor);
  const upsertWord = useLexicon((s) => s.upsertWord);

  const today = todayISODate();
  const todays = useMemo(
    () => metaphor_history.find((h) => h.date === today) ?? null,
    [metaphor_history, today]
  );

  const [gridNonce, setGridNonce] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<MetaphorGridItem | null>(null);
  const [rating, setRating] = useState(8);
  const [userSentence, setUserSentence] = useState("");
  const [burst, setBurst] = useState(false);

  useEffect(() => {
    const existing = useLexicon.getState().metaphor_history.find((h) => h.date === today);
    if (gridNonce === 0 && existing && existing.suggestions.length >= 12) {
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);
    setSelected(null);

    (async () => {
      try {
        const w = useLexicon.getState().words;
        const fromLex = Object.values(w)
          .filter((x) => x.source === "metaphor")
          .map((x) => x.word);
        const cur = useLexicon.getState().metaphor_history.find((h) => h.date === today);
        const fromToday = cur?.suggestions.map((s) => s.metaphor) ?? [];
        const exclude = [...new Set([...fromLex, ...fromToday])];

        let accumulated: MetaphorGridItem[] = [];
        const g = await generateMetaphorGrid(w, explorationThreads, exclude, (batch) => {
          if (cancelled) return;
          accumulated = [...accumulated, ...batch];
          appendMetaphor({ date: today, suggestions: accumulated });
        });
        if (cancelled) return;
        appendMetaphor({ date: today, suggestions: g.suggestions });
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Could not load metaphors");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [today, gridNonce, explorationThreads, appendMetaphor]);

  function refreshGrid() {
    setGridNonce((n) => n + 1);
  }

  function openDetail(m: MetaphorGridItem) {
    setSelected(m);
    const saved = useLexicon.getState().words[m.metaphor.toLowerCase()];
    setRating(saved?.rating ?? 8);
    setUserSentence(saved?.user_sentence ?? "");
  }

  function addToLexicon(m: MetaphorGridItem, overrideRating?: number) {
    const sentence = userSentence.trim();
    if (!sentence) return;
    const def = [m.unpacking, m.image_strength].filter(Boolean).join("\n\n");
    const examples = m.example_sentences ?? [];
    upsertWord({
      word: m.metaphor,
      pronunciation: "—",
      part_of_speech: "metaphor",
      definition: def || m.unpacking,
      example: examples[0] ?? "",
      origin: m.image_strength ?? "—",
      rating: overrideRating ?? rating,
      added: today,
      source: "metaphor",
      user_sentence: sentence,
    });
    playLexiconChime();
    setBurst(true);
    setTimeout(() => setBurst(false), 700);
    setSelected(null);
    setUserSentence("");
  }

  const list = todays?.suggestions ?? [];

  function closeMetaphorDetail() {
    setSelected(null);
    setUserSentence("");
  }

  const metaphorDetailOpen = Boolean(selected);
  useBodyScrollLock(metaphorDetailOpen);

  return (
    <div className="mx-auto max-w-4xl space-y-8 pb-8 lg:max-w-6xl xl:max-w-7xl">
      <div>
        <h1 className="font-serif text-2xl font-bold text-[#1C1917] sm:text-3xl">Metaphors</h1>
        <p className="mt-2 font-serif text-sm italic leading-relaxed text-[#8B7355]">
          Twelve images at a time — like Deep Dive&apos;s grid, but metaphor. Tap one to open it fully, rate it, save it.
          <span className="font-semibold not-italic text-[#6A6360]"> {FAVOURITE_THRESHOLD}+</span> lands in favourites.
        </p>
      </div>

      <GenreStrip compact />

      {error && (
        <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p>
      )}

      <section className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#B0A898]">Today&apos;s images</h2>
            <p className="mt-1 text-xs text-[#8B7355]">Twelve fresh metaphors — new batch replaces today&apos;s set.</p>
          </div>
          <button
            type="button"
            disabled={loading}
            onClick={refreshGrid}
            className={`rounded-full border border-[#EDE8E0] px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.1em] text-[#6A6360] hover:border-[#8B7355] disabled:opacity-70 ${loading ? "lexy-chase" : ""}`}
          >
            {loading ? "Gathering…" : "New batch"}
          </button>
        </div>

        {loading && list.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[#EDE8E0] bg-white/60 px-6 py-16 text-center font-serif text-sm italic text-[#B0A898]">
            Gathering twelve metaphors that fit you…
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {list.map((m, idx) => (
              <button
                key={`${m.metaphor}-${idx}`}
                type="button"
                onClick={() => openDetail(m)}
                className="rounded-2xl border border-[#EDE8E0] bg-white p-4 text-left shadow-sm transition active:border-[#8B7355]/50 active:bg-[#FDFBF7] sm:hover:border-[#8B7355]/45 sm:hover:shadow-md"
              >
                <span className="font-serif text-base font-bold leading-snug text-[#1C1917]">{m.metaphor}</span>
                <p className="mt-2 line-clamp-3 text-xs leading-relaxed text-[#6A6360]">{m.unpacking}</p>
                <p className="mt-2 text-[10px] font-semibold uppercase tracking-[0.08em] text-[#8B7355]">Open →</p>
              </button>
            ))}
          </div>
        )}

        {loading && list.length > 0 && (
          <p className="text-center text-xs italic text-[#B0A898]">Refreshing your ten…</p>
        )}
      </section>

      <AnimatePresence>
        {selected && (
          <>
            <motion.div
              key="metaphor-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-[100] bg-[#1C1917]/35 backdrop-blur-[2px]"
              onClick={closeMetaphorDetail}
              aria-hidden
            />
            <div
              className="fixed inset-0 z-[110] flex items-end justify-center sm:items-center sm:p-4"
              onClick={closeMetaphorDetail}
            >
              <motion.section
                key="metaphor-panel"
                initial={{ opacity: 0, scale: 0.95, y: 24 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96, y: 16 }}
                transition={{ type: "spring", stiffness: 460, damping: 34 }}
                onClick={(e) => e.stopPropagation()}
                className="max-h-[min(92dvh,calc(100dvh-3.5rem))] w-full max-w-2xl space-y-5 overflow-y-auto overflow-x-hidden rounded-t-2xl border border-b-0 border-[#EDE8E0] bg-[#FEFCF8] px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 shadow-[0_-12px_40px_rgba(0,0,0,0.14)] sm:rounded-2xl sm:border-b sm:p-6 sm:shadow-2xl"
                role="dialog"
                aria-modal="true"
                aria-label={`Metaphor: ${selected.metaphor}`}
              >
              <div className="relative flex h-11 shrink-0 items-center border-b border-[#F5F0EA] sm:h-auto sm:border-b-0">
                <div className="pointer-events-none absolute inset-x-0 flex justify-center pt-2 sm:hidden">
                  <div className="h-1 w-10 rounded-full bg-[#D4CCC0]" aria-hidden />
                </div>
                <button
                  type="button"
                  onClick={closeMetaphorDetail}
                  className="relative z-10 ml-auto min-h-10 shrink-0 rounded-full px-3 text-xs font-semibold uppercase tracking-[0.1em] text-[#8B7355] active:bg-[#F5EFE0] sm:hover:bg-[#F5EFE0]"
                >
                  Close
                </button>
              </div>

            <div className="relative overflow-hidden rounded-[1.35rem] bg-[#1C1917] px-4 py-8 shadow-xl sm:px-6 sm:py-10">
              <AddWordBurst show={burst} />
              <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#8B7355]">Chosen image</p>
              <h2 className="mt-3 break-words font-serif text-xl font-bold leading-[1.15] text-[#F5EFE0] sm:text-2xl md:text-3xl">
                {selected.metaphor}
              </h2>
              <p className="mt-5 max-w-prose text-sm leading-relaxed text-[#C8BFB0] sm:text-base">{selected.unpacking}</p>
              {selected.image_strength && (
                <div className="mt-5 rounded-xl bg-[#252220] p-4">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#8B7355]">Why it lands</p>
                  <p className="mt-2 text-sm leading-relaxed text-[#E8DFD0]">{selected.image_strength}</p>
                </div>
              )}
              <div className="mt-6 space-y-3 border-t border-[#2A2520] pt-6">
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#8B7355]">In three lights</p>
                {(selected.example_sentences ?? []).map((ex, i) => (
                  <p key={i} className="font-serif text-sm italic leading-relaxed text-[#E8DFD0]">
                    &ldquo;{ex}&rdquo;
                  </p>
                ))}
              </div>
              {selected.why_for_you && (
                <p className="mt-5 text-sm italic leading-relaxed text-[#A8A098]">{selected.why_for_you}</p>
              )}
            </div>

            <div className="space-y-5 rounded-2xl border border-[#EDE8E0] bg-white p-6">
              <SentenceCapture word={selected.metaphor} value={userSentence} onChange={setUserSentence} />
              <div className="border-t border-[#F5F0EA] pt-5">
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#B0A898]">Quick rate</p>
                <div className="mt-2">
                  <QuickRate onPick={(v) => addToLexicon(selected, v)} disabled={!userSentence.trim()} />
                </div>
              </div>
              <div className="border-t border-[#F5F0EA] pt-5">
                <RatingDial value={rating} onChange={setRating} label="Or fine-tune, then add" />
                <button
                  type="button"
                  onClick={() => addToLexicon(selected)}
                  disabled={!userSentence.trim()}
                  className="mt-4 w-full rounded-full bg-[#1C1917] py-3.5 text-sm font-semibold text-[#F5EFE0] disabled:opacity-40"
                >
                  Add to my lexicon
                </button>
              </div>
              <p className="text-center text-[11px] text-[#B0A898]">
                {FAVOURITE_THRESHOLD}+ shows as a favourite on My Lexy.
              </p>
              <button
                type="button"
                onClick={closeMetaphorDetail}
                className="w-full rounded-full border border-[#EDE8E0] py-2.5 text-sm text-[#6A6360] hover:border-[#8B7355]/40"
              >
                Back to grid
              </button>
            </div>
              </motion.section>
            </div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
