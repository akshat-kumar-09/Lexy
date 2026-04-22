"use client";

import { AddWordBurst } from "@/components/AddWordBurst";
import { GenreStrip } from "@/components/GenreStrip";
import { IPA } from "@/components/IPA";
import { PronounceButton } from "@/components/PronounceButton";
import { RatingDial } from "@/components/RatingDial";
import { deepDiveWord, generateTasteGrid } from "@/lib/openai";
import { playLexiconChime } from "@/lib/sound";
import { useLexicon, useSettings, useTasteProfile, todayISODate } from "@/lib/store";
import type { DeepDiveResult, TasteGridWord } from "@/lib/types";
import { motion, AnimatePresence } from "framer-motion";
import { useCallback, useEffect, useRef, useState } from "react";

export default function DivePage() {
  const apiKey = useSettings((s) => s.openaiApiKey);
  const genreIds = useTasteProfile((s) => s.genreIds);
  const upsertWord = useLexicon((s) => s.upsertWord);

  const [suggestions, setSuggestions] = useState<TasteGridWord[]>([]);
  const [gridLoading, setGridLoading] = useState(false);
  const [gridError, setGridError] = useState<string | null>(null);
  const [gridNonce, setGridNonce] = useState(0);

  const lastRatedRef = useRef<{ lastRatedWord: string; lastRating: number } | null>(null);

  const [selectedFromGrid, setSelectedFromGrid] = useState<TasteGridWord | null>(null);
  const [query, setQuery] = useState("");
  const [loadingDive, setLoadingDive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<DeepDiveResult | null>(null);
  const [rating, setRating] = useState(7.5);
  const [burst, setBurst] = useState(false);

  const loadGrid = useCallback(async () => {
    if (!apiKey) {
      setSuggestions([]);
      return;
    }
    setGridLoading(true);
    setGridError(null);
    try {
      const words = useLexicon.getState().words;
      const ctx = lastRatedRef.current ?? undefined;
      lastRatedRef.current = null;
      const g = await generateTasteGrid(apiKey, words, ctx, genreIds);
      setSuggestions(g.suggestions);
    } catch (e) {
      setGridError(e instanceof Error ? e.message : "Could not refresh suggestions");
      setSuggestions([]);
    } finally {
      setGridLoading(false);
    }
  }, [apiKey, genreIds]);

  useEffect(() => {
    if (!apiKey) return;
    void loadGrid();
  }, [apiKey, gridNonce, loadGrid, genreIds]);

  async function openDive(lemma: string, hint?: TasteGridWord | null) {
    if (!apiKey) {
      setError("Add your OpenAI API key in Settings.");
      return;
    }
    setLoadingDive(true);
    setError(null);
    setResult(null);
    if (hint) setSelectedFromGrid(hint);
    else setSelectedFromGrid(null);
    try {
      const r = await deepDiveWord(apiKey, lemma);
      setResult(r);
      setRating(7.5);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not dive into that word");
    } finally {
      setLoadingDive(false);
    }
  }

  async function runCustom() {
    const q = query.trim();
    if (!q) return;
    setSelectedFromGrid(null);
    await openDive(q);
  }

  function addToLexicon() {
    if (!result) return;
    const ex = result.example_sentences?.[0] ?? "";
    upsertWord({
      word: result.word,
      pronunciation: result.pronunciation,
      part_of_speech: result.part_of_speech,
      definition: result.definition,
      example: ex,
      origin: result.origin,
      rating,
      added: todayISODate(),
      source: "deep_dive",
    });
    lastRatedRef.current = { lastRatedWord: result.word, lastRating: rating };
    playLexiconChime();
    setBurst(true);
    setTimeout(() => setBurst(false), 700);
    setResult(null);
    setQuery("");
    setSelectedFromGrid(null);
    setGridNonce((n) => n + 1);
  }

  function refreshGridManual() {
    lastRatedRef.current = null;
    setGridNonce((n) => n + 1);
  }

  return (
    <div className="mx-auto max-w-3xl space-y-10 pb-8">
      <div>
        <h1 className="font-serif text-2xl font-bold text-[#1C1917] sm:text-3xl">Word Deep Dive</h1>
        <p className="mt-2 font-serif text-sm italic leading-relaxed text-[#8B7355]">
          Twenty-five words picked for your taste — the set turns over each time you rate one, and Lexy leans into what
          you love. Tap a word for the full story; IPA is always in the room.
        </p>
      </div>

      <GenreStrip compact />

      {!apiKey && (
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Add your OpenAI API key in Settings to load your taste grid and dive into words.
        </p>
      )}

      <section className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#B0A898]">Words for your taste</h2>
            <p className="mt-1 text-xs text-[#8B7355]">25 at a time — they refresh when you rate, so Lexy learns.</p>
          </div>
          <button
            type="button"
            disabled={!apiKey || gridLoading}
            onClick={refreshGridManual}
            className="rounded-full border border-[#EDE8E0] px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.1em] text-[#6A6360] hover:border-[#8B7355] disabled:opacity-40"
          >
            New batch
          </button>
        </div>

        {gridError && (
          <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{gridError}</p>
        )}

        {gridLoading && suggestions.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[#EDE8E0] bg-white/60 px-6 py-16 text-center font-serif text-sm italic text-[#B0A898]">
            Curating 25 words that fit the shape of your mind…
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {suggestions.map((s) => (
              <button
                key={`${s.word}-${s.pronunciation}`}
                type="button"
                onClick={() => void openDive(s.word, s)}
                className="rounded-2xl border border-[#EDE8E0] bg-white p-4 text-left shadow-sm transition active:border-[#8B7355]/50 active:bg-[#FDFBF7] sm:hover:border-[#8B7355]/50 sm:hover:shadow-md"
              >
                <span className="font-serif text-lg font-bold leading-snug text-[#1C1917]">{s.word}</span>
                <IPA className="mt-1 block text-xs">{s.pronunciation}</IPA>
                <p className="mt-2 text-[10px] font-semibold uppercase tracking-[0.08em] text-[#B0A898]">
                  {s.part_of_speech}
                </p>
                <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-[#6A6360]">{s.definition}</p>
                <p className="mt-3 line-clamp-2 text-[11px] italic leading-snug text-[#8B7355]">{s.why_for_you}</p>
              </button>
            ))}
          </div>
        )}

        {gridLoading && suggestions.length > 0 && (
          <p className="text-center text-xs italic text-[#B0A898]">Refreshing your words…</p>
        )}
      </section>

      <AnimatePresence mode="wait">
        {(loadingDive || result) && (
          <motion.section
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="space-y-5 border-t border-[#EDE8E0] pt-8"
          >
            {loadingDive && (
              <p className="font-serif text-sm italic text-[#8B7355]">Opening the page on this word…</p>
            )}

            {selectedFromGrid && !loadingDive && result && (
              <p className="text-xs text-[#B0A898]">
                From your grid: <span className="font-medium text-[#1C1917]">{selectedFromGrid.word}</span>
              </p>
            )}

            {result && !loadingDive && (
              <div className="relative space-y-5">
                <div className="relative overflow-hidden rounded-2xl border border-[#EDE8E0] bg-white p-6 shadow-sm">
                  <AddWordBurst show={burst} />
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="break-words font-serif text-2xl font-bold text-[#1C1917] sm:text-3xl">{result.word}</h2>
                    <PronounceButton word={result.word} />
                  </div>
                  <IPA className="mt-2 block">{result.pronunciation}</IPA>
                  <p className="mt-3 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#B0A898]">
                    {result.part_of_speech}
                  </p>
                  <p className="mt-4 text-sm leading-relaxed text-[#4A4340]">{result.definition}</p>
                  <div className="mt-5 rounded-xl bg-[#F5EFE0] p-4">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#8B7355]">The nuance</p>
                    <p className="mt-2 text-sm leading-relaxed text-[#4A4340]">{result.nuance}</p>
                  </div>
                </div>

                <div className="rounded-2xl border border-[#EDE8E0] bg-white p-6">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#B0A898]">In three sentences</p>
                  <div className="mt-3 space-y-3">
                    {result.example_sentences.map((ex, i) => (
                      <p key={i} className="border-l-2 border-[#EDE8E0] pl-3 font-serif text-sm italic text-[#8B7355]">
                        &ldquo;{ex}&rdquo;
                      </p>
                    ))}
                  </div>
                </div>

                <div className="rounded-2xl border border-[#EDE8E0] bg-white p-6">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#B0A898]">Etymology</p>
                  <p className="mt-2 text-sm leading-relaxed text-[#4A4340]">{result.origin}</p>
                  <div className="mt-6 border-t border-[#F5F0EA] pt-6">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#B0A898]">
                      Where you might have met it
                    </p>
                    <p className="mt-2 text-sm leading-relaxed text-[#4A4340]">{result.used_by}</p>
                  </div>
                </div>

                {(result.related_words ?? []).length > 0 && (
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#B0A898]">Kindred words</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {result.related_words.map((rw) => (
                        <span
                          key={rw}
                          className="rounded-full bg-[#F5EFE0] px-3 py-1 font-serif text-sm italic text-[#8B7355]"
                        >
                          {rw}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <div className="rounded-2xl border border-[#EDE8E0] bg-white p-6">
                  <RatingDial value={rating} onChange={setRating} label="How much do you want to keep it?" />
                  <button
                    type="button"
                    onClick={addToLexicon}
                    className="mt-5 w-full rounded-full bg-[#1C1917] py-3.5 text-sm font-semibold text-[#F5EFE0]"
                  >
                    Rate & add to lexicon
                  </button>
                  <p className="mt-3 text-center text-[11px] italic text-[#B0A898]">
                    Adding refreshes your 25-word grid so Lexy can learn your taste.
                  </p>
                </div>
              </div>
            )}
          </motion.section>
        )}
      </AnimatePresence>

      {error && (
        <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p>
      )}

      <section className="space-y-4 border-t border-[#EDE8E0] pt-10">
        <h2 className="font-serif text-xl font-bold text-[#1C1917]">Or type any word</h2>
        <p className="text-sm leading-relaxed text-[#6A6360]">
          The grid is your compass — but if a word is already on your mind, invite it in.
        </p>
        <div className="flex flex-col gap-3 sm:flex-row">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && void runCustom()}
            placeholder="liminal, sonder, petrichor…"
            className="flex-1 rounded-2xl border border-[#EDE8E0] bg-white px-4 py-3.5 text-sm outline-none ring-[#8B7355]/15 focus:border-[#8B7355] focus:ring-4"
          />
          <button
            type="button"
            disabled={loadingDive || !query.trim()}
            onClick={() => void runCustom()}
            className="rounded-2xl bg-[#1C1917] px-8 py-3.5 text-sm font-semibold text-[#F5EFE0] disabled:opacity-40"
          >
            {loadingDive ? "Diving…" : "Deep dive"}
          </button>
        </div>
      </section>
    </div>
  );
}
