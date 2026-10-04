"use client";

import { useEffect, useRef, useState } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { useReducedMotion } from "motion/react";
import { Lock } from "lucide-react";
import { projects, roadguardLessons, roadguardMetrics } from "@/lib/content";
import { SectionHeading } from "@/components/shared/section-heading";
import { Reveal } from "@/components/shared/reveal";
import { CountUp } from "@/components/shared/count-up";
import { cn } from "@/lib/utils";
import { scrollToY } from "@/components/providers/smooth-scroll";
import { PipelineScene } from "./pipeline-scene";

gsap.registerPlugin(ScrollTrigger, useGSAP);

const roadguard = projects.find((p) => p.id === "roadguard")!;
const STAGES = roadguard.architecture;
const DESKTOP = "(min-width: 1024px) and (prefers-reduced-motion: no-preference)";

export function Featured() {
  const reduce = useReducedMotion();
  const pinRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<ScrollTrigger | null>(null);
  const [stage, setStage] = useState(0);
  const [scrollDriven, setScrollDriven] = useState(false);
  const [userPicked, setUserPicked] = useState(false);

  useGSAP(() => {
    const mm = gsap.matchMedia();
    mm.add(DESKTOP, () => {
      setScrollDriven(true);
      let last = -1;
      triggerRef.current = ScrollTrigger.create({
        trigger: pinRef.current,
        start: "top top",
        end: `+=${STAGES.length * 55}%`,
        pin: true,
        anticipatePin: 1,
        onUpdate: (self) => {
          const s = Math.min(STAGES.length - 1, Math.floor(self.progress * STAGES.length));
          if (s !== last) { last = s; setStage(s); }
        },
      });
      return () => { triggerRef.current = null; setScrollDriven(false); };
    });
    return () => mm.revert();
  });

  // Small screens: advance on a timer while visible, until the visitor picks a stage.
  useEffect(() => {
    if (scrollDriven || userPicked || reduce) return;
    const el = pinRef.current;
    let visible = false;
    const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; }, { threshold: 0.4 });
    if (el) io.observe(el);
    const id = setInterval(() => { if (visible && !document.hidden) setStage((s) => (s + 1) % STAGES.length); }, 2600);
    return () => { clearInterval(id); io.disconnect(); };
  }, [scrollDriven, userPicked, reduce]);

  const pick = (i: number) => {
    const st = triggerRef.current;
    if (st) {
      scrollToY(st.start + ((i + 0.5) / STAGES.length) * (st.end - st.start));
    } else {
      setUserPicked(true);
      setStage(i);
    }
  };

  const shown = reduce ? STAGES.length - 1 : stage;

  return (
    <section id="featured" aria-labelledby="featured-title" className="relative border-t border-line bg-ink-2">
      <div className="mx-auto max-w-[1400px] px-4 pt-24 sm:px-6 lg:px-10 lg:pt-32">
        <SectionHeading
          index="02"
          eyebrow="Featured system · RoadGuard"
          detect="system 0.97"
          title={<span id="featured-title">From one video frame to one accident alert.</span>}
          lede={roadguard.problem}
        />
      </div>

      <div ref={pinRef} className="relative lg:motion-safe:h-[100svh]">
        <div className="mx-auto grid max-w-[1400px] items-center gap-8 px-4 py-12 sm:px-6 lg:h-full lg:grid-cols-[1.35fr_1fr] lg:gap-14 lg:px-10 lg:py-0">
          <div className="flex min-w-0 flex-col gap-3 lg:pt-14">
            <PipelineScene stage={shown} />
            <div className="flex justify-between gap-4 font-mono text-[11px] text-dim">
              <span>Stage {shown + 1} of {STAGES.length} · {STAGES[shown].label}</span>
              <span className="hidden sm:inline">{scrollDriven ? "Scroll to advance" : "Tap a stage"}</span>
            </div>
          </div>

          <ol className="flex min-w-0 flex-col lg:pt-14" aria-label="RoadGuard pipeline stages">
            {STAGES.map((s, i) => {
              const active = i === shown;
              const done = i < shown;
              return (
                <li key={s.id} className="relative">
                  <button
                    type="button"
                    onClick={() => pick(i)}
                    aria-current={active ? "step" : undefined}
                    className={cn(
                      "group flex w-full gap-4 border-t border-line py-3.5 text-left transition-colors",
                      active ? "border-signal/60" : "hover:border-line-strong"
                    )}
                  >
                    <span className={cn("w-7 shrink-0 pt-0.5 font-mono text-[11px]", active ? "text-signal" : done ? "text-soft" : "text-dim")}>
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <span className="flex min-w-0 flex-col gap-1.5">
                      <span className={cn("font-display text-lg font-semibold [font-stretch:110%] transition-colors", active ? "text-fg" : done ? "text-soft" : "text-dim")}>
                        {s.label}
                      </span>
                      <span
                        className={cn(
                          "grid text-[0.95rem] leading-relaxed text-soft transition-[grid-template-rows,opacity] duration-500",
                          active ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
                        )}
                      >
                        <span className="overflow-hidden">{s.detail}</span>
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ol>
        </div>
      </div>

      <div className="mx-auto flex max-w-[1400px] flex-col gap-16 px-4 pb-28 pt-8 sm:px-6 lg:px-10 lg:pt-16">
        <Reveal className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-line bg-line lg:grid-cols-4">
          {roadguardMetrics.map((m) => (
            <div key={m.label} className="flex flex-col gap-2 bg-ink-2 p-5 sm:p-6">
              <CountUp value={m.value} className="display text-[clamp(1.9rem,3.4vw,2.9rem)] font-semibold tabular-nums text-fg" />
              <span className="text-sm font-medium text-fg">{m.label}</span>
              <span className="font-mono text-[11px] leading-relaxed text-dim">{m.note}</span>
            </div>
          ))}
        </Reveal>

        <div className="grid gap-10 lg:grid-cols-[1fr_2fr]">
          <Reveal className="flex flex-col gap-4">
            <p className="eyebrow">Engineering notes</p>
            <h3 className="display text-[clamp(1.6rem,2.6vw,2.25rem)] font-semibold">What building it taught me.</h3>
            <p className="text-soft">The interesting part of RoadGuard is the failures I found while testing and what I changed because of them.</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {roadguard.stack.map((t) => (
                <span key={t} className="rounded-md border border-line px-2 py-1 font-mono text-[11px] text-soft">{t}</span>
              ))}
            </div>
            {roadguard.linkNote ? (
              <p className="mt-2 flex items-center gap-2 font-mono text-[12px] text-dim">
                <Lock className="size-3.5" aria-hidden /> {roadguard.linkNote}
              </p>
            ) : null}
          </Reveal>
          <ul className="grid gap-px overflow-hidden rounded-xl border border-line bg-line sm:grid-cols-2">
            {roadguardLessons.map((l, i) => (
              <Reveal as="li" variant="tilt" key={l.title} delay={i * 0.08} className="flex flex-col gap-2.5 bg-ink-2 p-6">
                <h4 className="font-medium text-fg">{l.title}</h4>
                <p className="text-[0.95rem] leading-relaxed text-soft">{l.body}</p>
              </Reveal>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
