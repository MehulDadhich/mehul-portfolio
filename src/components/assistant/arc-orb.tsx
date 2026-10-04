"use client";

import { useEffect, useRef } from "react";

export type OrbState = "idle" | "listening" | "thinking";

type P = { a: number; r: number; size: number; phase: number; lav: boolean };

function rgba(hex: string, alpha: number) {
  const h = hex.replace("#", "");
  const n = parseInt(h.length === 3 ? h.split("").map((c) => c + c).join("") : h, 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${alpha})`;
}

/**
 * Arc's face: a ring of particles that leaves a gap, like an arc. It drifts at rest,
 * ripples on every keystroke (`pulse` changes) and spins up while Arc is thinking.
 */
export function ArcOrb({ size = 120, state = "idle", pulse = 0, className }: { size?: number; state?: OrbState; pulse?: number; className?: string }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const live = useRef({ state, energy: 0, spin: 0, pulse });

  useEffect(() => {
    live.current.state = state;
  }, [state]);
  useEffect(() => {
    if (pulse !== live.current.pulse) live.current.energy = Math.min(1.4, live.current.energy + 0.55);
    live.current.pulse = pulse;
  }, [pulse]);

  useEffect(() => {
    const el = canvas.current;
    if (!el) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    el.width = size * dpr;
    el.height = size * dpr;
    const ctx = el.getContext("2d")!;
    const cs = getComputedStyle(el);
    const gold = cs.getPropertyValue("--signal").trim() || "#e9c46a";
    const lav = cs.getPropertyValue("--reason").trim() || "#c9b8ff";

    const n = Math.round(size * 1.2);
    const parts: P[] = Array.from({ length: n }, (_, i) => {
      // 300° of arc, leaving a 60° gap
      const a = (i / n) * Math.PI * (5 / 3) + Math.PI * 0.6;
      return { a, r: 0.36 + (Math.random() - 0.5) * 0.06, size: 0.6 + Math.random() * 1.3, phase: Math.random() * Math.PI * 2, lav: Math.random() < 0.28 };
    });

    let raf = 0;
    const draw = (t: number) => {
      const L = live.current;
      const target = L.state === "thinking" ? 0.055 : L.state === "listening" ? 0.012 : 0.004;
      L.spin += target;
      L.energy *= 0.94;
      const amp = (L.state === "thinking" ? 0.06 : 0.018) + L.energy * 0.05;
      const c = size / 2;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, size, size);

      // soft core glow
      const g = ctx.createRadialGradient(c, c, 0, c, c, size * 0.42);
      g.addColorStop(0, rgba(gold, L.state === "thinking" ? 0.3 : 0.16));
      g.addColorStop(1, rgba(gold, 0));
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, size, size);

      for (const p of parts) {
        const wob = Math.sin(t / 420 + p.phase) * amp + Math.sin(t / 170 + p.phase * 3) * amp * 0.35;
        const a = p.a + L.spin;
        const rr = (p.r + wob) * size;
        const x = c + Math.cos(a) * rr;
        const y = c + Math.sin(a) * rr;
        ctx.globalAlpha = 0.45 + 0.55 * (0.5 + 0.5 * Math.sin(t / 300 + p.phase));
        ctx.fillStyle = p.lav ? lav : gold;
        ctx.beginPath();
        ctx.arc(x, y, p.size * (size / 120), 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      if (!reduce) raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [size]);

  return <canvas ref={canvas} aria-hidden className={className} style={{ width: size, height: size }} />;
}
