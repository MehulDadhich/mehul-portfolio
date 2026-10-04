"use client";

import { useEffect, useRef, type ReactNode } from "react";

const STEPS = 50;
const DURATION = 2600;
const PAD = { top: 90, right: 260, bottom: 110, left: 40 };

type Particle = { tx: number; ty: number; sx: number; sy: number; nx: number; ny: number; ph: number; x: number; y: number; vx: number; vy: number };

function readVar(el: Element, name: string) {
  return getComputedStyle(el).getPropertyValue(name).trim();
}

/**
 * The hero name, "generated" in front of the visitor: particles start as pure noise and are
 * denoised over 50 sampler steps into the letters, then hand over to the real (crisp, selectable)
 * text. Hovering the name with a mouse brings the particles back and lets the cursor push them.
 */
export function DiffusionName({ children, extras }: { children: ReactNode; extras?: ReactNode }) {
  const wrap = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const hudStep = useRef<HTMLSpanElement>(null);
  const hudSigma = useRef<HTMLSpanElement>(null);
  const hud = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    const root = wrap.current, cv = canvas.current;
    if (!root || !cv) return;
    const h1 = root.querySelector("h1") as HTMLElement | null;
    if (!h1) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      h1.style.visibility = "visible";
      if (hud.current) hud.current.style.display = "none";
      return;
    }

    let parts: Particle[] = [];
    let raf = 0;
    let start = 0;
    let mode: "denoise" | "idle" | "hover" = "denoise";
    const mouse = { x: -9999, y: -9999 };
    let colors = { noise: "#4c8dff", signal: "#0a6cff", fg: "#0e1726" };

    const sample = () => {
      const r = root.getBoundingClientRect();
      const w = r.width + PAD.left + PAD.right;
      const h = r.height + PAD.top + PAD.bottom;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      cv.style.left = `${-PAD.left}px`;
      cv.style.top = `${-PAD.top}px`;
      cv.style.width = `${w}px`;
      cv.style.height = `${h}px`;
      cv.width = Math.round(w * dpr);
      cv.height = Math.round(h * dpr);

      const off = document.createElement("canvas");
      off.width = Math.round(w);
      off.height = Math.round(h);
      const o = off.getContext("2d")!;
      const cs = getComputedStyle(h1);
      o.fillStyle = "#000";
      o.font = `${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
      const oo = o as CanvasRenderingContext2D & { fontStretch?: string; letterSpacing?: string };
      if ("fontStretch" in oo) oo.fontStretch = "expanded";
      if ("letterSpacing" in oo) oo.letterSpacing = cs.letterSpacing === "normal" ? "0px" : cs.letterSpacing;
      o.textBaseline = "alphabetic";
      h1.querySelectorAll<HTMLElement>("[data-line]").forEach((line) => {
        const lr = line.getBoundingClientRect();
        const text = (line.textContent || "").toUpperCase();
        const m = o.measureText(text);
        const fa = m.fontBoundingBoxAscent ?? m.actualBoundingBoxAscent;
        const fd = m.fontBoundingBoxDescent ?? m.actualBoundingBoxDescent;
        const baseline = lr.top - r.top + PAD.top + (lr.height - (fa + fd)) / 2 + fa;
        o.fillText(text, lr.left - r.left + PAD.left, baseline);
      });
      const data = o.getImageData(0, 0, off.width, off.height).data;
      const step = Math.max(3, Math.round(parseFloat(cs.fontSize) / 30));
      parts = [];
      for (let y = 0; y < off.height; y += step) {
        for (let x = 0; x < off.width; x += step) {
          if (data[(y * off.width + x) * 4 + 3] > 140) {
            const sx = Math.random() * w, sy = Math.random() * h;
            parts.push({ tx: x, ty: y, sx, sy, nx: Math.random() * 2 - 1, ny: Math.random() * 2 - 1, ph: Math.random() * 6.28, x: sx, y: sy, vx: 0, vy: 0 });
          }
        }
      }
      colors = {
        noise: readVar(root, "--model") || colors.noise,
        signal: readVar(root, "--signal") || colors.signal,
        fg: readVar(root, "--fg") || colors.fg,
      };
      return { w, h, dpr, size: Math.max(1.6, step * 0.62) };
    };

    let dims = sample();

    const show = (canvasOn: boolean) => {
      cv.style.opacity = canvasOn ? "1" : "0";
      h1.style.opacity = canvasOn ? "0" : "1";
    };

    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      const ctx = cv.getContext("2d")!;
      const { w, h, dpr, size } = dims;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);

      if (mode === "denoise") {
        if (!start) start = now;
        const p = Math.min(1, (now - start) / DURATION);
        const e = 1 - Math.pow(1 - p, 3);
        const sigma = 1 - e;
        if (hudStep.current) hudStep.current.textContent = String(Math.round(e * STEPS)).padStart(2, "0");
        if (hudSigma.current) hudSigma.current.textContent = sigma.toFixed(2);
        for (const q of parts) {
          q.x = q.sx + (q.tx - q.sx) * e + q.nx * sigma * 26 + Math.sin(now / 520 + q.ph) * sigma * 8;
          q.y = q.sy + (q.ty - q.sy) * e + q.ny * sigma * 26 + Math.cos(now / 610 + q.ph) * sigma * 8;
          ctx.globalAlpha = 0.35 + 0.65 * e;
          ctx.fillStyle = sigma > 0.55 ? colors.noise : sigma > 0.12 ? colors.signal : colors.fg;
          ctx.fillRect(q.x, q.y, size, size);
        }
        ctx.globalAlpha = 1;
        if (p >= 1) {
          mode = "idle";
          parts.forEach((q) => { q.x = q.tx; q.y = q.ty; q.vx = 0; q.vy = 0; });
          root.dataset.generated = "true";
          setTimeout(() => { if (hud.current) hud.current.style.opacity = "0"; }, 1400);
          setTimeout(() => { if (mode === "idle") { show(false); } }, 250);
          setTimeout(() => { if (mode === "idle") { cancelAnimationFrame(raf); raf = 0; } }, 900);
        }
        return;
      }

      // hover / idle: particles spring to their targets and flee the cursor
      ctx.fillStyle = colors.fg;
      for (const q of parts) {
        const dx = q.x - mouse.x, dy = q.y - mouse.y;
        const d2 = dx * dx + dy * dy;
        if (mode === "hover" && d2 < 90 * 90) {
          const d = Math.sqrt(d2) || 1, f = (90 - d) / 90;
          q.vx += (dx / d) * f * 2.6;
          q.vy += (dy / d) * f * 2.6;
        }
        q.vx = (q.vx + (q.tx - q.x) * 0.06) * 0.82;
        q.vy = (q.vy + (q.ty - q.y) * 0.06) * 0.82;
        q.x += q.vx;
        q.y += q.vy;
        const off = Math.min(1, Math.hypot(q.x - q.tx, q.y - q.ty) / 40);
        ctx.fillStyle = off > 0.15 ? colors.signal : colors.fg;
        ctx.fillRect(q.x, q.y, size, size);
      }
    };

    // start once fonts are ready so the letter shapes are right
    let cancelled = false;
    (document.fonts?.ready ?? Promise.resolve()).then(() => {
      if (cancelled) return;
      dims = sample();
      h1.style.visibility = "visible";
      show(true);
      raf = requestAnimationFrame(frame);
    });

    const fine = window.matchMedia("(pointer: fine)").matches;
    const onEnter = () => {
      if (!fine || mode === "denoise") return;
      mode = "hover";
      show(true);
      if (!raf) raf = requestAnimationFrame(frame);
    };
    const onMove = (e: PointerEvent) => {
      const r = cv.getBoundingClientRect();
      mouse.x = e.clientX - r.left;
      mouse.y = e.clientY - r.top;
    };
    const onLeave = () => {
      if (mode !== "hover") return;
      mode = "idle";
      mouse.x = mouse.y = -9999;
      setTimeout(() => { if (mode === "idle") show(false); }, 450);
      setTimeout(() => { if (mode === "idle") { cancelAnimationFrame(raf); raf = 0; } }, 1100);
    };
    root.addEventListener("pointerenter", onEnter);
    root.addEventListener("pointermove", onMove);
    root.addEventListener("pointerleave", onLeave);

    let resizeTimer: ReturnType<typeof setTimeout>;
    const onResize = () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => { if (mode !== "denoise") dims = sample(); }, 200);
    };
    window.addEventListener("resize", onResize);

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      root.removeEventListener("pointerenter", onEnter);
      root.removeEventListener("pointermove", onMove);
      root.removeEventListener("pointerleave", onLeave);
      window.removeEventListener("resize", onResize);
    };
  }, []);

  return (
    <div ref={wrap} className="relative w-fit">
      <p ref={hud} className="absolute bottom-full left-0 mb-3 whitespace-nowrap font-mono text-[11px] text-dim transition-opacity duration-700" aria-hidden>
        DDIM sampler · step <span ref={hudStep} className="text-signal">00</span>/{STEPS} · σ <span ref={hudSigma} className="text-signal">1.00</span>
      </p>
      {children}
      {extras}
      <canvas
        ref={canvas}
        aria-hidden
        className="pointer-events-none absolute opacity-0 transition-opacity duration-500"
      />
    </div>
  );
}
