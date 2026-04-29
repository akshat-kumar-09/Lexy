"use client";

import { useAuth } from "@clerk/nextjs";
import { useSettings } from "@/lib/store";
import { useEffect, useRef, useState } from "react";

const DEBOUNCE_MS = 900;

function hasClerk() {
  return Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);
}

/**
 * When signed in + DB: pull key from server if local is empty after hydration; debounce-push local edits.
 */
function OpenAIKeyCloudSyncInner() {
  const { userId, isLoaded } = useAuth();
  const openaiApiKey = useSettings((s) => s.openaiApiKey);
  const setOpenaiApiKey = useSettings((s) => s.setOpenaiApiKey);
  const [settingsHydrated, setSettingsHydrated] = useState(() => useSettings.persist.hasHydrated());
  const [pullDone, setPullDone] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const skipPutAfterPull = useRef(false);

  useEffect(() => {
    if (useSettings.persist.hasHydrated()) {
      setSettingsHydrated(true);
      return;
    }
    const unsub = useSettings.persist.onFinishHydration(() => {
      setSettingsHydrated(true);
    });
    return unsub;
  }, []);

  useEffect(() => {
    setPullDone(false);
  }, [userId]);

  useEffect(() => {
    if (!isLoaded || !userId || !settingsHydrated) return;

    let cancelled = false;
    skipPutAfterPull.current = true;

    (async () => {
      try {
        const res = await fetch("/api/user-secrets/openai");
        if (!res.ok || cancelled) return;
        const data = (await res.json()) as { key?: string | null };
        const serverKey = typeof data.key === "string" ? data.key.trim() : "";
        const localKey = useSettings.getState().openaiApiKey.trim();

        if (serverKey && !localKey) {
          setOpenaiApiKey(serverKey);
        }
      } finally {
        if (!cancelled) {
          skipPutAfterPull.current = false;
          setPullDone(true);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isLoaded, userId, settingsHydrated, setOpenaiApiKey]);

  useEffect(() => {
    if (!isLoaded || !userId || !settingsHydrated || !pullDone) return;
    if (skipPutAfterPull.current) return;

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      debounceRef.current = null;
      const k = useSettings.getState().openaiApiKey.trim();
      void fetch("/api/user-secrets/openai", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: k }),
      });
    }, DEBOUNCE_MS);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [openaiApiKey, isLoaded, userId, settingsHydrated, pullDone]);

  return null;
}

export function OpenAIKeyCloudSync() {
  if (!hasClerk()) return null;
  return <OpenAIKeyCloudSyncInner />;
}
