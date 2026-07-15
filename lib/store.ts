"use client";

import { normalizeLexiconPayload } from "@/lib/lexiconMigrate";
import {
  MAX_EXPLORATION_THREADS,
  migrateLegacyGenreIds,
  normalizeThreadLabel,
  normalizeThreadList,
} from "@/lib/threads";
import type {
  LexiconData,
  LexiconWord,
  MetaphorDayEntry,
  ScribbleRewriteEntry,
} from "@/lib/types";
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

const empty: LexiconData = { words: {}, metaphor_history: [], scribble_rewrites: [] };

interface LexiconStore extends LexiconData {
  /**
   * Word keys the user removed locally but the server may not yet have heard
   * about. Cloud sync sends these as `deleted_words` so the server-side merge
   * can apply tombstones — without this a delete on one device would
   * resurrect when another device pulls + re-uploads its full snapshot.
   */
  pending_deletes: string[];
  upsertWord: (w: LexiconWord) => void;
  removeWord: (wordKey: string) => void;
  updateRating: (wordKey: string, rating: number) => void;
  appendMetaphor: (entry: MetaphorDayEntry) => void;
  appendScribbleRewrite: (entry: ScribbleRewriteEntry) => void;
  importLexicon: (data: LexiconData) => void;
  consumePendingDeletes: (keys: string[]) => void;
  exportText: () => string;
  exportLexiconJson: () => string;
}

export const useLexicon = create<LexiconStore>()(
  persist(
    (set, get) => ({
      ...empty,
      pending_deletes: [],
      upsertWord: (w) =>
        set((s) => {
          const k = w.word.toLowerCase();
          const next: Partial<LexiconStore> = {
            words: { ...s.words, [k]: { ...w, word: w.word } },
          };
          if (s.pending_deletes.includes(k)) {
            next.pending_deletes = s.pending_deletes.filter((x) => x !== k);
          }
          return next;
        }),
      removeWord: (wordKey) =>
        set((s) => {
          const k = wordKey.toLowerCase();
          if (!s.words[k]) return s;
          const words = { ...s.words };
          delete words[k];
          const pending_deletes = s.pending_deletes.includes(k)
            ? s.pending_deletes
            : [...s.pending_deletes, k];
          return { words, pending_deletes };
        }),
      updateRating: (wordKey, rating) =>
        set((s) => {
          const k = wordKey.toLowerCase();
          const cur = s.words[k];
          if (!cur) return s;
          return {
            words: {
              ...s.words,
              [k]: { ...cur, rating },
            },
          };
        }),
      appendMetaphor: (entry) =>
        set((s) => {
          const rest = s.metaphor_history.filter((h) => h.date !== entry.date);
          return { metaphor_history: [...rest, entry] };
        }),
      appendScribbleRewrite: (entry) =>
        set((s) => ({
          scribble_rewrites: [entry, ...s.scribble_rewrites].slice(0, 80),
        })),
      importLexicon: (data) =>
        set({
          words: data.words ?? {},
          metaphor_history: data.metaphor_history ?? [],
          scribble_rewrites: data.scribble_rewrites ?? [],
          pending_deletes: [],
        }),
      consumePendingDeletes: (keys) =>
        set((s) => {
          if (!keys.length) return s;
          const drop = new Set(keys.map((k) => k.toLowerCase()));
          const remaining = s.pending_deletes.filter((k) => !drop.has(k));
          if (remaining.length === s.pending_deletes.length) return s;
          return { pending_deletes: remaining };
        }),
      exportText: () => {
        const words = get().words;
        const sorted = Object.values(words).sort((a, b) => b.rating - a.rating);
        return sorted
          .map(
            (d) =>
              `${d.word}  ${d.pronunciation}\n${d.definition}\n${d.example}\nOrigin: ${d.origin}\nRating: ${d.rating}/10\nSource: ${d.source}\n`
          )
          .join("\n---\n\n");
      },
      exportLexiconJson: () => {
        const { words, metaphor_history, scribble_rewrites } = get();
        return JSON.stringify({ words, metaphor_history, scribble_rewrites }, null, 2);
      },
    }),
    {
      name: "lexy-lexicon",
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({
        words: s.words,
        metaphor_history: s.metaphor_history,
        scribble_rewrites: s.scribble_rewrites,
        pending_deletes: s.pending_deletes,
      }),
      merge: (persistedState, currentState) => {
        const p = persistedState as
          | (Partial<LexiconData> & { daily_history?: unknown[]; pending_deletes?: unknown })
          | null
          | undefined;
        if (!p || typeof p !== "object") return currentState;
        const normalized = normalizeLexiconPayload({
          words: (p.words && typeof p.words === "object" ? p.words : currentState.words) as LexiconData["words"],
          metaphor_history: p.metaphor_history,
          daily_history: p.daily_history,
          scribble_rewrites: p.scribble_rewrites,
        });
        if (!normalized) return currentState;
        const pending_deletes = Array.isArray(p.pending_deletes)
          ? Array.from(
              new Set(
                (p.pending_deletes as unknown[])
                  .filter((x): x is string => typeof x === "string")
                  .map((x) => x.toLowerCase().trim())
                  .filter(Boolean)
              )
            )
          : [];
        return {
          ...currentState,
          words: normalized.words,
          metaphor_history: normalized.metaphor_history,
          scribble_rewrites: normalized.scribble_rewrites,
          pending_deletes,
        };
      },
    }
  )
);

export function importLexiconFromUnknown(data: unknown): LexiconData | null {
  return normalizeLexiconPayload(data);
}

export function todayISODate(): string {
  return new Date().toISOString().slice(0, 10);
}

interface TasteProfileState {
  /** Free-text themes the user typed — steer Deep Dive & Metaphors */
  threads: string[];
  /** Add one or several threads (comma/semicolon separated). */
  addThreadsFromInput: (raw: string) => void;
  removeThread: (label: string) => void;
  clearThreads: () => void;
}

type PersistedTaste = Partial<TasteProfileState> & { genreIds?: string[] };

export const useTasteProfile = create<TasteProfileState>()(
  persist(
    (set) => ({
      threads: [],
      addThreadsFromInput: (raw) => {
        const parts = raw
          .split(/[,;\n]+/)
          .map((s) => normalizeThreadLabel(s))
          .filter(Boolean);
        if (!parts.length) return;
        set((s) => {
          const seen = new Set(s.threads.map((t) => t.toLowerCase()));
          const next = [...s.threads];
          for (const p of parts) {
            const k = p.toLowerCase();
            if (seen.has(k)) continue;
            if (next.length >= MAX_EXPLORATION_THREADS) break;
            seen.add(k);
            next.push(p);
          }
          return { threads: next };
        });
      },
      removeThread: (label) =>
        set((s) => ({
          threads: s.threads.filter((t) => t.toLowerCase() !== label.toLowerCase()),
        })),
      clearThreads: () => set({ threads: [] }),
    }),
    {
      name: "lexy-taste",
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({ threads: s.threads }),
      merge: (persistedState, currentState) => {
        const p = persistedState as PersistedTaste | null | undefined;
        if (!p || typeof p !== "object") return currentState;

        let threads: string[] = currentState.threads;
        if (Array.isArray(p.threads) && p.threads.length) {
          threads = normalizeThreadList(p.threads);
        } else if (Array.isArray(p.genreIds) && p.genreIds.length) {
          threads = migrateLegacyGenreIds(p.genreIds);
        }

        return {
          ...currentState,
          threads: normalizeThreadList(threads),
        };
      },
    }
  )
);

/** @deprecated use MAX_EXPLORATION_THREADS */
export const MAX_GENRES = MAX_EXPLORATION_THREADS;
export { MAX_EXPLORATION_THREADS };
