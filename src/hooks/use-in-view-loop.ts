"use client";

import { useEffect, useRef } from "react";

/**
 * Runs a requestAnimationFrame loop only while the element is on screen and
 * the tab is visible. Draws a single still frame when the user prefers reduced motion.
 */
export function useInViewLoop<T extends HTMLElement>(
  draw: (time: number) => void,
  { stillTime = 2400 }: { stillTime?: number } = {}
) {
  const ref = useRef<T>(null);
  const drawRef = useRef(draw);
  useEffect(() => {
    drawRef.current = draw;
  });

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let raf = 0;
    let visible = false;

    const loop = (t: number) => {
      drawRef.current(t);
      raf = requestAnimationFrame(loop);
    };
    const start = () => {
      if (reduce) { drawRef.current(stillTime); return; }
      if (!raf && visible && !document.hidden) raf = requestAnimationFrame(loop);
    };
    const stop = () => { cancelAnimationFrame(raf); raf = 0; };

    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting;
      if (visible) start(); else stop();
    }, { rootMargin: "120px" });
    io.observe(el);
    const onVis = () => (document.hidden ? stop() : start());
    document.addEventListener("visibilitychange", onVis);
    drawRef.current(stillTime);

    return () => { stop(); io.disconnect(); document.removeEventListener("visibilitychange", onVis); };
  }, [stillTime]);

  return ref;
}

/** Sizes a canvas to its CSS box at device pixel ratio and returns the 2D context. */
export function fitCanvas(canvas: HTMLCanvasElement) {
  const r = canvas.getBoundingClientRect();
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const w = Math.max(1, Math.round(r.width * dpr));
  const h = Math.max(1, Math.round(r.height * dpr));
  if (canvas.width !== w || canvas.height !== h) {
    canvas.width = w;
    canvas.height = h;
  }
  const ctx = canvas.getContext("2d")!;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return { ctx, w: r.width, h: r.height };
}
