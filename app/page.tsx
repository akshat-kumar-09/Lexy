import { GenreStrip } from "@/components/GenreStrip";
import { LexyHomePreview } from "@/components/LexyHomePreview";
import Link from "next/link";

const cards = [
  {
    href: "/dive",
    title: "Word Deep Dive",
    line: "Twenty-five words at a time — tuned to your lexicon and the genres you pick. Rate to teach Lexy what you love.",
  },
  {
    href: "/daily",
    title: "Daily Word",
    line: "One word per day, meant for you — your saved words plus the worlds you said you care about.",
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
        <p className="text-base leading-relaxed text-[#6A6360]">
          Lexy grows vocabulary from who you already are — not a single template. Choose a few{" "}
          <span className="italic text-[#8B7355]">interest lenses</span> (nature, music, myth, tech, and more), keep
          rating words you adore, and Daily + Deep Dive will keep surfacing language that fits{" "}
          <span className="italic text-[#4A4340]">your</span> taste and obsessions.
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
