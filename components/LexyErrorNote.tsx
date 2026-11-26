"use client";

import { isSignInNeeded } from "@/lib/lexyApi";
import Link from "next/link";
import { usePathname } from "next/navigation";

/**
 * How a Claude feature shows a failure. Being signed out isn't an error to the person — it's the
 * next step — so that one becomes a warm invitation to sign in and come straight back here.
 */
export function LexyErrorNote({ message, className = "" }: { message: string; className?: string }) {
  const pathname = usePathname();

  if (isSignInNeeded(message)) {
    const back = encodeURIComponent(pathname || "/");
    return (
      <div className={`rounded-2xl border border-[#EDE8E0] bg-white px-5 py-6 text-center shadow-sm ${className}`}>
        <p className="font-serif text-lg font-bold text-[#1C1917]">{message}</p>
        <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-[#6A6360]">
          Your words, ratings and taste stay with you — on your phone and everywhere else.
        </p>
        <Link
          href={`/sign-in?redirect_url=${back}`}
          className="mt-5 inline-flex min-h-11 items-center justify-center rounded-full bg-[#1C1917] px-7 text-xs font-semibold uppercase tracking-[0.12em] text-[#F5EFE0] active:opacity-80 sm:hover:bg-[#2A2520]"
        >
          Sign in
        </Link>
      </div>
    );
  }

  return (
    <p className={`rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 ${className}`}>{message}</p>
  );
}
