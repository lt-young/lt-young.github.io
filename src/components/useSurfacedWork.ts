import { useCallback, useEffect, useRef, useState } from "react";
import { pondState } from "../pond/pondState";

const SURFACING_BAND = 0.42;

function nearestToCenter(elements: Map<string, HTMLElement>) {
  const viewportCenter = window.innerHeight / 2;
  let nearestId: string | null = null;
  let nearestGap = window.innerHeight * SURFACING_BAND;
  for (const [id, element] of elements) {
    const rect = element.getBoundingClientRect();
    const gap = Math.abs(rect.top + rect.height / 2 - viewportCenter);
    if (gap < nearestGap) {
      nearestGap = gap;
      nearestId = id;
    }
  }
  return nearestId;
}

export function useSurfacedWork() {
  const elements = useRef(new Map<string, HTMLElement>());
  const [scrolledId, setScrolledId] = useState<string | null>(null);
  const [pointedId, setPointedId] = useState<string | null>(null);
  const surfacedId = pointedId ?? scrolledId;

  useEffect(() => {
    let frame = 0;
    const update = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => setScrolledId(nearestToCenter(elements.current)));
    };
    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, []);

  useEffect(() => {
    pondState.surfacedElement = surfacedId ? (elements.current.get(surfacedId) ?? null) : null;
  }, [surfacedId]);

  const register = useCallback(
    (id: string) => (element: HTMLElement | null) => {
      if (element) elements.current.set(id, element);
      else elements.current.delete(id);
    },
    [],
  );

  return { surfacedId, register, setPointedId };
}
