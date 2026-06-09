import { SpeakingStudio } from "@/components/SpeakingStudio";
import { LEVER_GROUPS, MASTER_FACTS, STUDIO_TIPS } from "@/lib/articulation";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Articulate — the science of exuberant communication | Lexy",
  description:
    "Master-facts that change how you think about language, plus the levers of tone and body language, and a studio for recording and speaking.",
};

export default function ArticulatePage() {
  return (
    <div className="mx-auto max-w-4xl space-y-14 pb-10 lg:max-w-6xl xl:max-w-7xl">
      {/* Hero */}
      <header className="space-y-4">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#8B7355] sm:text-xs">
          The world of exuberant communication
        </p>
        <h1 className="max-w-3xl font-serif text-[1.7rem] font-normal italic leading-[1.18] tracking-tight text-[#1C1917] sm:text-4xl md:text-5xl md:leading-[1.12]">
          To say what you mean is to know what you feel.
        </h1>
        <p className="max-w-2xl text-sm leading-relaxed text-[#6A6360] sm:text-base">
          Articulation, clarity, and the science underneath them. When we can name an
          experience, we gain awareness of it — and what we can name, we can face, share, and
          shape. This is the craft of being understood: the master-facts that change how you
          think about language, the levers of tone and body, and a place to record and hear your
          own voice grow.
        </p>
      </header>

      {/* Master facts */}
      <section className="space-y-5">
        <div className="space-y-1.5">
          <h2 className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#B0A898]">
            Master-facts
          </h2>
          <p className="font-serif text-xl font-bold text-[#1C1917] sm:text-2xl">
            Twelve truths that change how you think about language.
          </p>
          <p className="max-w-2xl text-sm leading-relaxed text-[#6A6360]">
            Each one is a small key — read it once and your sentences start to behave
            differently. (Where research is famously misquoted, the caveat is kept honest.)
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {MASTER_FACTS.map((f, i) => (
            <article
              key={f.id}
              className="flex flex-col rounded-2xl border border-[#EDE8E0] bg-white p-5 shadow-sm transition sm:hover:border-[#8B7355]/40 sm:hover:shadow-md sm:p-6"
            >
              <div className="flex items-baseline gap-3">
                <span className="font-serif text-sm font-bold text-[#8B7355]">
                  {(i + 1).toString().padStart(2, "0")}
                </span>
                <h3 className="font-serif text-lg font-bold leading-snug text-[#1C1917]">
                  {f.headline}
                </h3>
              </div>
              <p className="mt-3 text-sm leading-relaxed text-[#4A4340]">{f.body}</p>
              <div className="mt-4 rounded-xl border border-[#F0EAE0] bg-[#FBF8F2] px-4 py-3">
                <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#8B7355]">
                  Try this
                </p>
                <p className="mt-1 font-serif text-sm italic leading-relaxed text-[#3A3430]">
                  {f.practice}
                </p>
              </div>
              <p className="mt-3 text-[11px] leading-relaxed text-[#B0A898]">{f.source}</p>
            </article>
          ))}
        </div>
      </section>

      {/* Levers: Tone & Body language */}
      <section className="space-y-8">
        <div className="space-y-1.5">
          <h2 className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#B0A898]">
            The levers
          </h2>
          <p className="font-serif text-xl font-bold text-[#1C1917] sm:text-2xl">
            Words are half of it. Here is the other half.
          </p>
          <p className="max-w-2xl text-sm leading-relaxed text-[#6A6360]">
            How you sound and how you stand carry the feeling underneath your words. These are
            the dials you can actually turn — small, honest adjustments that change how you land.
          </p>
        </div>

        {LEVER_GROUPS.map((group) => (
          <div key={group.id} className="space-y-4">
            <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
              <h3 className="font-serif text-2xl font-bold text-[#1C1917] sm:text-3xl">
                {group.title}
              </h3>
              <p className="max-w-xl text-sm leading-relaxed text-[#8B7355]">{group.intro}</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {group.levers.map((lever) => (
                <div
                  key={lever.name}
                  className="rounded-2xl border border-[#EDE8E0] bg-white p-5 shadow-sm transition sm:hover:border-[#8B7355]/40"
                >
                  <p className="font-serif text-base font-bold text-[#1C1917]">{lever.name}</p>
                  <p className="mt-2 text-sm leading-relaxed text-[#4A4340]">{lever.detail}</p>
                </div>
              ))}
            </div>
          </div>
        ))}
      </section>

      {/* Recording & speaking */}
      <section className="space-y-5">
        <div className="space-y-1.5">
          <h2 className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#B0A898]">
            Recording &amp; speaking
          </h2>
          <p className="font-serif text-xl font-bold text-[#1C1917] sm:text-2xl">
            The studio. Speak, hear yourself, grow.
          </p>
          <p className="max-w-2xl text-sm leading-relaxed text-[#6A6360]">
            Reading about articulation builds knowledge; speaking builds the skill. Pick a
            prompt, record a take, and listen back for one thing. The recording lives only on
            your device.
          </p>
        </div>

        <SpeakingStudio />

        <div className="grid gap-3 sm:grid-cols-2">
          {STUDIO_TIPS.map((tip) => (
            <div
              key={tip.title}
              className="rounded-2xl border border-[#EDE8E0] bg-white p-5 shadow-sm"
            >
              <p className="font-serif text-base font-bold text-[#1C1917]">{tip.title}</p>
              <p className="mt-2 text-sm leading-relaxed text-[#4A4340]">{tip.detail}</p>
            </div>
          ))}
        </div>
      </section>

      <p className="border-t border-[#EDE8E0] pt-8 text-center font-serif text-sm italic leading-relaxed text-[#8B7355]">
        Clarity is courage. Every word you learn to wear is one more experience you can hold up
        to the light — and once you can name it, you can begin to meet it.
      </p>
    </div>
  );
}
