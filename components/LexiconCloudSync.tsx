"use client";

import { useAuth } from "@clerk/nextjs";
import { mergeLexiconPreferLocal, normalizeLexiconPayload } from "@/lib/lexiconMigrate";
import { useLexicon } from "@/lib/store";
import type { LexiconData } from "@/lib/types";
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
 * Cloud lexicon is bound to the signed-in Clerk user, not to “whatever this
 * tab last had”. Two guarantees:
 *
 *  1. Background PUTs are gated until we have successfully READ the server
 *     once. Without this, a tablet whose GET failed could upload `{}` and
 *     wipe the account snapshot.
 *  2. Every PUT is a server-side MERGE (with tombstones for explicit
 *     deletes). Even if device A pushes a slightly stale snapshot, it can no
 *     longer overwrite words that device B added between A's last GET and
 *     this PUT — the API unions them.
 */
function LexiconCloudSyncInner() {
  const { userId, isLoaded } = useAuth();
  const [uploadAllowed, setUploadAllowed] = useState(false);
  // SSR-safe: start `false`, observe hydration only in an effect so we never
  // touch `useLexicon.persist` during static prerender where the middleware
  // object may not be attached yet.
  const [lexiconHydrated, setLexiconHydrated] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const skipNextSave = useRef(false);
  const visibilityTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inflightPutRef = useRef<Promise<unknown> | null>(null);

  useEffect(() => {
    const p = useLexicon.persist;
    if (!p) {
      setLexiconHydrated(true);
      return;
    }
    if (p.hasHydrated()) {
      setLexiconHydrated(true);
      return;
    }
    const unsub = p.onFinishHydration(() => {
      setLexiconHydrated(true);
    });
    return unsub;
  }, []);

  const fetchServerSnapshot = useCallback(async (abort: () => boolean): Promise<LexiconData | null> => {
    let res: Response | null = null;
    for (let attempt = 1; attempt <= GET_MAX_ATTEMPTS; attempt++) {
      if (abort()) return null;
      try {
        res = await fetch("/api/lexicon", { credentials: "same-origin" });
      } catch {
        res = null;
      }
      if (res?.ok) break;
      if (attempt >= GET_MAX_ATTEMPTS) return null;
      await sleep(GET_BASE_DELAY_MS * 2 ** (attempt - 1));
    }
    if (!res?.ok || abort()) return null;
    let data: Record<string, unknown>;
    try {
      data = (await res.json()) as Record<string, unknown>;
    } catch {
      return null;
    }
    return (
      normalizeLexiconPayload({
        words: data.words,
        metaphor_history: data.metaphor_history,
        daily_history: data.daily_history,
        scribble_rewrites: data.scribble_rewrites,
      }) ?? null
    );
  }, []);

  const pushSnapshot = useCallback(
    async (data: LexiconData, deleted_words: string[]): Promise<boolean> => {
      try {
        const res = await fetch("/api/lexicon", {
          method: "PUT",
          credentials: "same-origin",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            words: data.words,
            metaphor_history: data.metaphor_history,
            scribble_rewrites: data.scribble_rewrites,
            deleted_words,
          }),
        });
        if (!res.ok) return false;
        if (deleted_words.length) {
          useLexicon.getState().consumePendingDeletes(deleted_words);
        }
        return true;
      } catch {
        return false;
      }
    },
    []
  );

  const pullMergePush = useCallback(
    async (abort: () => boolean, allowUploadAfter: boolean): Promise<boolean> => {
      const server = await fetchServerSnapshot(abort);
      if (!server || abort()) return false;

      const local = useLexicon.getState();
      const tombs = [...local.pending_deletes];

      const merged = mergeLexiconPreferLocal(server, local);
      for (const k of tombs) {
        delete merged.words[k];
      }

      skipNextSave.current = true;
      try {
        local.importLexicon(merged);
      } finally {
        skipNextSave.current = false;
      }

      const ok = await pushSnapshot(merged, tombs);
      if (allowUploadAfter && !abort()) setUploadAllowed(true);
      return ok;
    },
    [fetchServerSnapshot, pushSnapshot]
  );

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
      debounceRef.current = setTimeout(async () => {
        debounceRef.current = null;
        // Serialise puts so we don't fire two overlapping requests
        const prev = inflightPutRef.current;
        if (prev) {
          try {
            await prev;
          } catch {
            /* ignore */
          }
        }
        const tombs = [...state.pending_deletes];
        const p = pushSnapshot(
          {
            words: state.words,
            metaphor_history: state.metaphor_history,
            scribble_rewrites: state.scribble_rewrites,
          },
          tombs
        );
        inflightPutRef.current = p;
        try {
          await p;
        } finally {
          if (inflightPutRef.current === p) inflightPutRef.current = null;
        }
      }, DEBOUNCE_MS);
    });

    return () => {
      unsub();
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [uploadAllowed, userId, pushSnapshot]);

  return null;
}

export function LexiconCloudSync() {
  if (!hasClerk()) return null;
  return <LexiconCloudSyncInner />;
}
