import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  ORBS,
  SUN,
  VISIT_DEDUPE_MS,
  bumpVisit,
  computeOrbs,
  computeRadii,
  constellationLines,
  layoutOrbs,
  localISODate,
  orbIdForLocation,
  orbitThrough,
  overlapCount,
  skyWords,
  type OrbContext,
  type OrbId,
} from "../lib/orbs";
import type { LexiconWord, WordSource } from "../lib/types";

const DAY = 86_400_000;
/** 26 Oct 2026, local time, at the given hour. */
const at = (hour: number) => new Date(2026, 9, 26, hour).getTime();

function word(w: string, source: WordSource, daysAgo: number, now: number): LexiconWord {
  return {
    word: w,
    pronunciation: "",
    part_of_speech: "noun",
    definition: "",
    example: "",
    origin: "",
    rating: 8,
    added: localISODate(now - daysAgo * DAY),
    source,
  };
}

function ctx(now: number, partial: Partial<OrbContext> = {}): OrbContext {
  return {
    now,
    lexicon: { words: {}, metaphor_history: [], scribble_rewrites: [] },
    visits: {},
    gridWords: [],
    ...partial,
  };
}

const byId = (orbs: ReturnType<typeof computeOrbs>, id: OrbId) => orbs.find((o) => o.id === id)!;
const biggest = (orbs: ReturnType<typeof computeOrbs>) =>
  orbs.reduce((a, b) => (b.weight > a.weight ? b : a)).id;

describe("bumpVisit", () => {
  it("counts reloads inside the dedupe window once", () => {
    const now = at(9);
    const once = bumpVisit({}, "dive", now);
    assert.equal(bumpVisit(once, "dive", now + VISIT_DEDUPE_MS - 1), once);
    const twice = bumpVisit(once, "dive", now + VISIT_DEDUPE_MS).dive!.score;
    assert.ok(Math.abs(twice - 2) < 0.01);
  });

  it("decays the old score before adding a new visit", () => {
    const now = at(9);
    const old = { dive: { score: 4, at: now - 14 * DAY } };
    assert.equal(bumpVisit(old, "dive", now).dive?.score, 3);
  });
});

describe("computeOrbs", () => {
  it("points a brand-new Lexy at Deep Dive, and at Scribble in the morning", () => {
    const orbs = computeOrbs(ctx(at(8)));
    assert.equal(biggest(orbs), "scribble");
    assert.equal(byId(orbs, "dive").line, "Start here — words picked for you");
    assert.equal(byId(orbs, "lexicon").line, "Empty — for now");
    assert.ok(orbs.every((o) => !o.fresh));
  });

  it("grows the orb you actually use", () => {
    const now = at(15);
    const words = Object.fromEntries(
      Array.from({ length: 12 }, (_, i) => [`w${i}`, word(`w${i}`, "deep_dive", i % 4, now)])
    );
    const orbs = computeOrbs(ctx(now, { lexicon: { words, metaphor_history: [], scribble_rewrites: [] } }));
    assert.equal(biggest(orbs), "dive");
    assert.equal(byId(orbs, "dive").line, "Where you spend the most time");
    assert.equal(byId(orbs, "lexicon").line, "12 words kept");
    assert.equal(byId(orbs, "articulate").fresh, true);
  });

  it("lets old habits fade behind recent ones", () => {
    const now = at(15);
    const visits = {
      metaphors: { score: 20, at: now - 120 * DAY },
      feeling: { score: 3, at: now - DAY },
    };
    const orbs = computeOrbs(ctx(now, { visits }));
    assert.ok(byId(orbs, "feeling").weight > byId(orbs, "metaphors").weight);
  });

  it("quiets Scribble once today's page is written", () => {
    const now = at(8);
    const lexicon = {
      words: {},
      metaphor_history: [],
      scribble_rewrites: [
        { id: "a", saved_at: new Date(at(7)).toISOString(), source_excerpt: "", upgraded_version: "" },
      ],
    };
    const scribble = byId(computeOrbs(ctx(now, { lexicon })), "scribble");
    assert.equal(scribble.line, "Today's page is written");
  });
});

describe("layoutOrbs", () => {
  const fields: [number, number][] = [
    [375, 640],
    [390, 520],
    [768, 860],
    [1440, 760],
    [1920, 900],
  ];
  const weightSets = [
    ORBS.map(() => 1),
    [3.4, 1, 0.8, 1.2, 1.1, 0.9, 2.2, 1.6],
    [1, 1, 1, 1, 1, 1, 1, 3.6],
  ];

  for (const [w, h] of fields) {
    for (const weights of weightSets) {
      it(`fits ${weights.join("/")} into ${w}×${h} without overlaps`, () => {
        const { positions, radii } = layoutOrbs(computeRadii(weights, w, h), w, h);
        assert.equal(overlapCount(positions, radii), 0);
        positions.forEach((p, i) => {
          assert.ok(p.x - radii[i] >= -0.5 && p.x + radii[i] <= w + 0.5, "inside horizontally");
          assert.ok(p.y - radii[i] >= -0.5 && p.y + radii[i] <= h + 0.5, "inside vertically");
        });
      });
    }
  }

  it("keeps each orb in the same part of the sky when sizes change", () => {
    const [w, h] = [1280, 700];
    const even = layoutOrbs(computeRadii(ORBS.map(() => 1), w, h), w, h).positions;
    const skewed = layoutOrbs(computeRadii([3.4, 1, 0.8, 1.2, 1.1, 0.9, 2.2, 1.6], w, h), w, h).positions;
    const angle = (p: { x: number; y: number }) => Math.atan2(p.y - h / 2, p.x - w / 2);
    even.forEach((p, i) => {
      const d = Math.abs(angle(p) - angle(skewed[i]));
      assert.ok(Math.min(d, 2 * Math.PI - d) < Math.PI / 2, `${ORBS[i].id} wandered`);
    });
  });

  it("keeps bigger weights bigger", () => {
    const r = computeRadii([3, 1, 1, 1, 1, 1], 1200, 800);
    assert.ok(r[0] > r[1]);
  });
});

describe("the chart", () => {
  const fields: [number, number][] = [
    [375, 560],
    [390, 640],
    [768, 860],
    [1440, 700],
  ];
  const sunAt = ORBS.findIndex((o) => o.id === SUN);

  for (const [w, h] of fields) {
    it(`keeps the sun at the centre of ${w}×${h}, with the planets around it`, () => {
      const weights = ORBS.map((o, i) => (o.id === SUN ? 1.3 : [3.4, 1, 0.8, 1.2, 1.1, 0.9, 2.2, 1.6][i]));
      const { positions, radii } = layoutOrbs(computeRadii(weights, w, h, true), w, h, [], sunAt);
      assert.equal(overlapCount(positions, radii), 0);
      assert.ok(Math.abs(positions[sunAt].x - w / 2) < 0.5 && Math.abs(positions[sunAt].y - h / 2) < 0.5);
      positions.forEach((p, i) => {
        assert.ok(p.x - radii[i] >= -0.5 && p.x + radii[i] <= w + 0.5, `${ORBS[i].id} inside horizontally`);
        assert.ok(p.y - radii[i] >= -0.5 && p.y + radii[i] <= h + 0.5, `${ORBS[i].id} inside vertically`);
      });
    });
  }

  it("draws each orbit through its planet", () => {
    const sun = { x: 100, y: 100 };
    const planet = { x: 160, y: 180 };
    const { rx, ry } = orbitThrough(planet, sun, 1.25);
    const dx = (planet.x - sun.x) / rx;
    const dy = (planet.y - sun.y) / ry;
    assert.ok(Math.abs(dx * dx + dy * dy - 1) < 1e-9);
    assert.ok(Math.abs(ry / rx - 1.25) < 1e-9);
  });

  it("never turns a word rated 'not for me' into a star", () => {
    const now = at(9);
    const loved = word("affluence", "deep_dive", 1, now);
    const notForMe = { ...word("lightning", "deep_dive", 0, now), rating: 3.3 };
    const stars = skyWords({ affluence: loved, lightning: notForMe });
    assert.ok(stars.includes("affluence"));
    assert.ok(!stars.some((s) => s.toLowerCase() === "lightning"));
  });

  it("joins near stars into constellations, once each, and leaves far ones alone", () => {
    const stars = [
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      { x: 12, y: 8 },
      { x: 500, y: 500 },
    ];
    assert.deepEqual(constellationLines(stars, 50), [
      [0, 1],
      [1, 2],
    ]);
  });
});

describe("orbIdForLocation", () => {
  it("maps routes to orbs, with Name a feeling at #feeling", () => {
    assert.equal(orbIdForLocation("/dive"), "dive");
    assert.equal(orbIdForLocation("/articulate"), "articulate");
    assert.equal(orbIdForLocation("/articulate", "#feeling"), "feeling");
    assert.equal(orbIdForLocation("/sharpen"), "sharpen");
    assert.equal(orbIdForLocation("/phrases"), "phrases");
    assert.equal(orbIdForLocation("/settings"), null);
    assert.equal(orbIdForLocation("/"), null);
  });
});
