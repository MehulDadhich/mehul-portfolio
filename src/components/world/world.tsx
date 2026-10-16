"use client";

import { useEffect, useRef, useState, type MouseEvent } from "react";
import { certifications, experience, gmailCompose, journey, profile, projects, roadguardMetrics, skillGroups } from "@/lib/content";
import { openProject, Projects } from "@/components/projects/projects";
import { openAssistant } from "@/components/assistant/assistant";
import { openSkills } from "@/components/sections/skills-sheet";
import { Experience } from "@/components/sections/experience";
import { Skills } from "@/components/sections/skills";
import { Journey } from "@/components/sections/journey";
import { Contact } from "@/components/sections/contact";
import { CERTS_AT, SHOT_VH, STATIONS, scrollAt } from "./world-stations";

/** The network's four layers, each a run of skill areas (ids from content.ts). */
const LAYERS = [["cv", "vlm", "video", "voice"], ["agents", "rag", "llm"], ["eval", "inference", "ml"], ["backend", "lang", "tools"]];

/** The content the 3D world draws, shaped from content.ts (the single source of truth). */
function worldData() {
  const firstSentence = (s: string) => (s.match(/^.*?[.!?](\s|$)/)?.[0] ?? s).trim();
  return {
    PROJ: projects.map((p) => ({
      id: p.id,
      t: p.title,
      k: p.kicker,
      lead: firstSentence(p.solution),
      st: p.architecture.map((a) => a.label),
      hi: p.highlights[0],
      g: p.github,
      n: p.linkNote,
    })),
    MET: roadguardMetrics.map((m) => [m.value, m.label, m.note]),
    EXP: { ...experience, work: experience.work.map((w) => [w.verb, w.body]) },
    GROUPS: Object.fromEntries(
      skillGroups.map((g) => [g.id, [g.label, g.skills.filter((s) => s.used.length).map((s) => [s.name, s.used])]])
    ),
    LAYERS,
    JOURNEY: journey.map((j) => [j.phase, j.when ?? "", j.title, j.points ? j.points.join(" · ") : j.body]),
    PROFILE: { name: profile.name, role: profile.role, loc: profile.location, email: profile.email, phone: profile.phone, gh: profile.github, li: profile.linkedin, resume: profile.resume, summary: profile.summary, statement: profile.statement, gmail: gmailCompose() },
    CERTS: certifications.map((c) => ({ short: c.short, issuer: c.issuer, year: c.year })),
  };
}

const hasWebGL = () => {
  try {
    const c = document.createElement("canvas");
    return !!(c.getContext("webgl2") || c.getContext("webgl"));
  } catch {
    return false;
  }
};

/** Where an anchor sits inside the shot, so the nav and Arc land on the right station. */
const anchorTop = (scroll: number) => `calc(${scroll.toFixed(4)} * (${SHOT_VH}svh - 100svh) + 64px)`;

/**
 * Direction A, "one continuous shot": everything after the RoadGuard chapter is one 3D world and one camera
 * flight driven by scroll, with captions at the edges. Without WebGL the regular sections render instead.
 */
export function World() {
  const shot = useRef<HTMLElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const capL = useRef<HTMLDivElement>(null);
  const capR = useRef<HTMLDivElement>(null);
  const [gl, setGl] = useState<boolean | null>(null);

  useEffect(() => {
    const id = requestAnimationFrame(() => setGl(hasWebGL()));
    return () => cancelAnimationFrame(id);
  }, []);

  useEffect(() => {
    if (!gl) return;
    let dispose: (() => void) | null = null;
    let cancelled = false;
    (async () => {
      const { mountWorld } = await import("./world-engine");
      await document.fonts?.ready;
      if (cancelled) return;
      const body = getComputedStyle(document.body);
      const fonts = {
        mono: body.getPropertyValue("--font-jetbrains").trim() || "monospace",
        serif: body.getPropertyValue("--font-newsreader").trim() || "serif",
      };
      dispose = mountWorld(
        { shot: shot.current!, stage: stage.current!, canvas: canvas.current!, capL: capL.current!, capR: capR.current! },
        worldData(),
        fonts
      );
      if (!dispose) setGl(false);
    })();
    return () => { cancelled = true; dispose?.(); };
  }, [gl]);

  // buttons inside the captions are plain HTML written by the engine; their clicks are handled here
  const onClick = (e: MouseEvent) => {
    const t = e.target as HTMLElement;
    const open = t.closest<HTMLElement>("[data-open]");
    if (open) { openProject(open.dataset.open!); return; }
    if (t.closest("[data-skills]")) { openSkills(); return; }
    if (t.closest("[data-arc]")) { openAssistant(); return; }
    const cp = t.closest<HTMLElement>("[data-copy]");
    if (cp) {
      navigator.clipboard?.writeText(cp.dataset.copy!).then(() => {
        cp.dataset.done = "1";
        setTimeout(() => delete cp.dataset.done, 1600);
      }).catch(() => {});
    }
  };

  if (gl === false) {
    return (
      <>
        <Projects />
        <Experience />
        <Skills />
        <Journey />
        <Contact />
      </>
    );
  }

  return (
    <section ref={shot} className="world relative" style={{ height: `${SHOT_VH}svh` }} aria-label="Work, experience, skills, journey and contact, as one continuous 3D shot">
      {/* anchors for the nav and Arc, each at the scroll position where its station begins */}
      {STATIONS.filter((s) => s.id).map((s) => (
        <div key={s.id} id={s.id!} className="pointer-events-none absolute inset-x-0 h-px" style={{ top: anchorTop(scrollAt(s.at)) }}>
          <h2 className="sr-only">{s.name}</h2>
        </div>
      ))}
      <div id="achievements" className="pointer-events-none absolute inset-x-0 h-px" style={{ top: anchorTop(scrollAt(CERTS_AT)) }}>
        <h2 className="sr-only">Certifications</h2>
      </div>

      <div ref={stage} className="world-stage" onClick={onClick}>
        <canvas ref={canvas} aria-hidden />
        <div ref={capL} className="cap cap-l" aria-live="polite" />
        <div ref={capR} className="cap cap-r" />
        {/* the camera's detection box closing on the visitor, when it locks on at the end */}
        <div className="lockon" aria-hidden>
          <i /><i /><i /><i />
          <span>visitor · 0.99 · let&rsquo;s talk</span>
        </div>
        {/* shown only while the flight is in Skills (see .world-stage[data-station]) */}
        <button type="button" className="skills-cta" data-skills>
          See all skills <span aria-hidden>→</span>
        </button>
      </div>
    </section>
  );
}
