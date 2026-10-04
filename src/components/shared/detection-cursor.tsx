"use client";

import { useEffect, useRef } from "react";
import { gsap } from "gsap";

const TARGETS = "a, button, [role='tab'], [data-cursor]";

function labelFor(el: HTMLElement) {
  const custom = el.dataset.cursor;
  if (custom) return custom;
  const kind = el.tagName === "A" ? "link" : "button";
  const text = (el.getAttribute("aria-label") || el.textContent || "").replace(/\s+/g, " ").trim().toLowerCase();
  const short = text.length > 20 ? `${text.slice(0, 19)}…` : text;
  // a stable pseudo-confidence per label so it does not flicker
  let h = 0;
  for (const c of short) h = (h * 31 + c.charCodeAt(0)) % 997;
  return `${short || kind} ${(0.9 + (h % 9) / 100).toFixed(2)}`;
}

/**
 * A cursor that behaves like a tracker: a small reticle follows the pointer and, over
 * anything clickable, snaps into a bounding box with a class label. Mouse only.
 */
export function DetectionCursor() {
  const box = useRef<HTMLDivElement>(null);
  const label = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const fine = window.matchMedia("(pointer: fine) and (prefers-reduced-motion: no-preference)");
    const el = box.current, lab = label.current;
    if (!fine.matches || !el || !lab) return;

    const set = {
      x: gsap.quickTo(el, "x", { duration: 0.35, ease: "power3.out" }),
      y: gsap.quickTo(el, "y", { duration: 0.35, ease: "power3.out" }),
      w: gsap.quickTo(el, "width", { duration: 0.35, ease: "power3.out" }),
      h: gsap.quickTo(el, "height", { duration: 0.35, ease: "power3.out" }),
    };
    const RET = 26;
    let target: HTMLElement | null = null;
    let mx = -100, my = -100;

    const place = () => {
      if (target && target.isConnected) {
        const r = target.getBoundingClientRect();
        el.dataset.flip = r.top < 40 ? "true" : "false";
        set.x(r.left - 6); set.y(r.top - 6); set.w(r.width + 12); set.h(r.height + 12);
      } else {
        set.x(mx - RET / 2); set.y(my - RET / 2); set.w(RET); set.h(RET);
      }
    };
    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      mx = e.clientX; my = e.clientY;
      gsap.to(el, { autoAlpha: 1, duration: 0.2, overwrite: "auto" });
      place();
    };
    const onOver = (e: PointerEvent) => {
      const t = (e.target as HTMLElement).closest<HTMLElement>(TARGETS);
      if (t === target) return;
      target = t;
      el.dataset.locked = t ? "true" : "false";
      lab.textContent = t ? labelFor(t) : "";
      place();
    };
    const onLeave = () => gsap.to(el, { autoAlpha: 0, duration: 0.2 });
    const onScroll = () => { if (target) place(); };
    const onDown = () => gsap.fromTo(el, { scale: 0.94 }, { scale: 1, duration: 0.35, ease: "back.out(3)" });

    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerover", onOver, { passive: true });
    window.addEventListener("pointerdown", onDown, { passive: true });
    document.documentElement.addEventListener("pointerleave", onLeave);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerover", onOver);
      window.removeEventListener("pointerdown", onDown);
      document.documentElement.removeEventListener("pointerleave", onLeave);
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  return (
    <div
      ref={box}
      aria-hidden
      data-locked="false"
      className="detect-cursor pointer-events-none fixed left-0 top-0 z-[70] hidden size-[26px] opacity-0 [@media(pointer:fine)]:block motion-reduce:!hidden"
    >
      <span className="dc-corner left-0 top-0 border-l border-t" />
      <span className="dc-corner right-0 top-0 border-r border-t" />
      <span className="dc-corner bottom-0 left-0 border-b border-l" />
      <span className="dc-corner bottom-0 right-0 border-b border-r" />
      <span className="dc-dot" />
      <span ref={label} className="dc-label" />
    </div>
  );
}
