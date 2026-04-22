"use client";

import { useAuth } from "@clerk/nextjs";
import { importLexiconFromUnknown, useLexicon } from "@/lib/store";
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

        const data = (await res.json()) as Record<string, unknown>;
        const normalized = importLexiconFromUnknown({
          words: data.words,
          metaphor_history: data.metaphor_history,
          daily_history: data.daily_history,
          scribble_rewrites: data.scribble_rewrites,
        });
        if (!normalized) return;

        const serverWords = normalized.words;
        const serverCount = Object.keys(serverWords).length;
        const local = useLexicon.getState();
        const localCount = Object.keys(local.words).length;

        skipNextSave.current = true;
        if (serverCount > 0) {
          importLexicon(normalized);
        } else if (localCount > 0) {
          await fetch("/api/lexicon", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              words: local.words,
              metaphor_history: local.metaphor_history,
              scribble_rewrites: local.scribble_rewrites,
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
            metaphor_history: state.metaphor_history,
            scribble_rewrites: state.scribble_rewrites,
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
