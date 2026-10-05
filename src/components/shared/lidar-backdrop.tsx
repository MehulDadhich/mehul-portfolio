"use client";

import { useEffect, useRef } from "react";
import { fitCanvas, useInViewLoop } from "@/hooks/use-in-view-loop";
import { wheelState } from "@/components/wheel/wheel-context";

/** kind: 0 road, 1 lane marking, 2 barrier, 3 vehicle (primary), 4 vehicle (secondary) */
type Pt = [x: number, y: number, z: number, kind: number];

function buildScene(): Pt[] {
  const R = Math.random;
  const pts: Pt[] = [];
  for (let i = 0; i < 4200; i++) pts.push([R() * 26 - 13, 0, R() * 40 - 20, 0]);
  for (let z = -20; z < 20; z += 0.22) { pts.push([-1.8, 0, z, 1]); pts.push([1.8, 0, z, 1]); }
  for (let z = -20; z < 20; z += 0.1) { pts.push([-6.2 + R() * 0.2, R() * 1.1, z, 2]); pts.push([6.2 + R() * 0.2, R() * 1.1, z, 2]); }
  const vehicles: [number, number, number][] = [[-3.6, -5, 0], [0, 2, 1], [3.6, -10, 0], [-3.6, 8, 1], [3.6, 5, 0], [0, -14, 1], [-3.6, 15, 0]];
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
 * Site-wide background: a street captured as a LiDAR point cloud (road, lane lines, barriers and
 * vehicles), coloured by depth, with a scan ring sweeping out from the sensor. The camera orbits
 * clockwise with the section wheel (or with scroll on small screens) and leans toward the cursor.
 */
export function LidarBackdrop() {
  const canvas = useRef<HTMLCanvasElement>(null);
  const mouse = useRef({ x: 0.5, y: 0.5 });
  const s = useRef<{ pts: Pt[] | null; yaw: number; pitch: number; colors: Record<string, string> | null }>({
    pts: null, yaw: 0.7, pitch: 0.42, colors: null,
  });

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      if (e.pointerType === "mouse") mouse.current = { x: e.clientX / window.innerWidth, y: e.clientY / window.innerHeight };
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, []);

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
    // the world turns clockwise as the wheel does (seen from above, clockwise is decreasing yaw)
    const scrolled = wheelState.active
      ? wheelState.angle
      : (window.scrollY / Math.max(1, document.documentElement.scrollHeight - window.innerHeight)) * Math.PI;
    const targetYaw = 0.7 - scrolled + (m.x - 0.5) * 0.5 + Math.sin(t / 9000) * 0.12;
    const targetPitch = 0.36 + (m.y - 0.5) * 0.18 + Math.sin(t / 11000) * 0.04;
    const dYaw = Math.atan2(Math.sin(targetYaw - st.yaw), Math.cos(targetYaw - st.yaw)); // shortest way round
    st.yaw += dYaw * 0.06;
    st.pitch += (targetPitch - st.pitch) * 0.06;

    ctx.clearRect(0, 0, w, h);
    const cy = Math.cos(st.yaw), sy = Math.sin(st.yaw), cp = Math.cos(st.pitch), sp = Math.sin(st.pitch);
    const f = Math.min(w, h) * 1.25;
    const ox = w * 0.5, oy = h * 0.6;
    const sweep = ((t / 2600) % 1) * 24;

    for (const q of st.pts) {
      const x = q[0] * cy - q[2] * sy;
      const z = q[0] * sy + q[2] * cy;
      const y = q[1] - 1.3;
      const y2 = y * cp - z * sp;
      const z2 = y * sp + z * cp + 24;
      if (z2 < 1) continue;
      const X = ox + (x * f) / z2, Y = oy - (y2 * f) / z2;
      if (X < -2 || X > w + 2 || Y < -2 || Y > h + 2) continue;
      const depth = Math.min(1, Math.max(0, (z2 - 10) / 30));
      const lit = Math.abs(Math.hypot(q[0], q[2]) - sweep) < 0.6;
      const kind = q[3];
      ctx.fillStyle = kind >= 3 ? (kind === 3 ? C.signal : C.reason) : kind === 1 ? C.fg : lit ? C.signal : C.soft;
      ctx.globalAlpha = (kind === 0 ? (lit ? 0.95 : 0.38) : kind === 2 ? 0.6 : 1) * (1 - depth * 0.55);
      const size = kind >= 3 ? 2.2 : 1.6;
      ctx.fillRect(X, Y, size, size);
    }
    ctx.globalAlpha = 1;
  });

  return (
    <div ref={wrap} className="pointer-events-none fixed inset-0 -z-10" aria-hidden>
      <canvas ref={canvas} className="size-full" />
      {/* dim the cloud where text sits so every section stays readable */}
      <div className="absolute inset-0 bg-[radial-gradient(120%_90%_at_50%_40%,rgb(10_11_16/0.3)_0%,rgb(10_11_16/0.6)_75%)]" />
    </div>
  );
}
