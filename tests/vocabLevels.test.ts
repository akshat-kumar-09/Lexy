import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { clampVocabLevel } from "../lib/vocabLevels";

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
