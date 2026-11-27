import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";
import { lexyFetch } from "../lib/authFetch";

type Sent = { url: string; init: RequestInit };

const g = globalThis as unknown as { window?: unknown; fetch: typeof fetch };
const realFetch = g.fetch;
let sent: Sent[] = [];

function signedIn(token: string | null) {
  g.window = { Clerk: { loaded: true, session: token == null ? null : { getToken: async () => token } } };
}

describe("lexyFetch", () => {
  beforeEach(() => {
    sent = [];
    process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY = "pk_test_example";
    g.fetch = (async (url: string, init: RequestInit) => {
      sent.push({ url, init });
      return new Response("{}");
    }) as typeof fetch;
  });

  afterEach(() => {
    g.fetch = realFetch;
    delete g.window;
    delete process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
  });

  it("sends a fresh session token so a stale cookie can't sign someone out", async () => {
    signedIn("fresh-token");
    await lexyFetch("/api/lexy", { method: "POST", headers: { "Content-Type": "application/json" } });
    const headers = new Headers(sent[0].init.headers);
    assert.equal(headers.get("Authorization"), "Bearer fresh-token");
    assert.equal(headers.get("Content-Type"), "application/json");
    assert.equal(sent[0].init.method, "POST");
    assert.equal(sent[0].init.credentials, "same-origin");
  });

  it("sends no token when nobody is signed in", async () => {
    signedIn(null);
    await lexyFetch("/api/lexicon");
    assert.equal(new Headers(sent[0].init.headers).has("Authorization"), false);
  });

  it("still sends the request when Clerk isn't set up", async () => {
    delete process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
    await lexyFetch("/api/lexicon");
    assert.equal(sent.length, 1);
    assert.equal(new Headers(sent[0].init.headers).has("Authorization"), false);
  });
});
