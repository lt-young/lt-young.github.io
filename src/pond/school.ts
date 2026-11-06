import { dialFor, pointOnDial, secondHandAngle } from "./dial";
import { Koi } from "./koi";
import { pondKoiGoal, timekeeperGoal, type Surroundings } from "./koiBrain";
import type { KoiVariety } from "./koiPattern";
import { addRipple } from "./pondState";
import { isUnderwater, surfaceDocumentY } from "./water";

type PondKoiRecipe = { variety: KoiVariety; seed: number; size: number };

const POND_KOI: PondKoiRecipe[] = [
  { variety: "orange", seed: 2, size: 1.15 },
  { variety: "gold", seed: 3, size: 0.95 },
  { variety: "hiOrange", seed: 4, size: 1.05 },
  { variety: "kohaku", seed: 5, size: 0.85 },
];

export function koiScaleFor(width: number, height: number) {
  return Math.max(0.7, Math.min(1.3, Math.min(width, height) / 640));
}

export class School {
  readonly timekeeper: Koi;
  readonly pondKoi: Koi[];
  private underwater = new Map<Koi, boolean>();

  constructor(width: number, height: number) {
    const scale = koiScaleFor(width, height);
    const dial = dialFor(width, height);
    this.timekeeper = new Koi(pointOnDial(dial, secondHandAngle(Date.now())), scale, "kohaku", 1);
    const surface = surfaceDocumentY(height);
    this.pondKoi = POND_KOI.map(
      (recipe, index) =>
        new Koi(
          { x: width * (0.2 + index * 0.2), y: surface + height * (0.35 + (index % 2) * 0.25) },
          scale,
          recipe.variety,
          recipe.seed,
          recipe.size,
        ),
    );
  }

  get all() {
    return [this.timekeeper, ...this.pondKoi];
  }

  resize(width: number, height: number) {
    const scale = koiScaleFor(width, height);
    this.all.forEach((koi) => koi.resize(scale));
  }

  swim(world: Surroundings, deltaSeconds: number) {
    const keeperGoal = timekeeperGoal(world, this.timekeeper);
    this.timekeeper.swimToward(keeperGoal.target, keeperGoal.speed, deltaSeconds);
    this.pondKoi.forEach((koi, personality) => {
      this.keepNearView(koi, world);
      const goal = pondKoiGoal(world, koi, personality, this.pondKoi);
      koi.swimToward(goal.target, goal.speed, deltaSeconds);
    });
    this.all.forEach((koi) => this.splashWhenCrossingSurface(koi, world));
  }

  private keepNearView(koi: Koi, world: Surroundings) {
    const margin = world.viewportHeight * 1.5;
    const tooHigh = koi.head.y < world.scrollY - margin;
    const tooLow = koi.head.y > world.scrollY + world.viewportHeight + margin;
    if (!tooHigh && !tooLow) return;
    const entry = tooHigh ? world.scrollY - world.viewportHeight * 0.3 : world.scrollY + world.viewportHeight * 1.3;
    koi.shiftBy({ x: 0, y: Math.max(entry, surfaceDocumentY(world.viewportHeight) + 60) - koi.head.y });
  }

  private splashWhenCrossingSurface(koi: Koi, world: Surroundings) {
    const underwater = isUnderwater(koi.head.x, koi.head.y, world.viewportHeight, world.seconds);
    const before = this.underwater.get(koi);
    if (before !== undefined && before !== underwater) addRipple(koi.head, 1.4);
    this.underwater.set(koi, underwater);
  }
}
