export type WordSource = "scribble" | "metaphor" | "deep_dive" | "daily";

export interface LexiconWord {
  word: string;
  pronunciation: string;
  part_of_speech: string;
  definition: string;
  example: string;
  origin: string;
  rating: number;
  added: string;
  source: WordSource;
}

export interface LexiconData {
  words: Record<string, LexiconWord>;
  /** One metaphor per calendar day. */
  metaphor_history: MetaphorDayEntry[];
}

export interface MetaphorDayEntry {
  date: string;
  metaphor: string;
  unpacking: string;
  /** Why the image works (vehicle / tenor in plain language). */
  image_strength?: string;
  example_sentences: string[];
  try_today?: string;
  why_today?: string;
}

export interface WordUpgrade {
  original_phrase: string;
  upgraded_word: string;
  pronunciation: string;
  why: string;
}

export interface KeyIdeaExpansion {
  idea: string;
  expansion: string;
}

export interface VocabularyCandidate {
  word: string;
  pronunciation: string;
  part_of_speech: string;
  definition: string;
  example_sentence: string;
  origin: string;
  why_relevant: string;
}

export interface ScribbleAnalysis {
  upgraded_version: string;
  word_upgrades: WordUpgrade[];
  key_idea_expansions: KeyIdeaExpansion[];
  vocabulary_candidates: VocabularyCandidate[];
}

export interface DeepDiveResult {
  word: string;
  pronunciation: string;
  part_of_speech: string;
  definition: string;
  nuance: string;
  example_sentences: string[];
  origin: string;
  related_words: string[];
  used_by: string;
}

/** One cell in the Deep Dive taste grid — 25 at a time, refreshed as taste updates. */
export interface TasteGridWord {
  word: string;
  pronunciation: string;
  part_of_speech: string;
  definition: string;
  why_for_you: string;
}

export interface TasteGridResponse {
  suggestions: TasteGridWord[];
}
