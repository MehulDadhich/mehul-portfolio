"use client";

import { useEffect } from "react";
import Lenis from "lenis";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

let lenis: Lenis | null = null;

/** Scroll to a section id, through Lenis when it is running. */
export function scrollToId(id: string) {
  if (id === "top") { scrollToY(0); return; }
  const found = document.getElementById(id);
  if (!found) return;
  // A pinned section is moved around inside GSAP's pin-spacer; aim at the spacer instead,
  // whose position in the document never changes.
  const el = found.parentElement?.classList.contains("pin-spacer") ? found.parentElement : found;
  const y = el.getBoundingClientRect().top + window.scrollY - 72;
  scrollToY(Math.max(0, y));
}

/** Scroll to an absolute page offset. */
export function scrollToY(y: number) {
  if (lenis) lenis.scrollTo(y);
  else window.scrollTo({ top: y });
}

export function SmoothScroll() {
  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) return;

    lenis = new Lenis({ lerp: 0.11, wheelMultiplier: 1, autoRaf: false });
    lenis.on("scroll", ScrollTrigger.update);
    const tick = (time: number) => lenis?.raf(time * 1000);
    gsap.ticker.add(tick);
    gsap.ticker.lagSmoothing(0);

    return () => {
      gsap.ticker.remove(tick);
      lenis?.destroy();
      lenis = null;
    };
  }, []);

  return null;
}
