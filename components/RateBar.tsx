"use client";

import { FAVOURITE_THRESHOLD } from "@/lib/lexyCopy";
import {
  clampRating,
  fractionFromRating,
  parseTypedRating,
  ratingFromFraction,
  typedRatingMayContinue,
} from "@/lib/rating";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";

type Props = {
  /** The saved rating, or null when this word hasn't been rated yet — the bar then starts empty. */
  value: number | null;
  /** Fires when a rating is chosen: on release, on a − / + nudge, on a typed number, on arrow keys. */
  onCommit: (v: number) => void;
  size?: "large" | "compact";
  label?: string;
  /** Let digits typed anywhere on the page (outside text fields) set the rating — for the one open word card. */
  captureTyping?: boolean;
  disabled?: boolean;
};

const SIZES = {
  large: { thumb: 36, track: "h-14", number: "text-4xl", nudge: "h-10 w-10 text-lg" },
  compact: { thumb: 28, track: "h-10", number: "text-2xl", nudge: "h-8 w-8 text-base" },
} as const;

/**
 * One gesture to rate: press anywhere on the bar, slide, let go — saved.
 * Big enough for a thumb, precise to a tenth (the − / + buttons nudge by 0.1), never pre-filled.
 */
export function RateBar({
  value,
  onCommit,
  size = "large",
  label = "Your rating",
  captureTyping = false,
  disabled = false,
}: Props) {
  const s = SIZES[size];
  const pad = s.thumb / 2;

  const trackRef = useRef<HTMLDivElement>(null);
  const onCommitRef = useRef(onCommit);
  const typedRef = useRef("");
  const typeTimer = useRef<number | undefined>(undefined);
  const lastWhole = useRef<number | null>(null);

  const [draft, setDraft] = useState<number | null>(null);
  const [dragging, setDragging] = useState(false);
  const [typing, setTyping] = useState(false);
  const [savedPulse, setSavedPulse] = useState(0);
  const [showSaved, setShowSaved] = useState(false);

  useEffect(() => {
    onCommitRef.current = onCommit;
  });

  const shown = draft ?? value;

  const clearTyped = useCallback(() => {
    typedRef.current = "";
    window.clearTimeout(typeTimer.current);
    setTyping(false);
    setDraft(null);
  }, []);

  const commit = useCallback(
    (v: number) => {
      const r = clampRating(v);
      typedRef.current = "";
      window.clearTimeout(typeTimer.current);
      setTyping(false);
      setDraft(null);
      setSavedPulse((n) => n + 1);
      onCommitRef.current(r);
    },
    []
  );

  useEffect(() => {
    if (!savedPulse) return;
    setShowSaved(true);
    const t = window.setTimeout(() => setShowSaved(false), 1600);
    return () => window.clearTimeout(t);
  }, [savedPulse]);

  useEffect(() => () => window.clearTimeout(typeTimer.current), []);

  /** Digits typed onto the bar: "99" or "9.9" → 9.9, "10" → 10, a lone "7" settles after a beat. */
  const handleTypedKey = useCallback(
    (key: string): boolean => {
      if (key === "Enter" && typedRef.current) {
        const v = parseTypedRating(typedRef.current);
        if (v !== null) commit(v);
        else clearTyped();
        return true;
      }
      if (key === "Escape" && typedRef.current) {
        clearTyped();
        return true;
      }
      if (key === "Backspace" && typedRef.current) {
        typedRef.current = typedRef.current.slice(0, -1);
        if (!typedRef.current) clearTyped();
        else setDraft(parseTypedRating(typedRef.current));
        return true;
      }
      if (!/^[0-9.]$/.test(key)) return false;

      const next = (typedRef.current + key).slice(0, 4);
      const v = parseTypedRating(next);
      if (v === null && !typedRatingMayContinue(next)) {
        clearTyped();
        return true;
      }
      typedRef.current = next;
      setTyping(true);
      setDraft(v);
      window.clearTimeout(typeTimer.current);
      if (v !== null && !typedRatingMayContinue(next)) {
        commit(v);
        return true;
      }
      typeTimer.current = window.setTimeout(() => {
        const settled = parseTypedRating(typedRef.current);
        if (settled !== null) commit(settled);
        else clearTyped();
      }, 900);
      return true;
    },
    [clearTyped, commit]
  );

  useEffect(() => {
    if (!captureTyping || disabled) return;
    function onKey(e: KeyboardEvent) {
      if (e.metaKey || e.ctrlKey || e.altKey || e.defaultPrevented) return;
      const t = e.target as HTMLElement | null;
      if (t === trackRef.current) return;
      if (t?.closest?.("input, textarea, select, [contenteditable='true'], [contenteditable='']")) return;
      if (handleTypedKey(e.key)) e.preventDefault();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [captureTyping, disabled, handleTypedKey]);

  function valueAt(clientX: number): number {
    const el = trackRef.current;
    if (!el) return value ?? 5;
    const rect = el.getBoundingClientRect();
    return ratingFromFraction((clientX - rect.left - pad) / Math.max(1, rect.width - pad * 2));
  }

  function onPointerDown(e: ReactPointerEvent<HTMLDivElement>) {
    if (disabled || (e.pointerType === "mouse" && e.button !== 0)) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    if (typedRef.current) clearTyped();
    const v = valueAt(e.clientX);
    lastWhole.current = Math.floor(v);
    setDragging(true);
    setDraft(v);
  }

  function onPointerMove(e: ReactPointerEvent<HTMLDivElement>) {
    if (!dragging) return;
    const v = valueAt(e.clientX);
    const whole = Math.floor(v);
    if (lastWhole.current !== null && whole !== lastWhole.current) navigator.vibrate?.(4);
    lastWhole.current = whole;
    setDraft(v);
  }

  function onPointerUp(e: ReactPointerEvent<HTMLDivElement>) {
    if (!dragging) return;
    setDragging(false);
    commit(valueAt(e.clientX));
  }

  function onPointerCancel() {
    setDragging(false);
    setDraft(null);
  }

  function onKeyDown(e: ReactKeyboardEvent<HTMLDivElement>) {
    if (disabled) return;
    const base = shown ?? 5;
    const step = e.shiftKey ? 1 : 0.1;
    let next: number | null = null;
    if (e.key === "ArrowRight" || e.key === "ArrowUp") next = base + step;
    else if (e.key === "ArrowLeft" || e.key === "ArrowDown") next = base - step;
    else if (e.key === "PageUp") next = base + 1;
    else if (e.key === "PageDown") next = base - 1;
    else if (e.key === "Home") next = 1;
    else if (e.key === "End") next = 10;
    if (next !== null) {
      e.preventDefault();
      commit(next);
      return;
    }
    if (handleTypedKey(e.key)) e.preventDefault();
  }

  const f = shown !== null ? fractionFromRating(shown) : 0;
  const at = `calc(${pad}px + ${f} * (100% - ${pad * 2}px))`;
  const favourite = shown !== null && shown >= FAVOURITE_THRESHOLD;

  let status: React.ReactNode;
  if (dragging || typing) {
    status = favourite ? (
      <span className="text-[#1C7A40]">Favourite</span>
    ) : (
      <span className="text-[#8B7355]">{typing ? "Enter to save" : "Let go to save"}</span>
    );
  } else if (showSaved) {
    status = <span className="text-[#8B7355]">✓ Saved{favourite ? " · favourite" : ""}</span>;
  } else if (value === null) {
    status = (
      <span className="italic text-[#8B7355]">
        Every rating teaches Lexy your taste
        {captureTyping && <span className="hidden [@media(pointer:fine)]:inline"> · or type 9.9</span>}
      </span>
    );
  } else {
    status = favourite ? (
      <span className="text-[#1C7A40]">Favourite</span>
    ) : (
      <span className="text-[#B0A898]">Slide to change</span>
    );
  }

  return (
    <div className={disabled ? "pointer-events-none opacity-50" : undefined}>
      <div className="flex items-end justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#B0A898]">{label}</p>
          <p className="mt-1 truncate text-[11px] font-medium" aria-live="polite">
            {status}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          {value !== null && !dragging && !typing && (
            <button
              type="button"
              onClick={() => commit((value ?? 5) - 0.1)}
              aria-label="Lower by a tenth"
              className={`${s.nudge} flex items-center justify-center rounded-full border border-[#EDE8E0] bg-white leading-none text-[#8B7355] active:bg-[#F5EFE0] [@media(hover:hover)]:hover:border-[#8B7355]/50`}
            >
              −
            </button>
          )}
          <span
            className={`${s.number} min-w-[2.6ch] text-right font-serif font-bold tabular-nums leading-none ${
              shown === null ? "text-[#D4CCC0]" : "text-[#1C1917]"
            }`}
          >
            {shown === null ? "–" : shown.toFixed(1)}
          </span>
          {value !== null && !dragging && !typing && (
            <button
              type="button"
              onClick={() => commit((value ?? 5) + 0.1)}
              aria-label="Raise by a tenth"
              className={`${s.nudge} flex items-center justify-center rounded-full border border-[#EDE8E0] bg-white leading-none text-[#8B7355] active:bg-[#F5EFE0] [@media(hover:hover)]:hover:border-[#8B7355]/50`}
            >
              +
            </button>
          )}
        </div>
      </div>

      <div
        ref={trackRef}
        role="slider"
        tabIndex={disabled ? -1 : 0}
        aria-label={label}
        aria-valuemin={1}
        aria-valuemax={10}
        aria-valuenow={shown ?? undefined}
        aria-valuetext={shown === null ? "Not rated yet" : `${shown.toFixed(1)} out of 10`}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerCancel}
        onLostPointerCapture={() => dragging && setDragging(false)}
        onKeyDown={onKeyDown}
        className={`relative mt-3 ${s.track} cursor-pointer select-none rounded-full bg-[#F1ECE3] shadow-[inset_0_1px_2px_rgba(28,25,23,0.08)] outline-none ring-[#8B7355]/25 focus-visible:ring-4 ${
          size === "large" ? "touch-none" : "touch-pan-y"
        }`}
      >
        {/* Whole-number ticks */}
        <div className="pointer-events-none absolute inset-0" aria-hidden>
          {Array.from({ length: 10 }, (_, i) => (
            <span
              key={i}
              className="absolute top-1/2 h-2 w-px -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#1C1917]/10"
              style={{ left: `calc(${pad}px + ${i / 9} * (100% - ${pad * 2}px))` }}
            />
          ))}
        </div>

        {shown !== null && (
          <div
            className="pointer-events-none absolute inset-0 rounded-full"
            aria-hidden
            style={{
              background: "linear-gradient(90deg, #EFE6D6 0%, #D9C29A 45%, #B8996A 75%, #8B7355 100%)",
              clipPath: `inset(0 calc(100% - ${at}) 0 0 round 9999px)`,
              transition: dragging ? "none" : "clip-path 0.25s cubic-bezier(0.16, 0.84, 0.44, 1)",
            }}
          />
        )}

        {shown === null && (
          <span className="pointer-events-none absolute inset-0 flex items-center justify-center font-serif text-sm italic text-[#8B7355]">
            Slide to rate
          </span>
        )}

        {shown !== null && (
          <span
            className="pointer-events-none absolute top-1/2 rounded-full border-2 border-[#8B7355] bg-[linear-gradient(145deg,#FFFDF9,#E6D9C2)] shadow-[0_2px_10px_rgba(28,25,23,0.18)]"
            aria-hidden
            style={{
              width: s.thumb,
              height: s.thumb,
              left: at,
              transform: `translate(-50%, -50%) scale(${dragging ? 1.08 : 1})`,
              transition: dragging ? "transform 0.15s" : "left 0.25s cubic-bezier(0.16, 0.84, 0.44, 1), transform 0.15s",
            }}
          />
        )}
      </div>

      <div className="mt-1.5 flex justify-between text-[10px] font-medium text-[#B0A898]" aria-hidden>
        <span>1 · not for me</span>
        <span>love it · 10</span>
      </div>
    </div>
  );
}
