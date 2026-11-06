import type { Koi } from "./koi";
import { drawPaintedKoi, drawSketchKoi } from "./koiDrawing";
import type { Frame } from "./backdrop";
import { pondState } from "./pondState";
import { airRegion, waterRegion } from "./water";

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

export function drawSurfaceLayer(ctx: Context, frame: Frame, koi: Koi, nowMilliseconds: number) {
  ctx.clearRect(0, 0, frame.width, frame.height);
  const pose = koi.pose(frame.scrollY);

  ctx.save();
  ctx.clip(waterRegion(frame.width, frame.height, frame.surfaceScreenY, frame.seconds));
  drawRipples(ctx, frame, nowMilliseconds);
  drawPaintedKoi(ctx, pose, frame.palette);
  ctx.restore();

  ctx.save();
  ctx.clip(airRegion(frame.width, frame.surfaceScreenY, frame.seconds));
  drawSketchKoi(ctx, pose, frame.palette);
  ctx.restore();
}
