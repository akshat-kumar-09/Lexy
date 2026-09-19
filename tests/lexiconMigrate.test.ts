import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { mergeLexiconPreferLocal, normalizeLexiconPayload } from "../lib/lexiconMigrate";
import type { LexiconData, LexiconWord } from "../lib/types";

function word(key: string, rating: number): LexiconWord {
  return {
    word: key,
    pronunciation: "/w/",
    part_of_speech: "noun",
    definition: "def",
    example: "ex",
    origin: "orig",
    rating,
    added: "2026-01-01",
    source: "deep_dive",
  };
}

describe("mergeLexiconPreferLocal", () => {
  it("local words win on duplicate keys", () => {
    const server: LexiconData = {
      words: { hello: word("hello", 5) },
      metaphor_history: [],
      scribble_rewrites: [],
    };
    const local: LexiconData = {
      words: { hello: word("hello", 9) },
      metaphor_history: [],
      scribble_rewrites: [],
    };
    const merged = mergeLexiconPreferLocal(server, local);
    assert.equal(merged.words.hello?.rating, 9);
  });

  it("keeps words present on only one side", () => {
    const server: LexiconData = {
      words: { alpha: word("alpha", 6) },
      metaphor_history: [],
      scribble_rewrites: [],
    };
    const local: LexiconData = {
      words: { beta: word("beta", 8) },
      metaphor_history: [],
      scribble_rewrites: [],
    };
    const merged = mergeLexiconPreferLocal(server, local);
    assert.ok(merged.words.alpha);
    assert.ok(merged.words.beta);
  });

  it("merges metaphor suggestions for the same date without duplicates", () => {
    const server: LexiconData = {
      words: {},
      metaphor_history: [
        {
          date: "2026-06-09",
          suggestions: [
            {
              metaphor: "a river of doubt",
              unpacking: "u",
              image_strength: "s",
              example_sentences: ["", "", ""],
              why_for_you: "w",
            },
          ],
        },
      ],
      scribble_rewrites: [],
    };
    const local: LexiconData = {
      words: {},
      metaphor_history: [
        {
          date: "2026-06-09",
          suggestions: [
            {
              metaphor: "a river of doubt",
              unpacking: "u2",
              image_strength: "s2",
              example_sentences: ["", "", ""],
              why_for_you: "w2",
            },
            {
              metaphor: "glass horizon",
              unpacking: "u3",
              image_strength: "s3",
              example_sentences: ["", "", ""],
              why_for_you: "w3",
            },
          ],
        },
      ],
      scribble_rewrites: [],
    };
    const merged = mergeLexiconPreferLocal(server, local);
    assert.equal(merged.metaphor_history.length, 1);
    assert.equal(merged.metaphor_history[0]!.suggestions.length, 2);
  });
});

describe("normalizeLexiconPayload", () => {
  it("rejects payloads without words object", () => {
    assert.equal(normalizeLexiconPayload(null), null);
    assert.equal(normalizeLexiconPayload({ metaphor_history: [] }), null);
  });

  it("accepts a minimal valid payload", () => {
    const data = normalizeLexiconPayload({
      words: { test: word("test", 7) },
      metaphor_history: [],
      scribble_rewrites: [],
    });
    assert.ok(data);
    assert.ok(data!.words.test);
  });
});
