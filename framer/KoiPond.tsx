// Koi pond: the animated pond, clock dial and koi behind Lauren Young's portfolio.
// Palette: soft paper and mint wash with ink-blue lines (from Lauren's Pinterest board).
// Ported from github.com/lt-young/lt-young.github.io (src/pond). Two instances share one
// simulation: "Water" (night sky, pond, koi, ripples, light on the water) sits behind the
// page so the koi swim under the artwork; "Surface" (the ink koi leaping around the clock) sits above it.
import * as React from "react"
import { useEffect, useRef } from "react"
import { addPropertyControls, ControlType, RenderTarget } from "framer"

type Context = CanvasRenderingContext2D

type PondPalette = {
  night: string
  chalk: string
  pond: string
  pondDeep: string
  foam: string
  koiRed: string
  koiOrange: string
  koiGold: string
  koiGlow: string
  koiCream: string
  koiShade: string
  shimmer: string
  leaf: string
}

const PALETTE: PondPalette = {
  night: "#eef0e6",
  chalk: "#2b3a8f",
  pond: "#e4ece4",
  pondDeep: "#d6e4dc",
  foam: "#2b3a8f",
  koiRed: "#d9381e",
  koiOrange: "#ec6a1c",
  koiGold: "#f0a12a",
  koiGlow: "#f6c35a",
  koiCream: "#f6f1e7",
  koiShade: "#b8c9bf",
  shimmer: "#ffffff",
  leaf: "#9fb47e",
}

// ---- pondState ----
type Point = { x: number; y: number };

type Ripple = Point & { bornAt: number; strength: number };

type PondState = {
  pointer: Point & { movedAt: number };
  lure: (Point & { until: number }) | null;
  surfacedElement: HTMLElement | null;
  // The piece under the pointer: every koi in the pond comes to circle it.
  pointedElement?: HTMLElement | null;
  ripples: Ripple[];
};

// Shared through globalThis so the "Surfacing" override (another file) can tell the koi
// which artwork is surfaced, and so both pond layers share one simulation.
const pondGlobal = globalThis as unknown as { __koiPondState?: PondState };
const pondState: PondState = (pondGlobal.__koiPondState ??= {
  pointer: { x: 0, y: 0, movedAt: -Infinity },
  lure: null,
  surfacedElement: null,
  ripples: [],
});

const MAX_RIPPLES = 24;

function addRipple(documentPoint: Point, strength = 1) {
  pondState.ripples.push({ ...documentPoint, bornAt: performance.now(), strength });
  if (pondState.ripples.length > MAX_RIPPLES) pondState.ripples.shift();
}

// ---- dial ----
type Dial = { centerX: number; centerY: number; radius: number };

const DIAL_CENTER_FRACTION = 0.45;

function dialFor(viewportWidth: number, viewportHeight: number): Dial {
  return {
    centerX: viewportWidth / 2,
    centerY: viewportHeight * DIAL_CENTER_FRACTION,
    radius: Math.min(viewportWidth * 0.4, viewportHeight * 0.31),
  };
}

function secondHandAngle(epochMilliseconds: number) {
  const secondsIntoMinute = (epochMilliseconds / 1000) % 60;
  return (secondsIntoMinute / 60) * Math.PI * 2 - Math.PI / 2;
}

function pointOnDial(dial: Dial, angle: number) {
  return { x: dial.centerX + Math.cos(angle) * dial.radius, y: dial.centerY + Math.sin(angle) * dial.radius };
}

// ---- water ----
const SURFACE_FRACTION_OF_FIRST_SCREEN = 0.9;

function surfaceDocumentY(viewportHeight: number) {
  return viewportHeight * SURFACE_FRACTION_OF_FIRST_SCREEN;
}

function surfaceOffset(x: number, seconds: number) {
  return 7 * Math.sin(x * 0.006 + seconds * 0.7) + 3 * Math.sin(x * 0.017 - seconds * 1.1);
}

function isUnderwater(documentX: number, documentY: number, viewportHeight: number, seconds: number) {
  return documentY > surfaceDocumentY(viewportHeight) + surfaceOffset(documentX, seconds);
}

const SAMPLE_STEP = 16;

function traceSurface(path: Path2D, width: number, surfaceScreenY: number, seconds: number) {
  for (let x = width; x >= 0; x -= SAMPLE_STEP) {
    path.lineTo(x, surfaceScreenY + surfaceOffset(x, seconds));
  }
  path.lineTo(0, surfaceScreenY + surfaceOffset(0, seconds));
}

function waterRegion(width: number, height: number, surfaceScreenY: number, seconds: number) {
  const path = new Path2D();
  path.moveTo(0, height + 50);
  path.lineTo(width, height + 50);
  traceSurface(path, width, surfaceScreenY, seconds);
  path.closePath();
  return path;
}

function airRegion(width: number, surfaceScreenY: number, seconds: number) {
  const path = new Path2D();
  path.moveTo(0, -50);
  path.lineTo(width, -50);
  traceSurface(path, width, surfaceScreenY, seconds);
  path.closePath();
  return path;
}

function surfaceLine(width: number, surfaceScreenY: number, seconds: number) {
  const path = new Path2D();
  path.moveTo(width, surfaceScreenY + surfaceOffset(width, seconds));
  traceSurface(path, width, surfaceScreenY, seconds);
  return path;
}

// ---- koiPattern ----
type KoiVariety = "kohaku" | "orange" | "gold" | "hiOrange";

type Patch = {
  spinePosition: number;
  side: number;
  lengthRadius: number;
  widthRadius: number;
  wobble: number[];
  glow: boolean;
};

type Streak = { side: number; from: number; to: number; light: boolean };

type KoiPattern = {
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

function patternFor(variety: KoiVariety, seed: number): KoiPattern {
  const random = seededRandom(seed + 1);
  const recipe = RECIPES[variety];
  return {
    variety,
    colouredBody: recipe.colouredBody,
    patches: Array.from({ length: recipe.patchCount }, (_, index) => makePatch(random, index, recipe)),
    streaks: Array.from({ length: 9 }, () => makeStreak(random)),
  };
}

// ---- koi ----
const BODY_POINTS = 16;
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
const TIGHTEST_TURN_IN_BODY_LENGTHS = 0.4;
const TAIL_AMPLITUDE_IN_BODY_LENGTHS = 0.07;
const WAVES_PER_BODY = 1;

type KoiPose = {
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

class Koi {
  private spine: Point[];
  private heading: number;
  private speed = 0;
  private phase: number;
  private beatClock: number;
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
    return Math.min(2.2, Math.max(0.5, this.speed / tightestRadius));
  }

  swimToward(target: Point, desiredSpeed: number, deltaSeconds: number) {
    const desiredHeading = Math.atan2(target.y - this.head.y, target.x - this.head.x);
    const turn = wrapAngle(desiredHeading - this.heading);
    const turnLimit = this.maxTurnRate() * deltaSeconds;
    this.heading += Math.max(-turnLimit, Math.min(turnLimit, turn));

    const sharpness = Math.min(1, Math.abs(turn) / Math.PI);
    const cruisingSpeed = desiredSpeed * (1 - 0.45 * sharpness);
    this.speed += (cruisingSpeed - this.speed) * Math.min(1, deltaSeconds * 1.2);
    this.head.x += Math.cos(this.heading) * this.speed * deltaSeconds;
    this.head.y += Math.sin(this.heading) * this.speed * deltaSeconds;

    const tailBeatsPerSecond = 0.7 + (this.speed / this.bodyLength) * 1.6;
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

// ---- koiShapes ----
const add = (a: Point, b: Point, k = 1): Point => ({ x: a.x + b.x * k, y: a.y + b.y * k });
const midpoint = (a: Point, b: Point): Point => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });

function unit(from: Point, to: Point): Point {
  const length = Math.hypot(to.x - from.x, to.y - from.y) || 1;
  return { x: (to.x - from.x) / length, y: (to.y - from.y) / length };
}

function forwardOf(pose: KoiPose) {
  return unit(pose.spine[1], pose.spine[0]);
}

function smoothPath(points: Point[], path = new Path2D(), closed = false) {
  if (!closed) path.moveTo(points[0].x, points[0].y);
  if (closed) {
    const start = midpoint(points[points.length - 1], points[0]);
    path.moveTo(start.x, start.y);
  }
  const loop = closed ? [...points, points[0]] : points;
  for (let index = closed ? 0 : 1; index < loop.length - 1; index++) {
    const end = midpoint(loop[index], loop[index + 1]);
    path.quadraticCurveTo(loop[index].x, loop[index].y, end.x, end.y);
  }
  if (!closed) path.lineTo(loop[loop.length - 1].x, loop[loop.length - 1].y);
  if (closed) path.closePath();
  return path;
}

function pointOnBody(pose: KoiPose, spinePosition: number, sideFraction: number): Point {
  const clamped = Math.max(0, Math.min(BODY_POINTS - 1.001, spinePosition));
  const index = Math.floor(clamped);
  const t = clamped - index;
  const blend = (a: Point, b: Point) => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
  const center = blend(pose.spine[index], pose.spine[index + 1]);
  const normal = blend(pose.normals[index], pose.normals[index + 1]);
  const halfWidth = pose.halfWidths[index] + (pose.halfWidths[index + 1] - pose.halfWidths[index]) * t;
  return add(center, normal, sideFraction * Math.max(halfWidth, pose.scale * 3));
}

function bodyPath(pose: KoiPose) {
  const body = pose.spine.slice(0, BODY_POINTS);
  const left = body.map((point, index) => add(point, pose.normals[index], pose.halfWidths[index]));
  const right = body.map((point, index) => add(point, pose.normals[index], -pose.halfWidths[index]));
  const forward = forwardOf(pose);
  const noseRadius = pose.halfWidths[0];
  const nose = add(pose.spine[0], forward, noseRadius * 1.15);
  const path = new Path2D();
  path.moveTo(nose.x, nose.y);
  const leftNoseControl = add(left[0], forward, noseRadius);
  path.quadraticCurveTo(leftNoseControl.x, leftNoseControl.y, left[0].x, left[0].y);
  for (let index = 1; index < left.length - 1; index++) {
    const end = midpoint(left[index], left[index + 1]);
    path.quadraticCurveTo(left[index].x, left[index].y, end.x, end.y);
  }
  const tailNarrow = pose.spine[BODY_POINTS - 1];
  path.lineTo(tailNarrow.x, tailNarrow.y);
  for (let index = right.length - 2; index > 0; index--) {
    const end = midpoint(right[index], right[index - 1]);
    path.quadraticCurveTo(right[index].x, right[index].y, end.x, end.y);
  }
  path.lineTo(right[0].x, right[0].y);
  const rightNoseControl = add(right[0], forward, noseRadius);
  path.quadraticCurveTo(rightNoseControl.x, rightNoseControl.y, nose.x, nose.y);
  path.closePath();
  return path;
}

function patchOutline(pose: KoiPose, patch: Patch, shrink = 1, jitter = 0) {
  const points = patch.wobble.map((wobble, index) => {
    const angle = (index / patch.wobble.length) * Math.PI * 2;
    const reach = (wobble + Math.sin(index * 2.3 + jitter) * 0.08 * Math.min(1, jitter)) * shrink;
    return pointOnBody(
      pose,
      patch.spinePosition + Math.cos(angle) * patch.lengthRadius * reach,
      patch.side + Math.sin(angle) * patch.widthRadius * reach,
    );
  });
  return smoothPath(points, new Path2D(), true);
}

type Fin = { outline: Path2D; rays: Point[][] };

function between(a: Point, b: Point, t: number): Point {
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
}

function caudalLobe(pose: KoiPose, side: number): Fin {
  const base = BODY_POINTS - 1;
  const tail = pose.spine.slice(base);
  const normals = pose.normals.slice(base);
  const finLength = tail.length - 1;
  const span = pose.halfWidths[base] + 19 * pose.scale;
  const outer = tail.map((point, index) => {
    const t = index / finLength;
    const flare = pose.halfWidths[base] * 0.9 + (span - pose.halfWidths[base] * 0.9) * Math.sin(t * Math.PI * 0.5);
    return add(point, normals[index], side * flare);
  });
  const tip = outer[outer.length - 1];
  const notch = between(tail[0], tail[finLength], 0.55);
  const innerControl = add(between(notch, tip, 0.5), normals[finLength], side * 7 * pose.scale);
  const outline = smoothPath(outer);
  outline.quadraticCurveTo(innerControl.x, innerControl.y, notch.x, notch.y);
  outline.lineTo(tail[0].x, tail[0].y);
  outline.closePath();
  const rays = [0.25, 0.5, 0.75, 1].map((share) => [tail[0], between(between(notch, tip, share), outer[Math.round(finLength * share)], 0.5)]);
  return { outline, rays };
}

function caudalFin(pose: KoiPose): Fin[] {
  return [caudalLobe(pose, 1), caudalLobe(pose, -1)];
}

function paddleFin(pose: KoiPose, bodyShare: number, sideSign: number, length: number, spreadBias: number): Fin {
  const position = bodyShare * (BODY_POINTS - 1);
  const index = Math.max(1, Math.round(position));
  const anchor = pointOnBody(pose, position, sideSign * 0.88);
  const normal = pose.normals[index];
  const back = unit(pose.spine[index - 1], pose.spine[index]);
  const outward = { x: normal.x * sideSign, y: normal.y * sideSign };
  const cruising = Math.min(1, pose.speed / (90 * pose.scale));
  const spread = spreadBias - 0.45 * cruising + 0.12 * Math.sin(pose.phase * 0.35 + sideSign);
  const direction = add({ x: back.x * Math.cos(spread), y: back.y * Math.cos(spread) }, outward, Math.sin(spread));
  const across = { x: back.x - direction.x, y: back.y - direction.y };
  const s = pose.scale * length;
  const leadingEdge = add(add(anchor, direction, 8 * s), outward, 4 * s);
  const roundTip = add(anchor, direction, 17 * s);
  const trailingEdge = add(add(anchor, direction, 12 * s), across, 5 * s);
  const root = add(anchor, back, 5 * s);
  const outline = smoothPath([anchor, leadingEdge, roundTip, trailingEdge, root], new Path2D(), true);
  const rays = [leadingEdge, between(leadingEdge, roundTip, 0.6), roundTip, between(roundTip, trailingEdge, 0.5)].map((end) => [anchor, end]);
  return { outline, rays };
}

function sideFins(pose: KoiPose): Fin[] {
  return [
    paddleFin(pose, 0.22, 1, 1.8, 1.05),
    paddleFin(pose, 0.22, -1, 1.8, 1.05),
    paddleFin(pose, 0.56, 1, 0.8, 0.75),
    paddleFin(pose, 0.56, -1, 0.8, 0.75),
  ];
}

function dorsalRidge(pose: KoiPose): Point[] {
  return streakPoints(pose, 0, (BODY_POINTS - 1) * 0.38, (BODY_POINTS - 1) * 0.78);
}

function barbels(pose: KoiPose): Point[][] {
  const forward = forwardOf(pose);
  const sway = Math.sin(pose.phase * 0.8) * 2 * pose.scale;
  return [1, -1].map((side) => {
    const root = pointOnBody(pose, 0.1, side * 0.55);
    const normal = { x: pose.normals[0].x * side, y: pose.normals[0].y * side };
    return [
      root,
      add(add(root, forward, 4 * pose.scale), normal, 5 * pose.scale + sway),
      add(add(root, forward, -1 * pose.scale), normal, 13 * pose.scale + sway),
    ];
  });
}

function eyes(pose: KoiPose): Point[] {
  return [pointOnBody(pose, 1.1, 0.7), pointOnBody(pose, 1.1, -0.7)];
}

function streakPoints(pose: KoiPose, side: number, from: number, to: number): Point[] {
  const steps = 6;
  return Array.from({ length: steps + 1 }, (_, step) => pointOnBody(pose, from + ((to - from) * step) / steps, side));
}

// ---- brushTexture ----
const TEXTURE_SIZE = 160;
const BRISTLE_COUNT = 220;

let bristles: HTMLCanvasElement | null = null;

function paintBristleTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = TEXTURE_SIZE;
  canvas.height = TEXTURE_SIZE;
  const ctx = canvas.getContext("2d");
  if (!ctx) return canvas;
  ctx.lineCap = "round";
  for (let index = 0; index < BRISTLE_COUNT; index++) {
    const light = Math.random() > 0.45;
    ctx.strokeStyle = light ? "rgba(255,255,255,1)" : "rgba(0,0,0,1)";
    ctx.globalAlpha = 0.15 + Math.random() * 0.45;
    ctx.lineWidth = 0.5 + Math.random() * 1.6;
    const x = Math.random() * TEXTURE_SIZE;
    const y = Math.random() * TEXTURE_SIZE;
    const length = 14 + Math.random() * 70;
    const bend = (Math.random() - 0.5) * 4;
    for (const wrap of [0, -TEXTURE_SIZE]) {
      ctx.beginPath();
      ctx.moveTo(x + wrap, y);
      ctx.quadraticCurveTo(x + wrap + length / 2, y + bend, x + wrap + length, y);
      ctx.stroke();
    }
  }
  return canvas;
}

function bristlePattern(ctx: CanvasRenderingContext2D, origin: { x: number; y: number }, angle: number, scale: number) {
  bristles ??= paintBristleTexture();
  const pattern = ctx.createPattern(bristles, "repeat");
  if (!pattern) return null;
  pattern.setTransform(new DOMMatrix().translate(origin.x, origin.y).rotate((angle * 180) / Math.PI).scale(scale));
  return pattern;
}

// ---- koiDrawing ----
const PIGMENT: Record<KoiVariety, keyof PondPalette> = {
  kohaku: "koiRed",
  orange: "koiOrange",
  gold: "koiGold",
  hiOrange: "koiOrange",
};

function pigmentOf(pose: KoiPose, palette: PondPalette) {
  return palette[PIGMENT[pose.pattern.variety]];
}

function strokeLine(ctx: Context, points: Point[], width: number) {
  ctx.lineWidth = width;
  ctx.stroke(smoothPath(points));
}

function strokeRays(ctx: Context, fins: Fin[], width: number) {
  ctx.lineWidth = width;
  for (const fin of fins) {
    for (const ray of fin.rays) ctx.stroke(smoothPath(ray));
  }
}

function drawEyes(ctx: Context, pose: KoiPose, pupil: string, glint: string | null) {
  for (const eye of eyes(pose)) {
    ctx.fillStyle = pupil;
    ctx.beginPath();
    ctx.arc(eye.x, eye.y, 1.9 * pose.scale, 0, Math.PI * 2);
    ctx.fill();
    if (!glint) continue;
    ctx.fillStyle = glint;
    ctx.beginPath();
    ctx.arc(eye.x - 0.5 * pose.scale, eye.y - 0.5 * pose.scale, 0.6 * pose.scale, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawInkKoi(ctx: Context, pose: KoiPose, palette: PondPalette) {
  const body = bodyPath(pose);
  const fins = [...caudalFin(pose), ...sideFins(pose)];
  ctx.save();
  ctx.strokeStyle = palette.chalk;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  ctx.fillStyle = palette.night;
  fins.forEach((fin) => ctx.fill(fin.outline));
  strokeRays(ctx, fins, 0.8);
  ctx.lineWidth = 1.5;
  fins.forEach((fin) => ctx.stroke(fin.outline));

  ctx.fill(body);
  ctx.save();
  ctx.clip(body);
  ctx.fillStyle = palette.chalk;
  for (const patch of pose.pattern.patches) ctx.fill(patchOutline(pose, patch, 0.85));
  ctx.restore();
  ctx.lineWidth = 2.2 * Math.max(0.8, pose.scale);
  ctx.stroke(body);
  ctx.globalAlpha = 0.6;
  strokeLine(ctx, dorsalRidge(pose), 1.2);
  ctx.globalAlpha = 1;
  ctx.lineWidth = 0.9;
  barbels(pose).forEach((barbel) => ctx.stroke(smoothPath(barbel)));
  drawEyes(ctx, pose, palette.chalk, null);
  ctx.restore();
}

function drawShadow(ctx: Context, pose: KoiPose, body: Path2D, fins: Fin[]) {
  ctx.save();
  ctx.shadowColor = "rgba(70, 95, 80, 0.28)";
  ctx.shadowBlur = 18 * pose.scale;
  ctx.shadowOffsetX = 10 * pose.scale;
  ctx.shadowOffsetY = 20 * pose.scale;
  ctx.globalAlpha = 0.85;
  fins.forEach((fin) => ctx.fill(fin.outline));
  ctx.fill(body);
  ctx.restore();
}

function drawCaudalFin(ctx: Context, pose: KoiPose, palette: PondPalette) {
  const lobes = caudalFin(pose);
  ctx.fillStyle = palette.koiCream;
  ctx.globalAlpha = 0.88;
  lobes.forEach((lobe) => ctx.fill(lobe.outline));
  ctx.strokeStyle = "#ffffff";
  ctx.globalAlpha = 0.85;
  strokeRays(ctx, lobes, 0.9 * pose.scale);
  ctx.globalAlpha = 1;
}

function drawTranslucentFins(ctx: Context, pose: KoiPose, fins: Fin[], palette: PondPalette) {
  ctx.fillStyle = palette.koiCream;
  ctx.strokeStyle = palette.koiCream;
  ctx.globalAlpha = 0.82;
  fins.forEach((fin) => ctx.fill(fin.outline));
  ctx.strokeStyle = "#ffffff";
  ctx.globalAlpha = 0.9;
  strokeRays(ctx, fins, 0.9 * pose.scale);
  ctx.globalAlpha = 1;
}

function paintPatches(ctx: Context, pose: KoiPose, palette: PondPalette) {
  const pigment = pose.pattern.colouredBody ? palette.koiCream : pigmentOf(pose, palette);
  ctx.fillStyle = pigment;
  ctx.strokeStyle = pigment;
  for (const patch of pose.pattern.patches) {
    ctx.globalAlpha = 0.35;
    ctx.fill(patchOutline(pose, patch, 1.08, 3));
    ctx.globalAlpha = 0.9;
    ctx.fill(patchOutline(pose, patch, 0.92, 1));
    ctx.globalAlpha = 0.35;
    ctx.lineWidth = 1.6 * pose.scale;
    ctx.stroke(patchOutline(pose, patch, 0.98, 2));
  }
  ctx.globalAlpha = 1;
}

function paintGlow(ctx: Context, pose: KoiPose, palette: PondPalette) {
  if (pose.pattern.colouredBody) return;
  ctx.save();
  ctx.fillStyle = palette.koiGlow;
  ctx.shadowColor = palette.koiGlow;
  ctx.shadowBlur = 8 * pose.scale;
  ctx.globalAlpha = 0.4;
  for (const patch of pose.pattern.patches) {
    if (patch.glow) ctx.fill(patchOutline(pose, patch, 0.42, 3));
  }
  ctx.restore();
}

function paintBrushwork(ctx: Context, pose: KoiPose, palette: PondPalette) {
  const pigment = pigmentOf(pose, palette);
  ctx.lineCap = "round";
  for (const streak of pose.pattern.streaks) {
    ctx.strokeStyle = streak.light ? palette.koiCream : pigment;
    ctx.globalAlpha = streak.light ? 0.3 : 0.2;
    strokeLine(ctx, streakPoints(pose, streak.side, streak.from, streak.to), 1.8 * pose.scale);
  }
  ctx.globalAlpha = 1;
}

function paintBristles(ctx: Context, pose: KoiPose) {
  const forward = forwardOf(pose);
  const pattern = bristlePattern(ctx, pose.spine[0], Math.atan2(forward.y, forward.x), pose.scale * 0.8);
  if (!pattern) return;
  ctx.save();
  ctx.globalCompositeOperation = "overlay";
  ctx.globalAlpha = 0.55;
  ctx.fillStyle = pattern;
  ctx.fill(bodyPath(pose));
  ctx.restore();
}

function paintShading(ctx: Context, pose: KoiPose, body: Path2D, palette: PondPalette) {
  ctx.strokeStyle = palette.koiShade;
  ctx.globalAlpha = 0.4;
  ctx.lineWidth = 9 * pose.scale;
  ctx.stroke(body);
  ctx.strokeStyle = palette.pond;
  ctx.globalAlpha = 0.3;
  ctx.lineWidth = 3 * pose.scale;
  ctx.stroke(body);
  ctx.strokeStyle = "#ffffff";
  ctx.globalAlpha = 0.28;
  ctx.lineCap = "round";
  strokeLine(ctx, pose.spine.slice(1, 12), 5 * pose.scale);
  ctx.globalAlpha = 0.35;
  strokeLine(ctx, dorsalRidge(pose), 2.4 * pose.scale);
  ctx.globalAlpha = 1;
}

function drawPaintedKoi(ctx: Context, pose: KoiPose, palette: PondPalette) {
  const body = bodyPath(pose);
  const fins = sideFins(pose);
  ctx.save();
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  ctx.fillStyle = palette.koiCream;
  drawShadow(ctx, pose, body, fins);
  drawCaudalFin(ctx, pose, palette);
  drawTranslucentFins(ctx, pose, fins, palette);

  ctx.fillStyle = pose.pattern.colouredBody ? pigmentOf(pose, palette) : palette.koiCream;
  ctx.fill(body);
  ctx.save();
  ctx.clip(body);
  paintPatches(ctx, pose, palette);
  paintGlow(ctx, pose, palette);
  paintBrushwork(ctx, pose, palette);
  paintBristles(ctx, pose);
  paintShading(ctx, pose, body, palette);
  ctx.restore();

  ctx.strokeStyle = palette.koiCream;
  ctx.globalAlpha = 0.85;
  ctx.lineWidth = 0.9 * pose.scale;
  barbels(pose).forEach((barbel) => ctx.stroke(smoothPath(barbel)));
  ctx.globalAlpha = 1;
  drawEyes(ctx, pose, "#1c2440", palette.koiCream);
  ctx.restore();
}

// ---- koiBrain ----
type Goal = { target: Point; speed: number };

type Surroundings = {
  seconds: number;
  epochMilliseconds: number;
  scrollY: number;
  scrollVelocity: number;
  viewportWidth: number;
  viewportHeight: number;
  dial: Dial;
};

type Swimmer = { head: Point; scale: number };

const CURIOSITY_SECONDS = 3;
const SECOND_HAND_LEAD = 0.35;
const PERSONAL_SPACE = 95;

const distance = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);

function withCatchUp(goal: Goal, swimmer: Swimmer): Goal {
  const gap = distance(goal.target, swimmer.head);
  if (gap < 320 * swimmer.scale) return goal;
  return { ...goal, speed: Math.max(goal.speed, Math.min(gap * 1.2, 900 * swimmer.scale)) };
}

function lureGoal(world: Surroundings, swimmer: Swimmer): Goal | null {
  const lure = pondState.lure;
  if (!lure || world.seconds > lure.until) return null;
  return { target: lure, speed: 240 * swimmer.scale };
}

function curiosityGoal(world: Surroundings, swimmer: Swimmer): Goal | null {
  if (world.seconds - pondState.pointer.movedAt > CURIOSITY_SECONDS) return null;
  if (world.scrollY > world.viewportHeight * 0.5) return null;
  const pointer = { x: pondState.pointer.x, y: pondState.pointer.y + world.scrollY };
  const nearDial = distance(pointer, { x: world.dial.centerX, y: world.dial.centerY }) < world.dial.radius * 1.3;
  const inAir = !isUnderwater(pointer.x, pointer.y, world.viewportHeight, world.seconds);
  if (!nearDial || !inAir) return null;
  const gap = distance(pointer, swimmer.head);
  return { target: pointer, speed: Math.min(gap * 1.2, 120 * swimmer.scale) + 12 * swimmer.scale };
}

function secondHandGoal(world: Surroundings, swimmer: Swimmer): Goal {
  const angle = secondHandAngle(world.epochMilliseconds);
  const orbitSpeed = (world.dial.radius * Math.PI * 2) / 60;
  const lagging = distance(pointOnDial(world.dial, angle), swimmer.head) > 40 * swimmer.scale;
  const target = pointOnDial(world.dial, angle + SECOND_HAND_LEAD);
  return { target, speed: lagging ? Math.max(orbitSpeed, 160 * swimmer.scale) : orbitSpeed };
}

const ESCORT_PERSONALITY = 4;

function hasLeftTheDial(world: Surroundings) {
  return world.scrollY > world.viewportHeight * 0.6;
}

function timekeeperGoal(world: Surroundings, swimmer: Swimmer, school: Swimmer[]): Goal {
  if (hasLeftTheDial(world) || pondState.pointedElement) return pondKoiGoal(world, swimmer, ESCORT_PERSONALITY, school);
  const goal = lureGoal(world, swimmer) ?? curiosityGoal(world, swimmer) ?? secondHandGoal(world, swimmer);
  return withCatchUp(goal, swimmer);
}

function circlingGoal(world: Surroundings, swimmer: Swimmer, element: HTMLElement | null | undefined, offset = 0, speed = 80): Goal | null {
  if (!element || !element.isConnected) return null;
  const rect = element.getBoundingClientRect();
  if (rect.width === 0 && rect.height === 0) return null;
  const angle = world.seconds * 0.22 + offset;
  const visibleTop = Math.max(rect.top, 0);
  const visibleBottom = Math.min(rect.bottom, world.viewportHeight);
  const halfHeight = Math.max(0, (visibleBottom - visibleTop) / 2);
  const target = {
    x: rect.left + rect.width / 2 + Math.cos(angle) * (rect.width / 2 + 36 * swimmer.scale),
    y: world.scrollY + visibleTop + halfHeight + Math.sin(angle) * (halfHeight + 24 * swimmer.scale),
  };
  return { target, speed: speed * swimmer.scale };
}

const MAX_CURRENT_LEAD = 0.35;

function currentLead(world: Surroundings) {
  const lead = world.scrollVelocity * 0.5;
  const limit = world.viewportHeight * MAX_CURRENT_LEAD;
  return Math.max(-limit, Math.min(limit, lead));
}

function wanderGoal(world: Surroundings, swimmer: Swimmer, personality: number): Goal {
  const time = world.seconds + personality * 17;
  const lowestAllowed = surfaceDocumentY(world.viewportHeight) + 90 * swimmer.scale;
  const target = {
    x: world.viewportWidth * (0.5 + 0.38 * Math.sin(time * (0.09 + personality * 0.025))),
    y: Math.max(
      lowestAllowed,
      world.scrollY +
        currentLead(world) +
        world.viewportHeight * (0.5 + 0.3 * Math.sin(time * (0.15 + personality * 0.03) + personality)),
    ),
  };
  const drift = Math.min(260, Math.abs(world.scrollVelocity) * 0.35);
  return { target, speed: (45 + personality * 8) * swimmer.scale + drift };
}

function keepApart(goal: Goal, swimmer: Swimmer, school: Swimmer[]): Goal {
  const push = { x: 0, y: 0 };
  for (const other of school) {
    if (other === swimmer) continue;
    const gap = distance(other.head, swimmer.head);
    const space = PERSONAL_SPACE * swimmer.scale;
    if (gap === 0 || gap > space) continue;
    const strength = ((space - gap) / space) * 120 * swimmer.scale;
    push.x += ((swimmer.head.x - other.head.x) / gap) * strength;
    push.y += ((swimmer.head.y - other.head.y) / gap) * strength;
  }
  return { ...goal, target: { x: goal.target.x + push.x, y: goal.target.y + push.y } };
}

function pondKoiGoal(world: Surroundings, swimmer: Swimmer, personality: number, school: Swimmer[]): Goal {
  const leadsTheCircle = personality === 0;
  // Spread the koi evenly around the hovered piece so they circle it together.
  const placeInCircle = (personality === ESCORT_PERSONALITY ? 2 : personality) * ((Math.PI * 2) / 3);
  const goal =
    lureGoal(world, swimmer) ??
    circlingGoal(world, swimmer, pondState.pointedElement, placeInCircle, 110) ??
    (leadsTheCircle ? circlingGoal(world, swimmer, pondState.surfacedElement) : null) ??
    wanderGoal(world, swimmer, personality);
  return withCatchUp(keepApart(goal, swimmer, school), swimmer);
}

// ---- school ----
type PondKoiRecipe = { variety: KoiVariety; seed: number; size: number };

const CURRENT_CARRY = 0.82;

const POND_KOI: PondKoiRecipe[] = [
  { variety: "orange", seed: 2, size: 1.15 },
  { variety: "gold", seed: 3, size: 0.95 },
];

function koiScaleFor(width: number, height: number) {
  return Math.max(0.7, Math.min(1.3, Math.min(width, height) / 640));
}

class School {
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
          { x: width * (0.3 + index * 0.4), y: surface + height * (0.35 + (index % 2) * 0.25) },
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

  swim(world: Surroundings, deltaSeconds: number, scrollDelta: number) {
    this.carryWithCurrent(world, scrollDelta);
    const keeperGoal = timekeeperGoal(world, this.timekeeper, this.all);
    this.timekeeper.swimToward(keeperGoal.target, keeperGoal.speed, deltaSeconds);
    this.pondKoi.forEach((koi, personality) => {
      this.keepNearView(koi, world);
      const goal = pondKoiGoal(world, koi, personality, this.all);
      koi.swimToward(goal.target, goal.speed, deltaSeconds);
    });
    this.all.forEach((koi) => this.splashWhenCrossingSurface(koi, world));
  }

  private carryWithCurrent(world: Surroundings, scrollDelta: number) {
    if (scrollDelta === 0) return;
    const shallowest = surfaceDocumentY(world.viewportHeight) + 60;
    const travellers = hasLeftTheDial(world) ? this.all : this.pondKoi;
    for (const koi of travellers) {
      if (!isUnderwater(koi.head.x, koi.head.y, world.viewportHeight, world.seconds)) continue;
      const carry = scrollDelta * CURRENT_CARRY;
      if (koi.head.y + carry < shallowest) continue;
      koi.shiftBy({ x: 0, y: carry });
    }
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

// ---- backdrop ----
type Frame = {
  width: number;
  height: number;
  scrollY: number;
  seconds: number;
  surfaceScreenY: number;
  dial: Dial;
  palette: PondPalette;
};

const GRAIN_SIZE = 160;

function createGrain(): HTMLCanvasElement {
  const grain = document.createElement("canvas");
  grain.width = GRAIN_SIZE;
  grain.height = GRAIN_SIZE;
  const ctx = grain.getContext("2d");
  if (!ctx) return grain;
  const image = ctx.createImageData(GRAIN_SIZE, GRAIN_SIZE);
  for (let index = 0; index < image.data.length; index += 4) {
    const value = Math.random() * 255;
    image.data[index] = value;
    image.data[index + 1] = value;
    image.data[index + 2] = value;
    image.data[index + 3] = Math.random() * 255;
  }
  ctx.putImageData(image, 0, 0);
  return grain;
}

function drawDialTicks(ctx: Context, frame: Frame) {
  const { dial, scrollY, palette } = frame;
  const centerY = dial.centerY - scrollY;
  if (centerY + dial.radius < 0) return;
  ctx.save();
  ctx.clip(airRegion(frame.width, frame.surfaceScreenY, frame.seconds));
  ctx.strokeStyle = palette.chalk;
  ctx.lineCap = "round";
  for (let tick = 0; tick < 60; tick++) {
    const isHour = tick % 5 === 0;
    const angle = (tick / 60) * Math.PI * 2 - Math.PI / 2;
    const inner = dial.radius + (isHour ? 18 : 22);
    const outer = dial.radius + 28;
    ctx.globalAlpha = isHour ? 0.45 : 0.2;
    ctx.lineWidth = isHour ? 1.2 : 0.8;
    ctx.beginPath();
    ctx.moveTo(dial.centerX + Math.cos(angle) * inner, centerY + Math.sin(angle) * inner);
    ctx.lineTo(dial.centerX + Math.cos(angle) * outer, centerY + Math.sin(angle) * outer);
    ctx.stroke();
  }
  ctx.restore();
}

function drawWater(ctx: Context, frame: Frame) {
  if (frame.surfaceScreenY > frame.height + 20) return;
  const depth = ctx.createLinearGradient(0, frame.surfaceScreenY, 0, frame.surfaceScreenY + frame.height * 1.4);
  depth.addColorStop(0, frame.palette.pond);
  depth.addColorStop(1, frame.palette.pondDeep);
  ctx.fillStyle = depth;
  ctx.fill(waterRegion(frame.width, frame.height, frame.surfaceScreenY, frame.seconds));

  ctx.save();
  ctx.strokeStyle = frame.palette.chalk;
  ctx.lineWidth = 1.2;
  ctx.globalAlpha = 0.35;
  ctx.stroke(surfaceLine(frame.width, frame.surfaceScreenY, frame.seconds));
  ctx.restore();
}

function drawGrain(ctx: Context, frame: Frame, grain: HTMLCanvasElement) {
  const pattern = ctx.createPattern(grain, "repeat");
  if (!pattern) return;
  ctx.save();
  ctx.globalAlpha = 0.07;
  ctx.globalCompositeOperation = "overlay";
  ctx.fillStyle = pattern;
  ctx.fillRect(0, 0, frame.width, frame.height);
  ctx.restore();
}

function drawBackdrop(ctx: Context, frame: Frame) {
  ctx.fillStyle = frame.palette.night;
  ctx.fillRect(0, 0, frame.width, frame.height);
  drawDialTicks(ctx, frame);
  drawWater(ctx, frame);
}

// ---- waterLight ----
type Swirl = { x: number; y: number; radius: number; start: number; sweep: number; width: number; alpha: number; spin: number };
type Fleck = { x: number; y: number; length: number; angle: number; drift: number; golden: boolean };

const TILE_HEIGHT = 1500;
const SWIRL_COUNT = 30;
const FLECK_COUNT = 12;

const randomBetween = (low: number, high: number) => low + Math.random() * (high - low);

const swirls: Swirl[] = Array.from({ length: SWIRL_COUNT }, () => ({
  x: Math.random(),
  y: Math.random() * TILE_HEIGHT,
  radius: randomBetween(50, 280),
  start: Math.random() * Math.PI * 2,
  sweep: randomBetween(0.3, 1),
  width: randomBetween(1.5, 7),
  alpha: randomBetween(0.04, 0.13),
  spin: randomBetween(-0.05, 0.05),
}));

const flecks: Fleck[] = Array.from({ length: FLECK_COUNT }, () => ({
  x: Math.random(),
  y: Math.random() * TILE_HEIGHT,
  length: randomBetween(5, 11),
  angle: Math.random() * Math.PI,
  drift: randomBetween(-6, 6),
  golden: Math.random() > 0.5,
}));

function visibleTiles(frame: Frame) {
  const first = Math.floor(frame.scrollY / TILE_HEIGHT) - 1;
  const last = Math.floor((frame.scrollY + frame.height) / TILE_HEIGHT) + 1;
  return Array.from({ length: last - first + 1 }, (_, index) => (first + index) * TILE_HEIGHT);
}

function drawSwirls(ctx: Context, frame: Frame, tiles: number[]) {
  ctx.strokeStyle = frame.palette.shimmer;
  ctx.lineCap = "round";
  for (const tileTop of tiles) {
    for (const swirl of swirls) {
      const centerY = tileTop + swirl.y - frame.scrollY;
      if (centerY < -swirl.radius || centerY > frame.height + swirl.radius) continue;
      const start = swirl.start + frame.seconds * swirl.spin;
      ctx.globalAlpha = swirl.alpha * (0.65 + 0.35 * Math.sin(frame.seconds * 0.4 + swirl.start));
      ctx.lineWidth = swirl.width;
      ctx.beginPath();
      ctx.arc(swirl.x * frame.width, centerY, swirl.radius, start, start + swirl.sweep);
      ctx.stroke();
    }
  }
}

function drawShafts(ctx: Context, frame: Frame) {
  ctx.save();
  for (let index = 0; index < 3; index++) {
    const offset = ((frame.seconds * (6 + index * 3) + index * 520) % (frame.width + 800)) - 400;
    const shaft = ctx.createLinearGradient(offset, 0, offset + 220 + index * 60, frame.height * 0.25);
    shaft.addColorStop(0, "rgba(255, 255, 255, 0)");
    shaft.addColorStop(0.5, `rgba(255, 255, 255, ${0.16 + index * 0.02})`);
    shaft.addColorStop(1, "rgba(255, 255, 255, 0)");
    ctx.fillStyle = shaft;
    ctx.globalAlpha = 1;
    ctx.fillRect(0, 0, frame.width, frame.height);
  }
  ctx.restore();
}

function drawFlecks(ctx: Context, frame: Frame, tiles: number[]) {
  for (const tileTop of tiles) {
    for (const fleck of flecks) {
      const x = (((fleck.x * frame.width + frame.seconds * fleck.drift) % frame.width) + frame.width) % frame.width;
      const y = tileTop + fleck.y - frame.scrollY + Math.sin(frame.seconds * 0.5 + fleck.angle) * 4;
      if (y < -20 || y > frame.height + 20) continue;
      ctx.fillStyle = fleck.golden ? frame.palette.koiGlow : frame.palette.leaf;
      ctx.globalAlpha = 0.55;
      ctx.beginPath();
      ctx.ellipse(x, y, fleck.length, fleck.length * 0.38, fleck.angle + frame.seconds * 0.05, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

function drawWaterLight(ctx: Context, frame: Frame) {
  const tiles = visibleTiles(frame);
  ctx.save();
  drawShafts(ctx, frame);
  drawSwirls(ctx, frame, tiles);
  drawFlecks(ctx, frame, tiles);
  ctx.restore();
}

// ---- surfaceLayer ----
const RIPPLE_LIFETIME_SECONDS = 2.6;

function drawRipples(ctx: Context, frame: Frame, nowMilliseconds: number) {
  pondState.ripples = pondState.ripples.filter(
    (ripple) => (nowMilliseconds - ripple.bornAt) / 1000 < RIPPLE_LIFETIME_SECONDS,
  );
  ctx.strokeStyle = frame.palette.foam;
  for (const ripple of pondState.ripples) {
    const age = (nowMilliseconds - ripple.bornAt) / 1000;
    const fade = 1 - age / RIPPLE_LIFETIME_SECONDS;
    const radius = 6 + age * 52 * ripple.strength;
    ctx.lineWidth = 1;
    for (const ring of [1, 0.62]) {
      ctx.globalAlpha = fade * fade * 0.5 * Math.min(1, ripple.strength) * ring;
      ctx.beginPath();
      ctx.ellipse(ripple.x, ripple.y - frame.scrollY, radius * ring, radius * ring * 0.92, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
  }
  ctx.globalAlpha = 1;
}

function isOnScreen(koi: Koi, frame: Frame) {
  const head = koi.head.y - frame.scrollY;
  const reach = 260 * koi.scale;
  return head > -reach && head < frame.height + reach;
}

function visiblePoses(frame: Frame, school: Koi[]) {
  return school.filter((koi) => isOnScreen(koi, frame)).map((koi) => koi.pose(frame.scrollY))
}

// Drawn on the Water layer, beneath the page, so the koi swim under the artwork.
function drawUnderwaterLayer(ctx: Context, frame: Frame, school: Koi[], nowMilliseconds: number) {
  ctx.save()
  ctx.clip(waterRegion(frame.width, frame.height, frame.surfaceScreenY, frame.seconds))
  drawRipples(ctx, frame, nowMilliseconds)
  visiblePoses(frame, school).forEach((pose) => drawPaintedKoi(ctx, pose, frame.palette))
  drawWaterLight(ctx, frame)
  ctx.restore()
}

// Drawn on the Surface layer, above the page: only the ink koi in the air around the clock.
function drawAirLayer(ctx: Context, frame: Frame, school: Koi[]) {
  ctx.clearRect(0, 0, frame.width, frame.height)
  ctx.save()
  ctx.clip(airRegion(frame.width, frame.surfaceScreenY, frame.seconds))
  visiblePoses(frame, school).forEach((pose) => drawInkKoi(ctx, pose, frame.palette))
  ctx.restore()
}


// ---- shared engine ----
type LayerName = "Water" | "Surface"

const RIPPLE_SPACING = 70
const LURE_SECONDS = 2.2

// Framer can mount the page once per breakpoint (Desktop, Tablet, Phone) and hide the ones
// that don't match, so each layer keeps every canvas it is given and draws to the visible ones.
type Engine = {
  canvases: Record<LayerName, Set<HTMLCanvasElement>>
  users: number
  redraw: () => void
  stop: () => void
}

const engineGlobal = globalThis as unknown as { __koiPondEngine?: Engine }

function fitCanvas(canvas: HTMLCanvasElement, width: number, height: number) {
  const ratio = Math.min(window.devicePixelRatio || 1, 2)
  const pixelWidth = Math.round(width * ratio)
  const pixelHeight = Math.round(height * ratio)
  if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
    canvas.width = pixelWidth
    canvas.height = pixelHeight
  }
  const ctx = canvas.getContext("2d")
  ctx?.setTransform(ratio, 0, 0, ratio, 0, 0)
  return ctx
}

function isShown(canvas: HTMLCanvasElement) {
  return canvas.isConnected && canvas.getClientRects().length > 0
}

function prefersReducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches
}

function startEngine(animate: boolean): Engine {
  const canvases: Engine["canvases"] = { Water: new Set(), Surface: new Set() }
  const grain = createGrain()
  const reducedMotion = prefersReducedMotion() || !animate
  const school = new School(window.innerWidth, window.innerHeight)
  let previous = performance.now()
  let previousScrollY = window.scrollY
  let scrollVelocity = 0
  let frameId = 0
  let lastRipple = { x: -Infinity, y: -Infinity }

  const documentPoint = (event: PointerEvent) => ({ x: event.clientX, y: event.clientY + window.scrollY })
  const overWater = (point: Point) => isUnderwater(point.x, point.y, window.innerHeight, performance.now() / 1000)
  const onMove = (event: PointerEvent) => {
    pondState.pointer = { x: event.clientX, y: event.clientY, movedAt: performance.now() / 1000 }
    const point = documentPoint(event)
    if (!overWater(point) || Math.hypot(point.x - lastRipple.x, point.y - lastRipple.y) < RIPPLE_SPACING) return
    lastRipple = point
    addRipple(point, 0.45)
  }
  const onDown = (event: PointerEvent) => {
    const point = documentPoint(event)
    if (!overWater(point)) return
    addRipple(point, 1.6)
    pondState.lure = { ...point, until: performance.now() / 1000 + LURE_SECONDS }
  }
  const onResize = () => school.resize(window.innerWidth, window.innerHeight)

  const render = (now: number) => {
    const width = window.innerWidth
    const height = window.innerHeight
    const deltaSeconds = Math.min(0.05, (now - previous) / 1000)
    previous = now
    const scrollY = window.scrollY
    const frame: Frame = {
      width,
      height,
      scrollY,
      seconds: reducedMotion ? 0 : now / 1000,
      surfaceScreenY: surfaceDocumentY(height) - scrollY,
      dial: dialFor(width, height),
      palette: PALETTE,
    }
    const scrollDelta = scrollY - previousScrollY
    previousScrollY = scrollY
    if (deltaSeconds > 0) scrollVelocity += (scrollDelta / deltaSeconds - scrollVelocity) * 0.12
    if (!reducedMotion) {
      school.swim(
        {
          seconds: now / 1000,
          epochMilliseconds: Date.now(),
          scrollY,
          scrollVelocity,
          viewportWidth: width,
          viewportHeight: height,
          dial: frame.dial,
        },
        deltaSeconds,
        scrollDelta
      )
    }
    for (const canvas of canvases.Water) {
      if (!isShown(canvas)) continue
      const ctx = fitCanvas(canvas, width, height)
      if (!ctx) continue
      drawBackdrop(ctx, frame)
      drawUnderwaterLayer(ctx, frame, school.all, now)
      drawGrain(ctx, frame, grain)
    }
    for (const canvas of canvases.Surface) {
      if (!isShown(canvas)) continue
      const ctx = fitCanvas(canvas, width, height)
      if (ctx) drawAirLayer(ctx, frame, school.all)
    }
    if (animate) frameId = requestAnimationFrame(render)
  }

  // On the Framer canvas nothing animates, so draw again whenever a layer is added.
  const redraw = () => {
    if (animate) return
    cancelAnimationFrame(frameId)
    frameId = requestAnimationFrame(render)
  }

  if (!reducedMotion) {
    window.addEventListener("pointermove", onMove, { passive: true })
    window.addEventListener("pointerdown", onDown, { passive: true })
  }
  window.addEventListener("resize", onResize)
  frameId = requestAnimationFrame(render)

  return {
    canvases,
    users: 0,
    redraw,
    stop: () => {
      cancelAnimationFrame(frameId)
      window.removeEventListener("pointermove", onMove)
      window.removeEventListener("pointerdown", onDown)
      window.removeEventListener("resize", onResize)
    },
  }
}

interface KoiPondProps {
  layer: LayerName
  style?: React.CSSProperties
}

/**
 * Place one "Water" instance behind the page and one "Surface" instance above it,
 * both fixed to the viewport with pointer events off.
 *
 * @framerSupportedLayoutWidth fixed
 * @framerSupportedLayoutHeight fixed
 */
export default function KoiPond({ layer = "Water", style }: KoiPondProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const animate = RenderTarget.current() === RenderTarget.preview || RenderTarget.current() === RenderTarget.export
    const live = typeof window !== "undefined" && !RenderTarget.hasRestrictions()
    const engine = (engineGlobal.__koiPondEngine ??= startEngine(animate && live))
    engine.canvases[layer].add(canvas)
    engine.users += 1
    engine.redraw()
    return () => {
      engine.canvases[layer].delete(canvas)
      engine.users -= 1
      if (engine.users <= 0) {
        engine.stop()
        engineGlobal.__koiPondEngine = undefined
      }
    }
  }, [layer])

  return (
    <div
      aria-hidden
      style={{
        ...style,
        pointerEvents: "none",
        background: layer === "Water" ? PALETTE.pondDeep : "transparent",
      }}
    >
      <canvas ref={canvasRef} style={{ display: "block", width: "100%", height: "100%" }} />
    </div>
  )
}

addPropertyControls(KoiPond, {
  layer: {
    type: ControlType.Enum,
    title: "Layer",
    options: ["Water", "Surface"],
    defaultValue: "Water",
    displaySegmentedControl: true,
  },
})
