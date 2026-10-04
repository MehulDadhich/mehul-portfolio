"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";

const EVENT = "md:detect";

export function toggleDetectMode() {
  const root = document.documentElement;
  const on = root.dataset.detect !== "on";
  root.dataset.detect = on ? "on" : "off";
  window.dispatchEvent(new CustomEvent(EVENT, { detail: on }));
}

/**
 * Type "yolo" anywhere (outside inputs) to run the page through a detector:
 * key elements get bounding boxes and class labels. Type it again to turn it off.
 */
export function EasterEgg() {
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    console.log(
      "%c● detector online%c\nYou opened the console, so you probably like knowing how things work.\nThis site is Next.js + Motion + GSAP + Lenis. Type “yolo” on the page.\n— Mehul · mehuldadhich1103@gmail.com",
      "color:#e9c46a;font:600 12px monospace",
      "color:#aaa496;font:12px monospace"
    );
    let buffer = "";
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (t.closest("input, textarea, [contenteditable]") || e.metaKey || e.ctrlKey || e.altKey) return;
      buffer = (buffer + e.key.toLowerCase()).slice(-4);
      if (buffer === "yolo") { buffer = ""; toggleDetectMode(); }
    };
    let timer: ReturnType<typeof setTimeout>;
    const onDetect = (e: Event) => {
      const on = (e as CustomEvent<boolean>).detail;
      setToast(on ? "Detection mode on. Type “yolo” again to turn it off." : "Detection mode off.");
      clearTimeout(timer);
      timer = setTimeout(() => setToast(null), 2600);
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener(EVENT, onDetect);
    return () => { window.removeEventListener("keydown", onKey); window.removeEventListener(EVENT, onDetect); clearTimeout(timer); };
  }, []);

  return (
    <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-6 z-50 flex justify-center px-4">
      <AnimatePresence>
        {toast ? (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            className="rounded-md border border-signal/40 bg-ink-2/95 px-4 py-2.5 font-mono text-[12px] text-signal shadow-lg"
          >
            {toast}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
