"use client";

import { useAuth } from "@clerk/nextjs";
import { useLexicon } from "@/lib/store";
import { useEffect, useRef, useState } from "react";

const DEBOUNCE_MS = 1500;

function hasClerk() {
  return Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);
}

function LexiconCloudSyncInner() {
  const { userId, isLoaded } = useAuth();
  const importLexicon = useLexicon((s) => s.importLexicon);
  const [cloudReady, setCloudReady] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const skipNextSave = useRef(false);

  useEffect(() => {
    if (!isLoaded || !userId) {
      setCloudReady(false);
      return;
    }

    let cancelled = false;
    setCloudReady(false);

    (async () => {
      try {
        const res = await fetch("/api/lexicon");
        if (cancelled) return;

        if (!res.ok) {
          return;
        }

        const data = (await res.json()) as {
          words?: Record<string, unknown>;
          daily_history?: unknown[];
        };
        const serverWords = data.words && typeof data.words === "object" ? data.words : {};
        const serverCount = Object.keys(serverWords).length;
        const local = useLexicon.getState();
        const localCount = Object.keys(local.words).length;

        skipNextSave.current = true;
        if (serverCount > 0) {
          importLexicon({
            words: data.words as typeof local.words,
            daily_history: (data.daily_history ?? []) as typeof local.daily_history,
          });
        } else if (localCount > 0) {
          await fetch("/api/lexicon", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              words: local.words,
              daily_history: local.daily_history,
            }),
          });
        }
      } finally {
        if (!cancelled) {
          skipNextSave.current = false;
          setCloudReady(true);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isLoaded, userId, importLexicon]);

  useEffect(() => {
    if (!cloudReady || !userId) return;

    const unsub = useLexicon.subscribe((state) => {
      if (skipNextSave.current) return;
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        debounceRef.current = null;
        void fetch("/api/lexicon", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            words: state.words,
            daily_history: state.daily_history,
          }),
        });
      }, DEBOUNCE_MS);
    });

    return () => {
      unsub();
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [cloudReady, userId]);

  return null;
}

export function LexiconCloudSync() {
  if (!hasClerk()) return null;
  return <LexiconCloudSyncInner />;
}
