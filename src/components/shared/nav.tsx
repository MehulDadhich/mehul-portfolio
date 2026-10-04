"use client";

import { motion, useScroll, useSpring } from "motion/react";
import { Download } from "lucide-react";
import { profile, sections } from "@/lib/content";
import { scrollToId, scrollToY } from "@/components/providers/smooth-scroll";
import { openCommandPalette } from "./command-palette";

export function Nav() {
  const { scrollYProgress } = useScroll();
  const progress = useSpring(scrollYProgress, { stiffness: 140, damping: 30, mass: 0.3 });

  return (
    <header className="fixed inset-x-0 top-0 z-40 pt-[env(safe-area-inset-top,0px)]">
      <div className="border-b border-line bg-ink/70 backdrop-blur-md">
        <nav className="mx-auto flex h-14 max-w-[1400px] items-center justify-between gap-4 px-4 sm:px-6 lg:px-10" aria-label="Primary">
          <a
            href="#top"
            onClick={(e) => { e.preventDefault(); scrollToY(0); }}
            className="group flex items-center gap-2.5 font-mono text-[13px] text-fg"
          >
            <span className="relative grid size-7 place-items-center rounded-[6px] border border-line-strong font-display text-[11px] font-bold tracking-tight">
              MD
              <span className="absolute -right-1 -top-1 size-1.5 rounded-full bg-ok animate-[pulse-dot_2.4s_ease-in-out_infinite]" aria-hidden />
            </span>
            <span className="hidden sm:inline tracking-[0.08em] text-soft group-hover:text-fg transition-colors">MEHUL DADHICH</span>
          </a>

          <ul className="hidden items-center gap-7 md:flex">
            {sections.map((s) => (
              <li key={s.id}>
                <a
                  href={`#${s.id}`}
                  onClick={(e) => { e.preventDefault(); scrollToId(s.id); }}
                  className="text-[13px] text-soft transition-colors hover:text-fg"
                >
                  {s.label}
                </a>
              </li>
            ))}
          </ul>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={openCommandPalette}
              className="hidden items-center gap-2 rounded-md border border-line px-2.5 py-1.5 font-mono text-[12px] text-soft transition-colors hover:border-line-strong hover:text-fg sm:flex"
              aria-label="Open command palette"
            >
              <kbd className="font-mono">Ctrl</kbd>
              <span className="text-dim">+</span>
              <kbd className="font-mono">K</kbd>
            </button>
            <a
              href={profile.resume}
              download
              className="flex items-center gap-2 rounded-md bg-fg px-3 py-1.5 text-[13px] font-medium text-ink transition-opacity hover:opacity-90"
            >
              <Download className="size-3.5" aria-hidden />
              Resume
            </a>
          </div>
        </nav>
      </div>
      <motion.div
        className="h-px origin-left bg-gradient-to-r from-signal via-model to-reason"
        style={{ scaleX: progress }}
        aria-hidden
      />
    </header>
  );
}
