"use client";

import { AddWordBurst } from "@/components/AddWordBurst";
import { IPA } from "@/components/IPA";
import { PronounceButton } from "@/components/PronounceButton";
import { RatingDial } from "@/components/RatingDial";
import { SentenceCapture } from "@/components/SentenceCapture";
import { sharpenLine, type SharpenInput } from "@/lib/claude";
import { FAVOURITE_THRESHOLD } from "@/lib/lexyCopy";
import { playLexiconChime } from "@/lib/sound";
import { todayISODate, useLexicon, useOrbUsage } from "@/lib/store";
import { splitByPhrases } from "@/lib/textMarks";
import type { SharpenResult, SharpenVersion, SharpenWord } from "@/lib/types";
import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";

const TONES = ["Direct", "Diplomatic", "Warm", "Formal", "Playful", "Persuasive", "Poetic"];

const label = "text-[10px] font-semibold uppercase tracking-[0.16em] text-[#8B7355]";

/**
 * Sharpen: paste your best attempt at a line — the one you know could be said better —
 * and get it back in exact words, in three registers, with the words worth keeping.
 */
export function Sharpen() {
  const [line, setLine] = useState("");
  const [intent, setIntent] = useState("");
  const [tone, setTone] = useState("");
  const [customTone, setCustomTone] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<SharpenResult | null>(null);
  const [asked, setAsked] = useState<SharpenInput | null>(null);
  const recordVisit = useOrbUsage((s) => s.recordVisit);

  const chosenTone = customTone.trim() || tone;

  async function run(input: SharpenInput) {
    if (!input.line.trim() || loading) return;
    setLoading(true);
    setError(null);
    recordVisit("sharpen");
    try {
      const r = await sharpenLine(input);
      setResult(r);
      setAsked(input);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not sharpen that line");
    } finally {
      setLoading(false);
    }
  }

  function submit() {
    void run({ line, intent, tone: chosenTone });
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8 pb-10 lg:max-w-4xl">
      <header className="space-y-2">
        <p className={label}>Sharpen</p>
        <h1 className="font-serif text-2xl italic leading-[1.15] tracking-tight text-[#1C1917] sm:text-3xl md:text-4xl">
          Say exactly what you mean.
        </h1>
        <p className="max-w-xl text-[13px] leading-relaxed text-[#6A6360]">
          Paste your best attempt — the line you know could be said better. Lexy keeps your voice and finds the exact
          words.
        </p>
      </header>

      {!result && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
          className={`space-y-5 rounded-2xl border border-[#EDE8E0] bg-white p-5 shadow-sm sm:p-6 ${loading ? "lexy-chase" : ""}`}
        >
          <div className="space-y-2">
            <label htmlFor="sharpen-line" className={label}>
              Your line
            </label>
            <textarea
              id="sharpen-line"
              value={line}
              onChange={(e) => setLine(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) submit();
              }}
              rows={3}
              disabled={loading}
              placeholder="The orbs are actually not the best looking."
              className="w-full resize-none rounded-xl border border-[#EDE8E0] bg-[#FDFBF7] p-4 font-serif text-base leading-relaxed text-[#1C1917] outline-none ring-[#8B7355]/15 placeholder:text-[#C8BFB0] focus:border-[#8B7355] focus:ring-4 disabled:opacity-60"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="sharpen-intent" className={label}>
              What you really mean <span className="font-normal normal-case tracking-normal text-[#B0A898]">— optional</span>
            </label>
            <textarea
              id="sharpen-intent"
              value={intent}
              onChange={(e) => setIntent(e.target.value)}
              rows={2}
              disabled={loading}
              placeholder="They look cheap. I want them to feel premium."
              className="w-full resize-none rounded-xl border border-[#EDE8E0] bg-[#FDFBF7] px-4 py-3 text-sm leading-relaxed text-[#1C1917] outline-none ring-[#8B7355]/15 placeholder:text-[#C8BFB0] focus:border-[#8B7355] focus:ring-4 disabled:opacity-60"
            />
          </div>

          <fieldset className="space-y-2.5">
            <legend className={label}>Tone</legend>
            <div className="flex flex-wrap gap-2">
              {["", ...TONES].map((t) => {
                const on = !customTone.trim() && tone === t;
                return (
                  <button
                    key={t || "mine"}
                    type="button"
                    aria-pressed={on}
                    onClick={() => {
                      setTone(t);
                      setCustomTone("");
                    }}
                    className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${
                      on
                        ? "bg-[#1C1917] text-[#F5EFE0]"
                        : "border border-[#EDE8E0] bg-[#FEFCF8] text-[#8B7355] hover:border-[#8B7355]/50"
                    }`}
                  >
                    {t || "My own"}
                  </button>
                );
              })}
            </div>
            <input
              value={customTone}
              onChange={(e) => setCustomTone(e.target.value)}
              disabled={loading}
              aria-label="Describe the tone in your own words"
              placeholder="…or describe it: firm but kind, like a friend who's also my boss"
              className="w-full rounded-xl border border-[#EDE8E0] bg-[#FDFBF7] px-4 py-2.5 text-sm text-[#1C1917] outline-none ring-[#8B7355]/15 placeholder:text-[#C8BFB0] focus:border-[#8B7355] focus:ring-4"
            />
          </fieldset>

          <button
            type="submit"
            disabled={loading || !line.trim()}
            className="w-full rounded-full bg-[#1C1917] py-3.5 text-sm font-semibold text-[#F5EFE0] transition hover:bg-[#2C2920] disabled:opacity-40"
          >
            {loading ? "Finding the exact words…" : "Sharpen"}
          </button>
        </form>
      )}

      {error && <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p>}

      <AnimatePresence mode="wait">
        {result && asked && (
          <motion.div
            key={`${asked.line}|${asked.tone}`}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="space-y-8"
          >
            <Diagnosis line={asked.line} result={result} />

            <section className="space-y-3">
              <div className="flex items-baseline justify-between gap-3">
                <h2 className="font-serif text-lg font-bold text-[#1C1917] sm:text-xl">Said exactly</h2>
                <p className="text-[11px] text-[#B0A898]">{asked.tone ? `asked for: ${asked.tone}` : "in your own tone"}</p>
              </div>
              {result.versions.map((v, i) => (
                <VersionCard key={`${v.tone}-${i}`} version={v} best={i === 0} />
              ))}
            </section>

            <section className="space-y-2.5">
              <p className={label}>Try another tone</p>
              <div className="flex flex-wrap gap-2">
                {TONES.filter((t) => t !== asked.tone).map((t) => (
                  <button
                    key={t}
                    type="button"
                    disabled={loading}
                    onClick={() => {
                      setTone(t);
                      setCustomTone("");
                      void run({ ...asked, tone: t });
                    }}
                    className="rounded-full border border-[#EDE8E0] bg-[#FEFCF8] px-3.5 py-1.5 text-xs font-semibold text-[#8B7355] transition hover:border-[#8B7355]/50 disabled:opacity-40"
                  >
                    {t}
                  </button>
                ))}
              </div>
              {loading && <p className="text-xs italic text-[#8B7355]">Re-sharpening…</p>}
            </section>

            {result.words.length > 0 && <WordsToKeep words={result.words} versions={result.versions} />}

            <div className="flex flex-col gap-2 sm:flex-row">
              <button
                type="button"
                onClick={() => setResult(null)}
                className="flex-1 rounded-full border border-[#EDE8E0] py-3 text-sm font-medium text-[#6A6360] hover:border-[#8B7355]"
              >
                Edit and sharpen again
              </button>
              <button
                type="button"
                onClick={() => {
                  setResult(null);
                  setLine("");
                  setIntent("");
                }}
                className="flex-1 rounded-full bg-[#1C1917] py-3 text-sm font-semibold text-[#F5EFE0] hover:bg-[#2C2920]"
              >
                Sharpen a new line
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/** Their line with the vague parts marked, and what Lexy took them to mean. */
function Diagnosis({ line, result }: { line: string; result: SharpenResult }) {
  const segments = splitByPhrases(
    line,
    result.vague.map((v) => v.phrase)
  );
  return (
    <section className="space-y-4 rounded-2xl border border-[#EDE8E0] bg-[#FBF8F2] p-5 sm:p-6">
      <div>
        <p className={label}>Your line</p>
        <p className="mt-2 font-serif text-lg leading-relaxed text-[#4A4340]">
          {segments.map((s, i) =>
            s.mark == null ? (
              <span key={i}>{s.text}</span>
            ) : (
              <span
                key={i}
                title={result.vague[s.mark]?.why}
                className="underline decoration-[#B5563E]/60 decoration-wavy decoration-1 underline-offset-[5px]"
              >
                {s.text}
              </span>
            )
          )}
        </p>
      </div>
      {result.vague.length > 0 && (
        <ul className="space-y-1.5">
          {result.vague.map((v) => (
            <li key={v.phrase} className="text-[13px] leading-snug text-[#6A6360]">
              <span className="font-semibold text-[#1C1917]">“{v.phrase}”</span> — {v.why}
            </li>
          ))}
        </ul>
      )}
      {result.intent && (
        <div className="border-t border-[#EDE8E0] pt-4">
          <p className={label}>What you mean</p>
          <p className="mt-1.5 text-sm italic leading-relaxed text-[#4A4340]">{result.intent}</p>
        </div>
      )}
    </section>
  );
}

function VersionCard({ version, best }: { version: SharpenVersion; best: boolean }) {
  const [copied, setCopied] = useState(false);
  const segments = splitByPhrases(
    version.text,
    version.swaps.map((s) => s.to)
  );

  async function copy() {
    try {
      await navigator.clipboard.writeText(version.text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      /* select-and-copy still works */
    }
  }

  return (
    <article
      className={`rounded-2xl border bg-white p-5 shadow-sm sm:p-6 ${
        best ? "border-[#1C1917]/15 shadow-[0_8px_30px_rgba(28,25,23,0.07)]" : "border-[#EDE8E0]"
      }`}
    >
      <div className="flex items-center justify-between gap-3">
        <p className="flex items-center gap-2">
          <span className="rounded-full bg-[#F5EFE0] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#8B7355]">
            {version.tone}
          </span>
          {best && <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#B0A898]">Best fit</span>}
        </p>
        <button
          type="button"
          onClick={() => void copy()}
          className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#8B7355] hover:text-[#1C1917]"
        >
          {copied ? "Copied" : "Copy"}
        </button>
      </div>

      <p className={`mt-3 font-serif leading-relaxed text-[#1C1917] ${best ? "text-xl sm:text-[1.4rem]" : "text-[17px]"}`}>
        {segments.map((s, i) =>
          s.mark == null ? (
            <span key={i}>{s.text}</span>
          ) : (
            <mark key={i} className="rounded-[3px] bg-[#EFE5D2] px-0.5 text-[#1C1917]">
              {s.text}
            </mark>
          )
        )}
      </p>

      {version.swaps.length > 0 && (
        <ul className="mt-4 space-y-2 border-t border-[#F5F0EA] pt-4">
          {version.swaps.map((s, i) => (
            <li key={i} className="text-[13px] leading-snug text-[#6A6360]">
              <span className="text-[#B0A898] line-through decoration-[#B0A898]/60">{s.from}</span>
              <span className="mx-1.5 text-[#C8BFB0]">→</span>
              <span className="font-semibold text-[#1C1917]">{s.to}</span>
              {s.why && <span> — {s.why}</span>}
            </li>
          ))}
        </ul>
      )}
    </article>
  );
}

/** The exact words the versions reached for — tap one to make it yours. */
function WordsToKeep({ words, versions }: { words: SharpenWord[]; versions: SharpenVersion[] }) {
  const upsertWord = useLexicon((s) => s.upsertWord);
  const [open, setOpen] = useState<string | null>(null);
  const [sentence, setSentence] = useState("");
  const [rating, setRating] = useState(7.5);
  const [saved, setSaved] = useState<string[]>([]);
  const [burst, setBurst] = useState(false);
  const selected = words.find((w) => w.word.toLowerCase() === open) ?? null;

  function add(w: SharpenWord) {
    if (!sentence.trim()) return;
    const example =
      versions.find((v) => v.text.toLowerCase().includes(w.word.toLowerCase()))?.text ?? versions[0]?.text ?? "";
    upsertWord({
      word: w.word,
      pronunciation: w.pronunciation,
      part_of_speech: w.part_of_speech,
      definition: w.definition,
      example,
      origin: "",
      rating,
      added: todayISODate(),
      source: "sharpen",
      user_sentence: sentence.trim(),
    });
    playLexiconChime();
    setBurst(true);
    setSaved((s) => [...s, w.word.toLowerCase()]);
    setTimeout(() => setBurst(false), 700);
  }

  return (
    <section className="space-y-3">
      <h2 className="font-serif text-lg font-bold text-[#1C1917] sm:text-xl">Words worth keeping</h2>
      <div className="flex flex-wrap gap-2">
        {words.map((w) => {
          const key = w.word.toLowerCase();
          const on = key === open;
          const kept = saved.includes(key);
          return (
            <button
              key={key}
              type="button"
              aria-expanded={on}
              onClick={() => {
                setOpen(on ? null : key);
                setSentence("");
                setRating(7.5);
              }}
              className={`rounded-full px-4 py-2 font-serif text-sm transition ${
                on
                  ? "bg-[#1C1917] text-[#F5EFE0]"
                  : "border border-[#EDE8E0] bg-white text-[#1C1917] hover:border-[#8B7355]/50"
              }`}
            >
              {w.word}
              {kept && <span className="ml-1.5 text-[#1C7A40]">✓</span>}
            </button>
          );
        })}
      </div>

      <AnimatePresence mode="wait">
        {selected && (
          <motion.div
            key={selected.word}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="relative overflow-hidden rounded-2xl border border-[#EDE8E0] bg-white p-5 shadow-sm sm:p-6"
          >
            <AddWordBurst show={burst} />
            <h3 className="font-serif text-2xl font-bold text-[#1C1917]">{selected.word}</h3>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <IPA className="text-sm">{selected.pronunciation}</IPA>
              <PronounceButton word={selected.word} />
              {selected.part_of_speech && (
                <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#B0A898]">
                  {selected.part_of_speech}
                </span>
              )}
            </div>
            {selected.definition && <p className="mt-3 text-sm leading-relaxed text-[#4A4340]">{selected.definition}</p>}
            {selected.why && <p className="mt-2 text-sm italic leading-relaxed text-[#6A6360]">{selected.why}</p>}

            <div className="mt-5 border-t border-[#F5F0EA] pt-5">
              <p className="text-sm italic text-[#8B7355]">
                Rate it, write it in a sentence, then keep it. {FAVOURITE_THRESHOLD}+ becomes a favourite.
              </p>
              <div className="mt-4">
                <SentenceCapture word={selected.word} value={sentence} onChange={setSentence} id="sharpen-sentence" />
              </div>
              <div className="mt-5">
                <RatingDial value={rating} onChange={setRating} id="sharpen-rating" label="Rating" />
              </div>
              <button
                type="button"
                onClick={() => add(selected)}
                disabled={!sentence.trim()}
                className="mt-4 w-full rounded-full bg-[#1C1917] py-3 text-sm font-semibold text-[#F5EFE0] transition hover:bg-[#2C2920] disabled:opacity-40"
              >
                {saved.includes(selected.word.toLowerCase()) ? "Saved to my lexicon" : "Add to my lexicon"}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
