"use client";

import {
  buildShareText,
  renderWordCard,
  shareCardFilename,
  shareCardFromDeepDive,
} from "@/lib/shareCard";
import type { DeepDiveResult } from "@/lib/types";
import { AnimatePresence, motion } from "framer-motion";
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

type Toast = "shared" | "saved" | "copied-image" | "copied-text" | null;

function canShareFiles(files: File[]): boolean {
  if (typeof navigator === "undefined" || !navigator.share || !navigator.canShare) return false;
  try {
    return navigator.canShare({ files });
  } catch {
    return false;
  }
}

/**
 * Sends the word, not the app: the share sheet carries a plain image of this page —
 * no wordmark, no link, nothing the recipient is nudged to open.
 */
export function ShareWordCard({ result }: { result: DeepDiveResult }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [blob, setBlob] = useState<Blob | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<Toast>(null);

  const previewUrlRef = useRef<string | null>(null);
  const card = shareCardFromDeepDive(result);
  const filename = shareCardFilename(card.word);

  const releasePreview = useCallback(() => {
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
      previewUrlRef.current = null;
    }
    setPreview(null);
    setBlob(null);
  }, []);

  useEffect(() => releasePreview, [releasePreview]);
  useEffect(() => {
    releasePreview();
    setOpen(false);
    setError(null);
    setToast(null);
  }, [result.word, releasePreview]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 1900);
    return () => clearTimeout(t);
  }, [toast]);

  const close = useCallback(() => {
    setOpen(false);
    releasePreview();
  }, [releasePreview]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        close();
      }
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [open, close]);

  async function build(): Promise<Blob | null> {
    setBusy(true);
    setError(null);
    try {
      const b = await renderWordCard(card);
      const url = URL.createObjectURL(b);
      previewUrlRef.current = url;
      setPreview(url);
      setBlob(b);
      return b;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not make the card");
      return null;
    } finally {
      setBusy(false);
    }
  }

  async function openSheet() {
    setOpen(true);
    if (!blob) await build();
  }

  async function shareImage() {
    if (!blob) return;
    const file = new File([blob], filename, { type: "image/png" });
    if (canShareFiles([file])) {
      try {
        await navigator.share({ files: [file] });
        setToast("shared");
        return;
      } catch (e) {
        // A cancelled share sheet is not an error worth showing.
        if (e instanceof DOMException && e.name === "AbortError") return;
      }
    }
    saveImage();
  }

  function saveImage() {
    if (!preview) return;
    const a = document.createElement("a");
    a.href = preview;
    a.download = filename;
    a.click();
    setToast("saved");
  }

  async function copyImage() {
    if (!blob) return;
    try {
      await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
      setToast("copied-image");
    } catch {
      setError("Couldn’t copy the image here — save it instead.");
    }
  }

  async function copyText() {
    try {
      await navigator.clipboard.writeText(buildShareText(card));
      setToast("copied-text");
    } catch {
      setError("Couldn’t copy here — long-press the card to save it.");
    }
  }

  const supportsShare = typeof navigator !== "undefined" && Boolean(navigator.share);
  const supportsCopyImage =
    typeof window !== "undefined" && "ClipboardItem" in window && Boolean(navigator.clipboard?.write);

  return (
    <>
      <button
        type="button"
        onClick={() => void openSheet()}
        className="relative z-10 flex min-h-10 shrink-0 items-center gap-1.5 rounded-full px-3 text-xs font-semibold uppercase tracking-[0.1em] text-[#8B7355] active:bg-[#F5EFE0] sm:hover:bg-[#F5EFE0]"
        aria-label={`Share the page for ${card.word}`}
      >
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" aria-hidden="true">
          <path
            d="M12 15V4m0 0L8.5 7.5M12 4l3.5 3.5"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M5 13v5.5A1.5 1.5 0 0 0 6.5 20h11a1.5 1.5 0 0 0 1.5-1.5V13"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
        </svg>
        Share
      </button>

      {typeof document !== "undefined" &&
        createPortal(
          <AnimatePresence>
            {open && (
              <>
                <motion.div
                  key="share-backdrop"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.18 }}
                  className="fixed inset-0 z-[200] bg-[#1C1917]/55 backdrop-blur-[3px]"
                  onClick={close}
                  aria-hidden
                />
                <div className="fixed inset-0 z-[210] flex items-end justify-center sm:items-center sm:p-4">
                  <motion.div
                    key="share-panel"
                    initial={{ opacity: 0, y: 28, scale: 0.97 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 18, scale: 0.98 }}
                    transition={{ type: "spring", stiffness: 460, damping: 34 }}
                    role="dialog"
                    aria-modal="true"
                    aria-label={`Share ${card.word}`}
                    className="max-h-[min(94dvh,calc(100dvh-2rem))] w-full max-w-md overflow-y-auto rounded-t-3xl border border-b-0 border-[#EDE8E0] bg-[#FEFCF8] px-4 pb-[max(1.15rem,env(safe-area-inset-bottom))] pt-3 shadow-[0_-12px_40px_rgba(0,0,0,0.18)] sm:rounded-3xl sm:border-b sm:p-6"
                  >
                    <div className="relative flex h-9 items-center sm:h-auto">
                      <div className="pointer-events-none absolute inset-x-0 flex justify-center pt-1 sm:hidden">
                        <div className="h-1 w-10 rounded-full bg-[#D4CCC0]" aria-hidden />
                      </div>
                      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#8B7355]">
                        Send the word
                      </p>
                      <button
                        type="button"
                        onClick={close}
                        className="relative z-10 ml-auto min-h-9 rounded-full px-2.5 text-[11px] font-semibold uppercase tracking-[0.1em] text-[#8B7355] active:bg-[#F5EFE0] sm:hover:bg-[#F5EFE0]"
                      >
                        Close
                      </button>
                    </div>

                    <p className="mt-1 text-[12.5px] leading-relaxed text-[#6A6360]">
                      Just the page — no link, nothing to install. They get a word, not an invitation.
                    </p>

                    <div className="mt-4 overflow-hidden rounded-2xl border border-[#EDE8E0] bg-white shadow-sm">
                      {preview ? (
                        // eslint-disable-next-line @next/next/no-img-element -- object URL for a canvas blob
                        <img src={preview} alt={`Shareable page for ${card.word}`} className="block w-full" />
                      ) : (
                        <div className="space-y-3 p-6">
                          <div className="h-8 w-2/5 rounded-full lexy-shimmer" />
                          <div className="h-4 w-1/4 rounded-full lexy-shimmer" />
                          <div className="mt-6 h-3 w-full rounded-full lexy-shimmer" />
                          <div className="h-3 w-5/6 rounded-full lexy-shimmer" />
                          <div className="h-3 w-3/5 rounded-full lexy-shimmer" />
                        </div>
                      )}
                    </div>

                    {error && (
                      <p className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-[13px] text-red-800">
                        {error}
                      </p>
                    )}

                    <div className="mt-4 space-y-2.5">
                      <button
                        type="button"
                        disabled={busy || !blob}
                        onClick={() => void shareImage()}
                        className="w-full rounded-full bg-[#1C1917] py-3.5 text-sm font-semibold text-[#F5EFE0] transition hover:bg-[#2C2920] disabled:opacity-40"
                      >
                        {busy ? "Setting the page…" : supportsShare ? "Share the page" : "Download the page"}
                      </button>
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          disabled={busy || !preview}
                          onClick={saveImage}
                          className="min-w-0 flex-1 rounded-full border border-[#EDE8E0] py-2.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#6A6360] transition hover:border-[#8B7355] disabled:opacity-40"
                        >
                          Save image
                        </button>
                        {supportsCopyImage && (
                          <button
                            type="button"
                            disabled={busy || !blob}
                            onClick={() => void copyImage()}
                            className="min-w-0 flex-1 rounded-full border border-[#EDE8E0] py-2.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#6A6360] transition hover:border-[#8B7355] disabled:opacity-40"
                          >
                            Copy image
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => void copyText()}
                          className="min-w-0 flex-1 rounded-full border border-[#EDE8E0] py-2.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#6A6360] transition hover:border-[#8B7355]"
                        >
                          Copy text
                        </button>
                      </div>
                    </div>

                    <div className="mt-3 min-h-4 text-center">
                      <AnimatePresence>
                        {toast && (
                          <motion.p
                            key={toast}
                            initial={{ opacity: 0, y: 4 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0 }}
                            className="font-serif text-[12px] italic text-[#8B7355]"
                          >
                            {toast === "shared" && "Sent."}
                            {toast === "saved" && "Saved to your device."}
                            {toast === "copied-image" && "Image copied — paste it anywhere."}
                            {toast === "copied-text" && "Text copied."}
                          </motion.p>
                        )}
                      </AnimatePresence>
                    </div>
                  </motion.div>
                </div>
              </>
            )}
          </AnimatePresence>,
          document.body
        )}
    </>
  );
}
