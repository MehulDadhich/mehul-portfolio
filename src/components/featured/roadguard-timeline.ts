/**
 * RoadGuard chapter timeline: the seeded traffic, the colliding pair and the stage boundaries, as pure
 * functions of time. Shared by the 3D scene and the DOM readouts, and kept free of three.js so the page
 * can import it without pulling the renderer into the main bundle.
 */

/** Hermite smoothstep, same as THREE.MathUtils.smoothstep. */
const ss = (x: number, a: number, b: number) => {
  if (x <= a) return 0;
  if (x >= b) return 1;
  const t = (x - a) / (b - a);
  return t * t * (3 - 2 * t);
};

export const STAGE_AT = [0, 0.14, 0.3, 0.46, 0.64, 0.82] as const;
export const SIM = 16; // seconds of traffic across the whole chapter
export const T_CRASH = 0.55 * SIM;
export const V = 9; // pair speed, units / s
export const Z_CRASH = 0.5;
export const FAR = -72, NEAR = 15;



export type Kind = "car" | "truck" | "bus";
export type Car = { id: number; kind: Kind; lane: number; z0: number; v: number; conf: number; wrap: boolean };

/** A fixed, seeded street: lanes −3 and 3 loop forever; lanes −1 and 1 carry a few cars that clear before the crash. */
export function buildTraffic(): Car[] {
  let seed = 11;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const out: Car[] = [];
  let id = 12;
  for (const lane of [-3, 3]) {
    for (let k = 0; k < 6; k++) {
      const r = rnd();
      out.push({ id: id++, kind: r < 0.65 ? "car" : r < 0.85 ? "truck" : "bus", lane, z0: FAR + k * 14.5 + rnd() * 5, v: 6.5 + rnd() * 3, conf: 0.82 + rnd() * 0.15, wrap: true });
    }
  }
  for (const lane of [-1, 1]) {
    for (let k = 0; k < 2; k++) {
      out.push({ id: id++, kind: "car", lane, z0: -26 + k * 13 + rnd() * 4, v: 8 + rnd() * 2, conf: 0.85 + rnd() * 0.12, wrap: false });
    }
  }
  return out;
}

/** The two that collide: A drifts into B's lane. */
export const PAIR = {
  a: { id: 31, kind: "car" as Kind, conf: 0.93 },
  b: { id: 32, kind: "car" as Kind, conf: 0.9 },
};

export const SIZE: Record<Kind, [number, number, number]> = { car: [1.05, 0.95, 2.2], truck: [1.25, 1.55, 3.6], bus: [1.3, 1.7, 4.4] };

export type Pose = { x: number; z: number; yaw: number; speed: number; on: boolean };

export function trafficPose(c: Car, t: number, out: Pose) {
  let z = c.z0 + c.v * t;
  if (c.wrap) z = FAR + ((((z - FAR) % (NEAR - FAR)) + (NEAR - FAR)) % (NEAR - FAR));
  out.x = c.lane;
  out.z = z;
  out.yaw = 0;
  out.speed = c.v;
  out.on = z < NEAR && z > FAR;
  return out;
}

export function pairPose(which: "a" | "b", t: number, out: Pose) {
  const after = Math.max(0, t - T_CRASH);
  const stop = 1 - Math.exp(-after * 4.5);
  if (which === "a") {
    const merge = ss(t, T_CRASH - 1.4, T_CRASH);
    out.x = -1 + merge * 1.32;
    out.z = t < T_CRASH ? Z_CRASH - V * (T_CRASH - t) : Z_CRASH + 1.3 * stop;
    out.yaw = merge * 0.18 + stop * 0.55;
    out.speed = t < T_CRASH ? V : V * (1 - stop);
  } else {
    out.x = 1 + stop * 0.35;
    out.z = t < T_CRASH ? Z_CRASH - 0.4 - V * (T_CRASH - t) : Z_CRASH - 0.4 + 0.7 * stop;
    out.yaw = -stop * 0.22;
    out.speed = t < T_CRASH ? V : V * (1 - stop);
  }
  out.on = out.z > FAR;
  return out;
}

/** Current speed of car A in km/h for the readout (the sim runs at a scale where 9 units/s reads as 84 km/h). */
export function pairSpeedKmh(P: number) {
  const s = pairPose("a", P * SIM, { x: 0, z: 0, yaw: 0, speed: 0, on: false }).speed;
  return Math.round((s / V) * 84);
}
export const CRASH_P = T_CRASH / SIM;
