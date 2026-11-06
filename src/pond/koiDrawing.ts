import type { KoiPose } from "./koi";
import type { KoiVariety } from "./koiPattern";
import type { PondPalette } from "./palette";
import type { Point } from "./pondState";
import { bristlePattern } from "./brushTexture";
import {
  barbels,
  bodyPath,
  forwardOf,
  eyes,
  patchOutline,
  sideFins,
  smoothPath,
  streakPoints,
  tailStrands,
  type SideFin,
} from "./koiShapes";

type Context = CanvasRenderingContext2D;

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

function strokeRays(ctx: Context, fins: SideFin[], width: number) {
  ctx.lineWidth = width;
  for (const fin of fins) {
    for (const ray of fin.rays) ctx.stroke(smoothPath(ray));
  }
}

function tailMembrane(strands: Point[][]) {
  const outerLeft = strands[0];
  const outerRight = strands[strands.length - 1];
  return smoothPath([...outerLeft, ...[...outerRight].reverse()], new Path2D(), true);
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

export function drawInkKoi(ctx: Context, pose: KoiPose, palette: PondPalette) {
  const body = bodyPath(pose);
  const fins = sideFins(pose);
  const strands = tailStrands(pose);
  ctx.save();
  ctx.strokeStyle = palette.chalk;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  ctx.fillStyle = palette.night;
  ctx.fill(tailMembrane(strands));
  strands.forEach((strand, index) => strokeLine(ctx, strand, index === 0 || index === strands.length - 1 ? 1.7 : 0.9));
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
  ctx.lineWidth = 0.9;
  barbels(pose).forEach((barbel) => ctx.stroke(smoothPath(barbel)));
  drawEyes(ctx, pose, palette.chalk, null);
  ctx.restore();
}

function drawShadow(ctx: Context, pose: KoiPose, body: Path2D, fins: SideFin[]) {
  ctx.save();
  ctx.shadowColor = "rgba(1, 4, 14, 0.55)";
  ctx.shadowBlur = 18 * pose.scale;
  ctx.shadowOffsetX = 10 * pose.scale;
  ctx.shadowOffsetY = 20 * pose.scale;
  ctx.globalAlpha = 0.85;
  fins.forEach((fin) => ctx.fill(fin.outline));
  ctx.fill(body);
  ctx.restore();
}

function drawFeatheredTail(ctx: Context, pose: KoiPose, palette: PondPalette) {
  const strands = tailStrands(pose);
  ctx.fillStyle = palette.koiCream;
  ctx.globalAlpha = 0.78;
  ctx.fill(tailMembrane(strands));
  ctx.strokeStyle = palette.koiCream;
  ctx.globalAlpha = 0.55;
  strands.forEach((strand) => strokeLine(ctx, strand, 3.2 * pose.scale));
  ctx.strokeStyle = "#ffffff";
  ctx.globalAlpha = 0.95;
  strands.forEach((strand) => strokeLine(ctx, strand, 1 * pose.scale));
  ctx.globalAlpha = 1;
}

function drawTranslucentFins(ctx: Context, pose: KoiPose, fins: SideFin[], palette: PondPalette) {
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
  strokeLine(ctx, pose.spine.slice(1, 10), 5 * pose.scale);
  ctx.globalAlpha = 1;
}

export function drawPaintedKoi(ctx: Context, pose: KoiPose, palette: PondPalette) {
  const body = bodyPath(pose);
  const fins = sideFins(pose);
  ctx.save();
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  ctx.fillStyle = palette.koiCream;
  drawShadow(ctx, pose, body, fins);
  drawFeatheredTail(ctx, pose, palette);
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
  drawEyes(ctx, pose, palette.pondDeep, palette.koiCream);
  ctx.restore();
}
