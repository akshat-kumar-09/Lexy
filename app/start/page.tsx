import { SetupGifs } from "@/components/SetupGifs";
import Link from "next/link";

export default function StartPage() {
  return (
    <div className="mx-auto max-w-lg space-y-8 pb-10 sm:space-y-10">
      <SetupGifs />
      <p className="text-center text-sm text-[#6A6360]">
        <Link href="/" className="font-semibold text-[#8B7355] underline-offset-2 hover:underline">
          Back to home
        </Link>
      </p>
    </div>
  );
}
