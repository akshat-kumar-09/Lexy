/**
 * What the browser and /api/lexy agree on: the named tasks Lexy can run, and the errors it shows.
 * No prompts live here — those stay on the server (lib/lexyTasks.ts).
 */

export const LEXY_TASKS = [
  "taste-batch",
  "taste-fill",
  "taste-replace",
  "metaphor-batch",
  "metaphor-fill",
  "scribble-rewrite",
  "scribble-ideas",
  "handwriting",
  "name-feeling",
  "sharpen",
  "phrase-ladder",
] as const;

export type LexyTaskName = (typeof LEXY_TASKS)[number];

export function isLexyTask(v: unknown): v is LexyTaskName {
  return typeof v === "string" && (LEXY_TASKS as readonly string[]).includes(v);
}

export const SIGN_IN_NEEDED = "Sign in to let Lexy find words for you.";
export const SIGN_IN_BROKEN = "Lexy can't check sign-ins right now — that's on our side, not yours. Please try again soon.";
export const DAILY_LIMIT_REACHED = "You've done a lot with Lexy today — your daily allowance resets tomorrow.";
export const LEXY_RESTING = "Lexy has reached today's limit for everyone — please try again tomorrow.";

export type LexyErrorCode = "signin" | "quota";

export function isSignInNeeded(message: string | null | undefined): boolean {
  return message === SIGN_IN_NEEDED;
}

export class LexyRequestError extends Error {
  readonly status: number;
  readonly code?: LexyErrorCode;

  constructor(message: string, status: number, code?: LexyErrorCode) {
    super(message);
    this.name = "LexyRequestError";
    this.status = status;
    this.code = code;
  }
}

/** Errors no retry or fallback can fix — stop the whole batch and show them. */
export function isBlockingLexyError(e: unknown): e is LexyRequestError {
  return e instanceof LexyRequestError && (e.code === "signin" || e.code === "quota");
}
