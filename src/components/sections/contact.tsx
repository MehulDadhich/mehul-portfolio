"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { motion, useReducedMotion } from "motion/react";
import { ArrowDown, ArrowUpRight, Check, Copy } from "lucide-react";
import { gmailCompose, profile } from "@/lib/content";
import { GithubIcon, LinkedinIcon } from "@/components/shared/brand-icons";
import { openAssistant } from "@/components/assistant/assistant";
import { Magnetic, Scramble, SplitReveal } from "@/components/shared/motion-kit";

const ContactScene = dynamic(() => import("./contact-scene"), { ssr: false });

/**
 * §06: the closing scene. The hero's lens comes back, hovering over an envelope it classifies as
 * "email 0.99"; the headline arrives letter by letter, the address is magnetic, and the ways to reach
 * him draw in one after another.
 */
export function Contact() {
  const reduce = useReducedMotion();
  const [copied, setCopied] = useState(false);
  const stageRef = useRef<HTMLDivElement>(null);
  const [near, setNear] = useState(false);
  const [active, setActive] = useState(false);

  useEffect(() => {
    const el = stageRef.current!;
    const pre = new IntersectionObserver(([e]) => e.isIntersecting && setNear(true), { rootMargin: "100% 0px" });
    const on = new IntersectionObserver(([e]) => setActive(e.isIntersecting));
    pre.observe(el);
    on.observe(el);
    return () => { pre.disconnect(); on.disconnect(); };
  }, []);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(profile.email);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {}
  };

  const links = [
    { label: "GitHub", href: profile.github, icon: <GithubIcon className="size-4" />, ext: true },
    { label: "LinkedIn", href: profile.linkedin, icon: <LinkedinIcon className="size-4" />, ext: true },
    { label: "Résumé (PDF)", href: profile.resume, icon: <ArrowDown className="size-4" aria-hidden />, download: true },
    { label: profile.phone, href: `tel:${profile.phone.replace(/\s/g, "")}`, icon: null },
  ];

  return (
    <section id="contact" aria-labelledby="contact-title" className="relative scroll-mt-16 overflow-hidden">
      <div className="shell py-14 md:py-20">
        <p className="label relative pt-4">
          <motion.span
            className="absolute inset-x-0 top-0 h-px origin-left bg-fg"
            initial={reduce ? false : { scaleX: 0 }}
            whileInView={{ scaleX: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 1.4, ease: [0.7, 0, 0.2, 1] }}
            aria-hidden
          />
          <span className="text-fg">§06</span> · <Scramble text="Correspondence" />
        </p>

        <div className="mt-8 grid grid-cols-12 items-center gap-x-6 gap-y-6 lg:gap-x-10">
          <div className="relative z-10 col-span-12 lg:col-span-6">
            <SplitReveal
              as="h2"
              by="chars"
              id="contact-title"
              className="serif max-w-[15ch] text-[clamp(2.6rem,1.5rem+4.4vw,6rem)] leading-[0.98] tracking-[-0.03em]"
            >
              <span className="sr-only">Contact. </span>
              Need a model taken <em className="text-signal">past the notebook?</em>
            </SplitReveal>

            <div className="mt-10 flex flex-wrap items-center gap-3">
              <Magnetic strength={0.18}>
                <a href={gmailCompose()} target="_blank" rel="noreferrer" className="serif ink-link text-[clamp(1.35rem,1rem+1.6vw,2.4rem)] leading-tight break-all sm:break-normal">
                  {profile.email}
                </a>
              </Magnetic>
              <Magnetic strength={0.4}>
                <button
                  type="button"
                  onClick={copy}
                  aria-label="Copy email address"
                  className="flex h-10 items-center gap-1.5 rounded-full border border-line-strong px-3.5 text-[13px] text-soft transition-colors hover:border-fg hover:text-fg"
                >
                  {copied ? <Check className="size-3.5 text-ok" aria-hidden /> : <Copy className="size-3.5" aria-hidden />}
                  {copied ? "Copied" : "Copy"}
                </button>
              </Magnetic>
              <span role="status" className="sr-only">{copied ? "Email address copied" : ""}</span>
            </div>
          </div>

          {/* the lens, set down */}
          <div ref={stageRef} className="relative col-span-12 h-[min(80vw,440px)] lg:col-span-6 lg:-mr-10 lg:h-[min(40vw,560px)]">
            {near ? <ContactScene active={active} /> : null}
            <p className="label pointer-events-none absolute bottom-2 right-0 text-[10.5px]" aria-hidden>
              Fig. 2 · the lens, set down
            </p>
          </div>
        </div>

        <ul className="mt-10 grid grid-cols-1 sm:grid-cols-2 sm:gap-x-8 lg:grid-cols-4">
          {links.map((l, i) => (
            <motion.li
              key={l.label}
              className="relative"
              initial={reduce ? false : { opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "0px 0px -6% 0px" }}
              transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1], delay: i * 0.08 }}
            >
              <motion.span
                className="absolute inset-x-0 top-0 h-px origin-left bg-line-strong"
                initial={reduce ? false : { scaleX: 0 }}
                whileInView={{ scaleX: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 1, ease: [0.7, 0, 0.2, 1], delay: 0.1 + i * 0.08 }}
                aria-hidden
              />
              <a
                href={l.href}
                {...(l.ext ? { target: "_blank", rel: "noreferrer" } : {})}
                {...(l.download ? { download: true } : {})}
                className="group relative flex h-16 items-center justify-between gap-3 overflow-hidden pr-2 text-[15px]"
              >
                {/* a fill that wipes up from below on hover */}
                <span className="absolute inset-0 origin-bottom scale-y-0 bg-fg transition-transform duration-500 ease-[cubic-bezier(0.7,0,0.2,1)] group-hover:scale-y-100" aria-hidden />
                <span className="relative flex items-center gap-2.5 pl-2 transition-colors duration-300 group-hover:text-ink">
                  {l.icon}
                  <span className={l.icon ? "" : "num"}>{l.label}</span>
                </span>
                <ArrowUpRight className="relative size-4 text-soft transition-[transform,color] duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-ink" aria-hidden />
              </a>
            </motion.li>
          ))}
        </ul>

        <p className="mt-8 text-[15px] text-soft">
          Rather ask first?{" "}
          <button type="button" onClick={openAssistant} className="text-fg underline decoration-line-strong underline-offset-4 transition-colors hover:decoration-signal">
            Arc answers from this site&rsquo;s facts
          </button>{" "}
          — <kbd className="font-mono text-[13px]">Ctrl M</kbd>.
        </p>
      </div>
    </section>
  );
}
