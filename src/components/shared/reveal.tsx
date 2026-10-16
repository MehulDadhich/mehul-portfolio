"use client";

import type { ReactNode } from "react";
import { motion, useReducedMotion } from "motion/react";

/**
 * Lifts content 10px into place the first time it enters the viewport. Played once; nothing bounces.
 * With reduced motion the content is simply there.
 */
export function Reveal({
  children,
  className,
  delay = 0,
  as = "div",
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
  as?: "div" | "li" | "article" | "section";
}) {
  const reduce = useReducedMotion();
  const Comp = motion[as];
  if (reduce) return <Comp className={className}>{children}</Comp>;
  return (
    <Comp
      className={className}
      initial={{ opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "0px 0px -8% 0px" }}
      transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1], delay }}
    >
      {children}
    </Comp>
  );
}
