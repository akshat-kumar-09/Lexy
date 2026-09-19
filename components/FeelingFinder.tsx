"use client";

import { AddWordBurst } from "@/components/AddWordBurst";
import { IPA } from "@/components/IPA";
import { PronounceButton } from "@/components/PronounceButton";
import { RatingDial } from "@/components/RatingDial";
import { SentenceCapture } from "@/components/SentenceCapture";
import { nameFeeling } from "@/lib/claude";
import { FAVOURITE_THRESHOLD } from "@/lib/lexyCopy";
import { playLexiconChime } from "@/lib/sound";
import { todayISODate, useLexicon } from "@/lib/store";
import type { FeelingNameCandidate, FeelingNameResult } from "@/lib/types";
import { AnimatePresence, motion } from "framer-motion";
import { useCallback, useMemo, useState } from "react";

function candidatesOf(result: FeelingNameResult): FeelingNameCandidate[] {
  const seen = new Set<string>();
  const out: FeelingNameCandidate[] = [];
  for (const c of [result.primary, ...result.neighbors]) {
    const k = c.word.toLowerCase();
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(c);
  }
  return out;
}

export function FeelingFinder() {
  const upsertWord = useLexicon((s) => s.upsertWord);

  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<FeelingNameResult | null>(null);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [sentence, setSentence] = useState("");
  const [rating, setRating] = useState(7.5);
  const [copied, setCopied] = useState(false);
  const [burst, setBurst] = useState(false);
  const [savedKey, setSavedKey] = useState<string | null>(null);

  const options = useMemo(() => (result ? candidatesOf(result) : []), [result]);
  const selected = options.find((c) => c.word.toLowerCase() === selectedKey) ?? options[0] ?? null;
  const isPrimary = Boolean(result && selected && selected.word.toLowerCase() === result.primary.word.toLowerCase());

  const runFind = useCallback(async () => {
    const text = draft.trim();
    if (!text || loading) return;
    setLoading(true);
    setError(null);
    setCopied(false);
    setBurst(false);
    setSavedKey(null);
    try {
      const r = await nameFeeling(text);
      setResult(r);
      setSelectedKey(r.primary.word.toLowerCase());
      setSentence("");
      setRating(7.5);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not name that feeling");
      setResult(null);
    } finally {
      setLoading(false);
    }
  }, [draft, loading]);

  function reset() {
    setResult(null);
    setSelectedKey(null);
    setSentence("");
    setRating(7.5);
    setCopied(false);
    setBurst(false);
    setSavedKey(null);
    setError(null);
  }

  async function copyPhrase() {
    if (!selected?.rewritten_phrase) return;
    try {
      await navigator.clipboard.writeText(selected.rewritten_phrase);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      setError("Could not copy — select the phrase and copy it yourself.");
    }
  }

  function addSelected() {
    if (!selected || !sentence.trim()) return;
    upsertWord({
      word: selected.word,
      pronunciation: selected.pronunciation,
      part_of_speech: selected.part_of_speech,
      definition: selected.definition,
      example: selected.rewritten_phrase,
      origin: selected.origin,
      rating,
      added: todayISODate(),
      source: "articulate",
      user_sentence: sentence.trim(),
    });
    playLexiconChime();
    setBurst(true);
    setSavedKey(selected.word.toLowerCase());
    setTimeout(() => setBurst(false), 700);
  }

  return (
    <section className="space-y-4">
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#8B7355]">Name this feeling</p>
        <h2 className="mt-1 font-serif text-lg font-bold text-[#1C1917] sm:text-xl">Say it in your own words.</h2>
        <p className="mt-1 max-w-xl text-[13px] leading-relaxed text-[#6A6360]">
          The first word is a clue. Lexy finds the one that actually fits — and a phrase you can paste in its place.
        </p>
      </div>

      {!result && (
        <div className="space-y-3">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="I feel disappointed when I start a book and cannot stick to that commitment…"
            rows={5}
            disabled={loading}
            className="w-full rounded-2xl border border-[#EDE8E0] bg-white p-4 text-sm leading-relaxed text-[#1C1917] outline-none ring-[#8B7355]/15 placeholder:text-[#B0A898] focus:border-[#8B7355] focus:ring-4 disabled:opacity-60"
          />
          <button
            type="button"
            disabled={loading || !draft.trim()}
            onClick={() => void runFind()}
            className="w-full rounded-full bg-[#1C1917] py-3.5 text-sm font-semibold text-[#F5EFE0] transition hover:bg-[#2C2920] disabled:opacity-40"
          >
            {loading ? "Finding the word…" : "Find the word"}
          </button>
        </div>
      )}

      {error && (
        <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p>
      )}

      <AnimatePresence>
        {result && selected && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative overflow-hidden rounded-2xl border border-[#EDE8E0] bg-white p-5 shadow-sm sm:p-6"
          >
            <AddWordBurst show={burst} />

            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#8B7355]">Before</p>
            <p className="mt-1 text-sm text-[#B0A898] line-through">{result.vague_label}</p>

            <div className="mt-4 flex items-start gap-2">
              <div className="min-w-0 flex-1">
                <h3 className="font-serif text-2xl font-bold text-[#1C1917] sm:text-[1.7rem]">{selected.word}</h3>
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  <IPA className="text-sm">{selected.pronunciation}</IPA>
                  <PronounceButton word={selected.word} />
                </div>
                {selected.part_of_speech && (
                  <p className="mt-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#B0A898]">
                    {selected.part_of_speech}
                  </p>
                )}
              </div>
            </div>

            {selected.definition && (
              <p className="mt-2 text-sm leading-relaxed text-[#4A4340]">{selected.definition}</p>
            )}

            <p className="mt-4 text-sm italic leading-relaxed text-[#6A6360]">{selected.why}</p>
            {isPrimary && result.why_not_that && (
              <p className="mt-2 text-sm leading-relaxed text-[#6A6360]">{result.why_not_that}</p>
            )}

            <div className="mt-5 rounded-xl bg-[#F9F6F0] p-4 sm:p-5">
              <div className="flex items-baseline justify-between gap-2">
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#8B7355]">Rewritten</p>
                <button
                  type="button"
                  onClick={() => void copyPhrase()}
                  className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#8B7355] hover:text-[#1C1917]"
                >
                  {copied ? "Copied" : "Copy"}
                </button>
              </div>
              <p className="mt-2 font-serif text-[15px] leading-relaxed text-[#1C1917] sm:text-base">
                {selected.rewritten_phrase}
              </p>
            </div>

            {options.length > 1 && (
              <div className="mt-5">
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#B0A898]">Nearby shades</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {options.map((c) => {
                    const key = c.word.toLowerCase();
                    const on = key === selected.word.toLowerCase();
                    const isHead = key === result.primary.word.toLowerCase();
                    return (
                      <button
                        key={key}
                        type="button"
                        title={isHead ? "Best fit" : "Nearby shade"}
                        onClick={() => {
                          setSelectedKey(key);
                          setCopied(false);
                          if (savedKey !== key) setSentence("");
                        }}
                        className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${
                          on
                            ? "bg-[#1C1917] text-[#F5EFE0]"
                            : "border border-[#EDE8E0] bg-[#FEFCF8] text-[#8B7355] hover:border-[#8B7355]/50"
                        }`}
                      >
                        {c.word}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {selected.origin && (
              <p className="mt-4 text-xs leading-relaxed text-[#B0A898]">{selected.origin}</p>
            )}

            <div className="mt-6 border-t border-[#F5F0EA] pt-5">
              <p className="text-sm italic text-[#8B7355]">
                Rate it, write it in a sentence, then keep it. {FAVOURITE_THRESHOLD}+ becomes a favourite.
              </p>
              <div className="mt-4">
                <SentenceCapture word={selected.word} value={sentence} onChange={setSentence} id="feeling-sentence" />
              </div>
              <div className="mt-5">
                <RatingDial value={rating} onChange={setRating} id="feeling-rating" label="Rating" />
              </div>
              <button
                type="button"
                onClick={addSelected}
                disabled={!sentence.trim()}
                className="mt-4 w-full rounded-full bg-[#1C1917] py-3 text-sm font-semibold text-[#F5EFE0] transition hover:bg-[#2C2920] disabled:opacity-40"
              >
                {savedKey === selected.word.toLowerCase() ? "Saved to my lexicon" : "Add to my lexicon"}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {result && (
        <button
          type="button"
          onClick={reset}
          className="w-full rounded-full border border-[#EDE8E0] py-3 text-sm font-medium text-[#6A6360] hover:border-[#8B7355]"
        >
          Name another feeling
        </button>
      )}
    </section>
  );
}
