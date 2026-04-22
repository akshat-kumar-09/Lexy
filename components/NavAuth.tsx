"use client";

import { SignedIn, SignedOut, UserButton } from "@clerk/nextjs";
import Link from "next/link";

function hasClerk() {
  return Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);
}

/** Always show a way to reach account / sign-in. Clerk UI only when keys are set. */
export function NavAuthSidebar() {
  if (!hasClerk()) {
    return (
      <div className="flex flex-col gap-1">
        <Link
          href="/sign-in"
          className="text-xs font-semibold uppercase tracking-[0.12em] text-[#C8BFB0] hover:text-[#F5EFE0]"
        >
          Sign in
        </Link>
        <span className="text-[10px] font-normal normal-case leading-snug tracking-normal text-[#8B7355]">
          Cloud sync: add Clerk keys (see .env.example)
        </span>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-3">
      <SignedOut>
        <Link
          href="/sign-in"
          className="text-xs font-semibold uppercase tracking-[0.12em] text-[#C8BFB0] hover:text-[#F5EFE0]"
        >
          Sign in
        </Link>
      </SignedOut>
      <SignedIn>
        <UserButton
          appearance={{
            elements: {
              avatarBox: "h-8 w-8 ring-2 ring-[#3D3830]",
            },
          }}
        />
      </SignedIn>
    </div>
  );
}

export function NavAuthMobile() {
  if (!hasClerk()) {
    return (
      <Link
        href="/sign-in"
        className="flex min-h-11 min-w-[4.5rem] items-center justify-center px-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#8B7355] active:opacity-70"
      >
        Sign in
      </Link>
    );
  }
  return (
    <>
      <SignedOut>
        <Link
          href="/sign-in"
          className="flex min-h-11 min-w-[4.5rem] items-center justify-center px-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#8B7355] active:opacity-70"
        >
          Sign in
        </Link>
      </SignedOut>
      <SignedIn>
        <UserButton
          appearance={{
            elements: {
              avatarBox: "h-9 w-9 min-h-9 min-w-9",
            },
          }}
        />
      </SignedIn>
    </>
  );
}
