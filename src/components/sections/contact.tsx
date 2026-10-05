"use client";

import { useState } from "react";
import { ArrowUpRight, Check, Copy, Download, MapPin } from "lucide-react";
import { profile } from "@/lib/content";
import { Magnetic } from "@/components/shared/magnetic";
import { SplitHeading } from "@/components/shared/split-heading";
import { GithubIcon, LinkedinIcon } from "@/components/shared/brand-icons";

export function Contact() {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard?.writeText(profile.email).then(
      () => { setCopied(true); setTimeout(() => setCopied(false), 1800); },
      () => {}
    );
  };

  return (
    <section id="contact" aria-labelledby="contact-title" className="relative isolate overflow-hidden border-t border-line">
      {/* keep the headline readable over the site's LiDAR backdrop */}
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(70%_85%_at_0%_70%,rgb(10_11_16/0.7)_28%,transparent_72%)]" aria-hidden />
      <div className="pointer-events-none mx-auto flex max-w-[1400px] flex-col items-start gap-7 px-4 py-20 sm:px-6 lg:px-10 lg:py-14">
        <p className="eyebrow flex items-center gap-3"><span className="text-signal">08</span><span className="h-px w-8 bg-line-strong" />Contact</p>
        <SplitHeading id="contact-title" detect="opportunity 0.99" className="display max-w-[16ch] text-[clamp(2.25rem,4.6vw,4.25rem)] font-bold">
          Let&apos;s build something intelligent.
        </SplitHeading>
        <p className="max-w-[52ch] text-[1.1rem] leading-relaxed text-soft">
          I&apos;m looking for AI/ML engineering roles working on computer vision, LLM agents or the systems around them.
          The fastest way to reach me is email.
        </p>

        <div className="pointer-events-auto flex flex-col gap-4 sm:flex-row sm:items-center">
          <div className="flex items-center gap-1 rounded-full border border-line-strong bg-ink/80 p-1.5 pl-5 backdrop-blur">
            <a href={`mailto:${profile.email}`} className="font-mono text-[clamp(0.85rem,1.6vw,1.05rem)] text-fg underline-offset-4 hover:underline">
              {profile.email}
            </a>
            <button
              type="button"
              onClick={copy}
              className="ml-3 flex items-center gap-1.5 rounded-full bg-fg px-3.5 py-2 text-[13px] font-medium text-ink"
              aria-label="Copy email address"
            >
              {copied ? <Check className="size-3.5" aria-hidden /> : <Copy className="size-3.5" aria-hidden />}
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
        </div>

        <ul className="pointer-events-auto flex flex-wrap gap-3">
          <li>
            <Magnetic>
              <a href={profile.linkedin} target="_blank" rel="noreferrer" className="flex items-center gap-2 rounded-full border border-line-strong bg-ink/70 px-4 py-2.5 text-sm text-fg backdrop-blur transition-colors hover:border-fg/50">
                <LinkedinIcon className="size-4" /> LinkedIn <ArrowUpRight className="size-3.5 text-dim" aria-hidden />
              </a>
            </Magnetic>
          </li>
          <li>
            <Magnetic>
              <a href={profile.github} target="_blank" rel="noreferrer" className="flex items-center gap-2 rounded-full border border-line-strong bg-ink/70 px-4 py-2.5 text-sm text-fg backdrop-blur transition-colors hover:border-fg/50">
                <GithubIcon className="size-4" /> GitHub <ArrowUpRight className="size-3.5 text-dim" aria-hidden />
              </a>
            </Magnetic>
          </li>
          <li>
            <Magnetic>
              <a href={profile.resume} download className="flex items-center gap-2 rounded-full border border-line-strong bg-ink/70 px-4 py-2.5 text-sm text-fg backdrop-blur transition-colors hover:border-fg/50">
                <Download className="size-4" aria-hidden /> Resume (PDF)
              </a>
            </Magnetic>
          </li>
        </ul>

        <p className="flex items-center gap-2 font-mono text-[12px] text-dim">
          <MapPin className="size-3.5" aria-hidden /> {profile.location} · {profile.phone}
        </p>
      </div>
    </section>
  );
}
