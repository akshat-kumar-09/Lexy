import { FirstTimeBanner } from "@/components/FirstTimeBanner";
import { LexyHomePreview } from "@/components/LexyHomePreview";
import { FAVOURITE_THRESHOLD, HOME_HERO_SUPPORT, LEXICON_NOD } from "@/lib/lexyCopy";
import Link from "next/link";

const cards = [
  {
    href: "/dive",
    title: "Word Deep Dive",
    line: "Twenty-five words — rate each one and Lexy learns what you love. Your threads nudge the next batch.",
  },
  {
    href: "/metaphors",
    title: "Metaphors",
    line: `Ten images at a time — rate them the same way. ${FAVOURITE_THRESHOLD}+ becomes a lexicon favourite.`,
  },
  {
    href: "/lexicon",
    title: "My Lexy",
    line: "Every word you keep, sorted by how much you loved it — the spine Lexy uses to read your taste.",
  },
  {
    href: "/scribble",
    title: "Morning Scribble",
    line: "Scribble raw thoughts (or a photo); Lexy reshapes them so you can say it better afterward.",
  },
];

export default function HomePage() {
  return (
    <div className="mx-auto max-w-2xl space-y-7 sm:space-y-9 md:space-y-10">
      <FirstTimeBanner />

      <div className="space-y-2.5 sm:space-y-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#8B7355] sm:text-xs">Welcome</p>
        <h1 className="font-serif text-[1.6rem] font-normal italic leading-[1.2] tracking-tight text-[#1C1917] sm:text-3xl md:text-4xl md:leading-tight">
          Language is the dress of thought.
        </h1>
        <p className="font-serif text-[1.35rem] font-normal italic leading-[1.25] tracking-tight text-[#1C1917] sm:text-2xl md:text-3xl">
          Lexy is your wardrobe.
        </p>
        <p className="text-[13px] font-medium leading-snug text-[#8B7355] sm:text-sm">{LEXICON_NOD}</p>
        <p className="max-w-prose text-[15px] leading-[1.65] text-[#5c5550] sm:text-base">{HOME_HERO_SUPPORT}</p>
      </div>

      <LexyHomePreview />

      <div className="grid gap-3 sm:gap-4">
        {cards.map((c) => (
          <Link
            key={c.href}
            href={c.href}
            className="group rounded-2xl border border-[#EDE8E0] bg-white p-4 shadow-sm transition-all active:border-[#8B7355]/35 active:bg-[#FDFBF7] sm:p-5 sm:hover:border-[#8B7355]/40 sm:hover:shadow-md"
          >
            <h2 className="font-serif text-xl font-bold text-[#1C1917] group-hover:text-[#8B7355]">{c.title}</h2>
            <p className="mt-2 text-sm leading-relaxed text-[#6A6360]">{c.line}</p>
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
