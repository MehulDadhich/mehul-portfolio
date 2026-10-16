"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Dialog } from "@base-ui/react/dialog";
import { AnimatePresence, motion, useMotionValue, useReducedMotion, useSpring } from "motion/react";
import { ArrowLeft, ArrowRight, ArrowUpRight, Lock, X } from "lucide-react";
import { categories, projects, roadguardLessons, roadguardMetrics, type Category, type Project } from "@/lib/content";
import { SectionHeading } from "@/components/shared/section-heading";
import { Reveal } from "@/components/shared/reveal";
import { GithubIcon } from "@/components/shared/brand-icons";
import { lockScroll } from "@/components/providers/smooth-scroll";
import { Metric } from "@/components/shared/metric";
import { SystemFigure } from "./system-figure";
import { cn } from "@/lib/utils";

/** Window event that opens a project's sheet; its detail is the project id. */
export const OPEN_PROJECT = "arc:open-project";

/** Open a project's sheet from anywhere on the page (hero figures, experience, skills, Arc). */
export function openProject(id: string) {
  window.dispatchEvent(new CustomEvent(OPEN_PROJECT, { detail: id }));
}

const CAT_LABEL: Record<Category, string> = {
  cv: "Vision",
  genai: "GenAI",
  fullstack: "Full stack",
  industry: "Industry",
};

/**
 * One lead figure per project for the index, each lifted verbatim from that project's own content.
 * Projects without a measured number lead with their sharpest highlight instead.
 */
export const LEAD: Record<string, { value: string; label: string }> = {
  roadguard: { value: "25.2 ms", label: "Tier-1 latency p50" },
  astra: { value: "51 s → 6 s", label: "Cold start, saved prompt cache" },
  arc: { value: "71% → 90%", label: "Fact recall after QLoRA" },
  rehearse: { value: "≤ 2", label: "Follow-ups per question, server-enforced" },
  warehouse: { value: "ANPR", label: "Vehicle entry & exit tracking" },
  "task-agent": { value: "NL → task", label: "Keeps working when the LLM is down" },
  tmcs: { value: "Live", label: "Continuous CCTV processing" },
};

const PARAM = "p";

/**
 * Owns the open project: the sheet itself, the `?p=` deep link, Arc's open-project event and the scroll
 * lock while it's open. Mounted once on the page; anything opens a project with `openProject(id)`.
 */
export function ProjectSheetHost() {
  const [openId, setOpenId] = useState<string | null>(null);

  const show = useCallback((id: string | null) => {
    setOpenId(id);
    // the open project lives in the URL (?p=astra), so a project can be linked to directly
    const url = new URL(window.location.href);
    if (id) url.searchParams.set(PARAM, id);
    else url.searchParams.delete(PARAM);
    window.history.replaceState(null, "", url);
  }, []);

  useEffect(() => {
    const fromUrl = new URL(window.location.href).searchParams.get(PARAM);
    // a shared link (?p=astra) opens its project once the page has painted
    const raf = fromUrl && projects.some((p) => p.id === fromUrl) ? requestAnimationFrame(() => setOpenId(fromUrl)) : 0;
    // Arc (and the rest of the page) open a project with a window event
    const onOpen = (e: Event) => {
      const id = (e as CustomEvent<string>).detail;
      if (projects.some((p) => p.id === id)) show(id);
    };
    window.addEventListener(OPEN_PROJECT, onOpen);
    return () => { cancelAnimationFrame(raf); window.removeEventListener(OPEN_PROJECT, onOpen); };
  }, [show]);

  // while a project is open, the page behind it neither scrolls nor shows its scrollbar
  useEffect(() => {
    const on = openId !== null;
    lockScroll(on);
    document.documentElement.dataset.sheet = on ? "open" : "";
    return () => { lockScroll(false); document.documentElement.dataset.sheet = ""; };
  }, [openId]);

  const open = projects.find((p) => p.id === openId) ?? null;
  return <ProjectSheet project={open} onClose={() => show(null)} onGo={(id) => show(id)} />;
}

/** The work index: a filterable list of every project; rows open the sheet through `openProject`. */
export function Projects() {
  const [filter, setFilter] = useState<"all" | Category>("all");
  const list = projects.filter((p) => filter === "all" || p.categories.includes(filter));
  const show = (id: string) => openProject(id);

  // the inspector card that follows the cursor over the index (mouse only)
  const [hovered, setHovered] = useState<string | null>(null);
  const mx = useMotionValue(0), my = useMotionValue(0);
  const sx = useSpring(mx, { stiffness: 260, damping: 28, mass: 0.6 });
  const sy = useSpring(my, { stiffness: 260, damping: 28, mass: 0.6 });
  // scrolling moves the rows out from under a still cursor without a pointerleave, so let the card go
  useEffect(() => {
    if (!hovered) return;
    const clear = () => setHovered(null);
    window.addEventListener("scroll", clear, { passive: true, once: true });
    return () => window.removeEventListener("scroll", clear);
  }, [hovered]);

  return (
    <section id="work" aria-labelledby="work-title" className="shell scroll-mt-16 py-14 md:py-20">
      <SectionHeading
        n="02"
        kicker="Index"
        id="work-title"
        title="Selected work"
        standfirst="Seven systems, two of them shipped at Infrax.ai. Open any one for its architecture, results and stack."
      />

      <div className="mt-10 flex flex-wrap items-center gap-x-1 gap-y-2" role="group" aria-label="Filter projects">
        {categories.map((c) => {
          const on = filter === c.id;
          const count = c.id === "all" ? projects.length : projects.filter((p) => p.categories.includes(c.id as Category)).length;
          return (
            <button
              key={c.id}
              type="button"
              aria-pressed={on}
              onClick={() => setFilter(c.id)}
              className={cn(
                "label flex h-9 items-center gap-1.5 rounded-full px-3.5 transition-colors",
                on ? "bg-fg text-ink" : "hover:bg-ink-2 hover:text-fg"
              )}
            >
              {c.label}
              <span className={cn("num", on ? "text-ink/60" : "text-dim")}>{count}</span>
            </button>
          );
        })}
      </div>

      <p role="status" className="sr-only">{list.length} of {projects.length} projects shown</p>
      <ol
        className="mt-6 border-t border-fg"
        onPointerMove={(e) => { if (e.pointerType === "mouse") { mx.set(e.clientX); my.set(e.clientY); } }}
        onPointerLeave={() => setHovered(null)}
      >
        <AnimatePresence initial={false}>
          {list.map((p) => (
            <motion.li
              key={p.id}
              layout="position"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="border-b border-line"
            >
              <Reveal delay={Math.min(list.indexOf(p), 6) * 0.06}>
                <IndexRow project={p} onOpen={() => show(p.id)} onHover={(on) => setHovered(on ? p.id : null)} />
              </Reveal>
            </motion.li>
          ))}
        </AnimatePresence>
      </ol>

      <Inspector id={hovered} x={sx} y={sy} />
    </section>
  );
}

/**
 * Follows the cursor over the index: the hovered project's pipeline, its stages lighting in order,
 * with its lead figure and stack. Decorative (the same facts are in the row and the sheet).
 */
function Inspector({ id, x, y }: { id: string | null; x: ReturnType<typeof useSpring>; y: ReturnType<typeof useSpring> }) {
  const reduce = useReducedMotion();
  const p = projects.find((q) => q.id === id);
  if (reduce) return null;
  return (
    <motion.div
      aria-hidden
      className="pointer-events-none fixed top-0 left-0 z-30 hidden w-[300px] md:block"
      style={{ x, y, translateX: 28, translateY: "-50%" }}
      animate={{ opacity: p ? 1 : 0, scale: p ? 1 : 0.85, rotate: p ? 0 : -4 }}
      transition={{ type: "spring", stiffness: 300, damping: 26 }}
    >
      <AnimatePresence mode="popLayout" initial={false}>
        {p ? (
          <motion.div
            key={p.id}
            initial={{ opacity: 0, y: 14, filter: "blur(6px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            exit={{ opacity: 0, y: -10, filter: "blur(6px)" }}
            transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
            className="screen rounded-[4px] border border-line-strong bg-ink/95 p-4 shadow-[0_30px_60px_-20px_rgb(0_0_0/0.8)] backdrop-blur-md"
          >
            <p className="label mb-3 flex items-center justify-between">
              <span>pipeline · {p.architecture.length} stages</span>
              <span className="size-1.5 rounded-full bg-signal motion-safe:animate-[pulse-dot_1.2s_ease-in-out_infinite]" />
            </p>
            <ol className="flex flex-wrap items-center gap-1">
              {p.architecture.map((st, i) => (
                <li key={st.id} className="flex items-center gap-1">
                  <motion.span
                    className="border px-1.5 py-0.5 font-mono text-[10.5px]"
                    initial={{ borderColor: "#2a2925", color: "#8c887e" }}
                    animate={{ borderColor: ["#2a2925", "#ff5b2e", "#46443e"], color: ["#8c887e", "#efece4", "#efece4"] }}
                    transition={{ duration: 0.7, delay: 0.1 + i * 0.12, times: [0, 0.4, 1] }}
                  >
                    {st.label}
                  </motion.span>
                  {i < p.architecture.length - 1 ? <span className="text-[10px] text-dim">→</span> : null}
                </li>
              ))}
            </ol>
            {LEAD[p.id] && /\d/.test(LEAD[p.id].value) ? (
              <div className="mt-4 border-t border-line pt-3">
                <Metric value={LEAD[p.id].value} className="text-[1.6rem] leading-none" />
                <p className="mt-1 text-[12px] text-soft">{LEAD[p.id].label}</p>
              </div>
            ) : null}
            <p className="mt-3 font-mono text-[10.5px] leading-relaxed text-soft">{p.stack.slice(0, 5).join(" · ")}</p>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </motion.div>
  );
}

function IndexRow({ project: p, onOpen, onHover }: { project: Project; onOpen: () => void; onHover?: (on: boolean) => void }) {
  const n = projects.indexOf(p) + 1;
  const lead = LEAD[p.id];
  return (
    <button
      type="button"
      onClick={onOpen}
      onPointerEnter={(e) => e.pointerType === "mouse" && onHover?.(true)}
      onFocus={() => onHover?.(false)}
      data-detect-label={`project ${p.id}`}
      aria-haspopup="dialog"
      aria-labelledby={`row-${p.id}`}
      aria-describedby={`row-${p.id}-k`}
      className="group relative grid w-full grid-cols-12 items-baseline gap-x-6 gap-y-2 px-1 py-6 text-left transition-colors duration-200 before:absolute before:inset-y-0 before:left-0 before:w-0.5 before:origin-top before:scale-y-0 before:bg-signal before:transition-transform before:duration-300 hover:bg-panel hover:before:scale-y-100 focus-visible:bg-panel md:py-7 lg:gap-x-10"
    >
      <span className="num col-span-2 pl-2 text-[13px] text-soft md:col-span-1" aria-hidden>{String(n).padStart(2, "0")}</span>
      <span className="col-span-10 flex flex-col gap-1 transition-transform duration-300 ease-[cubic-bezier(0.2,0,0,1)] group-hover:translate-x-1 md:col-span-5">
        <span className="relative block overflow-hidden">
          <span id={`row-${p.id}`} className="serif block text-[clamp(1.5rem,1.2rem+1vw,2.1rem)] leading-[1.15] tracking-[-0.01em] transition-transform duration-500 ease-[cubic-bezier(0.7,0,0.2,1)] group-hover:-translate-y-full">{p.title}</span>
          <span className="serif absolute inset-x-0 top-0 block translate-y-full text-[clamp(1.5rem,1.2rem+1vw,2.1rem)] leading-[1.15] tracking-[-0.01em] italic text-signal transition-transform duration-500 ease-[cubic-bezier(0.7,0,0.2,1)] group-hover:translate-y-0" aria-hidden>{p.title}</span>
        </span>
        <span id={`row-${p.id}-k`} className="serif text-[1.02rem] italic text-soft">{p.kicker}</span>
      </span>
      <span className="col-span-10 col-start-3 flex flex-wrap gap-x-3 gap-y-1 md:col-span-2 md:col-start-auto">
        {p.categories.map((c) => (
          <span key={c} className="label">{CAT_LABEL[c]}</span>
        ))}
      </span>
      {lead ? (
        <span className="col-span-10 col-start-3 flex flex-col md:col-span-3 md:col-start-auto">
          {/\d/.test(lead.value) ? (
            <Metric value={lead.value} className="text-[1.35rem] leading-tight text-fg" />
          ) : (
            <span className="serif text-[1.15rem] italic leading-tight text-fg">{lead.value}</span>
          )}
          <span className="text-[13px] leading-snug text-soft">{lead.label}</span>
        </span>
      ) : null}
      <span className="col-span-12 hidden justify-end md:col-span-1 md:flex" aria-hidden>
        <ArrowUpRight className="size-5 text-soft transition-[transform,color] duration-200 group-hover:translate-x-1 group-hover:-translate-y-1 group-hover:text-signal" />
      </span>
    </button>
  );
}

function ProjectSheet({ project, onClose, onGo }: { project: Project | null; onClose: () => void; onGo: (id: string) => void }) {
  const reduce = useReducedMotion();
  const i = project ? projects.indexOf(project) : -1;
  const prev = i >= 0 ? projects[(i - 1 + projects.length) % projects.length] : null;
  const next = i >= 0 ? projects[(i + 1) % projects.length] : null;
  const popup = useRef<HTMLDivElement>(null);
  const id = project?.id;

  // moving to another project starts it at the top, with focus on the sheet rather than lost on a button that unmounted
  useEffect(() => {
    if (!id) return;
    popup.current?.scrollTo({ top: 0 });
    popup.current?.focus({ preventScroll: true });
  }, [id]);

  // ← / → page through the projects while the sheet is open (unless a stage rail has focus; it uses the arrows itself)
  useEffect(() => {
    if (!id || !prev || !next) return;
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).closest("[role=tablist], input, textarea")) return;
      if (e.key === "ArrowLeft") onGo(prev.id);
      if (e.key === "ArrowRight") onGo(next.id);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [id, prev, next, onGo]);

  return (
    <Dialog.Root open={project !== null} onOpenChange={(o) => { if (!o) onClose(); }}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-50 bg-[#2b1d12]/25 backdrop-blur-[1.5px] transition-opacity duration-300 data-[ending-style]:opacity-0 data-[starting-style]:opacity-0" />
        <Dialog.Popup
          ref={popup}
          data-lenis-prevent
          // focus the sheet itself on open, so keyboard users start at the top without a ring on the close button
          initialFocus={popup}
          data-sheet
          tabIndex={-1}
          className={cn(
            "no-scrollbar fixed inset-y-0 right-0 z-50 flex w-full flex-col overflow-y-auto overscroll-contain bg-ink shadow-[-30px_0_80px_-40px_rgb(20_14_8/0.5)] outline-none md:w-[min(920px,72vw)] md:border-l md:border-line",
            reduce ? "transition-opacity duration-200 data-[ending-style]:opacity-0 data-[starting-style]:opacity-0"
              : "transition-transform duration-500 ease-[cubic-bezier(0.2,0,0,1)] data-[ending-style]:translate-x-full data-[starting-style]:translate-x-full data-[ending-style]:duration-300"
          )}
        >
          {project ? (
            <>
              <div className="sticky top-0 z-10 flex h-14 shrink-0 items-center justify-between border-b border-line bg-ink/90 px-5 backdrop-blur-md md:px-10">
                <p className="label">
                  No. <span className="num text-fg">{String(i + 1).padStart(2, "0")}</span> / {String(projects.length).padStart(2, "0")}
                </p>
                <Dialog.Close className="-mr-2 grid size-11 place-items-center rounded-full text-soft transition-colors hover:text-fg" aria-label="Close project">
                  <X className="size-5" aria-hidden />
                </Dialog.Close>
              </div>
              <AnimatePresence mode="wait" initial={false}>
                <motion.article
                  key={project.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.18 }}
                  className="flex flex-col gap-12 px-5 pt-8 pb-10 md:px-10 md:pt-12"
                >
                  <ProjectDetail project={project} />
                  <nav className="grid grid-cols-2 gap-4 border-t border-fg pt-5" aria-label="More projects">
                    {prev ? (
                      <button type="button" onClick={() => onGo(prev.id)} className="group flex flex-col items-start gap-1 text-left">
                        <span className="label flex items-center gap-1.5"><ArrowLeft className="size-3.5 transition-transform group-hover:-translate-x-0.5" aria-hidden /> Previous</span>
                        <span className="serif text-xl">{prev.title}</span>
                      </button>
                    ) : <span />}
                    {next ? (
                      <button type="button" onClick={() => onGo(next.id)} className="group flex flex-col items-end gap-1 text-right">
                        <span className="label flex items-center gap-1.5">Next <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" aria-hidden /></span>
                        <span className="serif text-xl">{next.title}</span>
                      </button>
                    ) : null}
                  </nav>
                </motion.article>
              </AnimatePresence>
            </>
          ) : null}
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function ProjectDetail({ project: p }: { project: Project }) {
  const isRoadguard = p.id === "roadguard";
  return (
    <>
      <header className="flex flex-col gap-4">
        <div className="flex flex-wrap gap-x-3 gap-y-1">
          {p.categories.map((c) => <span key={c} className="label">{CAT_LABEL[c]}</span>)}
        </div>
        <Dialog.Title className="serif text-[clamp(2.4rem,1.8rem+2.6vw,4rem)] leading-[1] tracking-[-0.02em]">{p.title}</Dialog.Title>
        <Dialog.Description className="serif text-[1.3rem] italic leading-snug text-soft">{p.kicker}</Dialog.Description>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <ProjectLinks project={p} />
        </div>
      </header>

      <div className="grid grid-cols-1 gap-8 md:grid-cols-2 md:gap-10">
        <div className="flex flex-col gap-2 border-t border-line pt-4">
          <p className="label">Problem</p>
          <p className="text-[1.02rem] leading-[1.65]">{p.problem}</p>
        </div>
        <div className="flex flex-col gap-2 border-t border-line pt-4">
          <p className="label">Approach</p>
          <p className="text-[1.02rem] leading-[1.65]">{p.solution}</p>
        </div>
      </div>

      <SystemFigure stages={p.architecture} />

      {isRoadguard ? (
        <section aria-label="Results" className="flex flex-col gap-3">
          <p className="label"><span className="text-fg">Table 1</span> · Measured results</p>
          <ResultsTable />
        </section>
      ) : null}

      <section aria-label="Findings" className="flex flex-col gap-3">
        <p className="label">{isRoadguard ? "Highlights" : "Findings"}</p>
        <ol className="flex flex-col border-t border-line">
          {p.highlights.map((h, k) => (
            <li key={h} className="grid grid-cols-12 gap-x-4 border-b border-line py-3">
              <span className="num col-span-2 text-[13px] text-signal md:col-span-1">{String(k + 1).padStart(2, "0")}</span>
              <span className="col-span-10 text-[1rem] leading-relaxed md:col-span-11">{h}</span>
            </li>
          ))}
        </ol>
      </section>

      {isRoadguard ? (
        <section aria-label="Lessons" className="flex flex-col gap-3">
          <p className="label">Discussion · what the data said</p>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {roadguardLessons.map((l) => (
              <div key={l.title} className="flex flex-col gap-1.5 border-t border-line pt-3">
                <p className="serif text-[1.2rem] italic">{l.title}</p>
                <p className="text-[0.95rem] leading-relaxed text-soft">{l.body}</p>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <section aria-label="Stack" className="flex flex-col gap-3">
        <p className="label">Stack</p>
        <p className="font-mono text-[13px] leading-[1.9] text-fg">
          {p.stack.map((s, k) => (
            <span key={s}>
              {s}
              {k < p.stack.length - 1 ? <span className="px-2 text-line-strong" aria-hidden>/</span> : null}
            </span>
          ))}
        </p>
      </section>
    </>
  );
}

export function ResultsTable() {
  return (
    <table className="w-full border-collapse text-left">
      <thead>
        <tr className="border-y border-fg">
          <th scope="col" className="label py-2 pr-4 font-normal">Value</th>
          <th scope="col" className="label py-2 pr-4 font-normal">Metric</th>
          <th scope="col" className="label hidden py-2 font-normal sm:table-cell">Conditions</th>
        </tr>
      </thead>
      <tbody>
        {roadguardMetrics.map((m) => (
          <tr key={m.label} className="border-b border-line align-baseline">
            <td className="py-3 pr-4 whitespace-nowrap"><Metric value={m.value} className="text-[1.5rem]" /></td>
            <td className="py-3 pr-4 text-[0.95rem]">
              {m.label}
              <span className="mt-0.5 block text-[13px] text-soft sm:hidden">{m.note}</span>
            </td>
            <td className="hidden py-3 text-[13px] text-soft sm:table-cell">{m.note}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function ProjectLinks({ project: p }: { project: Project }) {
  const pill = "flex h-10 items-center gap-2 rounded-full border border-line-strong px-4 text-[13px] text-fg transition-colors hover:border-fg";
  if (!p.github && !p.demo) {
    return (
      <span className="flex items-center gap-2 text-[13px] text-soft">
        <Lock className="size-3.5" aria-hidden /> {p.linkNote ?? "Code not public"}
      </span>
    );
  }
  return (
    <>
      {p.demo ? (
        <a href={p.demo} target="_blank" rel="noreferrer" className={pill}>
          Live site <ArrowUpRight className="size-3.5 text-soft" aria-hidden />
        </a>
      ) : null}
      {p.github ? (
        <a href={p.github} target="_blank" rel="noreferrer" className={pill}>
          <GithubIcon className="size-3.5" /> Code <ArrowUpRight className="size-3.5 text-soft" aria-hidden />
        </a>
      ) : null}
    </>
  );
}
