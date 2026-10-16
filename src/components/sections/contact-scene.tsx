"use client";

import { Suspense, useMemo, useRef } from "react";
import * as THREE from "three";
import { Canvas, createPortal, useFrame, useThree } from "@react-three/fiber";
import { Environment, Lightformer, RoundedBox, Text, useFBO } from "@react-three/drei";
import { BoxLines, Drift, FONT_MONO, LensBody, MACHINE_BG, MachineGrid, SIGNAL, Tag, makeDepthMaterial } from "@/components/hero/lens-scene";

/**
 * The hero's lens, set down at the end of the page. It hovers over the thing it's here to read: an
 * envelope and an "@". Outside the glass they're ivory objects; through it, the machine view classifies
 * them. It follows the pointer across this canvas and drifts on its own when left alone.
 */

const CAM_Z = 9.5;
const LENS_Z = 1.6;

type Look = "human" | "machine";

function Envelope({ look }: { look: Look }) {
  const mats = useMemo(() => {
    if (look === "machine") {
      const d = makeDepthMaterial();
      d.uniforms.uNear.value = 4;
      d.uniforms.uFar.value = 9;
      return { paper: d, flap: d, stamp: d };
    }
    return {
      paper: new THREE.MeshStandardMaterial({ color: "#e6e0d2", roughness: 0.55 }),
      flap: new THREE.MeshStandardMaterial({ color: "#d7d0c0", roughness: 0.6, side: THREE.DoubleSide }),
      stamp: new THREE.MeshStandardMaterial({ color: SIGNAL, roughness: 0.45 }),
    };
  }, [look]);
  // the flap: a triangle folded down over the front
  const flap = useMemo(() => {
    const s = new THREE.Shape();
    s.moveTo(-1.05, 0.66);
    s.lineTo(1.05, 0.66);
    s.lineTo(0, -0.12);
    s.closePath();
    return new THREE.ShapeGeometry(s);
  }, []);
  return (
    <group>
      <RoundedBox args={[2.1, 1.32, 0.12]} radius={0.05} smoothness={3} material={mats.paper} />
      <mesh geometry={flap} material={mats.flap} position={[0, 0, 0.065]} />
      <mesh position={[0.78, 0.42, 0.07]} material={mats.stamp}>
        <boxGeometry args={[0.3, 0.32, 0.02]} />
      </mesh>
    </group>
  );
}

function At({ look }: { look: Look }) {
  return (
    <Text font={FONT_MONO} fontSize={1.4} anchorX="center" anchorY="middle" color={look === "machine" ? "#8a4dff" : "#efece4"}>
      @
    </Text>
  );
}

function World({ look }: { look: Look }) {
  const machine = look === "machine";
  return (
    <>
      <Drift phase={0.4}>
        <group position={[-0.35, 0.05, 0]} rotation={[0.18, -0.38, 0.06]}>
          <Envelope look={look} />
          {machine ? (
            <>
              <BoxLines size={[2.3, 1.5, 0.3]} />
              <Tag text="email 0.99" position={[-1.15, 0.77, 0.15]} scale={1.3} />
            </>
          ) : null}
        </group>
      </Drift>
      <Drift phase={2.1}>
        <group position={[1.3, 1.0, -0.8]} rotation={[0, -0.3, 0.1]}>
          <At look={look} />
          {machine ? (
            <>
              <BoxLines size={[1.05, 1.25, 0.1]} />
              <Tag text="at_sign 0.97" position={[-0.52, 0.64, 0]} scale={1.2} />
            </>
          ) : null}
        </group>
      </Drift>
    </>
  );
}

function Lens({ buffer }: { buffer: THREE.Texture }) {
  const g = useRef<THREE.Group>(null);
  const { viewport, camera } = useThree();
  const at = useMemo(() => new THREE.Vector3(0, 0, LENS_Z), []);
  const last = useRef(0);
  const reduce = useMemo(() => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches, []);
  useFrame((s, delta) => {
    const grp = g.current;
    if (!grp) return;
    const vp = viewport.getCurrentViewport(camera, at);
    if (s.pointer.x !== 0 || s.pointer.y !== 0) last.current = s.clock.elapsedTime;
    const idle = reduce || s.clock.elapsedTime - last.current > 2.5;
    const t = s.clock.elapsedTime;
    const tx = reduce ? 0.2 : idle ? 0.1 + Math.sin(t * 0.45) * vp.width * 0.2 : (s.pointer.x * vp.width) / 2;
    const ty = reduce ? 0.3 : idle ? 0.3 + Math.sin(t * 0.9) * vp.height * 0.1 : (s.pointer.y * vp.height) / 2;
    grp.position.x = THREE.MathUtils.damp(grp.position.x, tx, 5, delta);
    grp.position.y = THREE.MathUtils.damp(grp.position.y, ty, 5, delta);
    grp.rotation.y = THREE.MathUtils.damp(grp.rotation.y, (tx - grp.position.x) * 0.4 - 0.25, 6, delta);
    grp.rotation.x = THREE.MathUtils.damp(grp.rotation.x, -(ty - grp.position.y) * 0.4 + 0.12, 6, delta);
  });
  return (
    <group ref={g} position={[-0.3, 0.2, LENS_Z]} scale={0.6}>
      <LensBody buffer={buffer} />
    </group>
  );
}

function Scene() {
  const machine = useMemo(() => {
    const s = new THREE.Scene();
    s.background = new THREE.Color(MACHINE_BG);
    return s;
  }, []);
  const fbo = useFBO();
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
      <ambientLight intensity={0.3} />
      <directionalLight position={[4, 6, 6]} intensity={1.4} />
      <directionalLight position={[-6, 1, -4]} intensity={0.9} color="#ffb08f" />
      <Environment resolution={256}>
        <Lightformer form="rect" intensity={3} position={[0, 4, 4]} scale={[10, 2, 1]} />
        <Lightformer form="rect" intensity={2} color="#ffb08f" position={[-6, 0, 2]} rotation={[0, Math.PI / 2, 0]} scale={[6, 2, 1]} />
        <Lightformer form="ring" intensity={4} position={[5, 2, 3]} scale={2} />
      </Environment>
      <World look="human" />
      <Lens buffer={fbo.texture} />
      {createPortal(
        <>
          <ambientLight intensity={1} />
          <group position={[0, -0.6, 0]}>
            <MachineGrid />
          </group>
          <World look="machine" />
        </>,
        machine
      )}
    </>
  );
}

export default function ContactScene({ active = true }: { active?: boolean }) {
  return (
    <Canvas
      frameloop={active ? "always" : "never"}
      dpr={[1, 1.75]}
      gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
      camera={{ position: [0, 0, CAM_Z], fov: 32 }}
      aria-hidden
    >
      <Suspense fallback={null}>
        <Scene />
      </Suspense>
    </Canvas>
  );
}
