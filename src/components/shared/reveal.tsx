"use client";

import type { ReactNode } from "react";
import { motion, useReducedMotion } from "motion/react";

type Variant = "up" | "tilt" | "left" | "pop";

const FROM: Record<Variant, Record<string, number>> = {
  up: { opacity: 0.15, y: 22 },
  tilt: { opacity: 0, y: 46, rotateX: 14, scale: 0.97 },
  left: { opacity: 0, x: -28 },
  pop: { opacity: 0, scale: 0.9, y: 12 },
};

/**
 * Animates content in as it enters the viewport. "tilt" swings cards up out of depth,
 * "left" slides rows in, "pop" springs small items in.
 */
export function Reveal({
  children,
  className,
  delay = 0,
  as = "div",
  variant = "up",
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
  as?: "div" | "li" | "article";
  variant?: Variant;
}) {
  const reduce = useReducedMotion();
  const Comp = motion[as];
  if (reduce) return <Comp className={className}>{children}</Comp>;
  const to = { opacity: 1, x: 0, y: 0, rotateX: 0, scale: 1 };
  return (
    <Comp
      className={className}
      style={variant === "tilt" ? { transformPerspective: 1000, transformOrigin: "50% 100%" } : undefined}
      initial={FROM[variant]}
      whileInView={to}
      viewport={{ once: true, margin: "0px 0px -10% 0px" }}
      transition={
        variant === "pop"
          ? { type: "spring", stiffness: 260, damping: 20, delay }
          : { duration: variant === "tilt" ? 1 : 0.8, ease: [0.16, 1, 0.3, 1], delay }
      }
    >
      {children}
    </Comp>
  );
}
