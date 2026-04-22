"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useCallback, useId, useState } from "react";

function buildFeedbackHref(note: string): string {
  const configured = process.env.NEXT_PUBLIC_FEEDBACK_URL?.trim();
  if (configured) {
    try {
      const u = new URL(configured);
      if (note.trim()) u.searchParams.set("note", note.trim().slice(0, 4000));
      return u.toString();
    } catch {
      /* fall through to mailto */
    }
  }
  const subject = encodeURIComponent("Lexy — your idea");
  const body = encodeURIComponent(
    note.trim()
      ? `${note.trim()}\n\n— sent from Lexy`
      : "I'd love to share an idea or a rough edge I noticed:\n\n"
  );
  return `mailto:?subject=${subject}&body=${body}`;
}

export function VoiceValuedButton() {
  const id = useId();
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState("");

  const submit = useCallback(() => {
    window.location.href = buildFeedbackHref(note);
    setOpen(false);
  }, [note]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-[max(5.75rem,calc(5.25rem+env(safe-area-inset-bottom)))] right-3 z-[35] flex max-w-[min(calc(100vw-1.5rem),14rem)] items-center justify-center rounded-full border border-[#8B7355]/35 bg-gradient-to-br from-[#F5EFE0] via-white to-[#EDE8E0] px-3 py-2.5 text-center shadow-[0_4px_24px_rgba(28,25,23,0.12)] backdrop-blur-sm transition hover:border-[#8B7355]/55 hover:shadow-[0_6px_28px_rgba(139,115,85,0.2)] active:scale-[0.98] md:bottom-6 md:right-6 md:max-w-none md:px-5 md:py-3"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={`${id}-feedback-dialog`}
      >
        <span className="font-serif text-[11px] font-semibold italic leading-tight text-[#1C1917] md:text-sm">
          Your voice is valued
        </span>
      </button>

      <AnimatePresence>
        {open && (
          <>
            <motion.button
              type="button"
              aria-label="Close"
              className="fixed inset-0 z-[45] bg-[#1C1917]/25 backdrop-blur-[2px]"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setOpen(false)}
            />
            <motion.div
              id={`${id}-feedback-dialog`}
              role="dialog"
              aria-modal="true"
              aria-labelledby={`${id}-feedback-title`}
              initial={{ opacity: 0, y: 12, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.98 }}
              transition={{ type: "spring", stiffness: 380, damping: 32 }}
              className="fixed left-1/2 top-[min(12vh,6rem)] z-[50] w-[min(calc(100vw-2rem),22rem)] -translate-x-1/2 rounded-2xl border border-[#EDE8E0] bg-[#FEFCF8] p-5 shadow-2xl md:top-[20vh]"
            >
              <h2 id={`${id}-feedback-title`} className="font-serif text-lg font-bold italic text-[#1C1917]">
                Tell us what would make Lexy better
              </h2>
              <p className="mt-2 text-xs leading-relaxed text-[#6A6360]">
                A rough edge, a dream feature, a line that confused you — we read every note we get.
              </p>
              <label htmlFor={`${id}-note`} className="mt-4 block text-[10px] font-semibold uppercase tracking-[0.14em] text-[#B0A898]">
                Your words
              </label>
              <textarea
                id={`${id}-note`}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={4}
                placeholder="What would you change or cherish more?"
                className="mt-1.5 w-full resize-y rounded-xl border border-[#EDE8E0] bg-white p-3 text-sm text-[#1C1917] outline-none ring-[#8B7355]/15 focus:border-[#8B7355] focus:ring-4"
              />
              <p className="mt-2 text-[10px] leading-relaxed text-[#B0A898]">
                Opens your email app to send — or set{" "}
                <code className="rounded bg-[#F5F0EA] px-1">NEXT_PUBLIC_FEEDBACK_URL</code> to a form.
              </p>
              <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="rounded-full border border-[#EDE8E0] px-4 py-2.5 text-xs font-semibold text-[#6A6360] hover:border-[#8B7355]/40"
                >
                  Not now
                </button>
                <button
                  type="button"
                  onClick={submit}
                  className="rounded-full bg-[#1C1917] px-5 py-2.5 text-xs font-semibold text-[#F5EFE0] shadow-md hover:bg-[#2C2920]"
                >
                  Send feedback
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
