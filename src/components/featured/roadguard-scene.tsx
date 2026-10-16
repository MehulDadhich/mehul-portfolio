"use client";
/* eslint-disable react-hooks/immutability -- three.js objects (materials, uniforms, geometries) are mutated
   imperatively inside useFrame by design; React never renders from them. */

import { Suspense, useEffect, useMemo, useRef, type MutableRefObject } from "react";
import * as THREE from "three";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Text } from "@react-three/drei";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { FAR, NEAR, PAIR, SIM, SIZE, STAGE_AT, T_CRASH, Z_CRASH, buildTraffic, pairPose, trafficPose, type Kind, type Pose } from "./roadguard-timeline";

const FONT_MONO = "/fonts/jetbrains-mono-500.ttf";
const SIGNAL = "#ff5b2e";
const ON_SIGNAL = "#120804";
const BG = "#05070f";
const RAMP = ["#ffc061", "#ff5b2e", "#8a4dff", "#1d2f7a"].map((c) => new THREE.Color(c));
const ss = THREE.MathUtils.smoothstep;

/**
 * RoadGuard's pipeline as a 3D chapter, scrubbed by scroll. Everything is a pure function of progress `p`,
 * so scrolling back rewinds it exactly:
 *   video in → detect (boxes) → track (trails, ids) → rules (two cars collide; overlap + speed drop = 0.64)
 *   → VLM (a crop goes up for a yes/no) → incident (logged).
 * The view starts as raw CCTV (grey maquettes, grain) and turns into the machine view (depth colour) as
 * the detector comes online.
 */

/** Raw CCTV grey → machine-view depth colour, by `uMachine`. */
function makeVehicleMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: {
      uMachine: { value: 0 },
      uDim: { value: 0 },
      uC0: { value: RAMP[0] }, uC1: { value: RAMP[1] }, uC2: { value: RAMP[2] }, uC3: { value: RAMP[3] },
    },
    vertexShader: /* glsl */ `
      varying float vDepth; varying vec3 vN; varying vec3 vV;
      void main() {
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        vDepth = -mv.z; vN = normalize(normalMatrix * normal); vV = normalize(-mv.xyz);
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */ `
      uniform float uMachine, uDim; uniform vec3 uC0, uC1, uC2, uC3;
      varying float vDepth; varying vec3 vN; varying vec3 vV;
      vec3 ramp(float t) {
        if (t < 0.33) return mix(uC0, uC1, t / 0.33);
        if (t < 0.66) return mix(uC1, uC2, (t - 0.33) / 0.33);
        return mix(uC2, uC3, (t - 0.66) / 0.34);
      }
      void main() {
        vec3 n = normalize(vN);
        float light = 0.35 + 0.65 * max(dot(n, normalize(vec3(0.3, 0.9, 0.4))), 0.0);
        float fres = pow(1.0 - max(dot(n, normalize(vV)), 0.0), 2.0);
        vec3 raw = vec3(0.62, 0.6, 0.56) * light + fres * 0.12;
        float t = clamp((vDepth - 8.0) / 42.0, 0.0, 1.0);
        vec3 mach = mix(ramp(t) * 0.55, ramp(t), light) + fres * 0.4;
        vec3 c = mix(raw, mach, uMachine);
        c = mix(c, c * 0.25, uDim);
        gl_FragColor = vec4(c, 1.0);
      }`,
  });
}

function useVehicleGeometry(kind: Kind) {
  return useMemo(() => {
    const [w, h, l] = SIZE[kind];
    const body = new RoundedBoxGeometry(w, h * 0.5, l, 3, 0.12);
    body.translate(0, h * 0.3, 0);
    const cab = kind === "car" ? new RoundedBoxGeometry(w * 0.86, h * 0.42, l * 0.5, 3, 0.12) : new RoundedBoxGeometry(w * 0.96, h * 0.55, l * 0.9, 3, 0.1);
    cab.translate(0, kind === "car" ? h * 0.72 : h * 0.78, kind === "car" ? -l * 0.05 : 0);
    // RoundedBoxGeometry is indexed with matching attributes, so the two merge cleanly
    return mergeGeometries([body, cab])!;
  }, [kind]);
}

const EDGE = new THREE.EdgesGeometry(new THREE.BoxGeometry(1, 1, 1));

/** A vehicle with its detection box, label and track trail, all posed from `t`. */
function Vehicle({
  pose,
  kind,
  label,
  idLabel,
  p,
  order,
  role,
}: {
  pose: (t: number, out: Pose) => Pose;
  kind: Kind;
  label: string;
  idLabel: string;
  p: MutableRefObject<number>;
  order: number;
  role?: "a" | "b";
}) {
  const geo = useVehicleGeometry(kind);
  const mat = useMemo(() => makeVehicleMaterial(), []);
  const group = useRef<THREE.Group>(null);
  const body = useRef<THREE.Group>(null);
  const box = useRef<THREE.LineSegments>(null);
  const boxMat = useMemo(() => new THREE.LineBasicMaterial({ color: SIGNAL, toneMapped: false, transparent: true }), []);
  const tag = useRef<THREE.Group>(null);
  const idTag = useRef<THREE.Group>(null);
  const trail = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(new Float32Array(24 * 3), 3));
    return g;
  }, []);
  const trailMat = useMemo(() => new THREE.LineBasicMaterial({ color: "#8a4dff", toneMapped: false, transparent: true, opacity: 0 }), []);
  const trailLine = useMemo(() => new THREE.Line(trail, trailMat), [trail, trailMat]);
  const scratch = useMemo<Pose>(() => ({ x: 0, z: 0, yaw: 0, speed: 0, on: false }), []);
  const [w, h, l] = SIZE[kind];

  useFrame(() => {
    const P = p.current;
    const t = P * SIM;
    const now = pose(t, scratch);
    const g = group.current!;
    g.visible = now.on;
    if (!now.on) return;
    g.position.set(now.x, 0, now.z);
    body.current!.rotation.y = now.yaw;

    const machine = ss(P, STAGE_AT[1], STAGE_AT[1] + 0.06);
    const incident = ss(P, STAGE_AT[3] + 0.06, STAGE_AT[3] + 0.12);
    mat.uniforms.uMachine.value = machine;
    mat.uniforms.uDim.value = role ? 0 : incident * 0.55;

    // detection boxes pop in one after another as the detector comes up
    const pop = ss(P, STAGE_AT[1] + 0.02 + order * 0.004, STAGE_AT[1] + 0.05 + order * 0.004);
    const hot = role && P > STAGE_AT[3] + 0.05;
    box.current!.visible = pop > 0.01;
    box.current!.scale.set(w + 0.25, h + 0.2, l + 0.25).multiplyScalar(0.6 + 0.4 * pop);
    box.current!.rotation.y = now.yaw;
    boxMat.opacity = pop * (role ? 1 : 1 - incident * 0.6);
    boxMat.color.set(hot ? "#ffc061" : SIGNAL);
    // once Tier 1 fires, the pair is described by the event's own tag, not two of their own
    const folded = role ? ss(P, STAGE_AT[3] + 0.05, STAGE_AT[3] + 0.08) : 0;
    if (tag.current) {
      tag.current.visible = pop > 0.01 && now.z > -40 && folded < 0.99;
      tag.current.scale.setScalar(pop * (role ? 1 - folded : 1 - incident * 0.5));
    }
    if (idTag.current) {
      const show = ss(P, STAGE_AT[2], STAGE_AT[2] + 0.04);
      idTag.current.visible = show > 0.01 && now.z > -40 && folded < 0.99;
      idTag.current.scale.setScalar(show * (role ? 1 - folded : 1 - incident * 0.5));
    }

    // the track: where it was over the last ~2.8 s
    const show = ss(P, STAGE_AT[2], STAGE_AT[2] + 0.05) * (role ? 1 : 1 - incident * 0.7);
    trailMat.opacity = show * 0.9;
    const arr = trail.attributes.position.array as Float32Array;
    for (let k = 0; k < 24; k++) {
      const past = pose(Math.max(0, t - k * 0.12), scratch);
      // a wrapped car's past is on the other end of the road: pin those points to the car
      const jump = Math.abs(past.z - now.z) > 30;
      arr[k * 3] = (jump ? now.x : past.x) - now.x;
      arr[k * 3 + 1] = 0.04;
      arr[k * 3 + 2] = (jump ? now.z : past.z) - now.z;
    }
    pose(t, scratch); // restore
    trail.attributes.position.needsUpdate = true;
  });

  return (
    <group ref={group}>
      <group ref={body}>
        <mesh geometry={geo} material={mat} />
      </group>
      <lineSegments ref={box} geometry={EDGE} material={boxMat} position={[0, h / 2 + 0.05, 0]} />
      <primitive object={trailLine} />
      <group ref={tag} position={[-(w + 0.25) / 2, h + 0.3, 0]}>
        <Chip text={label} />
      </group>
      <group ref={idTag} position={[-(w + 0.25) / 2, h + 0.62, 0]}>
        <Chip text={idLabel} dark />
      </group>
    </group>
  );
}

function Chip({ text, dark }: { text: string; dark?: boolean }) {
  const w = text.length * 0.155 + 0.24;
  return (
    <group>
      <mesh position={[w / 2, 0.16, 0]}>
        <planeGeometry args={[w, 0.32]} />
        <meshBasicMaterial color={dark ? "#1d2f7a" : SIGNAL} toneMapped={false} />
      </mesh>
      <Text font={FONT_MONO} fontSize={0.24} color={dark ? "#efece4" : ON_SIGNAL} anchorX="left" anchorY="middle" position={[0.12, 0.16, 0.01]}>
        {text}
      </Text>
    </group>
  );
}

function Road() {
  const dashes = useMemo(() => {
    const pts: number[] = [];
    for (const x of [-2, 0, 2]) for (let z = FAR; z < NEAR; z += 4) pts.push(x, 0.01, z, x, 0.01, z + 1.8);
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(pts, 3));
    return g;
  }, []);
  const edges = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute([-4.1, 0.01, FAR, -4.1, 0.01, NEAR, 4.1, 0.01, FAR, 4.1, 0.01, NEAR], 3));
    return g;
  }, []);
  const grid = useMemo(() => {
    const pts: number[] = [];
    for (let x = -40; x <= 40; x += 2) if (Math.abs(x) > 4) pts.push(x, -0.02, FAR, x, -0.02, NEAR);
    for (let z = FAR; z <= NEAR; z += 2) pts.push(-40, -0.02, z, -4.3, -0.02, z, 4.3, -0.02, z, 40, -0.02, z);
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(pts, 3));
    return g;
  }, []);
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, (FAR + NEAR) / 2]}>
        <planeGeometry args={[8.4, NEAR - FAR]} />
        <meshBasicMaterial color="#0b0f1f" />
      </mesh>
      <lineSegments geometry={dashes}>
        <lineBasicMaterial color="#5a6aa8" toneMapped={false} />
      </lineSegments>
      <lineSegments geometry={edges}>
        <lineBasicMaterial color="#8a4dff" toneMapped={false} />
      </lineSegments>
      <lineSegments geometry={grid}>
        <lineBasicMaterial color="#1d2f7a" transparent opacity={0.55} toneMapped={false} />
      </lineSegments>
    </group>
  );
}

/** Tier 1's event: one box round both cars, a shock ring on the road, then the VLM crop and the incident tag. */
function Event({ p }: { p: MutableRefObject<number> }) {
  const g = useRef<THREE.Group>(null);
  const ring = useRef<THREE.Mesh>(null);
  const ringMat = useMemo(() => new THREE.MeshBasicMaterial({ color: SIGNAL, transparent: true, toneMapped: false, side: THREE.DoubleSide }), []);
  const box = useRef<THREE.LineSegments>(null);
  const tier = useRef<THREE.Group>(null);
  const crop = useRef<THREE.Group>(null);
  const cropEdges = useMemo(() => new THREE.EdgesGeometry(new THREE.PlaneGeometry(2.8, 1.7)), []);
  const vlm = useRef<THREE.Group>(null);
  const inc = useRef<THREE.Group>(null);
  const tCrashP = T_CRASH / SIM;

  useFrame(({ clock }) => {
    const P = p.current;
    const on = P > tCrashP + 0.01;
    g.current!.visible = on;
    if (!on) return;
    const e = ss(P, tCrashP + 0.01, tCrashP + 0.04);
    box.current!.scale.set(3.6 * (0.7 + 0.3 * e), 1.6, 3.4 * (0.7 + 0.3 * e));
    // a pulse keeps travelling out from the impact while the event is open
    const k = (clock.elapsedTime * 0.8) % 1;
    ring.current!.scale.setScalar(0.5 + k * 3.5);
    ringMat.opacity = (1 - k) * 0.6 * e;
    tier.current!.scale.setScalar(e * 0.62);
    const c = ss(P, STAGE_AT[4], STAGE_AT[4] + 0.05);
    crop.current!.visible = c > 0.01;
    crop.current!.position.y = 1.6 + c * 1.5;
    crop.current!.scale.setScalar(0.4 + 0.6 * c);
    vlm.current!.scale.setScalar(ss(P, STAGE_AT[4] + 0.08, STAGE_AT[4] + 0.11) * 0.62);
    // once logged, the incident tag takes the alert's place
    const logged = ss(P, STAGE_AT[5], STAGE_AT[5] + 0.04);
    inc.current!.scale.setScalar(logged * 0.62);
    tier.current!.scale.multiplyScalar(1 - logged);
  });

  return (
    <group ref={g} position={[0.3, 0, Z_CRASH + 0.4]}>
      <mesh ref={ring} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.03, 0]} material={ringMat}>
        <ringGeometry args={[0.95, 1, 64]} />
      </mesh>
      <lineSegments ref={box} geometry={EDGE} position={[0, 0.8, 0]}>
        <lineBasicMaterial color="#ffc061" toneMapped={false} />
      </lineSegments>
      <group ref={tier} position={[-1.8, 2.05, 1.7]}>
        <Chip text="TIER 1 · overlap + speed_drop · 0.64" />
      </group>
      <group ref={crop} position={[0, 1.4, 0]}>
        <lineSegments geometry={cropEdges}>
          <lineBasicMaterial color="#efece4" toneMapped={false} />
        </lineSegments>
        <group ref={vlm} position={[-1.4, 0.95, 0]}>
          <Chip text={'VLM · "accident?" → yes · 0.47 s'} dark />
        </group>
      </group>
      <group ref={inc} position={[-1.8, 2.45, 1.7]}>
        <Chip text="INCIDENT #031 · logged" />
      </group>
    </group>
  );
}

/** The CCTV camera: high and fixed, with a slow push in, a lean toward the crash, and a pull back at the end. */
function Rig({ p }: { p: MutableRefObject<number> }) {
  const { camera, size } = useThree();
  const look = useMemo(() => new THREE.Vector3(), []);
  const target = useMemo(() => new THREE.Vector3(), []);
  const pos = useMemo(() => new THREE.Vector3(), []);
  useFrame((_, delta) => {
    const P = p.current;
    const narrow = size.width / size.height < 1;
    const lean = ss(P, STAGE_AT[3], STAGE_AT[3] + 0.08) * (1 - 0.35 * ss(P, STAGE_AT[5], 1));
    pos.set(narrow ? 0.4 : 1.2, 8.5 - P * 1.2 - lean * 0.7 + ss(P, STAGE_AT[5], 1) * 2, (narrow ? 22 : 16) - P * 2 - lean * 1.6);
    target.set(lean * 0.3, 0, -10 + lean * 8);
    camera.position.x = THREE.MathUtils.damp(camera.position.x, pos.x, 4, delta);
    camera.position.y = THREE.MathUtils.damp(camera.position.y, pos.y, 4, delta);
    camera.position.z = THREE.MathUtils.damp(camera.position.z, pos.z, 4, delta);
    look.lerp(target, 1 - Math.exp(-4 * delta));
    camera.lookAt(look);
  });
  return null;
}

function Scene({ p, stage }: { p: MutableRefObject<number>; stage: number }) {
  const traffic = useMemo(() => buildTraffic(), []);
  const tracked = stage >= 2;
  return (
    <>
      <color attach="background" args={[BG]} />
      <fog attach="fog" args={[BG, 22, 70]} />
      <Rig p={p} />
      <Road />
      {traffic.map((c, i) => (
        <Vehicle
          key={c.id}
          kind={c.kind}
          pose={(t, out) => trafficPose(c, t, out)}
          label={`${c.kind} ${c.conf.toFixed(2)}`}
          idLabel={tracked ? `#${c.id}` : ""}
          p={p}
          order={i}
        />
      ))}
      <Vehicle kind="car" role="a" pose={(t, out) => pairPose("a", t, out)} label={`car ${PAIR.a.conf.toFixed(2)}`} idLabel={`#${PAIR.a.id}`} p={p} order={20} />
      <Vehicle kind="car" role="b" pose={(t, out) => pairPose("b", t, out)} label={`car ${PAIR.b.conf.toFixed(2)}`} idLabel={`#${PAIR.b.id}`} p={p} order={21} />
      <Event p={p} />
    </>
  );
}

function Ready({ onReady }: { onReady?: () => void }) {
  useEffect(() => { onReady?.(); }, [onReady]);
  return null;
}

export default function RoadguardScene({ p, stage, active = true, onReady }: { p: MutableRefObject<number>; stage: number; active?: boolean; onReady?: () => void }) {
  return (
    <Canvas frameloop={active ? "always" : "never"} dpr={[1, 1.75]} gl={{ antialias: true, powerPreference: "high-performance" }} camera={{ position: [1.2, 8.5, 16], fov: 38 }} aria-hidden>
      <Suspense fallback={null}>
        <Scene p={p} stage={stage} />
        <Ready onReady={onReady} />
      </Suspense>
    </Canvas>
  );
}
