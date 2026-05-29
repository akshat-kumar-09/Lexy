/** localStorage flag for the first-run welcome story (LexyIntro). */

export const INTRO_SEEN_KEY = "lexy-intro-seen-v1";

/** Event other components can dispatch to (re)open the welcome story. */
export const OPEN_INTRO_EVENT = "lexy:open-intro";

export function isIntroSeen(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(INTRO_SEEN_KEY) === "1";
  } catch {
    return false;
  }
}

export function markIntroSeen(): void {
  try {
    window.localStorage.setItem(INTRO_SEEN_KEY, "1");
  } catch {
    /* ignore */
  }
}

export function clearIntroSeen(): void {
  try {
    window.localStorage.removeItem(INTRO_SEEN_KEY);
  } catch {
    /* ignore */
  }
}

/** Ask the mounted LexyIntro to open (e.g. a "Replay the welcome" link). */
export function openIntro(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(OPEN_INTRO_EVENT));
}
