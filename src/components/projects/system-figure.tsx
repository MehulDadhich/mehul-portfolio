"use client";

import { useId, useRef, useState, type KeyboardEvent } from "react";
import { AnimatePresence, motion, useInView, useReducedMotion } from "motion/react";
import type { Stage } from "@/lib/content";
import { cn } from "@/lib/utils";

/**
 * A project's architecture set as a numbered journal figure. The stages sit on a rail; the hairline
 * connectors draw in left to right the first time the figure is seen, each stage ticking in as the line
 * reaches it. Selecting a stage (click, or ←/→ on the rail) shows its detail as the figure caption.
 * The rail is horizontal from md up and a vertical list on phones.
 */
export function SystemFigure({
  stages,
  fig = "1",
  title = "System",
  className,
}: {
  stages: Stage[];
  fig?: string;
  title?: string;
  className?: string;
}) {
  const reduce = useReducedMotion();
  const [active, setActive] = useState(0);
  const root = useRef<HTMLElement>(null);
  const seen = useInView(root, { once: true, margin: "0px 0px -15% 0px" });
  const play = seen && !reduce;
  const shown = seen || reduce;
  const captionId = useId();
  const btns = useRef<(HTMLButtonElement | null)[]>([]);
  const STEP = 0.11;

  const onKey = (e: KeyboardEvent) => {
    const last = stages.length - 1;
    const next =
      e.key === "ArrowRight" || e.key === "ArrowDown" ? (active + 1) % stages.length
      : e.key === "ArrowLeft" || e.key === "ArrowUp" ? (active + last) % stages.length
      : e.key === "Home" ? 0
      : e.key === "End" ? last
      : -1;
    if (next < 0) return;
    e.preventDefault();
    e.stopPropagation();
    setActive(next);
    btns.current[next]?.focus();
  };

  const s = stages[active];

  return (
    <figure ref={root} className={cn("flex flex-col gap-4", className)}>
      <figcaption className="label flex items-baseline gap-3">
        <span className="text-fg">Fig. {fig}</span>
        <span>{title} · {stages.length} stages · select one</span>
      </figcaption>

      <div
        role="tablist"
        aria-label={`${title} stages`}
        onKeyDown={onKey}
        className="relative grid grid-cols-1 gap-0 md:auto-cols-fr md:grid-flow-col"
      >
        {stages.map((st, i) => {
          const on = i === active;
          return (
            <div key={st.id} className="relative flex items-stretch md:flex-col">
              {/* connector to the next stage */}
              {i < stages.length - 1 ? (
                <motion.span
                  aria-hidden
                  className="absolute bg-line-strong max-md:left-[1.05rem] max-md:top-9 max-md:bottom-0 max-md:w-px md:left-9 md:right-0 md:top-[1.05rem] md:h-px"
                  style={{ originX: 0, originY: 0 }}
                  initial={reduce ? false : { scaleX: 0, scaleY: 0 }}
                  animate={shown ? { scaleX: 1, scaleY: 1 } : undefined}
                  transition={{ duration: 0.35, ease: [0.2, 0, 0, 1], delay: play ? 0.1 + i * STEP + 0.05 : 0 }}
                />
              ) : null}
              <motion.button
                ref={(el) => { btns.current[i] = el; }}
                type="button"
                role="tab"
                id={`${captionId}-t${i}`}
                aria-selected={on}
                aria-controls={captionId}
                tabIndex={on ? 0 : -1}
                onClick={() => setActive(i)}
                initial={reduce ? false : { opacity: 0, y: 6 }}
                animate={shown ? { opacity: 1, y: 0 } : undefined}
                transition={{ duration: 0.3, ease: [0.2, 0, 0, 1], delay: play ? 0.1 + i * STEP : 0 }}
                className="group relative z-10 flex min-h-11 items-center gap-3 py-1.5 text-left md:flex-col md:items-start md:gap-2.5 md:pr-3"
              >
                <span
                  className={cn(
                    "num grid size-[2.1rem] shrink-0 place-items-center rounded-full border text-[12px] transition-colors duration-200",
                    on ? "border-signal bg-signal text-on-signal" : "border-line-strong bg-ink text-soft group-hover:border-fg group-hover:text-fg"
                  )}
                >
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span className={cn("text-[14px] leading-snug transition-colors", on ? "text-fg" : "text-soft group-hover:text-fg")}>
                  {st.label}
                </span>
              </motion.button>
            </div>
          );
        })}
      </div>

      <div
        id={captionId}
        role="tabpanel"
        aria-labelledby={`${captionId}-t${active}`}
        tabIndex={0}
        aria-live="polite"
        className="grid min-h-[7.5rem] grid-cols-12 gap-x-6 border-t border-line pt-4"
      >
        <p className="label col-span-12 mb-2 md:col-span-3 md:mb-0">
          <span className="text-signal">{String(active + 1).padStart(2, "0")}</span> · {s.label}
        </p>
        <div className="col-span-12 md:col-span-9">
          <AnimatePresence mode="wait" initial={false}>
            <motion.p
              key={s.id}
              initial={reduce ? { opacity: 0 } : { opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18, ease: [0.2, 0, 0, 1] }}
              className="measure text-[1.02rem] leading-[1.65]"
            >
              {s.detail}
            </motion.p>
          </AnimatePresence>
        </div>
      </div>
    </figure>
  );
}
