import { TurnAPhrase } from "@/components/TurnAPhrase";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Turn a phrase — from everyday to Shakespeare | Lexy",
  description:
    "Tap the worn word or phrase in your own line, or open the ones everyone uses, and climb from a subtle swap to a Shakespearean flourish.",
};

export default function PhrasesPage() {
  return <TurnAPhrase />;
}
