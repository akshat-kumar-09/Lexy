/**
 * The world of exuberant communication.
 * Curated, source-aware facts and levers for the Articulate page.
 * Care is taken to state findings accurately — including the caveats on
 * famously-misquoted research (Mehrabian's 7-38-55; "power posing").
 */

export type MasterFact = {
  id: string;
  /** A short, memorable claim. */
  headline: string;
  /** The unpacking — what it really means and why it changes how you think. */
  body: string;
  /** A one-line takeaway you can act on. */
  practice: string;
  /** Who/where it comes from, stated plainly. */
  source: string;
};

/** Master-facts that change how you think about language. */
export const MASTER_FACTS: MasterFact[] = [
  {
    id: "affect-labeling",
    headline: "Naming a feeling quiets it.",
    body: "Putting an emotion into words — \u201cI feel resentful,\u201d not just \u201cI feel bad\u201d \u2014 measurably lowers activity in the amygdala, the brain's alarm system, and recruits the prefrontal cortex that regulates it. The act of articulation is itself a form of self-soothing. Vagueness keeps a feeling loud; precision turns the volume down.",
    practice: "When something stirs you, reach for the most exact word you can find before you do anything else.",
    source: "Affect labeling \u2014 Lieberman et al., UCLA (2007).",
  },
  {
    id: "granularity",
    headline: "Specificity beats intensity.",
    body: "People with a large, precise emotional vocabulary \u2014 who distinguish \u201cwistful\u201d from \u201cgloomy\u201d from \u201cdeflated\u201d \u2014 regulate themselves better, drink less, and cope with stress more flexibly. The skill is called emotional granularity. More words don't just describe more feeling; they create more options for what to do about it.",
    practice: "Trade \u201creally bad\u201d for one exact word. Each word you own is a tool you can pick up.",
    source: "Emotional granularity \u2014 Lisa Feldman Barrett.",
  },
  {
    id: "mehrabian",
    headline: "\u201c7% words, 38% tone, 55% body\u201d is real \u2014 but only about feelings.",
    body: "Mehrabian's famous ratio is the most misquoted finding in communication. It does NOT mean words barely matter. It means: when someone's words and their tone or face contradict each other about how they FEEL, listeners trust the tone and the face over the words. For conveying information, words carry the load. For conveying attitude, congruence is everything.",
    practice: "Don't underrate words \u2014 do make sure your tone and face agree with them. Mixed signals are read as the truth.",
    source: "Albert Mehrabian (1967), often misapplied.",
  },
  {
    id: "prosody",
    headline: "One sentence holds many meanings.",
    body: "\u201cI never said she stole my money\u201d means seven different things depending on which word you stress. Prosody \u2014 the melody, stress, and rhythm of speech \u2014 isn't decoration on top of meaning; it IS meaning. The same words can reassure or threaten, ask or accuse. Tone is not how you say it; it is part of what you say.",
    practice: "Before a hard conversation, decide which word carries the weight \u2014 and let your voice land it there.",
    source: "Linguistic stress / contrastive focus.",
  },
  {
    id: "mcgurk",
    headline: "You listen with your eyes.",
    body: "Watch a mouth shape \u201cga\u201d while your ears receive \u201cba,\u201d and your brain reports hearing \u201cda\u201d \u2014 a fusion of both. It's called the McGurk effect, and it persists even when you know it's happening. Speech perception is multisensory: your face is part of your voice. On a muffled call, people understand you better when they can see you.",
    practice: "When clarity matters, let people see your face. Sound and sight are one channel to the listener.",
    source: "McGurk & MacDonald (1976).",
  },
  {
    id: "linguistic-relativity",
    headline: "A word can sharpen what you can notice.",
    body: "Russian has two basic words for blue (lighter \u201cgoluboy,\u201d darker \u201csiniy\u201d) and speakers distinguish those shades faster than English speakers. Having a name for a thing \u2014 a color, an emotion, a kind of pause \u2014 doesn't change the world, but it changes the resolution at which you can perceive it. Vocabulary is a lens, not just a label.",
    practice: "Collect words for distinctions you care about. The naming comes first; the noticing follows.",
    source: "Linguistic relativity \u2014 Winawer et al. (2007).",
  },
  {
    id: "pause",
    headline: "The pause is the most underused word.",
    body: "A deliberate silence reads as control, authority, and ease. It gives the listener time to absorb and gives you time to choose. Filler (\u201cum,\u201d \u201clike\u201d) isn't a moral failing, but it fills the space a pause would have made powerful. Confident speakers aren't faster \u2014 they're more comfortable being quiet.",
    practice: "Replace one filler with a full breath of silence. It will feel long to you and assured to them.",
    source: "Studies of disfluency and perceived confidence.",
  },
  {
    id: "gesture",
    headline: "Your hands help you think.",
    body: "People who gesture while speaking remember more, explain more clearly, and stay more fluent \u2014 and when you stop their hands, their speech degrades. Gesture isn't a byproduct of thought; it's part of the machinery of thought, offloading effort and surfacing ideas the words haven't caught yet.",
    practice: "Let your hands move when you explain something hard. They're doing real cognitive work.",
    source: "Goldin-Meadow, gesture research.",
  },
  {
    id: "warmth-competence",
    headline: "People judge two things first: warmth, then competence.",
    body: "Within moments of meeting you, listeners read two questions: Can I trust you (warmth)? and Can I respect you (competence)? Warmth is judged first and weighs more heavily. Brilliant arguments delivered cold are discounted; the audience has to feel you're on their side before your competence lands.",
    practice: "Open with warmth \u2014 a genuine acknowledgment of the person \u2014 before you reach for your strongest point.",
    source: "Fiske, Cuddy & Glick \u2014 warmth/competence model.",
  },
  {
    id: "curse-of-knowledge",
    headline: "The more you know, the worse you explain.",
    body: "Once you understand something, you literally cannot remember what it was like not to understand it \u2014 the \u201ccurse of knowledge.\u201d So experts skip steps, lean on jargon, and leave gaps invisible to them but fatal to the listener. Clarity isn't about sounding smart; it's the deliberate work of rebuilding the path you've forgotten you climbed.",
    practice: "Explain it to a curious twelve-year-old. If they'd be lost, name the step you skipped.",
    source: "Heath & Heath, \u201cMade to Stick.\u201d",
  },
  {
    id: "mirroring",
    headline: "We sync with the people we like.",
    body: "In good conversation, people unconsciously converge \u2014 posture, breathing rhythm, even vocal pitch and word choice drift toward each other. This mirroring both signals rapport and helps create it. You can't fake it convincingly, but you can earn it by genuinely attending to the other person.",
    practice: "Match the other person's energy and pace a little before you try to move it. Meet them, then lead.",
    source: "Communication accommodation / linguistic convergence.",
  },
  {
    id: "story",
    headline: "Stories rewire the listener.",
    body: "A list of facts lights up the language areas of the brain. A story lights up those PLUS the regions that would activate if the listener lived the events \u2014 motion, smell, emotion. In a vivid story, the speaker's and listener's brain activity begin to track each other. Narrative isn't a sweetener for information; it's a transmission technology for experience.",
    practice: "Wrap your point in a single concrete scene. People keep the scene, and the point rides along.",
    source: "Neural coupling \u2014 Hasson et al., Princeton.",
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

/** The controllable dimensions of how you sound and how you stand. */
export const LEVER_GROUPS: LeverGroup[] = [
  {
    id: "tone",
    title: "Tone",
    intro:
      "Tone is the melody underneath your words \u2014 and listeners trust it over the words themselves when the two disagree. These are the dials you can actually turn.",
    levers: [
      {
        name: "Pitch",
        detail:
          "Lower, steadier pitch reads as calm and authoritative; a rising end turns a statement into a question. Drop your pitch at the end of a sentence you mean.",
      },
      {
        name: "Pace",
        detail:
          "Fast carries energy and urgency; slow carries gravity and confidence. Vary it \u2014 a single sentence slowed down is heard as the important one.",
      },
      {
        name: "Pause",
        detail:
          "Silence is punctuation. A beat before a key word makes it land; a beat after gives it room to echo. It is the cheapest emphasis there is.",
      },
      {
        name: "Volume & dynamics",
        detail:
          "Going quieter, not louder, can pull a room in. Contrast is what registers \u2014 a level monotone disappears no matter how loud.",
      },
      {
        name: "Warmth",
        detail:
          "A breathy, smiling voice signals goodwill; a clipped, flat one signals distance. People decide if you're for them before they weigh what you said.",
      },
      {
        name: "Articulation",
        detail:
          "Crisp consonants and finished word-endings read as care and competence. Mumbling isn't humble; it makes the listener work and quietly doubt you.",
      },
    ],
  },
  {
    id: "body",
    title: "Body language",
    intro:
      "Your body speaks first and never stops. Most of it is read unconsciously, so small, honest adjustments do more than any rehearsed gesture.",
    levers: [
      {
        name: "Posture & openness",
        detail:
          "An upright, open stance reads as confident and trustworthy; collapsing or crossing closes you off. (Note: standing tall can make YOU feel more assured \u2014 but the old claim that it shifts your hormones did not replicate.)",
      },
      {
        name: "Eye contact",
        detail:
          "Roughly hold the gaze a little more while listening than while speaking. Steady-but-soft says \u201cI'm with you\u201d; darting says nerves; staring says threat.",
      },
      {
        name: "Gesture",
        detail:
          "Let the hands illustrate \u2014 sizes, directions, contrasts. Gestures that match your words add clarity and make you more believable; restless ones leak anxiety.",
      },
      {
        name: "The genuine smile",
        detail:
          "A real (Duchenne) smile reaches the eyes and creases their corners; a polite one stops at the mouth. People read the difference instantly, even if they can't name it.",
      },
      {
        name: "Orientation",
        detail:
          "Where your torso and feet point is where your attention is read to be. Turning to square up with someone says they have it; angling away withdraws it.",
      },
      {
        name: "Stillness",
        detail:
          "Calm hands and a settled body project security. You don't need more movement \u2014 you need less noise, so the movements you do make mean something.",
      },
    ],
  },
];

export type StudioPrompt = {
  text: string;
  tag: string;
};

/** Prompts for the speaking studio \u2014 short, openable, and designed to stretch articulation. */
export const STUDIO_PROMPTS: StudioPrompt[] = [
  { text: "Describe a feeling you had today using the single most precise word you can find \u2014 then unpack why that word and not its neighbors.", tag: "Granularity" },
  { text: "Explain something you understand deeply to a curious twelve-year-old. No jargon. Find the everyday picture.", tag: "Clarity" },
  { text: "Tell the story of your morning in exactly three sentences \u2014 a beginning, a turn, and an ending.", tag: "Story" },
  { text: "Argue convincingly for the opposite of something you believe. Make the other side sound reasonable.", tag: "Range" },
  { text: "Describe this room to someone who will never see it \u2014 the light, the air, one small detail that gives it away.", tag: "Image" },
  { text: "Say a single sentence \u2014 \u2018I never said she took the money\u2019 \u2014 seven times, stressing a different word each time. Hear the meaning move.", tag: "Tone" },
  { text: "Give a sixty-second toast to someone you admire. Open with warmth before you reach for the point.", tag: "Warmth" },
  { text: "Recommend a book, place, or idea you love. Make me want it without saying the word \u2018good.\u2019", tag: "Vivid" },
  { text: "Explain a decision you're weighing out loud, as if to a wise friend. Notice what the talking reveals.", tag: "Think aloud" },
  { text: "Read a paragraph you admire aloud, then say it again in your own words from memory.", tag: "Shadowing" },
];

export type StudioTip = {
  title: string;
  detail: string;
};

/** How to actually improve from recording yourself. */
export const STUDIO_TIPS: StudioTip[] = [
  {
    title: "Listen back once, for one thing.",
    detail:
      "Don't critique everything. Pick a single dimension \u2014 pace, filler, a finished ending \u2014 and listen only for that. One fix per recording compounds fast.",
  },
  {
    title: "The cringe is the growth.",
    detail:
      "Your recorded voice sounds wrong because you usually hear it through your own skull. That discomfort is just accuracy. Push through it and you start hearing what others hear.",
  },
  {
    title: "Shadow a voice you love.",
    detail:
      "Find thirty seconds of a speaker you admire and copy them out loud \u2014 their rhythm, pauses, melody. Imitation is how the ear teaches the mouth.",
  },
  {
    title: "Read aloud daily.",
    detail:
      "Five minutes of reading good prose aloud trains articulation, breath, and phrasing more than any tip. Your eyes meet better sentences than you'd improvise.",
  },
];
