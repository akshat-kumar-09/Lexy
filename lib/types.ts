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
  /** The user's own sentence using this word — written at add-time, kept with the word for good. */
  user_sentence?: string;
}

/** One cell in the daily metaphor grid (12 at a time). */
export interface MetaphorGridItem {
  metaphor: string;
  unpacking: string;
  image_strength: string;
  example_sentences: string[];
  why_for_you: string;
  /** Which exploration theme this best fits — only populated when more than 2 threads are active. */
  theme?: string;
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
  part_of_speech: string;
  definition: string;
  nuance: string;
  example_sentences: string[];
  /** Casual, ready-to-say one-liners for actual conversation — not literary/written examples. */
  conversation_phrases: string[];
  origin: string;
  related_words: string[];
  used_by: string;
  /** Same root family: adjective/noun/verb variants etc. — definitions only. */
  related_form_definitions?: RelatedFormDefinition[];
}

/** One cell in the Deep Dive taste grid — 25 at a time, refreshed as taste updates. */
export interface TasteGridWord {
  word: string;
  pronunciation: string;
  part_of_speech: string;
  definition: string;
  why_for_you: string;
  /** Which exploration theme this best fits — only populated when more than 2 threads are active. */
  theme?: string;
}

export interface TasteGridResponse {
  suggestions: TasteGridWord[];
}

export interface MetaphorGridResponse {
  suggestions: MetaphorGridItem[];
}
