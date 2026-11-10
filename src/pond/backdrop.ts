import type { Dial } from "./dial";
import type { PondPalette } from "./palette";
import { airRegion, surfaceLine, waterRegion } from "./water";

type Context = CanvasRenderingContext2D;

export type Frame = {
  width: number;
  height: number;
  scrollY: number;
  seconds: number;
  surfaceScreenY: number;
  dial: Dial;
  palette: PondPalette;
};

const GRAIN_SIZE = 160;

export function createGrain(): HTMLCanvasElement {
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

export function drawGrain(ctx: Context, frame: Frame, grain: HTMLCanvasElement) {
  const pattern = ctx.createPattern(grain, "repeat");
  if (!pattern) return;
  ctx.save();
  ctx.globalAlpha = 0.07;
  ctx.globalCompositeOperation = "overlay";
  ctx.fillStyle = pattern;
  ctx.fillRect(0, 0, frame.width, frame.height);
  ctx.restore();
}

export function drawBackdrop(ctx: Context, frame: Frame) {
  ctx.fillStyle = frame.palette.night;
  ctx.fillRect(0, 0, frame.width, frame.height);
  drawDialTicks(ctx, frame);
  drawWater(ctx, frame);
}
