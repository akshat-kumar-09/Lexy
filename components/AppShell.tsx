"use client";

import { LexyIntro } from "@/components/LexyIntro";
import { NavAuthMobile } from "@/components/NavAuth";
import { PageEssence } from "@/components/PageEssence";
import { SelectionDeepDive } from "@/components/SelectionDeepDive";
import { VoiceValuedButton } from "@/components/VoiceValuedButton";
import { getEssenceLine } from "@/lib/languageQuotes";
import { ORBS, orbBackground, orbById, orbIdForLocation } from "@/lib/orbs";
import { useOrbUsage } from "@/lib/store";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect } from "react";

const PAGE_TITLES: Record<string, string> = {
  "/settings": "Settings",
  "/start": "Get started",
};

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const recordVisit = useOrbUsage((s) => s.recordVisit);
  const isHome = pathname === "/";
  const orbId = orbIdForLocation(pathname ?? "/");
  const title = orbId ? orbById(orbId).label : PAGE_TITLES[pathname ?? ""];

  // Every visit feeds the orb sizes on Home.
  useEffect(() => {
    const id = orbIdForLocation(pathname ?? "/", window.location.hash);
    if (id) recordVisit(id);
  }, [pathname, recordVisit]);

  return (
    <div className="min-h-[100dvh] bg-[#FEFCF8] text-[#1C1917]">
      {isHome ? (
        <main>{children}</main>
      ) : (
        <main className="flex min-h-[100dvh] flex-col pb-[calc(4.5rem+env(safe-area-inset-bottom))] md:pb-0">
          <header
            className="sticky top-0 z-30 flex min-h-[3.25rem] items-center gap-3 border-b border-[#EDE8E0] bg-[#FEFCF8]/90 px-4 pb-2 pt-[calc(0.5rem+env(safe-area-inset-top))] backdrop-blur-md sm:px-5 md:px-10 md:py-3"
            data-no-deep-dive
          >
            <Link href="/" aria-label="Lexy home — all the orbs" className="group flex min-h-11 shrink-0 items-center gap-2.5">
              <span
                aria-hidden
                className="h-7 w-7 rounded-full shadow-[0_0_14px_rgba(184,149,94,0.45)] transition-transform duration-300 group-hover:scale-110"
                style={{ background: orbBackground(orbById("lexicon")) }}
              />
              <span className="font-serif text-xl font-bold leading-none">Lexy</span>
            </Link>
            {title && (
              <span className="min-w-0 truncate font-serif text-sm italic text-[#8B7355]">{title}</span>
            )}
            <nav aria-label="Jump to" className="ml-auto hidden items-center md:flex">
              {ORBS.map((o) => {
                const active = o.id === orbId;
                return (
                  <Link
                    key={o.id}
                    href={o.href}
                    title={o.label}
                    aria-label={o.label}
                    aria-current={active ? "page" : undefined}
                    className="group flex h-9 w-9 items-center justify-center rounded-full"
                  >
                    <span
                      aria-hidden
                      className={`block rounded-full transition-all duration-300 group-hover:h-4 group-hover:w-4 ${
                        active ? "h-4 w-4 ring-2 ring-[#1C1917]/15 ring-offset-2 ring-offset-[#FEFCF8]" : "h-3 w-3"
                      }`}
                      style={{ background: orbBackground(o) }}
                    />
                  </Link>
                );
              })}
            </nav>
            <div className="ml-auto flex items-center gap-1 sm:gap-2 md:ml-3">
              <NavAuthMobile />
              <Link
                href="/settings"
                className="flex min-h-11 items-center justify-center px-2 text-[11px] font-semibold uppercase leading-tight tracking-[0.12em] text-[#8B7355] active:opacity-70"
              >
                Settings
              </Link>
            </div>
          </header>
          <PageEssence line={getEssenceLine(pathname)} />
          <div className="flex-1 px-4 py-5 sm:px-5 sm:py-6 md:px-10 md:py-10">{children}</div>
        </main>
      )}

      <SelectionDeepDive />
      <VoiceValuedButton />
      <LexyIntro />
    </div>
  );
}
