import type { Point } from "./pondState";
import { patternFor, type KoiPattern, type KoiVariety } from "./koiPattern";

export const BODY_POINTS = 14;
const TAIL_POINTS = 6;
const SEGMENT_COUNT = BODY_POINTS + TAIL_POINTS;
const SEGMENT_LENGTH = 10;
const MAX_HALF_WIDTH = 20;

export type KoiPose = {
  spine: Point[];
  normals: Point[];
  halfWidths: number[];
  phase: number;
  scale: number;
  speed: number;
  pattern: KoiPattern;
};

function wrapAngle(angle: number) {
  return Math.atan2(Math.sin(angle), Math.cos(angle));
}

function bodyHalfWidth(index: number) {
  if (index >= BODY_POINTS) return 0;
  const roundedNoseT = 0.05 + (index / (BODY_POINTS - 1)) * 0.95;
  return MAX_HALF_WIDTH * Math.sin(Math.PI * Math.pow(roundedNoseT, 0.6)) * (1 - 0.6 * roundedNoseT);
}

function normalBetween(from: Point, to: Point): Point {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const length = Math.hypot(dx, dy) || 1;
  return { x: -dy / length, y: dx / length };
}

function normalsAlong(points: Point[]) {
  return points.map((point, index) =>
    index === 0 ? normalBetween(points[1], point) : normalBetween(point, points[index - 1]),
  );
}

export class Koi {
  private spine: Point[];
  private heading: number;
  private speed = 0;
  private phase: number;
  private readonly pattern: KoiPattern;
  readonly sizeFactor: number;
  scale: number;

  constructor(start: Point, viewportScale: number, variety: KoiVariety, seed: number, sizeFactor = 1) {
    this.sizeFactor = sizeFactor;
    this.scale = viewportScale * sizeFactor;
    this.pattern = patternFor(variety, seed);
    this.heading = seed * 2.4;
    this.phase = seed * 1.7;
    this.spine = Array.from({ length: SEGMENT_COUNT }, (_, index) => ({
      x: start.x - Math.cos(this.heading) * index * SEGMENT_LENGTH * this.scale,
      y: start.y - Math.sin(this.heading) * index * SEGMENT_LENGTH * this.scale,
    }));
  }

  get head(): Point {
    return this.spine[0];
  }

  resize(viewportScale: number) {
    this.scale = viewportScale * this.sizeFactor;
  }

  swimToward(target: Point, desiredSpeed: number, deltaSeconds: number) {
    const desiredHeading = Math.atan2(target.y - this.head.y, target.x - this.head.x);
    const turnRate = 1.6 + this.speed / (60 * this.scale);
    const turn = wrapAngle(desiredHeading - this.heading);
    this.heading += Math.max(-turnRate * deltaSeconds, Math.min(turnRate * deltaSeconds, turn));

    this.speed += (desiredSpeed - this.speed) * Math.min(1, deltaSeconds * 1.8);
    this.head.x += Math.cos(this.heading) * this.speed * deltaSeconds;
    this.head.y += Math.sin(this.heading) * this.speed * deltaSeconds;
    this.phase += deltaSeconds * (2 + this.speed / (18 * this.scale));
    this.followHead();
  }

  shiftBy(offset: Point) {
    for (const point of this.spine) {
      point.x += offset.x;
      point.y += offset.y;
    }
  }

  private followHead() {
    const segment = SEGMENT_LENGTH * this.scale;
    for (let index = 1; index < this.spine.length; index++) {
      const leader = this.spine[index - 1];
      const follower = this.spine[index];
      const dx = follower.x - leader.x;
      const dy = follower.y - leader.y;
      const length = Math.hypot(dx, dy) || 1;
      follower.x = leader.x + (dx / length) * segment;
      follower.y = leader.y + (dy / length) * segment;
    }
  }

  pose(viewOffsetY: number): KoiPose {
    const undulation = 5 * this.scale * (0.4 + Math.min(1, this.speed / (70 * this.scale)));
    const rawNormals = normalsAlong(this.spine);
    const spine = this.spine.map((point, index) => {
      const reach = Math.pow(index / BODY_POINTS, 1.6);
      const sway = Math.sin(this.phase - index * 0.5) * undulation * reach;
      return { x: point.x + rawNormals[index].x * sway, y: point.y + rawNormals[index].y * sway - viewOffsetY };
    });
    return {
      spine,
      normals: normalsAlong(spine),
      halfWidths: spine.map((_, index) => bodyHalfWidth(index) * this.scale),
      phase: this.phase,
      scale: this.scale,
      speed: this.speed,
      pattern: this.pattern,
    };
  }
}
