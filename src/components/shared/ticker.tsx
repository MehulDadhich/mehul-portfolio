"use client";

import { useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { cn } from "@/lib/utils";

gsap.registerPlugin(ScrollTrigger, useGSAP);

/**
 * An endless strip of items that drifts sideways and surges with scroll speed,
 * flipping direction when the visitor scrolls back up.
 */
export function Ticker({ items, reverse = false, className }: { items: string[]; reverse?: boolean; className?: string }) {
  const root = useRef<HTMLDivElement>(null);
  const track = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    const mm = gsap.matchMedia();
    mm.add("(prefers-reduced-motion: no-preference)", () => {
      const loop = gsap.fromTo(track.current, { xPercent: reverse ? -50 : 0 }, { xPercent: reverse ? 0 : -50, duration: 38, ease: "none", repeat: -1 });
      const st = ScrollTrigger.create({
        trigger: root.current,
        start: "top bottom",
        end: "bottom top",
        onUpdate: (self) => {
          const boost = 1 + Math.min(5, Math.abs(self.getVelocity()) / 400);
          const d = self.direction;
          gsap.to(loop, { timeScale: d * boost, duration: 0.2, overwrite: true });
          gsap.to(loop, { timeScale: d, duration: 1.1, delay: 0.25, ease: "power2.out" });
        },
      });
      return () => { loop.kill(); st.kill(); };
    });
    return () => mm.revert();
  });

  const row = (aria: boolean) => (
    <div className="flex shrink-0 items-center" aria-hidden={aria || undefined}>
      {items.map((it, i) => (
        <span key={i} className="flex items-center gap-8 pr-8">
          <span className="whitespace-nowrap font-display text-[clamp(1.5rem,3.2vw,2.75rem)] font-semibold tracking-tight text-fg/85 [font-stretch:115%]">
            {it}
          </span>
          <span className="size-2 rotate-45 bg-signal" aria-hidden />
        </span>
      ))}
    </div>
  );

  return (
    <div ref={root} className={cn("relative overflow-hidden border-y border-line py-6", className)}>
      <div ref={track} className="flex w-max will-change-transform">
        {row(false)}
        {row(true)}
      </div>
      <div className="pointer-events-none absolute inset-y-0 left-0 w-24 bg-gradient-to-r from-ink to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 w-24 bg-gradient-to-l from-ink to-transparent" />
    </div>
  );
}
