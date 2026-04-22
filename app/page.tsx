import { LexyHomePreview } from "@/components/LexyHomePreview";
import Link from "next/link";

const cards = [
  {
    href: "/dive",
    title: "Word Deep Dive",
    line: "Twenty-five words at a time — tuned to your lexicon and what you feel like exploring today. Rate to teach Lexy what you love.",
  },
  {
    href: "/metaphors",
    title: "Metaphors",
    line: "Ten images at a time — open one, rate it, save it. 7.7+ becomes a favourite, same as everywhere else.",
  },
  {
    href: "/lexicon",
    title: "My Lexy",
    line: "Your lexicon, sorted by love, ready to export — the spine of how everything else learns you.",
  },
  {
    href: "/scribble",
    title: "Morning Scribble",
    line: "A photo or a paragraph — Lexy reads you back to yourself, richer.",
  },
];

export default function HomePage() {
  return (
    <div className="mx-auto max-w-2xl space-y-7 sm:space-y-9 md:space-y-10">
      <div className="space-y-2.5 sm:space-y-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#8B7355] sm:text-xs">Welcome</p>
        <h1 className="font-serif text-[1.6rem] font-normal italic leading-[1.2] tracking-tight text-[#1C1917] sm:text-3xl md:text-4xl md:leading-tight">
          Language is the dress of thought.
        </h1>
        <p className="font-serif text-[1.35rem] font-normal italic leading-[1.25] tracking-tight text-[#1C1917] sm:text-2xl md:text-3xl">
          Lexy is your wardrobe.
        </p>
        <p className="max-w-prose text-[15px] leading-[1.65] text-[#5c5550] sm:text-base">
          Dress the thought you&apos;re in <span className="italic text-[#8B7355]">right now</span> — not a lifetime
          label. Tap a thread; Metaphor and Deep Dive follow. Your ratings teach what deserves to stay.
        </p>
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
    </div>
  );
}
