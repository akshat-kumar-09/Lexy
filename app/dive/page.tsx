"use client";

import { AddWordBurst } from "@/components/AddWordBurst";
import { GenreStrip } from "@/components/GenreStrip";
import { IPA } from "@/components/IPA";
import { LexyErrorNote } from "@/components/LexyErrorNote";
import { PronounceButton } from "@/components/PronounceButton";
import { RateBar } from "@/components/RateBar";
import { SentenceCapture } from "@/components/SentenceCapture";
import { ShareWordCard } from "@/components/ShareWordCard";
import { VocabLevelBadge, VocabTierMark } from "@/components/VocabLevelBadge";
import { generateTasteGrid, generateTasteReplacements } from "@/lib/claude";
import { isSignInNeeded } from "@/lib/lexyApi";
import { playLexiconChime } from "@/lib/sound";
import { GRID_LEVEL_TARGETS, VOCAB_LEVELS, WHY_ELEVATED_WORDS } from "@/lib/vocabLevels";
import { useLexicon, useTasteGridBatch, useTasteProfile, todayISODate } from "@/lib/store";
import type { DeepDiveResult, LexiconWord, TasteGridWord } from "@/lib/types";
import { isCompleteStory } from "@/lib/wordStory";
import { fetchWordStory } from "@/lib/wordStoryClient";
import { motion, AnimatePresence } from "framer-motion";
import { useBodyScrollLock } from "@/hooks/useBodyScrollLock";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useRef, useState } from "react";

/** How long after a rating before its grid slot is refilled — a nudge or two in between just updates it. */
const REPLACE_AFTER_MS = 1500;

/** Everything we know about the open word, merged into one lexicon entry (keeps what was saved before). */
function buildLexiconEntry(args: {
  word: string;
  story: Partial<DeepDiveResult>;
  hint: TasteGridWord | null;
  existing?: LexiconWord;
  rating: number;
  sentence?: string;
}): LexiconWord {
  const { word, story, hint, existing, rating } = args;
  const sentence = args.sentence?.trim();
  return {
    ...existing,
    word,
    pronunciation: story.pronunciation || existing?.pronunciation || hint?.pronunciation || "",
    part_of_speech: story.part_of_speech || existing?.part_of_speech || hint?.part_of_speech || "",
    definition: story.lexy_definition || existing?.definition || hint?.definition || "",
    example: story.example_sentences?.[0] || existing?.example || "",
    origin: story.origin || existing?.origin || "",
    rating,
    added: existing?.added || todayISODate(),
    source: existing?.source || "deep_dive",
    ...(sentence ? { user_sentence: sentence } : {}),
    reference_definition: story.reference_definition || existing?.reference_definition,
    reference_source: story.reference_source || existing?.reference_source,
    lexy_definition: story.lexy_definition || existing?.lexy_definition,
    pronunciation_source: story.pronunciation_source || existing?.pronunciation_source,
    level: story.level ?? existing?.level ?? hint?.level,
  };
}

function Shimmer({ className }: { className: string }) {
  return <div className={`rounded-full lexy-shimmer ${className}`} aria-hidden />;
}

function DivePageContent() {
  const explorationThreads = useTasteProfile((s) => s.threads);
  const upsertWord = useLexicon((s) => s.upsertWord);
  const lexiconWords = useLexicon((s) => s.words);
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

  /** Grid words just rated, waiting for a fresh word to take their slot (word key → rating). */
  const [replacing, setReplacing] = useState<Record<string, number>>({});
  const pendingReplace = useRef<{ word: string; rating: number }[]>([]);
  const replaceTimer = useRef<number | undefined>(undefined);

  const [query, setQuery] = useState("");
  const [openWord, setOpenWord] = useState<string | null>(null);
  const [hint, setHint] = useState<TasteGridWord | null>(null);
  const [story, setStory] = useState<Partial<DeepDiveResult>>({});
  const [storyLoading, setStoryLoading] = useState(false);
  const [storyError, setStoryError] = useState<string | null>(null);
  const [userSentence, setUserSentence] = useState("");
  const [burst, setBurst] = useState(false);
  const requestId = useRef(0);
  const abortRef = useRef<AbortController | null>(null);
  const openIndexRef = useRef(-1);

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

  useEffect(() => () => window.clearTimeout(replaceTimer.current), []);

  const displayGrid =
    gridLoading && liveSuggestions.length > 0 ? liveSuggestions : tasteGridBatch;

  const openDive = useCallback(async (lemma: string, fromGrid?: TasteGridWord | null) => {
    const trimmed = lemma.trim();
    if (!trimmed) return;

    const grid = useTasteGridBatch.getState().tasteGridBatch;
    const gridHint =
      fromGrid ?? grid.find((w) => w.word.toLowerCase() === trimmed.toLowerCase()) ?? null;
    openIndexRef.current = gridHint ? grid.findIndex((w) => w.word === gridHint.word) : -1;

    const id = ++requestId.current;
    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;

    const saved = useLexicon.getState().words[trimmed.toLowerCase()];
    setOpenWord(trimmed);
    setHint(gridHint);
    setStory({});
    setStoryError(null);
    setStoryLoading(true);
    setUserSentence(saved?.user_sentence ?? "");

    try {
      const s = await fetchWordStory(trimmed, {
        sense: gridHint?.definition,
        signal: ac.signal,
        onUpdate: (partial) => {
          if (requestId.current === id) setStory(partial);
        },
      });
      if (requestId.current === id) setStory(s);
    } catch (e) {
      if (requestId.current !== id || ac.signal.aborted) return;
      setStoryError(e instanceof Error ? e.message : "Could not open that word");
    } finally {
      if (requestId.current === id) setStoryLoading(false);
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

  // A word rated before its whole story arrived gets the rest saved once it lands.
  useEffect(() => {
    if (!openWord || !isCompleteStory(story)) return;
    const words = useLexicon.getState().words;
    const existing = words[(story.word ?? openWord).toLowerCase()] ?? words[openWord.toLowerCase()];
    if (!existing || existing.source !== "deep_dive") return;
    if (existing.reference_definition && existing.origin && existing.example) return;
    upsertWord(buildLexiconEntry({ word: existing.word, story, hint, existing, rating: existing.rating }));
  }, [story, openWord, hint, upsertWord]);

  async function runReplacements() {
    const batch = pendingReplace.current;
    pendingReplace.current = [];
    if (!batch.length) return;
    const grid = useTasteGridBatch.getState().tasteGridBatch;
    try {
      const fresh = await generateTasteReplacements(
        useLexicon.getState().words,
        batch.length,
        grid.map((w) => w.word),
        batch[batch.length - 1],
        explorationThreads
      );
      const next = [...useTasteGridBatch.getState().tasteGridBatch];
      let i = 0;
      for (const p of batch) {
        const idx = next.findIndex((w) => w.word.toLowerCase() === p.word.toLowerCase());
        if (idx >= 0 && fresh[i]) {
          next[idx] = fresh[i];
          i += 1;
        }
      }
      setTasteGridBatch(next);
    } catch {
      // The rated words simply stay on the grid with their ratings.
    } finally {
      setReplacing((r) => {
        const n = { ...r };
        for (const p of batch) delete n[p.word.toLowerCase()];
        return n;
      });
    }
  }

  function queueReplacement(word: string, rating: number) {
    const k = word.toLowerCase();
    if (!useTasteGridBatch.getState().tasteGridBatch.some((w) => w.word.toLowerCase() === k)) return;
    pendingReplace.current = [...pendingReplace.current.filter((p) => p.word.toLowerCase() !== k), { word, rating }];
    setReplacing((r) => ({ ...r, [k]: rating }));
    window.clearTimeout(replaceTimer.current);
    replaceTimer.current = window.setTimeout(() => void runReplacements(), REPLACE_AFTER_MS);
  }

  const displayWord = story.word || hint?.word || openWord || "";
  const savedEntry = openWord
    ? lexiconWords[displayWord.toLowerCase()] ?? lexiconWords[openWord.toLowerCase()]
    : undefined;
  const savedRating = savedEntry ? savedEntry.rating : null;

  function rateOpenWord(v: number) {
    if (!openWord) return;
    const words = useLexicon.getState().words;
    const existing = words[displayWord.toLowerCase()] ?? words[openWord.toLowerCase()];
    upsertWord(
      buildLexiconEntry({
        word: existing?.word ?? displayWord,
        story,
        hint,
        existing,
        rating: v,
        sentence: userSentence,
      })
    );
    if (!existing) {
      playLexiconChime();
      setBurst(true);
      window.setTimeout(() => setBurst(false), 700);
    }
    queueReplacement(hint?.word ?? displayWord, v);
  }

  function saveSentence() {
    if (!openWord) return;
    const words = useLexicon.getState().words;
    const existing = words[displayWord.toLowerCase()] ?? words[openWord.toLowerCase()];
    if (!existing) return;
    const s = userSentence.trim();
    if (s === (existing.user_sentence ?? "")) return;
    const next: LexiconWord = { ...existing, user_sentence: s };
    if (!s) delete next.user_sentence;
    upsertWord(next);
  }

  /** The next grid word you haven't rated yet, after the one that's open. */
  function nextUnrated(): TasteGridWord | null {
    const grid = tasteGridBatch;
    if (!grid.length) return null;
    const openKey = displayWord.toLowerCase();
    const start = openIndexRef.current;
    for (let step = 1; step <= grid.length; step++) {
      const w = grid[(Math.max(start, -1) + step + grid.length) % grid.length];
      const k = w.word.toLowerCase();
      if (k === openKey || lexiconWords[k] || replacing[k] !== undefined) continue;
      return w;
    }
    return null;
  }

  function refreshGridManual() {
    window.clearTimeout(replaceTimer.current);
    pendingReplace.current = [];
    setReplacing({});
    clearTasteGridBatch();
    setGridNonce((n) => n + 1);
  }

  function closeDiveDetail() {
    saveSentence();
    requestId.current += 1;
    abortRef.current?.abort();
    setOpenWord(null);
    setHint(null);
    setStory({});
    setStoryError(null);
    setStoryLoading(false);
    openedUrlLemmaRef.current = null;
    if (pathname === "/dive" && searchParams.get("word")) {
      router.replace("/dive", { scroll: false });
    }
  }

  function goNext(w: TasteGridWord) {
    saveSentence();
    if (pathname === "/dive" && searchParams.get("word")) {
      openedUrlLemmaRef.current = null;
      router.replace("/dive", { scroll: false });
    }
    void openDive(w.word, w);
  }

  const detailOpen = Boolean(openWord);
  useBodyScrollLock(detailOpen);

  useEffect(() => {
    if (!detailOpen) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && !e.defaultPrevented) closeDiveDetail();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const rawRelated = story.related_form_definitions;
  const relatedForms = (Array.isArray(rawRelated) ? rawRelated : []).filter((x) => {
    if (!x?.word?.trim() || !x?.definition?.trim()) return false;
    return x.word.toLowerCase().trim() !== displayWord.toLowerCase().trim();
  });

  const level = story.level ?? hint?.level;
  const pronunciation = story.pronunciation || hint?.pronunciation;
  const partOfSpeech = story.part_of_speech || hint?.part_of_speech;
  const hasMeaning = Boolean(story.reference_definition);
  const hasUsage = Boolean(story.example_sentences);
  const hasExtras = Array.isArray(story.related_words);
  const next = detailOpen && savedRating !== null ? nextUnrated() : null;
  const ratedCount = tasteGridBatch.filter((w) => lexiconWords[w.word.toLowerCase()]).length;

  return (
    <div className="mx-auto max-w-4xl space-y-10 pb-8 lg:max-w-6xl xl:max-w-7xl">
      <div>
        <h1 className="font-serif text-2xl font-bold text-[#1C1917] sm:text-3xl">Word Deep Dive</h1>
        <p className="mt-2 font-serif text-sm italic leading-relaxed text-[#8B7355]">
          Twenty-five words picked for your taste — mostly{" "}
          <span className="font-semibold not-italic">Level 3</span> conversation upgrades you can slip into normal talk.
          Open one, take it in, and rate it — every rated word makes way for a new one picked with your rating in mind.
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
              Tap a word to open it · rate it and a fresh one takes its place
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
          <LexyErrorNote message={gridError} />
        )}

        {gridLoading && displayGrid.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[#EDE8E0] bg-white/60 px-6 py-16 text-center font-serif text-sm italic text-[#B0A898]">
            Curating 25 words that fit the shape of your mind…
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {displayGrid.map((s) => {
              const k = s.word.toLowerCase();
              const rated = lexiconWords[k]?.rating;
              const swapping = replacing[k] !== undefined;
              return (
                <motion.button
                  layout="position"
                  key={`${s.word}-${s.pronunciation}`}
                  type="button"
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                  onClick={() => void openDive(s.word, s)}
                  className={`relative rounded-2xl border bg-white p-4 text-left shadow-sm transition active:scale-[0.99] sm:hover:shadow-md ${
                    rated !== undefined
                      ? "border-[#E4D8C4] bg-[#FDFBF7]"
                      : "border-[#EDE8E0] sm:hover:border-[#8B7355]/50"
                  }`}
                >
                  <span className="flex items-start justify-between gap-2">
                    <span className="min-w-0">
                      <span className="flex items-baseline gap-2">
                        <span className="font-serif text-lg font-bold leading-snug text-[#1C1917]">{s.word}</span>
                        <VocabLevelBadge level={s.level} compact />
                      </span>
                      <IPA className="mt-1 block text-xs">{s.pronunciation}</IPA>
                    </span>
                    {rated !== undefined && (
                      <span className="shrink-0 rounded-full bg-[#F5EFE0] px-2.5 py-1 font-serif text-sm font-bold tabular-nums text-[#1C1917]">
                        {rated.toFixed(1)}
                      </span>
                    )}
                  </span>
                  <span className="mt-2 flex flex-wrap items-center gap-1.5">
                    <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[#B0A898]">
                      {s.part_of_speech}
                    </span>
                    {s.theme && (
                      <span className="rounded-full bg-[#F5EFE0] px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.06em] text-[#8B7355]">
                        {s.theme}
                      </span>
                    )}
                  </span>
                  <span className="mt-2 line-clamp-2 block text-xs leading-relaxed text-[#6A6360]">{s.definition}</span>
                  {swapping ? (
                    <span className="mt-3 block text-[11px] italic leading-snug text-[#8B7355]">
                      Rated — finding you another…
                    </span>
                  ) : (
                    <span className="mt-3 line-clamp-2 block text-[11px] italic leading-snug text-[#8B7355]">
                      {s.why_for_you}
                    </span>
                  )}
                </motion.button>
              );
            })}
          </div>
        )}

        {gridLoading && displayGrid.length > 0 && (
          <p className="text-center text-xs italic text-[#B0A898]">Loading a new batch…</p>
        )}
        {!gridLoading && ratedCount > 0 && (
          <p className="text-center text-xs italic text-[#B0A898]">
            {ratedCount} of {tasteGridBatch.length} on this grid rated
          </p>
        )}
      </section>

      <AnimatePresence>
        {detailOpen && (
          <>
            <motion.div
              key="dive-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-[100] m-0 bg-[#1C1917]/35 backdrop-blur-[2px]"
              onClick={closeDiveDetail}
              aria-hidden
            />
            <div
              className="fixed inset-0 z-[110] m-0 flex items-end justify-center sm:items-center sm:p-4"
              onClick={closeDiveDetail}
            >
              <motion.section
                key="dive-panel"
                initial={{ opacity: 0, scale: 0.97, y: 24 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.97, y: 16 }}
                transition={{ type: "spring", stiffness: 520, damping: 36 }}
                onClick={(e) => e.stopPropagation()}
                className="flex max-h-[min(92dvh,calc(100dvh-2.5rem))] w-full max-w-2xl flex-col overflow-hidden rounded-t-2xl border border-b-0 border-[#EDE8E0] bg-[#FEFCF8] shadow-[0_-12px_40px_rgba(0,0,0,0.14)] sm:rounded-2xl sm:border-b sm:shadow-2xl"
                role="dialog"
                aria-modal="true"
                aria-label={`Details for ${displayWord}`}
              >
                <div className="relative flex h-12 shrink-0 items-center border-b border-[#F5F0EA] px-4 sm:px-6">
                  <div className="pointer-events-none absolute inset-x-0 top-0 flex justify-center pt-2 sm:hidden">
                    <div className="h-1 w-10 rounded-full bg-[#D4CCC0]" aria-hidden />
                  </div>
                  {hint?.theme && (
                    <span className="truncate rounded-full bg-[#F5EFE0] px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.06em] text-[#8B7355]">
                      {hint.theme}
                    </span>
                  )}
                  <div className="relative z-10 ml-auto flex shrink-0 items-center gap-1">
                    {isCompleteStory(story) && <ShareWordCard result={story} />}
                    <button
                      type="button"
                      onClick={closeDiveDetail}
                      className="min-h-10 shrink-0 rounded-full px-3 text-xs font-semibold uppercase tracking-[0.1em] text-[#8B7355] active:bg-[#F5EFE0] sm:hover:bg-[#F5EFE0]"
                    >
                      Close
                    </button>
                  </div>
                </div>

                <div className="min-h-0 flex-1 space-y-5 overflow-y-auto overscroll-contain px-4 py-4 sm:px-6 sm:py-5">
                  <div className="relative overflow-hidden rounded-2xl border border-[#EDE8E0] bg-white p-5 shadow-sm sm:p-6">
                    <AddWordBurst show={burst} />
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="break-words font-serif text-2xl font-bold text-[#1C1917] sm:text-3xl">
                        {displayWord}
                      </h2>
                      {level && <VocabLevelBadge level={level} />}
                      <PronounceButton word={displayWord} />
                    </div>
                    {pronunciation ? (
                      <IPA className="mt-2 block">{pronunciation}</IPA>
                    ) : (
                      <Shimmer className="mt-3 h-4 w-1/4" />
                    )}
                    {story.pronunciation_source && (
                      <p className="mt-1 text-[11px] text-[#7A7268]">{story.pronunciation_source}</p>
                    )}
                    {partOfSpeech && (
                      <p className="mt-3 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#B0A898]">
                        {partOfSpeech}
                      </p>
                    )}

                    <div className="mt-4 space-y-4">
                      {hasMeaning ? (
                        <>
                          <div className="rounded-xl border border-[#F0EAE0] bg-[#FBF8F2] p-4">
                            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#8B7355]">
                              {story.reference_source}
                            </p>
                            <p className="mt-2 text-sm leading-relaxed text-[#4A4340]">{story.reference_definition}</p>
                          </div>
                          <div className="rounded-xl border border-[#EDE8E0] bg-white p-4">
                            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#8B7355]">
                              Lexy meaning
                            </p>
                            <p className="mt-2 font-serif text-sm leading-relaxed text-[#1C1917]">
                              {story.lexy_definition}
                            </p>
                          </div>
                        </>
                      ) : (
                        <div className="rounded-xl border border-[#EDE8E0] bg-white p-4">
                          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#8B7355]">
                            Meaning
                          </p>
                          {hint?.definition ? (
                            <p className="mt-2 font-serif text-sm leading-relaxed text-[#1C1917]">{hint.definition}</p>
                          ) : (
                            <div className="mt-3 space-y-2">
                              <Shimmer className="h-3 w-full" />
                              <Shimmer className="h-3 w-4/6" />
                            </div>
                          )}
                          {storyLoading && (
                            <p className="mt-3 text-[11px] italic text-[#B0A898]">Opening the full page…</p>
                          )}
                        </div>
                      )}
                    </div>

                    {hint?.why_for_you && (
                      <p className="mt-4 font-serif text-[13px] italic leading-relaxed text-[#8B7355]">
                        {hint.why_for_you}
                      </p>
                    )}

                    {storyError && !hasMeaning && isSignInNeeded(storyError) && (
                      <LexyErrorNote message={storyError} className="mt-4" />
                    )}

                    {storyError && !hasMeaning && !isSignInNeeded(storyError) && (
                      <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
                        {storyError}{" "}
                        <button
                          type="button"
                          onClick={() => openWord && void openDive(openWord, hint)}
                          className="font-semibold underline underline-offset-2"
                        >
                          Try again
                        </button>
                      </div>
                    )}

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

                    {(story.nuance || (storyLoading && !hasMeaning)) && (
                      <div className="mt-5 rounded-xl bg-[#F5EFE0] p-4">
                        <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#8B7355]">The nuance</p>
                        {story.nuance ? (
                          <p className="mt-2 text-sm leading-relaxed text-[#4A4340]">{story.nuance}</p>
                        ) : (
                          <div className="mt-3 space-y-2">
                            <Shimmer className="h-3 w-full" />
                            <Shimmer className="h-3 w-3/5" />
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {(hasUsage || storyLoading) && (
                    <div className="rounded-2xl border border-[#EDE8E0] bg-white p-5 sm:p-6">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#B0A898]">In three sentences</p>
                      {hasUsage ? (
                        <div className="mt-3 space-y-3">
                          {(story.example_sentences ?? []).map((ex, i) => (
                            <p key={i} className="border-l-2 border-[#EDE8E0] pl-3 font-serif text-sm italic text-[#8B7355]">
                              &ldquo;{ex}&rdquo;
                            </p>
                          ))}
                        </div>
                      ) : (
                        <div className="mt-3 space-y-2.5">
                          <Shimmer className="h-3 w-full" />
                          <Shimmer className="h-3 w-5/6" />
                          <Shimmer className="h-3 w-4/6" />
                        </div>
                      )}
                    </div>
                  )}

                  {(story.conversation_phrases ?? []).length > 0 && (
                    <div className="rounded-2xl border border-[#EDE8E0] bg-white p-5 sm:p-6">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#B0A898]">Say it today</p>
                      <p className="mt-1 text-xs text-[#8B7355]">Ready-to-use lines — drop one into a real conversation.</p>
                      <div className="mt-4 space-y-2.5">
                        {(story.conversation_phrases ?? []).map((p, i) => (
                          <p key={i} className="rounded-xl bg-[#F5EFE0] px-4 py-3 text-sm leading-relaxed text-[#4A4340]">
                            {p}
                          </p>
                        ))}
                      </div>
                    </div>
                  )}

                  {(story.origin || story.used_by) && (
                    <div className="rounded-2xl border border-[#EDE8E0] bg-white p-5 sm:p-6">
                      {story.origin && (
                        <>
                          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#B0A898]">Etymology</p>
                          <p className="mt-2 text-sm leading-relaxed text-[#4A4340]">{story.origin}</p>
                        </>
                      )}
                      {story.used_by && (
                        <div className={story.origin ? "mt-6 border-t border-[#F5F0EA] pt-6" : ""}>
                          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#B0A898]">
                            Where you might have met it
                          </p>
                          <p className="mt-2 text-sm leading-relaxed text-[#4A4340]">{story.used_by}</p>
                        </div>
                      )}
                    </div>
                  )}

                  {(story.related_words ?? []).length > 0 && (
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#B0A898]">Kindred words</p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {(story.related_words ?? []).map((rw) => (
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

                  {storyLoading && hasMeaning && !hasExtras && (
                    <p className="text-center text-xs italic text-[#B0A898]">
                      Still gathering kindred words and where it&apos;s been used…
                    </p>
                  )}

                  <div className="rounded-2xl border border-[#EDE8E0] bg-white p-5 sm:p-6">
                    <SentenceCapture
                      word={displayWord}
                      value={userSentence}
                      onChange={setUserSentence}
                      onBlur={saveSentence}
                    />
                  </div>
                </div>

                <div className="shrink-0 border-t border-[#EDE8E0] bg-[#FEFCF8] px-4 pb-[max(0.85rem,env(safe-area-inset-bottom))] pt-3 shadow-[0_-8px_24px_rgba(28,25,23,0.06)] sm:px-6 sm:pb-5">
                  <RateBar
                    key={openWord ?? ""}
                    value={savedRating}
                    onCommit={rateOpenWord}
                    label={`Rate “${displayWord}”`}
                    captureTyping
                  />
                  {next && (
                    <button
                      type="button"
                      onClick={() => goNext(next)}
                      className="mt-3 flex w-full items-center justify-center gap-2 rounded-full bg-[#1C1917] py-3 text-sm font-semibold text-[#F5EFE0] active:scale-[0.99]"
                    >
                      Next word <span className="font-serif italic text-[#D9C29A]">{next.word}</span> →
                    </button>
                  )}
                </div>
              </motion.section>
            </div>
          </>
        )}
      </AnimatePresence>

      <section className="space-y-4 border-t border-[#EDE8E0] pt-10">
        <h2 className="font-serif text-xl font-bold text-[#1C1917]">Or type any word</h2>
        <p className="text-sm leading-relaxed text-[#6A6360]">
          The grid is your compass — but if a word is already on your mind, invite it in.
        </p>
        <div className="flex flex-col gap-3 sm:flex-row">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && query.trim()) void openDive(query.trim());
            }}
            placeholder="liminal, sonder, petrichor…"
            className="flex-1 rounded-2xl border border-[#EDE8E0] bg-white px-4 py-3.5 text-sm outline-none ring-[#8B7355]/15 focus:border-[#8B7355] focus:ring-4"
          />
          <button
            type="button"
            disabled={!query.trim()}
            onClick={() => void openDive(query.trim())}
            className="rounded-2xl bg-[#1C1917] px-8 py-3.5 text-sm font-semibold text-[#F5EFE0] disabled:opacity-40"
          >
            Deep dive
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
