export type Dial = { centerX: number; centerY: number; radius: number };

export const DIAL_CENTER_FRACTION = 0.45;

export function dialFor(viewportWidth: number, viewportHeight: number): Dial {
  return {
    centerX: viewportWidth / 2,
    centerY: viewportHeight * DIAL_CENTER_FRACTION,
    radius: Math.min(viewportWidth * 0.4, viewportHeight * 0.31),
  };
}

export function secondHandAngle(epochMilliseconds: number) {
  const secondsIntoMinute = (epochMilliseconds / 1000) % 60;
  return (secondsIntoMinute / 60) * Math.PI * 2 - Math.PI / 2;
}

export function pointOnDial(dial: Dial, angle: number) {
  return { x: dial.centerX + Math.cos(angle) * dial.radius, y: dial.centerY + Math.sin(angle) * dial.radius };
}
