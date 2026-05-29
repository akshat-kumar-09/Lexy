"use client";

import { useSettings } from "@/lib/store";
import { useEffect, useRef, useState } from "react";

const DEBOUNCE_MS = 700;

/**
 * Device-durable key sync (no sign-in required). On load, if the local store is
 * empty, restore the key from the httpOnly cookie set by /api/openai-key; on
 * edits, push the key back into that cookie. This keeps the key across sessions
 * even when an installed PWA's localStorage is wiped by the browser.
 */
export function OpenAIKeyCookieSync() {
  const openaiApiKey = useSettings((s) => s.openaiApiKey);
  const setOpenaiApiKey = useSettings((s) => s.setOpenaiApiKey);

  const [settingsHydrated, setSettingsHydrated] = useState(false);
  const [pullDone, setPullDone] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastPushed = useRef<string | null>(null);

  useEffect(() => {
    const p = useSettings.persist;
    if (!p || p.hasHydrated()) {
      setSettingsHydrated(true);
      return;
    }
    return p.onFinishHydration(() => setSettingsHydrated(true));
  }, []);

  // Pull from cookie when local is empty.
  useEffect(() => {
    if (!settingsHydrated) return;
    let cancelled = false;
    (async () => {
      try {
        const localKey = useSettings.getState().openaiApiKey.trim();
        if (localKey) {
          lastPushed.current = localKey;
          return;
        }
        const res = await fetch("/api/openai-key");
        if (!res.ok || cancelled) return;
        const data = (await res.json()) as { key?: string | null };
        const cookieKey = typeof data.key === "string" ? data.key.trim() : "";
        if (cookieKey && !useSettings.getState().openaiApiKey.trim()) {
          lastPushed.current = cookieKey;
          setOpenaiApiKey(cookieKey);
        }
      } finally {
        if (!cancelled) setPullDone(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [settingsHydrated, setOpenaiApiKey]);

  // Push edits into the cookie (debounced).
  useEffect(() => {
    if (!settingsHydrated || !pullDone) return;
    const k = openaiApiKey.trim();
    if (k === lastPushed.current) return;

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      debounceRef.current = null;
      lastPushed.current = k;
      void fetch("/api/openai-key", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: k }),
      });
    }, DEBOUNCE_MS);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [openaiApiKey, settingsHydrated, pullDone]);

  return null;
}
