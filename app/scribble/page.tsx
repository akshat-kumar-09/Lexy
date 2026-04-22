"use client";

import { AddWordBurst } from "@/components/AddWordBurst";
import { IPA } from "@/components/IPA";
import { RatingDial } from "@/components/RatingDial";
import { ScribbleLexiconSidebar } from "@/components/ScribbleLexiconSidebar";
import { analyseScribble, readHandwriting } from "@/lib/openai";
import { playLexiconChime } from "@/lib/sound";
import { useLexicon, useSettings, todayISODate } from "@/lib/store";
import type { ScribbleAnalysis, VocabularyCandidate } from "@/lib/types";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import { useCallback, useState } from "react";

function fileToBase64(file: File): Promise<{ base64: string; mediaType: string }> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => {
      const data = r.result as string;
      const m = data.match(/^data:([^;]+);base64,(.+)$/);
      if (!m) {
        reject(new Error("Could not read image"));
        return;
      }
      resolve({ mediaType: m[1], base64: m[2] });
    };
    r.onerror = () => reject(r.error);
    r.readAsDataURL(file);
  });
}

export default function ScribblePage() {
  const apiKey = useSettings((s) => s.openaiApiKey);
  const upsertWord = useLexicon((s) => s.upsertWord);

  const [tab, setTab] = useState<"photo" | "text">("text");
  const [pasted, setPasted] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [rawText, setRawText] = useState<string | null>(null);
  const [loadingRead, setLoadingRead] = useState(false);
  const [loadingAnalyse, setLoadingAnalyse] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ScribbleAnalysis | null>(null);
  const [burst, setBurst] = useState<string | null>(null);
  const [ratings, setRatings] = useState<Record<string, number>>({});

  const onPickFile = useCallback((f: File | null) => {
    setFile(f);
    setError(null);
    setRawText(null);
    setResult(null);
    if (f) setPreview(URL.createObjectURL(f));
    else setPreview(null);
  }, []);

  async function handleReadPhoto() {
    if (!apiKey) {
      setError("Add your OpenAI API key in Settings first.");
      return;
    }
    if (!file) return;
    setLoadingRead(true);
    setError(null);
    try {
      const { base64, mediaType } = await fileToBase64(file);
      const text = await readHandwriting(apiKey, base64, mediaType);
      setRawText(text);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not read handwriting");
    } finally {
      setLoadingRead(false);
    }
  }

  async function runAnalyse(text: string) {
    if (!apiKey) {
      setError("Add your OpenAI API key in Settings first.");
      return;
    }
    setLoadingAnalyse(true);
    setError(null);
    try {
      const r = await analyseScribble(apiKey, text);
      setResult(r);
      const init: Record<string, number> = {};
      for (const c of r.vocabulary_candidates) {
        init[c.word.toLowerCase()] = 7;
      }
      setRatings(init);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Analysis failed");
    } finally {
      setLoadingAnalyse(false);
    }
  }

  function handleAnalysePasted() {
    const t = pasted.trim();
    if (!t) return;
    setRawText(t);
    void runAnalyse(t);
  }

  function reset() {
    setRawText(null);
    setResult(null);
    setPasted("");
    setFile(null);
    setPreview(null);
    setError(null);
  }

  const analysedText = (rawText ?? pasted).trim();

  function addCandidate(c: VocabularyCandidate) {
    const key = c.word.toLowerCase();
    const r = ratings[key] ?? 7;
    upsertWord({
      word: c.word,
      pronunciation: c.pronunciation,
      part_of_speech: c.part_of_speech,
      definition: c.definition,
      example: c.example_sentence,
      origin: c.origin,
      rating: r,
      added: todayISODate(),
      source: "scribble",
    });
    playLexiconChime();
    setBurst(c.word);
    setTimeout(() => setBurst(null), 700);
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 lg:flex-row lg:items-start lg:gap-10">
      <div className="min-w-0 flex-1 space-y-8">
      <div>
        <h1 className="font-serif text-3xl font-bold text-[#1C1917]">Morning Scribble</h1>
        <p className="mt-2 font-serif text-sm italic leading-relaxed text-[#8B7355]">
          Upload a page from your journal or paste what you wrote. Lexy reads it, lifts the language, and finds words
          that fit the way you think.
        </p>
      </div>

      {!result && (
        <div className="flex gap-2 rounded-2xl border border-[#EDE8E0] bg-white p-1">
          {(["text", "photo"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => {
                setTab(t);
                setError(null);
              }}
              className={`flex-1 rounded-xl py-2.5 text-xs font-semibold uppercase tracking-[0.1em] transition ${
                tab === t ? "bg-[#1C1917] text-[#F5EFE0]" : "text-[#B0A898] hover:text-[#1C1917]"
              }`}
            >
              {t === "photo" ? "Photo" : "Type or paste"}
            </button>
          ))}
        </div>
      )}

      {!result && tab === "photo" && (
        <div className="space-y-4">
          <label className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-[#EDE8E0] bg-white px-6 py-14 transition hover:border-[#8B7355]/50">
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,image/heic"
              className="hidden"
              onChange={(e) => onPickFile(e.target.files?.[0] ?? null)}
            />
            <span className="text-sm font-medium text-[#6A6360]">Tap to choose a photo</span>
            <span className="mt-1 text-xs text-[#B0A898]">JPG, PNG, WebP</span>
          </label>
          {preview && (
            <Image
              src={preview}
              alt="Your scribble"
              width={800}
              height={600}
              unoptimized
              className="max-h-64 w-auto rounded-xl border border-[#EDE8E0]"
            />
          )}
          {file && (
            <button
              type="button"
              disabled={loadingRead}
              onClick={() => void handleReadPhoto()}
              className="w-full rounded-full bg-[#1C1917] py-3.5 text-sm font-semibold text-[#F5EFE0] disabled:opacity-50"
            >
              {loadingRead ? "Reading your handwriting…" : "Read my handwriting"}
            </button>
          )}
          {rawText && (
            <div className="rounded-xl bg-[#F9F6F0] p-4 font-serif text-sm italic leading-relaxed text-[#6A6360]">
              {rawText}
            </div>
          )}
          {rawText && (
            <button
              type="button"
              disabled={loadingAnalyse}
              onClick={() => void runAnalyse(rawText)}
              className="w-full rounded-full border border-[#8B7355] py-3.5 text-sm font-semibold text-[#1C1917] disabled:opacity-50"
            >
              {loadingAnalyse ? "Doing the full treatment…" : "Analyse this writing"}
            </button>
          )}
        </div>
      )}

      {!result && tab === "text" && (
        <div className="space-y-4">
          <textarea
            value={pasted}
            onChange={(e) => setPasted(e.target.value)}
            placeholder="This morning something is shifting. I said less than I meant…"
            rows={10}
            className="w-full rounded-2xl border border-[#EDE8E0] bg-white p-4 text-sm leading-relaxed text-[#1C1917] outline-none ring-[#8B7355]/15 focus:border-[#8B7355] focus:ring-4"
          />
          <button
            type="button"
            disabled={loadingAnalyse || !pasted.trim()}
            onClick={() => void handleAnalysePasted()}
            className="w-full rounded-full bg-[#1C1917] py-3.5 text-sm font-semibold text-[#F5EFE0] disabled:opacity-40"
          >
            {loadingAnalyse ? "Doing the full treatment…" : "Analyse my writing"}
          </button>
        </div>
      )}

      {error && (
        <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p>
      )}

      <AnimatePresence>
        {result && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            <div className="relative overflow-hidden rounded-2xl border border-[#EDE8E0] bg-white">
              <div className="snap-x-scroll flex gap-3 overflow-x-auto pb-2 pt-1">
                {[
                  { id: "up", label: "Upgraded" },
                  { id: "wu", label: "Precision" },
                  { id: "ideas", label: "Ideas" },
                  { id: "words", label: "New words" },
                ].map((x) => (
                  <a
                    key={x.id}
                    href={`#scribble-${x.id}`}
                    className="snap-card shrink-0 rounded-full border border-[#EDE8E0] bg-[#FEFCF8] px-4 py-2 text-xs font-semibold uppercase tracking-[0.08em] text-[#8B7355]"
                  >
                    {x.label}
                  </a>
                ))}
              </div>
            </div>

            <section id="scribble-up" className="scroll-mt-32 space-y-3 md:scroll-mt-24">
              <h2 className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#B0A898]">Rewritten</h2>
              <div className="rounded-2xl border border-[#EDE8E0] bg-white p-4 font-serif text-base leading-[1.85] text-[#1C1917] shadow-sm sm:p-6 sm:text-[17px] sm:leading-[2]">
                {result.upgraded_version}
              </div>
            </section>

            <section id="scribble-wu" className="scroll-mt-32 space-y-3 md:scroll-mt-24">
              <h2 className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#B0A898]">
                Where one word changes everything
              </h2>
              <div className="space-y-3">
                {result.word_upgrades.map((u, i) => (
                  <div key={i} className="rounded-2xl bg-[#F5EFE0] p-5">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#8B7355]">Before</p>
                    <p className="mt-1 text-sm text-[#B0A898] line-through">{u.original_phrase}</p>
                    <p className="mt-3 font-serif text-lg font-semibold text-[#1C1917]">
                      {u.upgraded_word}{" "}
                      <IPA>
                        <span className="text-base">{u.pronunciation}</span>
                      </IPA>
                    </p>
                    <p className="mt-2 text-sm italic leading-relaxed text-[#6A6360]">{u.why}</p>
                  </div>
                ))}
              </div>
            </section>

            <section id="scribble-ideas" className="scroll-mt-32 space-y-3 md:scroll-mt-24">
              <h2 className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#B0A898]">Ideas, opened</h2>
              <div className="space-y-3">
                {result.key_idea_expansions.map((ex, i) => (
                  <div key={i} className="rounded-2xl border border-[#EDE8E0] bg-white p-5">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#B0A898]">Your thread</p>
                    <p className="mt-2 font-serif text-lg font-bold text-[#1C1917]">{ex.idea}</p>
                    <p className="mt-3 font-serif text-sm italic leading-relaxed text-[#4A4340]">{ex.expansion}</p>
                  </div>
                ))}
              </div>
            </section>

            <section id="scribble-words" className="scroll-mt-32 space-y-4 md:scroll-mt-24">
              <h2 className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#B0A898]">
                Words that felt right for you
              </h2>
              <p className="text-sm italic text-[#8B7355]">Rate each word, then add it to your lexicon. 7.7+ becomes a favourite.</p>
              <div className="space-y-4">
                {result.vocabulary_candidates.map((c) => {
                  const key = c.word.toLowerCase();
                  return (
                    <div key={key} className="relative overflow-hidden rounded-2xl border border-[#EDE8E0] bg-white p-5 shadow-sm">
                      <AddWordBurst show={burst === c.word} />
                      <h3 className="font-serif text-2xl font-bold text-[#1C1917]">{c.word}</h3>
                      <IPA className="mt-1 block text-sm">{c.pronunciation}</IPA>
                      <p className="mt-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#B0A898]">
                        {c.part_of_speech}
                      </p>
                      <p className="mt-2 text-sm leading-relaxed text-[#4A4340]">{c.definition}</p>
                      <p className="mt-3 border-l-2 border-[#EDE8E0] pl-3 text-sm italic text-[#8B7355]">
                        &ldquo;{c.example_sentence}&rdquo;
                      </p>
                      <p className="mt-3 text-xs leading-relaxed text-[#6A6360]">{c.origin}</p>
                      <p className="mt-3 text-sm italic leading-relaxed text-[#8B7355]">{c.why_relevant}</p>
                      <div className="mt-5">
                        <RatingDial
                          label="Rating"
                          value={ratings[key] ?? 7}
                          onChange={(v) => setRatings((s) => ({ ...s, [key]: v }))}
                          id={`rate-${key}`}
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => addCandidate(c)}
                        className="mt-4 w-full rounded-full bg-[#1C1917] py-3 text-sm font-semibold text-[#F5EFE0] transition hover:bg-[#2C2920]"
                      >
                        Add to my lexicon
                      </button>
                    </div>
                  );
                })}
              </div>
            </section>

            <button
              type="button"
              onClick={reset}
              className="w-full rounded-full border border-[#EDE8E0] py-3 text-sm font-medium text-[#6A6360] hover:border-[#8B7355]"
            >
              New scribble
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {result && (
        <p className="text-center text-xs text-[#B0A898]">
          Original text length: {analysedText.length} characters — your voice, elevated.
        </p>
      )}
      </div>

      <div className="w-full shrink-0 lg:w-[min(100%,280px)] xl:w-[300px]">
        <ScribbleLexiconSidebar />
      </div>
    </div>
  );
}
