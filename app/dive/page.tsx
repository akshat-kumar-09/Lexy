"use client";

import { AddWordBurst } from "@/components/AddWordBurst";
import { GenreStrip } from "@/components/GenreStrip";
import { IPA } from "@/components/IPA";
import { PronounceButton } from "@/components/PronounceButton";
import { QuickAddRating } from "@/components/QuickAddRating";
import { RatingDial } from "@/components/RatingDial";
import { SentenceCapture } from "@/components/SentenceCapture";
import { ShareWordCard } from "@/components/ShareWordCard";
import { VocabLevelBadge, VocabTierMark } from "@/components/VocabLevelBadge";
import { deepDiveWord, generateTasteGrid } from "@/lib/claude";
import { playLexiconChime } from "@/lib/sound";
import { GRID_LEVEL_TARGETS, VOCAB_LEVELS, WHY_ELEVATED_WORDS } from "@/lib/vocabLevels";
import { useLexicon, useTasteGridBatch, useTasteProfile, todayISODate } from "@/lib/store";
import type { DeepDiveResult, TasteGridWord } from "@/lib/types";
import { motion, AnimatePresence } from "framer-motion";
import { useBodyScrollLock } from "@/hooks/useBodyScrollLock";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useRef, useState } from "react";

function DivePageContent() {
  const explorationThreads = useTasteProfile((s) => s.threads);
  const upsertWord = useLexicon((s) => s.upsertWord);
  const tasteGridBatch = useTasteGridBatch((s) => s.tasteGridBatch);
  const setTasteGridBatch = useTasteGridBatch((s) => s.setTasteGridBatch);
  const clearTasteGridBatch = useTasteGridBatch((s) => s.clearTasteGridBatch);

  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const wordFromUrl = searchParams.get("word");

  const openedUrlLemmaRef = useRef<string | null>(null);

  const [liveSuggestions, setLiveSuggestions] = useState<TasteGridWord[]>([]);
  const [gridLoading, setGridLoading] = useState(false);
  const [gridError, setGridError] = useState<string | null>(null);
  const [gridNonce, setGridNonce] = useState(0);

  const [selectedFromGrid, setSelectedFromGrid] = useState<TasteGridWord | null>(null);
  const [query, setQuery] = useState("");
  const [pendingWord, setPendingWord] = useState("");
  const [userSentence, setUserSentence] = useState("");
  const [loadingDive, setLoadingDive] = useState(false);
  const [extrasPending, setExtrasPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<DeepDiveResult | null>(null);
  const [rating, setRating] = useState(7.5);
  const [burst, setBurst] = useState(false);

  const loadGrid = useCallback(
    async (forceNew: boolean) => {
      const cached = useTasteGridBatch.getState().tasteGridBatch;
      if (!forceNew && cached.length >= 25) return;

      setGridLoading(true);
      setGridError(null);
      setLiveSuggestions([]);
      try {
        const words = useLexicon.getState().words;
        let firstBatch = true;
        const g = await generateTasteGrid(words, undefined, explorationThreads, (batch) => {
          setLiveSuggestions((prev) => {
            if (firstBatch) {
              firstBatch = false;
              return batch;
            }
            return [...prev, ...batch];
          });
        });
        setTasteGridBatch(g.suggestions);
        setLiveSuggestions([]);
      } catch (e) {
        setGridError(e instanceof Error ? e.message : "Could not load suggestions");
      } finally {
        setGridLoading(false);
      }
    },
    [explorationThreads, setTasteGridBatch]
  );

  useEffect(() => {
    void loadGrid(gridNonce > 0);
  }, [gridNonce, loadGrid, explorationThreads]);

  const displayGrid =
    gridLoading && liveSuggestions.length > 0 ? liveSuggestions : tasteGridBatch;

  const openDive = useCallback(async (lemma: string, hint?: TasteGridWord | null) => {
    const trimmed = lemma.trim();
    if (!trimmed) return;

    setError(null);
    setLoadingDive(true);
    setExtrasPending(false);
    setResult(null);
    setPendingWord(trimmed);
    if (hint) setSelectedFromGrid(hint);
    else setSelectedFromGrid(null);
    const saved = useLexicon.getState().words[trimmed.toLowerCase()];
    setRating(saved?.rating ?? 7.5);
    setUserSentence(saved?.user_sentence ?? "");
    try {
      const r = await deepDiveWord(trimmed, (core) => {
        setResult(core);
        setLoadingDive(false);
        setExtrasPending(true);
      });
      setResult(r);
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
    const sentence = userSentence.trim();
    if (!sentence) return;
    const ex = result.example_sentences?.[0] ?? "";
    upsertWord({
      word: result.word,
      pronunciation: result.pronunciation,
      part_of_speech: result.part_of_speech,
      definition: result.lexy_definition,
      example: ex,
      origin: result.origin,
      rating,
      added: todayISODate(),
      source: "deep_dive",
      user_sentence: sentence,
      reference_definition: result.reference_definition,
      reference_source: result.reference_source,
      lexy_definition: result.lexy_definition,
      pronunciation_source: result.pronunciation_source,
      level: result.level,
    });
    playLexiconChime();
    setBurst(true);
    setTimeout(() => setBurst(false), 700);
    setResult(null);
    setQuery("");
    setSelectedFromGrid(null);
    setUserSentence("");
    openedUrlLemmaRef.current = null;
    if (pathname === "/dive" && searchParams.get("word")) {
      router.replace("/dive", { scroll: false });
    }
  }

  function refreshGridManual() {
    clearTasteGridBatch();
    setGridNonce((n) => n + 1);
  }

  /** Rate straight from the grid card — no detail page, no etymology lookup, no sentence required. */
  function quickAddFromGrid(s: TasteGridWord, ratingValue: number) {
    upsertWord({
      word: s.word,
      pronunciation: s.pronunciation,
      part_of_speech: s.part_of_speech,
      definition: s.definition,
      example: "",
      origin: "",
      rating: ratingValue,
      added: todayISODate(),
      source: "deep_dive",
      level: s.level,
    });
    playLexiconChime();
    setBurst(true);
    setTimeout(() => setBurst(false), 700);
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
          Twenty-five words picked for your taste — mostly{" "}
          <span className="font-semibold not-italic">Level 3</span> conversation upgrades you can slip into normal talk.
          Work through the batch at your pace; tap <span className="font-semibold not-italic">New batch</span> when
          ready. Each deep dive shows a reference meaning plus a Lexy gloss you can retain.
        </p>
      </div>

      <div className="rounded-2xl border border-[#EDE8E0] bg-[#F9F6F0]/80 px-4 py-4 sm:px-5">
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#8B7355]">Why bother?</p>
        <p className="mt-2 text-sm leading-relaxed text-[#4A4340]">{WHY_ELEVATED_WORDS}</p>
      </div>

      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          {([2, 3, 4, 5] as const).map((lv) => (
            <div
              key={lv}
              className="flex items-center gap-2 rounded-full border border-[#EDE8E0] bg-white py-1.5 pl-2.5 pr-3"
              title={VOCAB_LEVELS[lv].audience}
            >
              <VocabTierMark level={lv} size={12} />
              <span className="font-serif text-[11px] font-bold italic leading-none text-[#4A4340]">
                {VOCAB_LEVELS[lv].tagline}
              </span>
              <span className="text-[10px] font-medium tabular-nums leading-none text-[#B0A898]">
                {GRID_LEVEL_TARGETS[lv].min}–{GRID_LEVEL_TARGETS[lv].max}
              </span>
            </div>
          ))}
        </div>
        <p className="text-[11px] italic leading-relaxed text-[#7A7268]">
          The rising strokes mark how rare a word is — per 25-word batch, everyday words are skipped and{" "}
          {VOCAB_LEVELS[3].tagline.toLowerCase()}s carry the grid.
        </p>
      </div>

      <GenreStrip compact />

      <section className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#B0A898]">Words for your taste</h2>
            <p className="mt-1 text-xs text-[#8B7355]">
              25 at a time — mostly Level 3 · stays put until New batch.
            </p>
          </div>
          <button
            type="button"
            disabled={gridLoading}
            onClick={refreshGridManual}
            className={`rounded-full border border-[#EDE8E0] px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.1em] text-[#6A6360] hover:border-[#8B7355] disabled:opacity-70 ${gridLoading ? "lexy-chase" : ""}`}
          >
            {gridLoading ? "Curating…" : "New batch"}
          </button>
        </div>

        {gridError && (
          <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{gridError}</p>
        )}

        {gridLoading && displayGrid.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[#EDE8E0] bg-white/60 px-6 py-16 text-center font-serif text-sm italic text-[#B0A898]">
            Curating 25 words that fit the shape of your mind…
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {displayGrid.map((s) => (
              <div
                key={`${s.word}-${s.pronunciation}`}
                className="rounded-2xl border border-[#EDE8E0] bg-white p-4 shadow-sm transition sm:hover:border-[#8B7355]/50 sm:hover:shadow-md"
              >
                <div className="flex items-start justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => void openDive(s.word, s)}
                    className="min-w-0 flex-1 text-left"
                  >
                    <span className="flex items-baseline gap-2">
                      <span className="font-serif text-lg font-bold leading-snug text-[#1C1917]">{s.word}</span>
                      <VocabLevelBadge level={s.level} compact />
                    </span>
                    <IPA className="mt-1 block text-xs">{s.pronunciation}</IPA>
                  </button>
                  <QuickAddRating onAdd={(v) => quickAddFromGrid(s, v)} />
                </div>
                <button type="button" onClick={() => void openDive(s.word, s)} className="mt-2 block w-full text-left">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[#B0A898]">
                      {s.part_of_speech}
                    </p>
                    {s.theme && (
                      <span className="rounded-full bg-[#F5EFE0] px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.06em] text-[#8B7355]">
                        {s.theme}
                      </span>
                    )}
                  </div>
                  <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-[#6A6360]">{s.definition}</p>
                  <p className="mt-3 line-clamp-2 text-[11px] italic leading-snug text-[#8B7355]">{s.why_for_you}</p>
                </button>
              </div>
            ))}
          </div>
        )}

        {gridLoading && displayGrid.length > 0 && (
          <p className="text-center text-xs italic text-[#B0A898]">Loading a new batch…</p>
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
                  <div className="relative z-10 ml-auto flex shrink-0 items-center gap-1">
                    {result && !loadingDive && <ShareWordCard result={result} />}
                    <button
                      type="button"
                      onClick={closeDiveDetail}
                      disabled={loadingDive}
                      className="min-h-10 shrink-0 rounded-full px-3 text-xs font-semibold uppercase tracking-[0.1em] text-[#8B7355] active:bg-[#F5EFE0] disabled:opacity-40 sm:hover:bg-[#F5EFE0]"
                    >
                      Close
                    </button>
                  </div>
                </div>

                {loadingDive && (
                  <div className="space-y-5">
                    <div className="rounded-2xl border border-[#EDE8E0] bg-white p-6 shadow-sm">
                      <div className="h-7 w-2/5 rounded-full lexy-shimmer" />
                      <div className="mt-3 h-4 w-1/4 rounded-full lexy-shimmer" />
                      <div className="mt-3 h-3 w-16 rounded-full lexy-shimmer" />
                      <div className="mt-5 space-y-2">
                        <div className="h-3 w-full rounded-full lexy-shimmer" />
                        <div className="h-3 w-5/6 rounded-full lexy-shimmer" />
                        <div className="h-3 w-3/5 rounded-full lexy-shimmer" />
                      </div>
                    </div>
                    <p className="text-center font-serif text-sm italic text-[#8B7355]">
                      Opening the page on <span className="font-semibold not-italic text-[#4A4340]">{pendingWord}</span>…
                    </p>
                  </div>
                )}

                {selectedFromGrid && !loadingDive && result && (
                  <p className="text-xs text-[#B0A898]">
                    From your grid: <span className="font-medium text-[#1C1917]">{selectedFromGrid.word}</span>
                    {selectedFromGrid.theme && <span> · theme: {selectedFromGrid.theme}</span>}
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
                      <VocabLevelBadge level={result.level} />
                      <PronounceButton word={result.word} />
                    </div>
                    <IPA className="mt-2 block">{result.pronunciation}</IPA>
                    <p className="mt-1 text-[11px] text-[#7A7268]">{result.pronunciation_source}</p>
                    <p className="mt-3 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#B0A898]">
                      {result.part_of_speech}
                    </p>

                    <div className="mt-4 space-y-4">
                      <div className="rounded-xl border border-[#F0EAE0] bg-[#FBF8F2] p-4">
                        <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#8B7355]">
                          {result.reference_source}
                        </p>
                        <p className="mt-2 text-sm leading-relaxed text-[#4A4340]">
                          {result.reference_definition}
                        </p>
                      </div>
                      <div className="rounded-xl border border-[#EDE8E0] bg-white p-4">
                        <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#8B7355]">
                          Lexy meaning
                        </p>
                        <p className="mt-2 font-serif text-sm leading-relaxed text-[#1C1917]">
                          {result.lexy_definition}
                        </p>
                      </div>
                    </div>

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

                  {(result.conversation_phrases ?? []).length > 0 && (
                    <div className="rounded-2xl border border-[#EDE8E0] bg-white p-6">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#B0A898]">Say it today</p>
                      <p className="mt-1 text-xs text-[#8B7355]">Ready-to-use lines — drop one into a real conversation.</p>
                      <div className="mt-4 space-y-2.5">
                        {result.conversation_phrases.map((p, i) => (
                          <p key={i} className="rounded-xl bg-[#F5EFE0] px-4 py-3 text-sm leading-relaxed text-[#4A4340]">
                            {p}
                          </p>
                        ))}
                      </div>
                    </div>
                  )}

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

                  <div className="space-y-5 rounded-2xl border border-[#EDE8E0] bg-white p-6">
                    <SentenceCapture word={result.word} value={userSentence} onChange={setUserSentence} />
                    <div className="border-t border-[#F5F0EA] pt-5">
                      <RatingDial value={rating} onChange={setRating} label="Your rating" />
                      <button
                        type="button"
                        onClick={addToLexicon}
                        disabled={!userSentence.trim()}
                        className="mt-4 w-full rounded-full bg-[#1C1917] py-3.5 text-sm font-semibold text-[#F5EFE0] disabled:opacity-40"
                      >
                        {alreadySaved ? "Update rating in lexicon" : "Rate & add to lexicon"}
                      </button>
                    </div>
                    <p className="text-center text-[11px] italic text-[#B0A898]">
                      Your grid stays put — tap New batch when you want fresh words.
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
