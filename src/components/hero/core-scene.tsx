"use client";
/* eslint-disable react-hooks/immutability -- three.js objects (materials, uniforms, instance matrices) are mutated
   imperatively inside useFrame by design; React never renders from them. */

import { Suspense, useEffect, useMemo, useRef, type MutableRefObject } from "react";
import * as THREE from "three";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Environment, Lightformer } from "@react-three/drei";

/**
 * The hero's 3D core: a model "thinking". A high-detail sphere whose surface is churned by 3D simplex noise in
 * the vertex shader (normals rebuilt from displaced neighbours, so the light follows the moving surface), on an
 * iridescent clearcoat material lit in the machine view's depth ramp. Chrome orbit rings, a wire halo, drifting
 * shards and a particle field give it depth. The camera eases toward the pointer; scrolling the hero dollies the
 * camera into the core while the surface churns harder, and the page hands over to the RoadGuard chapter.
 */

export type CoreState = {
  /** 0 → 1 across the pinned hero: 0 at rest, 1 when the camera is inside the core */
  scroll: number;
  /** 0 → 1 intro: the core grows out of nothing */
  intro: number;
  /** reduced motion: one composed frame, no drift, no pointer */
  still: boolean;
};

const CAM_Z = 8;
const DEPTH = ["#ffc061", "#ff5b2e", "#8a4dff", "#1d2f7a"];

// 3D simplex noise (Ashima Arts / Stefan Gustavson, MIT), and a two-octave displacement of the unit sphere
const NOISE = /* glsl */ `
uniform float uTime; uniform float uAmp; uniform float uFreq;
vec4 permute(vec4 x){ return mod(((x*34.0)+1.0)*x, 289.0); }
vec4 taylorInvSqrt(vec4 r){ return 1.79284291400159 - 0.85373472095314 * r; }
float snoise(vec3 v){
  const vec2 C = vec2(1.0/6.0, 1.0/3.0); const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
  vec3 i = floor(v + dot(v, C.yyy)); vec3 x0 = v - i + dot(i, C.xxx);
  vec3 g = step(x0.yzx, x0.xyz); vec3 l = 1.0 - g;
  vec3 i1 = min(g.xyz, l.zxy); vec3 i2 = max(g.xyz, l.zxy);
  vec3 x1 = x0 - i1 + C.xxx; vec3 x2 = x0 - i2 + 2.0 * C.xxx; vec3 x3 = x0 - 1.0 + 3.0 * C.xxx;
  i = mod(i, 289.0);
  vec4 p = permute(permute(permute(i.z + vec4(0.0, i1.z, i2.z, 1.0)) + i.y + vec4(0.0, i1.y, i2.y, 1.0)) + i.x + vec4(0.0, i1.x, i2.x, 1.0));
  float n_ = 1.0/7.0; vec3 ns = n_ * D.wyz - D.xzx;
  vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
  vec4 x_ = floor(j * ns.z); vec4 y_ = floor(j - 7.0 * x_);
  vec4 x = x_ * ns.x + ns.yyyy; vec4 y = y_ * ns.x + ns.yyyy; vec4 h = 1.0 - abs(x) - abs(y);
  vec4 b0 = vec4(x.xy, y.xy); vec4 b1 = vec4(x.zw, y.zw);
  vec4 s0 = floor(b0)*2.0 + 1.0; vec4 s1 = floor(b1)*2.0 + 1.0; vec4 sh = -step(h, vec4(0.0));
  vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy; vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww;
  vec3 p0 = vec3(a0.xy, h.x); vec3 p1 = vec3(a0.zw, h.y); vec3 p2 = vec3(a1.xy, h.z); vec3 p3 = vec3(a1.zw, h.w);
  vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3)));
  p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
  vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0); m = m * m;
  return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
}
vec3 displaceP(vec3 p){
  vec3 n = normalize(p);
  float d = snoise(n * uFreq + vec3(uTime * 0.25)) * 0.75 + snoise(n * uFreq * 2.3 - vec3(uTime * 0.18)) * 0.25;
  return p + n * d * uAmp;
}`;

type Uniforms = { uTime: { value: number }; uAmp: { value: number }; uFreq: { value: number } };

function makeCoreMaterial(uniforms: Uniforms) {
  const m = new THREE.MeshPhysicalMaterial({
    color: "#140b09",
    metalness: 0.6,
    roughness: 0.18,
    clearcoat: 1,
    clearcoatRoughness: 0.08,
    iridescence: 1,
    iridescenceIOR: 1.6,
    iridescenceThicknessRange: [180, 620],
    sheen: 0.6,
    sheenColor: new THREE.Color(DEPTH[1]),
    envMapIntensity: 1.2,
  });
  m.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", `#include <common>\n${NOISE}`)
      // the normal of the displaced surface, from two displaced neighbours along the tangent and bitangent
      .replace(
        "#include <beginnormal_vertex>",
        `vec3 _n = normalize(position);
        vec3 _up = abs(_n.y) > 0.99 ? vec3(1.0, 0.0, 0.0) : vec3(0.0, 1.0, 0.0);
        vec3 _t = normalize(cross(_n, _up)); vec3 _b = normalize(cross(_n, _t));
        vec3 _p0 = displaceP(position);
        vec3 objectNormal = normalize(cross(displaceP(position + _t * 0.01) - _p0, displaceP(position + _b * 0.01) - _p0));
        #ifdef USE_TANGENT
          vec3 objectTangent = vec3(tangent.xyz);
        #endif`
      )
      .replace("#include <begin_vertex>", "vec3 transformed = displaceP(position);");
  };
  return m;
}

/** The pointer in -1…1, read from the window: the canvas itself takes no pointer events. */
function usePointer() {
  const p = useRef({ x: 0, y: 0 });
  useEffect(() => {
    const onMove = (e: PointerEvent) => { p.current.x = (e.clientX / innerWidth) * 2 - 1; p.current.y = (e.clientY / innerHeight) * 2 - 1; };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, []);
  return p;
}

const SHARDS = 26;

/** A small seeded PRNG (mulberry32), so the scene is laid out the same on every render. */
function seeded(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function Scene({ state }: { state: MutableRefObject<CoreState> }) {
  const narrow = useThree((s) => s.size.width < 700);
  const group = useRef<THREE.Group>(null!);
  const ring1 = useRef<THREE.Mesh>(null!);
  const ring2 = useRef<THREE.Mesh>(null!);
  const halo = useRef<THREE.Mesh>(null!);
  const shards = useRef<THREE.InstancedMesh>(null!);
  const field = useRef<THREE.Points>(null!);
  const pointer = usePointer();
  const eased = useRef({ x: 0, y: 0, scroll: 0 });

  const uniforms = useMemo<Uniforms>(() => ({ uTime: { value: 0 }, uAmp: { value: 0.22 }, uFreq: { value: 1.35 } }), []);
  const coreMat = useMemo(() => makeCoreMaterial(uniforms), [uniforms]);
  useEffect(() => () => coreMat.dispose(), [coreMat]);

  const shardData = useMemo(
    () => {
      const rand = seeded(11);
      return Array.from({ length: SHARDS }, () => ({ r: 2.3 + rand() * 2.2, a: rand() * Math.PI * 2, y: (rand() - 0.5) * 3, s: 0.6 + rand() * 1.6, sp: 0.05 + rand() * 0.12, rot: rand() * 6 }));
    },
    []
  );
  const dummy = useMemo(() => new THREE.Object3D(), []);

  // a shell of particles in ivory and the depth ramp, flattened so it reads as a field rather than a ball
  const particles = useMemo(() => {
    const n = narrow ? 1200 : 2400, rand = seeded(7);
    const pos = new Float32Array(n * 3), col = new Float32Array(n * 3);
    const palette = ["#efece4", "#efece4", DEPTH[0], DEPTH[1], DEPTH[2]].map((c) => new THREE.Color(c));
    for (let i = 0; i < n; i++) {
      const r = 3 + Math.pow(rand(), 0.6) * 12, th = rand() * Math.PI * 2, ph = Math.acos(2 * rand() - 1);
      pos.set([r * Math.sin(ph) * Math.cos(th), r * Math.sin(ph) * Math.sin(th) * 0.6, r * Math.cos(ph) - 2], i * 3);
      const c = palette[(rand() * palette.length) | 0];
      col.set([c.r, c.g, c.b], i * 3);
    }
    return { pos, col };
  }, [narrow]);

  // a soft round sprite so the points read as light, not squares
  const sprite = useMemo(() => {
    const c = document.createElement("canvas");
    c.width = c.height = 64;
    const g = c.getContext("2d")!, grd = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    grd.addColorStop(0, "rgba(255,255,255,1)");
    grd.addColorStop(0.3, "rgba(255,255,255,.5)");
    grd.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = grd;
    g.fillRect(0, 0, 64, 64);
    return new THREE.CanvasTexture(c);
  }, []);
  useEffect(() => () => sprite.dispose(), [sprite]);

  useFrame(({ clock, camera }) => {
    const s = state.current;
    const t = s.still ? 4 : clock.getElapsedTime();
    const e = eased.current;
    const px = s.still ? 0 : pointer.current.x, py = s.still ? 0 : pointer.current.y;
    e.x += (px - e.x) * 0.05;
    e.y += (py - e.y) * 0.05;
    e.scroll += (s.scroll - e.scroll) * 0.12;

    uniforms.uTime.value = t;
    uniforms.uAmp.value = 0.22 + e.scroll * 0.35; // the surface churns harder as the camera dives in
    const g = group.current;
    g.rotation.y = t * 0.12 + e.x * 0.4;
    g.rotation.x = Math.sin(t * 0.2) * 0.15 + e.y * 0.25;
    g.scale.setScalar(Math.max(0.001, s.intro) * (1 + e.scroll * 0.6) * (narrow ? 0.78 : 1));
    ring1.current.rotation.z = t * 0.25;
    ring2.current.rotation.z = -t * 0.18;
    halo.current.rotation.y = -t * 0.05;

    for (let i = 0; i < SHARDS; i++) {
      const d = shardData[i], a = d.a + t * d.sp;
      dummy.position.set(Math.cos(a) * d.r, d.y + Math.sin(t * 0.6 + i) * 0.15, Math.sin(a) * d.r - 0.5);
      dummy.rotation.set(t * 0.5 + d.rot, t * 0.3 + d.rot, 0);
      dummy.scale.setScalar(d.s * Math.max(0.001, s.intro));
      dummy.updateMatrix();
      shards.current.setMatrixAt(i, dummy.matrix);
    }
    shards.current.instanceMatrix.needsUpdate = true;
    field.current.rotation.y = t * 0.015;
    field.current.rotation.x = e.y * 0.05;

    // eased pointer parallax, and the dolly into the core as the hero scrolls
    camera.position.x += (e.x * 0.6 - camera.position.x) * 0.05;
    camera.position.y += (-e.y * 0.4 - camera.position.y) * 0.05;
    camera.position.z = CAM_Z - e.scroll * 5.4;
    camera.lookAt(0, 0, 0);
  });

  return (
    <>
      <fogExp2 attach="fog" args={["#0c0c0b", 0.06]} />
      <Environment resolution={256}>
        <Lightformer form="rect" intensity={2.5} position={[0, 4, 4]} scale={[10, 2, 1]} />
        <Lightformer form="rect" intensity={2} color={DEPTH[0]} position={[-6, 0, 2]} rotation={[0, Math.PI / 2, 0]} scale={[6, 2, 1]} />
        <Lightformer form="rect" intensity={2} color={DEPTH[2]} position={[6, -1, 1]} rotation={[0, -Math.PI / 2, 0]} scale={[6, 2, 1]} />
        <Lightformer form="ring" intensity={3} position={[4, 3, 3]} scale={2} />
      </Environment>
      <pointLight position={[3, 2, 4]} intensity={40} distance={20} color={DEPTH[0]} />
      <pointLight position={[-4, -1, -2]} intensity={60} distance={20} color={DEPTH[1]} />
      <pointLight position={[0, -3, 3]} intensity={18} distance={20} color={DEPTH[2]} />

      <group ref={group}>
        <mesh material={coreMat}>
          <icosahedronGeometry args={[1.15, narrow ? 32 : 56]} />
        </mesh>
        <mesh ref={halo}>
          <icosahedronGeometry args={[1.75, 2]} />
          <meshBasicMaterial color={DEPTH[1]} wireframe transparent opacity={0.07} />
        </mesh>
        <mesh ref={ring1} rotation={[1.2, 0.3, 0]}>
          <torusGeometry args={[2.05, 0.012, 16, 220]} />
          <meshPhysicalMaterial color="#efece4" metalness={1} roughness={0.12} clearcoat={1} envMapIntensity={1.6} />
        </mesh>
        <mesh ref={ring2} rotation={[-0.9, -0.5, 0.4]}>
          <torusGeometry args={[2.45, 0.008, 16, 220]} />
          <meshPhysicalMaterial color="#efece4" metalness={1} roughness={0.12} clearcoat={1} envMapIntensity={1.6} />
        </mesh>
      </group>

      <instancedMesh ref={shards} args={[undefined, undefined, SHARDS]}>
        <octahedronGeometry args={[0.07, 0]} />
        <meshPhysicalMaterial color="#f3e6d8" metalness={0.9} roughness={0.15} clearcoat={1} iridescence={0.6} />
      </instancedMesh>

      <points ref={field}>
        <bufferGeometry key={particles.pos.length}>
          <bufferAttribute attach="attributes-position" args={[particles.pos, 3]} />
          <bufferAttribute attach="attributes-color" args={[particles.col, 3]} />
        </bufferGeometry>
        <pointsMaterial size={0.06} map={sprite} vertexColors transparent depthWrite={false} blending={THREE.AdditiveBlending} opacity={0.85} />
      </points>
    </>
  );
}

/** Mounts once the scene above it in the Suspense boundary (the environment) has resolved. */
function Ready({ onReady }: { onReady?: () => void }) {
  useEffect(() => {
    // give the first frames a moment to compile shaders before the intro starts
    const id = setTimeout(() => onReady?.(), 120);
    return () => clearTimeout(id);
  }, [onReady]);
  return null;
}

export default function CoreScene({ state, active = true, onReady }: { state: MutableRefObject<CoreState>; active?: boolean; onReady?: () => void }) {
  return (
    <Canvas
      frameloop={active ? "always" : "never"}
      dpr={[1, 1.75]}
      gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
      onCreated={({ gl }) => { gl.toneMappingExposure = 0.85; }}
      camera={{ position: [0, 0, CAM_Z], fov: 40 }}
      style={{ pointerEvents: "none" }}
      aria-hidden
    >
      <Suspense fallback={null}>
        <Scene state={state} />
        <Ready onReady={onReady} />
      </Suspense>
    </Canvas>
  );
}
