import type { KoiPose } from "./koi";
import type { PondPalette } from "./palette";
import type { Point } from "./pondState";
import { bodyPath, bodySides, eyes, pointOnBody, sideFins, tailFin, type FinGeometry } from "./koiShapes";

type Context = CanvasRenderingContext2D;

const KOHAKU_PATCHES: [spinePosition: number, side: number, radius: number][] = [
  [0.9, 0.1, 8.5],
  [1.7, -0.3, 6.5],
  [4.1, 0.25, 10.5],
  [5.1, -0.25, 9],
  [4.7, 0.6, 6],
  [8.1, -0.15, 7],
  [8.9, 0.3, 5],
];

function line(ctx: Context, from: Point, to: Point) {
  ctx.beginPath();
  ctx.moveTo(from.x, from.y);
  ctx.lineTo(to.x, to.y);
  ctx.stroke();
}

function polyline(ctx: Context, points: Point[]) {
  ctx.beginPath();
  points.forEach((point, index) => (index === 0 ? ctx.moveTo(point.x, point.y) : ctx.lineTo(point.x, point.y)));
  ctx.stroke();
}

function patchCircles(pose: KoiPose) {
  return KOHAKU_PATCHES.map(([spinePosition, side, radius]) => ({
    center: pointOnBody(pose, spinePosition, side),
    radius: radius * pose.scale,
  }));
}

function allFins(pose: KoiPose): FinGeometry[] {
  return [tailFin(pose), ...sideFins(pose)];
}

function strokeFinRays(ctx: Context, fins: FinGeometry[]) {
  for (const fin of fins) fin.rays.forEach(([from, to]) => line(ctx, from, to));
}

function drawWireframe(ctx: Context, pose: KoiPose) {
  const { left, right } = bodySides(pose);
  ctx.globalAlpha = 0.22;
  for (let index = 1; index < left.length - 1; index++) line(ctx, left[index], right[index]);
  ctx.globalAlpha = 0.12;
  for (let index = 1; index < left.length - 2; index++) line(ctx, left[index], right[index + 1]);
  ctx.globalAlpha = 0.25;
  polyline(ctx, pose.spine);
}

export function drawSketchKoi(ctx: Context, pose: KoiPose, palette: PondPalette) {
  const fins = allFins(pose);
  ctx.save();
  ctx.strokeStyle = palette.graphite;
  ctx.fillStyle = palette.paper;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.lineWidth = 0.7;

  ctx.globalAlpha = 1;
  fins.forEach((fin) => ctx.fill(fin.outline));
  ctx.fill(bodyPath(pose));
  ctx.globalAlpha = 0.3;
  strokeFinRays(ctx, fins);
  drawWireframe(ctx, pose);

  ctx.globalAlpha = 0.35;
  ctx.setLineDash([2, 2.5]);
  for (const patch of patchCircles(pose)) {
    ctx.beginPath();
    ctx.arc(patch.center.x, patch.center.y, patch.radius * 0.8, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.setLineDash([]);

  ctx.globalAlpha = 0.9;
  ctx.lineWidth = 1.15;
  fins.forEach((fin) => ctx.stroke(fin.outline));
  ctx.stroke(bodyPath(pose));

  ctx.globalAlpha = 1;
  ctx.fillStyle = palette.graphite;
  for (const eye of eyes(pose)) {
    ctx.beginPath();
    ctx.arc(eye.x, eye.y, 1.5 * pose.scale, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawShadow(ctx: Context, pose: KoiPose, body: Path2D, fins: FinGeometry[]) {
  ctx.save();
  ctx.shadowColor = "rgba(1, 4, 14, 0.6)";
  ctx.shadowBlur = 16 * pose.scale;
  ctx.shadowOffsetX = 10 * pose.scale;
  ctx.shadowOffsetY = 18 * pose.scale;
  ctx.globalAlpha = 0.9;
  fins.forEach((fin) => ctx.fill(fin.outline));
  ctx.fill(body);
  ctx.restore();
}

function drawPatchesAndShading(ctx: Context, pose: KoiPose, body: Path2D, palette: PondPalette) {
  ctx.save();
  ctx.clip(body);
  ctx.fillStyle = palette.koi;
  for (const patch of patchCircles(pose)) {
    ctx.beginPath();
    ctx.arc(patch.center.x, patch.center.y, patch.radius, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.strokeStyle = palette.pond;
  ctx.globalAlpha = 0.35;
  ctx.lineWidth = 4 * pose.scale;
  ctx.stroke(body);
  ctx.strokeStyle = "#ffffff";
  ctx.globalAlpha = 0.22;
  ctx.lineWidth = 4 * pose.scale;
  ctx.lineCap = "round";
  polyline(ctx, pose.spine.slice(1, 10));
  ctx.restore();
}

export function drawPaintedKoi(ctx: Context, pose: KoiPose, palette: PondPalette) {
  const body = bodyPath(pose);
  const fins = allFins(pose);
  ctx.save();
  ctx.fillStyle = palette.koiCream;
  drawShadow(ctx, pose, body, fins);

  ctx.globalAlpha = 0.5;
  fins.forEach((fin) => ctx.fill(fin.outline));
  ctx.strokeStyle = palette.koi;
  ctx.globalAlpha = 0.4;
  ctx.lineWidth = 0.8;
  strokeFinRays(ctx, fins);

  ctx.globalAlpha = 1;
  ctx.fill(body);
  drawPatchesAndShading(ctx, pose, body, palette);

  ctx.fillStyle = palette.pondDeep;
  for (const eye of eyes(pose)) {
    ctx.beginPath();
    ctx.arc(eye.x, eye.y, 1.5 * pose.scale, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}
