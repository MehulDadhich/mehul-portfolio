"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";
import { useGSAP } from "@gsap/react";
import { motion, useMotionValue, useReducedMotion, useSpring } from "motion/react";
import { cn } from "@/lib/utils";

gsap.registerPlugin(useGSAP, ScrollTrigger, SplitText);

/**
 * Text that rises into place out of a mask the first time it scrolls into view, by word or by character.
 * The text stays real (selectable, read once by screen readers); reduced motion shows it as is.
 */
export function SplitReveal({
  children,
  as: Tag = "p",
  by = "words",
  className,
  delay = 0,
  stagger,
  id,
}: {
  children: ReactNode;
  as?: "p" | "h2" | "h3" | "span" | "div";
  by?: "words" | "chars";
  className?: string;
  delay?: number;
  stagger?: number;
  id?: string;
}) {
  const ref = useRef<HTMLElement>(null);
  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        const split = SplitText.create(ref.current!, { type: by === "chars" ? "lines,words,chars" : "lines,words", mask: "lines" });
        gsap.from(by === "chars" ? split.chars : split.words, {
          yPercent: 115,
          rotate: by === "chars" ? 6 : 0,
          duration: by === "chars" ? 0.9 : 1.1,
          ease: "expo.out",
          stagger: stagger ?? (by === "chars" ? 0.018 : 0.045),
          delay,
          scrollTrigger: { trigger: ref.current, start: "top 85%" },
        });
        return () => split.revert();
      });
    },
    { scope: ref }
  );
  const El = Tag as "p";
  return (
    <El ref={ref as never} id={id} className={className}>
      {children}
    </El>
  );
}

const GLYPHS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#%&*+=<>/";

/** Decodes from random glyphs into the real text when it enters view, like a label resolving. */
export function Scramble({ text, className, delay = 0 }: { text: string; className?: string; delay?: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let raf = 0;
    let timer: ReturnType<typeof setTimeout>;
    const run = () => {
      const start = performance.now();
      const dur = 380 + text.length * 45;
      const tick = (now: number) => {
        const p = Math.min(1, (now - start) / dur);
        const fixed = Math.floor(p * text.length);
        el.textContent = text
          .split("")
          .map((ch, i) => (i < fixed || ch === " " ? ch : GLYPHS[Math.floor(Math.random() * GLYPHS.length)]))
          .join("");
        if (p < 1) raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    };
    const io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return;
      io.disconnect();
      timer = setTimeout(run, delay * 1000);
    }, { rootMargin: "0px 0px -10% 0px" });
    io.observe(el);
    return () => { io.disconnect(); cancelAnimationFrame(raf); clearTimeout(timer); };
  }, [text, delay]);
  return (
    <span ref={ref} className={className} aria-label={text}>
      {text}
    </span>
  );
}

/** Pulls its child toward the cursor on a spring while hovered (fine pointers only). */
export function Magnetic({ children, strength = 0.3, className }: { children: ReactNode; strength?: number; className?: string }) {
  const reduce = useReducedMotion();
  const x = useMotionValue(0), y = useMotionValue(0);
  const sx = useSpring(x, { stiffness: 220, damping: 18, mass: 0.4 });
  const sy = useSpring(y, { stiffness: 220, damping: 18, mass: 0.4 });
  return (
    <motion.span
      className={cn("inline-flex", className)}
      style={reduce ? undefined : { x: sx, y: sy }}
      onPointerMove={(e) => {
        if (reduce || e.pointerType !== "mouse") return;
        const r = e.currentTarget.getBoundingClientRect();
        x.set((e.clientX - (r.left + r.width / 2)) * strength);
        y.set((e.clientY - (r.top + r.height / 2)) * strength);
      }}
      onPointerLeave={() => { x.set(0); y.set(0); }}
    >
      {children}
    </motion.span>
  );
}
