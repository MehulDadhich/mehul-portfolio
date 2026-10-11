"use client";

import { useEffect, useRef } from "react";

export type OrbState = "idle" | "listening" | "thinking";

const TAU = Math.PI * 2;
// how fast each state turns the galaxy, relative to idle
const SPEED = { idle: 1, listening: 1.8, thinking: 4.2 };
const TILT = -0.4; // the galaxy's disc leans to the left
const FLATTEN = 0.5; // and is seen at an angle

type Palette = { signal: string; model: string; reason: string };
type Star = { arm: number; d: number; jitter: number; size: number };

function rgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  const n = parseInt(h.length === 3 ? h.split("").map((c) => c + c).join("") : h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function rgba(hex: string, alpha: number) {
  const [r, g, b] = rgb(hex);
  return `rgba(${r},${g},${b},${Math.max(0, Math.min(1, alpha))})`;
}

/** A colour along the site's signature gradient: 0 gold → 0.5 pale gold → 1 lavender. */
function along(p: Palette, at: number, alpha: number) {
  const stops = [p.signal, p.model, p.reason];
  const x = Math.max(0, Math.min(1, at)) * 2;
  const i = Math.min(1, Math.floor(x));
  const k = x - i;
  const a = rgb(stops[i]), b = rgb(stops[i + 1]);
  const mix = (j: number) => Math.round(a[j] + (b[j] - a[j]) * k);
  return `rgba(${mix(0)},${mix(1)},${mix(2)},${Math.max(0, Math.min(1, alpha))})`;
}

/**
 * Arc's emblem: a spiral galaxy. Two arms of stars turn round a bright core, gold at the heart and lavender at the
 * edges, the inner stars faster than the outer ones.
 * Each keystroke (`pulse` changes) sends a ripple out from the core and briefly brightens it; while Arc is thinking
 * the galaxy spins about four times faster and the core beats quickly. Speed changes are eased, never abrupt.
 */
export function ArcOrb({ size = 120, state = "idle", pulse = 0, className }: { size?: number; state?: OrbState; pulse?: number; className?: string }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const live = useRef({ state, pulse, energy: 0, speed: 1, waves: [] as number[] });

  useEffect(() => {
    live.current.state = state;
  }, [state]);
  useEffect(() => {
    const L = live.current;
    if (pulse !== L.pulse) {
      L.energy = Math.min(1.5, L.energy + 0.45);
      if (L.waves.length < 4) L.waves.push(0);
    }
    L.pulse = pulse;
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
    const p: Palette = {
      signal: cs.getPropertyValue("--signal").trim() || "#e9c46a",
      model: cs.getPropertyValue("--model").trim() || "#f1d692",
      reason: cs.getPropertyValue("--reason").trim() || "#c9b8ff",
    };

    const s = size;
    const c = s / 2;
    const small = s < 60; // the launcher and the chat header: fewer, bigger, brighter stars
    const stars: Star[] = Array.from({ length: small ? 70 : 320 }, (_, i) => ({
      arm: i % 2,
      d: Math.pow(Math.random(), 0.7), // 0 at the core … 1 at the rim, denser towards the core
      jitter: (Math.random() - 0.5) * 0.5,
      size: Math.random(),
    }));
    const cosT = Math.cos(TILT), sinT = Math.sin(TILT);

    let last = performance.now();
    let clock = Math.random() * 20;
    let raf = 0;

    const draw = (t: number) => {
      const dt = Math.min(0.05, Math.max(0, (t - last) / 1000));
      last = t;
      const L = live.current;
      const thinking = L.state === "thinking";
      L.speed += (SPEED[L.state] - L.speed) * Math.min(1, dt * 3);
      L.energy *= Math.pow(0.15, dt);
      clock += dt * L.speed;

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, s, s);

      // soft glow behind the galaxy
      const glow = ctx.createRadialGradient(c, c, 0, c, c, s * 0.5);
      glow.addColorStop(0, rgba(p.signal, (0.2 + (thinking ? 0.1 : 0) + L.energy * 0.1) * (small ? 1.2 : 0.8)));
      glow.addColorStop(0.5, rgba(p.reason, (0.07 + (thinking ? 0.05 : 0)) * 0.8));
      glow.addColorStop(1, rgba(p.reason, 0));
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, s, s);

      // the stars: two spiral arms, inner stars turning faster than outer ones
      const R = s * (small ? 0.47 : 0.42) * (1 + L.energy * 0.05);
      const dot = Math.max(small ? 0.55 : 0.4, s * 0.004);
      for (const st of stars) {
        const ang = st.arm * Math.PI + st.d * 3.4 + st.jitter + clock * 0.6 * (1.3 - st.d);
        const x = Math.cos(ang) * st.d * R;
        const y = Math.sin(ang) * st.d * R * FLATTEN;
        ctx.beginPath();
        ctx.arc(c + x * cosT - y * sinT, c + x * sinT + y * cosT, dot + s * st.size * (small ? 0.022 : 0.01), 0, TAU);
        ctx.fillStyle = along(p, st.d, (small ? 0.55 : 0.35) + (1 - st.d) * 0.6 + 0.2 * Math.sin(t / 300 + st.size * 9));
        ctx.fill();
      }

      // the core: white-hot, beating slowly at rest and quickly while thinking
      const beat = 0.5 + 0.5 * Math.sin(t / (thinking ? 140 : 850));
      const rc = s * (0.07 + beat * 0.02 + L.energy * 0.03) * (small ? 1.7 : 1) * 2.4;
      const core = ctx.createRadialGradient(c, c, 0, c, c, rc);
      core.addColorStop(0, "rgba(255,255,255,1)");
      core.addColorStop(0.22, "rgba(255,255,255,0.9)");
      core.addColorStop(0.42, rgba(p.model, 0.85));
      core.addColorStop(0.72, rgba(p.signal, 0.18));
      core.addColorStop(1, rgba(p.signal, 0));
      ctx.fillStyle = core;
      ctx.beginPath();
      ctx.arc(c, c, rc, 0, TAU);
      ctx.fill();

      // ripples from keystrokes, in the same tilt as the galaxy's disc
      L.waves = L.waves.map((w) => w + dt * 1.3).filter((w) => w < 1);
      for (const w of L.waves) {
        const r = s * (0.12 + w * 0.34);
        ctx.beginPath();
        ctx.ellipse(c, c, r, r * FLATTEN, TILT, 0, TAU);
        ctx.strokeStyle = along(p, w, (1 - w) * 0.7);
        ctx.lineWidth = Math.max(small ? 1.1 : 0.6, s * 0.012);
        ctx.stroke();
      }

      if (!reduce) raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [size]);

  return <canvas ref={canvas} aria-hidden className={className} style={{ width: size, height: size }} />;
}
