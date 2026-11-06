import { useEffect, useRef } from "react";
import { createGrain, drawBackdrop, type Frame } from "./backdrop";
import { dialFor } from "./dial";
import { readPalette, type PondPalette } from "./palette";
import { addRipple, pondState } from "./pondState";
import { School } from "./school";
import { surfaceDocumentY, isUnderwater } from "./water";
import { drawSurfaceLayer } from "./surfaceLayer";

const RIPPLE_SPACING = 70;
const LURE_SECONDS = 2.2;

function fitCanvas(canvas: HTMLCanvasElement, width: number, height: number) {
  const ratio = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.round(width * ratio);
  canvas.height = Math.round(height * ratio);
  const ctx = canvas.getContext("2d");
  ctx?.setTransform(ratio, 0, 0, ratio, 0, 0);
  return ctx;
}

function buildFrame(seconds: number, palette: PondPalette): Frame {
  const width = window.innerWidth;
  const height = window.innerHeight;
  const scrollY = window.scrollY;
  return {
    width,
    height,
    scrollY,
    seconds,
    surfaceScreenY: surfaceDocumentY(height) - scrollY,
    dial: dialFor(width, height),
    palette,
  };
}

function useWaterInteractions(enabled: boolean) {
  useEffect(() => {
    if (!enabled) return;
    let lastRipple = { x: -Infinity, y: -Infinity };
    const documentPoint = (event: PointerEvent) => ({ x: event.clientX, y: event.clientY + window.scrollY });
    const overWater = (point: { x: number; y: number }) =>
      isUnderwater(point.x, point.y, window.innerHeight, performance.now() / 1000);

    const onMove = (event: PointerEvent) => {
      pondState.pointer = { x: event.clientX, y: event.clientY, movedAt: performance.now() / 1000 };
      const point = documentPoint(event);
      if (!overWater(point) || Math.hypot(point.x - lastRipple.x, point.y - lastRipple.y) < RIPPLE_SPACING) return;
      lastRipple = point;
      addRipple(point, 0.45);
    };
    const onDown = (event: PointerEvent) => {
      const point = documentPoint(event);
      if (!overWater(point)) return;
      addRipple(point, 1.6);
      pondState.lure = { ...point, until: performance.now() / 1000 + LURE_SECONDS };
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerdown", onDown, { passive: true });
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerdown", onDown);
    };
  }, [enabled]);
}

function prefersReducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function Pond() {
  const backdropRef = useRef<HTMLCanvasElement>(null);
  const surfaceRef = useRef<HTMLCanvasElement>(null);
  const reducedMotion = prefersReducedMotion();
  useWaterInteractions(!reducedMotion);

  useEffect(() => {
    const backdropCanvas = backdropRef.current;
    const surfaceCanvas = surfaceRef.current;
    if (!backdropCanvas || !surfaceCanvas) return;
    let backdrop = fitCanvas(backdropCanvas, window.innerWidth, window.innerHeight);
    let surface = fitCanvas(surfaceCanvas, window.innerWidth, window.innerHeight);
    const grain = createGrain();
    const palette = readPalette();
    const school = new School(window.innerWidth, window.innerHeight);
    let previous = performance.now();
    let previousScrollY = window.scrollY;
    let scrollVelocity = 0;
    let frameId = 0;

    const onResize = () => {
      backdrop = fitCanvas(backdropCanvas, window.innerWidth, window.innerHeight);
      surface = fitCanvas(surfaceCanvas, window.innerWidth, window.innerHeight);
      school.resize(window.innerWidth, window.innerHeight);
    };

    const render = (now: number) => {
      const deltaSeconds = Math.min(0.05, (now - previous) / 1000);
      previous = now;
      const frame = buildFrame(reducedMotion ? 0 : now / 1000, palette);
      const scrollDelta = frame.scrollY - previousScrollY;
      previousScrollY = frame.scrollY;
      if (deltaSeconds > 0) scrollVelocity += (scrollDelta / deltaSeconds - scrollVelocity) * 0.12;
      if (!reducedMotion) {
        school.swim(
          {
            seconds: now / 1000,
            epochMilliseconds: Date.now(),
            scrollY: frame.scrollY,
            scrollVelocity,
            viewportWidth: frame.width,
            viewportHeight: frame.height,
            dial: frame.dial,
          },
          deltaSeconds,
          scrollDelta,
        );
      }
      if (backdrop) drawBackdrop(backdrop, frame, grain);
      if (surface) drawSurfaceLayer(surface, frame, school.all, now);
      frameId = requestAnimationFrame(render);
    };

    frameId = requestAnimationFrame(render);
    window.addEventListener("resize", onResize);
    return () => {
      cancelAnimationFrame(frameId);
      window.removeEventListener("resize", onResize);
    };
  }, [reducedMotion]);

  return (
    <>
      <canvas ref={backdropRef} aria-hidden className="pointer-events-none fixed inset-0 z-0 h-full w-full" />
      <canvas ref={surfaceRef} aria-hidden className="pointer-events-none fixed inset-0 z-30 h-full w-full" />
    </>
  );
}
