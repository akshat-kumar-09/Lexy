import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import { decryptSecret, encryptSecret } from "../lib/secretCrypto";

describe("secretCrypto", () => {
  const prev = process.env.OPENAI_KEY_ENCRYPTION_SECRET;

  afterEach(() => {
    if (prev === undefined) delete process.env.OPENAI_KEY_ENCRYPTION_SECRET;
    else process.env.OPENAI_KEY_ENCRYPTION_SECRET = prev;
  });

  it("passes through plaintext when encryption secret is unset", () => {
    delete process.env.OPENAI_KEY_ENCRYPTION_SECRET;
    assert.equal(encryptSecret("sk-test"), "sk-test");
    assert.equal(decryptSecret("sk-legacy-plain"), "sk-legacy-plain");
  });

  it("round-trips when encryption secret is set", () => {
    process.env.OPENAI_KEY_ENCRYPTION_SECRET = "unit-test-secret-at-least-32-chars-long";
    const plain = "sk-proj-abc123";
    const enc = encryptSecret(plain);
    assert.notEqual(enc, plain);
    assert.ok(enc.startsWith("v1:"));
    assert.equal(decryptSecret(enc), plain);
  });
});
