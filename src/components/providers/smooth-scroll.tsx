"use client";

import { useEffect } from "react";
import Lenis from "lenis";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

let lenis: Lenis | null = null;

/** Height of the sticky masthead, so anchored sections don't land underneath it. */
const HEADER = 64;

/** Scroll to a section id, through Lenis when it is running. */
export function scrollToId(id: string) {
  if (id === "top") { scrollToY(0); return; }
  const el = document.getElementById(id);
  if (!el) return;
  scrollToY(Math.max(0, el.getBoundingClientRect().top + window.scrollY - HEADER));
  // move keyboard focus with the reader, without letting the browser jump the scroll
  if (!el.hasAttribute("tabindex")) el.setAttribute("tabindex", "-1");
  el.focus({ preventScroll: true });
}

/** Scroll to an absolute page offset. */
export function scrollToY(y: number) {
  if (lenis) lenis.scrollTo(y);
  else window.scrollTo({ top: y, behavior: "smooth" });
}

/** Where a section starts, as a page offset (the same spot scrollToId lands on). */
export function offsetOfId(id: string): number | null {
  if (id === "top") return 0;
  const el = document.getElementById(id);
  return el ? Math.max(0, el.getBoundingClientRect().top + window.scrollY - HEADER) : null;
}

/** The furthest the page can scroll. */
export function maxScroll(): number {
  return lenis ? lenis.limit : document.documentElement.scrollHeight - window.innerHeight;
}

/**
 * Scroll to `y` over `seconds`, so scrubbed animations play at a watchable pace; resolves when it arrives.
 * Without Lenis (reduced motion) it jumps, since there is no animation to watch.
 */
export function scrollOver(y: number, seconds: number): Promise<void> {
  if (!lenis || seconds <= 0) {
    if (lenis) lenis.scrollTo(y, { immediate: true, force: true });
    else window.scrollTo({ top: y });
    return Promise.resolve();
  }
  const l = lenis;
  return new Promise((resolve) => {
    l.scrollTo(y, {
      duration: seconds,
      easing: (t) => 0.5 - Math.cos(Math.PI * t) / 2,
      force: true,
      onComplete: () => resolve(),
    });
  });
}

/** Stops a scroll started by scrollOver where it is. */
export function haltScroll() {
  if (lenis) lenis.scrollTo(lenis.scroll, { immediate: true, force: true });
}

/** Pauses page scrolling while a sheet or dialog is open. */
export function lockScroll(locked: boolean) {
  if (locked) lenis?.stop();
  else lenis?.start();
}

/** Smoothed scroll, synced with ScrollTrigger. Off under reduced motion. */
export function SmoothScroll() {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    lenis = new Lenis({ lerp: 0.1, wheelMultiplier: 1, autoRaf: false, prevent: (node) => !!node.closest("[data-lenis-prevent]") });
    // one clock for everything: Lenis advances on GSAP's ticker and tells ScrollTrigger when it moves,
    // so pinned, scrubbed chapters stay locked to the smoothed scroll
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
