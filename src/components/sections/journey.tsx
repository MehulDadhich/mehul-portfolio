"use client";

import { useRef } from "react";
import { motion, useScroll, useSpring } from "motion/react";
import { journey, profile } from "@/lib/content";
import { SectionHeading } from "@/components/shared/section-heading";
import { Reveal } from "@/components/shared/reveal";
import { cn } from "@/lib/utils";
import { useWheelHoldProgress } from "@/components/wheel/wheel-context";

export function Journey() {
  const listRef = useRef<HTMLOListElement>(null);
  const { scrollYProgress } = useScroll({ target: listRef, offset: ["start 75%", "end 55%"] });
  // on the globe, the globe holds here until the timeline has fully drawn
  const progress = useWheelHoldProgress(listRef, 1.1, scrollYProgress);
  const fill = useSpring(progress, { stiffness: 120, damping: 30 });

  return (
    <section id="journey" aria-labelledby="journey-title" className="relative border-t border-line bg-ink-2/60">
      <div className="mx-auto grid max-w-[1400px] gap-14 px-4 py-24 sm:px-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)] lg:gap-20 lg:px-10 lg:py-24">
        <div className="flex flex-col gap-8 lg:sticky lg:top-28 lg:self-start">
          <SectionHeading
            index="06"
            eyebrow="About · Journey"
            detect="engineer 0.99"
            title={<span id="journey-title">How I got to building systems.</span>}
          />
          <Reveal className="flex max-w-[52ch] flex-col gap-4 text-[1.05rem] leading-relaxed text-soft">
            <p>{profile.summary}</p>
            <p>
              I like the part of AI that happens after the notebook: getting a model to run on a live stream, deciding what
              happens when it is unsure, and making the output useful to the person on the other end.
            </p>
          </Reveal>
        </div>

        <ol ref={listRef} className="relative flex flex-col gap-10 pl-10">
          <span className="absolute bottom-2 left-[11px] top-2 w-px bg-line" aria-hidden />
          <motion.span
            className="absolute bottom-2 left-[11px] top-2 w-px origin-top bg-gradient-to-b from-signal via-model to-reason"
            style={{ scaleY: fill }}
            aria-hidden
          />
          {journey.map((j, i) => {
            const last = i === journey.length - 1;
            return (
              <Reveal as="li" variant="left" key={j.phase} className="relative flex flex-col gap-2">
                <span
                  className={cn(
                    "absolute -left-10 top-1 grid size-[23px] place-items-center rounded-full border bg-ink-2",
                    last ? "border-signal" : "border-line-strong"
                  )}
                  aria-hidden
                >
                  <span className={cn("size-2 rounded-full", last ? "bg-signal animate-[pulse-dot_2s_ease-in-out_infinite]" : "bg-soft")} />
                </span>
                <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 font-mono text-[11.5px] uppercase tracking-[0.12em]">
                  <span className={last ? "text-signal" : "text-soft"}>{j.phase}</span>
                  {j.when ? <span className="text-dim">{j.when}</span> : null}
                </div>
                <h3 className="font-display text-xl font-semibold [font-stretch:108%] sm:text-2xl">{j.title}</h3>
                <p className="max-w-[58ch] leading-relaxed text-soft">{j.body}</p>
                {j.points ? (
                  <ul className="mt-1 flex flex-wrap gap-1.5">
                    {j.points.map((p) => (
                      <li key={p} className="rounded-md border border-line px-2 py-1 font-mono text-[11px] text-soft">{p}</li>
                    ))}
                  </ul>
                ) : null}
              </Reveal>
            );
          })}
        </ol>
      </div>
    </section>
  );
}
