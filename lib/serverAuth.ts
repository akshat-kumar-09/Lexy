import { auth } from "@clerk/nextjs/server";

/** Same check as middleware.ts: Clerk only runs when both keys are set. */
function isClerkConfigured(): boolean {
  return Boolean(process.env.CLERK_SECRET_KEY?.trim() && process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?.trim());
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
