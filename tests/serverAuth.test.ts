import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { clerkSecretKeyProblem } from "../lib/serverAuth";

describe("clerkSecretKeyProblem", () => {
  it("accepts real-looking Clerk secret keys", () => {
    assert.equal(clerkSecretKeyProblem("sk_test_AbC123xyz"), null);
    assert.equal(clerkSecretKeyProblem("sk_live_AbC123xyz"), null);
    assert.equal(clerkSecretKeyProblem("  sk_test_AbC123xyz\n"), null);
  });

  it("leaves an unset key alone (Clerk is simply off)", () => {
    assert.equal(clerkSecretKeyProblem(undefined), null);
    assert.equal(clerkSecretKeyProblem(""), null);
  });

  it("catches a key copied while Clerk's dashboard was hiding it", () => {
    assert.match(clerkSecretKeyProblem("•••••••") ?? "", /sk_test_/);
    assert.notEqual(clerkSecretKeyProblem("sk_test_••••••••"), null);
  });

  it("catches a publishable key pasted in the wrong place", () => {
    assert.notEqual(clerkSecretKeyProblem("pk_test_Y29vbC1qYXliaXJkLTUx"), null);
  });
});
