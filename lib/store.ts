"use client";

import { migrateLegacyDailyRows, normalizeLexiconPayload } from "@/lib/lexiconMigrate";
import type { LexiconData, LexiconWord, MetaphorDayEntry } from "@/lib/types";
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

const empty: LexiconData = { words: {}, metaphor_history: [] };

export interface SettingsState {
  openaiApiKey: string;
  setOpenaiApiKey: (k: string) => void;
}

export const useSettings = create<SettingsState>()(
  persist(
    (set) => ({
      openaiApiKey: "",
      setOpenaiApiKey: (openaiApiKey) => set({ openaiApiKey }),
    }),
    { name: "lexy-settings", storage: createJSONStorage(() => localStorage) }
  )
);

interface LexiconStore extends LexiconData {
  upsertWord: (w: LexiconWord) => void;
  updateRating: (wordKey: string, rating: number) => void;
  appendMetaphor: (entry: MetaphorDayEntry) => void;
  importLexicon: (data: LexiconData) => void;
  exportText: () => string;
  exportLexiconJson: () => string;
}

export const useLexicon = create<LexiconStore>()(
  persist(
    (set, get) => ({
      ...empty,
      upsertWord: (w) =>
        set((s) => ({
          words: { ...s.words, [w.word.toLowerCase()]: { ...w, word: w.word } },
        })),
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
      importLexicon: (data) =>
        set({
          words: data.words ?? {},
          metaphor_history: data.metaphor_history ?? [],
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
        const { words, metaphor_history } = get();
        return JSON.stringify({ words, metaphor_history }, null, 2);
      },
    }),
    {
      name: "lexy-lexicon",
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({
        words: s.words,
        metaphor_history: s.metaphor_history,
      }),
      merge: (persistedState, currentState) => {
        const p = persistedState as
          | (Partial<LexiconData> & { daily_history?: unknown[] })
          | null
          | undefined;
        if (!p || typeof p !== "object") return currentState;
        const words =
          p.words && typeof p.words === "object"
            ? (p.words as LexiconData["words"])
            : currentState.words;
        let metaphor_history: MetaphorDayEntry[] = currentState.metaphor_history;
        if (Array.isArray(p.metaphor_history)) {
          metaphor_history = migrateLegacyDailyRows(p.metaphor_history);
        } else if (Array.isArray(p.daily_history)) {
          metaphor_history = migrateLegacyDailyRows(p.daily_history);
        } else if (!Array.isArray(p.metaphor_history)) {
          metaphor_history = [];
        }
        return {
          ...currentState,
          words,
          metaphor_history,
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

const MAX_GENRES = 5;

interface TasteProfileState {
  genreIds: string[];
  toggleGenre: (id: string) => void;
  clearGenres: () => void;
}

export const useTasteProfile = create<TasteProfileState>()(
  persist(
    (set) => ({
      genreIds: [],
      toggleGenre: (id) =>
        set((s) => {
          const has = s.genreIds.includes(id);
          if (has) return { genreIds: s.genreIds.filter((x) => x !== id) };
          if (s.genreIds.length >= MAX_GENRES) return s;
          return { genreIds: [...s.genreIds, id] };
        }),
      clearGenres: () => set({ genreIds: [] }),
    }),
    { name: "lexy-taste", storage: createJSONStorage(() => localStorage) }
  )
);

export { MAX_GENRES };
