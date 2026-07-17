"use client";

import { SignedIn, SignedOut, useAuth } from "@clerk/nextjs";
import Link from "next/link";
import { GenreStrip } from "@/components/GenreStrip";
import { SetupGifs } from "@/components/SetupGifs";
import { mergeLexiconPreferLocal } from "@/lib/lexiconMigrate";
import { importLexiconFromUnknown, useLexicon } from "@/lib/store";
import { clearSetupHintDismissed } from "@/lib/setupStorage";
import type { LexiconData } from "@/lib/types";
import { useEffect, useRef, useState } from "react";

const clerkConfigured = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);

interface Checkpoint {
  id: number;
  created_at: string;
  word_count: number;
}

function formatCheckpointTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function CloudCheckpoints() {
  const { isLoaded, userId } = useAuth();
  const importLexicon = useLexicon((s) => s.importLexicon);
  const [checkpoints, setCheckpoints] = useState<Checkpoint[] | null>(null);
  const [restoringId, setRestoringId] = useState<number | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoaded || !userId) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/lexicon/history");
        if (!res.ok || cancelled) return;
        const data = (await res.json()) as { checkpoints?: Checkpoint[] };
        if (!cancelled) setCheckpoints(data.checkpoints ?? []);
      } catch {
        if (!cancelled) setCheckpoints([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isLoaded, userId]);

  async function restore(id: number) {
    if (restoringId != null) return;
    setRestoringId(id);
    setMsg(null);
    try {
      const res = await fetch(`/api/lexicon/history/${id}`, { method: "POST" });
      if (!res.ok) {
        setMsg("Could not restore that checkpoint — try again in a moment.");
        return;
      }
      const restored = (await res.json()) as LexiconData;
      importLexicon(restored);
      setMsg("Restored. Missing words are brought back; nothing you already have was removed.");
    } catch {
      setMsg("Could not restore that checkpoint — try again in a moment.");
    } finally {
      setRestoringId(null);
    }
  }

  if (!isLoaded || !userId) return null;

  return (
    <section className="space-y-3 rounded-2xl border border-[#EDE8E0] bg-white p-6">
      <h2 className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#B0A898]">Cloud checkpoints</h2>
      <p className="text-sm leading-relaxed text-[#6A6360]">
        Lexy quietly saves a checkpoint of your account&apos;s lexicon every few hours. If a sync ever goes wrong — a
        device mix-up, an accidental mass-delete — restore brings missing words back without ever removing anything
        you currently have.
      </p>
      {checkpoints === null && <p className="text-xs italic text-[#B0A898]">Loading checkpoints…</p>}
      {checkpoints?.length === 0 && (
        <p className="text-xs italic text-[#B0A898]">
          No checkpoints yet — one is saved automatically the next time your lexicon changes.
        </p>
      )}
      {checkpoints && checkpoints.length > 0 && (
        <ul className="space-y-2">
          {checkpoints.map((c) => (
            <li
              key={c.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[#F5F0EA] px-4 py-2.5"
            >
              <span className="text-sm text-[#4A4340]">
                {formatCheckpointTime(c.created_at)} · {c.word_count} word{c.word_count === 1 ? "" : "s"}
              </span>
              <button
                type="button"
                disabled={restoringId === c.id}
                onClick={() => void restore(c.id)}
                className="rounded-full border border-[#8B7355] px-4 py-1.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-[#8B7355] disabled:opacity-50"
              >
                {restoringId === c.id ? "Restoring…" : "Restore"}
              </button>
            </li>
          ))}
        </ul>
      )}
      {msg && <p className="text-sm text-[#6A6360]">{msg}</p>}
    </section>
  );
}

export default function SettingsPage() {
  const importLexicon = useLexicon((s) => s.importLexicon);
  const [importMsg, setImportMsg] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const mergeFileRef = useRef<HTMLInputElement>(null);

  function onPickJson(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result));
        const data = importLexiconFromUnknown(parsed);
        if (!data) {
          setImportMsg("That file is not a valid Lexy lexicon JSON.");
          return;
        }
        importLexicon(data);
        setImportMsg("Lexicon imported. It will sync to your account if you are signed in.");
      } catch {
        setImportMsg("Could not read that JSON file.");
      }
    };
    reader.readAsText(file);
  }

  function onPickMergeJson(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result));
        const data = importLexiconFromUnknown(parsed);
        if (!data) {
          setImportMsg("That file is not a valid Lexy lexicon JSON.");
          return;
        }
        const current = useLexicon.getState();
        const merged = mergeLexiconPreferLocal(data, current);
        importLexicon(merged);
        setImportMsg(
          "Backup merged into this device (same word twice keeps this device’s version). Sync will update your account if you’re signed in."
        );
      } catch {
        setImportMsg("Could not read that JSON file.");
      }
    };
    reader.readAsText(file);
  }

  return (
    <div className="mx-auto max-w-lg space-y-8 sm:space-y-10">
      <div>
        <h1 className="font-serif text-3xl font-bold text-[#1C1917]">Settings</h1>
        <p className="mt-2 text-sm leading-relaxed text-[#6A6360]">
          Morning Scribble, Metaphors, and Deep Dive run on Lexy&apos;s own Claude key — nothing to set up, no key of
          your own required.
        </p>
      </div>

      <section id="setup" className="scroll-mt-24 space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h2 className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#B0A898]">Get started</h2>
          <Link
            href="/start"
            className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[#8B7355] underline-offset-2 hover:underline"
          >
            Full-page guide
          </Link>
        </div>
        <SetupGifs embedded />
        <button
          type="button"
          onClick={() => clearSetupHintDismissed()}
          className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[#8B7355] underline-offset-2 hover:underline"
        >
          Show &ldquo;First time?&rdquo; banner on home again
        </button>
      </section>

      <section className="space-y-3 rounded-2xl border border-[#EDE8E0] bg-white p-6">
        <h2 className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#B0A898]">Account</h2>
        {!clerkConfigured ? (
          <p className="text-sm leading-relaxed text-[#6A6360]">
            To enable sign-in and cloud lexicon sync, add Clerk keys from <code className="rounded bg-[#F5F0EA] px-1.5 py-0.5 text-xs">.env.example</code> to{" "}
            <code className="rounded bg-[#F5F0EA] px-1.5 py-0.5 text-xs">.env.local</code>. Until then, your lexicon stays in this browser only.
          </p>
        ) : (
          <>
            <SignedOut>
              <p className="text-sm leading-relaxed text-[#6A6360]">
                Sign in to save your lexicon to your account (encrypted in transit, stored per user). You can still use
                Lexy signed out — data stays on this device only.
              </p>
              <Link
                href="/sign-in"
                className="inline-block rounded-full bg-[#1C1917] px-6 py-2.5 text-sm font-semibold text-[#F5EFE0] transition hover:bg-[#2C2920]"
              >
                Sign in
              </Link>
            </SignedOut>
            <SignedIn>
              <p className="text-sm leading-relaxed text-[#6A6360]">
                Your lexicon syncs to the cloud for your account. Download a .json backup anytime from My Lexy — your
                data stays yours to export and keep offline.
              </p>
            </SignedIn>
          </>
        )}
      </section>

      <section className="space-y-4 rounded-2xl border border-[#EDE8E0] bg-white p-6">
        <h2 className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#B0A898]">Exploration threads</h2>
        <p className="text-sm leading-relaxed text-[#6A6360]">
          Name themes in your own words — Metaphors and Deep Dive orbit them for now. Ratings still teach Lexy what to
          keep.
        </p>
        <GenreStrip />
      </section>

      <section className="space-y-3">
        <h2 className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#B0A898]">Restore & merge backups</h2>
        <p className="text-sm leading-relaxed text-[#6A6360]">
          From <strong className="font-medium text-[#4A4340]">My Lexy</strong>, download{" "}
          <code className="rounded bg-[#F5F0EA] px-1.5 py-0.5 text-xs">.json</code> on each device. Use{" "}
          <strong className="font-medium text-[#4A4340]">Merge</strong> to combine two exports without wiping this
          device; identical words keep <strong className="font-medium text-[#4A4340]">this browser&apos;s</strong>{" "}
          rating and gloss.
        </p>
        <div className="flex flex-wrap gap-3">
          <input ref={fileRef} type="file" accept="application/json,.json" className="hidden" onChange={onPickJson} />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="rounded-full border border-[#8B7355] px-6 py-2.5 text-xs font-semibold uppercase tracking-[0.08em] text-[#8B7355]"
          >
            Replace from JSON
          </button>
          <input
            ref={mergeFileRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={onPickMergeJson}
          />
          <button
            type="button"
            onClick={() => mergeFileRef.current?.click()}
            className="rounded-full bg-[#1C1917] px-6 py-2.5 text-xs font-semibold uppercase tracking-[0.08em] text-[#F5EFE0]"
          >
            Merge backup JSON
          </button>
        </div>
        {importMsg && <p className="text-sm text-[#6A6360]">{importMsg}</p>}
      </section>

      {clerkConfigured && <CloudCheckpoints />}
    </div>
  );
}
