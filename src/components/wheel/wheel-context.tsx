"use client";

import { createContext, useContext, useEffect, useState, type RefObject } from "react";
import { useMotionValue, type MotionValue } from "motion/react";

/** Same condition as the wheel itself: big screens that allow motion. */
export const WHEEL_QUERY = "(min-width: 1024px) and (prefers-reduced-motion: no-preference)";

export type Hold = { el: HTMLElement; lengthVh: number; onProgress: (p: number) => void };
export type Track = { el: HTMLElement; start: number; end: number; onProgress: (p: number) => void };

export type WheelApi = {
  /** Pause the wheel (and the panel's own scrolling) for `lengthVh` screens of scroll once `el` reaches the top of its panel. */
  addHold: (hold: Hold) => () => void;
  /**
   * Progress of `el` moving through its panel: 0 when its top is at `start` (fraction of panel height),
   * 1 when its bottom is at `end`. The wheel's version of motion's useScroll offsets.
   */
  addTrack: (track: Track) => () => void;
  /** Page offset at which `el`'s hold is `p` complete. */
  holdScrollY: (el: HTMLElement, p: number) => number | null;
};

export const WheelContext = createContext<WheelApi | null>(null);

/** Live wheel position for things outside the wheel (the LiDAR backdrop turns with it). */
export const wheelState = { active: false, angle: 0, progress: 0 };

export function useWheel() {
  return useContext(WheelContext);
}

/** True on screens where the sections sit on the wheel. */
export function useWheelActive() {
  const [on, setOn] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia(WHEEL_QUERY);
    const sync = () => setOn(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);
  return on;
}

/**
 * Progress of a hold on the wheel as a MotionValue: the wheel stops on `ref` for `lengthVh` screens of
 * scroll while this goes 0 → 1, so the animation it drives always finishes before the wheel turns.
 * When the wheel is off it follows `fallback` (ordinary page-scroll progress).
 */
export function useWheelHoldProgress(ref: RefObject<HTMLElement | null>, lengthVh: number, fallback: MotionValue<number>): MotionValue<number> {
  const api = useWheel();
  const active = useWheelActive();
  const value = useMotionValue(fallback.get());
  useEffect(() => {
    if (api && active && ref.current) return api.addHold({ el: ref.current, lengthVh, onProgress: (p) => value.set(p) });
    value.set(fallback.get());
    return fallback.on("change", (v) => value.set(v));
  }, [api, active, ref, lengthVh, value, fallback]);
  return value;
}

/**
 * Progress of an element through its wheel panel, as a MotionValue. When the wheel is off it follows
 * `fallback` (the element's ordinary page-scroll progress from motion's useScroll) instead.
 */
export function useWheelTrack(ref: RefObject<HTMLElement | null>, start: number, end: number, fallback: MotionValue<number>): MotionValue<number> {
  const api = useWheel();
  const active = useWheelActive();
  const value = useMotionValue(fallback.get());
  useEffect(() => {
    if (api && active && ref.current) return api.addTrack({ el: ref.current, start, end, onProgress: (p) => value.set(p) });
    value.set(fallback.get());
    return fallback.on("change", (v) => value.set(v));
  }, [api, active, ref, start, end, value, fallback]);
  return value;
}
