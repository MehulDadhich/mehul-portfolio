"use client";

import { ArrowUpRight } from "lucide-react";
import { experience, projects } from "@/lib/content";
import { SectionHeading } from "@/components/shared/section-heading";
import { Reveal } from "@/components/shared/reveal";
import { LEAD, openProject } from "@/components/projects/projects";
import { Metric } from "@/components/shared/metric";
import { Scramble, SplitReveal } from "@/components/shared/motion-kit";
import { motion, useReducedMotion } from "motion/react";

const shipped = projects.filter((p) => p.categories.includes("industry"));

/** §03: the internship at Infrax.ai, with the two systems built there linked to their write-ups. */
export function Experience() {
  const reduce = useReducedMotion();
  return (
    <section id="experience" aria-labelledby="experience-title" className="shell scroll-mt-16 py-14 md:py-20">
      <SectionHeading
        n="03"
        kicker="Industry"
        id="experience-title"
        title="Experience"
        standfirst="Six months on live CCTV, where a model is only as good as the pipeline around it."
      />

      <div className="mt-12 grid grid-cols-12 gap-x-6 gap-y-10 lg:gap-x-10">
        <Reveal className="col-span-12 flex flex-col gap-5 md:sticky md:top-24 md:col-span-4 md:self-start">
          <div>
            <SplitReveal by="chars" className="serif text-[clamp(2.4rem,1.8rem+2vw,3.6rem)] leading-none">{experience.company}</SplitReveal>
            <p className="mt-2 text-[1.05rem]">{experience.role}</p>
          </div>
          <dl className="grid grid-cols-[auto_1fr] gap-x-5 gap-y-2 border-t border-line pt-4 text-[14px]">
            <dt className="label pt-0.5">Period</dt>
            <dd className="num">{experience.period}</dd>
            <dt className="label pt-0.5">Mode</dt>
            <dd>{experience.mode}</dd>
            <dt className="label pt-0.5">System</dt>
            <dd>{experience.system}</dd>
          </dl>
          <div className="border-t border-line pt-4">
            <p className="label mb-3">Detection classes it watches for</p>
            <ul className="flex flex-wrap gap-2">
              {experience.watches.map((w, i) => (
                // each class "locks on": a vermilion flash, then it settles into the list
                <motion.li
                  key={w}
                  className="border px-2 py-1 font-mono text-[12px] text-fg"
                  initial={reduce ? false : { opacity: 0, scale: 1.25, borderColor: "#ff5b2e" }}
                  whileInView={{ opacity: 1, scale: 1, borderColor: ["#ff5b2e", "#ff5b2e", "#46443e"] }}
                  viewport={{ once: true, margin: "0px 0px -10% 0px" }}
                  transition={{ duration: 1.1, delay: 0.2 + i * 0.12, ease: [0.16, 1, 0.3, 1], borderColor: { duration: 1.4, delay: 0.2 + i * 0.12, times: [0, 0.5, 1] } }}
                >
                  {w.toLowerCase().replace(/ /g, "_")}
                </motion.li>
              ))}
            </ul>
          </div>
        </Reveal>

        <div className="col-span-12 md:col-span-8">
          <dl className="border-t border-fg">
            {experience.work.map((w, i) => (
              <Reveal key={w.verb} delay={i * 0.06} className="group relative grid grid-cols-12 gap-x-6 gap-y-1 border-b border-line py-5 transition-colors duration-300 before:absolute before:inset-y-0 before:left-0 before:w-0.5 before:origin-top before:scale-y-0 before:bg-signal before:transition-transform before:duration-500 hover:bg-panel hover:before:scale-y-100">
                <dt className="col-span-12 flex items-baseline gap-3 sm:col-span-3">
                  <span className="num text-[12px] text-soft">{String(i + 1).padStart(2, "0")}</span>
                  <Scramble text={w.verb.toUpperCase()} delay={0.15 + i * 0.1} className="font-mono text-[13px] tracking-[0.08em] text-signal" />
                </dt>
                <dd className="col-span-12 text-[1.02rem] leading-[1.65] transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:translate-x-1.5 sm:col-span-9">{w.body}</dd>
              </Reveal>
            ))}
          </dl>

          <div className="mt-10">
            <p className="label mb-3">Built at {experience.company}</p>
            <ul className="border-t border-fg">
              {shipped.map((p) => (
                <li key={p.id} className="border-b border-line">
                  <button
                    type="button"
                    onClick={() => openProject(p.id)}
                    aria-haspopup="dialog"
                    className="group grid w-full grid-cols-12 items-baseline gap-x-6 gap-y-1 px-1 py-4 text-left transition-colors hover:bg-panel"
                  >
                    <span className="col-span-12 flex flex-col gap-0.5 sm:col-span-7">
                      <span className="serif text-[1.45rem] leading-tight">{p.title}</span>
                      <span className="text-[14px] leading-snug text-soft">{p.highlights[0]}</span>
                    </span>
                    <span className="col-span-10 sm:col-span-4">
                      {LEAD[p.id] && /\d/.test(LEAD[p.id].value) ? (
                        <>
                          <Metric value={LEAD[p.id].value} className="block text-[1.3rem] leading-tight" />
                          <span className="text-[13px] text-soft">{LEAD[p.id].label}</span>
                        </>
                      ) : null}
                    </span>
                    <span className="col-span-2 flex justify-end sm:col-span-1" aria-hidden>
                      <ArrowUpRight className="size-4 text-soft transition-[transform,color] group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-signal" />
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
