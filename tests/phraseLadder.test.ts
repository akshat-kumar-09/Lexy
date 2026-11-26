import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { EVERYDAY_PHRASES, PHRASE_GROUPS, everydayLadder } from "../lib/everydayPhrases";
import { nextSelection, normalizePhraseLadder, RUNGS, selectedText, swapInto, tokenize } from "../lib/phraseLadder";

describe("picking words in a line", () => {
  const line = "I want Lexy to be a masterpiece, truly.";
  const tokens = tokenize(line);

  it("splits on spaces and leaves punctuation off the picked words", () => {
    assert.equal(tokens.length, 8);
    assert.equal(selectedText(line, tokens, 6, 6), "masterpiece");
    assert.equal(selectedText(line, tokens, 7, 5), "a masterpiece, truly");
  });

  it("taps a word, extends to a phrase, then starts over", () => {
    let sel = nextSelection(null, 6);
    assert.deepEqual(sel, [6, 6]);
    sel = nextSelection(sel, 4);
    assert.deepEqual(sel, [4, 6]);
    sel = nextSelection(sel, 1);
    assert.deepEqual(sel, [1, 1]);
    assert.equal(nextSelection(sel, 1), null);
  });
});

describe("swapInto", () => {
  it("swaps the first match and keeps a leading capital", () => {
    assert.equal(swapInto("To be honest, I didn't love it.", "to be honest", "frankly"), "Frankly, I didn't love it.");
    assert.equal(swapInto("No worries, it happens.", "no worries", "'tis nothing"), "'Tis nothing, it happens.");
  });

  it("fixes a/an before the swap", () => {
    assert.equal(swapInto("Lexy is a masterpiece.", "masterpiece", "opus"), "Lexy is an opus.");
    assert.equal(swapInto("It was an awful idea.", "awful", "dreadful"), "It was a dreadful idea.");
    assert.equal(swapInto("A joke helped.", "joke", "useful quip"), "A useful quip helped.");
    assert.equal(swapInto("A joke helped.", "joke", "the right quip"), "The right quip helped.");
  });

  it("leaves the line alone when the target isn't in it", () => {
    assert.equal(swapInto("Time flies.", "masterpiece", "opus"), "Time flies.");
  });
});

describe("normalizePhraseLadder", () => {
  const line = "I want Lexy to be a masterpiece.";

  it("keeps Lexy's rung order, drops repeats and fills in the line", () => {
    const r = normalizePhraseLadder(
      {
        sense: "the best thing they'll make",
        rungs: [
          { level: "Shakespearean", options: [{ text: "the crown of my labours", note: "grand" }] },
          {
            level: "subtle",
            options: [
              { text: "“my best work”", note: "plain", line: "I want Lexy to be my best work." },
              { text: "masterpiece", note: "the same word" },
              { text: "My best work", note: "repeat" },
            ],
          },
          { level: "nonsense", options: [{ text: "x" }] },
          { level: "polished", options: [] },
        ],
      },
      line,
      "masterpiece"
    );
    assert.deepEqual(
      r.rungs.map((g) => g.level),
      ["subtle", "shakespearean"]
    );
    assert.deepEqual(r.rungs[0].options, [{ text: "my best work", note: "plain", line: "I want Lexy to be my best work." }]);
    assert.equal(r.rungs[1].options[0].line, "I want Lexy to be the crown of my labours.");
    assert.equal(r.sense, "the best thing they'll make");
  });

  it("leaves out the line when the phrase is the whole line", () => {
    const r = normalizePhraseLadder(
      { rungs: [{ level: "subtle", options: [{ text: "so be it", note: "firm" }] }] },
      "it is what it is",
      ""
    );
    assert.equal(r.target, "it is what it is");
    assert.equal(r.rungs[0].options[0].line, undefined);
  });

  it("survives a garbled reply", () => {
    assert.deepEqual(normalizePhraseLadder("nope", line, "masterpiece").rungs, []);
  });
});

describe("the everyday phrases", () => {
  it("each has a full ladder that drops into its example line", () => {
    const seen = new Set<string>();
    for (const p of EVERYDAY_PHRASES) {
      assert.ok(!seen.has(p.phrase), `${p.phrase} listed twice`);
      seen.add(p.phrase);
      assert.ok(PHRASE_GROUPS.includes(p.group), p.phrase);
      assert.ok(p.example.toLowerCase().includes(p.phrase.toLowerCase()), `${p.phrase}: not in its example`);
      const ladder = everydayLadder(p);
      assert.deepEqual(
        ladder.rungs.map((r) => r.level),
        RUNGS.map((r) => r.id),
        p.phrase
      );
      const texts = new Set<string>();
      for (const rung of ladder.rungs) {
        assert.ok(rung.options.length >= 1 && rung.options.length <= 3, `${p.phrase}: ${rung.level}`);
        for (const o of rung.options) {
          assert.ok(o.note, `${p.phrase}: ${o.text} has no note`);
          assert.ok(!texts.has(o.text.toLowerCase()), `${p.phrase}: ${o.text} repeats`);
          texts.add(o.text.toLowerCase());
          assert.notEqual(o.line, p.example, `${p.phrase}: ${o.text} didn't swap in`);
          assert.ok(o.line?.toLowerCase().includes(o.text.toLowerCase()), `${p.phrase}: ${o.text}`);
        }
      }
    }
    assert.ok(EVERYDAY_PHRASES.length >= 20);
  });
});
