"use client";

import { useEffect, useRef } from "react";
import { fitCanvas, useInViewLoop } from "@/hooks/use-in-view-loop";

const C = {
  bg: "#080b0f", road: "#11171d", lane: "#2a343e", car: "#3a4856", carHi: "#4d5f70",
  signal: "#e9c46a", model: "#f1d692", reason: "#c9b8ff", alert: "#ff6b5e", ok: "#8fd19e",
  fg: "#f4efe3", soft: "#aaa496", dim: "#6f6a59",
};
let MONO = "ui-monospace, monospace";
const LOOP = 9000;
const IMPACT = 5200;

function label(ctx: CanvasRenderingContext2D, x: number, y: number, text: string, color: string) {
  ctx.font = `600 10px ${MONO}`;
  const w = ctx.measureText(text).width + 8;
  ctx.fillStyle = color;
  ctx.fillRect(x, y - 14, w, 14);
  ctx.fillStyle = "#05080b";
  ctx.fillText(text, x + 4, y - 4);
}

type Car = { id: number; cls: string; conf: number; x: number; y: number; w: number; h: number; trail: [number, number][] };

/**
 * Illustrative simulation of the RoadGuard pipeline. Overlays build up with each stage:
 * raw frames → detections → tracks → LSTM score → VLM verdict → alert.
 */
export function PipelineScene({ stage }: { stage: number }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const stageRef = useRef(stage);
  useEffect(() => {
    stageRef.current = stage;
  }, [stage]);

  const wrap = useInViewLoop<HTMLDivElement>((now) => {
    const el = canvas.current;
    if (!el) return;
    const { ctx, w, h } = fitCanvas(el);
    if (MONO.startsWith("ui-")) {
      // next/font renames the family, so read the real name from its CSS variable.
      const fam = getComputedStyle(document.documentElement).getPropertyValue("--font-geist-mono").trim();
      if (fam) MONO = `${fam}, ui-monospace, monospace`;
    }
    const s = stageRef.current;
    const t = now % LOOP;
    const hit = t >= IMPACT;

    // scene
    ctx.fillStyle = C.bg; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = C.road; ctx.fillRect(0, h * 0.42, w, h * 0.46);
    ctx.strokeStyle = C.lane; ctx.lineWidth = 2; ctx.setLineDash([18, 16]);
    ctx.beginPath(); ctx.moveTo(0, h * 0.65); ctx.lineTo(w, h * 0.65); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = "#0d1217";
    for (let i = 0; i < 7; i++) ctx.fillRect(i * w * 0.16 + 10, h * 0.16, w * 0.09, h * 0.22);

    // vehicles: #14 heads right and brakes late, #31 changes lane into it
    const cw = w * 0.13, ch = h * 0.11;
    const p = Math.min(t, IMPACT) / IMPACT;
    const aX = -cw + p * (w * 0.5 + cw);
    const bX = w * 0.85 - p * w * 0.2;
    const bY = h * 0.69 - Math.max(0, p - 0.55) / 0.45 * h * 0.17;
    const passX = ((t / LOOP) * (w + cw * 2) * 1.6) % (w + cw * 2) - cw;
    const cars: Car[] = [
      { id: 14, cls: "car", conf: 0.91, x: aX, y: h * 0.5, w: cw, h: ch, trail: [] },
      { id: 31, cls: "truck", conf: 0.88, x: bX, y: bY, w: cw * 1.25, h: ch * 1.1, trail: [] },
      { id: 22, cls: "car", conf: 0.86, x: w - passX, y: h * 0.74, w: cw * 0.9, h: ch * 0.9, trail: [] },
    ];
    for (let k = 1; k <= 8; k++) {
      const pk = Math.max(0, Math.min(t - k * 220, IMPACT)) / IMPACT;
      cars[0].trail.push([-cw + pk * (w * 0.5 + cw) + cw / 2, h * 0.5 + ch / 2]);
      cars[1].trail.push([w * 0.85 - pk * w * 0.2 + cw * 0.62, h * 0.69 - Math.max(0, pk - 0.55) / 0.45 * h * 0.17 + ch * 0.55]);
    }
    cars.forEach((c, i) => {
      ctx.save();
      if (hit && i < 2) { ctx.translate(c.x + c.w / 2, c.y + c.h / 2); ctx.rotate(i === 0 ? 0.06 : -0.09); ctx.translate(-(c.x + c.w / 2), -(c.y + c.h / 2)); }
      ctx.fillStyle = C.car; ctx.fillRect(c.x, c.y, c.w, c.h);
      ctx.fillStyle = C.carHi; ctx.fillRect(c.x + c.w * 0.25, c.y + c.h * 0.18, c.w * 0.45, c.h * 0.64);
      ctx.restore();
    });

    // stage 2+: tracks
    if (s >= 2) {
      cars.slice(0, 2).forEach((c, i) => {
        ctx.fillStyle = i === 0 ? C.signal : C.model;
        c.trail.forEach(([x, y], k) => { ctx.globalAlpha = 1 - k / 9; ctx.beginPath(); ctx.arc(x, y, 2.2, 0, 7); ctx.fill(); });
        ctx.globalAlpha = 1;
      });
    }
    // stage 1+: detections
    if (s >= 1) {
      cars.forEach((c) => {
        const col = hit && c.id !== 22 && s >= 5 ? C.alert : C.signal;
        ctx.strokeStyle = col; ctx.lineWidth = 1.5; ctx.strokeRect(c.x - 3, c.y - 3, c.w + 6, c.h + 6);
        label(ctx, c.x - 3.75, c.y - 3, `${c.cls} ${c.conf.toFixed(2)}${s >= 2 ? ` #${c.id}` : ""}`, col);
      });
    }

    // HUD
    ctx.fillStyle = "rgba(0,0,0,.45)"; ctx.fillRect(0, 0, w, 24);
    ctx.font = `500 10.5px ${MONO}`; ctx.fillStyle = C.soft;
    ctx.fillText("rtsp://cam-07 · 25 fps", 10, 16);
    ctx.textAlign = "right";
    ctx.fillText(`frame ${String(1000 + Math.floor(now / 40) % 9000).padStart(5, "0")} · buffer 1 · stale dropped`, w - 10, 16);
    ctx.textAlign = "left";

    // stage 3+: LSTM score over the last 30 steps
    if (s >= 3) {
      const gw = Math.min(210, w * 0.36), gh = 58, gx = 12, gy = 36;
      ctx.fillStyle = "rgba(8,11,15,.86)"; ctx.fillRect(gx, gy, gw, gh);
      ctx.strokeStyle = "rgba(148,163,184,.18)"; ctx.strokeRect(gx + 0.5, gy + 0.5, gw - 1, gh - 1);
      ctx.fillStyle = C.dim; ctx.font = `500 9.5px ${MONO}`; ctx.fillText("LSTM · 30 steps", gx + 8, gy + 13);
      ctx.beginPath();
      for (let k = 0; k < 30; k++) {
        const tk = t - (29 - k) * 120;
        const v = tk < IMPACT - 1600 ? 0.08 + 0.04 * Math.sin(k) : Math.min(0.94, 0.1 + (tk - (IMPACT - 1600)) / 2000);
        const x = gx + 8 + (k / 29) * (gw - 16), y = gy + gh - 8 - v * (gh - 26);
        if (k === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.strokeStyle = C.reason; ctx.lineWidth = 1.5; ctx.stroke();
    }

    // stage 4+: VLM verdict
    if (s >= 4) {
      const bw = Math.min(250, w * 0.42), bx = w - bw - 12, by = 36;
      ctx.fillStyle = "rgba(8,11,15,.88)"; ctx.fillRect(bx, by, bw, 50);
      ctx.strokeStyle = hit ? C.reason : "rgba(148,163,184,.18)"; ctx.strokeRect(bx + 0.5, by + 0.5, bw - 1, 49);
      ctx.font = `500 10px ${MONO}`; ctx.fillStyle = C.dim; ctx.fillText("VLM verify", bx + 10, by + 16);
      ctx.fillStyle = C.soft; ctx.fillText("accident in these frames?", bx + 10, by + 31);
      ctx.fillStyle = hit ? C.fg : C.dim; ctx.font = `600 10.5px ${MONO}`;
      ctx.fillText(hit ? (t > IMPACT + 500 ? "→ yes" : "→ …") : "→ waiting for candidate", bx + 10, by + 44);
    }

    // stage 5: alert
    if (s >= 5 && t > IMPACT + 700) {
      const on = Math.floor(now / 450) % 2 === 0;
      ctx.strokeStyle = C.alert; ctx.lineWidth = on ? 3 : 1.5; ctx.strokeRect(1.5, 1.5, w - 3, h - 3);
      const bw = Math.min(300, w * 0.5), bx = w - bw - 12, by = h - 62;
      ctx.fillStyle = C.alert; ctx.fillRect(bx, by, bw, 36);
      ctx.fillStyle = "#1a0503"; ctx.font = `700 11px ${MONO}`;
      ctx.fillText("ACCIDENT · #14 + #31", bx + 10, by + 15);
      ctx.font = `500 10px ${MONO}`; ctx.fillText("snapshot + H.264 clip (≤ 30 s)", bx + 10, by + 28);
    }

    ctx.fillStyle = C.dim; ctx.font = `500 9.5px ${MONO}`;
    ctx.fillText("Illustrative simulation", 12, h - 10);
  });

  return (
    <div ref={wrap} className="screen relative aspect-[16/10] w-full overflow-hidden rounded-xl border border-line bg-[#080b0f] shadow-[0_30px_60px_-30px_rgb(0_0_0/0.7)]">
      <canvas ref={canvas} className="absolute inset-0 size-full" aria-hidden />
    </div>
  );
}
