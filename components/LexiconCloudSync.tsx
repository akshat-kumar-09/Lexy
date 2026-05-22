"use client";

import { useAuth } from "@clerk/nextjs";
import { mergeLexiconPreferLocal } from "@/lib/lexiconMigrate";
import { importLexiconFromUnknown, useLexicon } from "@/lib/store";
import { useCallback, useEffect, useRef, useState } from "react";

const DEBOUNCE_MS = 1500;
const GET_MAX_ATTEMPTS = 4;
const GET_BASE_DELAY_MS = 400;
const VISIBILITY_SYNC_DEBOUNCE_MS = 600;

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function hasClerk() {
  return Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);
}

/**
 * Cloud lexicon must stay tied to the signed-in user, not to “whatever this tab last had”.
 *
 * Never enable background PUTs until we have successfully **read** the server at least once.
 * Otherwise a tablet with an empty/failed GET could upload `{}` and wipe the account snapshot.
 */
function LexiconCloudSyncInner() {
  const { userId, isLoaded } = useAuth();
  const [uploadAllowed, setUploadAllowed] = useState(false);
  const [lexiconHydrated, setLexiconHydrated] = useState(() => useLexicon.persist.hasHydrated());
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const skipNextSave = useRef(false);
  const visibilityTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (useLexicon.persist.hasHydrated()) {
      setLexiconHydrated(true);
      return;
    }
    const unsub = useLexicon.persist.onFinishHydration(() => {
      setLexiconHydrated(true);
    });
    return unsub;
  }, []);

  const pullMergePush = useCallback(async (abort: () => boolean, allowUploadAfter: boolean): Promise<boolean> => {
    let res: Response | null = null;

    for (let attempt = 1; attempt <= GET_MAX_ATTEMPTS; attempt++) {
      if (abort()) return false;
      try {
        res = await fetch("/api/lexicon", { credentials: "same-origin" });
      } catch {
        res = null;
      }
      if (res?.ok) break;
      if (attempt >= GET_MAX_ATTEMPTS) return false;
      await sleep(GET_BASE_DELAY_MS * 2 ** (attempt - 1));
    }

    if (!res?.ok || abort()) return false;

    let data: Record<string, unknown>;
    try {
      data = (await res.json()) as Record<string, unknown>;
    } catch {
      return false;
    }

    const normalized = importLexiconFromUnknown({
      words: data.words,
      metaphor_history: data.metaphor_history,
      daily_history: data.daily_history,
      scribble_rewrites: data.scribble_rewrites,
    });
    if (!normalized || abort()) return false;

    /**
     * One code path: union server + this device (local wins on duplicate lemmas).
     * Covers: server-only, local-only, both, or both empty — no branch that forgets to merge.
     */
    skipNextSave.current = true;
    try {
      const merged = mergeLexiconPreferLocal(normalized, useLexicon.getState());
      useLexicon.getState().importLexicon(merged);

      try {
        await fetch("/api/lexicon", {
          method: "PUT",
          credentials: "same-origin",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            words: merged.words,
            metaphor_history: merged.metaphor_history,
            scribble_rewrites: merged.scribble_rewrites,
          }),
        });
      } catch {
        // Transient PUT failure: local state is merged; debounced subscriber will retry.
      }
    } finally {
      skipNextSave.current = false;
    }

    if (allowUploadAfter && !abort()) setUploadAllowed(true);
    return true;
  }, []);

  useEffect(() => {
    if (!isLoaded || !userId || !lexiconHydrated) {
      setUploadAllowed(false);
      return;
    }

    let cancelled = false;
    const abort = () => cancelled;

    setUploadAllowed(false);

    void (async () => {
      const ok = await pullMergePush(abort, true);
      if (cancelled) return;
      if (!ok) setUploadAllowed(false);
    })();

    return () => {
      cancelled = true;
      setUploadAllowed(false);
    };
  }, [isLoaded, userId, lexiconHydrated, pullMergePush]);

  useEffect(() => {
    if (!uploadAllowed || !userId || !lexiconHydrated) return;

    function scheduleVisibleSync() {
      if (document.visibilityState !== "visible") return;
      if (visibilityTimerRef.current) clearTimeout(visibilityTimerRef.current);
      visibilityTimerRef.current = setTimeout(() => {
        visibilityTimerRef.current = null;
        void pullMergePush(() => false, false);
      }, VISIBILITY_SYNC_DEBOUNCE_MS);
    }

    document.addEventListener("visibilitychange", scheduleVisibleSync);
    return () => {
      document.removeEventListener("visibilitychange", scheduleVisibleSync);
      if (visibilityTimerRef.current) clearTimeout(visibilityTimerRef.current);
    };
  }, [uploadAllowed, userId, lexiconHydrated, pullMergePush]);

  useEffect(() => {
    if (!uploadAllowed || !userId) return;

    const unsub = useLexicon.subscribe((state) => {
      if (skipNextSave.current) return;
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        debounceRef.current = null;
        void fetch("/api/lexicon", {
          method: "PUT",
          credentials: "same-origin",
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
  }, [uploadAllowed, userId]);

  return null;
}

export function LexiconCloudSync() {
  if (!hasClerk()) return null;
  return <LexiconCloudSyncInner />;
}
