import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { normalizeSharpenResult } from "../lib/claude";
import { splitByPhrases } from "../lib/textMarks";

describe("splitByPhrases", () => {
  it("marks phrases case-insensitively, keeping the original text", () => {
    const parts = splitByPhrases("The orbs are actually not the best looking.", ["Not the best looking", "actually"]);
    assert.deepEqual(parts, [
      { text: "The orbs are ", mark: null },
      { text: "actually", mark: 1 },
      { text: " ", mark: null },
      { text: "not the best looking", mark: 0 },
      { text: ".", mark: null },
    ]);
  });

  it("prefers the longer phrase when two overlap", () => {
    const parts = splitByPhrases("look cheap", ["cheap", "look cheap"]);
    assert.deepEqual(parts, [{ text: "look cheap", mark: 1 }]);
  });

  it("returns the whole text when nothing matches", () => {
    assert.deepEqual(splitByPhrases("plain", ["absent", ""]), [{ text: "plain", mark: null }]);
  });
});

describe("normalizeSharpenResult", () => {
  const line = "the orbs are actually not the best looking";

  it("keeps well-formed parts and drops vague phrases that aren't in the line", () => {
    const r = normalizeSharpenResult(
      {
        intent: " They look cheap. ",
        vague: [
          { phrase: "not the best looking", why: "a hedge" },
          { phrase: "invented phrase", why: "not there" },
        ],
        versions: [
          { tone: "Direct", text: "The orbs look cheap.", swaps: [{ from: "not the best looking", to: "look cheap", why: "names the flaw" }, { from: "", to: "x" }] },
          { tone: "", text: "The orbs feel unrefined." },
          { tone: "Vivid", text: "" },
          { tone: "Formal", text: "The orbs lack refinement." },
          { tone: "Extra", text: "One too many." },
        ],
        words: [
          { word: "unrefined", pronunciation: "/ˌʌnrɪˈfaɪnd/" },
          { word: "Unrefined" },
          { word: "lackluster" },
        ],
      },
      line
    );
    assert.equal(r.intent, "They look cheap.");
    assert.deepEqual(r.vague, [{ phrase: "not the best looking", why: "a hedge" }]);
    assert.deepEqual(
      r.versions.map((v) => [v.tone, v.text, v.swaps.length]),
      [
        ["Direct", "The orbs look cheap.", 1],
        ["Sharper", "The orbs feel unrefined.", 0],
        ["Formal", "The orbs lack refinement.", 0],
      ]
    );
    assert.deepEqual(
      r.words.map((w) => w.word),
      ["unrefined", "lackluster"]
    );
  });

  it("survives a reply that isn't an object", () => {
    assert.deepEqual(normalizeSharpenResult("nope", line), { intent: "", vague: [], versions: [], words: [] });
  });
});
