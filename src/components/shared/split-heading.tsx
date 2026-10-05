"use client";

import { useRef, type ReactNode } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(ScrollTrigger, SplitText, useGSAP);

/** A section heading whose lines slide up out of a mask as it scrolls into view. */
export function SplitHeading({ children, className, detect, id }: { children: ReactNode; className?: string; detect?: string; id?: string }) {
  const ref = useRef<HTMLHeadingElement>(null);

  useGSAP(() => {
    const mm = gsap.matchMedia();
    mm.add("(prefers-reduced-motion: no-preference)", () => {
      const split = SplitText.create(ref.current!, {
        type: "lines,words",
        mask: "lines",
        autoSplit: true,
        onSplit: (self) => {
          // Line masks clip at the line box; with tight display leading that shaves off g, y, j, p.
          // Extend each mask downward and pull the next line back up so the layout doesn't move.
          self.masks.forEach((mk) => {
            const el = mk as HTMLElement;
            el.style.paddingBottom = "0.18em";
            el.style.marginBottom = "-0.18em";
          });
          // play once the heading is on screen (an observer, so it also works inside the section wheel)
          const tween = gsap.from(self.words, { yPercent: 115, rotate: 4, duration: 1.1, stagger: 0.05, ease: "expo.out", paused: true });
          const io = new IntersectionObserver(([e]) => {
            if (e.isIntersecting) { tween.play(); io.disconnect(); }
          }, { rootMargin: "0px 0px -12% 0px" });
          io.observe(ref.current!);
          tween.eventCallback("onInterrupt", () => io.disconnect());
          return tween;
        },
      });
      return () => split.revert();
    });
    return () => mm.revert();
  });

  return (
    <h2 ref={ref} id={id} data-detect-label={detect} className={className}>
      {children}
    </h2>
  );
}
