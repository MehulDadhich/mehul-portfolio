"use client";

import { useRef } from "react";
import { motion, useMotionTemplate, useScroll, useTransform } from "motion/react";
import { profile } from "@/lib/content";
import { useWheelTrack } from "@/components/wheel/wheel-context";

/** Closing signature: an outlined name that fills with gold as the visitor reaches the end. */
export function Footer() {
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end end"] });
  const progress = useWheelTrack(ref, 1, 1, scrollYProgress);
  const fill = useTransform(progress, [0.05, 0.8], [0, 100]);
  const y = useTransform(progress, [0, 1], [60, 0]);
  // at 100% the right inset goes slightly negative so the last letter is never shaved off
  const remaining = useTransform(fill, (v) => (v >= 100 ? -2 : 100 - v));
  const clip = useMotionTemplate`inset(-10% ${remaining}% -10% 0)`;

  return (
    <footer ref={ref} className="relative overflow-hidden border-t border-line">
      <div className="mx-auto max-w-[1400px] px-4 pt-10 sm:px-6 lg:px-10">
        <motion.div style={{ y }} className="relative w-fit max-w-full select-none" aria-hidden>
          <span
            className="block w-max whitespace-nowrap font-display text-[clamp(2rem,4.8vw,5.5rem)] font-bold uppercase leading-[0.85] tracking-[-0.04em] text-transparent [font-stretch:125%] [-webkit-text-stroke:1px_var(--line-strong)]"
          >
            {profile.name}
          </span>
          <motion.span
            style={{ clipPath: clip }}
            className="absolute inset-y-0 left-0 block w-max whitespace-nowrap bg-gradient-to-r from-signal via-model to-reason bg-clip-text font-display text-[clamp(2rem,4.8vw,5.5rem)] font-bold uppercase leading-[0.85] tracking-[-0.04em] text-transparent [font-stretch:125%]"
          >
            {profile.name}
          </motion.span>
        </motion.div>
      </div>
      <div className="mx-auto flex max-w-[1400px] flex-col justify-between gap-3 px-4 py-8 font-mono text-[12px] text-dim sm:flex-row sm:px-6 lg:px-10">
        <span>© {new Date().getFullYear()} {profile.name}</span>
        <span>Built with Next.js, Motion, GSAP and Lenis · press Ctrl + K to ask Arc</span>
      </div>
    </footer>
  );
}
