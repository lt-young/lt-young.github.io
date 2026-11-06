import type { Frame } from "./backdrop";

type Context = CanvasRenderingContext2D;

type Swirl = { x: number; y: number; radius: number; start: number; sweep: number; width: number; alpha: number; spin: number };
type Fleck = { x: number; y: number; length: number; angle: number; drift: number; golden: boolean };

const TILE_HEIGHT = 1500;
const SWIRL_COUNT = 30;
const FLECK_COUNT = 12;

const between = (low: number, high: number) => low + Math.random() * (high - low);

const swirls: Swirl[] = Array.from({ length: SWIRL_COUNT }, () => ({
  x: Math.random(),
  y: Math.random() * TILE_HEIGHT,
  radius: between(50, 280),
  start: Math.random() * Math.PI * 2,
  sweep: between(0.3, 1),
  width: between(1.5, 7),
  alpha: between(0.04, 0.13),
  spin: between(-0.05, 0.05),
}));

const flecks: Fleck[] = Array.from({ length: FLECK_COUNT }, () => ({
  x: Math.random(),
  y: Math.random() * TILE_HEIGHT,
  length: between(5, 11),
  angle: Math.random() * Math.PI,
  drift: between(-6, 6),
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
  ctx.globalCompositeOperation = "screen";
  for (let index = 0; index < 3; index++) {
    const offset = ((frame.seconds * (6 + index * 3) + index * 520) % (frame.width + 800)) - 400;
    const shaft = ctx.createLinearGradient(offset, 0, offset + 220 + index * 60, frame.height * 0.25);
    shaft.addColorStop(0, "rgba(191, 233, 230, 0)");
    shaft.addColorStop(0.5, `rgba(191, 233, 230, ${0.035 + index * 0.01})`);
    shaft.addColorStop(1, "rgba(191, 233, 230, 0)");
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

export function drawWaterLight(ctx: Context, frame: Frame) {
  const tiles = visibleTiles(frame);
  ctx.save();
  drawShafts(ctx, frame);
  drawSwirls(ctx, frame, tiles);
  drawFlecks(ctx, frame, tiles);
  ctx.restore();
}
