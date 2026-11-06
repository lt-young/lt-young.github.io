const TEXTURE_SIZE = 160;
const BRISTLE_COUNT = 220;

let bristles: HTMLCanvasElement | null = null;

function paintBristles() {
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

export function bristlePattern(ctx: CanvasRenderingContext2D, origin: { x: number; y: number }, angle: number, scale: number) {
  bristles ??= paintBristles();
  const pattern = ctx.createPattern(bristles, "repeat");
  if (!pattern) return null;
  pattern.setTransform(new DOMMatrix().translate(origin.x, origin.y).rotate((angle * 180) / Math.PI).scale(scale));
  return pattern;
}
