import { pointOnDial, secondHandAngle, type Dial } from "./dial";
import { pondState, type Point } from "./pondState";
import { isUnderwater } from "./water";

export type Goal = { target: Point; speed: number };

export type Surroundings = {
  head: Point;
  scale: number;
  seconds: number;
  epochMilliseconds: number;
  scrollY: number;
  viewportWidth: number;
  viewportHeight: number;
  dial: Dial;
};

const CURIOSITY_SECONDS = 3;
const SECOND_HAND_LEAD = 0.35;

const distance = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);

function withCatchUp(goal: Goal, head: Point, scale: number): Goal {
  const gap = distance(goal.target, head);
  if (gap < 320 * scale) return goal;
  return { ...goal, speed: Math.max(goal.speed, Math.min(gap * 1.2, 900 * scale)) };
}

function lureGoal(world: Surroundings): Goal | null {
  const lure = pondState.lure;
  if (!lure || world.seconds > lure.until) return null;
  return { target: lure, speed: 240 * world.scale };
}

function documentPointer(world: Surroundings): Point {
  return { x: pondState.pointer.x, y: pondState.pointer.y + world.scrollY };
}

function curiosityGoal(world: Surroundings): Goal | null {
  if (world.seconds - pondState.pointer.movedAt > CURIOSITY_SECONDS) return null;
  const pointer = documentPointer(world);
  const nearDial = distance(pointer, { x: world.dial.centerX, y: world.dial.centerY }) < world.dial.radius * 1.3;
  const inAir = !isUnderwater(pointer.x, pointer.y, world.viewportHeight, world.seconds);
  if (!nearDial || !inAir) return null;
  const gap = distance(pointer, world.head);
  return { target: pointer, speed: Math.min(gap * 1.2, 120 * world.scale) + 12 * world.scale };
}

function secondHandGoal(world: Surroundings): Goal {
  const angle = secondHandAngle(world.epochMilliseconds);
  const orbitSpeed = (world.dial.radius * Math.PI * 2) / 60;
  const handPosition = pointOnDial(world.dial, angle);
  const lagging = distance(handPosition, world.head) > 40 * world.scale;
  const target = pointOnDial(world.dial, angle + SECOND_HAND_LEAD);
  return { target, speed: lagging ? Math.max(orbitSpeed, 160 * world.scale) : orbitSpeed };
}

function heroGoal(world: Surroundings): Goal | null {
  if (world.scrollY > world.viewportHeight * 0.5) return null;
  return curiosityGoal(world) ?? secondHandGoal(world);
}

function circlingGoal(world: Surroundings): Goal | null {
  const element = pondState.surfacedElement;
  if (!element) return null;
  const rect = element.getBoundingClientRect();
  const angle = world.seconds * 0.22;
  const visibleTop = Math.max(rect.top, 0);
  const visibleBottom = Math.min(rect.bottom, world.viewportHeight);
  const halfHeight = Math.max(0, (visibleBottom - visibleTop) / 2);
  const target = {
    x: rect.left + rect.width / 2 + Math.cos(angle) * (rect.width / 2 + 36 * world.scale),
    y: world.scrollY + visibleTop + halfHeight + Math.sin(angle) * (halfHeight + 24 * world.scale),
  };
  return { target, speed: 80 * world.scale };
}

function wanderGoal(world: Surroundings): Goal {
  const target = {
    x: world.viewportWidth * (0.5 + 0.32 * Math.sin(world.seconds * 0.13)),
    y: world.scrollY + world.viewportHeight * (0.5 + 0.3 * Math.sin(world.seconds * 0.21)),
  };
  return { target, speed: 55 * world.scale };
}

export function chooseGoal(world: Surroundings): Goal {
  const goal = lureGoal(world) ?? heroGoal(world) ?? circlingGoal(world) ?? wanderGoal(world);
  return withCatchUp(goal, world.head, world.scale);
}
