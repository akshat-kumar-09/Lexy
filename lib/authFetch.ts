/**
 * fetch() for Lexy's own API that carries the signed-in person's Clerk session as a Bearer token.
 *
 * Clerk keeps a 60-second session token in a cookie and refreshes it in the background. A POST
 * that lands while that cookie is stale (a tab just woken, a laptop just opened, a slow refresh)
 * is treated as signed out: Clerk can only re-sync cookies on page loads, not on API calls. On a
 * development Clerk instance the cookie path has extra checks that can fail the same way.
 * getToken() hands back a fresh token (refreshing it if needed), and Clerk checks a token in the
 * Authorization header on its own, so a signed-in person stays signed in on every request.
 */

type ClerkSession = { getToken: () => Promise<string | null> };
type ClerkGlobal = { loaded?: boolean; session?: ClerkSession | null };

/** How long to wait for Clerk to finish loading before sending without a token. */
const CLERK_LOAD_WAIT_MS = 5000;

function clerkGlobal(): ClerkGlobal | undefined {
  if (typeof window === "undefined") return undefined;
  return (window as unknown as { Clerk?: ClerkGlobal }).Clerk;
}

async function loadedClerk(): Promise<ClerkGlobal | undefined> {
  if (!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY) return undefined;
  const started = Date.now();
  for (;;) {
    const clerk = clerkGlobal();
    if (clerk?.loaded || Date.now() - started >= CLERK_LOAD_WAIT_MS) return clerk;
    await new Promise((r) => setTimeout(r, 100));
  }
}

/** A fresh session token for the signed-in person, or null when signed out. */
export async function sessionToken(): Promise<string | null> {
  const session = (await loadedClerk())?.session;
  if (!session) return null;
  try {
    return await session.getToken();
  } catch {
    return null;
  }
}

/** fetch() for /api/… routes that need to know who is asking. */
export async function lexyFetch(url: string, init: RequestInit = {}): Promise<Response> {
  const token = await sessionToken();
  const headers = new Headers(init.headers);
  if (token) headers.set("Authorization", `Bearer ${token}`);
  return fetch(url, { credentials: "same-origin", ...init, headers });
}
