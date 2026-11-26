"use client";

import { LexyErrorNote } from "@/components/LexyErrorNote";
import { PhraseLadder } from "@/components/PhraseLadder";
import { findPhraseLadder } from "@/lib/claude";
import { EVERYDAY_PHRASES, PHRASE_GROUPS, everydayLadder, type PhraseGroup } from "@/lib/everydayPhrases";
import { nextSelection, selectedText, tokenize, type PhraseLadderResult, type Selection } from "@/lib/phraseLadder";
import { useOrbUsage } from "@/lib/store";
import { splitByPhrases } from "@/lib/textMarks";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useMemo, useRef, useState } from "react";

const label = "text-[10px] font-semibold uppercase tracking-[0.16em] text-[#8B7355]";

/** Past this, Lexy needs to be told which words to change. */
const WHOLE_LINE_MAX = 120;

/**
 * Turn a phrase: write the line you said, tap the word or phrase that felt worn, and climb
 * from a subtle swap to a Shakespearean flourish. Below, the phrases everyone uses, ready to open.
 */
export function TurnAPhrase() {
  return (
    <div className="mx-auto max-w-3xl space-y-12 pb-10 lg:max-w-4xl">
      <header className="space-y-2">
        <p className={label}>Turn a phrase</p>
        <h1 className="font-serif text-2xl italic leading-[1.15] tracking-tight text-[#1C1917] sm:text-3xl md:text-4xl">
          From everyday to Shakespeare.
        </h1>
        <p className="max-w-xl text-[13px] leading-relaxed text-[#6A6360]">
          Write the line you said, tap the word or phrase that felt worn, and climb from a subtle swap to a
          Shakespearean flourish.
        </p>
      </header>

      <YourLine />
      <EverydayPhrases />
    </div>
  );
}

function YourLine() {
  const [line, setLine] = useState("");
  const [sel, setSel] = useState<Selection>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<PhraseLadderResult | null>(null);
  const resultRef = useRef<HTMLDivElement>(null);
  const recordVisit = useOrbUsage((s) => s.recordVisit);

  const tokens = useMemo(() => tokenize(line), [line]);
  const target = sel ? selectedText(line, tokens, sel[0], sel[1]) : "";
  const trimmed = line.trim();
  const needsTap = !target && trimmed.length > WHOLE_LINE_MAX;
  const canRun = Boolean(trimmed) && !needsTap && !loading;

  useEffect(() => {
    if (result) resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [result]);

  async function run() {
    if (!canRun) return;
    setLoading(true);
    setError(null);
    recordVisit("phrases");
    try {
      setResult(await findPhraseLadder(trimmed, target));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not turn that phrase");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="space-y-6">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void run();
        }}
        className={`space-y-4 rounded-2xl border border-[#EDE8E0] bg-white p-5 shadow-sm sm:p-6 ${loading ? "lexy-chase" : ""}`}
      >
        <div className="space-y-2">
          <label htmlFor="phrase-line" className={label}>
            Your line
          </label>
          <textarea
            id="phrase-line"
            value={line}
            onChange={(e) => {
              setLine(e.target.value);
              setSel(null);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) void run();
            }}
            rows={2}
            maxLength={600}
            disabled={loading}
            placeholder="I want Lexy to be a masterpiece for my language."
            className="w-full resize-none rounded-xl border border-[#EDE8E0] bg-[#FDFBF7] p-4 font-serif text-base leading-relaxed text-[#1C1917] outline-none ring-[#8B7355]/15 placeholder:text-[#C8BFB0] focus:border-[#8B7355] focus:ring-4 disabled:opacity-60"
          />
        </div>

        {tokens.length >= 2 && (
          <div className="space-y-2">
            <p className={label}>
              Tap what to change{" "}
              <span className="font-normal normal-case tracking-normal text-[#B0A898]">
                — tap a second word to take in the phrase between
              </span>
            </p>
            <div className="flex flex-wrap gap-x-1 gap-y-1.5" role="group" aria-label="Words in your line">
              {tokens.map((t, i) => {
                const on = sel != null && i >= sel[0] && i <= sel[1];
                return (
                  <button
                    key={`${t.start}-${t.text}`}
                    type="button"
                    aria-pressed={on}
                    disabled={loading}
                    onClick={() => setSel((s) => nextSelection(s, i))}
                    className={`min-h-9 rounded-lg px-2 font-serif text-[16px] transition ${
                      on ? "bg-[#1C1917] text-[#F5EFE0]" : "bg-[#F7F2E9] text-[#4A4340] hover:bg-[#EFE5D2]"
                    }`}
                  >
                    {t.text}
                  </button>
                );
              })}
            </div>
            <p className="text-[12px] leading-snug text-[#8B7355]" aria-live="polite">
              {target ? (
                <>
                  Changing <span className="font-semibold text-[#1C1917]">“{target}”</span>
                </>
              ) : needsTap ? (
                "Tap the word or phrase you want to change."
              ) : (
                "Nothing tapped — Lexy will turn the whole line."
              )}
            </p>
          </div>
        )}

        <button
          type="submit"
          disabled={!canRun}
          className="w-full rounded-full bg-[#1C1917] py-3.5 text-sm font-semibold text-[#F5EFE0] transition hover:bg-[#2C2920] disabled:opacity-40"
        >
          {loading ? "Climbing from plain to Shakespeare…" : "Climb the ladder"}
        </button>
      </form>

      {error && <LexyErrorNote message={error} />}

      <AnimatePresence mode="wait">
        {result && (
          <motion.div
            ref={resultRef}
            key={result.target}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="scroll-mt-24 space-y-5"
          >
            <div className="space-y-1">
              <h2 className="font-serif text-lg font-bold text-[#1C1917] sm:text-xl">
                Instead of “{result.target}”
              </h2>
              {result.sense && <p className="text-sm italic leading-relaxed text-[#6A6360]">{result.sense}</p>}
            </div>
            <PhraseLadder ladder={result} keyPrefix="mine" />
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}

function EverydayPhrases() {
  const [group, setGroup] = useState<PhraseGroup | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const shown = EVERYDAY_PHRASES.filter((p) => !group || p.group === group);

  return (
    <section className="space-y-4">
      <div className="space-y-1">
        <h2 className="font-serif text-xl font-bold text-[#1C1917] sm:text-2xl">Phrases everyone uses</h2>
        <p className="text-[13px] leading-relaxed text-[#6A6360]">
          The worn ones we all reach for. Open one to see what else you could say.
        </p>
      </div>

      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:px-0 [&::-webkit-scrollbar]:hidden">
        {[null, ...PHRASE_GROUPS].map((g) => {
          const on = group === g;
          return (
            <button
              key={g ?? "all"}
              type="button"
              aria-pressed={on}
              onClick={() => setGroup(g)}
              className={`min-h-9 shrink-0 rounded-full px-3.5 text-xs font-semibold transition ${
                on
                  ? "bg-[#1C1917] text-[#F5EFE0]"
                  : "border border-[#EDE8E0] bg-[#FEFCF8] text-[#8B7355] hover:border-[#8B7355]/50"
              }`}
            >
              {g ?? "All"}
            </button>
          );
        })}
      </div>

      <ul className="divide-y divide-[#F0EAE0] overflow-hidden rounded-2xl border border-[#EDE8E0] bg-white">
        {shown.map((p) => {
          const on = open === p.phrase;
          return (
            <li key={p.phrase}>
              <button
                type="button"
                aria-expanded={on}
                onClick={() => setOpen(on ? null : p.phrase)}
                className="flex min-h-14 w-full items-center justify-between gap-3 px-4 py-3 text-left hover:bg-[#FDFBF7]"
              >
                <span className="min-w-0">
                  <span className="block font-serif text-[17px] text-[#1C1917]">“{p.phrase}”</span>
                  {!group && <span className="block text-[11px] text-[#B0A898]">{p.group}</span>}
                </span>
                <span
                  aria-hidden
                  className={`shrink-0 text-sm text-[#B0A898] transition-transform duration-200 ${on ? "rotate-180" : ""}`}
                >
                  ▾
                </span>
              </button>
              <AnimatePresence initial={false}>
                {on && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.25 }}
                    className="overflow-hidden"
                  >
                    <div className="space-y-5 bg-[#FBF8F2] px-4 pb-6 pt-4">
                      <p className="font-serif text-[15px] italic leading-relaxed text-[#6A6360]">
                        {splitByPhrases(p.example, [p.phrase]).map((s, i) =>
                          s.mark == null ? (
                            <span key={i}>{s.text}</span>
                          ) : (
                            <span
                              key={i}
                              className="underline decoration-[#B5563E]/60 decoration-wavy decoration-1 underline-offset-[5px]"
                            >
                              {s.text}
                            </span>
                          )
                        )}
                      </p>
                      <PhraseLadder ladder={everydayLadder(p)} keyPrefix={p.phrase} />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
