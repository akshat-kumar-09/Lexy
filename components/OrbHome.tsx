"use client";

import { NavAuthMobile } from "@/components/NavAuth";
import { openIntro } from "@/lib/introStorage";
import {
  ORBS,
  SUN,
  computeOrbs,
  chartBodyRadii,
  constellationLines,
  hashString,
  layoutOrbs,
  orbBackground,
  orbitThrough,
  skyWords,
  type OrbId,
  type OrbState,
  type Point,
} from "@/lib/orbs";
import { dismissSetupHint, isSetupHintDismissed } from "@/lib/setupStorage";
import { useLexicon, useOrbUsage, useTasteGridBatch } from "@/lib/store";
import type { LexiconWord } from "@/lib/types";
import { motion, useReducedMotion } from "framer-motion";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

type Circle = Point & { r: number };
type PlacedOrb = OrbState & Circle;
type Bloom = PlacedOrb & { vx: number; vy: number };

/** Gold ink for the chart's lines, stars and lettering. */
const INK = "#A8875C";

/** The sun is never drawn smaller than this share — it's what everything circles. */
const SUN_MIN_WEIGHT = 1.3;

/**
 * Where each planet was the last time Home was on screen. Coming back, planets start
 * there and swell or shrink to their new size — you see your habits take shape.
 */
const lastPlaced: Partial<Record<OrbId, Circle>> = {};

/** Ticks every few minutes so morning/evening logic keeps up with an open tab. */
function useClock(intervalMs = 5 * 60_000) {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    setNow(Date.now());
    const t = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(t);
  }, [intervalMs]);
  return now;
}

function useElementSize<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [size, setSize] = useState<{ w: number; h: number } | null>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      setSize((s) => (s && Math.abs(s.w - width) < 1 && Math.abs(s.h - height) < 1 ? s : { w: width, h: height }));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, size] as const;
}

/**
 * Home: Lexy's universe, drawn like an old celestial chart on parchment. Your own words are
 * the sun at the centre; every way of growing your language is a planet on its orbit, sized
 * by how you use it (see lib/orbs.ts), with a moon for each word you've kept there. Your kept
 * words are the stars, joined into constellations. Tapping a planet lands you on it.
 */
export function OrbHome() {
  const words = useLexicon((s) => s.words);
  const metaphorHistory = useLexicon((s) => s.metaphor_history);
  const scribbles = useLexicon((s) => s.scribble_rewrites);
  const visits = useOrbUsage((s) => s.visits);
  const grid = useTasteGridBatch((s) => s.tasteGridBatch);
  const now = useClock();
  const [rootRef, rootSize] = useElementSize<HTMLDivElement>();
  const [fieldRef, size] = useElementSize<HTMLDivElement>();
  const router = useRouter();
  const reduceMotion = useReducedMotion();
  const [bloom, setBloom] = useState<Bloom | null>(null);
  const [showTour, setShowTour] = useState(false);

  useEffect(() => {
    setShowTour(!isSetupHintDismissed());
    for (const o of ORBS) router.prefetch(o.href.split("#")[0]);
  }, [router]);

  const orbs = useMemo(
    () =>
      now == null
        ? null
        : computeOrbs({
            now,
            lexicon: { words, metaphor_history: metaphorHistory, scribble_rewrites: scribbles },
            visits,
            gridWords: grid.map((g) => g.word),
          }),
    [now, words, metaphorHistory, scribbles, visits, grid]
  );

  /** On a phone the names stand alone; with more room, each carries its line beneath. */
  const roomy = size != null && Math.min(size.w, size.h) >= 600;

  /** The planet you spend the most time on wears a ring; until there is one, Deep Dive does. */
  const ringed = useMemo<OrbId>(() => {
    const planets = (orbs ?? []).filter((o) => o.id !== SUN);
    const top = planets.reduce<OrbState | null>((a, o) => (!a || o.usage > a.usage ? o : a), null);
    return top && top.usage > 0 ? top.id : "dive";
  }, [orbs]);

  const placed = useMemo<PlacedOrb[] | null>(() => {
    if (!orbs || !size || size.w < 80 || size.h < 80) return null;
    const sunAt = orbs.findIndex((o) => o.id === SUN);
    const bodies = chartBodyRadii(
      orbs.map((o) => (o.id === SUN ? Math.max(SUN_MIN_WEIGHT, o.weight) : o.weight)),
      size.w,
      size.h,
      sunAt
    );
    // Each body keeps clear room for everything drawn with it: rays, rings, moons and its name.
    const reach = orbs.map((o, i) =>
      o.id === SUN ? bodies[i] * 1.32 : planetReach(o, bodies[i], o.id === ringed, roomy)
    );
    const seed = orbs.map((o) => lastPlaced[o.id]);
    const { positions, radii: fitted } = layoutOrbs(reach, size.w, size.h, seed, sunAt);
    return orbs.map((o, i) => ({
      ...o,
      x: positions[i].x,
      y: positions[i].y,
      r: bodies[i] * (fitted[i] / reach[i]),
    }));
  }, [orbs, size, ringed, roomy]);

  useEffect(() => {
    if (placed) for (const p of placed) lastPlaced[p.id] = { x: p.x, y: p.y, r: p.r };
  }, [placed]);

  const sun = placed?.find((p) => p.id === SUN) ?? null;

  const sky = useMemo(() => skyWords(words), [words]);
  const favourites = useMemo(
    () =>
      Object.values(words)
        .sort((a, b) => b.rating - a.rating)
        .slice(0, 6)
        .map((w) => w.word),
    [words]
  );
  const earlyDays = (orbs?.reduce((a, o) => a + o.usage, 0) ?? 0) < 8;

  function open(orb: PlacedOrb, e: React.MouseEvent<HTMLAnchorElement>) {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
    e.preventDefault();
    if (bloom) return;
    const rect = fieldRef.current?.getBoundingClientRect();
    if (reduceMotion || !rect) {
      router.push(orb.def.href);
      return;
    }
    setBloom({ ...orb, vx: rect.left + orb.x, vy: rect.top + orb.y });
  }

  return (
    <div
      ref={rootRef}
      className="relative flex min-h-[100dvh] flex-col overflow-hidden text-[#1C1917]"
      style={{ background: "radial-gradient(120% 90% at 50% 40%, #FFFDF9 0%, #FBF7EF 52%, #F1E8D8 100%)" }}
      data-no-deep-dive
    >
      <div aria-hidden className="lexy-paper pointer-events-none absolute inset-0 opacity-[0.06] mix-blend-multiply" />
      {rootSize && <StarChart words={sky} lexicon={words} w={rootSize.w} h={rootSize.h} />}
      <ChartFrame />

      <header className="relative z-10 flex items-start justify-between gap-4 px-6 pt-[calc(1.1rem+env(safe-area-inset-top))] sm:px-9 sm:pt-8">
        <div>
          <h1 className="font-serif text-[1.6rem] font-bold tracking-tight text-[#1C1917]">Lexy</h1>
          <p className="mt-0.5 font-serif text-[13px] italic text-[#8B7355]">your wardrobe for words</p>
        </div>
        <div className="flex items-center gap-1 sm:gap-2">
          <NavAuthMobile />
          <Link
            href="/settings"
            className="flex min-h-11 items-center px-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#8B7355] hover:text-[#1C1917]"
          >
            Settings
          </Link>
        </div>
      </header>

      <nav ref={fieldRef} aria-label="Lexy's planets — ways to grow your language" className="relative z-10 min-h-[24rem] flex-1">
        {placed && sun && size && <Orbits planets={placed} sun={sun} w={size.w} h={size.h} />}
        {placed?.map((o, i) => (
          <Planet
            key={o.id}
            orb={o}
            index={i}
            sun={o.id === SUN ? null : sun}
            roomy={roomy}
            ringed={o.id === ringed}
            favourites={o.id === SUN ? favourites : undefined}
            hidden={bloom?.id === o.id}
            onOpen={open}
          />
        ))}
      </nav>

      <footer className="relative z-10 space-y-1.5 px-6 pb-[calc(4.75rem+env(safe-area-inset-bottom))] pt-3 text-center sm:pb-9">
        <p className="font-serif text-[15px] italic text-[#8B7355]">Language is the dress of thought.</p>
        {earlyDays && (
          <p className="text-[11px] text-[#B0A898]">Each planet grows as you use it. The words you keep become your stars.</p>
        )}
        {showTour && (
          <p className="text-[11px] text-[#B0A898]">
            New here?{" "}
            <button type="button" onClick={() => openIntro()} className="font-semibold text-[#8B7355] hover:underline">
              Take the tour
            </button>
            {" · "}
            <button
              type="button"
              onClick={() => {
                dismissSetupHint();
                setShowTour(false);
              }}
              className="hover:underline"
            >
              Hide
            </button>
          </p>
        )}
      </footer>

      {bloom && <BloomOverlay bloom={bloom} onDone={() => router.push(bloom.def.href)} />}
    </div>
  );
}

/** How a planet's name is set beneath it. */
function nameStyle(roomy: boolean) {
  return { size: roomy ? 15 : 13.5, maxW: roomy ? 150 : 96, lineSize: 11 };
}

/**
 * The room a planet needs around its centre: itself, its ring and moons, and its name (and, with
 * room to spare, its line) set beneath it.
 */
function planetReach(o: OrbState, r: number, ringed: boolean, roomy: boolean): number {
  const { size, maxW, lineSize } = nameStyle(roomy);
  const nameW = o.def.label.length * size * 0.5;
  const lines = nameW > maxW ? 2 : 1;
  const below = 6 + lines * size * 1.2 + (roomy ? 4 + 2 * lineSize * 1.35 : 0);
  const half = Math.min(roomy ? maxW : nameW, maxW) / 2 + 6;
  const moons = Math.min(3, o.kept);
  return Math.max(
    r + below,
    half,
    moons ? r + 9 + (moons - 1) * 8 + 4 : 0,
    ringed ? r * 1.62 + 4 : 0
  );
}

/** A plate border in two hairlines, the way old star charts were printed. */
function ChartFrame() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0">
      <span className="absolute inset-[9px] rounded-[3px] border" style={{ borderColor: `${INK}55` }} />
      <span className="absolute inset-[13px] rounded-[2px] border" style={{ borderColor: `${INK}26` }} />
    </div>
  );
}

/** The aspect of the orbits: the shape of the sky, kept within sensible bounds. */
function orbitAspect(w: number, h: number): number {
  return Math.min(1.3, Math.max(0.5, h / w));
}

/** Dotted gold orbits around the sun, one through each planet, with the chart's two axes. */
function Orbits({ planets, sun, w, h }: { planets: PlacedOrb[]; sun: PlacedOrb; w: number; h: number }) {
  const aspect = orbitAspect(w, h);
  const orbits = planets
    .filter((p) => p.id !== SUN)
    .map((p) => ({ id: p.id, ...orbitThrough(p, sun, aspect) }))
    .filter((o) => o.rx > sun.r * 0.9);
  const inner = Math.min(...orbits.map((o) => o.rx), Infinity);
  return (
    <svg aria-hidden className="pointer-events-none absolute inset-0 overflow-visible" width={w} height={h}>
      <g stroke={INK} fill="none" strokeLinecap="round">
        <line x1={-40} x2={w + 40} y1={sun.y} y2={sun.y} strokeWidth={0.6} strokeOpacity={0.16} strokeDasharray="1 7" />
        <line x1={sun.x} x2={sun.x} y1={-200} y2={h + 200} strokeWidth={0.6} strokeOpacity={0.16} strokeDasharray="1 7" />
        {orbits.map((o) => {
          // Kepler: the farther out, the slower the dots travel.
          const period = Math.min(260, Math.max(50, 60 * Math.pow(o.rx / inner, 1.5)));
          return (
            <ellipse
              key={o.id}
              className="lexy-orbit"
              cx={sun.x}
              cy={sun.y}
              rx={o.rx}
              ry={o.ry}
              strokeWidth={0.9}
              strokeOpacity={0.4}
              strokeDasharray="1.5 6.5"
              style={{ animationDuration: `${period}s` }}
            />
          );
        })}
      </g>
    </svg>
  );
}

/** Your kept words as stars (the ones you love shine brighter), joined into constellations. */
function StarChart({
  words,
  lexicon,
  w,
  h,
}: {
  words: string[];
  lexicon: Record<string, LexiconWord>;
  w: number;
  h: number;
}) {
  const stars = useMemo(
    () =>
      words.map((word) => {
        const hh = hashString(word);
        const rating = lexicon[word.toLowerCase()]?.rating ?? 0;
        return {
          word,
          x: ((hh % 1000) / 1000) * w,
          y: (((hh >>> 10) % 1000) / 1000) * h,
          bright: rating >= 8,
          size: 10.5 + ((hh >>> 20) % 6),
          fade: 0.14 + ((hh >>> 5) % 8) / 100,
        };
      }),
    [words, lexicon, w, h]
  );
  const lines = useMemo(() => constellationLines(stars, Math.min(w, h) * 0.24), [stars, w, h]);

  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 select-none overflow-hidden [mask-image:linear-gradient(to_bottom,transparent_0%,black_15%,black_74%,transparent_90%)]"
    >
      <svg className="absolute inset-0" width={w} height={h}>
        <g stroke={INK} strokeWidth={0.6} strokeOpacity={0.24}>
          {lines.map(([a, b]) => (
            <line key={`${a}-${b}`} x1={stars[a].x} y1={stars[a].y} x2={stars[b].x} y2={stars[b].y} />
          ))}
        </g>
        <g fill={INK}>
          {stars.map((s) =>
            s.bright ? (
              <path
                key={s.word}
                d={`M${s.x} ${s.y - 4.5}L${s.x + 1.1} ${s.y - 1.1}L${s.x + 4.5} ${s.y}L${s.x + 1.1} ${s.y + 1.1}L${s.x} ${s.y + 4.5}L${s.x - 1.1} ${s.y + 1.1}L${s.x - 4.5} ${s.y}L${s.x - 1.1} ${s.y - 1.1}Z`}
                fillOpacity={0.75}
              />
            ) : (
              <circle key={s.word} cx={s.x} cy={s.y} r={1.5} fillOpacity={0.55} />
            )
          )}
        </g>
      </svg>
      {stars.map((s) => {
        // Names sit beside their star, on whichever side has room.
        const left = s.x < w * 0.62;
        return (
          <span
            key={s.word}
            className="absolute whitespace-nowrap font-serif italic text-[#8B7355]"
            style={{
              ...(left ? { left: s.x + 6 } : { right: w - s.x + 6 }),
              top: s.y,
              fontSize: s.size,
              opacity: s.bright ? s.fade + 0.12 : s.fade,
              transform: "translateY(-50%)",
            }}
          >
            {s.word}
          </span>
        );
      })}
    </div>
  );
}

function Planet({
  orb,
  index,
  sun,
  roomy,
  ringed,
  favourites,
  hidden,
  onOpen,
}: {
  orb: PlacedOrb;
  index: number;
  /** The sun this planet circles — null for the sun itself. */
  sun: PlacedOrb | null;
  roomy: boolean;
  ringed: boolean;
  favourites?: string[];
  hidden: boolean;
  onOpen: (orb: PlacedOrb, e: React.MouseEvent<HTMLAnchorElement>) => void;
}) {
  const { def, r } = orb;
  const d = r * 2;
  const isSun = sun == null;
  const labelSize = Math.max(14, Math.min(28, r * 0.24));
  const lineSize = Math.max(10, Math.min(13, r * 0.11));
  const showLine = r >= 44;
  const name = nameStyle(roomy);
  const px = (k: number) => Math.round(r * k);
  const enter = { delay: 0.08 * index, duration: 0.7, ease: [0.16, 0.84, 0.44, 1] as const };
  // First visit: planets bloom in where they belong. Coming back: they grow from where they were.
  const [from] = useState(() => lastPlaced[orb.id]);

  // Each planet is lit from the sun: the highlight leans toward it, the far side falls into shadow.
  const toSun = sun ? Math.atan2(sun.y - orb.y, sun.x - orb.x) : -2.2;
  const lx = `${Math.round(50 + Math.cos(toSun) * 22)}%`;
  const ly = `${Math.round(50 + Math.sin(toSun) * 22)}%`;
  const awayDeg = Math.round(((Math.atan2(-Math.sin(toSun), -Math.cos(toSun)) * 180) / Math.PI + 90 + 360) % 360);
  const bandTilt = -12 + (hashString(def.id) % 24);
  const bandGap = Math.max(7, r * 0.2);
  const moons = isSun ? 0 : Math.min(3, orb.kept);

  return (
    <motion.div
      className="absolute left-0 top-0"
      initial={
        from
          ? { x: from.x - from.r, y: from.y - from.r, width: from.r * 2, height: from.r * 2, opacity: 1, scale: 1 }
          : { x: orb.x - r, y: orb.y - r, width: d, height: d, opacity: 0, scale: 0.4 }
      }
      animate={{ x: orb.x - r, y: orb.y - r, width: d, height: d, opacity: hidden ? 0 : 1, scale: 1 }}
      transition={{
        default: { type: "spring", stiffness: 60, damping: 15 },
        opacity: hidden ? { duration: 0.15 } : enter,
        scale: enter,
      }}
    >
      <div
        className="lexy-orb-float relative h-full w-full"
        style={isSun ? undefined : { animationDuration: `${8 + (index % 4) * 1.7}s`, animationDelay: `${-index * 1.3}s` }}
      >
        {isSun && <SunRays r={r} />}
        {ringed && !isSun && <PlanetRing r={r} half="back" />}
        {Array.from({ length: moons }, (_, m) => (
          <Moon key={m} r={r} index={m} color={def.hi} />
        ))}
        <Link
          href={def.href}
          onClick={(e) => onOpen(orb, e)}
          onPointerMove={followLight}
          onPointerLeave={restLight}
          data-lx={lx}
          data-ly={ly}
          aria-label={`${def.label}: ${orb.line}`}
          className="lexy-orb relative flex h-full w-full items-center justify-center rounded-full text-center outline-none hover:scale-[1.03] focus-visible:ring-1 focus-visible:ring-[#8B7355] focus-visible:ring-offset-[6px] focus-visible:ring-offset-[#FBF7EF] active:scale-[0.985]"
          style={
            {
              "--lx": lx,
              "--ly": ly,
              background: orbBackground(def),
              color: def.ink,
              boxShadow: [
                `0 ${px(0.3)}px ${px(0.55)}px -${px(0.2)}px rgba(28,25,23,0.32)`,
                `0 ${px(0.08)}px ${px(isSun ? 1.3 : 0.9)}px ${def.glow}`,
                `inset 0 0 ${px(0.14)}px rgba(255,255,255,0.12)`,
                "inset 0 0 0 1px rgba(28,25,23,0.06)",
              ].join(", "),
            } as React.CSSProperties
          }
        >
          {!isSun && (
            <span
              aria-hidden
              className="pointer-events-none absolute inset-0 rounded-full opacity-[0.06]"
              style={{
                backgroundImage: `repeating-linear-gradient(${bandTilt}deg, transparent 0 ${bandGap}px, currentColor ${bandGap}px ${bandGap + 1}px)`,
              }}
            />
          )}
          {!isSun && (
            <span
              aria-hidden
              className="pointer-events-none absolute inset-0 rounded-full"
              style={{ background: `linear-gradient(${awayDeg}deg, rgba(18,10,6,0) 42%, rgba(18,10,6,0.36) 100%)` }}
            />
          )}
          <span aria-hidden className="lexy-orb-sheen pointer-events-none absolute inset-0 rounded-full" />
          <span aria-hidden className="lexy-orb-rim pointer-events-none absolute inset-0 rounded-full" />
          <span aria-hidden className="lexy-grain pointer-events-none absolute inset-0 rounded-full opacity-[0.18] mix-blend-overlay" />
          {favourites && favourites.length > 0 && r >= 72 && <FavouriteRing words={favourites} r={r} />}
          {isSun ? (
            <span className="relative block px-[15%]">
              <span className="block font-serif leading-[1.12] tracking-[-0.01em]" style={{ fontSize: labelSize }}>
                {def.label}
              </span>
              {showLine && (
                <>
                  <span aria-hidden className="mx-auto mt-2 block h-px w-5 bg-current opacity-30" />
                  <span className="mt-1.5 block leading-snug tracking-[0.01em] opacity-70" style={{ fontSize: lineSize }}>
                    {orb.line}
                  </span>
                </>
              )}
            </span>
          ) : (
            // Engraved beneath the planet, the way a chart names its bodies.
            <span
              className="absolute left-1/2 top-full mt-1.5 -translate-x-1/2 text-center"
              style={{ width: name.maxW, textShadow: "0 0 8px #FBF7EF, 0 0 3px #FBF7EF, 0 0 1px #FBF7EF" }}
            >
              <span className="block font-serif leading-[1.15] text-[#2C2420]" style={{ fontSize: name.size }}>
                {def.label}
              </span>
              {roomy && (
                <span className="mt-1 block font-serif italic leading-snug text-[#8B7355]" style={{ fontSize: name.lineSize }}>
                  {orb.line}
                </span>
              )}
            </span>
          )}
          {orb.fresh && (
            <span
              aria-hidden
              className="lexy-orb-new pointer-events-none absolute -inset-[5px] rounded-full text-[#8B7355]"
            />
          )}
        </Link>
        {ringed && !isSun && <PlanetRing r={r} half="front" />}
      </div>
    </motion.div>
  );
}

/** The highlight leans toward the pointer, the way light moves on glass as you tilt it. */
function followLight(e: React.PointerEvent<HTMLElement>) {
  const el = e.currentTarget;
  const b = el.getBoundingClientRect();
  const x = (e.clientX - b.left) / b.width;
  const y = (e.clientY - b.top) / b.height;
  el.style.setProperty("--lx", `${18 + x * 40}%`);
  el.style.setProperty("--ly", `${12 + y * 34}%`);
}

/** …and settles back toward the sun. */
function restLight(e: React.PointerEvent<HTMLElement>) {
  const el = e.currentTarget;
  el.style.setProperty("--lx", el.dataset.lx ?? "34%");
  el.style.setProperty("--ly", el.dataset.ly ?? "26%");
}

/** Fine engraved rays around the sun, turning very slowly. */
function SunRays({ r }: { r: number }) {
  const n = 32;
  const box = r * 2.7;
  const c = box / 2;
  return (
    <svg
      aria-hidden
      className="lexy-orb-spin pointer-events-none absolute"
      width={box}
      height={box}
      style={{ left: r - c, top: r - c, animationDuration: "240s" }}
    >
      <g stroke={INK} strokeLinecap="round">
        {Array.from({ length: n }, (_, i) => {
          const a = (i / n) * Math.PI * 2;
          const long = i % 2 === 0;
          const r0 = r * 1.1;
          const r1 = r * (long ? 1.3 : 1.2);
          return (
            <line
              key={i}
              x1={c + Math.cos(a) * r0}
              y1={c + Math.sin(a) * r0}
              x2={c + Math.cos(a) * r1}
              y2={c + Math.sin(a) * r1}
              strokeWidth={long ? 1 : 0.7}
              strokeOpacity={long ? 0.5 : 0.32}
            />
          );
        })}
      </g>
      <circle cx={c} cy={c} r={r * 1.05} fill="none" stroke={INK} strokeOpacity={0.3} strokeWidth={0.7} />
    </svg>
  );
}

/** A tilted ring: the back half passes behind the planet, the front half across it. */
function PlanetRing({ r, half }: { r: number; half: "back" | "front" }) {
  const rx = r * 1.62;
  const ry = r * 0.36;
  const w = rx * 2 + 8;
  const h = r * 2 + 8;
  const id = `ring-clip-${half}-${Math.round(r)}`;
  return (
    <svg
      aria-hidden
      className="pointer-events-none absolute"
      width={w}
      height={h}
      style={{ left: r - w / 2, top: r - h / 2 }}
    >
      <defs>
        <clipPath id={id}>
          <rect x={-w} y={half === "front" ? 0 : -h} width={w * 2} height={h} />
        </clipPath>
      </defs>
      <g transform={`translate(${w / 2} ${h / 2}) rotate(-16)`}>
        <ellipse
          rx={rx}
          ry={ry}
          fill="none"
          stroke={INK}
          strokeWidth={Math.max(1.6, r * 0.035)}
          strokeOpacity={half === "front" ? 0.75 : 0.45}
          clipPath={`url(#${id})`}
        />
        <ellipse
          rx={rx * 0.9}
          ry={ry * 0.9}
          fill="none"
          stroke={INK}
          strokeWidth={0.7}
          strokeOpacity={half === "front" ? 0.5 : 0.3}
          clipPath={`url(#${id})`}
        />
      </g>
    </svg>
  );
}

/** A small moon for a word you kept here, circling just outside the planet. */
function Moon({ r, index, color }: { r: number; index: number; color: string }) {
  const orbit = r + 9 + index * 8;
  const size = Math.max(5, Math.min(8, r * 0.09));
  return (
    <span
      aria-hidden
      className="lexy-orb-spin pointer-events-none absolute"
      style={{
        left: r - orbit,
        top: r - orbit,
        width: orbit * 2,
        height: orbit * 2,
        animationDuration: `${26 + index * 14}s`,
        animationDelay: `${-index * 9}s`,
      }}
    >
      <span
        className="absolute left-1/2 top-0 rounded-full"
        style={{
          width: size,
          height: size,
          transform: "translate(-50%, -50%)",
          background: `radial-gradient(circle at 35% 30%, #FFFDF7, ${color} 70%)`,
          boxShadow: "0 0 0 0.5px rgba(28,25,23,0.25)",
        }}
      />
    </span>
  );
}

/** Your favourite words circling slowly inside the sun. */
function FavouriteRing({ words, r }: { words: string[]; r: number }) {
  const ring = r * 0.74;
  const size = Math.max(9.5, Math.min(13, r * 0.075));
  return (
    <span aria-hidden className="lexy-orb-spin pointer-events-none absolute inset-0">
      {words.map((w, i) => {
        const angle = (i / words.length) * 360;
        return (
          <span
            key={w}
            className="absolute left-1/2 top-1/2 whitespace-nowrap font-serif italic opacity-35"
            style={{
              fontSize: size,
              transform: `translate(-50%, -50%) rotate(${angle}deg) translateY(-${ring}px)`,
            }}
          >
            {w}
          </span>
        );
      })}
    </span>
  );
}

/** Landing: the tapped planet swells to fill the screen and settles into the page's parchment. */
function BloomOverlay({ bloom, onDone }: { bloom: Bloom; onDone: () => void }) {
  const done = useRef(false);
  const reach = Math.hypot(
    Math.max(bloom.vx, window.innerWidth - bloom.vx),
    Math.max(bloom.vy, window.innerHeight - bloom.vy)
  );
  const ease = [0.7, 0, 0.3, 1] as const;
  return (
    <div aria-hidden className="fixed inset-0 z-[70]">
      <motion.div
        className="absolute overflow-hidden rounded-full"
        style={{
          left: bloom.vx - bloom.r,
          top: bloom.vy - bloom.r,
          width: bloom.r * 2,
          height: bloom.r * 2,
          background: orbBackground(bloom.def),
        }}
        initial={{ scale: 1 }}
        animate={{ scale: (reach / bloom.r) * 1.05 }}
        transition={{ duration: 0.65, ease }}
        onAnimationComplete={() => {
          if (done.current) return;
          done.current = true;
          onDone();
        }}
      >
        <motion.div
          className="h-full w-full bg-[#FEFCF8]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.55, delay: 0.1, ease }}
        />
      </motion.div>
      <motion.span
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4, duration: 0.4 }}
        className="absolute inset-0 flex items-center justify-center font-serif text-2xl italic text-[#8B7355]"
      >
        {bloom.def.label}
      </motion.span>
    </div>
  );
}
