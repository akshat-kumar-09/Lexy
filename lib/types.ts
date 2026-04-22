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

/** One cell in the daily metaphor grid (10 at a time). */
export interface MetaphorGridItem {
  metaphor: string;
  unpacking: string;
  image_strength: string;
  example_sentences: string[];
  why_for_you: string;
}

export interface MetaphorDayEntry {
  date: string;
  /** Ten metaphors for this reveal, like the Deep Dive grid. */
  suggestions: MetaphorGridItem[];
}

export interface ScribbleRewriteEntry {
  id: string;
  saved_at: string;
  /** First ~2k chars of what you wrote (or full). */
  source_excerpt: string;
  /** Lexy’s lifted, richer version — stored for you. */
  upgraded_version: string;
}

export interface LexiconData {
  words: Record<string, LexiconWord>;
  metaphor_history: MetaphorDayEntry[];
  scribble_rewrites: ScribbleRewriteEntry[];
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

export interface MetaphorGridResponse {
  suggestions: MetaphorGridItem[];
}
