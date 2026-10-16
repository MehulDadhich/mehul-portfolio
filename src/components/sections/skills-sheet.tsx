"use client";

import { useEffect, useRef, useState } from "react";
import { Dialog } from "@base-ui/react/dialog";
import { useReducedMotion } from "motion/react";
import { X } from "lucide-react";
import { evidence, skillGroups } from "@/lib/content";
import { openProject } from "@/components/projects/projects";
import { lockScroll } from "@/components/providers/smooth-scroll";
import { cn } from "@/lib/utils";

/** Window event that opens the full skills list (the "See all skills" button in the flight sends it). */
const OPEN_SKILLS = "md:open-skills";
export const openSkills = () => window.dispatchEvent(new Event(OPEN_SKILLS));

const NAME = Object.fromEntries(evidence.map((e) => [e.id, e.label.replace("Infrax.ai ", "")]));
const proven = skillGroups.reduce((n, g) => n + g.skills.filter((s) => s.used.length).length, 0);

/**
 * Every skill, by area, each with the projects that used it as buttons into those projects. Skills not yet
 * used in a project are listed separately rather than mixed in. Same side-sheet pattern as a project.
 */
export function SkillsSheet() {
  const reduce = useReducedMotion();
  const [open, setOpen] = useState(false);
  const popup = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const on = () => setOpen(true);
    window.addEventListener(OPEN_SKILLS, on);
    return () => window.removeEventListener(OPEN_SKILLS, on);
  }, []);

  useEffect(() => {
    lockScroll(open);
    if (open) document.documentElement.dataset.sheet = "open";
    else if (document.documentElement.dataset.sheet === "open") document.documentElement.dataset.sheet = "";
    return () => lockScroll(false);
  }, [open]);

  const go = (id: string) => {
    setOpen(false);
    // let this sheet close before the project's opens
    setTimeout(() => openProject(id), 320);
  };

  const studied = skillGroups.flatMap((g) => g.skills.filter((s) => !s.used.length).map((s) => s.name));

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-50 bg-[#05070f]/55 backdrop-blur-[2px] transition-opacity duration-300 data-[ending-style]:opacity-0 data-[starting-style]:opacity-0" />
        <Dialog.Popup
          ref={popup}
          // focus the sheet itself, so opening it doesn't light a focus ring on the close button
          initialFocus={popup}
          tabIndex={-1}
          data-lenis-prevent
          className={cn(
            "no-scrollbar fixed inset-y-0 left-0 z-50 flex w-full flex-col overflow-y-auto overscroll-contain bg-ink outline-none md:w-[min(820px,68vw)] md:border-r md:border-line",
            reduce ? "transition-opacity duration-200 data-[ending-style]:opacity-0 data-[starting-style]:opacity-0"
              : "transition-transform duration-500 ease-[cubic-bezier(0.2,0,0,1)] data-[ending-style]:-translate-x-full data-[starting-style]:-translate-x-full data-[ending-style]:duration-300"
          )}
        >
          <div className="sticky top-0 z-10 flex h-14 shrink-0 items-center justify-between border-b border-line bg-ink/90 px-5 backdrop-blur-md md:px-10">
            <p className="label">Skills · {proven} traced to projects</p>
            <Dialog.Close className="-mr-2 grid size-11 place-items-center rounded-full text-soft transition-colors hover:text-fg" aria-label="Close skills">
              <X className="size-5" aria-hidden />
            </Dialog.Close>
          </div>

          <div className="flex flex-col gap-10 px-5 pt-8 pb-12 md:px-10 md:pt-10">
            <header className="flex flex-col gap-3">
              <Dialog.Title className="serif text-[clamp(2.2rem,1.6rem+2.4vw,3.6rem)] leading-[1] tracking-[-0.02em]">
                Skills, <em className="text-signal">traced</em>
              </Dialog.Title>
              <Dialog.Description className="max-w-[60ch] text-[15px] leading-relaxed text-soft">
                Every skill below was used in at least one project. Tap a project to open it.
              </Dialog.Description>
            </header>

            {skillGroups.map((g) => {
              const used = g.skills.filter((s) => s.used.length);
              if (!used.length) return null;
              return (
                <section key={g.id} aria-labelledby={`sg-${g.id}`} className="flex flex-col gap-3">
                  <div className="flex items-baseline justify-between gap-3 border-b border-fg pb-2">
                    <h3 id={`sg-${g.id}`} className="serif text-[1.45rem] italic leading-tight">{g.label}</h3>
                    <span className="label">{used.length}</span>
                  </div>
                  <ul className="flex flex-col">
                    {used.map((s) => (
                      <li key={s.name} className="grid grid-cols-1 gap-x-6 gap-y-2 border-b border-line py-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
                        <span className="text-[15.5px] text-fg">{s.name}</span>
                        <span className="flex flex-wrap gap-1.5 sm:justify-end">
                          {s.used.map((id) => (
                            <button
                              key={id}
                              type="button"
                              onClick={() => go(id)}
                              aria-haspopup="dialog"
                              className="rounded-full border border-line-strong px-2.5 py-1 font-mono text-[11px] text-soft transition-colors hover:border-signal hover:text-fg"
                            >
                              {NAME[id] ?? id}
                            </button>
                          ))}
                        </span>
                      </li>
                    ))}
                  </ul>
                </section>
              );
            })}

            {studied.length ? (
              <p className="text-[14px] leading-relaxed text-soft">
                <span className="label mr-2">Studied, not yet in a project</span>
                {studied.join(", ")}
              </p>
            ) : null}
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
