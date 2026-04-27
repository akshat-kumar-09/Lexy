"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { dismissSetupHint, isSetupHintDismissed } from "@/lib/setupStorage";

export function FirstTimeBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(!isSetupHintDismissed());
  }, []);

  if (!visible) return null;

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#EDE8E0] bg-[#FDFBF7] px-4 py-3 shadow-sm sm:px-5">
      <p className="min-w-0 flex-1 text-sm leading-relaxed text-[#4A4340]">
        <span className="font-semibold text-[#1C1917]">First time?</span>{" "}
        <Link href="/start" className="text-[#8B7355] underline-offset-2 hover:underline">
          See two quick setup steps
        </Link>{" "}
        — home screen + one API key.
      </p>
      <button
        type="button"
        onClick={() => {
          dismissSetupHint();
          setVisible(false);
        }}
        className="shrink-0 rounded-full border border-[#D4CCC0] px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-[#6A6360] active:bg-[#F5EFE0]"
      >
        Dismiss
      </button>
    </div>
  );
}
