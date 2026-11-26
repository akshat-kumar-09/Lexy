import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { isBlockingLexyError, isSignInNeeded, LEXY_TASKS, LexyRequestError, SIGN_IN_NEEDED } from "../lib/lexyApi";
import { buildLexyTask, type BuiltLexyTask } from "../lib/lexyTasks";

function built(task: string, input: unknown): BuiltLexyTask {
  const r = buildLexyTask(task, input);
  if ("error" in r) assert.fail(`expected ${task} to build, got: ${r.error}`);
  return r;
}

function refused(task: unknown, input: unknown): string {
  const r = buildLexyTask(task, input);
  assert.ok("error" in r, `expected ${String(task)} to be refused`);
  return r.error;
}

const lexicon = [
  { word: "affluence", rating: 9.9 },
  { word: "lightning", rating: 3.3 },
];

describe("Lexy's server-side tasks", () => {
  it("only runs tasks it knows", () => {
    assert.equal(refused("chat", { messages: [] }), "Unknown task.");
    assert.equal(refused(undefined, {}), "Unknown task.");
    refused("sharpen", "not an object");
  });

  it("builds every task with a fixed length and no sampling settings", () => {
    const inputs: Record<string, unknown> = {
      "taste-batch": { lexicon, threads: [], batch: 0 },
      "taste-fill": { lexicon, need: 3, have: ["lucid"] },
      "taste-replace": { lexicon, count: 1, keepOut: ["lucid"] },
      "metaphor-batch": { known: ["affluence"], exclude: [], batch: 3 },
      "metaphor-fill": { need: 2, have: [] },
      "scribble-rewrite": { text: "Woke early, felt foggy." },
      "scribble-ideas": { text: "Woke early, felt foggy." },
      handwriting: { image: "aGVsbG8=", mediaType: "image/png" },
      "name-feeling": { text: "I keep starting books and never finishing them." },
      sharpen: { line: "the orbs are not the best looking" },
    };
    for (const task of LEXY_TASKS) {
      const b = built(task, inputs[task]);
      assert.ok(b.maxTokens > 0 && b.maxTokens <= 4000, task);
      assert.doesNotMatch(JSON.stringify(b), /"temperature"|"model"/, task);
    }
  });

  it("refuses batch numbers outside the grid", () => {
    refused("taste-batch", { lexicon, batch: 5 });
    refused("taste-batch", { lexicon, batch: 1.5 });
    refused("metaphor-batch", { batch: 4 });
    refused("taste-replace", { count: 9 });
    refused("taste-fill", { need: 0 });
  });

  it("keeps the lexicon's words out of the next grid", () => {
    const b = built("taste-batch", { lexicon, batch: 2 });
    assert.match(String(b.content), /do NOT suggest these again\): affluence, lightning/);
    assert.match(String(b.content), /affluence: 9.9\nlightning: 3.3/);
    assert.match(String(b.content), /Return ONLY batch C: exactly 5 NEW words/);
    assert.match(b.system ?? "", /EXACTLY 5 items/);
  });

  it("passes the latest rating along", () => {
    const b = built("taste-replace", { lexicon, count: 2, keepOut: ["Lucid"], lastRated: { word: "lucid", rating: 3.3 } });
    assert.match(String(b.content), /They just rated "lucid" at 3.3\/10/);
    assert.match(String(b.content), /do NOT suggest these\): affluence, lightning, lucid/);
    assert.match(String(b.content), /Return exactly 2 NEW words/);
  });

  it("tidies lexicon rows instead of trusting them", () => {
    const b = built("taste-batch", {
      lexicon: [{ word: "line\nbreak\u0007", rating: 42 }, { word: "", rating: 5 }, { word: "x", rating: "high" }],
      batch: 0,
    });
    assert.match(String(b.content), /line break: 10/);
    assert.doesNotMatch(String(b.content), /\u0007/);
  });

  it("refuses text that's empty or too long", () => {
    assert.match(refused("sharpen", { line: "   " }), /Write line first/);
    assert.match(refused("sharpen", { line: "x".repeat(1501) }), /longer than Lexy can take/);
    assert.match(refused("scribble-ideas", { text: "x".repeat(12_001) }), /longer than Lexy can take/);
    assert.match(refused("name-feeling", { text: 7 }), /Write feeling first/);
  });

  it("reads only real image types and base64", () => {
    assert.match(refused("handwriting", { image: "aGVsbG8=", mediaType: "application/pdf" }), /JPEG, PNG, GIF or WebP/);
    assert.match(refused("handwriting", { image: "<script>", mediaType: "image/png" }), /couldn't read that photo/);
    assert.match(refused("handwriting", { image: "A".repeat(4_200_004), mediaType: "image/jpeg" }), /too large/);
    const b = built("handwriting", { image: "aGVs\nbG8=", mediaType: "image/jpeg" });
    assert.equal(b.output, "text");
    assert.ok(Array.isArray(b.content));
  });

  it("keeps the sharpen prompt the same shape as before", () => {
    const b = built("sharpen", { line: "it was fine", tone: "Direct" });
    assert.equal(
      b.content,
      'Their line:\n"""it was fine"""\n\nWhat they really mean: (not given — infer it from the line)\n\nTone they want: Direct'
    );
  });
});

describe("errors the browser shows", () => {
  it("recognises sign-in and daily-limit stops", () => {
    assert.ok(isSignInNeeded(SIGN_IN_NEEDED));
    assert.ok(!isSignInNeeded("Could not reach Claude — try again."));
    assert.ok(isBlockingLexyError(new LexyRequestError(SIGN_IN_NEEDED, 401, "signin")));
    assert.ok(isBlockingLexyError(new LexyRequestError("limit", 429, "quota")));
    assert.ok(!isBlockingLexyError(new LexyRequestError("busy", 429)));
    assert.ok(!isBlockingLexyError(new Error("x")));
  });
});
