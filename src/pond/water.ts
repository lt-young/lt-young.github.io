const SURFACE_FRACTION_OF_FIRST_SCREEN = 0.9;

export function surfaceDocumentY(viewportHeight: number) {
  return viewportHeight * SURFACE_FRACTION_OF_FIRST_SCREEN;
}

export function surfaceOffset(x: number, seconds: number) {
  return 7 * Math.sin(x * 0.006 + seconds * 0.7) + 3 * Math.sin(x * 0.017 - seconds * 1.1);
}

export function isUnderwater(documentX: number, documentY: number, viewportHeight: number, seconds: number) {
  return documentY > surfaceDocumentY(viewportHeight) + surfaceOffset(documentX, seconds);
}

const SAMPLE_STEP = 16;

function traceSurface(path: Path2D, width: number, surfaceScreenY: number, seconds: number) {
  for (let x = width; x >= 0; x -= SAMPLE_STEP) {
    path.lineTo(x, surfaceScreenY + surfaceOffset(x, seconds));
  }
  path.lineTo(0, surfaceScreenY + surfaceOffset(0, seconds));
}

export function waterRegion(width: number, height: number, surfaceScreenY: number, seconds: number) {
  const path = new Path2D();
  path.moveTo(0, height + 50);
  path.lineTo(width, height + 50);
  traceSurface(path, width, surfaceScreenY, seconds);
  path.closePath();
  return path;
}

export function airRegion(width: number, surfaceScreenY: number, seconds: number) {
  const path = new Path2D();
  path.moveTo(0, -50);
  path.lineTo(width, -50);
  traceSurface(path, width, surfaceScreenY, seconds);
  path.closePath();
  return path;
}

export function surfaceLine(width: number, surfaceScreenY: number, seconds: number) {
  const path = new Path2D();
  path.moveTo(width, surfaceScreenY + surfaceOffset(width, seconds));
  traceSurface(path, width, surfaceScreenY, seconds);
  return path;
}
