import { experience } from "@/lib/content";
import { SectionHeading } from "@/components/shared/section-heading";
import { Reveal } from "@/components/shared/reveal";

/** The internship, presented like the operator console the work fed into. */
export function Experience() {
  return (
    <section id="experience" aria-labelledby="experience-title" className="relative border-t border-line bg-ink-2/60">
      <div className="mx-auto flex max-w-[1400px] flex-col gap-12 px-4 py-24 sm:px-6 lg:px-10 lg:py-24">
        <SectionHeading
          index="04"
          eyebrow="Experience"
          detect="industry 0.98"
          title={<span id="experience-title">Six months on live traffic cameras.</span>}
          lede="At Infrax.ai I worked on the computer-vision module of an Advanced Traffic Management System, the part that watches the road and tells operators when something is wrong."
        />

        <Reveal className="overflow-hidden rounded-2xl border border-line bg-ink">
          {/* console header */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-3.5 font-mono text-[12px] sm:px-6">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1.5 text-ok">
                <span className="size-1.5 rounded-full bg-ok animate-[pulse-dot_2.4s_ease-in-out_infinite]" aria-hidden />
                deployed
              </span>
              <span className="text-dim">/</span>
              <span className="text-fg">{experience.company}</span>
              <span className="hidden text-dim sm:inline">·</span>
              <span className="hidden text-soft sm:inline">{experience.system}</span>
            </div>
            <span className="text-soft">{experience.period} · {experience.mode}</span>
          </div>

          <div className="grid lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
            <div className="flex flex-col gap-6 border-b border-line p-6 sm:p-8 lg:border-b-0 lg:border-r">
              <div className="flex flex-col gap-2">
                <p className="eyebrow">Role</p>
                <p className="font-display text-2xl font-semibold [font-stretch:110%]">{experience.role}</p>
              </div>
              <div className="flex flex-col gap-3">
                <p className="eyebrow">What the system watches for</p>
                <ul className="grid grid-cols-2 gap-2">
                  {experience.watches.map((w, i) => (
                    <Reveal as="li" variant="pop" delay={0.15 + i * 0.07} key={w} className="relative flex items-center gap-2 overflow-hidden rounded-md border border-line px-2.5 py-2 font-mono text-[11.5px] text-soft">
                      <span
                        className={i === 0 ? "size-1.5 rounded-full bg-signal" : "size-1.5 rounded-full bg-alert"}
                        aria-hidden
                      />
                      {w}
                      {/* a detection "flash" that walks across the chips in turn */}
                      <span
                        className="pointer-events-none absolute inset-0 rounded-md border border-signal opacity-0 animate-[chip-flash_7.2s_ease-in-out_infinite]"
                        style={{ animationDelay: `${i * 1.2}s` }}
                        aria-hidden
                      />
                    </Reveal>
                  ))}
                </ul>
              </div>
              <div className="flex flex-col gap-2">
                <p className="eyebrow">Stack</p>
                <p className="font-mono text-[12px] leading-relaxed text-soft">YOLOv8 · YOLO11 · Python · OpenCV · MediaMTX · FFmpeg · FastAPI · PostgreSQL</p>
              </div>
            </div>

            <ol className="flex flex-col">
              {experience.work.map((w, i) => (
                <Reveal as="li" variant="left" delay={i * 0.1} key={w.verb} className="grid grid-cols-[6.5rem_1fr] gap-4 border-b border-line p-6 last:border-b-0 sm:grid-cols-[8rem_1fr] sm:px-8">
                  <span className="flex items-start gap-2 font-mono text-[12px] uppercase tracking-[0.12em] text-signal">
                    <span className="text-dim">{String(i + 1).padStart(2, "0")}</span>
                    {w.verb}
                  </span>
                  <p className="text-[0.98rem] leading-relaxed text-fg/90">{w.body}</p>
                </Reveal>
              ))}
            </ol>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
