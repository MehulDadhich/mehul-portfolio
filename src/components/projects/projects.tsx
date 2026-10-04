"use client";

import { useState } from "react";
import { AnimatePresence, LayoutGroup, motion, useReducedMotion } from "motion/react";
import { ArrowUpRight, Lock, Maximize2 } from "lucide-react";
import { categories, projects, type Category, type Project } from "@/lib/content";
import { SectionHeading } from "@/components/shared/section-heading";
import { GithubIcon } from "@/components/shared/brand-icons";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { ArchitectureFull, ArchitectureMini } from "./architecture-flow";
import { TiltCard } from "@/components/shared/tilt-card";
import { Reveal } from "@/components/shared/reveal";

const CAT_LABEL: Record<Category, string> = {
  cv: "Computer Vision",
  genai: "Generative AI & NLP",
  fullstack: "Full Stack",
  industry: "Industry",
};

export function Projects() {
  const reduce = useReducedMotion();
  const [filter, setFilter] = useState<"all" | Category>("all");
  const [open, setOpen] = useState<Project | null>(null);
  const list = projects.filter((p) => filter === "all" || p.categories.includes(filter));

  return (
    <section id="work" aria-labelledby="work-title" className="relative border-t border-line">
      <div className="mx-auto flex max-w-[1400px] flex-col gap-12 px-4 py-24 sm:px-6 lg:px-10 lg:py-32">
        <div className="flex flex-col justify-between gap-8 lg:flex-row lg:items-end">
          <SectionHeading
            index="03"
            eyebrow="All systems"
            detect="project 0.96"
            title={<span id="work-title">Each project is a pipeline.</span>}
            lede="Hover a card to watch data move through it. Open one to see the full architecture."
          />
          <LayoutGroup id="filters">
            <div role="tablist" aria-label="Filter projects" className="flex flex-wrap gap-1 rounded-full border border-line p-1">
              {categories.map((c) => {
                const active = filter === c.id;
                return (
                  <button
                    key={c.id}
                    role="tab"
                    aria-selected={active}
                    onClick={() => setFilter(c.id)}
                    className={cn("relative rounded-full px-3.5 py-1.5 text-[13px] transition-colors", active ? "text-ink" : "text-soft hover:text-fg")}
                  >
                    {active ? (
                      <motion.span layoutId="filter-pill" className="absolute inset-0 rounded-full bg-fg" transition={{ type: "spring", stiffness: 380, damping: 32 }} />
                    ) : null}
                    <span className="relative">{c.label}</span>
                  </button>
                );
              })}
            </div>
          </LayoutGroup>
        </div>

        <motion.ul layout={!reduce} className="grid gap-4 md:grid-cols-2">
          <AnimatePresence mode="popLayout" initial={false}>
            {list.map((p, i) => (
              <motion.li
                key={p.id}
                className="min-w-0"
                layout={!reduce}
                initial={{ opacity: 0, scale: 0.97 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.97 }}
                transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
              >
                <Reveal variant="tilt" delay={(i % 2) * 0.1} className="h-full">
                  <TiltCard>
                    <ProjectCard project={p} onExplore={() => setOpen(p)} />
                  </TiltCard>
                </Reveal>
              </motion.li>
            ))}
          </AnimatePresence>
        </motion.ul>
      </div>

      <Dialog open={open !== null} onOpenChange={(o) => { if (!o) setOpen(null); }}>
        <DialogContent data-lenis-prevent className="max-h-[88svh] overflow-y-auto border border-line bg-ink-2 p-0 sm:max-w-3xl">
          {open ? <ProjectDetail project={open} /> : null}
        </DialogContent>
      </Dialog>
    </section>
  );
}

function ProjectCard({ project: p, onExplore }: { project: Project; onExplore: () => void }) {
  return (
    <article className="group/card glow-border flex h-full flex-col gap-6 rounded-2xl border border-line bg-panel/60 p-6 transition-colors hover:bg-panel sm:p-7">
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-2">
          <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-signal">{p.kicker}</p>
          <h3 className="font-display text-2xl font-semibold [font-stretch:110%]">{p.title}</h3>
        </div>
        {p.featured ? (
          <span className="shrink-0 rounded-full border border-signal/40 px-2.5 py-1 font-mono text-[10px] uppercase tracking-wider text-signal">Featured</span>
        ) : null}
      </div>

      <div className="rounded-xl border border-line bg-ink/60 px-3 py-5">
        <ArchitectureMini stages={p.architecture} />
      </div>

      <dl className="grid gap-4 text-[0.95rem] leading-relaxed">
        <div className="grid gap-1">
          <dt className="eyebrow text-[10.5px]">Problem</dt>
          <dd className="text-soft">{p.problem}</dd>
        </div>
        <div className="grid gap-1">
          <dt className="eyebrow text-[10.5px]">Solution</dt>
          <dd className="text-fg/90">{p.solution}</dd>
        </div>
      </dl>

      <div className="mt-auto flex flex-col gap-5">
        <ul className="flex flex-wrap gap-1.5" aria-label="Technologies">
          {p.stack.slice(0, 7).map((t) => (
            <li key={t} className="rounded-md border border-line px-2 py-1 font-mono text-[11px] text-soft">{t}</li>
          ))}
          {p.stack.length > 7 ? <li className="px-1 py-1 font-mono text-[11px] text-dim">+{p.stack.length - 7}</li> : null}
        </ul>
        <div className="flex flex-wrap items-center gap-3 border-t border-line pt-5">
          <button
            type="button"
            onClick={onExplore}
            className="flex items-center gap-2 rounded-full bg-fg px-4 py-2 text-[13px] font-medium text-ink transition-opacity hover:opacity-90"
          >
            <Maximize2 className="size-3.5" aria-hidden /> Explore architecture
          </button>
          <ProjectLink project={p} />
        </div>
      </div>
    </article>
  );
}

function ProjectLink({ project: p }: { project: Project }) {
  if (p.github) {
    return (
      <a href={p.github} target="_blank" rel="noreferrer" className="flex items-center gap-2 rounded-full border border-line-strong px-4 py-2 text-[13px] text-fg transition-colors hover:border-fg/50">
        <GithubIcon className="size-3.5" /> Code <ArrowUpRight className="size-3.5 text-dim" aria-hidden />
      </a>
    );
  }
  return (
    <span className="flex items-center gap-2 font-mono text-[11.5px] text-dim">
      <Lock className="size-3.5" aria-hidden /> {p.linkNote}
    </span>
  );
}

function ProjectDetail({ project: p }: { project: Project }) {
  return (
    <div className="flex flex-col">
      <div className="flex flex-col gap-3 border-b border-line p-6 pr-12 sm:p-8 sm:pr-14">
        <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-signal">{p.kicker}</p>
        <DialogTitle className="font-display text-3xl font-semibold leading-tight [font-stretch:110%]">{p.title}</DialogTitle>
        <DialogDescription className="text-[0.98rem] leading-relaxed text-soft">{p.solution}</DialogDescription>
        <div className="flex flex-wrap gap-1.5 pt-1">
          {p.categories.map((c) => (
            <span key={c} className="rounded-full border border-line px-2.5 py-1 font-mono text-[10.5px] text-soft">{CAT_LABEL[c]}</span>
          ))}
        </div>
      </div>
      <div className="grid gap-8 p-6 sm:p-8 md:grid-cols-[1.4fr_1fr]">
        <div className="flex min-w-0 flex-col gap-4">
          <p className="eyebrow">Architecture</p>
          <ArchitectureFull stages={p.architecture} />
        </div>
        <div className="flex min-w-0 flex-col gap-8">
          <div className="flex flex-col gap-3">
            <p className="eyebrow">Problem</p>
            <p className="text-[0.95rem] leading-relaxed text-soft">{p.problem}</p>
          </div>
          <div className="flex flex-col gap-3">
            <p className="eyebrow">Highlights</p>
            <ul className="flex flex-col gap-2">
              {p.highlights.map((h) => (
                <li key={h} className="flex gap-2.5 text-[0.95rem] text-fg/90">
                  <span className="mt-2 size-1 shrink-0 rounded-full bg-signal" aria-hidden />
                  {h}
                </li>
              ))}
            </ul>
          </div>
          <div className="flex flex-col gap-3">
            <p className="eyebrow">Stack</p>
            <div className="flex flex-wrap gap-1.5">
              {p.stack.map((t) => (
                <span key={t} className="rounded-md border border-line px-2 py-1 font-mono text-[11px] text-soft">{t}</span>
              ))}
            </div>
          </div>
          <ProjectLink project={p} />
        </div>
      </div>
    </div>
  );
}
