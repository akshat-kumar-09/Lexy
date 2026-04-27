/** localStorage keys for the dismissible setup hint and guide. */

export const SETUP_HINT_DISMISSED_KEY = "lexy-dismiss-setup-hint";

export function isSetupHintDismissed(): boolean {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(SETUP_HINT_DISMISSED_KEY) === "1";
}

export function dismissSetupHint(): void {
  try {
    window.localStorage.setItem(SETUP_HINT_DISMISSED_KEY, "1");
  } catch {
    /* ignore */
  }
}

export function clearSetupHintDismissed(): void {
  try {
    window.localStorage.removeItem(SETUP_HINT_DISMISSED_KEY);
  } catch {
    /* ignore */
  }
}
