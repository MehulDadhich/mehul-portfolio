"use client";

import { useEffect, useRef } from "react";
import { animate, useInView, useReducedMotion } from "motion/react";

/**
 * Counts a metric up from zero the first time it scrolls into view.
 * Keeps any prefix/suffix (e.g. "26.9 ms", "99.14%") and the original number of decimals.
 */
export function CountUp({ value, className }: { value: string; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "0px 0px -15% 0px" });
  const reduce = useReducedMotion();
  useEffect(() => {
    const el = ref.current;
    const match = value.match(/^([^\d]*)([\d,]*\.?\d+)(.*)$/);
    if (!el || !match || reduce || !inView) return;
    const [, pre, num, suf] = match;
    const target = parseFloat(num.replace(/,/g, ""));
    const decimals = (num.split(".")[1] || "").length;
    const controls = animate(0, target, {
      duration: 1.6,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (v) => { el.textContent = `${pre}${v.toFixed(decimals)}${suf}`; },
    });
    return () => controls.stop();
  }, [inView, reduce, value]);

  return (
    <span ref={ref} className={className}>
      {value}
    </span>
  );
}
