"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { LexiconData, LexiconWord } from "@/lib/types";

const empty: LexiconData = { words: {}, daily_history: [] };

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
  appendDaily: (entry: LexiconData["daily_history"][number]) => void;
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
      appendDaily: (entry) =>
        set((s) => {
          const rest = s.daily_history.filter((h) => h.date !== entry.date);
          return { daily_history: [...rest, entry] };
        }),
      importLexicon: (data) =>
        set({
          words: data.words ?? {},
          daily_history: data.daily_history ?? [],
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
        const { words, daily_history } = get();
        return JSON.stringify({ words, daily_history }, null, 2);
      },
    }),
    { name: "lexy-lexicon", storage: createJSONStorage(() => localStorage) }
  )
);

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
