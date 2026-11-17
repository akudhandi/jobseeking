"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Measure an element's box. Charts need the real pixel height to draw the
 * highlighted-column background and the dashed marker line themselves, because
 * Recharts only hands a custom shape the bar's own rectangle.
 */
export function useMeasure<T extends HTMLElement = HTMLDivElement>() {
  const ref = useRef<T | null>(null);
  const [box, setBox] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const update = () => {
      const rect = node.getBoundingClientRect();
      setBox({ width: rect.width, height: rect.height });
    };
    update();
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(update);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return { ref, box };
}
