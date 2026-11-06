import { pointOnDial, secondHandAngle, type Dial } from "./dial";
import { pondState, type Point } from "./pondState";
import { isUnderwater, surfaceDocumentY } from "./water";

export type Goal = { target: Point; speed: number };

export type Surroundings = {
  seconds: number;
  epochMilliseconds: number;
  scrollY: number;
  viewportWidth: number;
  viewportHeight: number;
  dial: Dial;
};

export type Swimmer = { head: Point; scale: number };

const CURIOSITY_SECONDS = 3;
const SECOND_HAND_LEAD = 0.35;
const PERSONAL_SPACE = 95;

const distance = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);

function withCatchUp(goal: Goal, swimmer: Swimmer): Goal {
  const gap = distance(goal.target, swimmer.head);
  if (gap < 320 * swimmer.scale) return goal;
  return { ...goal, speed: Math.max(goal.speed, Math.min(gap * 1.2, 900 * swimmer.scale)) };
}

function lureGoal(world: Surroundings, swimmer: Swimmer): Goal | null {
  const lure = pondState.lure;
  if (!lure || world.seconds > lure.until) return null;
  return { target: lure, speed: 240 * swimmer.scale };
}

function curiosityGoal(world: Surroundings, swimmer: Swimmer): Goal | null {
  if (world.seconds - pondState.pointer.movedAt > CURIOSITY_SECONDS) return null;
  if (world.scrollY > world.viewportHeight * 0.5) return null;
  const pointer = { x: pondState.pointer.x, y: pondState.pointer.y + world.scrollY };
  const nearDial = distance(pointer, { x: world.dial.centerX, y: world.dial.centerY }) < world.dial.radius * 1.3;
  const inAir = !isUnderwater(pointer.x, pointer.y, world.viewportHeight, world.seconds);
  if (!nearDial || !inAir) return null;
  const gap = distance(pointer, swimmer.head);
  return { target: pointer, speed: Math.min(gap * 1.2, 120 * swimmer.scale) + 12 * swimmer.scale };
}

function secondHandGoal(world: Surroundings, swimmer: Swimmer): Goal {
  const angle = secondHandAngle(world.epochMilliseconds);
  const orbitSpeed = (world.dial.radius * Math.PI * 2) / 60;
  const lagging = distance(pointOnDial(world.dial, angle), swimmer.head) > 40 * swimmer.scale;
  const target = pointOnDial(world.dial, angle + SECOND_HAND_LEAD);
  return { target, speed: lagging ? Math.max(orbitSpeed, 160 * swimmer.scale) : orbitSpeed };
}

export function timekeeperGoal(world: Surroundings, swimmer: Swimmer): Goal {
  const goal = lureGoal(world, swimmer) ?? curiosityGoal(world, swimmer) ?? secondHandGoal(world, swimmer);
  return withCatchUp(goal, swimmer);
}

function circlingGoal(world: Surroundings, swimmer: Swimmer): Goal | null {
  const element = pondState.surfacedElement;
  if (!element) return null;
  const rect = element.getBoundingClientRect();
  const angle = world.seconds * 0.22;
  const visibleTop = Math.max(rect.top, 0);
  const visibleBottom = Math.min(rect.bottom, world.viewportHeight);
  const halfHeight = Math.max(0, (visibleBottom - visibleTop) / 2);
  const target = {
    x: rect.left + rect.width / 2 + Math.cos(angle) * (rect.width / 2 + 36 * swimmer.scale),
    y: world.scrollY + visibleTop + halfHeight + Math.sin(angle) * (halfHeight + 24 * swimmer.scale),
  };
  return { target, speed: 80 * swimmer.scale };
}

function wanderGoal(world: Surroundings, swimmer: Swimmer, personality: number): Goal {
  const time = world.seconds + personality * 17;
  const lowestAllowed = surfaceDocumentY(world.viewportHeight) + 90 * swimmer.scale;
  const target = {
    x: world.viewportWidth * (0.5 + 0.38 * Math.sin(time * (0.09 + personality * 0.025))),
    y: Math.max(
      lowestAllowed,
      world.scrollY + world.viewportHeight * (0.5 + 0.36 * Math.sin(time * (0.15 + personality * 0.03) + personality)),
    ),
  };
  return { target, speed: (45 + personality * 8) * swimmer.scale };
}

function keepApart(goal: Goal, swimmer: Swimmer, school: Swimmer[]): Goal {
  const push = { x: 0, y: 0 };
  for (const other of school) {
    if (other === swimmer) continue;
    const gap = distance(other.head, swimmer.head);
    const space = PERSONAL_SPACE * swimmer.scale;
    if (gap === 0 || gap > space) continue;
    const strength = ((space - gap) / space) * 120 * swimmer.scale;
    push.x += ((swimmer.head.x - other.head.x) / gap) * strength;
    push.y += ((swimmer.head.y - other.head.y) / gap) * strength;
  }
  return { ...goal, target: { x: goal.target.x + push.x, y: goal.target.y + push.y } };
}

export function pondKoiGoal(world: Surroundings, swimmer: Swimmer, personality: number, school: Swimmer[]): Goal {
  const leadsTheCircle = personality === 0;
  const goal =
    lureGoal(world, swimmer) ??
    (leadsTheCircle ? circlingGoal(world, swimmer) : null) ??
    wanderGoal(world, swimmer, personality);
  return withCatchUp(keepApart(goal, swimmer, school), swimmer);
}
