"use client";

import { AddWordBurst } from "@/components/AddWordBurst";
import { RatingDial } from "@/components/RatingDial";
import { GenreStrip } from "@/components/GenreStrip";
import { generateMetaphorOfTheDay } from "@/lib/openai";
import { playLexiconChime } from "@/lib/sound";
import { useLexicon, useSettings, useTasteProfile, todayISODate } from "@/lib/store";
import type { MetaphorDayEntry } from "@/lib/types";
import { motion } from "framer-motion";
import { useMemo, useState } from "react";

const FAVOURITE_THRESHOLD = 7.7;

export default function MetaphorsPage() {
  const apiKey = useSettings((s) => s.openaiApiKey);
  const genreIds = useTasteProfile((s) => s.genreIds);
  const words = useLexicon((s) => s.words);
  const metaphor_history = useLexicon((s) => s.metaphor_history);
  const appendMetaphor = useLexicon((s) => s.appendMetaphor);
  const upsertWord = useLexicon((s) => s.upsertWord);

  const today = todayISODate();
  const todays = useMemo(
    () => metaphor_history.find((h) => h.date === today) ?? null,
    [metaphor_history, today]
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
      const gen = await generateMetaphorOfTheDay(apiKey, words, genreIds);
      const entry: MetaphorDayEntry = {
        date: today,
        metaphor: gen.metaphor,
        unpacking: gen.unpacking,
        image_strength: gen.image_strength,
        example_sentences: gen.example_sentences ?? [],
        try_today: gen.try_today,
        why_today: gen.why_today,
      };
      appendMetaphor(entry);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not fetch today's metaphor");
    } finally {
      setLoading(false);
    }
  }

  function addToLexicon(d: MetaphorDayEntry) {
    const examples = d.example_sentences ?? [];
    const def = [d.unpacking, d.image_strength].filter(Boolean).join("\n\n");
    upsertWord({
      word: d.metaphor,
      pronunciation: "—",
      part_of_speech: "metaphor",
      definition: def || d.unpacking,
      example: examples[0] ?? "",
      origin: d.image_strength ?? "—",
      rating,
      added: today,
      source: "metaphor",
    });
    playLexiconChime();
    setBurst(true);
    setTimeout(() => setBurst(false), 700);
  }

  return (
    <div className="mx-auto max-w-xl space-y-8">
      <div>
        <h1 className="font-serif text-3xl font-bold text-[#1C1917]">Metaphor of the day</h1>
        <p className="mt-2 font-serif text-sm italic leading-relaxed text-[#8B7355]">
          One image a day — tuned to what you saved and what you feel like leaning into today. Rate it, add it:{" "}
          <span className="font-semibold not-italic text-[#6A6360]">{FAVOURITE_THRESHOLD}+</span> lands in favourites.
        </p>
      </div>

      <GenreStrip compact />

      {!todays && (
        <div className="rounded-2xl border border-[#EDE8E0] bg-white p-8 text-center">
          <p className="font-serif text-lg text-[#4A4340]">Today&apos;s metaphor is still unopened.</p>
          <button
            type="button"
            disabled={loading}
            onClick={() => void reveal()}
            className="mt-6 rounded-full bg-[#1C1917] px-10 py-3.5 text-sm font-semibold text-[#F5EFE0] disabled:opacity-50"
          >
            {loading ? "Finding the right image…" : "Reveal today's metaphor"}
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
              {todays.date} · Today&apos;s metaphor
            </p>
            <h2 className="mt-4 break-words font-serif text-2xl font-bold leading-[1.15] tracking-tight text-[#F5EFE0] sm:text-3xl md:text-4xl">
              {todays.metaphor}
            </h2>
            <p className="mt-6 max-w-prose text-base leading-relaxed text-[#C8BFB0]">{todays.unpacking}</p>
            {todays.image_strength && (
              <div className="mt-6 rounded-xl bg-[#252220] p-4">
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#8B7355]">Why the image lands</p>
                <p className="mt-2 text-sm leading-relaxed text-[#E8DFD0]">{todays.image_strength}</p>
              </div>
            )}
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
            {todays.try_today && (
              <p className="mt-6 border-t border-[#2A2520] pt-6 text-sm italic leading-relaxed text-[#8B7355]">
                Try today: {todays.try_today}
              </p>
            )}
          </div>

          <div className="rounded-2xl border border-[#EDE8E0] bg-white p-6">
            <RatingDial value={rating} onChange={setRating} label="How does it land?" />
            <button
              type="button"
              onClick={() => addToLexicon(todays)}
              className="mt-5 w-full rounded-full bg-[#1C1917] py-3.5 text-sm font-semibold text-[#F5EFE0]"
            >
              Add to my lexicon
            </button>
            <p className="mt-3 text-center text-[11px] text-[#B0A898]">
              {FAVOURITE_THRESHOLD}+ shows up as a favourite on My Lexy — same as words from Deep Dive or Scribble.
            </p>
          </div>
        </motion.div>
      )}
    </div>
  );
}
