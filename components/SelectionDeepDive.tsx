"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

function normalizeSelectedWord(raw: string): string | null {
  const t = raw.trim();
  if (!t || /\s/.test(t)) return null;
  if (t.length > 48) return null;
  if (!/^[\p{L}][\p{L}'-]*$/u.test(t)) return null;
  return t;
}

function selectionInsideSkippedZone(node: Node | null): boolean {
  let el: Element | null =
    node instanceof Element ? node : node?.parentElement ?? null;
  while (el) {
    if (el.closest("[data-no-deep-dive]")) return true;
    if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement || el instanceof HTMLSelectElement)
      return true;
    if (el instanceof HTMLElement && el.isContentEditable) return true;
    el = el.parentElement;
  }
  return false;
}

/**
 * When the user selects a single word in the app, show a small affordance to open Deep Dive for it.
 */
export function SelectionDeepDive() {
  const [ui, setUi] = useState<{ word: string; left: number; top: number } | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const sync = useCallback(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      debounceRef.current = null;
      const sel = typeof window !== "undefined" ? window.getSelection() : null;
      if (!sel || sel.isCollapsed || sel.rangeCount === 0) {
        setUi(null);
        return;
      }
      const anchor = sel.anchorNode;
      if (selectionInsideSkippedZone(anchor)) {
        setUi(null);
        return;
      }
      const word = normalizeSelectedWord(sel.toString());
      if (!word) {
        setUi(null);
        return;
      }
      const range = sel.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      if (!rect.width && !rect.height) {
        setUi(null);
        return;
      }
      const pad = 8;
      const left = rect.left + rect.width / 2;
      const top = rect.top - pad;
      const vw = window.innerWidth;
      const clampedLeft = Math.min(Math.max(left, 56), vw - 56);
      const clampedTop = Math.max(top - 36, 8);
      setUi({ word, left: clampedLeft, top: clampedTop });
    }, 80);
  }, []);

  useEffect(() => {
    document.addEventListener("selectionchange", sync);
    document.addEventListener("mouseup", sync);
    return () => {
      document.removeEventListener("selectionchange", sync);
      document.removeEventListener("mouseup", sync);
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [sync]);

  useEffect(() => {
    const onScroll = () => setUi(null);
    window.addEventListener("scroll", onScroll, true);
    return () => window.removeEventListener("scroll", onScroll, true);
  }, []);

  if (!ui) return null;

  const href = `/dive?word=${encodeURIComponent(ui.word)}`;

  return (
    <div
      className="pointer-events-none fixed z-[120] -translate-x-1/2 px-2"
      style={{ left: ui.left, top: ui.top }}
    >
      <Link
        href={href}
        className="pointer-events-auto whitespace-nowrap rounded-full border border-[#EDE8E0] bg-[#1C1917] px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#F5EFE0] shadow-lg ring-4 ring-[#FEFCF8]/90 transition hover:bg-[#2A2520]"
        data-no-deep-dive
      >
        Deep dive
      </Link>
    </div>
  );
}
