import { redirect } from "next/navigation";

/** Old path; bookmarks still work. */
export default function DailyRedirectPage() {
  redirect("/metaphors");
}
