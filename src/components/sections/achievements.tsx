"use client";

import { useState } from "react";
import { Award, Plus } from "lucide-react";
import { certifications } from "@/lib/content";
import { SectionHeading } from "@/components/shared/section-heading";
import { Reveal } from "@/components/shared/reveal";
import { cn } from "@/lib/utils";

export function Achievements() {
  const [open, setOpen] = useState<number | null>(null);

  return (
    <section id="achievements" aria-labelledby="achievements-title" className="relative border-t border-line">
      <div className="mx-auto flex max-w-[1400px] flex-col gap-12 px-4 py-24 sm:px-6 lg:px-10 lg:py-32">
        <SectionHeading
          index="07"
          eyebrow="Certifications"
          detect="credential 0.94"
          title={<span id="achievements-title">Certified along the way.</span>}
        />
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {certifications.map((c, i) => {
            const expanded = open === i;
            const lead = i === 0;
            return (
              <Reveal as="li" variant="tilt" key={c.title} delay={i * 0.07} className={cn(lead && "lg:col-span-2")}>
                <button
                  type="button"
                  aria-expanded={expanded}
                  onClick={() => setOpen(expanded ? null : i)}
                  data-active={expanded}
                  className={cn(
                    "group glow-border flex h-full w-full flex-col justify-between gap-6 rounded-2xl border border-line bg-panel/50 p-6 text-left transition-colors hover:bg-panel",
                    lead && "lg:p-9"
                  )}
                >
                  <div className="flex items-start justify-between gap-4">
                    <span className={cn("grid place-items-center rounded-lg border border-line text-signal", lead ? "size-12" : "size-9")}>
                      <Award className={lead ? "size-6" : "size-4"} aria-hidden />
                    </span>
                    <Plus className={cn("size-4 text-dim transition-transform duration-300 group-hover:rotate-45", expanded && "rotate-45")} aria-hidden />
                  </div>
                  <div className="flex flex-col gap-2">
                    <span className="font-mono text-[11px] uppercase tracking-[0.12em] text-soft">
                      {c.issuer}{c.year ? ` · ${c.year}` : ""}
                    </span>
                    <h3 className={cn("font-display font-semibold leading-tight [font-stretch:108%]", lead ? "text-[clamp(1.6rem,2.8vw,2.4rem)]" : "text-lg")}>
                      {lead ? c.title : c.short}
                    </h3>
                    <span
                      className={cn(
                        "grid transition-[grid-template-rows,opacity] duration-500 group-hover:grid-rows-[1fr] group-hover:opacity-100 group-focus-visible:grid-rows-[1fr] group-focus-visible:opacity-100",
                        expanded || lead ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
                      )}
                    >
                      <span className="overflow-hidden">
                        <span className="block pt-2 text-[0.95rem] leading-relaxed text-soft">
                          {!lead ? <span className="mb-1 block text-fg/80">{c.title}</span> : null}
                          {c.relevance}
                        </span>
                      </span>
                    </span>
                  </div>
                </button>
              </Reveal>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
