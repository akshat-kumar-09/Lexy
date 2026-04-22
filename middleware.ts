import { clerkMiddleware } from "@clerk/nextjs/server";
import type { NextMiddleware } from "next/server";
import { NextResponse } from "next/server";

/** Match <Providers>: only enable Clerk when both keys exist (Vercel must set both). */
function isClerkConfigured(): boolean {
  return Boolean(
    process.env.CLERK_SECRET_KEY?.trim() && process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?.trim()
  );
}

const noopMiddleware: NextMiddleware = () => NextResponse.next();

/** Node middleware avoids Edge invocation issues on Vercel with Clerk (Next 15.5+). */
export default (isClerkConfigured() ? clerkMiddleware() : noopMiddleware);

export const config = {
  runtime: "nodejs",
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
