"use client";

import { FAVOURITE_THRESHOLD } from "@/lib/lexyCopy";
import {
  OPEN_INTRO_EVENT,
  isIntroSeen,
  markIntroSeen,
} from "@/lib/introStorage";
import { useRouter } from "next/navigation";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

/* ── Voice & script ─────────────────────────────────────────
   Short but powerful. Each beat teaches one thing; together they
   move from the gap we solve → who you become → what each tool does. */

type Line = { text: string; serif?: boolean; big?: boolean; soft?: boolean };

type Scene =
  | { kind: "say"; eyebrow?: string; lines: Line[] }
  | {
      kind: "transform";
      eyebrow: string;
      intro: string;
      pairs: { from: string; to: string }[];
      outro: string;
    }
  | { kind: "feature"; eyebrow: string; index: number; title: string; blurb: string }
  | { kind: "finale"; eyebrow: string; title: string; line: string };

const FEATURES = [
  {
    href: "/dive",
    label: "Word Deep Dive",
    glyph: "dive" as const,
  },
  { href: "/metaphors", label: "Metaphors", glyph: "metaphor" as const },
  { href: "/lexicon", label: "My Lexy", glyph: "lexicon" as const },
  { href: "/scribble", label: "Morning Scribble", glyph: "scribble" as const },
];

const SCENES: Scene[] = [
  {
    kind: "say",
    eyebrow: "Welcome to Lexy",
    lines: [
      { text: "Language is the dress of thought.", serif: true, big: true },
      { text: "Lexy is your wardrobe.", serif: true, big: true },
    ],
  },
  {
    kind: "say",
    eyebrow: "The gap",
    lines: [
      { text: "There's a feeling in you right now that you can't quite name.", serif: true },
      {
        text: "So it comes out as “good.” “nice.” “a lot.” — and the truth of it quietly slips away.",
        soft: true,
      },
    ],
  },
  {
    kind: "say",
    eyebrow: "Why it matters",
    lines: [
      { text: "You can't think a thought you have no words for.", serif: true },
      {
        text: "A wider vocabulary isn't decoration. It's more of the world you're able to hold — and to say out loud.",
        soft: true,
      },
    ],
  },
  {
    kind: "say",
    eyebrow: "The idea",
    lines: [
      { text: "Lexy is short for lexicon — the words you keep, worn daily.", serif: true },
      {
        text: "Not words to memorise. Words to live in, until they fall from you without trying.",
        soft: true,
      },
    ],
  },
  {
    kind: "transform",
    eyebrow: "One week from now",
    intro: "You rate a handful of words a day. Quietly, your defaults begin to change:",
    pairs: [
      { from: "It was really good.", to: "It was quietly electric." },
      { from: "I'm so tired.", to: "I'm threadbare." },
      { from: "I don't like it.", to: "It grates on me." },
    ],
    outro: "You stop reaching for the pale word. The exact one is already waiting.",
  },
  {
    kind: "say",
    eyebrow: "How it learns you",
    lines: [
      { text: "Every word you rate teaches Lexy your taste.", serif: true },
      {
        text: `Love one past ${FAVOURITE_THRESHOLD}, and it joins your lexicon. The more you wear, the better Lexy dresses you.`,
        soft: true,
      },
    ],
  },
  {
    kind: "feature",
    eyebrow: "Your wardrobe · 1 of 4",
    index: 0,
    title: "Word Deep Dive",
    blurb:
      "Twenty-five words at a time. Rate each one; keep the ones that fit. Lexy reads your taste and tailors the next batch to you.",
  },
  {
    kind: "feature",
    eyebrow: "Your wardrobe · 2 of 4",
    index: 1,
    title: "Metaphors",
    blurb:
      "Ten images for a single idea. Find the one that makes a room lean in — the keepers become yours to reuse.",
  },
  {
    kind: "feature",
    eyebrow: "Your wardrobe · 3 of 4",
    index: 2,
    title: "My Lexy",
    blurb:
      "Everything you've kept, ranked by how much you loved it. Your mind, drawn in words you actually wear.",
  },
  {
    kind: "feature",
    eyebrow: "Your wardrobe · 4 of 4",
    index: 3,
    title: "Morning Scribble",
    blurb:
      "Spill a raw thought — or a photo of your notes. Lexy hands it back, said better, so you learn from your own voice.",
  },
  {
    kind: "finale",
    eyebrow: "You're ready",
    title: "This is your wardrobe for words.",
    line: "Let's dress your first thought.",
  },
];

const HOLD_MS = 820;

/* ── prefers-reduced-motion ─────────────────────────────────── */
function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const fn = () => setReduced(mq.matches);
    mq.addEventListener("change", fn);
    return () => mq.removeEventListener("change", fn);
  }, []);
  return reduced;
}

/* ── Hold-to-continue ring ──────────────────────────────────── */
function HoldToContinue({
  onComplete,
  reduced,
  label,
}: {
  onComplete: () => void;
  reduced: boolean;
  label: string;
}) {
  const [progress, setProgress] = useState(0);
  const rafRef = useRef<number | null>(null);
  const startRef = useRef<number>(0);
  const holdingRef = useRef(false);

  const stop = useCallback(() => {
    holdingRef.current = false;
    if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    setProgress(0);
  }, []);

  const begin = useCallback(() => {
    if (reduced) {
      onComplete();
      return;
    }
    if (holdingRef.current) return;
    holdingRef.current = true;
    startRef.current = performance.now();
    const tick = (now: number) => {
      if (!holdingRef.current) return;
      const p = Math.min(1, (now - startRef.current) / HOLD_MS);
      setProgress(p);
      if (p >= 1) {
        holdingRef.current = false;
        rafRef.current = null;
        setProgress(0);
        onComplete();
        return;
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
  }, [onComplete, reduced]);

  useEffect(() => stop, [stop]);

  const R = 30;
  const C = 2 * Math.PI * R;

  return (
    <div className="flex flex-col items-center gap-3 select-none">
      <button
        type="button"
        aria-label={reduced ? label : `${label} — press and hold`}
        onPointerDown={(e) => {
          e.preventDefault();
          begin();
        }}
        onPointerUp={stop}
        onPointerLeave={stop}
        onPointerCancel={stop}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onComplete();
          }
        }}
        className="relative grid h-[78px] w-[78px] touch-none place-items-center rounded-full outline-none transition-transform active:scale-95 focus-visible:ring-2 focus-visible:ring-[#C9A86A]/70"
      >
        <svg width="78" height="78" viewBox="0 0 78 78" className="absolute inset-0 -rotate-90">
          <circle cx="39" cy="39" r={R} fill="none" stroke="#3D3830" strokeWidth="3" />
          <circle
            cx="39"
            cy="39"
            r={R}
            fill="none"
            stroke="#C9A86A"
            strokeWidth="3"
            strokeLinecap="round"
            strokeDasharray={C}
            strokeDashoffset={C * (1 - progress)}
          />
        </svg>
        <span
          className={`grid h-[52px] w-[52px] place-items-center rounded-full bg-[#C9A86A] text-[#1C1917] shadow-[0_4px_18px_rgba(201,168,106,0.35)] transition-transform ${
            progress > 0 ? "scale-95" : ""
          }`}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path
              d="M5 12h13M13 6l6 6-6 6"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
      </button>
      <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-[#A89B86]">
        {reduced ? "Tap to continue" : "Hold to continue"}
      </p>
    </div>
  );
}

/* ── Feature glyphs ─────────────────────────────────────────── */
function Glyph({ name }: { name: (typeof FEATURES)[number]["glyph"] }) {
  const common = {
    width: 18,
    height: 18,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.7,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };
  switch (name) {
    case "dive":
      return (
        <svg {...common} aria-hidden="true">
          <path d="M4 8c2.5 2 4.5 2 7 0s4.5-2 7 0" />
          <path d="M4 14c2.5 2 4.5 2 7 0s4.5-2 7 0" />
          <path d="M12 18v2" />
        </svg>
      );
    case "metaphor":
      return (
        <svg {...common} aria-hidden="true">
          <circle cx="9" cy="12" r="5.5" />
          <circle cx="15" cy="12" r="5.5" />
        </svg>
      );
    case "lexicon":
      return (
        <svg {...common} aria-hidden="true">
          <path d="M7 4h10a1 1 0 0 1 1 1v15l-6-3.2L6 20V5a1 1 0 0 1 1-1Z" />
        </svg>
      );
    case "scribble":
      return (
        <svg {...common} aria-hidden="true">
          <path d="M4 20l4-1L19 8a2 2 0 0 0-3-3L5 16l-1 4Z" />
          <path d="M14 7l3 3" />
        </svg>
      );
  }
}

/* ── App-screen mock with a moving spotlight ────────────────── */
function FeatureScreen({ activeIndex }: { activeIndex: number }) {
  return (
    <div className="mx-auto w-full max-w-[15rem]">
      <div className="relative overflow-hidden rounded-[1.6rem] border border-[#3D3830] bg-[#161311] p-3 shadow-[0_18px_50px_rgba(0,0,0,0.45)]">
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-[#3D3830]" />
        <p className="px-1 font-serif text-sm italic text-[#C9A86A]">Lexy</p>
        <div className="mt-2 flex flex-col gap-1.5">
          {FEATURES.map((f, i) => {
            const active = i === activeIndex;
            return (
              <div
                key={f.href}
                className={`flex items-center gap-2.5 rounded-xl border px-2.5 py-2.5 transition-all duration-500 ${
                  active
                    ? "lexy-glow border-[#C9A86A]/70 bg-[#C9A86A]/12 text-[#F5EFE0] shadow-[0_0_22px_rgba(201,168,106,0.25)]"
                    : "border-transparent bg-[#1F1B18] text-[#7C7264] opacity-60"
                }`}
              >
                <span
                  className={`grid h-7 w-7 shrink-0 place-items-center rounded-lg ${
                    active ? "bg-[#C9A86A] text-[#1C1917]" : "bg-[#2A2520] text-[#9B9082]"
                  }`}
                >
                  <Glyph name={f.glyph} />
                </span>
                <span className="truncate text-[12px] font-medium">{f.label}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ── Scene renderer ─────────────────────────────────────────── */
function SceneView({ scene, reduced }: { scene: Scene; reduced: boolean }) {
  const rise = reduced ? "" : "lexy-rise";
  const delay = (i: number) => (reduced ? undefined : { animationDelay: `${0.08 + i * 0.14}s` });

  if (scene.kind === "say") {
    return (
      <div className="flex w-full max-w-md flex-col items-center text-center">
        {scene.eyebrow && (
          <p
            className={`${rise} text-[11px] font-semibold uppercase tracking-[0.24em] text-[#C9A86A]`}
            style={delay(0)}
          >
            {scene.eyebrow}
          </p>
        )}
        <div className="mt-6 space-y-4">
          {scene.lines.map((l, i) => (
            <p
              key={i}
              className={`${rise} ${
                l.serif ? "font-serif italic" : "font-sans"
              } ${
                l.big
                  ? "text-[1.85rem] leading-[1.2] text-[#F5EFE0] sm:text-4xl"
                  : l.serif
                    ? "text-[1.4rem] leading-snug text-[#F5EFE0] sm:text-2xl"
                    : "text-[15px] leading-relaxed text-[#B7AC9C] sm:text-base"
              }`}
              style={delay(i + 1)}
            >
              {l.text}
            </p>
          ))}
        </div>
      </div>
    );
  }

  if (scene.kind === "transform") {
    return (
      <div className="flex w-full max-w-md flex-col items-center text-center">
        <p className={`${rise} text-[11px] font-semibold uppercase tracking-[0.24em] text-[#C9A86A]`} style={delay(0)}>
          {scene.eyebrow}
        </p>
        <p className={`${rise} mt-5 text-[15px] leading-relaxed text-[#B7AC9C]`} style={delay(1)}>
          {scene.intro}
        </p>
        <div className="mt-5 w-full space-y-2.5">
          {scene.pairs.map((p, i) => (
            <div
              key={i}
              className={`${rise} flex items-center gap-3 rounded-xl border border-[#3D3830] bg-[#1F1B18] px-3.5 py-3 text-left`}
              style={delay(i + 2)}
            >
              <span className="min-w-0 flex-1 truncate text-[13px] text-[#7C7264] line-through decoration-[#5A5246]">
                {p.from}
              </span>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true" className="shrink-0 text-[#C9A86A]">
                <path d="M5 12h13M13 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <span className="min-w-0 flex-1 truncate font-serif text-[14px] italic text-[#F5EFE0]">{p.to}</span>
            </div>
          ))}
        </div>
        <p className={`${rise} mt-5 font-serif text-[1.15rem] italic leading-snug text-[#F5EFE0]`} style={delay(scene.pairs.length + 2)}>
          {scene.outro}
        </p>
      </div>
    );
  }

  if (scene.kind === "feature") {
    return (
      <div className="flex w-full max-w-md flex-col items-center text-center">
        <p className={`${rise} text-[11px] font-semibold uppercase tracking-[0.24em] text-[#C9A86A]`} style={delay(0)}>
          {scene.eyebrow}
        </p>
        <div className={`${rise} mt-5`} style={delay(1)}>
          <FeatureScreen activeIndex={scene.index} />
        </div>
        <h2 className={`${rise} mt-6 font-serif text-2xl font-bold text-[#F5EFE0]`} style={delay(2)}>
          {scene.title}
        </h2>
        <p className={`${rise} mt-2.5 max-w-sm text-[15px] leading-relaxed text-[#B7AC9C]`} style={delay(3)}>
          {scene.blurb}
        </p>
      </div>
    );
  }

  // finale
  return (
    <div className="flex w-full max-w-md flex-col items-center text-center">
      <p className={`${rise} text-[11px] font-semibold uppercase tracking-[0.24em] text-[#C9A86A]`} style={delay(0)}>
        {scene.eyebrow}
      </p>
      <h2 className={`${rise} mt-6 font-serif text-[1.85rem] font-bold italic leading-tight text-[#F5EFE0] sm:text-4xl`} style={delay(1)}>
        {scene.title}
      </h2>
      <p className={`${rise} mt-3 text-[15px] leading-relaxed text-[#B7AC9C] sm:text-base`} style={delay(2)}>
        {scene.line}
      </p>
    </div>
  );
}

/* ── Main overlay ───────────────────────────────────────────── */
export function LexyIntro() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  const reduced = usePrefersReducedMotion();
  const router = useRouter();
  const pathname = usePathname();

  // Auto-open for first-run visitors landing on the home screen.
  useEffect(() => {
    if (pathname === "/" && !isIntroSeen()) {
      setStep(0);
      setOpen(true);
    }
  }, [pathname]);

  // Allow any component to (re)open the story on demand.
  useEffect(() => {
    const handler = () => {
      setStep(0);
      setOpen(true);
    };
    window.addEventListener(OPEN_INTRO_EVENT, handler);
    return () => window.removeEventListener(OPEN_INTRO_EVENT, handler);
  }, []);

  // Lock background scroll while open.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  const finish = useCallback(
    (go?: string) => {
      markIntroSeen();
      setOpen(false);
      if (go) router.push(go);
    },
    [router],
  );

  const advance = useCallback(() => {
    setStep((s) => Math.min(SCENES.length - 1, s + 1));
  }, []);

  if (!open) return null;

  const scene = SCENES[step]!;
  const isFinale = scene.kind === "finale";

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Welcome to Lexy"
      className="lexy-fade fixed inset-0 z-[100] flex flex-col bg-[#1C1917] text-[#F5EFE0]"
      style={{
        paddingTop: "env(safe-area-inset-top)",
        paddingBottom: "env(safe-area-inset-bottom)",
      }}
    >
      {/* warm ambient glow */}
      <div className="pointer-events-none absolute -top-24 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-[#8B7355]/20 blur-3xl" />
      <div className="pointer-events-none absolute bottom-0 right-0 h-64 w-64 rounded-full bg-[#8B7355]/10 blur-3xl" />

      {/* top bar: progress + skip */}
      <div className="relative flex items-center gap-4 px-5 pt-4">
        <div className="flex flex-1 items-center gap-1.5">
          {SCENES.map((_, i) => (
            <span
              key={i}
              className={`h-1 flex-1 rounded-full transition-colors duration-500 ${
                i <= step ? "bg-[#C9A86A]" : "bg-[#3D3830]"
              }`}
            />
          ))}
        </div>
        <button
          type="button"
          onClick={() => finish()}
          className="shrink-0 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#7C7264] transition-colors hover:text-[#C9A86A]"
        >
          Skip
        </button>
      </div>

      {/* back affordance */}
      <div className="relative px-5 pt-3" style={{ minHeight: "1.75rem" }}>
        {step > 0 && (
          <button
            type="button"
            onClick={() => setStep((s) => Math.max(0, s - 1))}
            className="inline-flex items-center gap-1 text-[12px] font-medium text-[#7C7264] transition-colors hover:text-[#C9A86A]"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M19 12H6M11 18l-6-6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Back
          </button>
        )}
      </div>

      {/* scene */}
      <div key={step} className="relative flex flex-1 items-center justify-center overflow-y-auto px-6 py-4">
        <SceneView scene={scene} reduced={reduced} />
      </div>

      {/* footer control */}
      <div className="relative flex flex-col items-center gap-4 px-6 pb-7 pt-2">
        {isFinale ? (
          <div className="flex w-full max-w-xs flex-col items-center gap-3">
            <button
              type="button"
              onClick={() => finish("/dive")}
              className="w-full rounded-full bg-[#C9A86A] px-6 py-3.5 text-center text-sm font-semibold text-[#1C1917] shadow-[0_6px_22px_rgba(201,168,106,0.35)] transition-transform active:scale-[0.98]"
            >
              Begin my first Deep Dive
            </button>
            <button
              type="button"
              onClick={() => finish()}
              className="text-[13px] font-medium text-[#A89B86] transition-colors hover:text-[#F5EFE0]"
            >
              Just look around
            </button>
          </div>
        ) : (
          <HoldToContinue onComplete={advance} reduced={reduced} label="Continue" />
        )}
      </div>
    </div>
  );
}
