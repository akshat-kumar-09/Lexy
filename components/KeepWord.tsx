"use client";

import { AddWordBurst } from "@/components/AddWordBurst";
import { RateBar } from "@/components/RateBar";
import { SentenceCapture } from "@/components/SentenceCapture";
import { playLexiconChime } from "@/lib/sound";
import { todayISODate, useLexicon } from "@/lib/store";
import type { LexiconWord } from "@/lib/types";
import { useEffect, useState } from "react";

export type KeepWordBase = Omit<LexiconWord, "rating" | "added" | "user_sentence">;

/** What was already saved wins; this feature's details only fill the gaps. */
function mergeEntry(base: KeepWordBase, existing: LexiconWord | undefined, rating: number, sentence: string): LexiconWord {
  const filled = existing
    ? (Object.fromEntries(
        Object.entries(existing).filter(([, v]) => v !== "" && v !== undefined && v !== null)
      ) as Partial<LexiconWord>)
    : {};
  const s = sentence.trim();
  return {
    ...base,
    ...filled,
    rating,
    added: existing?.added || todayISODate(),
    ...(s ? { user_sentence: s } : {}),
  } as LexiconWord;
}

/**
 * Rate a word to keep it — the one control every feature uses. Rating saves straight away
 * (no sentence needed); the sentence is optional and saved when you leave the box.
 */
export function KeepWord({
  base,
  label,
  sentenceId,
  onKept,
}: {
  base: KeepWordBase;
  label?: string;
  sentenceId?: string;
  onKept?: (rating: number) => void;
}) {
  const key = base.word.toLowerCase();
  const saved = useLexicon((s) => s.words[key]);
  const upsertWord = useLexicon((s) => s.upsertWord);
  const [sentence, setSentence] = useState(saved?.user_sentence ?? "");
  const [burst, setBurst] = useState(false);

  useEffect(() => {
    setSentence(useLexicon.getState().words[key]?.user_sentence ?? "");
  }, [key]);

  function rate(v: number) {
    const existing = useLexicon.getState().words[key];
    upsertWord(mergeEntry(base, existing, v, sentence));
    if (!existing) {
      playLexiconChime();
      setBurst(true);
      window.setTimeout(() => setBurst(false), 700);
    }
    onKept?.(v);
  }

  function saveSentence() {
    const existing = useLexicon.getState().words[key];
    if (!existing) return;
    const s = sentence.trim();
    if (s === (existing.user_sentence ?? "")) return;
    const next: LexiconWord = { ...existing, user_sentence: s };
    if (!s) delete next.user_sentence;
    upsertWord(next);
  }

  return (
    <div className="relative space-y-5">
      <AddWordBurst show={burst} />
      <RateBar value={saved ? saved.rating : null} onCommit={rate} label={label ?? `Rate “${base.word}”`} />
      <SentenceCapture
        word={base.word}
        value={sentence}
        onChange={setSentence}
        onBlur={saveSentence}
        id={sentenceId}
      />
    </div>
  );
}
