"use client";

import { NavAuthMobile, NavAuthSidebar } from "@/components/NavAuth";
import Link from "next/link";
import { usePathname } from "next/navigation";

const nav = [
  { href: "/", label: "Home", short: "Home" },
  { href: "/dive", label: "Deep dive", short: "Dive" },
  { href: "/daily", label: "Daily", short: "Daily" },
  { href: "/lexicon", label: "Lexicon", short: "Words" },
  { href: "/scribble", label: "Scribble", short: "Write" },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="flex min-h-[100dvh] flex-col bg-[#FEFCF8] text-[#1C1917] md:flex-row">
      <aside className="hidden shrink-0 flex-col border-r border-[#2A2520] bg-[#1C1917] px-5 py-8 md:flex md:w-[220px]">
        <Link href="/" className="font-serif text-2xl font-bold tracking-tight text-[#F5EFE0]">
          Lexy
        </Link>
        <p className="mt-1 font-serif text-sm italic text-[#A8A098]">your vocabulary companion</p>
        <nav className="mt-10 flex flex-col gap-1">
          {nav.map((n) => {
            const active = pathname === n.href;
            return (
              <Link
                key={n.href}
                href={n.href}
                className={`rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                  active
                    ? "bg-[#2A2520] text-[#F5EFE0]"
                    : "text-[#C8BFB0] hover:bg-[#252220] hover:text-[#F5EFE0]"
                }`}
              >
                {n.label}
              </Link>
            );
          })}
        </nav>
        <div className="mt-auto flex flex-col gap-4 pt-8">
          <NavAuthSidebar />
          <Link
            href="/settings"
            className="text-xs font-medium uppercase tracking-[0.12em] text-[#8B7355] hover:text-[#C8BFB0]"
          >
            Settings
          </Link>
        </div>
      </aside>

      <main className="flex min-h-[100dvh] flex-1 flex-col pb-[calc(5.5rem+env(safe-area-inset-bottom))] md:pb-0">
        <header className="flex min-h-[3rem] items-center gap-2 border-b border-[#EDE8E0] px-4 py-3 sm:px-5 md:min-h-0 md:px-10 md:py-5">
          <Link href="/" className="font-serif text-xl font-bold leading-none md:hidden">
            Lexy
          </Link>
          <div className="ml-auto flex items-center gap-2 md:hidden">
            <NavAuthMobile />
            <Link
              href="/settings"
              className="min-h-11 min-w-[4.25rem] px-2 py-2 text-center text-[11px] font-semibold uppercase leading-tight tracking-[0.12em] text-[#8B7355] active:opacity-70"
            >
              Settings
            </Link>
          </div>
        </header>
        <div className="flex-1 px-4 py-5 sm:px-5 sm:py-6 md:px-10 md:py-10">{children}</div>
      </main>

      <nav className="fixed bottom-0 left-0 right-0 z-40 flex border-t border-[#EDE8E0] bg-[#FEFCF8]/95 px-1 pt-1 pb-[calc(0.35rem+env(safe-area-inset-bottom))] backdrop-blur-md md:hidden">
        {nav.map((n) => {
          const active = pathname === n.href;
          return (
            <Link
              key={n.href}
              href={n.href}
              className={`flex min-h-12 min-w-0 flex-1 flex-col items-center justify-center rounded-lg px-0.5 py-2 text-[11px] font-semibold leading-tight active:bg-[#F5EFE0] ${
                active ? "text-[#1C1917]" : "text-[#B0A898]"
              }`}
            >
              <span className="max-w-full truncate text-center">{n.short}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
