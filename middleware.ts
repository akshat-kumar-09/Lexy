import { clerkMiddleware } from "@clerk/nextjs/server";
import type { NextMiddleware } from "next/server";
import { NextResponse } from "next/server";

const noopMiddleware: NextMiddleware = () => NextResponse.next();

export default (process.env.CLERK_SECRET_KEY ? clerkMiddleware() : noopMiddleware);

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
