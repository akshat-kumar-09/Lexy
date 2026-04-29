"use client";

import { SignedIn, SignedOut } from "@clerk/nextjs";
import Link from "next/link";
import { GenreStrip } from "@/components/GenreStrip";
import { SetupGifs } from "@/components/SetupGifs";
import { importLexiconFromUnknown, useLexicon, useSettings } from "@/lib/store";
import { clearSetupHintDismissed } from "@/lib/setupStorage";
import { useEffect, useRef, useState } from "react";

const clerkConfigured = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);

export default function SettingsPage() {
  const { openaiApiKey, setOpenaiApiKey } = useSettings();
  const importLexicon = useLexicon((s) => s.importLexicon);
  const [local, setLocal] = useState(openaiApiKey);
  const [saved, setSaved] = useState(false);
  const [importMsg, setImportMsg] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setLocal(openaiApiKey);
  }, [openaiApiKey]);

  function save() {
    setOpenaiApiKey(local.trim());
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

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

  return (
    <div className="mx-auto max-w-lg space-y-8 sm:space-y-10">
      <div>
        <h1 className="font-serif text-3xl font-bold text-[#1C1917]">Settings</h1>
        <p className="mt-2 text-sm leading-relaxed text-[#6A6360]">
          Your key is kept in this browser. When you&apos;re signed in, we also save it with your account (same secure
          database as your lexicon) so it comes back after you close a tab or open Lexy on another device — you still
          bring your own OpenAI usage; Lexy never uses a shared server key for you.
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

      <section className="space-y-4">
        <h2 className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#B0A898]">OpenAI API key</h2>
        <div className="space-y-2">
          <label htmlFor="key" className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#B0A898]">
            Key (browser + account when signed in)
          </label>
          <input
            id="key"
            type="password"
            autoComplete="off"
            placeholder="sk-…"
            value={local}
            onChange={(e) => setLocal(e.target.value)}
            className="w-full rounded-xl border border-[#EDE8E0] bg-white px-4 py-3 text-sm text-[#1C1917] outline-none ring-[#8B7355]/20 focus:border-[#8B7355] focus:ring-4"
          />
        </div>

        <button
          type="button"
          onClick={save}
          className="rounded-full bg-[#1C1917] px-8 py-3 text-sm font-semibold text-[#F5EFE0] transition hover:bg-[#2C2920]"
        >
          {saved ? "Saved" : "Save key"}
        </button>

        <p className="text-xs leading-relaxed text-[#B0A898]">
          Without a key, Morning Scribble, Metaphors, and Deep Dive stay idle. The lexicon works either way.
        </p>
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
        <h2 className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#B0A898]">Restore from backup</h2>
        <p className="text-sm leading-relaxed text-[#6A6360]">
          Load a <code className="rounded bg-[#F5F0EA] px-1.5 py-0.5 text-xs">.json</code> file you exported earlier.
        </p>
        <input ref={fileRef} type="file" accept="application/json,.json" className="hidden" onChange={onPickJson} />
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="rounded-full border border-[#8B7355] px-6 py-2.5 text-xs font-semibold uppercase tracking-[0.08em] text-[#8B7355]"
        >
          Import lexicon JSON
        </button>
        {importMsg && <p className="text-sm text-[#6A6360]">{importMsg}</p>}
      </section>
    </div>
  );
}
