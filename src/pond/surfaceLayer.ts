import type { Koi } from "./koi";
import { drawInkKoi, drawPaintedKoi } from "./koiDrawing";
import type { Frame } from "./backdrop";
import { pondState } from "./pondState";
import { airRegion, waterRegion } from "./water";
import { drawWaterLight } from "./waterLight";

type Context = CanvasRenderingContext2D;

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
  return school.filter((koi) => isOnScreen(koi, frame)).map((koi) => koi.pose(frame.scrollY));
}

// Drawn on the backdrop canvas, beneath the page content, so koi glide under the work.
export function drawUnderwaterLayer(ctx: Context, frame: Frame, school: Koi[], nowMilliseconds: number) {
  ctx.save();
  ctx.clip(waterRegion(frame.width, frame.height, frame.surfaceScreenY, frame.seconds));
  drawRipples(ctx, frame, nowMilliseconds);
  visiblePoses(frame, school).forEach((pose) => drawPaintedKoi(ctx, pose, frame.palette));
  drawWaterLight(ctx, frame);
  ctx.restore();
}

// Drawn above the page content: only the ink koi that leap into the air around the clock.
export function drawAirLayer(ctx: Context, frame: Frame, school: Koi[]) {
  ctx.clearRect(0, 0, frame.width, frame.height);
  ctx.save();
  ctx.clip(airRegion(frame.width, frame.surfaceScreenY, frame.seconds));
  visiblePoses(frame, school).forEach((pose) => drawInkKoi(ctx, pose, frame.palette));
  ctx.restore();
}
