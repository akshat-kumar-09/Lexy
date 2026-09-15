import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { normalizeDeepDiveResult } from "../lib/openai";
import type { DeepDiveResult } from "../lib/types";

describe("normalizeDeepDiveResult", () => {
  it("maps legacy definition-only responses to dual meanings", () => {
    const raw = {
      word: "sonder",
      pronunciation: "/ˈsɒndə/",
      part_of_speech: "noun",
      definition: "The realization that others have inner lives.",
      nuance: "—",
      example_sentences: ["a", "b", "c"],
      origin: "coinage",
      related_words: ["x", "y", "z"],
      used_by: "—",
    } as DeepDiveResult;

    const out = normalizeDeepDiveResult(raw);
    assert.equal(out.reference_definition, raw.definition);
    assert.equal(out.lexy_definition, raw.definition);
    assert.equal(out.reference_source, "Oxford English Dictionary");
    assert.equal(out.pronunciation_source, "Oxford English Dictionary");
    assert.equal(out.level, 3);
  });

  it("preserves distinct reference and lexy glosses", () => {
    const raw: DeepDiveResult = {
      word: "petrichor",
      pronunciation: "/ˈpɛtrɪkɔː/",
      pronunciation_source: "Cambridge English Pronouncing Dictionary",
      part_of_speech: "noun",
      reference_definition: "A pleasant smell after rain on dry ground.",
      reference_source: "Oxford English Dictionary",
      lexy_definition: "That earthy smell when rain hits dry pavement.",
      level: 4,
      nuance: "—",
      example_sentences: ["a", "b", "c"],
      origin: "Greek",
      related_words: ["x", "y", "z"],
      used_by: "—",
    };

    const out = normalizeDeepDiveResult(raw);
    assert.notEqual(out.reference_definition, out.lexy_definition);
    assert.equal(out.pronunciation_source, "Cambridge English Pronouncing Dictionary");
  });
});
