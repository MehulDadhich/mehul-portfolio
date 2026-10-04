"use client";

import { useEffect, useState } from "react";
import { useReducedMotion } from "motion/react";
import { cn } from "@/lib/utils";

const stages = [
  { key: "Data", color: "text-signal", samples: ["rtsp://cam-07 · 25 fps", "webcam · 1280×720", "clip.mp4 · H.264"] },
  { key: "Vision", color: "text-model", samples: ["car 0.91 · #14", "truck 0.88 · #31", "person 0.93 · #7"] },
  { key: "Reasoning", color: "text-reason", samples: ["LSTM 30-step → verify", "VLM: accident? yes", "speed drop on #14"] },
  { key: "Decision", color: "text-alert", samples: ["alert · clip saved", "incident → operator", "snapshot · 30 s clip"] },
];

/** The opening story in one line: data becomes a decision. */
export function SignalPath({ className }: { className?: string }) {
  const reduce = useReducedMotion();
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (reduce) return;
    const id = setInterval(() => { if (!document.hidden) setStep((s) => s + 1); }, 1100);
    return () => clearInterval(id);
  }, [reduce]);

  const active = reduce ? 3 : step % 4;
  const round = Math.floor(step / 4) % 3;

  return (
    <div className={cn("relative", className)} aria-label="Data flows through vision and reasoning into a decision">
      <div className="absolute left-[12.5%] right-[12.5%] top-[7px] h-px bg-line-strong" aria-hidden />
      <div
        className="absolute top-[7px] h-px bg-gradient-to-r from-signal to-reason transition-[width] duration-700 ease-out left-[12.5%]"
        style={{ width: `${(active / 3) * 75}%` }}
        aria-hidden
      />
      <ol className="relative grid grid-cols-4">
        {stages.map((s, i) => {
          const on = i <= active;
          return (
            <li key={s.key} className="flex min-w-0 flex-col items-center gap-2.5 text-center">
              <span
                className={cn(
                  "size-[15px] rounded-full border transition-all duration-500",
                  on ? "border-transparent bg-fg shadow-[0_0_0_4px_color-mix(in_srgb,var(--signal)_18%,transparent)]" : "border-line-strong bg-ink"
                )}
                aria-hidden
              />
              <span className={cn("font-mono text-[11px] uppercase tracking-[0.14em] transition-colors", on ? s.color : "text-dim")}>
                {s.key}
              </span>
              <span className={cn("hidden max-w-full truncate font-mono text-[11px] transition-opacity duration-500 sm:block", i === active ? "text-soft opacity-100" : "text-dim opacity-60")}>
                {s.samples[round]}
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
