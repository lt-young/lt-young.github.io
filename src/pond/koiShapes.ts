import type { KoiPose } from "./koi";
import type { Point } from "./pondState";

const add = (a: Point, b: Point, k = 1): Point => ({ x: a.x + b.x * k, y: a.y + b.y * k });
const midpoint = (a: Point, b: Point): Point => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });

function unit(from: Point, to: Point): Point {
  const length = Math.hypot(to.x - from.x, to.y - from.y) || 1;
  return { x: (to.x - from.x) / length, y: (to.y - from.y) / length };
}

function rotate(vector: Point, angle: number): Point {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  return { x: vector.x * cos - vector.y * sin, y: vector.x * sin + vector.y * cos };
}

export function bodySides(pose: KoiPose) {
  const left = pose.spine.map((point, index) => add(point, pose.normals[index], pose.halfWidths[index]));
  const right = pose.spine.map((point, index) => add(point, pose.normals[index], -pose.halfWidths[index]));
  return { left, right };
}

function smoothThrough(path: Path2D, points: Point[]) {
  for (let index = 0; index < points.length - 1; index++) {
    const control = points[index];
    const end = midpoint(points[index], points[index + 1]);
    path.quadraticCurveTo(control.x, control.y, end.x, end.y);
  }
  const last = points[points.length - 1];
  path.lineTo(last.x, last.y);
}

export function bodyPath(pose: KoiPose) {
  const { left, right } = bodySides(pose);
  const forward = unit(pose.spine[1], pose.spine[0]);
  const noseRadius = pose.halfWidths[0];
  const nose = add(pose.spine[0], forward, noseRadius * 1.1);
  const path = new Path2D();
  path.moveTo(nose.x, nose.y);
  const leftNoseControl = add(left[0], forward, noseRadius);
  path.quadraticCurveTo(leftNoseControl.x, leftNoseControl.y, left[0].x, left[0].y);
  smoothThrough(path, left.slice(1));
  smoothThrough(path, right.slice(0, -1).reverse());
  const rightNoseControl = add(right[0], forward, noseRadius);
  path.quadraticCurveTo(rightNoseControl.x, rightNoseControl.y, nose.x, nose.y);
  path.closePath();
  return path;
}

export type FinGeometry = { outline: Path2D; rays: [Point, Point][] };

export function tailFin(pose: KoiPose): FinGeometry {
  const last = pose.spine.length - 1;
  const base = pose.spine[last];
  const sway = Math.sin(pose.phase - last * 0.55) * 0.45;
  const back = rotate(unit(pose.spine[last - 1], base), sway);
  const side = { x: -back.y, y: back.x };
  const s = pose.scale;
  const tipA = add(add(base, back, 32 * s), side, 18 * s);
  const tipB = add(add(base, back, 32 * s), side, -18 * s);
  const notch = add(base, back, 17 * s);
  const outline = new Path2D();
  const start = add(base, side, 2 * s);
  outline.moveTo(start.x, start.y);
  const controlA = add(add(base, back, 10 * s), side, 13 * s);
  outline.quadraticCurveTo(controlA.x, controlA.y, tipA.x, tipA.y);
  const notchControlA = add(notch, side, 4 * s);
  outline.quadraticCurveTo(notchControlA.x, notchControlA.y, notch.x, notch.y);
  const notchControlB = add(notch, side, -4 * s);
  outline.quadraticCurveTo(notchControlB.x, notchControlB.y, tipB.x, tipB.y);
  const controlB = add(add(base, back, 10 * s), side, -13 * s);
  const end = add(base, side, -2 * s);
  outline.quadraticCurveTo(controlB.x, controlB.y, end.x, end.y);
  outline.closePath();
  const rays: [Point, Point][] = [0.2, 0.45, 0.7].flatMap((t) => [
    [base, add(add(base, back, 27 * s), side, 17 * s * (1 - t))],
    [base, add(add(base, back, 27 * s), side, -17 * s * (1 - t))],
  ]);
  return { outline, rays };
}

function sideFin(pose: KoiPose, spineIndex: number, sideSign: number, length: number): FinGeometry {
  const anchorPoint = pose.spine[spineIndex];
  const normal = pose.normals[spineIndex];
  const back = unit(pose.spine[spineIndex - 1], anchorPoint);
  const anchor = add(anchorPoint, normal, sideSign * pose.halfWidths[spineIndex] * 0.8);
  const spread = 0.95 + 0.3 * Math.sin(pose.phase * 0.6 + sideSign);
  const direction = add({ x: back.x * Math.cos(spread), y: back.y * Math.cos(spread) }, normal, sideSign * Math.sin(spread));
  const across = { x: -direction.y, y: direction.x };
  const s = pose.scale * length;
  const tip = add(anchor, direction, 15 * s);
  const outerControl = add(add(anchor, direction, 10 * s), across, 8 * s);
  const innerControl = add(add(anchor, direction, 9 * s), across, -3 * s);
  const outline = new Path2D();
  outline.moveTo(anchor.x, anchor.y);
  outline.quadraticCurveTo(outerControl.x, outerControl.y, tip.x, tip.y);
  outline.quadraticCurveTo(innerControl.x, innerControl.y, anchor.x, anchor.y);
  outline.closePath();
  const rays: [Point, Point][] = [0.35, 0.65].map((t) => [anchor, add(add(anchor, direction, 13 * s), across, (t - 0.4) * 6 * s)]);
  return { outline, rays };
}

export function sideFins(pose: KoiPose): FinGeometry[] {
  return [
    sideFin(pose, 3, 1, 1.35),
    sideFin(pose, 3, -1, 1.35),
    sideFin(pose, 8, 1, 0.55),
    sideFin(pose, 8, -1, 0.55),
  ];
}

export function pointOnBody(pose: KoiPose, spinePosition: number, sideFraction: number): Point {
  const index = Math.min(pose.spine.length - 2, Math.floor(spinePosition));
  const t = spinePosition - index;
  const blend = (a: Point, b: Point) => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
  const center = blend(pose.spine[index], pose.spine[index + 1]);
  const normal = blend(pose.normals[index], pose.normals[index + 1]);
  const halfWidth = pose.halfWidths[index] + (pose.halfWidths[index + 1] - pose.halfWidths[index]) * t;
  return add(center, normal, sideFraction * halfWidth);
}

export function eyes(pose: KoiPose): Point[] {
  return [pointOnBody(pose, 0.7, 0.62), pointOnBody(pose, 0.7, -0.62)];
}
