"use client";

import { useRef, type ReactNode } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(useGSAP, ScrollTrigger, SplitText);

/**
 * A section's running head: a rule that draws across, "§02 · Index", then the title rising word by word out
 * of a line mask, with the standfirst arriving last. One choreography, shared by every section.
 */
export function SectionHeading({
  n,
  kicker,
  id,
  title,
  standfirst,
}: {
  n: string;
  kicker: string;
  id: string;
  title: ReactNode;
  standfirst?: ReactNode;
}) {
  const root = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        const split = SplitText.create("[data-sh-title]", { type: "lines,words", mask: "lines" });
        const tl = gsap.timeline({
          defaults: { ease: "expo.out" },
          scrollTrigger: { trigger: root.current, start: "top 82%" },
        });
        tl.from("[data-sh-rule]", { scaleX: 0, duration: 1.4, ease: "expo.inOut" })
          .from("[data-sh-kicker]", { autoAlpha: 0, x: -12, duration: 0.8 }, 0.25)
          .from(split.words, { yPercent: 115, duration: 1.1, stagger: 0.045 }, 0.35)
          .from("[data-sh-stand]", { autoAlpha: 0, y: 14, duration: 0.9 }, 0.6);
        return () => split.revert();
      });
    },
    { scope: root }
  );

  return (
    <header ref={root} className="relative grid grid-cols-12 gap-x-6 gap-y-4 pt-4 lg:gap-x-10">
      <span data-sh-rule className="absolute inset-x-0 top-0 h-px origin-left bg-fg" aria-hidden />
      <p data-sh-kicker className="label col-span-12">
        <span className="text-fg">§{n}</span> · {kicker}
      </p>
      <h2 id={id} data-sh-title className="serif col-span-12 text-[clamp(2.1rem,1.5rem+2.2vw,3.6rem)] leading-[1.02] tracking-[-0.02em] md:col-span-8">
        {title}
      </h2>
      {standfirst ? (
        <p data-sh-stand className="col-span-12 text-[15px] leading-relaxed text-soft md:col-span-4 md:self-end">
          {standfirst}
        </p>
      ) : null}
    </header>
  );
}
