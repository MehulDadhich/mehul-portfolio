"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";
import { useGSAP } from "@gsap/react";
import { AnimatePresence, motion } from "motion/react";
import { ArrowUpRight } from "lucide-react";
import { projects, roadguardLessons, roadguardMetrics } from "@/lib/content";
import { Metric } from "@/components/shared/metric";
import { Reveal } from "@/components/shared/reveal";
import { ResultsTable, openProject } from "@/components/projects/projects";
import { cn } from "@/lib/utils";
import { CRASH_P, STAGE_AT, pairSpeedKmh } from "./roadguard-timeline";

gsap.registerPlugin(useGSAP, ScrollTrigger, SplitText);

const RoadguardScene = dynamic(() => import("./roadguard-scene"), { ssr: false });

const rg = projects.find((p) => p.id === "roadguard")!;

/** The number that settled each lesson, lifted from the lesson's own text, so the right-hand column reads as the results. */
const SETTLED: Record<string, { value: string; note: string }> = {
  "One rule is never enough": { value: "0.21", note: "peak IoU of a real impact, under the 0.3 rule" },
  "Ask the VLM a smaller question": { value: "5.5 s → 0.47 s", note: "median VLM latency" },
  "Precision before model size": { value: "11/11", note: "normal frames rejected in bf16" },
  "Give the VLM less context": { value: "0/3 → 3/3", note: "normal frames rejected" },
};

const stageOf = (p: number) => {
  let i = 0;
  while (i < STAGE_AT.length - 1 && p >= STAGE_AT[i + 1]) i++;
  return i;
};

/**
 * §01, RoadGuard as a pinned 3D chapter. Scroll drives the pipeline stage by stage on a live highway
 * (see roadguard-scene); the left rail names the stage and what it does, the readout on the right shows
 * what the system is thinking. After the chapter: the measured results and what the data settled.
 */
export function Featured() {
  const root = useRef<HTMLElement>(null);
  const pin = useRef<HTMLDivElement>(null);
  const p = useRef(0);
  const [stage, setStage] = useState(0);
  const [near, setNear] = useState(false);
  const [active, setActive] = useState(false);
  const clockRef = useRef<HTMLSpanElement>(null);
  const speedRef = useRef<HTMLSpanElement>(null);
  const tierRef = useRef<HTMLElement>(null);
  const vlmRef = useRef<HTMLElement>(null);
  const incRef = useRef<HTMLElement>(null);
  const barRef = useRef<HTMLSpanElement>(null);
  const stageBarRef = useRef<HTMLSpanElement>(null);

  // mount the scene a screen early, render it only while the chapter is on screen
  useEffect(() => {
    const el = pin.current!;
    const pre = new IntersectionObserver(([e]) => e.isIntersecting && setNear(true), { rootMargin: "100% 0px" });
    const on = new IntersectionObserver(([e]) => setActive(e.isIntersecting));
    pre.observe(el);
    on.observe(el);
    return () => { pre.disconnect(); on.disconnect(); };
  }, []);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add({ motion: "(prefers-reduced-motion: no-preference)", reduce: "(prefers-reduced-motion: reduce)" }, (ctx) => {
        const update = (P: number) => {
          p.current = P;
          const s = stageOf(P);
          setStage((cur) => (cur === s ? cur : s));
          const t = P * 16;
          if (clockRef.current) clockRef.current.textContent = `00:${(12 + t).toFixed(2).padStart(5, "0")}`;
          if (speedRef.current) speedRef.current.textContent = P < CRASH_P - 0.12 ? "—" : `${pairSpeedKmh(P)} km/h`;
          const fired = P > CRASH_P + 0.012;
          if (tierRef.current) tierRef.current.textContent = P < STAGE_AT[3] ? "watching" : fired ? "overlap + speed_drop · 0.64 → ALERT" : "rules armed";
          if (vlmRef.current) {
            const q = '"accident?" → yes · 0.47 s';
            const typed = Math.round(gsap.utils.clamp(0, 1, (P - STAGE_AT[4] - 0.02) / 0.1) * q.length);
            vlmRef.current.textContent = P < STAGE_AT[4] ? "idle" : typed === 0 ? "asking…" : q.slice(0, typed);
          }
          if (incRef.current) incRef.current.textContent = P < STAGE_AT[5] ? "—" : "#031 · snapshot · webhook";
          if (barRef.current) barRef.current.style.transform = `scaleX(${P})`;
          const s0 = STAGE_AT[s], s1 = s < STAGE_AT.length - 1 ? STAGE_AT[s + 1] : 1;
          if (stageBarRef.current) stageBarRef.current.style.transform = `scaleX(${gsap.utils.clamp(0, 1, (P - s0) / (s1 - s0))})`;
        };

        if (ctx.conditions?.reduce) {
          // no pinning: one still of the confirmed incident, every stage written out
          update(0.9);
          return;
        }

        ScrollTrigger.create({
          trigger: pin.current,
          start: "top top",
          end: "bottom bottom",
          scrub: true,
          onUpdate: (self) => update(self.progress),
        });
        update(0);

        // the chapter's title arrives as the hand-off from the hero completes
        const split = SplitText.create("[data-rg-title]", { type: "words", mask: "words" });
        gsap.from(split.words, {
          yPercent: 110,
          duration: 1.1,
          stagger: 0.05,
          ease: "expo.out",
          scrollTrigger: { trigger: pin.current, start: "top 60%" },
        });
        gsap.from("[data-rg-in]", {
          autoAlpha: 0,
          y: 16,
          duration: 0.9,
          stagger: 0.08,
          ease: "expo.out",
          scrollTrigger: { trigger: pin.current, start: "top 40%" },
        });
        return () => split.revert();
      });
    },
    { scope: root }
  );

  const st = rg.architecture[stage];

  return (
    <section id="featured" ref={root} aria-labelledby="featured-title" className="relative scroll-mt-0 bg-[#05070f]">
      <div ref={pin} className="relative h-[100svh] motion-safe:h-[620svh]">
        <div className="sticky top-0 h-[100svh] overflow-hidden">
          <div className="absolute inset-0">
            {near ? <RoadguardScene p={p} stage={stage} active={active} /> : null}
          </div>
          {/* legibility: the road is busiest in the middle; the words live at the edges */}
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_55%,transparent_35%,rgb(5_7_15/0.75)_100%)]" aria-hidden />

          <div className="pointer-events-none absolute inset-0 flex flex-col justify-between pt-20 pb-6 sm:pt-24">
            <div className="shell flex items-start justify-between gap-6">
              <div>
                <p data-rg-in className="label mb-3"><span className="text-fg">§01</span> · Case study · scroll to run the pipeline</p>
                <h2 id="featured-title" data-rg-title className="serif text-[clamp(2.6rem,1.6rem+4vw,6rem)] leading-[0.95] tracking-[-0.025em]">
                  RoadGuard
                </h2>
                <p data-rg-in className="serif mt-2 text-[clamp(1.05rem,0.9rem+0.6vw,1.5rem)] italic text-soft">{rg.kicker}</p>
              </div>
              <div data-rg-in className="hidden text-right font-mono text-[11px] leading-[1.7] tracking-[0.08em] text-soft uppercase sm:block" aria-hidden>
                <p className="flex items-center justify-end gap-2 text-fg">
                  <span className="size-1.5 rounded-full bg-signal motion-safe:animate-[pulse-dot_1.2s_ease-in-out_infinite]" /> CAM 03 · NH · REC
                </p>
                <p><span ref={clockRef}>00:12.00</span> · 25 fps</p>
              </div>
            </div>

            <div className="shell grid grid-cols-12 items-end gap-x-6 gap-y-4">
              {/* the stage rail and what the current stage does */}
              <div data-rg-in className="col-span-12 md:col-span-7 lg:col-span-6">
                <ol className="mb-4 flex gap-1.5" aria-label="Pipeline stages">
                  {rg.architecture.map((s, i) => (
                    <li key={s.id} className="flex min-w-0 flex-1 flex-col gap-1.5">
                      <span className="relative h-0.5 overflow-hidden bg-line-strong">
                        <span
                          ref={i === stage ? stageBarRef : undefined}
                          className={cn("absolute inset-0 origin-left", i < stage ? "bg-fg" : i === stage ? "bg-signal" : "bg-transparent")}
                          // set for every bar: a bar that was active keeps the inline scale written while it was
                          style={i === stage ? undefined : { transform: `scaleX(${i < stage ? 1 : 0})` }}
                        />
                      </span>
                      <span className={cn("truncate font-mono text-[10px] tracking-[0.08em] uppercase sm:text-[11px]", i === stage ? "text-fg" : "text-dim")} aria-current={i === stage ? "step" : undefined}>
                        <span className={i === stage ? "text-signal" : undefined}>{String(i + 1).padStart(2, "0")}</span>{" "}
                        <span className="hidden sm:inline">{s.label}</span>
                      </span>
                    </li>
                  ))}
                </ol>
                <div className="min-h-[7.5rem] rounded-[3px] border border-line bg-[#05070f]/70 p-4 backdrop-blur-md sm:min-h-[8.5rem] sm:p-5" aria-live="polite">
                  <AnimatePresence mode="wait" initial={false}>
                    <motion.div key={st.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.28, ease: [0.2, 0, 0, 1] }}>
                      <p className="serif text-[1.35rem] leading-tight">{st.label}</p>
                      <p className="mt-1.5 text-[14px] leading-relaxed text-soft sm:text-[15px]">{st.detail}</p>
                    </motion.div>
                  </AnimatePresence>
                </div>
              </div>

              {/* what the system is thinking right now */}
              <dl data-rg-in className="col-span-12 hidden grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 rounded-[3px] border border-line bg-[#05070f]/70 p-4 font-mono text-[11.5px] backdrop-blur-md md:col-span-5 md:col-start-8 md:grid lg:col-span-4 lg:col-start-9" aria-hidden>
                <dt className="text-dim uppercase">car #31</dt><dd ref={speedRef} className="text-fg">—</dd>
                <dt className="text-dim uppercase">tier 1</dt><dd ref={tierRef} className="text-signal">watching</dd>
                <dt className="text-dim uppercase">vlm</dt><dd ref={vlmRef} className="text-fg">idle</dd>
                <dt className="text-dim uppercase">incident</dt><dd ref={incRef} className="text-fg">—</dd>
              </dl>
            </div>
          </div>

          <span className="absolute inset-x-0 bottom-0 h-0.5 bg-line" aria-hidden>
            <span ref={barRef} className="absolute inset-0 origin-left scale-x-0 bg-signal" />
          </span>
        </div>
      </div>

      {/* after the run: what was measured and what the data settled */}
      <div className="bg-ink">
        <div className="shell py-20 md:py-28">
          <div className="grid grid-cols-12 gap-x-6 gap-y-10 lg:gap-x-10">
            <Reveal className="col-span-12 lg:col-span-4">
              <p className="label mb-3">The problem</p>
              <p className="serif text-[1.3rem] leading-[1.5]">{rg.problem}</p>
              <p className="label mt-8 mb-3">The approach</p>
              <p className="text-[1rem] leading-[1.7] text-soft">{rg.solution}</p>
            </Reveal>
            <div className="col-span-12 flex flex-col gap-10 lg:col-span-8">
              <dl className="grid grid-cols-2 border-t border-fg lg:grid-cols-4">
                {roadguardMetrics.map((m, i) => (
                  <Reveal key={m.label} delay={i * 0.06} className={cn("flex flex-col border-line py-5 pr-4", i % 2 === 1 && "border-l pl-4", i >= 2 && "border-t lg:border-t-0", i === 2 && "lg:border-l lg:pl-4")}>
                    <dd className="order-1 text-[clamp(1.7rem,1.1rem+1.6vw,2.6rem)] leading-none"><Metric value={m.value} /></dd>
                    <dt className="order-2 mt-2 text-[13.5px] leading-snug text-soft">{m.label}</dt>
                  </Reveal>
                ))}
              </dl>
              <Reveal className="flex flex-col gap-3">
                <p className="label"><span className="text-fg">Table 1</span> · Measured results</p>
                <ResultsTable />
              </Reveal>
            </div>
          </div>

          <div className="mt-20 flex flex-col gap-2">
            <p className="label">Discussion · four things the data settled</p>
            <ol className="border-t border-fg">
              {roadguardLessons.map((l, i) => (
                <Reveal as="li" key={l.title} delay={i * 0.04} className="grid grid-cols-12 gap-x-6 gap-y-2 border-b border-line py-6 lg:gap-x-10">
                  <span className="num col-span-2 pt-1.5 text-[13px] text-signal md:col-span-1">{String(i + 1).padStart(2, "0")}</span>
                  <h3 className="serif col-span-10 text-[1.5rem] leading-tight md:col-span-4 lg:col-span-3">{l.title}</h3>
                  <p className="col-span-10 col-start-3 text-[1rem] leading-[1.65] text-soft md:col-span-7 md:col-start-auto lg:col-span-5">{l.body}</p>
                  {SETTLED[l.title] ? (
                    <p className="col-span-10 col-start-3 flex flex-col gap-1 md:col-span-11 md:col-start-2 lg:col-span-3 lg:col-start-auto lg:items-end lg:text-right">
                      <Metric value={SETTLED[l.title].value} className="text-[1.6rem] leading-none" />
                      <span className="text-[12.5px] leading-snug text-soft">{SETTLED[l.title].note}</span>
                    </p>
                  ) : null}
                </Reveal>
              ))}
            </ol>
          </div>

          <div className="mt-10 flex flex-wrap items-center gap-x-6 gap-y-3">
            <button
              type="button"
              onClick={() => openProject("roadguard")}
              aria-haspopup="dialog"
              className="group flex h-11 items-center gap-2 rounded-full border border-fg px-5 text-[14px] transition-colors hover:bg-fg hover:text-ink"
            >
              Full project: stack and stage notes
              <ArrowUpRight className="size-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" aria-hidden />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
