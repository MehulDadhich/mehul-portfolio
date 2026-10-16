"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { SkipForward, X } from "lucide-react";
import { haltScroll, maxScroll, offsetOfId, scrollOver } from "@/components/providers/smooth-scroll";

/**
 * Arc's guided tour: plays the whole site for the visitor. Each stop is scrolled through slowly, so the
 * scroll-driven animations (diffusion name, RoadGuard chapter, the flight between stations, the LiDAR street)
 * play as they would for a reader, with a caption saying what's on screen.
 *
 * Arc starts it with startTour() once the visitor says yes, and minimises while it runs; TOUR_ENDED tells Arc
 * to come back. Scrolling, touching or pressing a key hands control back to the visitor at once.
 */
const START = "md:start-tour";
export const TOUR_ENDED = "md:tour-ended";

export function startTour() {
  window.dispatchEvent(new Event(START));
}

/** In page order. Each stop runs from its anchor to the next one (the last to the end of the page). */
const STOPS = [
  { id: "top", title: "Intro", caption: "Mehul's name, drawn by a diffusion sampler: particles denoised into text, step by step." },
  { id: "featured", title: "RoadGuard", caption: "His accident-detection pipeline, played as you scroll: video → YOLO → tracking → rules → VLM → alert." },
  { id: "work", title: "Projects", caption: "Every project as a working pipeline. Ask Arc to open any project's architecture." },
  { id: "experience", title: "Experience", caption: "His AI engineering internship at Infrax.ai." },
  { id: "skills", title: "Skills", caption: "Skills grouped by area, each linked to the projects that used it." },
  { id: "journey", title: "Journey", caption: "Education, certifications and the path to his current work." },
  { id: "contact", title: "Contact", caption: "A street scanned as a live LiDAR point cloud, and every way to reach Mehul." },
] as const;

/** Viewports per second: slow enough to watch the scrubbed animations, about a minute and a half in all. */
const SPEED = 0.38;
const MIN_S = 4;
const MAX_S = 16;
/** How long a stop's caption shows before the scroll moves on. */
const READ_MS = 1400;

type Outcome = "arrived" | "skip" | "end";

export function SiteTour() {
  const [stop, setStop] = useState<number | null>(null);
  const card = useRef<HTMLDivElement>(null);
  /** resolves the step that's running: Next, End, or the visitor taking over */
  const interrupt = useRef<((o: Outcome) => void) | null>(null);
  const running = useRef(false);

  useEffect(() => {
    const wait = (ms: number) =>
      new Promise<Outcome>((resolve) => {
        const t = setTimeout(() => resolve("arrived"), ms);
        interrupt.current = (o) => { clearTimeout(t); resolve(o); };
      });
    const travel = (y: number, seconds: number) =>
      new Promise<Outcome>((resolve) => {
        interrupt.current = (o) => { haltScroll(); resolve(o); };
        void scrollOver(y, seconds).then(() => resolve("arrived"));
      });

    const run = async () => {
      if (running.current) return;
      running.current = true;
      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      const how = { ended: "done" as "done" | "stopped" | "taken" };
      const taken = (e: Event) => {
        if (e.target instanceof Node && card.current?.contains(e.target)) return;
        if (e instanceof KeyboardEvent && e.key === "Escape") { how.ended = "stopped"; interrupt.current?.("end"); return; }
        how.ended = "taken";
        interrupt.current?.("end");
      };
      const inputs = ["wheel", "touchstart", "pointerdown", "keydown"] as const;
      // after a beat, so the click on Arc's Yes button doesn't count as the visitor taking over
      const listen = setTimeout(() => inputs.forEach((t) => window.addEventListener(t, taken, { passive: true })), 400);

      try {
        await travel(0, Math.min(3, window.scrollY / window.innerHeight / 3));
        for (let i = 0; i < STOPS.length; i++) {
          setStop(i);
          const from = offsetOfId(STOPS[i].id);
          const next = i + 1 < STOPS.length ? offsetOfId(STOPS[i + 1].id) : maxScroll();
          if (from === null || next === null) continue;
          let o = await wait(READ_MS);
          if (o === "end") return;
          if (o === "skip") { await travel(next, 0.8); continue; }
          if (reduce) {
            // no scrubbed animation to watch: let the caption be read, then go straight to the next stop
            o = await wait(2600);
            if (o === "end") return;
            await travel(next, 0);
            continue;
          }
          const viewports = Math.abs(next - from) / window.innerHeight;
          o = await travel(next, Math.min(MAX_S, Math.max(MIN_S, viewports / SPEED)));
          if (o === "end") return;
          if (o === "skip") await travel(next, 0.8);
        }
        await wait(2500);
      } finally {
        clearTimeout(listen);
        inputs.forEach((t) => window.removeEventListener(t, taken));
        interrupt.current = null;
        running.current = false;
        setStop(null);
        // the visitor took over by scrolling: leave them reading, with Arc still minimised
        window.dispatchEvent(new CustomEvent(TOUR_ENDED, { detail: { reopen: how.ended !== "taken" } }));
      }
    };

    const onStart = () => void run();
    window.addEventListener(START, onStart);
    return () => {
      window.removeEventListener(START, onStart);
      interrupt.current?.("end");
    };
  }, []);

  const current = stop === null ? null : STOPS[stop];

  return (
    <AnimatePresence>
      {current ? (
        <motion.div
          ref={card}
          key="tour"
          role="status"
          aria-live="polite"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 16 }}
          transition={{ duration: 0.3 }}
          className="screen fixed bottom-[calc(4.75rem+env(safe-area-inset-bottom,0px))] left-4 right-4 z-50 flex flex-col gap-2 rounded-2xl border border-line-strong bg-panel/90 px-4 py-3 shadow-[0_24px_60px_-24px_rgb(0_0_0/0.9)] backdrop-blur-xl sm:left-6 sm:right-auto sm:w-[380px] md:bottom-6"
        >
          <div className="flex items-center justify-between gap-3">
            <p className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-dim">
              Guided tour · {stop! + 1} / {STOPS.length}
            </p>
            <div className="flex items-center gap-1">
              {stop! + 1 < STOPS.length ? (
                <button
                  type="button"
                  onClick={() => interrupt.current?.("skip")}
                  className="flex items-center gap-1 rounded-full border border-line-strong px-2.5 py-1 text-[12px] text-fg transition-colors hover:border-signal"
                >
                  <SkipForward className="size-3.5" aria-hidden /> Next
                </button>
              ) : null}
              <button
                type="button"
                onClick={() => interrupt.current?.("end")}
                aria-label="End the tour"
                className="grid size-7 place-items-center rounded-md text-soft transition-colors hover:bg-ink-2 hover:text-fg"
              >
                <X className="size-4" aria-hidden />
              </button>
            </div>
          </div>
          <AnimatePresence mode="wait">
            <motion.div key={current.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }}>
              <p className="font-display text-[15px] font-semibold tracking-tight text-fg [font-stretch:110%]">{current.title}</p>
              <p className="mt-0.5 text-[13px] leading-relaxed text-soft">{current.caption}</p>
            </motion.div>
          </AnimatePresence>
          <div className="flex gap-1" aria-hidden>
            {STOPS.map((s, i) => (
              <span key={s.id} className={i <= stop! ? "h-0.5 flex-1 rounded-full bg-signal" : "h-0.5 flex-1 rounded-full bg-line-strong"} />
            ))}
          </div>
          <p className="font-mono text-[10px] text-dim">Scroll or press Esc to take over</p>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
