"use client";

import { NavAuthMobile } from "@/components/NavAuth";
import { openIntro } from "@/lib/introStorage";
import {
  ORBS,
  computeOrbs,
  computeRadii,
  hashString,
  layoutOrbs,
  orbBackground,
  skyWords,
  type OrbId,
  type OrbState,
  type Point,
} from "@/lib/orbs";
import { dismissSetupHint, isSetupHintDismissed } from "@/lib/setupStorage";
import { useLexicon, useOrbUsage, useTasteGridBatch } from "@/lib/store";
import { motion, useReducedMotion } from "framer-motion";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

type Circle = Point & { r: number };
type PlacedOrb = OrbState & Circle;
type Bloom = PlacedOrb & { vx: number; vy: number };

/**
 * Where each orb was the last time Home was on screen. Coming back, orbs start
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
 * Home: the ways of growing your language, as orbs on one sky. Each orb's size
 * follows how you use Lexy (see lib/orbs.ts); tapping one blooms it into its page.
 */
export function OrbHome() {
  const words = useLexicon((s) => s.words);
  const metaphorHistory = useLexicon((s) => s.metaphor_history);
  const scribbles = useLexicon((s) => s.scribble_rewrites);
  const visits = useOrbUsage((s) => s.visits);
  const grid = useTasteGridBatch((s) => s.tasteGridBatch);
  const now = useClock();
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

  const placed = useMemo<PlacedOrb[] | null>(() => {
    if (!orbs || !size || size.w < 80 || size.h < 80) return null;
    const radii = computeRadii(
      orbs.map((o) => o.weight),
      size.w,
      size.h
    );
    const seed = orbs.map((o) => lastPlaced[o.id]);
    const { positions, radii: fitted } = layoutOrbs(radii, size.w, size.h, seed);
    return orbs.map((o, i) => ({ ...o, x: positions[i].x, y: positions[i].y, r: fitted[i] }));
  }, [orbs, size]);

  useEffect(() => {
    if (placed) for (const p of placed) lastPlaced[p.id] = { x: p.x, y: p.y, r: p.r };
  }, [placed]);

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
      className="relative flex min-h-[100dvh] flex-col overflow-hidden text-[#1C1917]"
      style={{ background: "radial-gradient(120% 90% at 50% 0%, #FFFDF9 0%, #FBF7EF 55%, #F3ECDF 100%)" }}
      data-no-deep-dive
    >
      <div aria-hidden className="lexy-paper pointer-events-none absolute inset-0 opacity-[0.05] mix-blend-multiply" />
      <WordSky words={sky} />

      <header className="relative z-10 flex items-start justify-between gap-4 px-5 pt-[calc(1rem+env(safe-area-inset-top))] sm:px-8 sm:pt-7">
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

      <nav ref={fieldRef} aria-label="Ways to grow your language" className="relative z-10 min-h-[24rem] flex-1">
        {placed?.map((o, i) => (
          <Orb
            key={o.id}
            orb={o}
            index={i}
            favourites={o.id === "lexicon" ? favourites : undefined}
            hidden={bloom?.id === o.id}
            onOpen={open}
          />
        ))}
      </nav>

      <footer className="relative z-10 space-y-1.5 px-5 pb-[calc(4.75rem+env(safe-area-inset-bottom))] pt-3 text-center sm:pb-8">
        <p className="font-serif text-[15px] italic text-[#8B7355]">Language is the dress of thought.</p>
        {earlyDays && <p className="text-[11px] text-[#B0A898]">Each orb grows with the ways you use Lexy.</p>}
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

function Orb({
  orb,
  index,
  favourites,
  hidden,
  onOpen,
}: {
  orb: PlacedOrb;
  index: number;
  favourites?: string[];
  hidden: boolean;
  onOpen: (orb: PlacedOrb, e: React.MouseEvent<HTMLAnchorElement>) => void;
}) {
  const { def, r } = orb;
  const d = r * 2;
  const labelSize = Math.max(13, Math.min(28, r * 0.19));
  const lineSize = Math.max(10, Math.min(13, r * 0.075));
  const showLine = r >= 58;
  const px = (k: number) => Math.round(r * k);
  const enter = { delay: 0.08 * index, duration: 0.7, ease: [0.16, 0.84, 0.44, 1] as const };
  // First visit: orbs bloom in where they belong. Coming back: they grow from where they were.
  const [from] = useState(() => lastPlaced[orb.id]);

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
        className="lexy-orb-float h-full w-full"
        style={{ animationDuration: `${8 + (index % 4) * 1.7}s`, animationDelay: `${-index * 1.3}s` }}
      >
        <Link
          href={def.href}
          onClick={(e) => onOpen(orb, e)}
          onPointerMove={followLight}
          onPointerLeave={restLight}
          aria-label={`${def.label}: ${orb.line}`}
          className="lexy-orb relative flex h-full w-full items-center justify-center rounded-full text-center outline-none hover:scale-[1.03] focus-visible:ring-1 focus-visible:ring-[#8B7355] focus-visible:ring-offset-[6px] focus-visible:ring-offset-[#FBF7EF] active:scale-[0.985]"
          style={{
            background: orbBackground(def),
            color: def.ink,
            boxShadow: [
              `0 ${px(0.3)}px ${px(0.55)}px -${px(0.2)}px rgba(28,25,23,0.38)`,
              `0 ${px(0.08)}px ${px(0.9)}px ${def.glow}`,
              `inset 0 -${px(0.22)}px ${px(0.46)}px rgba(0,0,0,0.3)`,
              `inset 0 0 ${px(0.14)}px rgba(255,255,255,0.12)`,
              "inset 0 0 0 1px rgba(28,25,23,0.06)",
            ].join(", "),
          }}
        >
          <span aria-hidden className="lexy-orb-sheen pointer-events-none absolute inset-0 rounded-full" />
          <span aria-hidden className="lexy-orb-rim pointer-events-none absolute inset-0 rounded-full" />
          <span aria-hidden className="lexy-grain pointer-events-none absolute inset-0 rounded-full opacity-[0.18] mix-blend-overlay" />
          {favourites && favourites.length > 0 && r >= 72 && <FavouriteRing words={favourites} r={r} />}
          <span className="relative block px-[17%]">
            <span className="block font-serif leading-[1.12] tracking-[-0.01em]" style={{ fontSize: labelSize }}>
              {def.label}
            </span>
            {showLine && (
              <>
                <span aria-hidden className="mx-auto mt-2.5 block h-px w-5 bg-current opacity-30" />
                <span className="mt-2 block leading-snug tracking-[0.01em] opacity-70" style={{ fontSize: lineSize }}>
                  {orb.line}
                </span>
              </>
            )}
          </span>
          {orb.fresh && (
            <span
              aria-hidden
              className="lexy-orb-new pointer-events-none absolute -inset-[5px] rounded-full text-[#8B7355]"
            />
          )}
        </Link>
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

function restLight(e: React.PointerEvent<HTMLElement>) {
  e.currentTarget.style.removeProperty("--lx");
  e.currentTarget.style.removeProperty("--ly");
}

/** Your favourite words circling slowly inside My Lexy. */
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

/** Faint words scattered behind the orbs — yours, once you have some. */
function WordSky({ words }: { words: string[] }) {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 select-none overflow-hidden [mask-image:linear-gradient(to_bottom,black_72%,transparent_88%)]"
    >
      {words.map((w) => {
        const h = hashString(w);
        return (
          <span
            key={w}
            className="absolute whitespace-nowrap font-serif italic text-[#8B7355]"
            style={{
              left: `${(h % 1000) / 10}%`,
              top: `${((h >>> 10) % 1000) / 10}%`,
              fontSize: 11 + ((h >>> 20) % 9),
              opacity: 0.07 + ((h >>> 5) % 8) / 100,
              transform: "translate(-50%, -50%)",
            }}
          >
            {w}
          </span>
        );
      })}
    </div>
  );
}

/** The tapped orb swells to fill the screen and settles into the page's parchment. */
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
