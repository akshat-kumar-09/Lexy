"use client";

import { AddWordBurst } from "@/components/AddWordBurst";
import { GenreStrip } from "@/components/GenreStrip";
import { IPA } from "@/components/IPA";
import { PronounceButton } from "@/components/PronounceButton";
import { RatingDial } from "@/components/RatingDial";
import { deepDiveWord, generateTasteGrid } from "@/lib/claude";
import { playLexiconChime } from "@/lib/sound";
import { useLexicon, useTasteProfile, todayISODate } from "@/lib/store";
import type { DeepDiveResult, TasteGridWord } from "@/lib/types";
import { motion, AnimatePresence } from "framer-motion";
import { useBodyScrollLock } from "@/hooks/useBodyScrollLock";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useRef, useState } from "react";

function DivePageContent() {
  const explorationThreads = useTasteProfile((s) => s.threads);
  const upsertWord = useLexicon((s) => s.upsertWord);

  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const wordFromUrl = searchParams.get("word");

  const openedUrlLemmaRef = useRef<string | null>(null);

  const [suggestions, setSuggestions] = useState<TasteGridWord[]>([]);
  const [gridLoading, setGridLoading] = useState(false);
  const [gridError, setGridError] = useState<string | null>(null);
  const [gridNonce, setGridNonce] = useState(0);

  const lastRatedRef = useRef<{ lastRatedWord: string; lastRating: number } | null>(null);

  const [selectedFromGrid, setSelectedFromGrid] = useState<TasteGridWord | null>(null);
  const [query, setQuery] = useState("");
  const [loadingDive, setLoadingDive] = useState(false);
  const [extrasPending, setExtrasPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<DeepDiveResult | null>(null);
  const [rating, setRating] = useState(7.5);
  const [burst, setBurst] = useState(false);

  const loadGrid = useCallback(async () => {
    setGridLoading(true);
    setGridError(null);
    setSuggestions([]);
    try {
      const words = useLexicon.getState().words;
      const ctx = lastRatedRef.current ?? undefined;
      lastRatedRef.current = null;
      const g = await generateTasteGrid(words, ctx, explorationThreads, (batch) => {
        setSuggestions((prev) => [...prev, ...batch]);
      });
      setSuggestions(g.suggestions);
    } catch (e) {
      setGridError(e instanceof Error ? e.message : "Could not refresh suggestions");
      setSuggestions([]);
    } finally {
      setGridLoading(false);
    }
  }, [explorationThreads]);

  useEffect(() => {
    void loadGrid();
  }, [gridNonce, loadGrid, explorationThreads]);

  const openDive = useCallback(async (lemma: string, hint?: TasteGridWord | null) => {
    const trimmed = lemma.trim();
    if (!trimmed) return;

    setError(null);
    setLoadingDive(true);
    setExtrasPending(false);
    setResult(null);
    if (hint) setSelectedFromGrid(hint);
    else setSelectedFromGrid(null);
    try {
      const r = await deepDiveWord(trimmed, (core) => {
        // Core facts land first — show the word immediately instead of waiting on
        // related words/etymology too.
        setResult({ ...core, related_words: [], used_by: "", related_form_definitions: [] });
        setLoadingDive(false);
        setExtrasPending(true);
      });
      setResult(r);
      const saved = useLexicon.getState().words[trimmed.toLowerCase()];
      setRating(saved?.rating ?? 7.5);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not dive into that word");
    } finally {
      setLoadingDive(false);
      setExtrasPending(false);
    }
  }, []);

  useEffect(() => {
    const raw = wordFromUrl?.trim();
    if (!raw) {
      openedUrlLemmaRef.current = null;
      return;
    }
    let lemma = raw;
    try {
      lemma = decodeURIComponent(raw);
    } catch {
      lemma = raw;
    }
    lemma = lemma.trim();
    if (!lemma) return;
    const key = lemma.toLowerCase();
    if (openedUrlLemmaRef.current === key) return;
    openedUrlLemmaRef.current = key;
    void openDive(lemma, null);
  }, [wordFromUrl, openDive]);

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
    openedUrlLemmaRef.current = null;
    if (pathname === "/dive" && searchParams.get("word")) {
      router.replace("/dive", { scroll: false });
    }
    setGridNonce((n) => n + 1);
  }

  function refreshGridManual() {
    lastRatedRef.current = null;
    setGridNonce((n) => n + 1);
  }

  function closeDiveDetail() {
    if (loadingDive) return;
    setResult(null);
    setSelectedFromGrid(null);
    setError(null);
    openedUrlLemmaRef.current = null;
    if (pathname === "/dive" && searchParams.get("word")) {
      router.replace("/dive", { scroll: false });
    }
  }

  const detailOpen = Boolean(loadingDive || result);
  useBodyScrollLock(detailOpen);

  const lexiconWords = useLexicon((s) => s.words);

  const rawRelated = result?.related_form_definitions;
  const relatedForms = (
    Array.isArray(rawRelated) ? rawRelated : []
  ).filter((x) => {
    if (!x?.word?.trim() || !x?.definition?.trim()) return false;
    if (!result) return true;
    return x.word.toLowerCase().trim() !== result.word.toLowerCase().trim();
  });

  const alreadySaved = Boolean(result && lexiconWords[result.word.toLowerCase()]);

  return (
    <div className="mx-auto max-w-4xl space-y-10 pb-8 lg:max-w-6xl xl:max-w-7xl">
      <div>
        <h1 className="font-serif text-2xl font-bold text-[#1C1917] sm:text-3xl">Word Deep Dive</h1>
        <p className="mt-2 font-serif text-sm italic leading-relaxed text-[#8B7355]">
          Twenty-five words picked for your taste — the set turns over each time you rate one, and Lexy leans into what
          you love. Your threads (above) steer the palette; change them anytime. Tap a word
          for the full story; IPA is always in the room. From My Lexicon, open any saved word for the same page —
          pronunciation, examples, etymology, and related forms.
        </p>
      </div>

      <GenreStrip compact />

      <section className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#B0A898]">Words for your taste</h2>
            <p className="mt-1 text-xs text-[#8B7355]">25 at a time — they refresh when you rate, so Lexy learns.</p>
          </div>
          <button
            type="button"
            disabled={gridLoading}
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

      <AnimatePresence>
        {(loadingDive || result) && (
          <>
            <motion.div
              key="dive-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-[100] bg-[#1C1917]/35 backdrop-blur-[2px]"
              onClick={closeDiveDetail}
              aria-hidden
            />
            <div
              className="fixed inset-0 z-[110] flex items-end justify-center sm:items-center sm:p-4"
              onClick={closeDiveDetail}
            >
              <motion.section
                key="dive-panel"
                initial={{ opacity: 0, scale: 0.95, y: 24 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96, y: 16 }}
                transition={{ type: "spring", stiffness: 460, damping: 34 }}
                onClick={(e) => e.stopPropagation()}
                className="max-h-[min(92dvh,calc(100dvh-3.5rem))] w-full max-w-2xl space-y-5 overflow-y-auto overflow-x-hidden rounded-t-2xl border border-b-0 border-[#EDE8E0] bg-[#FEFCF8] px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 shadow-[0_-12px_40px_rgba(0,0,0,0.14)] sm:rounded-2xl sm:border-b sm:p-6 sm:shadow-2xl"
                role="dialog"
                aria-modal="true"
                aria-label={loadingDive ? "Loading word details" : result ? `Details for ${result.word}` : "Word details"}
              >
                <div className="relative flex h-11 shrink-0 items-center border-b border-[#F5F0EA] sm:h-auto sm:border-b-0">
                  <div className="pointer-events-none absolute inset-x-0 flex justify-center pt-2 sm:hidden">
                    <div className="h-1 w-10 rounded-full bg-[#D4CCC0]" aria-hidden />
                  </div>
                  <button
                    type="button"
                    onClick={closeDiveDetail}
                    disabled={loadingDive}
                    className="relative z-10 ml-auto min-h-10 shrink-0 rounded-full px-3 text-xs font-semibold uppercase tracking-[0.1em] text-[#8B7355] active:bg-[#F5EFE0] disabled:opacity-40 sm:hover:bg-[#F5EFE0]"
                  >
                    Close
                  </button>
                </div>

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
                      <h2 className="break-words font-serif text-2xl font-bold text-[#1C1917] sm:text-3xl">
                        {result.word}
                      </h2>
                      <PronounceButton word={result.word} />
                    </div>
                    <IPA className="mt-2 block">{result.pronunciation}</IPA>
                    <p className="mt-3 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#B0A898]">
                      {result.part_of_speech}
                    </p>
                    <p className="mt-4 text-sm leading-relaxed text-[#4A4340]">{result.definition}</p>

                    {relatedForms.length > 0 && (
                      <div className="mt-5 rounded-xl border border-[#F5F0EA] bg-[#FDFBF7] p-4">
                        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#8B7355]">
                          Related forms — meanings only
                        </p>
                        <ul className="mt-3 space-y-3">
                          {relatedForms.map((rf) => (
                            <li key={`${rf.word}-${rf.part_of_speech}`} className="text-sm leading-relaxed text-[#4A4340]">
                              <span className="font-serif font-semibold text-[#1C1917]">{rf.word}</span>
                              <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[#B0A898]">
                                {" "}
                                · {rf.part_of_speech}
                              </span>
                              <span className="block text-[#6A6360]">{rf.definition}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

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
                    {result.used_by && (
                      <div className="mt-6 border-t border-[#F5F0EA] pt-6">
                        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#B0A898]">
                          Where you might have met it
                        </p>
                        <p className="mt-2 text-sm leading-relaxed text-[#4A4340]">{result.used_by}</p>
                      </div>
                    )}
                  </div>

                  {(result.related_words ?? []).length > 0 && (
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#B0A898]">Kindred words</p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {result.related_words.map((rw) => (
                          <Link
                            key={rw}
                            href={`/dive?word=${encodeURIComponent(rw)}`}
                            className="rounded-full bg-[#F5EFE0] px-3 py-1 font-serif text-sm italic text-[#8B7355] transition hover:bg-[#EDE4D4]"
                          >
                            {rw}
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}

                  {extrasPending && (
                    <p className="text-center text-xs italic text-[#B0A898]">
                      Still gathering kindred words and where it&apos;s been used…
                    </p>
                  )}

                  <div className="rounded-2xl border border-[#EDE8E0] bg-white p-6">
                    <RatingDial value={rating} onChange={setRating} label="How much do you want to keep it?" />
                    <button
                      type="button"
                      onClick={addToLexicon}
                      className="mt-5 w-full rounded-full bg-[#1C1917] py-3.5 text-sm font-semibold text-[#F5EFE0]"
                    >
                      {alreadySaved ? "Update rating in lexicon" : "Rate & add to lexicon"}
                    </button>
                    <p className="mt-3 text-center text-[11px] italic text-[#B0A898]">
                      Adding refreshes your 25-word grid so Lexy can learn your taste.
                    </p>
                  </div>
                </div>
              )}
              </motion.section>
            </div>
          </>
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

export default function DivePage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-4xl pb-8 font-serif text-sm italic text-[#B0A898] lg:max-w-6xl xl:max-w-7xl">Opening Deep Dive…</div>
      }
    >
      <DivePageContent />
    </Suspense>
  );
}
