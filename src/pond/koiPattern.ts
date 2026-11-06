export type KoiVariety = "kohaku" | "orange" | "gold" | "hiOrange";

export type Patch = {
  spinePosition: number;
  side: number;
  lengthRadius: number;
  widthRadius: number;
  wobble: number[];
  glow: boolean;
};

export type Streak = { side: number; from: number; to: number; light: boolean };

export type KoiPattern = {
  variety: KoiVariety;
  colouredBody: boolean;
  patches: Patch[];
  streaks: Streak[];
};

type VarietyRecipe = { patchCount: number; size: number; colouredBody: boolean };

const RECIPES: Record<KoiVariety, VarietyRecipe> = {
  kohaku: { patchCount: 5, size: 1, colouredBody: false },
  orange: { patchCount: 5, size: 1.25, colouredBody: false },
  gold: { patchCount: 4, size: 1.35, colouredBody: false },
  hiOrange: { patchCount: 4, size: 0.9, colouredBody: true },
};

const WOBBLE_POINTS = 11;
const PATCHED_LENGTH = 13.5;

function seededRandom(seed: number) {
  let state = Math.floor(seed * 2654435761) >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let mixed = Math.imul(state ^ (state >>> 15), 1 | state);
    mixed ^= mixed + Math.imul(mixed ^ (mixed >>> 7), 61 | mixed);
    return ((mixed ^ (mixed >>> 14)) >>> 0) / 4294967296;
  };
}

function makePatch(random: () => number, index: number, recipe: VarietyRecipe): Patch {
  const band = PATCHED_LENGTH / recipe.patchCount;
  return {
    spinePosition: 0.4 + band * index + random() * band * 0.6,
    side: (random() - 0.5) * 1.1,
    lengthRadius: (1.1 + random() * 1.2) * recipe.size,
    widthRadius: (0.55 + random() * 0.5) * recipe.size,
    wobble: Array.from({ length: WOBBLE_POINTS }, () => 0.72 + random() * 0.5),
    glow: random() > 0.45,
  };
}

function makeStreak(random: () => number): Streak {
  const from = 1 + random() * 5;
  return { side: (random() - 0.5) * 1.3, from, to: from + 2 + random() * 5, light: random() > 0.35 };
}

export function patternFor(variety: KoiVariety, seed: number): KoiPattern {
  const random = seededRandom(seed + 1);
  const recipe = RECIPES[variety];
  return {
    variety,
    colouredBody: recipe.colouredBody,
    patches: Array.from({ length: recipe.patchCount }, (_, index) => makePatch(random, index, recipe)),
    streaks: Array.from({ length: 9 }, () => makeStreak(random)),
  };
}
