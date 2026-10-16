"use client";

import { useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { evidence, skillGroups } from "@/lib/content";
import { SectionHeading } from "@/components/shared/section-heading";
import { openProject } from "@/components/projects/projects";
import { cn } from "@/lib/utils";

/** Short column heads for the matrix, so seven projects fit across a phone. */
const SHORT: Record<string, string> = {
  tmcs: "TMCS",
  roadguard: "RG",
  warehouse: "WH",
  "task-agent": "TM",
  astra: "AS",
  arc: "ARC",
  rehearse: "RH",
};


/**
 * §04: skills cross-referenced against the projects that used them. Every filled square is a claim
 * you can open and check; skills not yet used in a project are listed as such rather than padded in.
 */
export function Skills() {
  const reduce = useReducedMotion();
  const [groupId, setGroupId] = useState(skillGroups[0].id);
  const [col, setCol] = useState<string | null>(null);
  const group = skillGroups.find((g) => g.id === groupId)!;
  const rows = group.skills.filter((s) => s.used.length);
  const studied = group.skills.filter((s) => !s.used.length);

  return (
    <section id="skills" aria-labelledby="skills-title" className="shell scroll-mt-16 py-14 md:py-20">
      <SectionHeading
        n="04"
        kicker="Evidence"
        id="skills-title"
        title="Skills, cross-referenced"
        standfirst="Every skill here is traced to the projects that used it. Open a column to check the work."
      />

      <div className="mt-12 grid grid-cols-12 gap-x-6 gap-y-6 lg:gap-x-10">
        <div className="col-span-12 lg:col-span-3">
          <p className="label mb-3 hidden lg:block">Area</p>
          <ul
            className="-mx-4 -mt-2 flex gap-1.5 overflow-x-auto px-4 pt-2 pb-2 lg:mt-0 lg:pt-0 [scrollbar-width:none] lg:mx-0 lg:flex-col lg:gap-0 lg:overflow-visible lg:border-t lg:border-line lg:px-0 lg:pb-0"
            role="group"
            aria-label="Skill area"
          >
            {skillGroups.map((g) => {
              const on = g.id === groupId;
              return (
                <li key={g.id} className="shrink-0 lg:border-b lg:border-line">
                  <button
                    type="button"
                    aria-pressed={on}
                    onClick={() => setGroupId(g.id)}
                    className={cn(
                      "flex h-10 w-full items-center justify-between gap-3 rounded-full border px-4 text-left text-[14px] whitespace-nowrap transition-colors lg:h-11 lg:rounded-none lg:border-0 lg:px-1",
                      on ? "border-fg bg-fg text-ink lg:bg-transparent lg:text-fg" : "border-line text-soft hover:text-fg"
                    )}
                  >
                    <span className="flex items-center gap-2.5">
                      <span className={cn("hidden h-px w-3 transition-colors lg:block", on ? "bg-signal" : "bg-transparent")} aria-hidden />
                      {g.label}
                    </span>
                    <span className={cn("num text-[12px]", on ? "text-ink/60 lg:text-soft" : "text-dim")}>{g.skills.filter((s) => s.used.length).length}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>

        <div className="col-span-12 lg:col-span-9">
          <table className="w-full table-fixed border-collapse" onMouseLeave={() => setCol(null)}>
            <caption className="sr-only">{group.label}: which projects used each skill</caption>
            <colgroup>
              <col className="w-[40%] sm:w-[46%]" />
              {evidence.map((e) => <col key={e.id} />)}
            </colgroup>
            <thead>
              <tr className="border-b border-fg">
                <th scope="col" className="label py-2 text-left font-normal">{group.label}</th>
                {evidence.map((e) => (
                  <th key={e.id} scope="col" className="p-0 font-normal" onMouseEnter={() => setCol(e.id)}>
                    <button
                      type="button"
                      onClick={() => openProject(e.id)}
                      onFocus={() => setCol(e.id)}
                      onBlur={() => setCol(null)}
                      aria-label={`Open ${e.label} (${SHORT[e.id] ?? e.label})`}
                      aria-haspopup="dialog"
                      className={cn(
                        "flex min-h-11 w-full items-end justify-center pb-2 font-mono text-[10.5px] tracking-[0.04em] transition-colors sm:text-[11px]",
                        col === e.id ? "text-signal" : "text-soft hover:text-fg"
                      )}
                    >
                      <span className="md:hidden">{SHORT[e.id] ?? e.label}</span>
                      <span className="hidden md:inline">{e.label.replace("Infrax.ai ", "").replace(" Monitoring", "")}</span>
                    </button>
                  </th>
                ))}
              </tr>
            </thead>
            <AnimatePresence mode="wait" initial={false}>
              <motion.tbody
                key={group.id}
                initial={reduce ? false : { opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.16 }}
              >
                {rows.map((s, ri) => {
                  return (
                    <tr key={s.name} className="group border-b border-line">
                      <th scope="row" className="py-2.5 pr-3 text-left text-[14px] leading-snug font-normal text-fg sm:text-[15px]">
                        {s.name}
                      </th>
                      {evidence.map((e, ci) => {
                        const used = s.used.includes(e.id);
                        return (
                          <td
                            key={e.id}
                            onMouseEnter={() => setCol(e.id)}
                            className={cn("text-center transition-colors duration-150 group-hover:bg-panel", col === e.id && "bg-panel")}
                          >
                            {used ? (
                              <>
                                {/* filled squares cascade in along the diagonal, every time the area changes */}
                                <motion.span
                                  className={cn("inline-block size-2.5 transition-colors", col === e.id ? "bg-signal" : "bg-fg")}
                                  initial={reduce ? false : { scale: 0, rotate: 45 }}
                                  whileInView={{ scale: 1, rotate: 0 }}
                                  viewport={{ once: true }}
                                  transition={{ type: "spring", stiffness: 420, damping: 18, delay: 0.05 + (ri + ci) * 0.035 }}
                                  aria-hidden
                                />
                                <span className="sr-only">Used</span>
                              </>
                            ) : (
                              <>
                                <span className="inline-block size-[3px] rounded-full bg-line-strong" aria-hidden />
                                <span className="sr-only">Not used</span>
                              </>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </motion.tbody>
            </AnimatePresence>
          </table>
          <p role="status" className="sr-only">{group.label}: {rows.length} skills with projects</p>
          {studied.length ? (
            <p className="mt-4 text-[14px] leading-relaxed text-soft">
              <span className="label mr-2">Studied, not yet in a project</span>
              {studied.map((s) => s.name).join(", ")}
            </p>
          ) : null}
          <p className="label mt-4 leading-relaxed normal-case tracking-normal md:hidden">
            {evidence.map((e, i) => (
              <span key={e.id}>
                <span className="text-fg">{SHORT[e.id]}</span> {e.label}
                {i < evidence.length - 1 ? " · " : ""}
              </span>
            ))}
          </p>
        </div>
      </div>
    </section>
  );
}
