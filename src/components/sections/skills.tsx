"use client";

import { useState } from "react";
import { evidence, skillGroups } from "@/lib/content";
import { SectionHeading } from "@/components/shared/section-heading";
import { Reveal } from "@/components/shared/reveal";
import { cn } from "@/lib/utils";

/**
 * Skills linked to evidence. Pick a project to see which skills it used,
 * or hover a skill to see where it was used.
 */
export function Skills() {
  const [project, setProject] = useState<string | null>(null);
  const [skill, setSkill] = useState<string[] | null>(null);

  const litEvidence = (id: string) => (skill ? skill.includes(id) : project === id);
  const litSkill = (used: string[]) => (project ? used.includes(project) : false);

  return (
    <section id="skills" aria-labelledby="skills-title" className="relative border-t border-line">
      <div className="mx-auto flex max-w-[1400px] flex-col gap-12 px-4 py-24 sm:px-6 lg:px-10 lg:py-24">
        <SectionHeading
          index="05"
          eyebrow="Skills"
          detect="stack 0.95"
          title={<span id="skills-title">Every skill, traced to where I used it.</span>}
          lede="Pick a project to light up the skills it needed. Hover a skill to see which projects it came from."
        />

        <Reveal className="flex flex-col gap-3">
          <p className="eyebrow">Evidence</p>
          <div className="flex flex-wrap gap-2" role="group" aria-label="Filter skills by project">
            {evidence.map((e) => {
              const on = litEvidence(e.id);
              return (
                <button
                  key={e.id}
                  type="button"
                  aria-pressed={project === e.id}
                  onClick={() => setProject((p) => (p === e.id ? null : e.id))}
                  className={cn(
                    "rounded-full border px-4 py-2 text-[13px] transition-all",
                    on ? "border-signal bg-signal/10 text-fg shadow-[0_0_0_3px_color-mix(in_srgb,var(--signal)_14%,transparent)]" : "border-line text-soft hover:border-line-strong hover:text-fg"
                  )}
                >
                  {e.label}
                </button>
              );
            })}
            {project ? (
              <button type="button" onClick={() => setProject(null)} className="px-2 font-mono text-[12px] text-dim underline-offset-4 hover:text-fg hover:underline">
                clear
              </button>
            ) : null}
          </div>
        </Reveal>

        <div className="gap-4 sm:columns-2 xl:columns-4">
          {skillGroups.map((g, gi) => (
            <Reveal key={g.id} variant="tilt" delay={(gi % 4) * 0.07} className="mb-4 break-inside-avoid rounded-2xl border border-line bg-panel/50 p-5">
              <div className="mb-4 flex items-baseline justify-between gap-3">
                <h3 className="font-medium text-fg">{g.label}</h3>
                <span className="font-mono text-[11px] text-dim">{g.skills.length}</span>
              </div>
              <ul className="relative ml-1.5 border-l border-line">
                {g.skills.map((s) => {
                  const on = litSkill(s.used);
                  const dimmed = project !== null && !on;
                  return (
                    <li key={s.name} className="relative pl-4">
                      <span className={cn("absolute left-0 top-1/2 h-px w-3 transition-colors", on ? "bg-signal" : "bg-line")} aria-hidden />
                      <button
                        type="button"
                        onMouseEnter={() => setSkill(s.used)}
                        onMouseLeave={() => setSkill(null)}
                        onFocus={() => setSkill(s.used)}
                        onBlur={() => setSkill(null)}
                        className={cn(
                          "my-0.5 rounded-md px-2 py-1 text-left font-mono text-[12.5px] transition-all",
                          on ? "bg-signal/10 text-fg" : dimmed ? "text-dim/70" : "text-soft hover:text-fg"
                        )}
                        aria-label={s.used.length ? `${s.name}, used in ${s.used.map((u) => evidence.find((e) => e.id === u)?.label).join(", ")}` : s.name}
                      >
                        {s.name}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
