import { BODY_POINTS, type KoiPose } from "./koi";
import type { Patch } from "./koiPattern";
import type { Point } from "./pondState";

const add = (a: Point, b: Point, k = 1): Point => ({ x: a.x + b.x * k, y: a.y + b.y * k });
const midpoint = (a: Point, b: Point): Point => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });

function unit(from: Point, to: Point): Point {
  const length = Math.hypot(to.x - from.x, to.y - from.y) || 1;
  return { x: (to.x - from.x) / length, y: (to.y - from.y) / length };
}

export function forwardOf(pose: KoiPose) {
  return unit(pose.spine[1], pose.spine[0]);
}

export function smoothPath(points: Point[], path = new Path2D(), closed = false) {
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

export function pointOnBody(pose: KoiPose, spinePosition: number, sideFraction: number): Point {
  const clamped = Math.max(0, Math.min(BODY_POINTS - 1.001, spinePosition));
  const index = Math.floor(clamped);
  const t = clamped - index;
  const blend = (a: Point, b: Point) => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
  const center = blend(pose.spine[index], pose.spine[index + 1]);
  const normal = blend(pose.normals[index], pose.normals[index + 1]);
  const halfWidth = pose.halfWidths[index] + (pose.halfWidths[index + 1] - pose.halfWidths[index]) * t;
  return add(center, normal, sideFraction * Math.max(halfWidth, pose.scale * 3));
}

export function bodyPath(pose: KoiPose) {
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

export function patchOutline(pose: KoiPose, patch: Patch, shrink = 1, jitter = 0) {
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

export function tailStrands(pose: KoiPose): Point[][] {
  const base = BODY_POINTS - 2;
  const tail = pose.spine.slice(base);
  const spread = 15 * pose.scale;
  return [-1, -0.66, -0.33, 0, 0.33, 0.66, 1].map((lane) => {
    const lengthShare = 0.6 + 0.4 * Math.abs(lane);
    const usable = Math.max(2, Math.round(tail.length * lengthShare));
    return tail.slice(0, usable).map((point, index) => {
      const opening = Math.pow(index / (tail.length - 1), 0.75);
      return add(point, pose.normals[base + index], lane * spread * opening);
    });
  });
}

export type SideFin = { outline: Path2D; rays: Point[][] };

function sideFin(pose: KoiPose, spineIndex: number, sideSign: number, length: number): SideFin {
  const anchorPoint = pose.spine[spineIndex];
  const normal = pose.normals[spineIndex];
  const back = unit(pose.spine[spineIndex - 1], anchorPoint);
  const anchor = add(anchorPoint, normal, sideSign * pose.halfWidths[spineIndex] * 0.92);
  const spread = 0.9 + 0.3 * Math.sin(pose.phase * 0.6 + sideSign);
  const outward = { x: normal.x * sideSign, y: normal.y * sideSign };
  const direction = add({ x: back.x * Math.cos(spread), y: back.y * Math.cos(spread) }, outward, Math.sin(spread));
  const s = pose.scale * length;
  const tip = add(anchor, direction, 20 * s);
  const leading = add(add(anchor, direction, 7 * s), outward, 11 * s);
  const trailing = add(add(anchor, direction, 12 * s), back, 4 * s);
  const outline = smoothPath([anchor, leading, tip, trailing], new Path2D(), true);
  const between = (a: Point, b: Point, t: number) => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
  const rays = [between(anchor, leading, 0.9), between(leading, tip, 0.5), tip, between(tip, trailing, 0.5)].map(
    (end) => [anchor, end],
  );
  return { outline, rays };
}

export function sideFins(pose: KoiPose): SideFin[] {
  return [sideFin(pose, 3, 1, 1.7), sideFin(pose, 3, -1, 1.7), sideFin(pose, 9, 1, 0.8), sideFin(pose, 9, -1, 0.8)];
}

export function barbels(pose: KoiPose): Point[][] {
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

export function eyes(pose: KoiPose): Point[] {
  return [pointOnBody(pose, 0.75, 0.72), pointOnBody(pose, 0.75, -0.72)];
}

export function streakPoints(pose: KoiPose, side: number, from: number, to: number): Point[] {
  const steps = 6;
  return Array.from({ length: steps + 1 }, (_, step) => pointOnBody(pose, from + ((to - from) * step) / steps, side));
}
