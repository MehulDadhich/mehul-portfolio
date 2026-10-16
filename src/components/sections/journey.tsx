"use client";

import { useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { certifications, journey } from "@/lib/content";
import { SectionHeading } from "@/components/shared/section-heading";
import { Reveal } from "@/components/shared/reveal";

gsap.registerPlugin(useGSAP, ScrollTrigger);

/**
 * §05: the chronology as a rail that draws itself with the scroll; each milestone's node ignites when the
 * line reaches it. Certifications sit beside it as footnotes.
 */
export function Journey() {
  const root = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        // the line, scrubbed to the reader's position in the list
        gsap.fromTo(
          "[data-rail-fill]",
          { scaleY: 0 },
          { scaleY: 1, ease: "none", scrollTrigger: { trigger: "[data-rail]", start: "top 65%", end: "bottom 65%", scrub: 0.6 } }
        );
        gsap.utils.toArray<HTMLElement>("[data-step]").forEach((step) => {
          const node = step.querySelector("[data-node]");
          const body = step.querySelector("[data-step-body]");
          ScrollTrigger.create({
            trigger: step,
            start: "top 65%",
            onEnter: () => node?.setAttribute("data-on", "true"),
            onLeaveBack: () => node?.setAttribute("data-on", "false"),
          });
          gsap.from(body, { x: 40, autoAlpha: 0, duration: 1, ease: "expo.out", scrollTrigger: { trigger: step, start: "top 80%" } });
        });
      });
      mm.add("(prefers-reduced-motion: reduce)", () => {
        gsap.set("[data-rail-fill]", { scaleY: 1 });
        gsap.utils.toArray<HTMLElement>("[data-node]").forEach((n) => n.setAttribute("data-on", "true"));
      });
    },
    { scope: root }
  );

  return (
    <section ref={root} id="journey" aria-labelledby="journey-title" className="shell scroll-mt-16 py-14 md:py-20">
      <SectionHeading
        n="05"
        kicker="Chronology"
        id="journey-title"
        title="Journey"
        standfirst="From a CBSE classroom to live traffic cameras, in order."
      />

      <div className="mt-12 grid grid-cols-12 gap-x-6 gap-y-14 lg:gap-x-10">
        <ol data-rail className="relative col-span-12 pl-8 sm:pl-10 lg:col-span-8">
          {/* the rail and its scroll-drawn fill */}
          <span className="absolute top-2 bottom-2 left-[7px] w-px bg-line-strong sm:left-[11px]" aria-hidden />
          <span data-rail-fill className="absolute top-2 bottom-2 left-[7px] w-px origin-top bg-signal sm:left-[11px]" aria-hidden />
          {journey.map((j) => (
            <li key={j.title} data-step className="relative grid grid-cols-12 gap-x-6 gap-y-1 py-6">
              <span
                data-node
                data-on="false"
                className="group/node absolute top-8 -left-8 grid size-[15px] place-items-center rounded-full border border-line-strong bg-ink transition-[border-color,box-shadow] duration-500 data-[on=true]:border-signal data-[on=true]:shadow-[0_0_0_6px_rgb(255_91_46/0.12)] sm:-left-10 sm:size-[23px]"
                aria-hidden
              >
                <span className="size-[5px] scale-0 rounded-full bg-signal transition-transform duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] group-data-[on=true]/node:scale-100 sm:size-[7px]" />
              </span>
              <div data-step-body className="col-span-12 grid grid-cols-12 gap-x-6 gap-y-1">
                <div className="col-span-12 flex items-baseline gap-3 sm:col-span-3 sm:flex-col sm:gap-1">
                  <span className="num text-[13px] text-fg">{j.when ?? "—"}</span>
                  <span className="label">{j.phase}</span>
                </div>
                <div className="col-span-12 sm:col-span-9">
                  <h3 className="serif text-[clamp(1.3rem,1.1rem+0.8vw,1.7rem)] leading-snug">{j.title}</h3>
                  <p className="mt-1 text-[0.98rem] leading-[1.65] text-soft">{j.body}</p>
                  {j.points ? (
                    <ul className="mt-3 flex flex-wrap gap-1.5">
                      {j.points.map((pt) => (
                        <li key={pt} className="border border-line px-2 py-0.5 font-mono text-[11px] text-soft">{pt}</li>
                      ))}
                    </ul>
                  ) : null}
                </div>
              </div>
            </li>
          ))}
        </ol>

        <div className="col-span-12 lg:col-span-4">
          <div id="achievements" className="scroll-mt-20">
          <p className="label mb-3">Certifications</p>
          <ol className="border-t border-fg">
            {certifications.map((c, i) => (
              <Reveal as="li" key={c.title} delay={i * 0.08} className="group flex gap-3 border-b border-line py-4 transition-colors duration-300 hover:bg-panel">
                <span className="num pt-0.5 text-[12px] text-signal transition-transform duration-300 group-hover:scale-125">{i + 1}</span>
                <div className="flex flex-col gap-0.5">
                  <p className="text-[0.98rem] leading-snug">{c.title}</p>
                  <p className="label normal-case tracking-normal text-[12.5px]">
                    {c.issuer}{c.year ? ` · ${c.year}` : ""}
                  </p>
                  <p className="mt-1 text-[13.5px] leading-snug text-soft">{c.relevance}</p>
                </div>
              </Reveal>
            ))}
          </ol>
          </div>
        </div>
      </div>
    </section>
  );
}
