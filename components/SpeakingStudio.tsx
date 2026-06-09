"use client";

import { STUDIO_PROMPTS, type StudioPrompt } from "@/lib/articulation";
import { useCallback, useEffect, useRef, useState } from "react";

type RecState = "idle" | "recording" | "recorded";

function formatTime(s: number): string {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

export function SpeakingStudio() {
  const [promptIdx, setPromptIdx] = useState(0);
  const [recState, setRecState] = useState<RecState>("idle");
  const [elapsed, setElapsed] = useState(0);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [supported, setSupported] = useState(true);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const audioUrlRef = useRef<string | null>(null);

  useEffect(() => {
    const ok =
      typeof window !== "undefined" &&
      typeof navigator !== "undefined" &&
      !!navigator.mediaDevices?.getUserMedia &&
      typeof window.MediaRecorder !== "undefined";
    setSupported(ok);
  }, []);

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const releaseStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  const clearAudio = useCallback(() => {
    if (audioUrlRef.current) {
      URL.revokeObjectURL(audioUrlRef.current);
      audioUrlRef.current = null;
    }
    setAudioUrl(null);
  }, []);

  useEffect(() => {
    return () => {
      stopTimer();
      releaseStream();
      if (audioUrlRef.current) URL.revokeObjectURL(audioUrlRef.current);
    };
  }, [stopTimer, releaseStream]);

  const startRecording = useCallback(async () => {
    setError(null);
    clearAudio();
    setElapsed(0);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      chunksRef.current = [];

      const recorder = new MediaRecorder(stream);
      recorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, {
          type: recorder.mimeType || "audio/webm",
        });
        const url = URL.createObjectURL(blob);
        audioUrlRef.current = url;
        setAudioUrl(url);
        setRecState("recorded");
        releaseStream();
        stopTimer();
      };

      recorder.start();
      setRecState("recording");
      timerRef.current = setInterval(() => {
        setElapsed((e) => {
          // Safety stop at 5 minutes.
          if (e >= 299) {
            if (recorder.state !== "inactive") recorder.stop();
            return e;
          }
          return e + 1;
        });
      }, 1000);
    } catch (err) {
      const name = err instanceof DOMException ? err.name : "";
      if (name === "NotAllowedError" || name === "SecurityError") {
        setError("Microphone access was blocked. Allow it in your browser to record.");
      } else if (name === "NotFoundError") {
        setError("No microphone was found on this device.");
      } else {
        setError("Could not start recording on this device.");
      }
      releaseStream();
      setRecState("idle");
    }
  }, [clearAudio, releaseStream, stopTimer]);

  const stopRecording = useCallback(() => {
    if (recorderRef.current && recorderRef.current.state !== "inactive") {
      recorderRef.current.stop();
    }
  }, []);

  const reset = useCallback(() => {
    clearAudio();
    setElapsed(0);
    setRecState("idle");
  }, [clearAudio]);

  const nextPrompt = useCallback(() => {
    setPromptIdx((i) => (i + 1) % STUDIO_PROMPTS.length);
  }, []);

  const shufflePrompt = useCallback(() => {
    setPromptIdx((i) => {
      if (STUDIO_PROMPTS.length < 2) return i;
      let n = i;
      while (n === i) n = Math.floor(Math.random() * STUDIO_PROMPTS.length);
      return n;
    });
  }, []);

  const prompt: StudioPrompt = STUDIO_PROMPTS[promptIdx]!;

  return (
    <div className="overflow-hidden rounded-[1.5rem] border border-[#2A2520] bg-[#1C1917] shadow-xl">
      <div className="border-b border-[#2A2520] px-5 py-5 sm:px-7 sm:py-6">
        <div className="flex items-center justify-between gap-3">
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#8B7355]">
            Your prompt
          </p>
          <span className="rounded-full border border-[#3D3830] bg-[#252220] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.1em] text-[#C8BFB0]">
            {prompt.tag}
          </span>
        </div>
        <p className="mt-3 font-serif text-lg leading-snug text-[#F5EFE0] sm:text-xl">
          {prompt.text}
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={nextPrompt}
            className="rounded-full border border-[#3D3830] px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.1em] text-[#C8BFB0] transition active:bg-[#252220] sm:hover:border-[#8B7355]"
          >
            Next prompt
          </button>
          <button
            type="button"
            onClick={shufflePrompt}
            className="rounded-full border border-[#3D3830] px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.1em] text-[#C8BFB0] transition active:bg-[#252220] sm:hover:border-[#8B7355]"
          >
            Surprise me
          </button>
        </div>
      </div>

      <div className="px-5 py-6 sm:px-7">
        {!supported ? (
          <p className="rounded-xl border border-[#3D3830] bg-[#252220] px-4 py-3 text-sm leading-relaxed text-[#C8BFB0]">
            Recording isn&apos;t available in this browser. You can still use every prompt out
            loud — speak it, then say it again better. The microphone is a mirror, not a
            requirement.
          </p>
        ) : (
          <>
            <div className="flex flex-col items-center gap-4 text-center">
              <div className="flex items-center gap-3">
                <span
                  className={`inline-block h-3 w-3 rounded-full ${
                    recState === "recording" ? "bg-red-500 lexy-glow" : "bg-[#3D3830]"
                  }`}
                  aria-hidden
                />
                <span
                  className={`font-serif text-3xl tabular-nums sm:text-4xl ${
                    recState === "recording" ? "text-[#F5EFE0]" : "text-[#A8A098]"
                  }`}
                >
                  {formatTime(elapsed)}
                </span>
              </div>

              {recState !== "recording" && (
                <button
                  type="button"
                  onClick={startRecording}
                  className="inline-flex items-center gap-2 rounded-full bg-[#F5EFE0] px-7 py-3.5 text-sm font-semibold text-[#1C1917] transition active:scale-[0.98] sm:hover:bg-white"
                >
                  <span className="inline-block h-2.5 w-2.5 rounded-full bg-red-500" aria-hidden />
                  {recState === "recorded" ? "Record again" : "Start recording"}
                </button>
              )}

              {recState === "recording" && (
                <button
                  type="button"
                  onClick={stopRecording}
                  className="inline-flex items-center gap-2 rounded-full border border-[#8B7355] bg-[#252220] px-7 py-3.5 text-sm font-semibold text-[#F5EFE0] transition active:scale-[0.98]"
                >
                  <span className="inline-block h-2.5 w-2.5 rounded-[3px] bg-[#F5EFE0]" aria-hidden />
                  Stop
                </button>
              )}

              <p className="max-w-sm text-xs leading-relaxed text-[#8B7355]">
                {recState === "recording"
                  ? "Speak freely. Don't restart for stumbles — keep going and finish the thought."
                  : "Audio stays on your device. Nothing is uploaded."}
              </p>
            </div>

            {error && (
              <p className="mt-4 rounded-xl border border-red-900/50 bg-red-950/40 px-4 py-3 text-sm text-red-200">
                {error}
              </p>
            )}

            {audioUrl && recState === "recorded" && (
              <div className="mt-6 space-y-4 rounded-2xl border border-[#2A2520] bg-[#252220] p-4 sm:p-5">
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#8B7355]">
                  Listen back — for one thing
                </p>
                <audio src={audioUrl} controls className="w-full" />
                <div className="flex flex-wrap gap-2">
                  <a
                    href={audioUrl}
                    download={`lexy-take-${Date.now()}.webm`}
                    className="rounded-full border border-[#3D3830] px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.1em] text-[#C8BFB0] transition active:bg-[#1C1917] sm:hover:border-[#8B7355]"
                  >
                    Download take
                  </a>
                  <button
                    type="button"
                    onClick={reset}
                    className="rounded-full border border-[#3D3830] px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.1em] text-[#C8BFB0] transition active:bg-[#1C1917] sm:hover:border-[#8B7355]"
                  >
                    Clear
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
