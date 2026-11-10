import type { Point } from "./pondState";
import { patternFor, type KoiPattern, type KoiVariety } from "./koiPattern";

export const BODY_POINTS = 16;
const TAIL_POINTS = 5;
const SEGMENT_COUNT = BODY_POINTS + TAIL_POINTS;
const SEGMENT_LENGTH = 10;
const TOTAL_LENGTH = SEGMENT_COUNT * SEGMENT_LENGTH;
const MAX_HALF_WIDTH = TOTAL_LENGTH * 0.11;

const WIDTH_PROFILE: [t: number, share: number][] = [
  [0, 0.5],
  [0.08, 0.78],
  [0.2, 0.96],
  [0.32, 1],
  [0.5, 0.86],
  [0.7, 0.56],
  [0.88, 0.3],
  [1, 0.24],
];

const STIFF_FRONT_BEND = 0.035;
const FLEXIBLE_TAIL_BEND = 0.2;
const TIGHTEST_TURN_IN_BODY_LENGTHS = 0.75;
const TAIL_AMPLITUDE_IN_BODY_LENGTHS = 0.095;
const WAVES_PER_BODY = 1.15;
// How far (radians) a cruising koi swings either side of its course, and how often, for a lazy S-shaped path.
const WEAVE_SWING = 0.55;
const WEAVE_PER_SECOND = 0.16;

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

function interpolateProfile(t: number) {
  for (let index = 1; index < WIDTH_PROFILE.length; index++) {
    const [endT, endShare] = WIDTH_PROFILE[index];
    if (t > endT) continue;
    const [startT, startShare] = WIDTH_PROFILE[index - 1];
    const blend = (t - startT) / (endT - startT);
    const eased = blend * blend * (3 - 2 * blend);
    return startShare + (endShare - startShare) * eased;
  }
  return WIDTH_PROFILE[WIDTH_PROFILE.length - 1][1];
}

function bodyHalfWidth(index: number) {
  if (index >= BODY_POINTS) return 0;
  return MAX_HALF_WIDTH * interpolateProfile(index / (BODY_POINTS - 1));
}

function allowedBend(index: number) {
  const t = index / SEGMENT_COUNT;
  const flexibility = Math.max(0, (t - 0.35) / 0.65);
  return STIFF_FRONT_BEND + (FLEXIBLE_TAIL_BEND - STIFF_FRONT_BEND) * flexibility * flexibility;
}

function amplitudeEnvelope(index: number) {
  const t = index / SEGMENT_COUNT;
  return 0.05 - 0.1 * t + 1.05 * t * t;
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
  private beatClock: number;
  private weaveClock: number;
  private readonly pattern: KoiPattern;
  readonly sizeFactor: number;
  scale: number;

  constructor(start: Point, viewportScale: number, variety: KoiVariety, seed: number, sizeFactor = 1) {
    this.sizeFactor = sizeFactor;
    this.scale = viewportScale * sizeFactor;
    this.pattern = patternFor(variety, seed);
    this.heading = seed * 2.4;
    this.phase = seed * 1.7;
    this.beatClock = seed * 3.1;
    this.weaveClock = seed * 5.3;
    this.spine = Array.from({ length: SEGMENT_COUNT }, (_, index) => ({
      x: start.x - Math.cos(this.heading) * index * SEGMENT_LENGTH * this.scale,
      y: start.y - Math.sin(this.heading) * index * SEGMENT_LENGTH * this.scale,
    }));
  }

  get head(): Point {
    return this.spine[0];
  }

  get bodyLength() {
    return TOTAL_LENGTH * this.scale;
  }

  resize(viewportScale: number) {
    this.scale = viewportScale * this.sizeFactor;
  }

  private maxTurnRate() {
    const tightestRadius = this.bodyLength * TIGHTEST_TURN_IN_BODY_LENGTHS;
    return Math.min(1.4, Math.max(0.4, this.speed / tightestRadius));
  }

  swimToward(target: Point, desiredSpeed: number, deltaSeconds: number, weave = 0) {
    this.weaveClock += deltaSeconds;
    const swing = Math.sin(this.weaveClock * WEAVE_PER_SECOND * Math.PI * 2) * WEAVE_SWING * weave;
    const desiredHeading = Math.atan2(target.y - this.head.y, target.x - this.head.x) + swing;
    const turn = wrapAngle(desiredHeading - this.heading);
    const turnLimit = this.maxTurnRate() * deltaSeconds;
    this.heading += Math.max(-turnLimit, Math.min(turnLimit, turn));

    const sharpness = Math.min(1, Math.abs(turn) / Math.PI);
    const cruisingSpeed = desiredSpeed * (1 - 0.45 * sharpness);
    this.speed += (cruisingSpeed - this.speed) * Math.min(1, deltaSeconds * 0.7);
    this.head.x += Math.cos(this.heading) * this.speed * deltaSeconds;
    this.head.y += Math.sin(this.heading) * this.speed * deltaSeconds;

    const tailBeatsPerSecond = 0.55 + (this.speed / this.bodyLength) * 1.2;
    this.phase += deltaSeconds * tailBeatsPerSecond * Math.PI * 2;
    this.beatClock += deltaSeconds;
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
    let backward = Math.atan2(-Math.sin(this.heading), -Math.cos(this.heading));
    for (let index = 1; index < this.spine.length; index++) {
      const leader = this.spine[index - 1];
      const follower = this.spine[index];
      const trailing = Math.atan2(follower.y - leader.y, follower.x - leader.x);
      const bend = Math.max(-allowedBend(index), Math.min(allowedBend(index), wrapAngle(trailing - backward)));
      backward += bend;
      follower.x = leader.x + Math.cos(backward) * segment;
      follower.y = leader.y + Math.sin(backward) * segment;
    }
  }

  private undulationAmplitude() {
    const swimming = Math.min(1, this.speed / (this.bodyLength * 0.6));
    const beatOrGlide = 0.55 + 0.45 * Math.max(0, Math.sin(this.beatClock * 0.7));
    const strength = 0.35 + 0.65 * Math.max(swimming, beatOrGlide * (1 - swimming));
    return this.bodyLength * TAIL_AMPLITUDE_IN_BODY_LENGTHS * strength;
  }

  pose(viewOffsetY: number): KoiPose {
    const amplitude = this.undulationAmplitude();
    const wavePerPoint = (Math.PI * 2 * WAVES_PER_BODY) / SEGMENT_COUNT;
    const rawNormals = normalsAlong(this.spine);
    const spine = this.spine.map((point, index) => {
      const sway = Math.sin(this.phase - index * wavePerPoint) * amplitude * amplitudeEnvelope(index);
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
