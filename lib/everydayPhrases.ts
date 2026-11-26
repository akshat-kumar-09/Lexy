import { RUNGS, swapInto, type PhraseLadderResult, type RungId } from "@/lib/phraseLadder";

/**
 * The phrases everyone reaches for, each with a hand-made ladder from a subtle swap to a
 * Shakespearean flourish. Written once, ready instantly and free to open, signed in or not.
 * Every substitute is written to drop straight into its example line.
 */

export const PHRASE_GROUPS = ["Habits", "Reactions", "Everyday", "At work", "Life"] as const;
export type PhraseGroup = (typeof PHRASE_GROUPS)[number];

/** [substitute, the shade it carries] */
type Pick = readonly [string, string];

export interface EverydayPhrase {
  phrase: string;
  group: PhraseGroup;
  /** A line that uses it — every substitute below fits here. */
  example: string;
  ladder: Record<RungId, readonly Pick[]>;
}

export const EVERYDAY_PHRASES: readonly EverydayPhrase[] = [
  // ── Habits: the verbal tics that pad a sentence ──
  {
    phrase: "to be honest",
    group: "Habits",
    example: "To be honest, I didn't love the ending.",
    ladder: {
      subtle: [["honestly", "the same candour in half the words"], ["truthfully", "a touch more weight behind it"]],
      polished: [["frankly", "blunt, and owns it"], ["candidly", "open, without the edge"]],
      literary: [["in all candour", "formal, almost confessional"], ["plainly put", "promises no varnish"]],
      shakespearean: [["in faith", "an Elizabethan pledge of sincerity"], ["by my troth", "swearing on your own good faith"]],
    },
  },
  {
    phrase: "literally",
    group: "Habits",
    example: "I was literally dying of embarrassment.",
    ladder: {
      subtle: [["all but", "admits it's nearly — and lands harder"], ["genuinely", "keeps the stress, drops the false claim"]],
      polished: [["positively", "emphatic without pretending"], ["well and truly", "thorough, a little rueful"]],
      literary: [["quite", "Austen's understatement — says more with less"], ["veritably", "vouches it's near enough true"]],
      shakespearean: [["in very truth", "an oath-like insistence"], ["verily", "solemn certainty, played for effect"]],
    },
  },
  {
    phrase: "basically",
    group: "Habits",
    example: "Basically, we ran out of time.",
    ladder: {
      subtle: [["in short", "gets to it without the shrug"], ["simply put", "promises clarity, then delivers"]],
      polished: [["in essence", "names the core with confidence"], ["at bottom", "what lies beneath everything else"]],
      literary: [["in sum", "a closing verdict"], ["when all's said", "a weary, wise summing-up"]],
      shakespearean: [
        ["in fine", "Elizabethan for “in conclusion”"],
        ["the short and the long of it is", "a merry Elizabethan way to cut to it"],
      ],
    },
  },
  {
    phrase: "kind of",
    group: "Habits",
    example: "It was kind of disappointing.",
    ladder: {
      subtle: [["a little", "a hedge that admits its size"], ["somewhat", "measured, not mumbled"]],
      polished: [["mildly", "gentle, and exact about degree"], ["faintly", "only a trace of it"]],
      literary: [["rather", "understatement with a raised eyebrow"], ["quietly", "a let-down that doesn't announce itself"]],
      shakespearean: [["something", "Elizabethan for “somewhat”"], ["in some sort", "a courtly “after a fashion”"]],
    },
  },

  // ── Reactions: what we say back ──
  {
    phrase: "no worries",
    group: "Reactions",
    example: "No worries, it happens.",
    ladder: {
      subtle: [["no harm done", "forgives and moves on"], ["all good", "easy and current"]],
      polished: [["think nothing of it", "gracious, a little old-school"], ["not at all", "brisk, warm courtesy"]],
      literary: [["no matter", "lightly waves away the fuss"], ["it's of no consequence", "cool, unruffled, faintly grand"]],
      shakespearean: [["let it pass", "lets the moment go by"], ["'tis nothing", "brushes it off with a flourish"]],
    },
  },
  {
    phrase: "so funny",
    group: "Reactions",
    example: "That video was so funny.",
    ladder: {
      subtle: [["priceless", "too good to put a value on"], ["a riot", "loud, shared laughter"]],
      polished: [["uproarious", "helpless, roaring laughter"], ["side-splitting", "funny enough to hurt"]],
      literary: [["droll", "dry and clever rather than loud"], ["deliciously absurd", "relishes the nonsense"]],
      shakespearean: [["most excellent fooling", "a jester's highest praise"], ["a merry jest", "lightness, with a bow"]],
    },
  },
  {
    phrase: "that makes sense",
    group: "Reactions",
    example: "Yeah, that makes sense.",
    ladder: {
      subtle: [["that adds up", "the pieces fit"], ["fair enough", "accepts it, with a nod of respect"]],
      polished: [["that stands to reason", "logic you can't argue with"], ["I follow you", "understood, step by step"]],
      literary: [["that rings true", "felt as well as understood"], ["point taken", "concedes gracefully"]],
      shakespearean: [["'tis well reasoned", "praises the argument itself"], ["thou speak'st true", "grants the truth, with ceremony"]],
    },
  },
  {
    phrase: "exhausted",
    group: "Reactions",
    example: "I'm exhausted after today.",
    ladder: {
      subtle: [["drained", "emptied of energy, and of mood"], ["spent", "used up — nothing left to give"]],
      polished: [["depleted", "reserves run low"], ["running on empty", "still going, barely"]],
      literary: [["bone-weary", "tired down to the skeleton"], ["threadbare", "worn thin, like old cloth"]],
      shakespearean: [["aweary", "Macbeth's word for being tired of it all"], ["o'erspent", "worn out past all measure"]],
    },
  },

  // ── Everyday idioms ──
  {
    phrase: "a piece of cake",
    group: "Everyday",
    example: "The exam was a piece of cake.",
    ladder: {
      subtle: [["a breeze", "light, quick, no effort"], ["plain sailing", "smooth from start to finish"]],
      polished: [["child's play", "so easy it's almost beneath you"], ["effortless", "ease, stated with confidence"]],
      literary: [["the work of a moment", "done before you noticed"], ["a trifle", "too slight to trouble you"]],
      shakespearean: [["as easy as lying", "Hamlet's wry measure of ease"], ["but a toy", "Elizabethan for a mere trifle"]],
    },
  },
  {
    phrase: "once in a blue moon",
    group: "Everyday",
    example: "I eat out once in a blue moon.",
    ladder: {
      subtle: [["rarely", "plain and honest"], ["once in a while", "a little more often"]],
      polished: [["on rare occasions", "measured, a touch formal"], ["only now and then", "occasional, without fuss"]],
      literary: [["on high days and holidays", "only when there's something to mark"], ["at long intervals", "time stretching between each"]],
      shakespearean: [["but seldom", "old word order — the rarity saved for last"], ["once in an age", "an age between each"]],
    },
  },
  {
    phrase: "cost an arm and a leg",
    group: "Everyday",
    example: "That jacket cost an arm and a leg.",
    ladder: {
      subtle: [["cost a fortune", "the plain wince"], ["cost a packet", "British, cheerful about the damage"]],
      polished: [["was eye-wateringly expensive", "vivid, but composed"], ["cost a small fortune", "rueful understatement"]],
      literary: [["cost a king's ransom", "storybook extravagance"], ["nearly ruined me", "wry and self-mocking"]],
      shakespearean: [["cost me dear", "the old weight of a high price"], ["was dearly bought", "paid for, and felt"]],
    },
  },
  {
    phrase: "time flies",
    group: "Everyday",
    example: "Time flies when we're together.",
    ladder: {
      subtle: [["the hours slip by", "unnoticed, gently"], ["time races", "quick and a little breathless"]],
      polished: [["the hours vanish", "gone before you count them"], ["time runs away with us", "carried off, happily"]],
      literary: [["time dissolves", "the clock stops mattering"], ["the hours fall away", "shed without a sound"]],
      shakespearean: [["time doth gallop", "Rosalind's Time, at full tilt"], ["the minutes hasten", "from Sonnet 60 — time rushing on"]],
    },
  },
  {
    phrase: "break the ice",
    group: "Everyday",
    example: "A joke helped break the ice.",
    ladder: {
      subtle: [["loosen things up", "relaxes the room"], ["get things going", "starts the talk moving"]],
      polished: [["put everyone at ease", "kind, and exact about the effect"], ["ease the tension", "names what was in the air"]],
      literary: [["thaw the room", "warmth spreading slowly"], ["melt the reserve", "the shyness, not just the silence"]],
      shakespearean: [["unknit our brows", "from The Taming of the Shrew — frowns undone"], ["make all merry", "festive, a little roguish"]],
    },
  },

  // ── At work: the meeting-room stock phrases ──
  {
    phrase: "touch base",
    group: "At work",
    example: "Let's touch base next week.",
    ladder: {
      subtle: [["catch up", "friendly, no agenda"], ["check in", "brief and practical"]],
      polished: [["reconvene", "picks up where you left off"], ["compare notes", "two views, side by side"]],
      literary: [["pick up the thread", "continues the story"], ["confer", "considered, a little grave"]],
      shakespearean: [["parley", "a talk between two camps"], ["hold converse", "stately, unhurried talk"]],
    },
  },
  {
    phrase: "on the same page",
    group: "At work",
    example: "I want to make sure we're on the same page.",
    ladder: {
      subtle: [["agreed", "simple, settled"], ["in step", "moving together"]],
      polished: [["in accord", "formal agreement"], ["of one mind", "thinking alike, not just agreeing"]],
      literary: [["pulling in the same direction", "shared effort, not just a shared view"], ["in harmony", "agreement that feels easy"]],
      shakespearean: [["in one consent", "Henry V's kingdom, working as one"], ["of one heart", "agreement felt, not just reached"]],
    },
  },
  {
    phrase: "think outside the box",
    group: "At work",
    example: "We need to think outside the box.",
    ladder: {
      subtle: [["think differently", "plain and direct"], ["get creative", "loose and playful"]],
      polished: [["think laterally", "sideways into new answers"], ["rethink this from scratch", "starting over, on purpose"]],
      literary: [["leave the well-worn path", "away from the obvious routes"], ["imagine past the usual", "stretching the mind's edges"]],
      shakespearean: [
        ["dream beyond our philosophy", "Hamlet's “more things in heaven and earth”"],
        ["be bold in our devising", "daring invention, with a flourish"],
      ],
    },
  },
  {
    phrase: "low-hanging fruit",
    group: "At work",
    example: "Let's start with the low-hanging fruit.",
    ladder: {
      subtle: [["easy wins", "quick, unglamorous progress"], ["simple fixes", "practical and modest"]],
      polished: [["obvious gains", "plain sense, plainly said"], ["readiest opportunities", "what's ripe for the taking"]],
      literary: [["windfalls", "fruit that falls without picking"], ["nearest harvest", "what's ready to gather now"]],
      shakespearean: [["ripest fruit", "Richard II: the ripest fruit first falls"], ["fruit nearest the hand", "within reach, in old cadence"]],
    },
  },
  {
    phrase: "a game changer",
    group: "At work",
    example: "This new tool is a game changer.",
    ladder: {
      subtle: [["a breakthrough", "a real step forward"], ["a revelation", "opens your eyes to what's possible"]],
      polished: [["transformative", "changes the whole shape of things"], ["a turning point", "a clear before and after"]],
      literary: [["a watershed", "after it, everything flows differently"], ["a quiet revolution", "deep change without fanfare"]],
      shakespearean: [["a sea-change", "Ariel's song in The Tempest — utterly transformed"], ["a brave new world", "Miranda's wonder, now half-ironic"]],
    },
  },
  {
    phrase: "going forward",
    group: "At work",
    example: "Going forward, we'll meet on Mondays.",
    ladder: {
      subtle: [["from now on", "clear and everyday"], ["from here on", "a fresh start, lightly"]],
      polished: [["in future", "crisp, a touch British"], ["from this point", "marks the line"]],
      literary: [["henceforth", "formal, almost a decree"], ["from here onward", "steady and forward-facing"]],
      shakespearean: [["from this day forth", "ceremonial, like a coronation"], ["hereafter", "Macbeth's word for all that's to come"]],
    },
  },

  // ── Life: the shrugs and summings-up ──
  {
    phrase: "it is what it is",
    group: "Life",
    example: "We lost, but it is what it is.",
    ladder: {
      subtle: [["that's how it goes", "a shrug with some grace"], ["so be it", "acceptance, firmly"]],
      polished: [["such is life", "philosophical, unbothered"], ["there's no changing it", "plain about the limits"]],
      literary: [["so it goes", "Vonnegut's refrain for what can't be helped"], ["c'est la vie", "a Gallic shrug"]],
      shakespearean: [["what's done is done", "Lady Macbeth, steadying herself"], ["'tis as it must be", "fate, accepted with dignity"]],
    },
  },
  {
    phrase: "at the end of the day",
    group: "Life",
    example: "At the end of the day, family comes first.",
    ladder: {
      subtle: [["in the end", "the same idea in half the words"], ["when it comes down to it", "gets to the root"]],
      polished: [["ultimately", "the final weighing"], ["all things considered", "having weighed everything"]],
      literary: [["when all is said and done", "after every argument"], ["in the final reckoning", "a verdict, settled"]],
      shakespearean: [
        ["when the hurly-burly's done", "the witches in Macbeth — once the tumult ends"],
        ["when all is weighed", "measured out on the scales"],
      ],
    },
  },
  {
    phrase: "easier said than done",
    group: "Life",
    example: "Getting up at five is easier said than done.",
    ladder: {
      subtle: [["harder than it sounds", "honest about the gap"], ["not as easy as it looks", "a gentle warning"]],
      polished: [["a tall order", "demanding, said with respect"], ["simpler in theory than in practice", "the gap, named precisely"]],
      literary: [["a fine idea on paper", "wry about plans"], ["a counsel of perfection", "advice too ideal to follow"]],
      shakespearean: [["easier taught than followed", "Portia's confession in The Merchant of Venice"], ["a labour of Hercules", "mythic effort, mock-heroic"]],
    },
  },
  {
    phrase: "a blessing in disguise",
    group: "Life",
    example: "Losing that job was a blessing in disguise.",
    ladder: {
      subtle: [["for the best", "plain, settled hindsight"], ["a hidden gift", "good, wrapped in bad"]],
      polished: [["a fortunate turn", "luck you can see now"], ["a gift in hindsight", "only clear looking back"]],
      literary: [["a mercy, in the end", "kindness that arrived late"], ["a door that looked like a wall", "the way out, disguised"]],
      shakespearean: [["sweet adversity", "As You Like It — hardship that teaches"], ["a jewel in the toad's head", "treasure inside the ugly thing"]],
    },
  },
  {
    phrase: "back to square one",
    group: "Life",
    example: "The plan failed, so we're back to square one.",
    ladder: {
      subtle: [["back to the start", "a plain restart"], ["starting over", "practical, unbowed"]],
      polished: [["starting afresh", "a clean slate, chosen"], ["back where we began", "the circle, noticed"]],
      literary: [["back at the threshold", "at the door again"], ["beginning again from the first stone", "rebuilding, patiently"]],
      shakespearean: [["come full circle", "King Lear: the wheel is come full circle"], ["to begin anew", "a fresh start, ceremonially"]],
    },
  },
  {
    phrase: "the ball is in your court",
    group: "Life",
    example: "I've made my offer — the ball is in your court.",
    ladder: {
      subtle: [["it's your call", "direct and friendly"], ["over to you", "a light handover"]],
      polished: [["the decision rests with you", "formal and respectful"], ["it's your move", "the game goes on"]],
      literary: [["the pen is in your hand", "the next line is yours to write"], ["the next step is yours", "patient and open"]],
      shakespearean: [["the choice is thine", "solemn, a little theatrical"], ["'tis thine to choose", "a suitor's moment before the caskets"]],
    },
  },
];

/** One everyday phrase as a ladder, each substitute shown in its example line. */
export function everydayLadder(p: EverydayPhrase): PhraseLadderResult {
  return {
    target: p.phrase,
    sense: "",
    rungs: RUNGS.map((r) => ({
      level: r.id,
      options: p.ladder[r.id].map(([text, note]) => ({ text, note, line: swapInto(p.example, p.phrase, text) })),
    })),
  };
}
