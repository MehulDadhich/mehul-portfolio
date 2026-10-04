"use client";

import { useRef } from "react";
import { fitCanvas, useInViewLoop } from "@/hooks/use-in-view-loop";

/** kind: 0 road, 1 lane marking, 2 barrier, 3 vehicle (primary), 4 vehicle (secondary) */
type Pt = [x: number, y: number, z: number, kind: number];

function buildScene(): Pt[] {
  const R = Math.random;
  const pts: Pt[] = [];
  for (let i = 0; i < 3200; i++) pts.push([R() * 20 - 10, 0, R() * 34 - 17, 0]);
  for (let z = -17; z < 17; z += 0.22) { pts.push([-1.8, 0, z, 1]); pts.push([1.8, 0, z, 1]); }
  for (let z = -17; z < 17; z += 0.1) { pts.push([-6.2 + R() * 0.2, R() * 1.1, z, 2]); pts.push([6.2 + R() * 0.2, R() * 1.1, z, 2]); }
  const vehicles: [number, number, number][] = [[-3.6, -5, 0], [0, 2, 1], [3.6, -10, 0], [-3.6, 8, 1], [3.6, 5, 0]];
  vehicles.forEach(([cx, cz, v]) => {
    for (let i = 0; i < 1100; i++) {
      const x = cx + (R() - 0.5) * 1.9, y = R() * 1.55, z = cz + (R() - 0.5) * 4.3;
      const onSurface = Math.abs(Math.abs(x - cx) - 0.95) < 0.09 || y > 1.45 || Math.abs(Math.abs(z - cz) - 2.15) < 0.11;
      if (onSurface) pts.push([x, y, z, 3 + v]);
    }
  });
  return pts;
}

/**
 * Contact background: a street captured as a LiDAR point cloud (road, lane lines, barriers and
 * vehicles), coloured by depth. The camera slowly orbits; moving the cursor steers it.
 */
export function LidarField() {
  const canvas = useRef<HTMLCanvasElement>(null);
  const mouse = useRef({ x: 0.5, y: 0.5, in: false });
  const s = useRef<{ pts: Pt[] | null; yaw: number; pitch: number; colors: Record<string, string> | null; sweep: number }>({
    pts: null, yaw: 0.7, pitch: 0.36, colors: null, sweep: 0,
  });

  const wrap = useInViewLoop<HTMLDivElement>((t) => {
    const el = canvas.current;
    if (!el) return;
    const { ctx, w, h } = fitCanvas(el);
    const st = s.current;
    if (!st.pts) st.pts = buildScene();
    if (!st.colors) {
      const cs = getComputedStyle(el);
      st.colors = {
        signal: cs.getPropertyValue("--signal").trim() || "#e9c46a",
        reason: cs.getPropertyValue("--reason").trim() || "#c9b8ff",
        fg: cs.getPropertyValue("--fg").trim() || "#f4efe3",
        soft: cs.getPropertyValue("--soft").trim() || "#aaa496",
      };
    }
    const C = st.colors;
    const m = mouse.current;
    const targetYaw = m.in ? (m.x - 0.5) * 2.4 + 0.4 : 0.7 + Math.sin(t / 7000) * 0.55;
    const targetPitch = m.in ? 0.14 + m.y * 0.55 : 0.36 + Math.sin(t / 9000) * 0.06;
    st.yaw += (targetYaw - st.yaw) * 0.05;
    st.pitch += (targetPitch - st.pitch) * 0.05;

    ctx.clearRect(0, 0, w, h);
    const cy = Math.cos(st.yaw), sy = Math.sin(st.yaw), cp = Math.cos(st.pitch), sp = Math.sin(st.pitch);
    const f = Math.min(w, h) * 1.3;
    const ox = w * 0.66, oy = h * 0.56;
    // a scanning ring that sweeps outward, like a spinning LiDAR head
    const sweep = ((t / 2600) % 1) * 22;

    for (const q of st.pts) {
      const x = q[0] * cy - q[2] * sy;
      const z = q[0] * sy + q[2] * cy;
      const y = q[1] - 1.3;
      const y2 = y * cp - z * sp;
      const z2 = y * sp + z * cp + 23;
      if (z2 < 1) continue;
      const X = ox + (x * f) / z2, Y = oy - (y2 * f) / z2;
      if (X < -2 || X > w + 2 || Y < -2 || Y > h + 2) continue;
      const depth = Math.min(1, Math.max(0, (z2 - 10) / 28));
      const r = Math.hypot(q[0], q[2]);
      const lit = Math.abs(r - sweep) < 0.6 ? 1 : 0;
      const kind = q[3];
      ctx.fillStyle = kind >= 3 ? (kind === 3 ? C.signal : C.reason) : kind === 1 ? C.fg : lit ? C.signal : C.soft;
      ctx.globalAlpha = (kind === 0 ? (lit ? 0.75 : 0.22) : kind === 2 ? 0.45 : 0.9) * (1 - depth * 0.7);
      const size = kind >= 3 ? 1.9 : 1.3;
      ctx.fillRect(X, Y, size, size);
    }
    ctx.globalAlpha = 1;
  });

  return (
    <div
      ref={wrap}
      className="absolute inset-0 -z-10"
      onPointerMove={(e) => {
        const r = e.currentTarget.getBoundingClientRect();
        mouse.current = { x: (e.clientX - r.left) / r.width, y: (e.clientY - r.top) / r.height, in: e.pointerType === "mouse" };
      }}
      onPointerLeave={() => { mouse.current.in = false; }}
      aria-hidden
    >
      <canvas ref={canvas} className="size-full" />
      {/* keep the headline readable */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(70%_85%_at_0%_70%,var(--ink)_28%,transparent_72%)]" />
    </div>
  );
}
