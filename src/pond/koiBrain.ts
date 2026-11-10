import { pointOnDial, secondHandAngle, type Dial } from "./dial";
import { pondState, type Point } from "./pondState";
import { isUnderwater, surfaceDocumentY } from "./water";

export type Goal = { target: Point; speed: number };

export type Surroundings = {
  seconds: number;
  epochMilliseconds: number;
  scrollY: number;
  scrollVelocity: number;
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

export const ESCORT_PERSONALITY = 4;

export function hasLeftTheDial(world: Surroundings) {
  return world.scrollY > world.viewportHeight * 0.6;
}

export function timekeeperGoal(world: Surroundings, swimmer: Swimmer, school: Swimmer[]): Goal {
  if (hasLeftTheDial(world)) return pondKoiGoal(world, swimmer, ESCORT_PERSONALITY, school);
  const goal = lureGoal(world, swimmer) ?? curiosityGoal(world, swimmer) ?? secondHandGoal(world, swimmer);
  return withCatchUp(goal, swimmer);
}

function circlingGoal(world: Surroundings, swimmer: Swimmer): Goal | null {
  const element = pondState.surfacedElement;
  if (!element) return null;
  const rect = element.getBoundingClientRect();
  const angle = world.seconds * 0.16;
  const visibleTop = Math.max(rect.top, 0);
  const visibleBottom = Math.min(rect.bottom, world.viewportHeight);
  const halfHeight = Math.max(0, (visibleBottom - visibleTop) / 2);
  const target = {
    x: rect.left + rect.width / 2 + Math.cos(angle) * (rect.width / 2 + 36 * swimmer.scale),
    y: world.scrollY + visibleTop + halfHeight + Math.sin(angle) * (halfHeight + 24 * swimmer.scale),
  };
  return { target, speed: 62 * swimmer.scale };
}

const MAX_CURRENT_LEAD = 0.35;

function currentLead(world: Surroundings) {
  const lead = world.scrollVelocity * 0.5;
  const limit = world.viewportHeight * MAX_CURRENT_LEAD;
  return Math.max(-limit, Math.min(limit, lead));
}

// A slow figure-eight drift across the whole width of the page: wide, sweeping S-curves
// rather than darting about. Each koi runs the same loop at its own pace and offset.
function wanderGoal(world: Surroundings, swimmer: Swimmer, personality: number): Goal {
  const time = world.seconds + personality * 23;
  const pace = 0.06 + personality * 0.012;
  const lowestAllowed = surfaceDocumentY(world.viewportHeight) + 90 * swimmer.scale;
  const target = {
    x: world.viewportWidth * (0.5 + 0.42 * Math.sin(time * pace)),
    y: Math.max(
      lowestAllowed,
      world.scrollY +
        currentLead(world) +
        world.viewportHeight * (0.5 + 0.22 * Math.sin(time * pace * 2 + personality)),
    ),
  };
  const drift = Math.min(220, Math.abs(world.scrollVelocity) * 0.3);
  return { target, speed: (34 + personality * 6) * swimmer.scale + drift };
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
