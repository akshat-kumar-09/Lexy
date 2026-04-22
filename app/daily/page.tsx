"use client";

import { AddWordBurst } from "@/components/AddWordBurst";
import { IPA } from "@/components/IPA";
import { RatingDial } from "@/components/RatingDial";
import { generateDailyWord } from "@/lib/openai";
import { playLexiconChime } from "@/lib/sound";
import { GenreStrip } from "@/components/GenreStrip";
import { useLexicon, useSettings, useTasteProfile, todayISODate } from "@/lib/store";
import type { DailyWordEntry } from "@/lib/types";
import { motion } from "framer-motion";
import { useMemo, useState } from "react";

export default function DailyPage() {
  const apiKey = useSettings((s) => s.openaiApiKey);
  const genreIds = useTasteProfile((s) => s.genreIds);
  const words = useLexicon((s) => s.words);
  const daily_history = useLexicon((s) => s.daily_history);
  const appendDaily = useLexicon((s) => s.appendDaily);
  const upsertWord = useLexicon((s) => s.upsertWord);

  const today = todayISODate();
  const todays = useMemo(
    () => daily_history.find((h) => h.date === today) ?? null,
    [daily_history, today]
  );

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rating, setRating] = useState(8);
  const [burst, setBurst] = useState(false);

  async function reveal() {
    if (!apiKey) {
      setError("Add your OpenAI API key in Settings.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const gen = await generateDailyWord(apiKey, words, genreIds);
      const entry: DailyWordEntry = {
        date: today,
        word: gen.word,
        definition: gen.definition,
        pronunciation: gen.pronunciation,
        part_of_speech: gen.part_of_speech,
        example_sentences: gen.example_sentences,
        origin: gen.origin,
        usage_challenge: gen.usage_challenge,
        why_today: gen.why_today,
      };
      appendDaily(entry);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not fetch today's word");
    } finally {
      setLoading(false);
    }
  }

  function addToLexicon(d: DailyWordEntry) {
    const examples = d.example_sentences ?? [];
    upsertWord({
      word: d.word,
      pronunciation: d.pronunciation,
      part_of_speech: d.part_of_speech ?? "",
      definition: d.definition,
      example: examples[0] ?? "",
      origin: d.origin ?? "",
      rating,
      added: today,
      source: "daily",
    });
    playLexiconChime();
    setBurst(true);
    setTimeout(() => setBurst(false), 700);
  }

  return (
    <div className="mx-auto max-w-xl space-y-8">
      <div>
        <h1 className="font-serif text-3xl font-bold text-[#1C1917]">Daily Word</h1>
        <p className="mt-2 font-serif text-sm italic leading-relaxed text-[#8B7355]">
          One word per day, chosen for you — tuned to your aesthetic, not plucked from a hat. When the day turns, a
          new page opens.
        </p>
      </div>

      <GenreStrip compact />

      {!todays && (
        <div className="rounded-2xl border border-[#EDE8E0] bg-white p-8 text-center">
          <p className="font-serif text-lg text-[#4A4340]">Today&apos;s word is still unopened.</p>
          <button
            type="button"
            disabled={loading}
            onClick={() => void reveal()}
            className="mt-6 rounded-full bg-[#1C1917] px-10 py-3.5 text-sm font-semibold text-[#F5EFE0] disabled:opacity-50"
          >
            {loading ? "Finding the right word…" : "Reveal today's word"}
          </button>
        </div>
      )}

      {error && (
        <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p>
      )}

      {todays && (
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
          <div className="relative overflow-hidden rounded-[1.35rem] bg-[#1C1917] px-4 py-8 shadow-xl sm:px-6 sm:py-10 md:px-10 md:py-12">
            <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-[#8B7355]/15" />
            <AddWordBurst show={burst} />
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#8B7355]">
              {todays.date} · Today&apos;s word
            </p>
            <h2 className="mt-4 break-words font-serif text-4xl font-bold leading-[1.05] tracking-tight text-[#F5EFE0] sm:text-5xl md:text-6xl">
              {todays.word}
            </h2>
            <IPA className="mt-4 block break-words text-base sm:text-lg md:text-xl">{todays.pronunciation}</IPA>
            <p className="mt-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#A8A098]">
              {todays.part_of_speech}
            </p>
            <p className="mt-6 max-w-prose text-base leading-relaxed text-[#C8BFB0]">{todays.definition}</p>
            <div className="mt-8 space-y-4 border-t border-[#2A2520] pt-8">
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#8B7355]">In three lights</p>
              {(todays.example_sentences ?? []).map((ex, i) => (
                <p key={i} className="font-serif text-sm italic leading-relaxed text-[#E8DFD0]">
                  &ldquo;{ex}&rdquo;
                </p>
              ))}
            </div>
            {todays.why_today && (
              <p className="mt-6 text-sm italic leading-relaxed text-[#A8A098]">{todays.why_today}</p>
            )}
            {todays.usage_challenge && (
              <p className="mt-6 border-t border-[#2A2520] pt-6 text-sm italic leading-relaxed text-[#8B7355]">
                Today&apos;s challenge: {todays.usage_challenge}
              </p>
            )}
          </div>

          {todays.origin && (
            <div className="rounded-2xl border border-[#EDE8E0] bg-white p-6">
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#B0A898]">Etymology</p>
              <p className="mt-2 text-sm leading-relaxed text-[#4A4340]">{todays.origin}</p>
            </div>
          )}

          <div className="rounded-2xl border border-[#EDE8E0] bg-white p-6">
            <RatingDial value={rating} onChange={setRating} label="How does it land?" />
            <button
              type="button"
              onClick={() => addToLexicon(todays)}
              className="mt-5 w-full rounded-full bg-[#1C1917] py-3.5 text-sm font-semibold text-[#F5EFE0]"
            >
              Add to my lexicon
            </button>
          </div>
        </motion.div>
      )}
    </div>
  );
}
