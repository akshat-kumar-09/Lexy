"use client";

import { KeepWord } from "@/components/KeepWord";
import { useLexicon } from "@/lib/store";
import { RUNGS, type LadderOption, type PhraseLadderResult } from "@/lib/phraseLadder";
import { splitByPhrases } from "@/lib/textMarks";
import { AnimatePresence, motion } from "framer-motion";
import { useId, useState } from "react";

const label = "text-[10px] font-semibold uppercase tracking-[0.16em] text-[#8B7355]";

/** The rung markers deepen as the ladder climbs: parchment → oxblood. */
const RUNG_DOT = ["#E7D9C1", "#C9A27E", "#9A5E4D", "#6E3A31"];

/**
 * A ladder of substitutes, subtle at the bottom of the climb and Shakespearean at the top.
 * Tap one to see it in the line, copy it, or rate it to keep it in My Lexy.
 */
export function PhraseLadder({ ladder, keyPrefix }: { ladder: PhraseLadderResult; keyPrefix: string }) {
  const [open, setOpen] = useState<string | null>(null);
  const lexicon = useLexicon((s) => s.words);

  return (
    <ol className="space-y-5">
      {ladder.rungs.map((rung) => {
        const i = RUNGS.findIndex((r) => r.id === rung.level);
        const def = RUNGS[i];
        return (
          <li key={rung.level} className="relative pl-6">
            <span
              aria-hidden
              className="absolute left-0 top-1 rounded-full"
              style={{ background: RUNG_DOT[i], width: 10 + i * 2, height: 10 + i * 2, marginLeft: -i }}
            />
            {i < RUNGS.length - 1 && (
              <span aria-hidden className="absolute bottom-[-1.25rem] left-[4px] top-5 w-px bg-[#EDE8E0]" />
            )}
            <p className="flex flex-wrap items-baseline gap-x-2">
              <span className={label}>{def.label}</span>
              <span className="text-[11px] text-[#B0A898]">{def.hint}</span>
            </p>
            <div className="mt-2 space-y-2">
              {rung.options.map((o) => {
                const key = `${keyPrefix}|${o.text.toLowerCase()}`;
                const on = open === key;
                const kept = lexicon[o.text.toLowerCase()];
                return (
                  <div
                    key={key}
                    className={`overflow-hidden rounded-2xl border bg-white transition ${
                      on ? "border-[#1C1917]/15 shadow-[0_8px_30px_rgba(28,25,23,0.07)]" : "border-[#EDE8E0]"
                    }`}
                  >
                    <button
                      type="button"
                      aria-expanded={on}
                      onClick={() => setOpen(on ? null : key)}
                      className="flex min-h-12 w-full items-start justify-between gap-3 px-4 py-3 text-left"
                    >
                      <span className="min-w-0">
                        <span className="block font-serif text-[17px] leading-snug text-[#1C1917]">{o.text}</span>
                        {o.note && <span className="mt-0.5 block text-[13px] leading-snug text-[#6A6360]">{o.note}</span>}
                      </span>
                      {kept ? (
                        <span className="mt-0.5 shrink-0 text-xs font-semibold tabular-nums text-[#8B7355]">
                          {kept.rating.toFixed(1)}
                        </span>
                      ) : (
                        <span aria-hidden className={`mt-1 shrink-0 text-[#C8BFB0] transition ${on ? "rotate-45" : ""}`}>
                          +
                        </span>
                      )}
                    </button>
                    <AnimatePresence initial={false}>
                      {on && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.22 }}
                        >
                          <OptionDetail option={o} target={ladder.target} />
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

function OptionDetail({ option, target }: { option: LadderOption; target: string }) {
  const [copied, setCopied] = useState(false);
  const sentenceId = `phrase-sentence-${useId()}`;
  const shown = option.line || option.text;

  async function copy() {
    try {
      await navigator.clipboard.writeText(shown);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      /* select-and-copy still works */
    }
  }

  return (
    <div className="space-y-4 border-t border-[#F5F0EA] px-4 pb-5 pt-4">
      {option.line && (
        <div className="flex items-start justify-between gap-3">
          <p className="font-serif text-[17px] leading-relaxed text-[#1C1917]">
            {splitByPhrases(option.line, [option.text]).map((s, i) =>
              s.mark == null ? (
                <span key={i}>{s.text}</span>
              ) : (
                <mark key={i} className="rounded-[3px] bg-[#EFE5D2] px-0.5 text-[#1C1917]">
                  {s.text}
                </mark>
              )
            )}
          </p>
          <button
            type="button"
            onClick={() => void copy()}
            className="min-h-9 shrink-0 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#8B7355] hover:text-[#1C1917]"
          >
            {copied ? "Copied" : "Copy"}
          </button>
        </div>
      )}
      <KeepWord
        sentenceId={sentenceId}
        label={`Rate “${option.text}” to keep it`}
        base={{
          word: option.text,
          pronunciation: "",
          part_of_speech: /\s/.test(option.text) ? "phrase" : "",
          definition: [option.note, `in place of “${target}”`].filter(Boolean).join(" — "),
          example: option.line ?? "",
          origin: "",
          source: "phrases",
        }}
      />
    </div>
  );
}
