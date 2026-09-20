import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  extractJsonObject,
  matchingBrace,
  parseModelJson,
  removeTrailingCommas,
  salvageJsonObjects,
  stripCodeFence,
} from "../lib/parseJson";

describe("stripCodeFence", () => {
  it("unwraps a fenced JSON object", () => {
    assert.equal(stripCodeFence("```json\n{\"a\":1}\n```"), "{\"a\":1}");
  });
});

describe("extractJsonObject", () => {
  it("drops prose around the object", () => {
    assert.equal(extractJsonObject("Here you go:\n{\"a\":1}\nThanks."), "{\"a\":1}");
  });
});

describe("removeTrailingCommas", () => {
  it("strips commas before closing brackets", () => {
    assert.equal(removeTrailingCommas('{"xs":[1,2,],}'), '{"xs":[1,2]}');
  });
});

describe("matchingBrace", () => {
  it("skips braces inside strings", () => {
    const src = '{"w":"a}b","n":1}';
    assert.equal(matchingBrace(src, 0), src.length - 1);
  });

  it("returns -1 when the object is truncated", () => {
    assert.equal(matchingBrace('{"w":"hi"', 0), -1);
  });
});

describe("salvageJsonObjects", () => {
  it("keeps complete objects and drops a truncated tail", () => {
    const body = '{"word":"a"},{"word":"b"},{"word":"c"';
    assert.deepEqual(salvageJsonObjects(body), [{ word: "a" }, { word: "b" }]);
  });
});

describe("parseModelJson", () => {
  it("parses a clean object", () => {
    assert.deepEqual(parseModelJson<{ a: number }>('{"a":1}'), { a: 1 });
  });

  it("repairs trailing commas", () => {
    const raw = '{"suggestions":[{"word":"wistful"},]}';
    assert.deepEqual(parseModelJson<{ suggestions: { word: string }[] }>(raw), {
      suggestions: [{ word: "wistful" }],
    });
  });

  it("salvages a truncated suggestions array — the production error", () => {
    const raw = `{
  "suggestions": [
    {"word":"quiescence","level":4},
    {"word":"halcyon","level":4},
    {"word":"serene"`;
    const parsed = parseModelJson<{ suggestions: { word: string }[] }>(raw);
    assert.deepEqual(
      parsed.suggestions.map((s) => s.word),
      ["quiescence", "halcyon"]
    );
  });

  it("throws a readable error when nothing can be salvaged", () => {
    assert.throws(() => parseModelJson("not json at all"), /couldn't read/i);
  });
});
