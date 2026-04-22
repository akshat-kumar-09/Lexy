export interface LexyGenre {
  id: string;
  title: string;
  tagline: string;
  /** Steers the model toward vocabulary registers and contexts */
  promptHint: string;
  /** Example lemmas for the marketing preview — not sent to the model */
  previewWords: string[];
}

export const LEXY_GENRES: LexyGenre[] = [
  {
    id: "nature",
    title: "Nature & weather",
    tagline: "Light, stone, tide, and sky",
    promptHint:
      "Terrain, weather, flora/fauna, seasons, geology — vivid words a hiker or gardener would love, not twee nature clichés.",
    previewWords: ["petrichor", "zephyr", "brume", "susurrus", "firmament"],
  },
  {
    id: "science",
    title: "Science & cosmos",
    tagline: "How the world is put together",
    promptHint:
      "Physics, space, biology, chemistry — precise, beautiful terms serious readers meet in essays and documentaries.",
    previewWords: ["apogee", "entropy", "synapse", "occultation", "cryosphere"],
  },
  {
    id: "art_design",
    title: "Art & design",
    tagline: "Line, color, and form",
    promptHint:
      "Studio and gallery language: composition, texture, schools, craft — words for people who see before they speak.",
    previewWords: ["chiaroscuro", "tessellation", "verdigris", "impasto", "motif"],
  },
  {
    id: "music",
    title: "Music & sound",
    tagline: "Rhythm, tone, and silence",
    promptHint:
      "Performance and listening: tempo, timbre, genres, acoustics — vocabulary for ears, not just eyes.",
    previewWords: ["cadenza", "timbre", "glissando", "refrain", "sonorous"],
  },
  {
    id: "food",
    title: "Food & kitchens",
    tagline: "Taste as culture",
    promptHint:
      "Cooking, ingredients, dining — sensual but precise; avoid gimmicky foodie slang unless it is real usage.",
    previewWords: ["umami", "mirepoix", "caramelize", "terroir", "unctuous"],
  },
  {
    id: "philosophy",
    title: "Mind & philosophy",
    tagline: "Ideas with names",
    promptHint:
      "Reason, ethics, consciousness, argument — terms that name distinctions, not jargon walls.",
    previewWords: ["epistemic", "liminal", "dialectic", "aporia", "qualia"],
  },
  {
    id: "myth",
    title: "Myth & folklore",
    tagline: "Old stories, new edges",
    promptHint:
      "Folklore, ritual, archetype, legend — words that feel like they were passed hand to hand.",
    previewWords: ["chthonic", "numinous", "fey", "oracle", "wyrd"],
  },
  {
    id: "tech",
    title: "Tech & systems",
    tagline: "The built and the digital",
    promptHint:
      "Engineering, networks, interfaces, infrastructure — sharp nouns and verbs from real tech writing.",
    previewWords: ["latency", "heuristic", "orthogonal", "abstraction", "sandbox"],
  },
  {
    id: "travel",
    title: "Places & movement",
    tagline: "Maps, cities, roads",
    promptHint:
      "Geography, transit, architecture of cities — words for people who read maps like poems.",
    previewWords: ["isthmus", "peregrinate", "meridian", "quay", "solstice"],
  },
  {
    id: "performance",
    title: "Stage & screen",
    tagline: "Drama in every sense",
    promptHint:
      "Theater, film, gesture, narrative craft — vocabulary from scripts, reviews, and the green room.",
    previewWords: ["denouement", "tableau", "subtext", "proscenium", "catharsis"],
  },
  {
    id: "craft",
    title: "Fashion & making",
    tagline: "Cut, cloth, and care",
    promptHint:
      "Tailoring, textiles, tools, repair — tactile words for makers and collectors.",
    previewWords: ["selvedge", "patina", "gusset", "warp", "weft"],
  },
  {
    id: "body_motion",
    title: "Body & motion",
    tagline: "Strength, breath, gesture",
    promptHint:
      "Anatomy, dance, sport, somatics — kinetic, embodied language.",
    previewWords: ["kinesthetic", "proprioception", "cadence", "sinew", "torsion"],
  },
];

const byId = new Map(LEXY_GENRES.map((g) => [g.id, g]));

export function getLexyGenre(id: string): LexyGenre | undefined {
  return byId.get(id);
}

/** Text block appended to model prompts when genres are selected */
export function genreContextForPrompt(selectedIds: string[]): string {
  const picked = selectedIds.map((id) => byId.get(id)).filter(Boolean) as LexyGenre[];
  if (!picked.length) return "";
  const lines = picked.map((g) => `• ${g.title}: ${g.promptHint}`);
  return `Interest lenses (bias new vocabulary toward these worlds — still harmonize with their lexicon ratings):\n${lines.join("\n")}\n`;
}
