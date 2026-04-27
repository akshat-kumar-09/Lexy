"use client";

import { useEffect } from "react";

/** Lock document scroll when `locked` and optional media query matches (e.g. mobile sheet open). */
export function useBodyScrollLock(locked: boolean, mediaQuery = "(max-width: 767px)") {
  useEffect(() => {
    if (!locked || typeof window === "undefined") return;
    const mq = window.matchMedia(mediaQuery);
    if (!mq.matches) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [locked, mediaQuery]);
}
