import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { clampVocabLevel, VOCAB_LEVELS } from "../lib/vocabLevels";

describe("clampVocabLevel", () => {
  it("defaults missing values to level 3", () => {
    assert.equal(clampVocabLevel(undefined), 3);
    assert.equal(clampVocabLevel(null), 3);
  });

  it("clamps out-of-range numbers", () => {
    assert.equal(clampVocabLevel(0), 1);
    assert.equal(clampVocabLevel(9), 5);
    assert.equal(clampVocabLevel(4), 4);
  });
});

describe("how often others use it", () => {
  it("describes usage in plain language, never as L1–L5", () => {
    ([1, 2, 3, 4, 5] as const).forEach((level) => {
      const meta = VOCAB_LEVELS[level];
      assert.ok(meta.howOften.trim().length > 0);
      assert.ok(meta.howOftenDetail.trim().length > 0);
      assert.doesNotMatch(meta.howOften, /\bL[1-5]\b|Level\s*[1-5]/i);
      assert.doesNotMatch(meta.howOftenDetail, /\bL[1-5]\b|Level\s*[1-5]/i);
    });
  });
});
