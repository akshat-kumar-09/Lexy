"use client";

import { useCallback, useEffect, useState } from "react";

function pickEnglishVoice(): SpeechSynthesisVoice | null {
  if (typeof window === "undefined" || !window.speechSynthesis) return null;
  const voices = window.speechSynthesis.getVoices();
  if (voices.length === 0) return null;
  const prefer =
    voices.find((v) => v.lang.startsWith("en") && v.localService) ??
    voices.find((v) => v.lang.startsWith("en-US")) ??
    voices.find((v) => v.lang.startsWith("en"));
  return prefer ?? null;
}

function speakWord(text: string) {
  const clean = text.trim();
  if (!clean || typeof window === "undefined" || !window.speechSynthesis) return;

  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(clean);
  u.lang = "en-US";
  u.rate = 0.92;
  const voice = pickEnglishVoice();
  if (voice) u.voice = voice;
  window.speechSynthesis.speak(u);
}

export function PronounceButton({
  word,
  className = "",
  label = "Play pronunciation",
}: {
  word: string;
  className?: string;
  label?: string;
}) {
  const [supported, setSupported] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    setSupported(true);
    const sync = () => setSupported(true);
    window.speechSynthesis.addEventListener("voiceschanged", sync);
    return () => window.speechSynthesis.removeEventListener("voiceschanged", sync);
  }, []);

  const onClick = useCallback(() => {
    speakWord(word);
  }, [word]);

  if (!supported) return null;

  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[#EDE8E0] bg-[#FEFCF8] text-[#6A6360] transition hover:border-[#8B7355] hover:bg-[#F5EFE0] hover:text-[#1C1917] ${className}`}
    >
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden>
        <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" />
      </svg>
    </button>
  );
}
