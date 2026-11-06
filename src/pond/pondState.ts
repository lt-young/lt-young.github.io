export type Point = { x: number; y: number };

export type Ripple = Point & { bornAt: number; strength: number };

type PondState = {
  pointer: Point & { movedAt: number };
  lure: (Point & { until: number }) | null;
  surfacedElement: HTMLElement | null;
  ripples: Ripple[];
};

export const pondState: PondState = {
  pointer: { x: 0, y: 0, movedAt: -Infinity },
  lure: null,
  surfacedElement: null,
  ripples: [],
};

const MAX_RIPPLES = 24;

export function addRipple(documentPoint: Point, strength = 1) {
  pondState.ripples.push({ ...documentPoint, bornAt: performance.now(), strength });
  if (pondState.ripples.length > MAX_RIPPLES) pondState.ripples.shift();
}
