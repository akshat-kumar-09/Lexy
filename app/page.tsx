import { GenreStrip } from "@/components/GenreStrip";
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
    title: "Metaphor of the day",
    line: "One fresh metaphor a day — same rating flow as everything else. Save it: 7.7+ becomes a favourite in your lexicon.",
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
    <div className="mx-auto max-w-2xl space-y-8 sm:space-y-10">
      <div className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#8B7355]">Welcome</p>
        <h1 className="font-serif text-[1.65rem] font-normal italic leading-snug tracking-tight text-[#1C1917] sm:text-3xl md:text-4xl md:leading-tight">
          Language is the dress of thought.
        </h1>
        <p className="font-serif text-lg font-bold leading-snug text-[#8B7355] sm:text-xl md:text-2xl">
          Lexy is your wardrobe.
        </p>
        <p className="text-base leading-relaxed text-[#6A6360]">
          Lexy grows from who you already are — not a checklist of who you&apos;re supposed to be.{" "}
          <span className="italic text-[#8B7355]">How do you feel today?</span> What side of your interests do you want
          to lean into — just for now, not forever? Pick a few threads below; Metaphors and Deep Dive listen, and your
          ratings keep teaching the wardrobe what fits.
        </p>
      </div>

      <LexyHomePreview />

      <section className="rounded-2xl border border-[#EDE8E0] bg-white p-4 shadow-sm sm:p-5 md:p-6">
        <GenreStrip />
      </section>

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

      <p className="text-center font-serif text-sm italic text-[#B0A898]">
        Knowing how to say a word is as important as knowing what it means.
      </p>
    </div>
  );
}
