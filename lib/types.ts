import type { VocabLevel } from "@/lib/vocabLevels";

export const COOKIE_NAME = "lexy_oai";

export type WordSource = "scribble" | "metaphor" | "deep_dive" | "daily";

export interface LexiconWord {
  word: string;
  pronunciation: string;
  part_of_speech: string;
  /** Primary gloss — Lexy’s easy-to-retain meaning when available. */
  definition: string;
  example: string;
  origin: string;
  rating: number;
  added: string;
  source: WordSource;
  /** Renowned dictionary-style definition (e.g. Oxford). */
  reference_definition?: string;
  reference_source?: string;
  /** Lexy’s memorable gloss — same as definition when saved from Deep Dive. */
  lexy_definition?: string;
  /** Where the IPA comes from (e.g. Cambridge). */
  pronunciation_source?: string;
  /** 1 = everyone knows … 5 = rare. Deep Dive words are usually 3–5. */
  level?: VocabLevel;
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

/** Inflected or derived lemmas (e.g. perspicacity → perspicacious): meanings only, no etymology. */
export interface RelatedFormDefinition {
  word: string;
  part_of_speech: string;
  definition: string;
}

export interface DeepDiveResult {
  word: string;
  pronunciation: string;
  /** Renowned reference for the IPA (e.g. Oxford English Dictionary). */
  pronunciation_source: string;
  part_of_speech: string;
  /** Precise dictionary-style definition — Oxford or equivalent. */
  reference_definition: string;
  reference_source: string;
  /** Lexy’s gloss: shorter, vivid, easy to retain. */
  lexy_definition: string;
  /** @deprecated use reference_definition — kept for older API responses */
  definition?: string;
  /** 1 = everyone knows … 5 = rare. */
  level: VocabLevel;
  nuance: string;
  example_sentences: string[];
  origin: string;
  related_words: string[];
  used_by: string;
  /** Same root family: adjective/noun/verb variants etc. — definitions only. */
  related_form_definitions?: RelatedFormDefinition[];
}

/** One cell in the Deep Dive taste grid — 25 at a time until the user requests a new batch. */
export interface TasteGridWord {
  word: string;
  pronunciation: string;
  part_of_speech: string;
  definition: string;
  why_for_you: string;
  /** 1 = everyone knows … 5 = rare. Grid is mostly 3 with some 4–5. */
  level: VocabLevel;
}

export interface TasteGridResponse {
  suggestions: TasteGridWord[];
}

export interface MetaphorGridResponse {
  suggestions: MetaphorGridItem[];
}
