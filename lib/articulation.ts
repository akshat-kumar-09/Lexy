/**
 * The world of exuberant communication.
 * Visual-first: each master-fact is a one-line claim + a diagram (see FactVisual).
 * Care is taken to stay accurate — including the caveats on famously-misquoted
 * research (Mehrabian's 7-38-55; "power posing").
 */

export type MasterFact = {
  id: string;
  /** A short, memorable claim. */
  headline: string;
  /** One terse line — the visual does the explaining. */
  caption: string;
  /** Who/where it comes from, stated plainly. */
  source: string;
};

/** Master-facts that change how you think about language. Kept terse — the diagram carries it. */
export const MASTER_FACTS: MasterFact[] = [
  {
    id: "affect-labeling",
    headline: "Name it to tame it.",
    caption: "Putting a feeling into words quiets the brain's alarm.",
    source: "Affect labeling — Lieberman, UCLA.",
  },
  {
    id: "granularity",
    headline: "Specificity beats intensity.",
    caption: "One vague \u201cbad\u201d vs. many precise words = more ways to cope.",
    source: "Emotional granularity — Barrett.",
  },
  {
    id: "mehrabian",
    headline: "7 / 38 / 55 — but only for feelings.",
    caption: "When words clash with tone & face, we trust tone & face.",
    source: "Mehrabian (1967), often misquoted.",
  },
  {
    id: "prosody",
    headline: "One sentence, many meanings.",
    caption: "Move the stress, move the meaning.",
    source: "Contrastive stress.",
  },
  {
    id: "mcgurk",
    headline: "You listen with your eyes.",
    caption: "See \u201cga\u201d + hear \u201cba\u201d \u2192 your brain reports \u201cda.\u201d",
    source: "McGurk & MacDonald (1976).",
  },
  {
    id: "linguistic-relativity",
    headline: "A word sharpens what you notice.",
    caption: "Name a shade and you start seeing it.",
    source: "Linguistic relativity — Winawer.",
  },
  {
    id: "pause",
    headline: "The pause is a word.",
    caption: "Silence lands a point harder than volume.",
    source: "Disfluency & perceived confidence.",
  },
  {
    id: "gesture",
    headline: "Your hands help you think.",
    caption: "Stop the hands and speech gets less fluent.",
    source: "Gesture research — Goldin-Meadow.",
  },
  {
    id: "warmth-competence",
    headline: "Warmth first, then competence.",
    caption: "People ask \u201ccan I trust you?\u201d before \u201ccan I respect you?\u201d",
    source: "Fiske, Cuddy & Glick.",
  },
  {
    id: "curse-of-knowledge",
    headline: "Knowing makes explaining harder.",
    caption: "Once you climb, you forget the steps you skipped.",
    source: "Heath & Heath.",
  },
  {
    id: "mirroring",
    headline: "We sync with people we like.",
    caption: "Posture, pace, and pitch drift into rhythm.",
    source: "Communication accommodation.",
  },
  {
    id: "story",
    headline: "Stories sync two brains.",
    caption: "A vivid story makes the listener's brain track yours.",
    source: "Neural coupling — Hasson, Princeton.",
  },
];

export type Lever = {
  name: string;
  detail: string;
};

export type LeverGroup = {
  id: string;
  title: string;
  intro: string;
  levers: Lever[];
};

/** The controllable dimensions of how you sound and how you stand. Kept to one crisp line each. */
export const LEVER_GROUPS: LeverGroup[] = [
  {
    id: "tone",
    title: "Tone",
    intro: "The melody under your words — trusted over the words when the two disagree.",
    levers: [
      { name: "Pitch", detail: "Lower & steadier reads calm and sure." },
      { name: "Pace", detail: "Fast = energy; slow = gravity. Vary it." },
      { name: "Pause", detail: "Silence is emphasis. Beat before the key word." },
      { name: "Dynamics", detail: "Go quieter to pull a room in. Contrast registers." },
      { name: "Warmth", detail: "A smiling voice signals you're for them." },
      { name: "Articulation", detail: "Finished word-endings read as care." },
    ],
  },
  {
    id: "body",
    title: "Body language",
    intro: "Read mostly unconsciously — small honest moves beat rehearsed ones.",
    levers: [
      { name: "Openness", detail: "Upright & open = trusted. (Hormone claims didn't replicate.)" },
      { name: "Eye contact", detail: "Hold it a touch more while listening than speaking." },
      { name: "Gesture", detail: "Hands that match the words add belief." },
      { name: "Real smile", detail: "A true one reaches the eyes." },
      { name: "Orientation", detail: "Where your torso points is where attention reads." },
      { name: "Stillness", detail: "Calm hands project security." },
    ],
  },
];

export type StudioPrompt = {
  text: string;
  tag: string;
};

/** Prompts for the speaking studio — short and designed to stretch articulation. */
export const STUDIO_PROMPTS: StudioPrompt[] = [
  { text: "Name a feeling you had today in one precise word — then say why that word, not its neighbors.", tag: "Granularity" },
  { text: "Explain something you know well to a curious twelve-year-old. No jargon.", tag: "Clarity" },
  { text: "Tell the story of your morning in exactly three sentences.", tag: "Story" },
  { text: "Argue convincingly for the opposite of something you believe.", tag: "Range" },
  { text: "Describe this room to someone who'll never see it — the light, one detail.", tag: "Image" },
  { text: "Say \u201cI never said she took the money\u201d seven times, stressing a different word each time.", tag: "Tone" },
  { text: "Give a 60-second toast to someone you admire. Open with warmth.", tag: "Warmth" },
  { text: "Recommend something you love — make me want it without saying \u201cgood.\u201d", tag: "Vivid" },
  { text: "Think aloud through a decision you're weighing, as if to a wise friend.", tag: "Think aloud" },
  { text: "Read a paragraph you admire aloud, then say it from memory in your own words.", tag: "Shadowing" },
];

export type StudioTip = {
  title: string;
  detail: string;
};

/** How to actually improve from recording yourself. Terse. */
export const STUDIO_TIPS: StudioTip[] = [
  { title: "Listen for one thing.", detail: "Pick a single dimension — pace, filler, endings. One fix per take." },
  { title: "The cringe is accuracy.", detail: "Your voice sounds odd because you usually hear it through your skull." },
  { title: "Shadow a voice you love.", detail: "Copy 30 seconds of a speaker you admire — rhythm, pauses, melody." },
  { title: "Read aloud daily.", detail: "Five minutes trains breath and phrasing better than any tip." },
];
