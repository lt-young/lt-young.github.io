import type { Point } from "./pondState";

const SEGMENT_COUNT = 14;
const SEGMENT_LENGTH = 9;
const MAX_HALF_WIDTH = 15;

export type KoiPose = {
  spine: Point[];
  normals: Point[];
  halfWidths: number[];
  phase: number;
  scale: number;
  speed: number;
};

function wrapAngle(angle: number) {
  return Math.atan2(Math.sin(angle), Math.cos(angle));
}

function bodyHalfWidth(t: number) {
  const roundedNoseT = 0.05 + t * 0.95;
  return MAX_HALF_WIDTH * Math.sin(Math.PI * Math.pow(roundedNoseT, 0.6)) * (1 - 0.6 * roundedNoseT);
}

function normalBetween(from: Point, to: Point): Point {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const length = Math.hypot(dx, dy) || 1;
  return { x: -dy / length, y: dx / length };
}

export class Koi {
  private spine: Point[];
  private heading = 0;
  private speed = 0;
  private phase = 0;
  scale: number;

  constructor(start: Point, scale: number) {
    this.scale = scale;
    this.spine = Array.from({ length: SEGMENT_COUNT }, (_, index) => ({
      x: start.x - index * SEGMENT_LENGTH * scale,
      y: start.y,
    }));
  }

  get head(): Point {
    return this.spine[0];
  }

  swimToward(target: Point, desiredSpeed: number, deltaSeconds: number) {
    const desiredHeading = Math.atan2(target.y - this.head.y, target.x - this.head.x);
    const turnRate = 1.6 + this.speed / (60 * this.scale);
    const turn = wrapAngle(desiredHeading - this.heading);
    this.heading += Math.max(-turnRate * deltaSeconds, Math.min(turnRate * deltaSeconds, turn));

    this.speed += (desiredSpeed - this.speed) * Math.min(1, deltaSeconds * 1.8);
    this.head.x += Math.cos(this.heading) * this.speed * deltaSeconds;
    this.head.y += Math.sin(this.heading) * this.speed * deltaSeconds;
    this.phase += deltaSeconds * (2.2 + this.speed / (18 * this.scale));
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
    const undulation = 5 * this.scale * (0.35 + Math.min(1, this.speed / (70 * this.scale)));
    const rawNormals = this.spine.map((point, index) =>
      index === 0 ? normalBetween(this.spine[1], point) : normalBetween(point, this.spine[index - 1]),
    );
    const spine = this.spine.map((point, index) => {
      const sway = Math.sin(this.phase - index * 0.55) * undulation * Math.pow(index / SEGMENT_COUNT, 1.6);
      return { x: point.x + rawNormals[index].x * sway, y: point.y + rawNormals[index].y * sway - viewOffsetY };
    });
    const normals = spine.map((point, index) =>
      index === 0 ? normalBetween(spine[1], point) : normalBetween(point, spine[index - 1]),
    );
    const halfWidths = spine.map((_, index) => bodyHalfWidth(index / (SEGMENT_COUNT - 1)) * this.scale);
    return { spine, normals, halfWidths, phase: this.phase, scale: this.scale, speed: this.speed };
  }
}
