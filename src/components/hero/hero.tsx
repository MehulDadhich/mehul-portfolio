"use client";

import { useEffect, useRef, type ComponentType } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { ScrambleTextPlugin } from "gsap/ScrambleTextPlugin";
import { useGSAP } from "@gsap/react";
import { ArrowDown, Download } from "lucide-react";
import { profile } from "@/lib/content";
import { scrollToId } from "@/components/providers/smooth-scroll";
import { Magnetic } from "@/components/shared/magnetic";
import { SignalPath } from "./signal-path";
import { DiffusionName } from "./diffusion-name";
import {
  AgentVisual, BackendVisual, GenAIVisual, NLPVisual, RealWorldVisual, VisionVisual,
} from "./frame-visuals";

gsap.registerPlugin(ScrollTrigger, ScrambleTextPlugin, useGSAP);

type Frame = { label: string; tech: string; usedIn: string; Visual: ComponentType; float: "a" | "b"; color: string };

const FRAMES: Frame[] = [
  { label: "Computer Vision", tech: "YOLOv8 · YOLO11 · OpenCV", usedIn: "RoadGuard · TMCS · Warehouse", Visual: VisionVisual, float: "a", color: "233,196,106" },
  { label: "Generative AI", tech: "VLM verification · Gemini", usedIn: "RoadGuard · AI Task Manager", Visual: GenAIVisual, float: "b", color: "201,184,255" },
  { label: "NLP", tech: "Intent · date extraction", usedIn: "AI Task Manager", Visual: NLPVisual, float: "a", color: "241,214,146" },
  { label: "Backend Systems", tech: "FastAPI · PostgreSQL · WebSockets", usedIn: "TMCS · Warehouse", Visual: BackendVisual, float: "b", color: "143,209,158" },
  { label: "AI Agents", tech: "LangGraph · tool calling", usedIn: "AI Task Manager", Visual: AgentVisual, float: "a", color: "201,184,255" },
  { label: "Real-world AI", tech: "Live RTSP CCTV · incidents", usedIn: "TMCS · RoadGuard", Visual: RealWorldVisual, float: "b", color: "255,107,94" },
];

/** Where each frame floats at rest (fractions of the hero box), its tilt, and its parallax depth. */
const SCATTER: [number, number, number, number][] = [
  [0.69, 0.25, -5, 1.3],
  [0.885, 0.34, 4, 0.8],
  [0.665, 0.53, 3, 1.1],
  [0.875, 0.63, -4, 1.4],
  [0.715, 0.81, -2, 0.9],
  [0.9, 0.88, 5, 1.2],
];

const DESKTOP = "(min-width: 1024px) and (prefers-reduced-motion: no-preference)";
const MOBILE = "(max-width: 1023px) and (prefers-reduced-motion: no-preference)";
const ANY_MOTION = "(prefers-reduced-motion: no-preference)";

export function Hero() {
  const section = useRef<HTMLElement>(null);
  const intro = useRef<HTMLDivElement>(null);
  const heading = useRef<HTMLDivElement>(null);
  const links = useRef<HTMLCanvasElement>(null);
  // 0 → links hidden, 1 → fully drawn. Driven by the boot sequence and by scroll.
  const linkAlpha = useRef({ boot: 0, scroll: 1 });

  useGSAP(
    () => {
      const root = section.current!;
      const q = gsap.utils.selector(root);
      const mm = gsap.matchMedia();

      /* ---------- Boot sequence (all sizes, motion allowed) ---------- */
      mm.add(ANY_MOTION, () => {
        const boot = gsap.timeline({ defaults: { ease: "expo.out" }, delay: 0.15 });
        boot
          .fromTo(q("[data-eyebrow]"), { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.4 }, 0.05)
          .to(q("[data-eyebrow-text]"), { duration: 1.1, scrambleText: { text: q("[data-eyebrow-text]")[0]?.textContent ?? "", chars: "01<>/_#", speed: 0.6 } }, 0.05)
          .fromTo(q("[data-namebox]"), { clipPath: "inset(-32px 100% 100% -4px)", autoAlpha: 1 }, { clipPath: "inset(-32px -4px -4px -4px)", duration: 0.7, ease: "power3.out" }, 3.1)
          .fromTo(q("[data-namebox-label]"), { autoAlpha: 0, y: 6 }, { autoAlpha: 1, y: 0, duration: 0.4 }, 3.5)
          .to(q("[data-namebox]"), { autoAlpha: 0, duration: 0.6, ease: "power2.in" }, 5.4)
          .fromTo(q("[data-corners]"), { autoAlpha: 0, scale: 1.08 }, { autoAlpha: 1, scale: 1, duration: 0.6 }, 5.5)
          .to(q("[data-role]"), { duration: 1.2, scrambleText: { text: profile.role, chars: "AIML01/<>", speed: 0.5, revealDelay: 0.2 } }, 0.7)
          .fromTo(q("[data-rise]"), { autoAlpha: 0, y: 24 }, { autoAlpha: 1, y: 0, duration: 1, stagger: 0.09 }, 0.95);
      });

      /* ---------- Desktop: frames fly in, tilt with the cursor, then fan and burst into the grid ---------- */
      mm.add(DESKTOP, () => {
        const frames = q("[data-frame]") as HTMLElement[];
        const tilts = q("[data-tilt]") as HTMLElement[];
        const boots = q("[data-frame-boot]") as HTMLElement[];

        const centre = (el: HTMLElement) => {
          let x = 0, y = 0;
          let n: HTMLElement | null = el;
          while (n && n !== root) { x += n.offsetLeft; y += n.offsetTop; n = n.offsetParent as HTMLElement | null; }
          return { x: x + el.offsetWidth / 2, y: y + el.offsetHeight / 2 };
        };
        const scatterX = (i: number) => SCATTER[i][0] * root.clientWidth - centre(frames[i]).x;
        const scatterY = (i: number) => SCATTER[i][1] * root.clientHeight - centre(frames[i]).y;
        const stackX = (i: number) => root.clientWidth / 2 - centre(frames[i]).x + (i - 2.5) * 26;
        const stackY = (i: number) => root.clientHeight * 0.56 - centre(frames[i]).y + Math.abs(i - 2.5) * 10;

        // fly in from depth
        gsap.set(frames, { autoAlpha: 1 });
        gsap.fromTo(
          boots,
          { autoAlpha: 0, scale: 0.35, rotateX: 38, y: 80, filter: "blur(14px)", transformPerspective: 900 },
          {
            autoAlpha: 1, scale: 1, rotateX: 0, y: 0, filter: "blur(0px)", duration: 1.4, stagger: 0.11, ease: "expo.out", delay: 0.55,
            onComplete: () => { gsap.set(boots, { clearProps: "filter" }); },
          }
        );
        gsap.to(linkAlpha.current, { boot: 1, duration: 1.2, delay: 1.6, ease: "power2.out" });

        // cursor parallax with depth
        gsap.set(tilts, { transformPerspective: 900 });
        const movers = tilts.map((t) => ({
          x: gsap.quickTo(t, "x", { duration: 0.9, ease: "power3.out" }),
          y: gsap.quickTo(t, "y", { duration: 0.9, ease: "power3.out" }),
          ry: gsap.quickTo(t, "rotateY", { duration: 0.9, ease: "power3.out" }),
          rx: gsap.quickTo(t, "rotateX", { duration: 0.9, ease: "power3.out" }),
        }));
        let amp = 1;
        const onMove = (e: PointerEvent) => {
          if (e.pointerType !== "mouse") return;
          const r = root.getBoundingClientRect();
          const nx = ((e.clientX - r.left) / r.width) * 2 - 1;
          const ny = ((e.clientY - r.top) / r.height) * 2 - 1;
          movers.forEach((m, i) => {
            const d = SCATTER[i][3] * amp;
            m.x(nx * 18 * d); m.y(ny * 12 * d); m.ry(nx * 12 * amp); m.rx(-ny * 9 * amp);
          });
        };
        root.addEventListener("pointermove", onMove);

        // scroll: scatter → fanned deck → grid
        const tl = gsap.timeline({
          scrollTrigger: {
            trigger: root,
            start: "top top",
            end: "+=210%",
            scrub: 0.9,
            pin: true,
            anticipatePin: 1,
            invalidateOnRefresh: true,
            onUpdate: (self) => {
              linkAlpha.current.scroll = gsap.utils.clamp(0, 1, 1 - self.progress / 0.12);
              amp = gsap.utils.clamp(0.25, 1, 1 - self.progress * 1.2);
            },
          },
        });
        tl.to(q("[data-line]"), { yPercent: -110, duration: 0.3, stagger: 0.05, ease: "power2.in" }, 0)
          .to(intro.current, { autoAlpha: 0, duration: 0.22 }, 0.12)
          .to(q("[data-rise]"), { autoAlpha: 0, y: -30, duration: 0.25, stagger: 0.03, ease: "power1.in" }, 0.02)
          .fromTo(
            frames,
            { x: (i) => scatterX(i), y: (i) => scatterY(i), rotation: (i) => SCATTER[i][2], scale: 0.56 },
            { x: (i) => stackX(i), y: (i) => stackY(i), rotation: (i) => (i - 2.5) * 7, scale: 0.64, duration: 0.32, ease: "power2.inOut", stagger: 0.015 },
            0.06
          )
          .to(frames, { x: 0, y: 0, rotation: 0, scale: 1, duration: 0.42, ease: "power3.inOut", stagger: { each: 0.03, from: "center" } }, 0.44)
          .fromTo(heading.current, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.1 }, 0.5)
          .from(q("[data-heading-word]"), { yPercent: 110, duration: 0.25, stagger: 0.025, ease: "power3.out" }, 0.5)
          .fromTo(q("[data-heading-sub]"), { autoAlpha: 0, y: 14 }, { autoAlpha: 1, y: 0, duration: 0.15 }, 0.66)
          .fromTo(q("[data-frame-footer]"), { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.15, stagger: 0.03 }, 0.78)
          .fromTo(q("[data-frame-sweep]"), { xPercent: -120 }, { xPercent: 120, duration: 0.2, stagger: 0.03, ease: "none" }, 0.8)
          .to({}, { duration: 0.12 });

        return () => root.removeEventListener("pointermove", onMove);
      });

      /* ---------- Phones / tablets: frames swing in as they scroll into view ---------- */
      mm.add(MOBILE, () => {
        (q("[data-frame]") as HTMLElement[]).forEach((el, i) => {
          const side = i % 2 === 0 ? -1 : 1;
          gsap.fromTo(
            el,
            { xPercent: side * 28, yPercent: 18, rotation: side * 9, scale: 0.86, autoAlpha: 0.35 },
            { xPercent: 0, yPercent: 0, rotation: 0, scale: 1, autoAlpha: 1, ease: "power2.out", scrollTrigger: { trigger: el, start: "top 98%", end: "top 62%", scrub: 0.6 } }
          );
        });
      });

      return () => mm.revert();
    },
    { scope: section }
  );

  /* Data links: curves from each floating frame back to the name, with packets travelling along them. */
  useEffect(() => {
    const root = section.current, canvas = links.current;
    if (!root || !canvas) return;
    const mq = window.matchMedia(DESKTOP);
    let raf = 0, visible = true;
    const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; }, { threshold: 0 });
    io.observe(root);

    const draw = (t: number) => {
      raf = requestAnimationFrame(draw);
      const a = linkAlpha.current.boot * linkAlpha.current.scroll;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      const r = root.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      if (canvas.width !== Math.round(r.width * dpr) || canvas.height !== Math.round(r.height * dpr)) {
        canvas.width = Math.round(r.width * dpr); canvas.height = Math.round(r.height * dpr);
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, r.width, r.height);
      if (!mq.matches || !visible || a < 0.01) return;

      const anchorEl = root.querySelector("h1");
      if (!anchorEl) return;
      const ar = anchorEl.getBoundingClientRect();
      const ax = ar.right - r.left + 22, ay = ar.top - r.top + ar.height * 0.2;

      root.querySelectorAll<HTMLElement>("[data-frame-card]").forEach((card, i) => {
        const fr = card.getBoundingClientRect();
        const bx = fr.left - r.left, by = fr.top - r.top + fr.height / 2;
        const c1x = ax + (bx - ax) * 0.5, c1y = ay, c2x = ax + (bx - ax) * 0.5, c2y = by;
        const rgb = FRAMES[i].color;
        const g = ctx.createLinearGradient(ax, ay, bx, by);
        g.addColorStop(0, `rgba(${rgb},0)`);
        g.addColorStop(1, `rgba(${rgb},${0.38 * a})`);
        ctx.strokeStyle = g; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(ax, ay); ctx.bezierCurveTo(c1x, c1y, c2x, c2y, bx, by); ctx.stroke();

        // two packets per link, moving from the frame into the name
        for (let k = 0; k < 2; k++) {
          const p = 1 - (((t / 2200) + i * 0.17 + k * 0.5) % 1);
          const u = 1 - p;
          const x = u * u * u * ax + 3 * u * u * p * c1x + 3 * u * p * p * c2x + p * p * p * bx;
          const y = u * u * u * ay + 3 * u * u * p * c1y + 3 * u * p * p * c2y + p * p * p * by;
          ctx.fillStyle = `rgba(${rgb},${a * (0.25 + 0.75 * p)})`;
          ctx.beginPath(); ctx.arc(x, y, 1.8, 0, 7); ctx.fill();
        }
        ctx.fillStyle = `rgba(${rgb},${0.9 * a})`;
        ctx.beginPath(); ctx.arc(bx, by, 2.4, 0, 7); ctx.fill();
      });
      ctx.fillStyle = `rgba(244,239,227,${0.8 * a})`;
      ctx.beginPath(); ctx.arc(ax, ay, 3, 0, 7); ctx.fill();
    };
    if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) raf = requestAnimationFrame(draw);
    return () => { cancelAnimationFrame(raf); io.disconnect(); };
  }, []);

  const headingWords = "Six capabilities, four shipped systems.".split(" ");

  return (
    <section
      id="top"
      ref={section}
      aria-label="Introduction"
      className="relative isolate overflow-hidden lg:motion-safe:h-[100svh] lg:motion-safe:min-h-[700px]"
      onPointerMove={(e) => {
        const r = e.currentTarget.getBoundingClientRect();
        e.currentTarget.style.setProperty("--mx", `${e.clientX - r.left}px`);
        e.currentTarget.style.setProperty("--my", `${e.clientY - r.top}px`);
      }}
    >
      {/* atmosphere: fine grid, cursor light, one scan line on load */}
      <div className="grid-texture pointer-events-none absolute inset-0 -z-10" aria-hidden />
      <div
        className="pointer-events-none absolute inset-0 -z-10 opacity-70"
        style={{ background: "radial-gradient(600px circle at var(--mx, 70%) var(--my, 30%), rgb(233 196 106 / 0.07), transparent 60%)" }}
        aria-hidden
      />
      <div className="pointer-events-none absolute -top-40 right-[-10%] -z-10 h-[520px] w-[720px] rounded-full bg-signal/10 blur-[120px]" aria-hidden />
      <canvas ref={links} className="pointer-events-none absolute inset-0 z-[1] hidden size-full lg:block" aria-hidden />

      {/* intro */}
      <div
        ref={intro}
        className="relative z-10 mx-auto flex max-w-[1400px] px-4 pb-14 pt-28 sm:px-6 lg:px-10 lg:motion-safe:pointer-events-none lg:motion-safe:absolute lg:motion-safe:inset-0 lg:motion-safe:items-center lg:motion-safe:pb-0 lg:motion-safe:pt-14"
      >
        <div className="pointer-events-auto flex w-full flex-col gap-8 lg:max-w-[56%]">
          <p data-eyebrow className="eyebrow flex items-center gap-2.5">
            <span className="size-1.5 rounded-full bg-ok animate-[pulse-dot_2.4s_ease-in-out_infinite]" aria-hidden />
            <span data-eyebrow-text>{profile.location} · B.Tech AI &amp; ML, VIT-AP</span>
          </p>
          <div className="flex flex-col gap-5">
            <DiffusionName
              extras={
                <>
                  {/* detection box that lands on the name once it has been generated */}
                  <div data-namebox className="pointer-events-none invisible absolute -inset-x-2 -inset-y-3 sm:-inset-x-4 border-[1.5px] border-signal" aria-hidden>
                    <span data-namebox-label className="absolute -right-[1.5px] bottom-full whitespace-nowrap bg-signal px-2 py-1 font-mono text-[11px] font-semibold leading-none text-on-signal">
                      person 0.99 · #01 · tracking
                    </span>
                  </div>
                  <div data-corners className="pointer-events-none invisible absolute -inset-x-2 -inset-y-3 sm:-inset-x-4" aria-hidden>
                    {["left-0 top-0 border-l border-t", "right-0 top-0 border-r border-t", "left-0 bottom-0 border-l border-b", "right-0 bottom-0 border-r border-b"].map((c) => (
                      <span key={c} className={`absolute size-4 border-signal/70 ${c}`} />
                    ))}
                  </div>
                </>
              }
            >
              <h1
                data-detect-label="person 0.99 · #01"
                data-boot-hide
                className="boot-hide display text-[clamp(3rem,7.6vw,8.25rem)] font-bold uppercase transition-opacity duration-500 [font-stretch:125%]"
              >
                <span className="block overflow-hidden pb-[0.04em]"><span data-line className="block">Mehul</span></span>
                <span className="block overflow-hidden pb-[0.04em]"><span data-line className="block">Dadhich</span></span>
              </h1>
            </DiffusionName>
            <p data-role className="font-mono text-[clamp(0.85rem,1.2vw,1rem)] uppercase tracking-[0.32em] text-signal">
              {profile.role}
            </p>
          </div>
          <p data-rise className="max-w-[54ch] text-[clamp(1.05rem,1.35vw,1.25rem)] leading-relaxed text-soft">
            {profile.statement}
          </p>
          <div data-rise className="flex flex-wrap items-center gap-3">
            <Magnetic>
              <a
                href="#featured"
                onClick={(e) => { e.preventDefault(); scrollToId("featured"); }}
                className="group flex items-center gap-2 rounded-full bg-fg px-5 py-3 text-sm font-medium text-ink"
              >
                See the systems
                <ArrowDown className="size-4 transition-transform group-hover:translate-y-0.5" aria-hidden />
              </a>
            </Magnetic>
            <Magnetic>
              <a
                href={profile.resume}
                download
                className="flex items-center gap-2 rounded-full border border-line-strong px-5 py-3 text-sm text-fg transition-colors hover:border-fg/50"
              >
                <Download className="size-4" aria-hidden />
                Download resume
              </a>
            </Magnetic>
          </div>
          <div data-rise>
            <SignalPath className="mt-4 max-w-[620px]" />
          </div>
        </div>
      </div>

      {/* motion frames → capability matrix */}
      <div className="relative z-[2] mx-auto flex max-w-[1400px] flex-col gap-8 px-4 pb-20 sm:px-6 lg:px-10 lg:motion-safe:pointer-events-none lg:motion-safe:absolute lg:motion-safe:inset-0 lg:motion-safe:items-center lg:motion-safe:justify-center lg:motion-safe:gap-7 lg:motion-safe:pb-0 lg:motion-safe:pt-16">
        <div ref={heading} className="flex flex-col gap-3 lg:motion-safe:items-center lg:motion-safe:text-center lg:motion-safe:opacity-0">
          <p className="eyebrow"><span className="text-signal">01</span> · What I build</p>
          <h2 className="display text-[clamp(1.9rem,3.6vw,3.25rem)] font-semibold">
            {headingWords.map((w, i) => (
              <span key={i} className="-mb-[0.18em] inline-block overflow-hidden pb-[0.18em] align-bottom">
                <span data-heading-word className="inline-block">{w}</span>
                {i < headingWords.length - 1 ? " " : null}
              </span>
            ))}
          </h2>
          <p data-heading-sub className="max-w-[56ch] text-soft">Every frame maps to work you can inspect below.</p>
        </div>

        <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:motion-reduce:grid-cols-3 lg:motion-safe:grid-cols-[repeat(3,var(--cw))] lg:motion-safe:[--cw:min(330px,27vw,calc((100svh-310px)/2*1.45))]">
          {FRAMES.map((f, i) => (
            <li key={f.label} data-frame className="will-change-transform lg:motion-safe:pointer-events-auto lg:motion-safe:opacity-0">
              <div data-frame-boot className="h-full">
                <div data-tilt className="h-full [transform-style:preserve-3d]">
                  <div
                    className="glow-border h-full rounded-xl"
                    style={{ animation: `float-${f.float} ${7 + (i % 3)}s ease-in-out ${i * -1.3}s infinite` }}
                  >
                    <article
                      data-frame-card
                      className="relative flex h-full flex-col overflow-hidden rounded-xl border border-line bg-panel/90 shadow-[0_30px_60px_-30px_rgb(0_0_0/0.75)] backdrop-blur-sm"
                    >
                      <span
                        data-frame-sweep
                        className="pointer-events-none absolute inset-y-0 left-0 z-10 hidden w-1/2 bg-gradient-to-r from-transparent via-signal/[0.10] to-transparent lg:block lg:motion-reduce:hidden"
                        aria-hidden
                      />
                      <header className="flex min-w-0 items-center justify-between gap-3 px-3 py-2">
                        <h3 className="flex shrink-0 items-center gap-2 whitespace-nowrap text-[13px] font-medium text-fg">
                          <span className="size-1.5 rounded-full" style={{ background: `rgb(${f.color})` }} aria-hidden />
                          {f.label}
                        </h3>
                        <span className="min-w-0 truncate font-mono text-[10px] text-dim">{f.tech}</span>
                      </header>
                      <div className="screen relative aspect-[16/10] border-y border-line">
                        <div className="absolute inset-0">
                          <f.Visual />
                        </div>
                      </div>
                      <footer data-frame-footer className="flex items-center gap-2 px-3 py-2 font-mono text-[10.5px] lg:motion-safe:opacity-0">
                        <span className="text-dim">used in</span>
                        <span className="truncate text-soft">{f.usedIn}</span>
                      </footer>
                    </article>
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
