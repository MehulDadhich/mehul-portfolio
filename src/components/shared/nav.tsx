"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ArrowDown, Menu, X } from "lucide-react";
import { profile, sections } from "@/lib/content";
import { scrollToId, scrollToY } from "@/components/providers/smooth-scroll";
import { openAssistant } from "@/components/assistant/assistant";
import { cn } from "@/lib/utils";

/** Which section is under the masthead right now. */
function useActiveSection() {
  const [active, setActive] = useState<string | null>(null);
  useEffect(() => {
    const ids = sections.map((s) => s.id);
    const els = ids.map((id) => document.getElementById(id)).filter(Boolean) as HTMLElement[];
    const seen = new Map<string, boolean>();
    // at the very bottom the last section can't reach the trigger line, so it wins outright
    const atBottom = () => window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4;
    const pick = () => setActive(atBottom() ? ids[ids.length - 1] : ids.find((id) => seen.get(id)) ?? null);
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) seen.set(e.target.id, e.isIntersecting);
        pick();
      },
      // a section counts once it crosses a line a little below the masthead
      { rootMargin: "-72px 0px -70% 0px" }
    );
    els.forEach((el) => io.observe(el));
    window.addEventListener("scroll", pick, { passive: true });
    return () => { io.disconnect(); window.removeEventListener("scroll", pick); };
  }, []);
  return active;
}

export function Nav() {
  const active = useActiveSection();
  const reduce = useReducedMotion();
  const [menu, setMenu] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const toggleBtn = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!menu) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setMenu(false);
      toggleBtn.current?.focus();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [menu]);

  const go = (id: string) => {
    setMenu(false);
    scrollToId(id);
  };

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-40 pt-[env(safe-area-inset-top,0px)] transition-[background-color,border-color] duration-300",
        scrolled || menu ? "border-b border-line bg-ink/85 backdrop-blur-md" : "border-b border-transparent"
      )}
    >
      <nav className="shell flex h-16 items-center justify-between gap-6" aria-label="Primary">
        <a
          href="#top"
          onClick={(e) => { e.preventDefault(); setMenu(false); scrollToY(0); }}
          className="group flex items-baseline gap-3"
        >
          <span className="serif text-[1.35rem] leading-none tracking-[-0.01em]">Mehul Dadhich</span>
          <span className="label hidden lg:inline">AI / ML Engineer</span>
        </a>

        <ul className="hidden items-center gap-1 md:flex">
          {sections.map((s) => (
            <li key={s.id}>
              <a
                href={`#${s.id}`}
                onClick={(e) => { e.preventDefault(); go(s.id); }}
                aria-current={active === s.id ? "location" : undefined}
                className={cn(
                  "relative px-3 py-2 text-[14px] transition-colors",
                  active === s.id ? "text-fg" : "text-soft hover:text-fg"
                )}
              >
                {s.label}
                {active === s.id ? (
                  <motion.span
                    layoutId={reduce ? undefined : "nav-mark"}
                    className="absolute inset-x-3 -bottom-px h-px bg-signal"
                    transition={{ type: "spring", stiffness: 500, damping: 40 }}
                    aria-hidden
                  />
                ) : null}
              </a>
            </li>
          ))}
        </ul>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={openAssistant}
            className="hidden h-9 items-center gap-2 rounded-full border border-line-strong px-3.5 text-[13px] text-fg transition-colors hover:border-fg sm:flex"
            aria-label="Ask Arc, Mehul's portfolio assistant (Ctrl + M)"
          >
            <span className="size-1.5 rounded-full bg-signal motion-safe:animate-[pulse-dot_2.4s_ease-in-out_infinite]" aria-hidden />
            Ask Arc
            <kbd className="font-mono text-[11px] text-soft">Ctrl M</kbd>
          </button>
          <a
            href={profile.resume}
            download
            className="flex h-9 items-center gap-1.5 rounded-full border border-fg px-3.5 text-[13px] font-medium text-fg transition-colors hover:bg-fg hover:text-ink sm:bg-fg sm:px-4 sm:text-ink sm:hover:opacity-85"
          >
            Résumé
            <ArrowDown className="size-3.5" aria-hidden />
          </a>
          <button
            type="button"
            ref={toggleBtn}
            onClick={() => setMenu((m) => !m)}
            className="grid size-11 place-items-center rounded-full text-fg md:hidden"
            aria-expanded={menu}
            aria-controls="mobile-menu"
            aria-label={menu ? "Close menu" : "Open menu"}
          >
            {menu ? <X className="size-5" aria-hidden /> : <Menu className="size-5" aria-hidden />}
          </button>
        </div>
      </nav>

      <AnimatePresence>
        {menu ? (
          <motion.div
            id="mobile-menu"
            initial={reduce ? { opacity: 0 } : { opacity: 0, height: 0 }}
            animate={reduce ? { opacity: 1 } : { opacity: 1, height: "auto" }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, height: 0 }}
            transition={{ duration: 0.25, ease: [0.2, 0, 0, 1] }}
            className="overflow-hidden border-t border-line md:hidden"
          >
            <ul className="shell flex flex-col py-2">
              {sections.map((s, i) => (
                <li key={s.id} className="border-b border-line last:border-0">
                  <a
                    href={`#${s.id}`}
                    onClick={(e) => { e.preventDefault(); go(s.id); }}
                    className="flex items-baseline gap-4 py-4"
                  >
                    <span className="label w-6">{String(i + 1).padStart(2, "0")}</span>
                    <span className="serif text-2xl">{s.label}</span>
                  </a>
                </li>
              ))}
              <li className="py-4">
                <button
                  type="button"
                  onClick={() => { setMenu(false); openAssistant(); }}
                  className="flex h-11 w-full items-center justify-center gap-2 rounded-full border border-line-strong text-[14px]"
                >
                  <span className="size-1.5 rounded-full bg-signal" aria-hidden />
                  Ask Arc about Mehul
                </button>
              </li>
            </ul>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </header>
  );
}
