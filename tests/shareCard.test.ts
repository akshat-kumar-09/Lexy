import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildShareText,
  fitFontSize,
  shareCardFilename,
  shareCardFromDeepDive,
  wrapText,
} from "../lib/shareCard";
import type { DeepDiveResult } from "../lib/types";

const charWidth = (s: string) => s.length * 10;

const ataraxia: DeepDiveResult = {
  word: "ataraxia",
  pronunciation: "/atəˈraksɪə/",
  pronunciation_source: "Oxford English Dictionary",
  part_of_speech: "noun",
  reference_definition: "A state of freedom from emotional disturbance.",
  reference_source: "Oxford English Dictionary",
  lexy_definition: "That deep calm when nothing can rattle you.",
  level: 4,
  nuance: "Philosophical, not merely relaxed.",
  example_sentences: ["", "The Stoics sought ataraxia.", "Another line."],
  conversation_phrases: [],
  origin: "Greek ataraxia.",
  related_words: [],
  used_by: "",
};

describe("wrapText", () => {
  it("breaks on word boundaries within the width", () => {
    assert.deepEqual(wrapText("one two three", 70, charWidth), ["one two", "three"]);
  });

  it("collapses whitespace and returns nothing for blank input", () => {
    assert.deepEqual(wrapText("  a   b  ", 999, charWidth), ["a b"]);
    assert.deepEqual(wrapText("   ", 999, charWidth), []);
  });

  it("keeps an over-long word on its own line instead of dropping it", () => {
    assert.deepEqual(wrapText("hi sesquipedalian", 40, charWidth), ["hi", "sesquipedalian"]);
  });
});

describe("fitFontSize", () => {
  it("takes the largest size that fits", () => {
    assert.equal(fitFontSize([100, 50, 25], 60, (size) => size), 50);
  });

  it("falls back to the smallest size when nothing fits", () => {
    assert.equal(fitFontSize([100, 50, 25], 10, (size) => size), 25);
  });
});

describe("shareCardFromDeepDive", () => {
  it("picks the first non-empty example and clamps the level", () => {
    const card = shareCardFromDeepDive(ataraxia);
    assert.equal(card.example, "The Stoics sought ataraxia.");
    assert.equal(card.level, 4);
    assert.equal(card.plain_meaning, "That deep calm when nothing can rattle you.");
  });

  it("drops the plain gloss when it only repeats the reference definition", () => {
    const card = shareCardFromDeepDive({
      ...ataraxia,
      lexy_definition: ataraxia.reference_definition,
    });
    assert.equal(card.plain_meaning, "");
  });

  it("falls back to the legacy definition field", () => {
    const card = shareCardFromDeepDive({
      ...ataraxia,
      reference_definition: "",
      definition: "Older payloads only had this.",
    });
    assert.equal(card.reference_definition, "Older payloads only had this.");
  });
});

describe("buildShareText", () => {
  const text = buildShareText(shareCardFromDeepDive(ataraxia));

  it("leads with the word and its pronunciation", () => {
    assert.ok(text.startsWith("ataraxia  /atəˈraksɪə/"));
  });

  it("carries the meanings, nuance, and an example", () => {
    assert.ok(text.includes("A state of freedom from emotional disturbance."));
    assert.ok(text.includes("In plain words: That deep calm"));
    assert.ok(text.includes("The nuance: Philosophical"));
    assert.ok(text.includes("“The Stoics sought ataraxia.”"));
  });

  it("never promotes the app: no name, no link", () => {
    assert.ok(!/lexy/i.test(text));
    assert.ok(!/https?:\/\//.test(text));
  });

  it("omits sections the word does not have", () => {
    const sparse = buildShareText(
      shareCardFromDeepDive({ ...ataraxia, nuance: "", example_sentences: [] })
    );
    assert.ok(!sparse.includes("The nuance"));
    assert.ok(!sparse.includes("“"));
  });
});

describe("shareCardFilename", () => {
  it("slugifies the word", () => {
    assert.equal(shareCardFilename("Ataraxia"), "ataraxia.png");
    assert.equal(shareCardFilename("self-reproach"), "self-reproach.png");
    assert.equal(shareCardFilename("  ?! "), "word.png");
  });
});
