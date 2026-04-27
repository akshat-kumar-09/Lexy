"use client";

import { AddWordBurst } from "@/components/AddWordBurst";
import { GenreStrip } from "@/components/GenreStrip";
import { RatingDial } from "@/components/RatingDial";
import { generateMetaphorGrid } from "@/lib/openai";
import { playLexiconChime } from "@/lib/sound";
import { useLexicon, useSettings, useTasteProfile, todayISODate } from "@/lib/store";
import type { MetaphorGridItem } from "@/lib/types";
import { motion, AnimatePresence } from "framer-motion";
import { FAVOURITE_THRESHOLD, tasteRatingsLine } from "@/lib/lexyCopy";
import { useBodyScrollLock } from "@/hooks/useBodyScrollLock";
import { useEffect, useMemo, useState } from "react";

export default function MetaphorsPage() {
  const apiKey = useSettings((s) => s.openaiApiKey);
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
  const [burst, setBurst] = useState(false);

  useEffect(() => {
    if (!apiKey) return;

    const existing = useLexicon.getState().metaphor_history.find((h) => h.date === today);
    if (gridNonce === 0 && existing && existing.suggestions.length >= 10) {
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

        const g = await generateMetaphorGrid(apiKey, w, explorationThreads, exclude);
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
  }, [apiKey, today, gridNonce, explorationThreads, appendMetaphor]);

  function refreshGrid() {
    setGridNonce((n) => n + 1);
  }

  function openDetail(m: MetaphorGridItem) {
    setSelected(m);
    setRating(8);
  }

  function addToLexicon(m: MetaphorGridItem) {
    const def = [m.unpacking, m.image_strength].filter(Boolean).join("\n\n");
    const examples = m.example_sentences ?? [];
    upsertWord({
      word: m.metaphor,
      pronunciation: "—",
      part_of_speech: "metaphor",
      definition: def || m.unpacking,
      example: examples[0] ?? "",
      origin: m.image_strength ?? "—",
      rating,
      added: today,
      source: "metaphor",
    });
    playLexiconChime();
    setBurst(true);
    setTimeout(() => setBurst(false), 700);
    setSelected(null);
  }

  const list = todays?.suggestions ?? [];

  function closeMetaphorDetail() {
    setSelected(null);
  }

  const metaphorDetailOpen = Boolean(selected);
  useBodyScrollLock(metaphorDetailOpen);

  return (
    <div className="mx-auto max-w-3xl space-y-8 pb-8">
      <div>
        <h1 className="font-serif text-2xl font-bold text-[#1C1917] sm:text-3xl">Metaphors</h1>
        <p className="mt-2 font-serif text-sm italic leading-relaxed text-[#8B7355]">
          Ten images at a time — like Deep Dive&apos;s grid, but metaphor. Tap one to open it fully, rate it, save it.
          <span className="font-semibold not-italic text-[#6A6360]"> {FAVOURITE_THRESHOLD}+</span> lands in favourites.
        </p>
      </div>

      <GenreStrip compact />

      {!apiKey && (
        <div className="space-y-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <p>Add your OpenAI API key in Settings to load metaphors.</p>
          <p className="text-xs leading-relaxed text-amber-950/90">{tasteRatingsLine()}</p>
        </div>
      )}

      {error && (
        <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p>
      )}

      {apiKey && (
        <section className="space-y-4">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#B0A898]">Today&apos;s images</h2>
              <p className="mt-1 text-xs text-[#8B7355]">Ten fresh metaphors — new batch replaces today&apos;s set.</p>
            </div>
            <button
              type="button"
              disabled={loading}
              onClick={refreshGrid}
              className="rounded-full border border-[#EDE8E0] px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.1em] text-[#6A6360] hover:border-[#8B7355] disabled:opacity-40"
            >
              New batch
            </button>
          </div>

          {loading && list.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[#EDE8E0] bg-white/60 px-6 py-16 text-center font-serif text-sm italic text-[#B0A898]">
              Gathering ten metaphors that fit you…
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
      )}

      <AnimatePresence>
        {selected && (
          <>
            <motion.div
              key="metaphor-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-[100] bg-[#1C1917]/35 backdrop-blur-[2px] md:hidden"
              onClick={closeMetaphorDetail}
              aria-hidden
            />
            <motion.section
              key="metaphor-panel"
              initial={{ opacity: 0, y: 28 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              transition={{ type: "spring", stiffness: 420, damping: 34 }}
              className="space-y-5 border-[#EDE8E0] max-md:fixed max-md:inset-x-0 max-md:bottom-0 max-md:z-[110] max-md:max-h-[min(92dvh,calc(100dvh-3.5rem))] max-md:overflow-y-auto max-md:overflow-x-hidden max-md:rounded-t-2xl max-md:border max-md:border-b-0 max-md:bg-[#FEFCF8] max-md:px-4 max-md:pb-[max(1rem,env(safe-area-inset-bottom))] max-md:pt-3 max-md:shadow-[0_-12px_40px_rgba(0,0,0,0.14)] md:relative md:border-t md:pt-8"
              role="dialog"
              aria-modal="true"
              aria-label={`Metaphor: ${selected.metaphor}`}
            >
              <div className="relative flex h-11 shrink-0 items-center border-b border-[#F5F0EA] md:hidden">
                <div className="pointer-events-none absolute inset-x-0 flex justify-center pt-2">
                  <div className="h-1 w-10 rounded-full bg-[#D4CCC0]" aria-hidden />
                </div>
                <button
                  type="button"
                  onClick={closeMetaphorDetail}
                  className="relative z-10 ml-auto min-h-10 shrink-0 rounded-full px-3 text-xs font-semibold uppercase tracking-[0.1em] text-[#8B7355] active:bg-[#F5EFE0]"
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

            <div className="rounded-2xl border border-[#EDE8E0] bg-white p-6">
              <RatingDial value={rating} onChange={setRating} label="How does it land?" />
              <button
                type="button"
                onClick={() => addToLexicon(selected)}
                className="mt-5 w-full rounded-full bg-[#1C1917] py-3.5 text-sm font-semibold text-[#F5EFE0]"
              >
                Add to my lexicon
              </button>
              <p className="mt-3 text-center text-[11px] text-[#B0A898]">
                {FAVOURITE_THRESHOLD}+ shows as a favourite on My Lexy.
              </p>
              <button
                type="button"
                onClick={closeMetaphorDetail}
                className="mt-4 w-full rounded-full border border-[#EDE8E0] py-2.5 text-sm text-[#6A6360] hover:border-[#8B7355]/40 md:mt-4"
              >
                Back to grid
              </button>
            </div>
            </motion.section>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
