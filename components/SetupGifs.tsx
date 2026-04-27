"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

const OPENAI_KEYS_URL = "https://platform.openai.com/api-keys";

type PlatformTab = "iphone" | "android";

type StepMediaProps = {
  videoSrc?: string;
  gifSrc?: string;
  label: string;
  caption: string;
};

function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const fn = () => setReduced(mq.matches);
    mq.addEventListener("change", fn);
    return () => mq.removeEventListener("change", fn);
  }, []);
  return reduced;
}

function StepMedia({ videoSrc, gifSrc, label, caption }: StepMediaProps) {
  const reducedMotion = usePrefersReducedMotion();
  const [mode, setMode] = useState<"video" | "gif" | "fallback">(() => {
    if (!videoSrc && gifSrc) return "gif";
    if (!videoSrc && !gifSrc) return "fallback";
    return "video";
  });

  useEffect(() => {
    if (reducedMotion) setMode("fallback");
  }, [reducedMotion]);

  const hintPath = videoSrc ?? gifSrc ?? "public/onboarding";

  if (mode === "fallback" || reducedMotion) {
    return (
      <figure className="space-y-2">
        <div
          className="flex aspect-[9/16] max-h-[min(52vh,22rem)] w-full max-w-[12.5rem] flex-col items-center justify-center rounded-2xl border border-dashed border-[#D4CCC0] bg-[#F5F0EA]/80 px-4 text-center sm:max-h-[min(48vh,26rem)] sm:max-w-[14rem]"
          role="img"
          aria-label={label}
        >
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#8B7355]">Visual step</p>
          <p className="mt-2 text-xs leading-relaxed text-[#6A6360]">{caption}</p>
          <p className="mt-3 text-[10px] leading-snug text-[#B0A898]">
            Drop a short clip or GIF in{" "}
            <code className="rounded bg-white px-1 py-0.5 text-[9px]">{hintPath}</code> — or follow the bullets above.
          </p>
        </div>
        <figcaption className="sr-only">{label}</figcaption>
      </figure>
    );
  }

  if (mode === "gif" && gifSrc) {
    return (
      <figure className="space-y-2">
        {/* eslint-disable-next-line @next/next/no-img-element -- user-provided onboarding GIF */}
        <img
          src={gifSrc}
          alt={label}
          className="mx-auto max-h-[min(52vh,22rem)] w-auto max-w-full rounded-2xl border border-[#EDE8E0] object-contain shadow-sm sm:max-h-[min(48vh,26rem)]"
          onError={() => setMode("fallback")}
        />
        <figcaption className="text-center text-[11px] leading-relaxed text-[#6A6360]">{caption}</figcaption>
      </figure>
    );
  }

  if (videoSrc) {
    return (
      <figure className="space-y-2">
        <video
          className="mx-auto max-h-[min(52vh,22rem)] w-full max-w-[14rem] rounded-2xl border border-[#EDE8E0] object-cover shadow-sm sm:max-h-[min(48vh,26rem)]"
          muted
          loop
          playsInline
          controls
          aria-label={label}
          onError={() => setMode(gifSrc ? "gif" : "fallback")}
        >
          <source src={videoSrc} type="video/mp4" />
        </video>
        <figcaption className="text-center text-[11px] leading-relaxed text-[#6A6360]">{caption}</figcaption>
      </figure>
    );
  }

  return (
    <figure className="space-y-2">
      <div
        className="flex aspect-[9/16] max-h-[min(52vh,22rem)] w-full max-w-[12.5rem] flex-col items-center justify-center rounded-2xl border border-dashed border-[#D4CCC0] bg-[#F5F0EA]/80 px-4 text-center sm:max-h-[min(48vh,26rem)] sm:max-w-[14rem]"
        role="img"
        aria-label={label}
      >
        <p className="text-xs leading-relaxed text-[#6A6360]">{caption}</p>
      </div>
    </figure>
  );
}

type SetupGifsProps = {
  /** When true, omit outer heading (e.g. embedded in Settings). */
  embedded?: boolean;
};

export function SetupGifs({ embedded }: SetupGifsProps) {
  const [platform, setPlatform] = useState<PlatformTab>("iphone");

  return (
    <div className="space-y-8">
      {!embedded && (
        <div>
          <h1 className="font-serif text-2xl font-bold text-[#1C1917] sm:text-3xl">Get started</h1>
          <p className="mt-2 text-sm leading-relaxed text-[#6A6360]">
            Two quick setups — put Lexy on your home screen, then wake the AI once with your own key.
          </p>
        </div>
      )}

      <section className="space-y-4 rounded-2xl border border-[#EDE8E0] bg-white p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#B0A898]">
            1 · Add Lexy to your home screen
          </h2>
          <div className="flex rounded-full border border-[#EDE8E0] p-0.5 text-[10px] font-semibold uppercase tracking-[0.08em]">
            <button
              type="button"
              onClick={() => setPlatform("iphone")}
              className={`rounded-full px-3 py-1.5 transition ${
                platform === "iphone" ? "bg-[#1C1917] text-[#F5EFE0]" : "text-[#6A6360]"
              }`}
            >
              iPhone
            </button>
            <button
              type="button"
              onClick={() => setPlatform("android")}
              className={`rounded-full px-3 py-1.5 transition ${
                platform === "android" ? "bg-[#1C1917] text-[#F5EFE0]" : "text-[#6A6360]"
              }`}
            >
              Android
            </button>
          </div>
        </div>
        <ul className="list-inside list-disc space-y-1 text-sm leading-relaxed text-[#4A4340]">
          {platform === "iphone" ? (
            <>
              <li>Tap the Share button in Safari.</li>
              <li>Scroll to <strong className="font-semibold text-[#1C1917]">Add to Home Screen</strong>, then confirm.</li>
            </>
          ) : (
            <>
              <li>Open Lexy in Chrome.</li>
              <li>
                Tap the <strong className="font-semibold text-[#1C1917]">⋮</strong> menu →{" "}
                <strong className="font-semibold text-[#1C1917]">Add to Home screen</strong> or{" "}
                <strong className="font-semibold text-[#1C1917]">Install app</strong>.
              </li>
            </>
          )}
        </ul>
        <div className="flex justify-center">
          <StepMedia
            videoSrc={platform === "iphone" ? "/onboarding/install-ios.mp4" : "/onboarding/install-android.mp4"}
            gifSrc={platform === "iphone" ? "/onboarding/install-ios.gif" : "/onboarding/install-android.gif"}
            label={platform === "iphone" ? "iPhone: Share then Add to Home Screen" : "Android: menu then add to home screen"}
            caption={
              platform === "iphone"
                ? "Optional clip: Share sheet → Add to Home Screen."
                : "Optional clip: Chrome menu → Install or Add to Home screen."
            }
          />
        </div>
      </section>

      <section className="space-y-4 rounded-2xl border border-[#EDE8E0] bg-white p-5 sm:p-6">
        <h2 className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#B0A898]">
          2 · Add intelligence (one time)
        </h2>
        <ul className="list-inside list-disc space-y-1 text-sm leading-relaxed text-[#4A4340]">
          <li>
            Open{" "}
            <a
              href={OPENAI_KEYS_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-[#8B7355] underline-offset-2 hover:underline"
            >
              OpenAI API keys
            </a>{" "}
            and sign in.
          </li>
          <li>Create a key, copy it, then paste it in Settings below — it stays in this browser only.</li>
        </ul>
        <div className="flex justify-center">
          <StepMedia
            videoSrc="/onboarding/openai-key.mp4"
            gifSrc="/onboarding/openai-key.gif"
            label="Creating an OpenAI API key"
            caption="Optional clip: platform.openai.com → API keys → Create."
          />
        </div>
        <p className="text-center text-xs text-[#B0A898]">
          {embedded ? (
            <>Paste your key in the field below on this page.</>
          ) : (
            <>
              <Link href="/settings" className="font-semibold text-[#8B7355] underline-offset-2 hover:underline">
                Open Settings
              </Link>{" "}
              to save your key.
            </>
          )}
        </p>
      </section>
    </div>
  );
}
