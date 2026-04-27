"use client";

import { THREAD_INSPIRATION_EXAMPLES } from "@/lib/threads";
import { MAX_GENRES, useTasteProfile } from "@/lib/store";
import { useState } from "react";

type Props = {
  compact?: boolean;
  className?: string;
  /** Light (settings/cards) vs dark (home jewel card) */
  variant?: "light" | "dark";
  /** Hide the uppercase “Your threads” line when the parent already introduced the section */
  hideBrandTitle?: boolean;
};

export function GenreStrip({ compact, className = "", variant = "light", hideBrandTitle }: Props) {
  const threads = useTasteProfile((s) => s.threads);
  const addThreadsFromInput = useTasteProfile((s) => s.addThreadsFromInput);
  const removeThread = useTasteProfile((s) => s.removeThread);
  const clearThreads = useTasteProfile((s) => s.clearThreads);

  const [draft, setDraft] = useState("");
  const [examplesOpen, setExamplesOpen] = useState(!compact);

  const isDark = variant === "dark";
  const labelMuted = isDark ? "text-[#B0A898]" : "text-[#B0A898]";
  const bodyMuted = isDark ? "text-[#A8A098]" : "text-[#8B7355]";
  const chipOn = isDark
    ? "border-[#8B7355] bg-[#2A2520] text-[#F5EFE0] shadow-[0_0_0_1px_rgba(139,115,85,0.25)]"
    : "border-[#8B7355] bg-[#F5EFE0] text-[#1C1917] shadow-sm";
  const chipOff = isDark
    ? "border-[#3D3830] bg-[#252220] text-[#C8BFB0] active:border-[#8B7355]/55"
    : "border-[#EDE8E0] bg-white text-[#4A4340] active:border-[#8B7355]/45";
  const inputCls = isDark
    ? "rounded-xl border border-[#3D3830] bg-[#252220] px-3 py-2.5 text-sm text-[#F5EFE0] outline-none placeholder:text-[#6A6360] focus:border-[#8B7355]"
    : "rounded-xl border border-[#EDE8E0] bg-white px-3 py-2.5 text-sm text-[#1C1917] outline-none placeholder:text-[#B0A898] focus:border-[#8B7355] focus:ring-4 focus:ring-[#8B7355]/15";
  const primaryBtn = isDark
    ? "rounded-xl bg-[#8B7355] px-4 py-2.5 text-xs font-semibold uppercase tracking-[0.1em] text-[#1C1917] active:opacity-90"
    : "rounded-xl bg-[#1C1917] px-4 py-2.5 text-xs font-semibold uppercase tracking-[0.1em] text-[#F5EFE0] active:opacity-90";

  function submit() {
    addThreadsFromInput(draft);
    setDraft("");
  }

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div className="min-w-0 flex-1 space-y-2">
          {!hideBrandTitle && (
            <p
              className={`font-semibold uppercase tracking-[0.14em] ${labelMuted} ${compact ? "text-[9px]" : "text-[10px]"}`}
            >
              Your threads
            </p>
          )}
          <p className={`${compact ? "text-[11px] leading-snug" : "text-xs leading-relaxed"} ${bodyMuted}`}>
            Type anything you want language to <span className="italic">orbit</span> — a tradition, a mood, a virtue, a
            domain. Lexy suggests words and metaphors in that neighborhood (including synonyms and fresh angles). Up to{" "}
            {MAX_GENRES} threads; not permanent, just what you&apos;re exploring now.
          </p>
          <div className={`rounded-xl border px-3 py-2.5 text-[11px] leading-relaxed sm:text-xs ${isDark ? "border-[#3D3830] bg-[#252220]/80 text-[#C8BFB0]" : "border-[#EDE8E0] bg-[#FDFBF7] text-[#5c5550]"}`}>
            <p className={`font-semibold ${isDark ? "text-[#8B7355]" : "text-[#8B7355]"}`}>How it works</p>
            <ul className="mt-2 list-inside list-disc space-y-1.5 marker:text-[#8B7355]">
              <li>
                <strong className={isDark ? "text-[#F5EFE0]" : "text-[#1C1917]"}>Deep Dive</strong> proposes ~25 lemmas
                tuned to your lexicon ratings — and half or more lean into your threads (near-synonyms, register, related
                ideas).
              </li>
              <li>
                <strong className={isDark ? "text-[#F5EFE0]" : "text-[#1C1917]"}>Metaphors</strong> imagines figurative
                language in the same orbit — wearable images, not dictionary entries of your phrase.
              </li>
              <li>
                Empty threads is fine: Lexy still follows ratings alone. Threads add <em>your</em> direction for the day.
              </li>
            </ul>
          </div>
        </div>
        {threads.length > 0 && (
          <button
            type="button"
            onClick={clearThreads}
            className={`min-h-10 shrink-0 px-2 text-[10px] font-semibold uppercase tracking-[0.1em] text-[#8B7355] underline-offset-2 active:opacity-70 sm:min-h-0`}
          >
            Clear
          </button>
        )}
      </div>

      <div className={`flex flex-col gap-2 sm:flex-row ${compact ? "sm:items-stretch" : ""}`}>
        <input
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), submit())}
          placeholder="e.g. Sanatan Dharma · spiritual grammar · Greatness · monsoon mind…"
          className={`min-w-0 flex-1 ${inputCls}`}
          maxLength={120}
          aria-label="Add exploration thread"
        />
        <button
          type="button"
          onClick={submit}
          disabled={!draft.trim() || threads.length >= MAX_GENRES}
          className={`shrink-0 disabled:cursor-not-allowed disabled:opacity-40 ${primaryBtn}`}
        >
          Add
        </button>
      </div>

      {threads.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {threads.map((t) => (
            <span
              key={t}
              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-left text-xs font-semibold ${chipOn}`}
            >
              <span className="max-w-[14rem] truncate font-serif">{t}</span>
              <button
                type="button"
                onClick={() => removeThread(t)}
                className="rounded-full px-1 text-[10px] font-bold leading-none opacity-70 hover:opacity-100"
                aria-label={`Remove ${t}`}
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}

      <div className="space-y-2">
        <button
          type="button"
          onClick={() => setExamplesOpen((o) => !o)}
          className={`text-[10px] font-semibold uppercase tracking-[0.12em] text-[#8B7355] underline-offset-2 hover:underline`}
        >
          {examplesOpen ? "Hide" : "Show"} example threads ({THREAD_INSPIRATION_EXAMPLES.length} ideas)
        </button>
        {examplesOpen && (
          <div
            className={`max-h-[min(40vh,16rem)] overflow-y-auto rounded-xl border p-3 ${isDark ? "border-[#3D3830] bg-[#1C1917]/50" : "border-[#EDE8E0] bg-white"}`}
          >
            <p className={`mb-2 text-[10px] font-medium uppercase tracking-[0.1em] ${labelMuted}`}>
              Tap to add (you can edit later by removing and retyping)
            </p>
            <div className="flex flex-wrap gap-2">
              {THREAD_INSPIRATION_EXAMPLES.map((ex) => {
                const on = threads.some((x) => x.toLowerCase() === ex.toLowerCase());
                const atCap = !on && threads.length >= MAX_GENRES;
                return (
                  <button
                    key={ex}
                    type="button"
                    disabled={on || atCap}
                    onClick={() => addThreadsFromInput(ex)}
                    className={`max-w-full rounded-full border px-2.5 py-1.5 text-left text-[11px] font-serif leading-snug transition sm:text-xs ${
                      on ? chipOn : chipOff
                    } ${atCap ? "cursor-not-allowed opacity-45" : ""}`}
                  >
                    {ex}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
