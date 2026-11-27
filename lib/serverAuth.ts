import { auth } from "@clerk/nextjs/server";

/** Same check as middleware.ts: Clerk only runs when both keys are set. */
function isClerkConfigured(): boolean {
  return Boolean(process.env.CLERK_SECRET_KEY?.trim() && process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?.trim());
}

/**
 * What's wrong with the Clerk secret key, or null when it looks right (or isn't set at all).
 *
 * Clerk secret keys are `sk_test_…` or `sk_live_…`. A key copied from Clerk's dashboard while it
 * was still hidden comes out as "•••" dots; Clerk then can't check any session token and quietly
 * treats every signed-in person as signed out, so they'd be told to sign in while signed in.
 */
export function clerkSecretKeyProblem(key: string | undefined = process.env.CLERK_SECRET_KEY): string | null {
  const k = key?.trim();
  if (!k || /^sk_(test|live)_[\x21-\x7e]+$/.test(k)) return null;
  return (
    "CLERK_SECRET_KEY isn't a Clerk secret key (it should start with sk_test_ or sk_live_). " +
    "In Clerk → API keys, copy the secret key with its copy button, set it in Vercel and .env.local, then redeploy."
  );
}

let reportedKeyProblem = false;

/** True when sign-in can't work on this server, so a signed-out answer isn't the person's fault. */
export function signInBroken(): boolean {
  const problem = clerkSecretKeyProblem();
  if (problem && !reportedKeyProblem) {
    reportedKeyProblem = true;
    console.error(problem);
  }
  return problem != null;
}

/** The signed-in person's Clerk id, or null when signed out (or Clerk isn't set up here). */
export async function currentUserId(): Promise<string | null> {
  if (!isClerkConfigured()) return null;
  try {
    const { userId } = await auth();
    return userId ?? null;
  } catch (e) {
    console.error("Clerk auth() failed", e);
    return null;
  }
}
