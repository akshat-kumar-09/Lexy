import { Sharpen } from "@/components/Sharpen";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sharpen — say exactly what you mean | Lexy",
  description:
    "Paste your best attempt at a line, say what you mean and the tone you want — Lexy keeps your voice and finds the exact words.",
};

export default function SharpenPage() {
  return <Sharpen />;
}
