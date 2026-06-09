import { FirstTimeBanner } from "@/components/FirstTimeBanner";
import { LexyHomePreview } from "@/components/LexyHomePreview";
import Link from "next/link";

const cards = [
  { href: "/dive", title: "Word Deep Dive" },
  { href: "/metaphors", title: "Metaphors" },
  { href: "/articulate", title: "Articulate" },
  { href: "/lexicon", title: "My Lexy" },
  { href: "/scribble", title: "Morning Scribble" },
];

export default function HomePage() {
  return (
    <div className="mx-auto max-w-3xl space-y-7 sm:space-y-9 md:space-y-10 lg:max-w-5xl xl:max-w-6xl">
      <FirstTimeBanner />

      <div className="space-y-2.5 sm:space-y-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#8B7355] sm:text-xs">Welcome</p>
        <h1 className="font-serif text-[1.6rem] font-normal italic leading-[1.2] tracking-tight text-[#1C1917] sm:text-3xl md:text-4xl md:leading-tight">
          Language is the dress of thought.
        </h1>
        <p className="font-serif text-[1.35rem] font-normal italic leading-[1.25] tracking-tight text-[#1C1917] sm:text-2xl md:text-3xl">
          Lexy is your wardrobe.
        </p>
      </div>

      <LexyHomePreview />

      <div className="grid gap-3 sm:gap-4 lg:grid-cols-2">
        {cards.map((c) => (
          <Link
            key={c.href}
            href={c.href}
            className="group flex items-center justify-between rounded-2xl border border-[#EDE8E0] bg-white px-5 py-4 shadow-sm transition-all active:border-[#8B7355]/35 active:bg-[#FDFBF7] sm:hover:border-[#8B7355]/40 sm:hover:shadow-md"
          >
            <h2 className="font-serif text-xl font-bold text-[#1C1917] group-hover:text-[#8B7355]">{c.title}</h2>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true" className="shrink-0 text-[#B0A898] group-hover:text-[#8B7355]">
              <path d="M5 12h13M13 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </Link>
        ))}
      </div>

      <p className="text-center text-xs text-[#B0A898]">
        New to Lexy?{" "}
        <Link href="/start" className="font-semibold text-[#8B7355] underline-offset-2 hover:underline">
          Get started
        </Link>
      </p>
    </div>
  );
}
