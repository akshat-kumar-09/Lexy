import { FactVisual } from "@/components/FactVisual";
import { SpeakingStudio } from "@/components/SpeakingStudio";
import { LEVER_GROUPS, MASTER_FACTS, STUDIO_TIPS } from "@/lib/articulation";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Articulate — the science of exuberant communication | Lexy",
  description:
    "Visual master-facts that change how you think about language, the levers of tone and body, and a studio for recording and speaking.",
};

export default function ArticulatePage() {
  return (
    <div className="mx-auto max-w-4xl space-y-10 pb-10 lg:max-w-6xl xl:max-w-7xl">
      {/* Hero — tight */}
      <header className="space-y-2">
        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#8B7355]">
          The world of exuberant communication
        </p>
        <h1 className="max-w-3xl font-serif text-2xl font-normal italic leading-[1.15] tracking-tight text-[#1C1917] sm:text-3xl md:text-4xl">
          Say it clearly. Be understood.
        </h1>
        <p className="max-w-xl text-[13px] leading-relaxed text-[#6A6360]">
          What we can name, we can face. The science of articulation — at a glance.
        </p>
      </header>

      {/* Master facts — visual-first grid */}
      <section className="space-y-4">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="font-serif text-lg font-bold text-[#1C1917] sm:text-xl">
            Master-facts
          </h2>
          <p className="text-[11px] text-[#B0A898]">12 ideas · one picture each</p>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {MASTER_FACTS.map((f, i) => (
            <article
              key={f.id}
              className="group flex flex-col overflow-hidden rounded-2xl border border-[#EDE8E0] bg-white shadow-sm transition sm:hover:border-[#8B7355]/40 sm:hover:shadow-md"
            >
              <div className="relative h-28 border-b border-[#F0EAE0] bg-[#FBF8F2] px-4 py-3 sm:h-32">
                <span className="absolute left-3 top-2 font-serif text-[11px] font-bold text-[#C8BFB0]">
                  {(i + 1).toString().padStart(2, "0")}
                </span>
                <FactVisual id={f.id} />
              </div>
              <div className="flex flex-1 flex-col px-4 py-3">
                <h3 className="font-serif text-[15px] font-bold leading-snug text-[#1C1917]">
                  {f.headline}
                </h3>
                <p className="mt-1 text-[12.5px] leading-snug text-[#6A6360]">{f.caption}</p>
                <p className="mt-auto pt-2 text-[10.5px] leading-tight text-[#B0A898]">{f.source}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* Levers — compact chips */}
      <section className="grid gap-4 lg:grid-cols-2">
        {LEVER_GROUPS.map((group) => (
          <div key={group.id} className="rounded-2xl border border-[#EDE8E0] bg-white p-4 shadow-sm sm:p-5">
            <h3 className="font-serif text-lg font-bold text-[#1C1917]">{group.title}</h3>
            <p className="mt-0.5 text-[12px] leading-snug text-[#8B7355]">{group.intro}</p>
            <dl className="mt-3 grid grid-cols-1 gap-x-4 gap-y-2 sm:grid-cols-2">
              {group.levers.map((lever) => (
                <div key={lever.name} className="border-l-2 border-[#EDE8E0] pl-2.5">
                  <dt className="font-serif text-[13px] font-bold text-[#1C1917]">{lever.name}</dt>
                  <dd className="text-[12px] leading-snug text-[#6A6360]">{lever.detail}</dd>
                </div>
              ))}
            </dl>
          </div>
        ))}
      </section>

      {/* Studio */}
      <section className="space-y-3">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="font-serif text-lg font-bold text-[#1C1917] sm:text-xl">
            Speak &amp; hear yourself
          </h2>
          <p className="text-[11px] text-[#B0A898]">stays on your device</p>
        </div>

        <SpeakingStudio />

        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
          {STUDIO_TIPS.map((tip) => (
            <div key={tip.title} className="rounded-xl border border-[#EDE8E0] bg-white px-4 py-3 shadow-sm">
              <p className="font-serif text-[13px] font-bold text-[#1C1917]">{tip.title}</p>
              <p className="mt-1 text-[12px] leading-snug text-[#6A6360]">{tip.detail}</p>
            </div>
          ))}
        </div>
      </section>

      <p className="border-t border-[#EDE8E0] pt-6 text-center font-serif text-[13px] italic leading-relaxed text-[#8B7355]">
        Clarity is courage — name it, and you can begin to meet it.
      </p>
    </div>
  );
}
