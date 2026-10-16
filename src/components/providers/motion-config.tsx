"use client";

import type { ReactNode } from "react";
import { MotionConfig } from "motion/react";

/** Every Motion animation on the site follows the visitor's reduced-motion setting, layout animations included. */
export function MotionProvider({ children }: { children: ReactNode }) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}
