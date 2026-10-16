"use client";
/* eslint-disable react-hooks/immutability -- three.js objects (materials, uniforms, geometries) are mutated
   imperatively inside useFrame by design; React never renders from them. */

import { Suspense, useEffect, useMemo, useRef, type MutableRefObject, type ReactNode } from "react";
import * as THREE from "three";
import { Canvas, createPortal, useFrame, useThree } from "@react-three/fiber";
import { Environment, Lightformer, MeshTransmissionMaterial, RoundedBox, Text, useFBO } from "@react-three/drei";

/**
 * "Two ways of seeing." A real refractive lens floats over the hero. Outside it is the human view: the name
 * and a few objects set as ivory maquettes. Through it is the machine view: the same scene rendered into an
 * offscreen buffer as a depth map, with wireframes, bounding boxes and class labels, and refracted by the glass.
 * The lens follows the pointer (and wanders on its own on touch screens). Scrolling pulls it toward the
 * camera until it fills the frame, and the page falls through it into the machine view.
 */

export type NameLine = { text: string; font: string; letterSpacing: string; left: number; baseline: number };

export type HeroState = {
  /** 0 → 1 across the pinned hero: 0 at rest, 1 when the lens fills the screen */
  scroll: number;
  /** the lens drops in once the name has been generated */
  lens: number;
  /** the machine view's copy of the name fades in once the DOM name exists */
  nameOn: number;
  /** the DOM name, measured in canvas pixels (bumps `version` on every re-measure) */
  name: { x: number; y: number; w: number; h: number; lines: NameLine[]; version: number } | null;
  /** reduced motion: the lens rests in place and ignores the pointer */
  still: boolean;
};

export const FONT_MONO = "/fonts/jetbrains-mono-500.ttf";

export const SIGNAL = "#ff5b2e";
const ON_SIGNAL = "#120804";
export const MACHINE_BG = "#05070f";
const RAMP = ["#ffc061", "#ff5b2e", "#8a4dff", "#1d2f7a"].map((c) => new THREE.Color(c));

const LENS_R = 0.95;
const NAME_Z = -1.6;
/** On tall screens the words sit in the lower half, so the scene moves up to clear them. */
const lift = (scale: number) => (scale < 0.75 ? (0.75 - scale) * 4.2 : 0);
const AT_LENS = new THREE.Vector3(0, 0, 2.2);
const LENS_Z = 2.2;
const CAM_Z = 9;

// ---------------------------------------------------------------------------------------------
// materials

/** The machine view's look: colour by distance from the camera, a fresnel rim, faint scanlines. */
export function makeDepthMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: {
      uNear: { value: 5.5 },
      uFar: { value: 12.5 },
      uC0: { value: RAMP[0] },
      uC1: { value: RAMP[1] },
      uC2: { value: RAMP[2] },
      uC3: { value: RAMP[3] },
    },
    vertexShader: /* glsl */ `
      varying float vDepth;
      varying vec3 vN;
      varying vec3 vV;
      void main() {
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        vDepth = -mv.z;
        vN = normalize(normalMatrix * normal);
        vV = normalize(-mv.xyz);
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */ `
      uniform float uNear, uFar;
      uniform vec3 uC0, uC1, uC2, uC3;
      varying float vDepth;
      varying vec3 vN;
      varying vec3 vV;
      vec3 ramp(float t) {
        if (t < 0.33) return mix(uC0, uC1, t / 0.33);
        if (t < 0.66) return mix(uC1, uC2, (t - 0.33) / 0.33);
        return mix(uC2, uC3, (t - 0.66) / 0.34);
      }
      void main() {
        float t = clamp((vDepth - uNear) / (uFar - uNear), 0.0, 1.0);
        vec3 c = ramp(t);
        float fres = pow(1.0 - max(dot(normalize(vN), normalize(vV)), 0.0), 2.0);
        c = mix(c * 0.55, c, 0.35 + 0.65 * max(dot(normalize(vN), vec3(0.3, 0.6, 0.75)), 0.0));
        c += fres * 0.35;
        c *= 0.92 + 0.08 * step(0.5, fract(gl_FragCoord.y * 0.25));
        gl_FragColor = vec4(c, 1.0);
      }`,
  });
}

/**
 * Idle drift, computed from the clock with a fixed phase, so an object's human and machine copies
 * move as one (drei's Float picks a random phase per instance, which would tear the two views apart).
 */
export function Drift({ phase, children }: { phase: number; children: ReactNode }) {
  const g = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (!g.current) return;
    const t = clock.elapsedTime * 0.9 + phase;
    g.current.position.y = Math.sin(t) * 0.08;
    g.current.rotation.x = Math.cos(t * 0.6) * 0.05;
    g.current.rotation.y = Math.sin(t * 0.5) * 0.12;
  });
  return <group ref={g}>{children}</group>;
}

// ---------------------------------------------------------------------------------------------
// the objects a model would see: built from primitives, shared by both views

type Look = "human" | "machine";

function useMaterials(look: Look) {
  return useMemo(() => {
    if (look === "machine") {
      const depth = makeDepthMaterial();
      return { body: depth, dark: depth, accent: depth };
    }
    return {
      body: new THREE.MeshStandardMaterial({ color: "#e6e0d2", roughness: 0.5, metalness: 0 }),
      dark: new THREE.MeshStandardMaterial({ color: "#1b1b19", roughness: 0.25, metalness: 0.2 }),
      accent: new THREE.MeshStandardMaterial({ color: SIGNAL, roughness: 0.45 }),
    };
  }, [look]);
}

function Car({ look }: { look: Look }) {
  const m = useMaterials(look);
  return (
    <group>
      <RoundedBox args={[1.7, 0.42, 0.78]} radius={0.12} smoothness={4} position={[0, 0.32, 0]} material={m.body} />
      <RoundedBox args={[0.92, 0.36, 0.7]} radius={0.12} smoothness={4} position={[-0.1, 0.66, 0]} material={m.body} />
      <RoundedBox args={[0.94, 0.22, 0.72]} radius={0.06} smoothness={3} position={[-0.1, 0.68, 0]} material={m.dark} />
      {[-0.55, 0.55].flatMap((x) =>
        [-0.36, 0.36].map((z) => (
          <mesh key={`${x}${z}`} position={[x, 0.15, z]} rotation={[Math.PI / 2, 0, 0]} material={m.dark}>
            <cylinderGeometry args={[0.17, 0.17, 0.14, 24]} />
          </mesh>
        ))
      )}
    </group>
  );
}

function Person({ look }: { look: Look }) {
  const m = useMaterials(look);
  return (
    <group>
      <mesh position={[0, 0.62, 0]} material={m.body}>
        <capsuleGeometry args={[0.2, 0.62, 8, 20]} />
      </mesh>
      <mesh position={[0, 1.2, 0]} material={m.body}>
        <sphereGeometry args={[0.17, 32, 16]} />
      </mesh>
    </group>
  );
}

function Cone({ look }: { look: Look }) {
  const m = useMaterials(look);
  return (
    <group>
      <mesh position={[0, 0.03, 0]} material={m.dark}>
        <boxGeometry args={[0.62, 0.06, 0.62]} />
      </mesh>
      <mesh position={[0, 0.42, 0]} material={m.body}>
        <coneGeometry args={[0.24, 0.78, 32]} />
      </mesh>
      <mesh position={[0, 0.42, 0]} material={m.accent}>
        <cylinderGeometry args={[0.135, 0.17, 0.14, 32]} />
      </mesh>
    </group>
  );
}

function Camera({ look }: { look: Look }) {
  const m = useMaterials(look);
  return (
    <group>
      <mesh position={[0, -0.55, 0]} material={m.dark}>
        <cylinderGeometry args={[0.03, 0.03, 0.9, 12]} />
      </mesh>
      <RoundedBox args={[0.72, 0.3, 0.32]} radius={0.06} smoothness={3} position={[0.08, 0, 0]} material={m.body} />
      <mesh position={[0.46, 0, 0]} rotation={[0, 0, Math.PI / 2]} material={m.dark}>
        <cylinderGeometry args={[0.11, 0.13, 0.12, 24]} />
      </mesh>
    </group>
  );
}

/** Where each object sits, its box in its own space, and what the detector calls it. */
const OBJECTS: {
  id: string;
  C: (p: { look: Look }) => ReactNode;
  pos: [number, number, number];
  rot: [number, number, number];
  box: [number, number, number, number, number, number]; // center xyz, size xyz
  label: string;
}[] = [
  { id: "car", C: Car, pos: [2.7, -1.75, 0.4], rot: [0.12, -0.55, 0], box: [0, 0.45, 0, 1.9, 0.95, 1], label: "car 0.97" },
  { id: "person", C: Person, pos: [1.35, -1.05, -0.2], rot: [0, 0.3, 0], box: [0, 0.68, 0, 0.55, 1.5, 0.5], label: "person 0.94" },
  { id: "cone", C: Cone, pos: [3.75, -0.05, 0.3], rot: [0.25, 0.4, 0.1], box: [0, 0.42, 0, 0.66, 0.86, 0.66], label: "traffic_cone 0.91" },
  { id: "cam", C: Camera, pos: [2.6, 1.55, -0.7], rot: [0.1, -0.5, -0.12], box: [0.18, -0.15, 0, 1, 1.1, 0.4], label: "cctv_camera 0.88" },
];

export function BoxLines({ size, color = SIGNAL }: { size: [number, number, number]; color?: string }) {
  const geo = useMemo(() => new THREE.EdgesGeometry(new THREE.BoxGeometry(...size)), [size]);
  return (
    <lineSegments geometry={geo}>
      <lineBasicMaterial color={color} toneMapped={false} />
    </lineSegments>
  );
}

/** A detector's class tag: a filled vermilion chip with dark mono text. */
export function Tag({ text, position, scale = 1 }: { text: string; position: [number, number, number]; scale?: number }) {
  const w = text.length * 0.066 + 0.14;
  return (
    <group position={position} scale={scale}>
      <mesh position={[w / 2, 0.1, 0]}>
        <planeGeometry args={[w, 0.2]} />
        <meshBasicMaterial color={SIGNAL} toneMapped={false} />
      </mesh>
      <Text font={FONT_MONO} fontSize={0.11} color={ON_SIGNAL} anchorX="left" anchorY="middle" position={[0.07, 0.1, 0.002]}>
        {text}
      </Text>
    </group>
  );
}

// ---------------------------------------------------------------------------------------------
// the name

// ---------------------------------------------------------------------------------------------
// the name, as the machine sees it

/**
 * The machine view's copy of the DOM name. The hero measures each line of the real h1 (its rect and
 * font) into `state.name`; this draws those lines into a texture in the depth palette, with the
 * detector's box and tag, on a plane sized and placed so it sits exactly over the DOM name on screen.
 */
function MachineName({ state }: { state: MutableRefObject<HeroState> }) {
  const { size, camera } = useThree();
  const mesh = useRef<THREE.Mesh>(null);
  const version = useRef(-1);
  const tex = useMemo(() => {
    const t = new THREE.CanvasTexture(document.createElement("canvas"));
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }, []);
  const mat = useMemo(() => new THREE.MeshBasicMaterial({ map: tex, transparent: true, toneMapped: false, depthWrite: false }), [tex]);
  useEffect(() => () => { tex.dispose(); mat.dispose(); }, [tex, mat]);

  useFrame(() => {
    const n = state.current.name;
    const m = mesh.current;
    if (!m) return;
    m.visible = !!n && state.current.nameOn > 0.01;
    mat.opacity = state.current.nameOn;
    if (!n || version.current === n.version) return;
    version.current = n.version;

    // redraw the lines at device resolution, with room around them for the box and tag
    const pad = 28, dpr = Math.min(2, window.devicePixelRatio || 1);
    const W = n.w + pad * 2, H = n.h + pad * 2 + 30;
    const c = tex.image as HTMLCanvasElement;
    c.width = Math.round(W * dpr);
    c.height = Math.round(H * dpr);
    const ctx = c.getContext("2d")!;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    const ox = pad - n.x, oy = pad + 30 - n.y;
    n.lines.forEach((l, i) => {
      ctx.font = l.font;
      // the h1 is tightly tracked; without this the copy runs wider than the real name and drifts off it
      (ctx as CanvasRenderingContext2D & { letterSpacing?: string }).letterSpacing = l.letterSpacing;
      ctx.textBaseline = "alphabetic";
      ctx.fillStyle = i === 0 ? "#ffc061" : SIGNAL;
      ctx.fillText(l.text, l.left + ox, l.baseline + oy);
    });
    (ctx as CanvasRenderingContext2D & { letterSpacing?: string }).letterSpacing = "0px";
    ctx.strokeStyle = SIGNAL;
    ctx.lineWidth = 2;
    ctx.strokeRect(pad * 0.5, 30 + pad * 0.5, W - pad, H - 30 - pad);
    const label = "mehul_dadhich · ai_engineer 0.99";
    ctx.font = `500 15px ${getComputedStyle(document.body).getPropertyValue("--font-jetbrains").trim() || "monospace"}`;
    const tw = ctx.measureText(label).width + 16;
    ctx.fillStyle = SIGNAL;
    ctx.fillRect(pad * 0.5 - 1, 30 + pad * 0.5 - 24, tw, 24);
    ctx.fillStyle = ON_SIGNAL;
    ctx.textBaseline = "middle";
    ctx.fillText(label, pad * 0.5 + 7, 30 + pad * 0.5 - 12);
    tex.needsUpdate = true;

    // place the plane: screen pixels → world units at the name's depth
    const depth = CAM_Z - NAME_Z;
    const k = (2 * depth * Math.tan(THREE.MathUtils.degToRad((camera as THREE.PerspectiveCamera).fov / 2))) / size.height;
    const cx = n.x - pad + W / 2, cy = n.y - pad - 30 + H / 2;
    m.position.set((cx - size.width / 2) * k, -(cy - size.height / 2) * k, NAME_Z);
    m.scale.set(W * k, H * k, 1);
  });

  return (
    <mesh ref={mesh} material={mat} visible={false}>
      <planeGeometry args={[1, 1]} />
    </mesh>
  );
}

// ---------------------------------------------------------------------------------------------
// one world, drawn twice

function World({ look, scale, state }: { look: Look; scale: number; state: MutableRefObject<HeroState> }) {
  const machine = look === "machine";
  return (
    <>
      {machine ? <MachineName state={state} /> : null}
      {OBJECTS.map((o, i) => (
        <Drift key={o.id} phase={i * 1.7}>
          <group position={[o.pos[0] * scale, o.pos[1] * Math.max(scale, 0.75) + lift(scale) * 0.6, o.pos[2]]} rotation={o.rot} scale={Math.max(scale, 0.5)}>
            <o.C look={look} />
            {machine ? (
              <>
                <group position={[o.box[0], o.box[1], o.box[2]]}>
                  <BoxLines size={[o.box[3], o.box[4], o.box[5]]} />
                </group>
                <Tag text={o.label} position={[o.box[0] - o.box[3] / 2, o.box[1] + o.box[4] / 2 + 0.02, o.box[2] + o.box[5] / 2]} />
              </>
            ) : null}
          </group>
        </Drift>
      ))}
    </>
  );
}

/** The machine view's ground: a receding grid in the far end of the depth ramp. */
export function MachineGrid() {
  const geo = useMemo(() => {
    const pts: number[] = [];
    for (let i = -20; i <= 20; i++) {
      pts.push(i, 0, -30, i, 0, 10);
      pts.push(-20, 0, i * 1.0 - 10, 20, 0, i * 1.0 - 10);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(pts, 3));
    return g;
  }, []);
  return (
    <lineSegments geometry={geo} position={[0, -2.6, 0]}>
      <lineBasicMaterial color="#1d2f7a" transparent opacity={0.7} toneMapped={false} />
    </lineSegments>
  );
}

// ---------------------------------------------------------------------------------------------
// the lens

const ENGRAVING = "MACHINE VIEW · ƒ/1.4 · YOLOv8s + QWEN3-VL-2B · TIER-1 25.2 ms · ";

/** Text set round the retaining ring, drawn once into a canvas texture (crisper and far cheaper than glyph meshes). */
function Engraving() {
  const tex = useMemo(() => {
    const c = document.createElement("canvas");
    c.width = c.height = 1024;
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 4;
    return t;
  }, []);
  useEffect(() => {
    const draw = () => {
      const c = tex.image as HTMLCanvasElement;
      const ctx = c.getContext("2d")!;
      const family = getComputedStyle(document.body).getPropertyValue("--font-jetbrains").trim() || "monospace";
      ctx.clearRect(0, 0, 1024, 1024);
      ctx.translate(512, 512);
      ctx.fillStyle = "#c9c3b6";
      ctx.font = `500 26px ${family}`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      const chars = [...ENGRAVING];
      const r = 512 * 0.955;
      chars.forEach((ch, i) => {
        ctx.save();
        ctx.rotate((i / chars.length) * Math.PI * 2);
        ctx.translate(0, -r);
        ctx.fillText(ch, 0, 0);
        ctx.restore();
      });
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      tex.needsUpdate = true;
    };
    draw();
    document.fonts?.ready.then(draw);
    return () => tex.dispose();
  }, [tex]);
  return (
    <mesh position={[0, 0, 0.128]}>
      <planeGeometry args={[LENS_R * 2.12, LENS_R * 2.12]} />
      <meshBasicMaterial map={tex} transparent depthWrite={false} toneMapped={false} />
    </mesh>
  );
}

/** The lens itself: ground glass refracting `buffer`, a machined barrel, bevel and engraved ring. */
export function LensBody({ buffer }: { buffer: THREE.Texture }) {
  return (
    <>
    {/* the glass: a flattened sphere reads as a ground biconvex element */}
    <mesh scale={[LENS_R, LENS_R, LENS_R * 0.22]}>
      <sphereGeometry args={[1, 96, 48]} />
      <MeshTransmissionMaterial
        buffer={buffer}
        resolution={32}
        samples={6}
        // optically flat: no refraction and no colour split, so the machine view lands exactly on the
        // human view and the name never appears to move under the glass; the rim and reflections sell the lens
        thickness={0}
        ior={1}
        chromaticAberration={0}
        anisotropicBlur={0}
        distortion={0}
        distortionScale={0}
        temporalDistortion={0}
        roughness={0}
        clearcoat={1}
        attenuationColor="#ffffff"
        color="#ffffff"
      />
    </mesh>
    {/* machined barrel and its bevel */}
    <mesh rotation={[Math.PI / 2, 0, 0]}>
      <cylinderGeometry args={[LENS_R * 1.06, LENS_R * 1.06, 0.26, 128, 1, true]} />
      <meshStandardMaterial color="#9a958b" metalness={1} roughness={0.32} side={THREE.DoubleSide} />
    </mesh>
    <mesh position={[0, 0, 0.13]}>
      <torusGeometry args={[LENS_R * 1.06, 0.035, 16, 128]} />
      <meshStandardMaterial color="#d8d3c8" metalness={1} roughness={0.18} />
    </mesh>
    <mesh position={[0, 0, 0.12]}>
      <ringGeometry args={[LENS_R * 0.985, LENS_R * 1.06, 128]} />
      <meshStandardMaterial color="#1a1a18" metalness={0.6} roughness={0.45} />
    </mesh>
    {/* engraving on the retaining ring */}
    <Engraving />
    <mesh position={[0, -LENS_R * 1.022, 0.126]}>
      <circleGeometry args={[0.022, 16]} />
      <meshBasicMaterial color={SIGNAL} toneMapped={false} />
    </mesh>
    </>
  );
}

function Lens({ buffer, state }: { buffer: THREE.Texture; state: MutableRefObject<HeroState> }) {
  const group = useRef<THREE.Group>(null);
  const { viewport, camera, size } = useThree();
  const lastMove = useRef(0);
  const touch = useRef(false);
  // the canvas lets pointer events through to the name beneath it, so the lens reads the window instead
  const pointer = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      lastMove.current = performance.now();
      touch.current = e.pointerType === "touch";
      pointer.current.x = (e.clientX / window.innerWidth) * 2 - 1;
      pointer.current.y = -(e.clientY / window.innerHeight) * 2 + 1;
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, []);

  useFrame((s, delta) => {
    const g = group.current;
    if (!g) return;
    const { scroll, lens } = state.current;
    const vp = viewport.getCurrentViewport(camera, AT_LENS);
    // where the pointer is, at the lens's depth; idle or touch → a slow figure-eight
    if (state.current.still) {
      g.position.set(vp.width * 0.22, -vp.height * 0.08, LENS_Z);
      g.scale.setScalar(size.width < 640 ? 0.6 : 1);
      return;
    }
    const idle = touch.current || performance.now() - lastMove.current > 3500;
    const t = s.clock.elapsedTime;
    // idle, it drifts over the name wherever the layout put it
    const n = state.current.name;
    const cx = n ? ((n.x + n.w / 2) / size.width - 0.5) * vp.width : 0;
    const cy = n ? -((n.y + n.h / 2) / size.height - 0.5) * vp.height : 0;
    const narrow = size.width < 640;
    let tx = idle ? cx + Math.sin(t * 0.35) * vp.width * (narrow ? 0.18 : 0.22) : (pointer.current.x * vp.width) / 2;
    let ty = idle ? cy + Math.sin(t * 0.7) * vp.height * 0.1 : (pointer.current.y * vp.height) / 2;
    // scrolling pulls the lens to the centre and up to the camera, until it fills the frame
    const pull = THREE.MathUtils.smootherstep(scroll, 0.05, 0.75);
    tx *= 1 - pull;
    ty *= 1 - pull;
    const tz = LENS_Z + pull * (CAM_Z - LENS_Z - 0.55);
    // the intro drops it in from above
    const drop = 1 - lens;
    g.position.x = THREE.MathUtils.damp(g.position.x, tx, 5, delta);
    g.position.y = THREE.MathUtils.damp(g.position.y, ty + drop * vp.height, lens < 1 ? 7 : 5, delta);
    g.position.z = THREE.MathUtils.damp(g.position.z, tz, 8, delta);
    // it tilts toward where it's heading, like a held object
    g.rotation.y = THREE.MathUtils.damp(g.rotation.y, (tx - g.position.x) * 0.35, 6, delta);
    g.rotation.x = THREE.MathUtils.damp(g.rotation.x, -(ty - g.position.y) * 0.35, 6, delta);
    g.rotation.z += delta * 0.05;
    g.scale.setScalar(Math.max(0.0001, lens) * (size.width < 640 ? 0.6 : 1));
  });

  return (
    <group ref={group} position={[0, 6, LENS_Z]}>
      <LensBody buffer={buffer} />
    </group>
  );
}

// ---------------------------------------------------------------------------------------------

function Scene({ state }: { state: MutableRefObject<HeroState> }) {
  const { size } = useThree();
  // shrink the composition on narrow screens so the name and objects stay in frame
  const scale = Math.min(1, Math.max(0.42, size.width / size.height / 1.75));
  const machine = useMemo(() => {
    const s = new THREE.Scene();
    s.background = new THREE.Color(MACHINE_BG);
    return s;
  }, []);
  const fbo = useFBO();

  // the machine view is rendered first, into the buffer the lens refracts
  useFrame(({ gl, camera }) => {
    const tone = gl.toneMapping;
    gl.toneMapping = THREE.NoToneMapping;
    gl.setRenderTarget(fbo);
    gl.render(machine, camera);
    gl.setRenderTarget(null);
    gl.toneMapping = tone;
  });

  return (
    <>
      <fog attach="fog" args={["#0c0c0b", 10, 19]} />
      <ambientLight intensity={0.25} />
      <directionalLight position={[4, 6, 6]} intensity={1.4} />
      <directionalLight position={[-6, 1, -4]} intensity={0.9} color="#ffb08f" />
      <Environment resolution={256}>
        <Lightformer form="rect" intensity={3} position={[0, 4, 4]} scale={[10, 2, 1]} />
        <Lightformer form="rect" intensity={2} color="#ffb08f" position={[-6, 0, 2]} rotation={[0, Math.PI / 2, 0]} scale={[6, 2, 1]} />
        <Lightformer form="ring" intensity={4} position={[5, 2, 3]} scale={2} />
      </Environment>

      <World look="human" scale={scale} state={state} />
      <Lens buffer={fbo.texture} state={state} />

      {createPortal(
        <>
          <ambientLight intensity={1} />
          <MachineGrid />
          <World look="machine" scale={scale} state={state} />
        </>,
        machine
      )}
    </>
  );
}

/** Mounts only once everything above it in the Suspense boundary (fonts, glyphs) has resolved. */
function Ready({ onReady }: { onReady?: () => void }) {
  useEffect(() => {
    // give the first frames a moment to compile shaders before the intro starts
    const id = setTimeout(() => onReady?.(), 120);
    return () => clearTimeout(id);
  }, [onReady]);
  return null;
}

export default function LensScene({ state, active = true, onReady }: { state: MutableRefObject<HeroState>; active?: boolean; onReady?: () => void }) {
  return (
    <Canvas
      frameloop={active ? "always" : "never"}
      dpr={[1, 1.75]}
      gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
      camera={{ position: [0, 0, CAM_Z], fov: 32 }}
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
