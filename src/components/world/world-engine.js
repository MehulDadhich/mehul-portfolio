/**
 * The continuous shot: one three.js world and one camera flight, driven by scroll.
 * Lift-off from the RoadGuard road → the model foundry (Work) → the control room (Experience)
 * → layers of a network (Skills) → a night road (Journey) → the desk with the lens (Contact).
 *
 * Ported from the approved Direction A demo. Plain JS on purpose: the scene is imperative three.js,
 * built once and mutated per frame. `mountWorld` returns a cleanup function, or null without WebGL.
 */
import * as THREE from "three";
import { STATIONS, pathAt } from "./world-stations";

const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const ss = (a, b, x) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };
const lerp = (a, b, t) => a + (b - a) * t;
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");
const ix = (i) => String(i).padStart(2, "0");

/**
 * @param {{shot: HTMLElement, stage: HTMLElement, canvas: HTMLCanvasElement, capL: HTMLElement, capR: HTMLElement}} el
 * @param {any} D content, shaped by world.tsx from src/lib/content.ts
 * @param {{mono: string, serif: string}} fonts the page's loaded font stacks
 */
export function mountWorld(el, D, fonts) {
  const { shot, stage, canvas: cv, capL, capR } = el;
  const { PROJ, MET, EXP, GROUPS, LAYERS, JOURNEY, PROFILE, CERTS } = D;
  const RM = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const MONO = fonts.mono, SERIF = fonts.serif;
  let seed = 7;
  const rnd = () => { seed |= 0; seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };

  let R;
  try { R = new THREE.WebGLRenderer({ canvas: cv, antialias: true, powerPreference: "high-performance" }); }
  catch { return null; }

  const disposables = [];
  const keep = (x) => { disposables.push(x); return x; };

  const S = new THREE.Scene();
  const BGC = 0x05070f; S.background = new THREE.Color(BGC); S.fog = new THREE.Fog(BGC, 12, 52);
  const cam = new THREE.PerspectiveCamera(50, 1, 0.1, 72);
  const U = { fN: { value: 12 }, fF: { value: 52 } };

  // the machine view: colour by distance from the camera (amber → vermilion → violet → deep blue)
  const VS = `uniform float ps;varying float vD;varying vec3 vN;
void main(){vec4 mv=modelViewMatrix*vec4(position,1.);vD=-mv.z;vN=normalize(normalMatrix*normal+vec3(0.,0.,1e-5));gl_Position=projectionMatrix*mv;gl_PointSize=ps*30./max(vD,.5);}`;
  const RAMP = `uniform float n,f,o,fN,fF;varying float vD;varying vec3 vN;
vec3 ramp(float t){vec3 a=vec3(1.,.753,.38),b=vec3(1.,.357,.18),c=vec3(.541,.302,1.),d=vec3(.114,.184,.478);
if(t<.33)return mix(a,b,t/.33);if(t<.66)return mix(b,c,(t-.33)/.33);return mix(c,d,(t-.66)/.34);}
const vec3 BG=vec3(.0196,.0275,.0588);`;
  const FSM = RAMP + `void main(){float t=clamp((vD-n)/(f-n),0.,1.);vec3 c=ramp(t)*(.3+.7*pow(abs(vN.z),.7));float g=smoothstep(fN,fF,vD);gl_FragColor=vec4(mix(c,BG,g),o);}`;
  const FSP = RAMP + `void main(){if(length(gl_PointCoord-.5)>.5)discard;float t=clamp((vD-n)/(f-n),0.,1.);float g=smoothstep(fN,fF,vD);gl_FragColor=vec4(ramp(t),o*(1.-g));}`;
  const PS = { value: 1.2 };
  const dm = (n, f, o = 1, pts = false) => keep(new THREE.ShaderMaterial({ uniforms: { n: { value: n }, f: { value: f }, o: { value: o }, ps: PS, fN: U.fN, fF: U.fF }, vertexShader: VS, fragmentShader: pts ? FSP : FSM, transparent: o < 1 || pts, depthWrite: o >= 1 && !pts, side: THREE.DoubleSide }));
  const lm = (c, o = 1) => keep(new THREE.LineBasicMaterial({ color: c, transparent: true, opacity: o, fog: true, depthWrite: false }));
  const gP = (a) => { const g = keep(new THREE.BufferGeometry()); g.setAttribute("position", new THREE.Float32BufferAttribute(a, 3)); return g; };
  const edges = (geo, m) => new THREE.LineSegments(keep(new THREE.EdgesGeometry(geo)), m);
  const cloud = (n, fn) => { const a = []; for (let i = 0; i < n; i++) a.push(...fn(i)); return gP(a); };

  const mk = (w, h) => { const c = document.createElement("canvas"); c.width = w; c.height = h; return [c, c.getContext("2d")]; };
  const tx = (c) => { const t = keep(new THREE.CanvasTexture(c)); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t; };
  const MX = mk(8, 8)[1];
  function chip(text, { px = 26, font = MONO, w = 500, it = "", fg = "#0c0c0b", bg = "#ff5b2e", h = 0.22, cx = 0, cy = 0 } = {}) {
    const f = `${it}${w} ${px}px ${font}`; MX.font = f; const pad = bg ? px * 0.5 : 4;
    const [c, x] = mk(Math.ceil(MX.measureText(text).width + pad * 2), Math.ceil(px * 1.6));
    if (bg) { x.fillStyle = bg; x.fillRect(0, 0, c.width, c.height); }
    x.font = f; x.fillStyle = fg; x.textBaseline = "middle"; x.fillText(text, pad, c.height / 2 + 1);
    const s = new THREE.Sprite(keep(new THREE.SpriteMaterial({ map: tx(c), transparent: true, depthWrite: false, fog: true })));
    s.scale.set((h * c.width) / c.height, h, 1); s.center.set(cx, cy); return s;
  }
  const GLOW = (() => { const [c, x] = mk(64, 64); const g = x.createRadialGradient(32, 32, 0, 32, 32, 32); g.addColorStop(0, "#fff"); g.addColorStop(0.25, "#ffffff88"); g.addColorStop(1, "#fff0"); x.fillStyle = g; x.fillRect(0, 0, 64, 64); return tx(c); })();
  const glow = (col, s) => { const m = new THREE.Sprite(keep(new THREE.SpriteMaterial({ map: GLOW, color: col, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: true }))); m.scale.setScalar(s); return m; };

  /* ---------- 1. Lift-off: the RoadGuard road, incident logged ---------- */
  const RG = new THREE.Group(); S.add(RG);
  { const a = []; for (const x of [-4, 4]) a.push(x, 0, 15, x, 0, -20); for (const x of [-2, 0, 2]) for (let z = 15; z > -20; z -= 2.4) a.push(x, 0, z, x, 0, z - 1.2); RG.add(new THREE.LineSegments(gP(a), lm(0xa39f94, 0.32))); }
  RG.add(new THREE.Points(cloud(3200, () => { const x = (rnd() * 2 - 1) * 18, z = 15 - rnd() * 36; return [x, Math.abs(x) > 4.2 ? rnd() * 0.25 * Math.min(1, (Math.abs(x) - 4) / 6) : 0, z]; }), dm(3, 30, 0.85, true)));
  const DIM = { car: [0.9, 0.6, 1.8], truck: [1.1, 1.15, 3.2], bus: [1.1, 1.15, 3.6], motorcycle: [0.35, 0.7, 1] };
  const CARS = [[-3, 6, 0.9, "car", 3], [-1, -2, 0.7, "truck", 7], [1, 2, 0.8, "car", 12], [3, 4.5, 1.1, "car", 14], [-1, 9, 1, "motorcycle", 21], [3, -6, 0.6, "bus", 5], [-3, -4, 0.85, "car", 9]].map(([x, z0, sp, cl, id]) => {
    const [w, h, l] = DIM[cl], g = new THREE.Group(); g.position.set(x, 0, z0);
    const bg = keep(new THREE.BoxGeometry(w, h, l)); bg.translate(0, h / 2, 0);
    const mesh = new THREE.Mesh(bg, dm(4, 28)); g.add(mesh); g.add(edges(bg, lm(0xefece4, 0.18)));
    const dg = keep(new THREE.BoxGeometry(w * 1.12, h * 1.12, l * 1.06)); dg.translate(0, h * 0.56, 0);
    const det = edges(dg, lm(0xff5b2e, 1)); g.add(det);
    const t2 = chip(`#${id} ${cl}`); t2.position.set(-w * 0.56, h * 1.12 + 0.02, l * 0.53); g.add(t2);
    RG.add(g); return { g, mesh, det, t2, x, z0, sp };
  });
  const evBox = edges(keep(new THREE.BoxGeometry(1, 1, 1)), lm(0xff5b2e, 1)); RG.add(evBox);
  const evT = [chip("TIER 1 · overlap + speed_drop · 0.64"), chip("VLM · accident? → yes · 0.47 s"), chip("INCIDENT LOGGED · snapshot → webhook / SMS", { bg: "#efece4" })];
  evT.forEach((t) => RG.add(t));
  {
    // the road is frozen at the end of the RoadGuard chapter: the crash happened, the incident is logged
    const l = 1;
    CARS.forEach((c, i) => {
      const ev = i === 2 || i === 3, ll = ev ? 0.6 : l;
      c.g.position.z = c.z0 - c.sp * ll * 10;
      if (i === 3) { c.g.position.x = 3 - 1.3; c.g.rotation.y = 0.38; }
      if (i === 2) c.g.rotation.y = -0.14;
      c.det.visible = !ev; c.t2.visible = !ev;
    });
    RG.updateMatrixWorld();
    const bx = new THREE.Box3().setFromObject(CARS[2].mesh), bx2 = new THREE.Box3().setFromObject(CARS[3].mesh); bx.union(bx2);
    const v3 = new THREE.Vector3(); bx.getCenter(evBox.position); bx.getSize(v3); evBox.scale.copy(v3).multiplyScalar(1.1);
    evT.forEach((t, i) => t.position.set(bx.min.x - 0.05, bx.max.y + 0.08 + i * 0.3, bx.max.z + 0.05));
  }

  /* ---------- 2. Work · the model foundry ---------- */
  const FD = new THREE.Group(); FD.position.set(0, 6, -40); S.add(FD);
  { const a = []; for (const x of [-1.9, 1.9]) for (const z of [-0.95, 0.95]) a.push(x, -3.4, z, x, 3.2, z); for (const y of [-3.4, 3.2]) a.push(-1.9, y, 0.95, 1.9, y, 0.95, -1.9, y, -0.95, 1.9, y, -0.95); FD.add(new THREE.LineSegments(gP(a), lm(0xa39f94, 0.45))); }
  FD.add(new THREE.Points(cloud(900, () => [(rnd() * 2 - 1) * 9, -6 + rnd() * 0.1, (rnd() * 2 - 1) * 9]), dm(4, 24, 0.7, true)));
  const CARTS = PROJ.map((p, i) => {
    const g = new THREE.Group(); g.position.y = 2.6 - i * 0.86; FD.add(g);
    const geo = keep(new THREE.BoxGeometry(3.4, 0.5, 1.8)); g.add(new THREE.Mesh(geo, dm(3, 22, 0.26))); g.add(edges(geo, lm(0xefece4, 0.4)));
    const [c, x] = mk(768, 96); x.font = `500 26px ${MONO}`; x.fillStyle = "#a39f94"; x.textBaseline = "middle"; x.fillText(ix(i + 1), 8, 50);
    x.font = `italic 400 52px ${SERIF}`; x.fillStyle = "#efece4"; x.fillText(p.t, 70, 50, 690);
    const lab = new THREE.Mesh(keep(new THREE.PlaneGeometry(3.1, 0.39)), keep(new THREE.MeshBasicMaterial({ map: tx(c), transparent: true, depthWrite: false }))); lab.position.z = 0.91; g.add(lab);
    const gl = new THREE.Line(gP([-1.7, -0.25, 0.91, 1.7, -0.25, 0.91]), lm(0xffc061, 0)); g.add(gl);
    const sg = new THREE.Group(); g.add(sg); const n = p.st.length, pts = [];
    const sphere = keep(new THREE.SphereGeometry(0.055, 12, 8));
    const nodes = p.st.map((s, j) => {
      const xx = -1.45 + (2.9 * j) / (n - 1); pts.push(xx, 0.33, 0.7);
      const m = new THREE.Mesh(sphere, keep(new THREE.MeshBasicMaterial({ color: 0xffc061 }))); m.position.set(xx, 0.33, 0.7); sg.add(m);
      m.add(glow(0xffc061, 0.34));
      const lb = chip(s, { bg: null, fg: "#efece4", px: 24, h: 0.12, cx: 0.5, cy: 0 }); lb.position.set(xx, j % 2 ? 0.62 : 0.45, 0.7); sg.add(lb); return { m, lb };
    });
    const ln = new THREE.Line(gP(pts), lm(0xffc061, 0.6)); sg.add(ln);
    const pulse = glow(0xffc061, 0.5); sg.add(pulse);
    return { g, gl, sg, nodes, ln, pulse, pts };
  });
  let workI = 0;
  function upWork(w, T) {
    const wf = clamp(w) * PROJ.length; workI = clamp(Math.floor(wf), 0, PROJ.length - 1);
    CARTS.forEach((c, i) => {
      const f = wf - i, o = i === PROJ.length - 1 ? ss(0, 0.25, f) : ss(0, 0.25, f) * (1 - ss(0.85, 1, f));
      c.g.position.z = o * 2.4; c.gl.material.opacity = o; c.sg.visible = o > 0.45;
      c.nodes.forEach((nd, j) => { const k = ss(0.22 + j * 0.06, 0.32 + j * 0.06, f) * o; nd.m.scale.setScalar(Math.max(k, 0.001)); nd.lb.material.opacity = k; });
      c.ln.material.opacity = 0.6 * o;
      const q = RM ? 0.5 : (T * 0.35 + i * 0.13) % 1, np = c.pts.length / 3 - 1, s = q * np, a = Math.floor(s), b = Math.min(np, a + 1), t = s - a;
      c.pulse.position.set(lerp(c.pts[a * 3], c.pts[b * 3], t), 0.33, 0.7);
    });
  }

  /* ---------- 3. Experience · the control room ---------- */
  const EX = new THREE.Group(); EX.position.set(0, 3, -70); S.add(EX);
  const NZ = (() => { const [c, x] = mk(512, 288); const d = x.createImageData(512, 288); for (let i = 0; i < d.data.length; i += 4) { const v = (rnd() * 120) | 0; d.data[i] = v * 0.7; d.data[i + 1] = v * 0.75; d.data[i + 2] = v; d.data[i + 3] = 255; } x.putImageData(d, 0, 0); return c; })();
  const MK = [3, 1, 2, 1, 0, 1, 0, 2, 3];
  const monGeo = keep(new THREE.PlaneGeometry(2.7, 1.52)), bezGeo = keep(new THREE.PlaneGeometry(2.78, 1.6));
  const MONS = MK.map((k, i) => {
    const top = i < 5, a = top ? (i - 2) * 0.32 : (i - 6.5) * 0.32, r = 9.5;
    const [c, x] = mk(256, 144); const tex = tx(c);
    const m = new THREE.Mesh(monGeo, keep(new THREE.MeshBasicMaterial({ map: tex, toneMapped: false })));
    m.position.set(r * Math.sin(a), top ? 0.95 : -0.8, -r * Math.cos(a)); m.rotation.y = -a; EX.add(m);
    const b = edges(bezGeo, lm(0xa39f94, 0.5)); b.position.copy(m.position); b.rotation.copy(m.rotation); EX.add(b);
    return { k, x, tex, i, sd: rnd() };
  });
  { const a = []; for (let i = 0; i <= 40; i++) { const t = -1 + i / 20; a.push(9.2 * Math.sin(t), -1.85, -9.2 * Math.cos(t)); } EX.add(new THREE.Line(gP(a), lm(0xa39f94, 0.4))); }
  EX.add(new THREE.Points(cloud(700, () => { const t = rnd() * Math.PI * 2, r = 2 + rnd() * 10; return [Math.sin(t) * r, -3, -Math.cos(t) * r]; }), dm(3, 18, 0.6, true)));
  function drawMon(M, T) {
    const x = M.x, W = 256, H = 144; x.fillStyle = "#070a12"; x.fillRect(0, 0, W, H);
    if (M.k === 0) { x.globalAlpha = 0.6; x.drawImage(NZ, (rnd() * 256) | 0, (rnd() * 144) | 0, W, H, 0, 0, W, H); x.globalAlpha = 1; x.fillStyle = "#a39f94"; x.font = `500 11px ${MONO}`; x.fillText("RTSP · RECONNECTING", 62, 76); }
    else if (M.k === 3) {
      x.strokeStyle = "#2a2925"; x.lineWidth = 1; for (let y = 30; y < H; y += 24) { x.beginPath(); x.moveTo(0, y); x.lineTo(W, y); x.stroke(); }
      x.strokeStyle = "#ffc061"; x.lineWidth = 1.5; x.beginPath(); for (let i = 0; i <= 64; i++) { const u = i / 64, v = Math.sin(u * 14 + T * 2 + M.sd * 9) * 0.5 + Math.sin(u * 31 - T * 3) * 0.25; x.lineTo(u * W, 92 - v * 30); } x.stroke();
    } else {
      x.strokeStyle = "#2a2925"; x.lineWidth = 1; for (const e of [-1.2, -0.4, 0.4, 1.2]) { x.beginPath(); x.moveTo(128 + e * 14, 26); x.lineTo(128 + e * 120, H); x.stroke(); }
      for (let j = 0; j < 4; j++) {
        const u = (T * 0.12 + j * 0.27 + M.sd) % 1, y = 30 + u * 95, s = 8 + u * 34, cx = 128 + (j - 1.5) * (10 + u * 60);
        x.strokeStyle = "#ff5b2e"; x.lineWidth = 1.5; x.strokeRect(cx - s / 2, y - s * 0.6, s, s * 0.6); x.fillStyle = "#ff5b2e"; x.fillRect(cx - s / 2, y - s * 0.6 - 7, Math.max(14, s * 0.6), 7);
      }
      if (M.k === 2) { const ph = (T * 0.22 + M.sd) % 1; if (ph < 0.2) { x.strokeStyle = "#ff5b2e"; x.lineWidth = 6; x.strokeRect(3, 3, W - 6, H - 6); x.fillStyle = "#ff5b2e"; x.fillRect(8, H - 30, 104, 20); x.fillStyle = "#0c0c0b"; x.font = `500 12px ${MONO}`; x.fillText("INCIDENT", 16, H - 16); } }
    }
    x.fillStyle = "#a39f94"; x.font = `500 10px ${MONO}`; x.fillText("CAM " + ix(M.i + 1), 8, 16);
    M.tex.needsUpdate = true;
  }

  /* ---------- 4. Skills · layers of a network ---------- */
  // Each layer is its own group, kept centred on the camera's line of sight and scaled with its distance, so it
  // holds one size on screen that always fits the viewport (nothing runs off the edges as the camera closes in).
  // Only the current layer shows; it fades just before the camera passes through and the next one takes over. Threads run from the skills of the area
  // being passed to the projects that used them, recomputed each frame so they follow the moving layer.
  const SK = new THREE.Group(); S.add(SK);
  const LZ = [-108, -116, -124, -132], PZ = -144, LCY = 3.6;
  const TAN = Math.tan(THREE.MathUtils.degToRad(cam.fov / 2)), fwd = new THREE.Vector3();
  const PN = {}, PNODES = {};
  const nodeGeo = keep(new THREE.SphereGeometry(0.08, 12, 8)), projGeo = keep(new THREE.SphereGeometry(0.16, 16, 12));
  PROJ.forEach((p, i) => {
    const a = (i / PROJ.length) * Math.PI * 2 + 0.3, pos = new THREE.Vector3(Math.cos(a) * 3.4, 2.4 + Math.sin(a) * 2.6, PZ);
    const m = new THREE.Mesh(projGeo, keep(new THREE.MeshBasicMaterial({ color: 0xefece4 }))); m.position.copy(pos); SK.add(m);
    const halo = glow(0xff5b2e, 0.9); m.add(halo);
    const lb = chip(p.t, { font: SERIF, it: "italic ", w: 400, px: 44, bg: null, fg: "#efece4", h: 0.34, cx: 0.5, cy: -0.5 }); lb.position.copy(pos); SK.add(lb);
    PN[p.id] = pos; PNODES[p.id] = { m, halo, lb };
  });
  const tmp = new THREE.Vector3();
  const SL = LAYERS.map((ids, li) => {
    const z = LZ[li], ng = ids.length, grp = [];
    const LG = new THREE.Group(); LG.position.set(0, LCY, z); SK.add(LG); // layer-local origin: its centre
    // each area is a block: its title, then its skills in two columns sized to the longest name in each
    ids.forEach((gid, gi) => {
      const [label, sk] = GROUPS[gid];
      const labs = [], nodes = [], beads = [], links = [], uses = new Set();
      sk.forEach(([nm, used]) => {
        const m = new THREE.Mesh(nodeGeo, dm(2, 22)); LG.add(m); nodes.push(m);
        const bead = glow(0xffc061, 0.3); LG.add(bead); beads.push(bead);
        const lb = chip(nm, { bg: null, fg: "#efece4", px: 36, h: 0.27, cx: 0, cy: 0.5 }); LG.add(lb); labs.push(lb);
        used.forEach((u) => { if (PN[u]) { links.push([m, u]); uses.add(u); } });
      });
      const gl = chip(label, { font: SERIF, it: "italic ", w: 400, px: 56, bg: null, fg: "#ffc061", h: 0.5, cx: 0, cy: 0 }); LG.add(gl);
      const colW = [0, 1].map((c) => Math.max(0, ...labs.filter((_, k) => k % 2 === c).map((l) => l.scale.x)) + 0.3);
      const rows = Math.ceil(sk.length / 2), w = Math.max(gl.scale.x, colW[0] + 0.45 + colW[1]), h = 0.7 + rows * 0.62;
      const threads = new THREE.LineSegments(gP(new Array(links.length * 6).fill(0)), lm(0xff5b2e, 0)); threads.frustumCulled = false; threads.material.depthWrite = false; SK.add(threads);
      // the layer is the thing being read: no fog, and names draw over any thread that crosses them
      [gl, ...labs, ...beads].forEach((o) => { o.material.fog = false; o.material.depthTest = false; o.renderOrder = 5; o.material.opacity = 0; });
      // place the block with its top-left corner at (x, y)
      const place = (x, y) => {
        gl.position.set(x, y - 0.5, 0);
        sk.forEach((_, k) => {
          const px = x + (k % 2 ? colW[0] + 0.45 : 0), py = y - 0.95 - Math.floor(k / 2) * 0.62;
          nodes[k].position.set(px, py, 0); beads[k].position.set(px, py, 0); labs[k].position.set(px + 0.14, py, 0.02);
        });
      };
      grp.push({ label, sk, labs, nodes, beads, gl, threads, links, uses, w, h, up: ng === 4 ? gi === 1 || gi === 2 : gi === 1, place });
    });
    // two staggered rows (as before: the middle areas up, the outer ones down), each row centred
    const GAP = 1.1, VGAP = 0.5, rowsOf = [grp.filter((g) => g.up), grp.filter((g) => !g.up)];
    const rw = rowsOf.map((r) => r.reduce((a, g) => a + g.w, 0) + GAP * (r.length - 1)), rh = rowsOf.map((r) => Math.max(...r.map((g) => g.h)));
    const W = Math.max(...rw), H = rh[0] + VGAP + rh[1];
    rowsOf.forEach((r, ri) => {
      let x = -rw[ri] / 2; const y = ri === 0 ? H / 2 : H / 2 - rh[0] - VGAP;
      r.forEach((g) => { g.place(x, y); x += g.w + GAP; });
    });
    return { LG, z, grp, W, H };
  });
  let skL = 0, skG = 0;
  function upSK(camz, T, dt) {
    const k = RM ? 1 : 1 - Math.exp(-dt * 9);
    cam.getWorldDirection(fwd);
    // the current layer is the nearest one still at least 3 units ahead of the camera
    skL = SL.findIndex((L) => camz - L.z > 3); if (skL < 0) skL = SL.length - 1;
    const L = SL[skL], dist = camz - L.z;
    // which area of it the camera is passing, left to right, as it closes in
    skG = clamp(Math.floor((1 - clamp((dist - 3) / 5)) * L.grp.length), 0, L.grp.length - 1);
    SL.forEach((Ly, li) => {
      const d = camz - Ly.z;
      // anchor the layer on the line of sight at its depth, sized to fill ~84% of the width (or the band above
      // the caption, whichever is tighter); the scale shrinks with distance so the on-screen size never changes
      if (d > 0.5) {
        const t = d / Math.max(0.2, -fwd.z), vh = 2 * t * TAN, vw = vh * cam.aspect;
        const sc = Math.min((vw * 0.62) / Ly.W, (vh * 0.42) / Ly.H);
        Ly.LG.position.set(cam.position.x + fwd.x * t, cam.position.y + fwd.y * t + vh * 0.1, Ly.z);
        Ly.LG.scale.set(sc, sc, sc);
      }
      const here = li === skL, near = ss(2.2, 3.6, d) * (1 - ss(10, 14, d)); // fades in on approach, out as it's passed
      // only the current layer, plus the one fading out, is drawn: layers share the same spot on screen
      Ly.LG.visible = d > 1.2 && (here || Ly.grp[0].gl.material.opacity > 0.02);
      Ly.grp.forEach((g, gi) => {
        const o = here ? near : 0;
        g.labs.forEach((l) => (l.material.opacity = lerp(l.material.opacity, o, k)));
        g.gl.material.opacity = lerp(g.gl.material.opacity, o, k);
        g.beads.forEach((b) => (b.material.opacity = lerp(b.material.opacity, o, k)));
        g.nodes.forEach((m) => (m.visible = g.gl.material.opacity > 0.05));
        // threads for the area being passed, from where its skills are right now to their projects
        const on = here && gi === skG;
        g.threads.material.opacity = lerp(g.threads.material.opacity, on ? 0.5 * near : 0, k);
        if (g.threads.material.opacity > 0.01) {
          const arr = g.threads.geometry.attributes.position.array;
          g.links.forEach(([m, u], j) => {
            m.getWorldPosition(tmp);
            arr.set([tmp.x, tmp.y, tmp.z, PN[u].x, PN[u].y, PN[u].z], j * 6);
          });
          g.threads.geometry.attributes.position.needsUpdate = true;
        }
      });
    });
    const lit = L.grp[skG].uses;
    for (const id in PNODES) {
      const P = PNODES[id], on = lit.has(id);
      P.lb.material.opacity = lerp(P.lb.material.opacity, on ? 1 : 0.3, k);
      P.halo.scale.setScalar(lerp(P.halo.scale.x, on ? 0.95 : 0.45, k));
    }
  }

  /* ---------- 5. Journey · the night road ---------- */
  const JR = new THREE.Group(); S.add(JR);
  { const a = []; for (const x of [-2.2, 2.2]) a.push(x, 0, -146, x, 0, -202); for (let z = -146; z > -202; z -= 2.6) a.push(0, 0, z, 0, 0, z - 1.3); JR.add(new THREE.LineSegments(gP(a), lm(0xa39f94, 0.4))); }
  JR.add(new THREE.Points(cloud(2600, () => { const x = (rnd() * 2 - 1) * 20, z = -146 - rnd() * 58; return [x, Math.abs(x) > 2.6 ? rnd() * 0.4 * Math.min(1, (Math.abs(x) - 2.4) / 8) : 0, z]; }), dm(3, 30, 0.8, true)));
  const signGeo = keep(new THREE.PlaneGeometry(2.6, 1.3));
  const SIGNS = JOURNEY.map(([ph, wh, ti], i) => {
    const side = i % 2 ? 1 : -1, z = -158 - i * 6, g = new THREE.Group(); g.position.set(side * 3, 0, z); g.rotation.y = -side * 0.35; JR.add(g);
    g.add(new THREE.LineSegments(gP([0, 0, 0, 0, 1.6, 0]), lm(0xa39f94, 0.6)));
    const [c, x] = mk(512, 256); x.fillStyle = "#0d0f16"; x.fillRect(0, 0, 512, 256); x.strokeStyle = "#efece4"; x.lineWidth = 3; x.strokeRect(6, 6, 500, 244);
    x.fillStyle = "#ffc061"; x.font = `500 22px ${MONO}`; x.fillText((ph + (wh ? " · " + wh : "")).toUpperCase(), 30, 50);
    x.fillStyle = "#efece4"; x.font = `400 40px ${SERIF}`; let line = "", y = 110;
    for (const wd of ti.split(" ")) { const t = line ? line + " " + wd : wd; if (x.measureText(t).width > 450 && line) { x.fillText(line, 30, y); line = wd; y += 48; } else line = t; }
    x.fillText(line, 30, y);
    const mat = keep(new THREE.MeshBasicMaterial({ map: tx(c), color: 0x2a2a2a, transparent: true }));
    const pn = new THREE.Mesh(signGeo, mat); pn.position.y = 2.3; g.add(pn);
    const lamp = glow(0xffc061, 1.4); lamp.position.y = 3.1; lamp.material.opacity = 0; g.add(lamp);
    return { z, mat, lamp, v: 0 };
  });
  let jCur = 0;
  function upJR(camz, dt) {
    jCur = 0;
    SIGNS.forEach((s, i) => {
      const lit = camz < s.z + 11 ? 1 : 0; if (lit) jCur = i;
      s.v = RM ? lit : lerp(s.v, lit, 1 - Math.exp(-dt * 5));
      s.mat.color.setScalar(0.16 + 0.84 * s.v); s.lamp.material.opacity = s.v;
    });
  }

  /* ---------- 6. Contact · the camera looks back ---------- */
  // the CCTV camera that watched the road all along turns to face the visitor and locks on
  const CT = new THREE.Group(); CT.position.set(0, 0, -214.5); S.add(CT);
  CT.add(new THREE.Points(cloud(1400, () => { const t = rnd() * Math.PI * 2, r = 1.5 + rnd() * 12; return [Math.sin(t) * r, -1.2, Math.cos(t) * r - 2]; }), dm(2, 16, 0.75, true)));
  { // pole and wall bracket
    const pg = keep(new THREE.BoxGeometry(0.12, 3.2, 0.12)); const pole = new THREE.Mesh(pg, dm(2, 14)); pole.position.set(0, 0.2, -0.9); CT.add(pole); const pe = edges(pg, lm(0xa39f94, 0.35)); pe.position.copy(pole.position); CT.add(pe);
    const ag = keep(new THREE.BoxGeometry(0.09, 0.09, 0.7)); const arm = new THREE.Mesh(ag, dm(2, 14)); arm.position.set(0, 1.62, -0.55); CT.add(arm);
  }
  const HEAD = new THREE.Group(); HEAD.position.set(0, 1.8, 0); CT.add(HEAD);
  { // housing, hood, lens barrel; the housing's long axis points at the viewer (+z)
    const bg = keep(new THREE.BoxGeometry(0.62, 0.5, 1.35)); HEAD.add(new THREE.Mesh(bg, dm(1.5, 9))); HEAD.add(edges(bg, lm(0xefece4, 0.35)));
    const hg = keep(new THREE.BoxGeometry(0.74, 0.07, 1.55)); const hood = new THREE.Mesh(hg, dm(1.5, 9)); hood.position.set(0, 0.29, 0.06); HEAD.add(hood); const he = edges(hg, lm(0xefece4, 0.25)); he.position.copy(hood.position); HEAD.add(he);
    const lg = keep(new THREE.CylinderGeometry(0.19, 0.21, 0.16, 40)); const barrel = new THREE.Mesh(lg, keep(new THREE.MeshBasicMaterial({ color: 0x0b0d14 }))); barrel.rotation.x = Math.PI / 2; barrel.position.z = 0.75; HEAD.add(barrel);
    const re = edges(lg, lm(0xa39f94, 0.6)); re.rotation.x = Math.PI / 2; re.position.z = 0.75; HEAD.add(re);
  }
  const LENSGLOW = glow(0xff5b2e, 0.6); LENSGLOW.position.set(0, 0, 0.86); HEAD.add(LENSGLOW);
  const LENSDOT = new THREE.Mesh(keep(new THREE.CircleGeometry(0.11, 32)), keep(new THREE.MeshBasicMaterial({ color: 0xff5b2e }))); LENSDOT.position.z = 0.835; HEAD.add(LENSDOT);
  const REC = new THREE.Mesh(keep(new THREE.SphereGeometry(0.035, 12, 8)), keep(new THREE.MeshBasicMaterial({ color: 0xff5b2e }))); REC.position.set(0.22, 0.14, 0.68); HEAD.add(REC);
  { // the field of view: a faint wire cone ahead of the lens
    const cg = keep(new THREE.ConeGeometry(1.6, 4.2, 4, 1, true)); cg.rotateX(-Math.PI / 2); cg.rotateZ(Math.PI / 4); cg.translate(0, 0, 0.85 + 2.1);
    const fov = edges(cg, lm(0xff5b2e, 0.18)); HEAD.add(fov);
  }
  const recTag = chip("REC · CAM 00", { h: 0.07 }); recTag.position.set(-0.31, 0.34, 0.7); HEAD.add(recTag);
  let lockState = "";
  function upContact(p, T) {
    // sweep while the camera approaches, then turn to face the visitor and hold
    const c = ss(0.925, 0.985, p);
    HEAD.rotation.y = (RM ? 0 : Math.sin(T * 0.7) * 0.75) * (1 - c);
    HEAD.rotation.x = (RM ? 0 : Math.sin(T * 0.45) * 0.08) * (1 - c) - 0.05 * c;
    LENSGLOW.scale.setScalar(0.45 + 0.9 * c + (RM ? 0 : Math.sin(T * 3) * 0.06 * c));
    REC.visible = RM || Math.sin(T * 4) > -0.2;
    const lock = c > 0.96 ? "on" : "";
    if (lock !== lockState) { lockState = lock; stage.dataset.lock = lock; }
  }

  /* ---------- the camera path ---------- */
  const K = [[0, 7, 3, 13, 0, 0, -2], [0.1, 5, 4.6, 8.5, 0, 0, -3], [0.15, 1, 10, -14, 0, 6.5, -40], [0.18, 3.6, 7, -29, 0, 6, -40], [0.37, 2.6, 6.2, -31, 0, 6, -40], [0.4, 5.5, 7, -43, 0, 4, -62],
    [0.43, 0, 5, -58, 0, 3, -80], [0.46, 0, 3.4, -64, 0, 3, -80], [0.56, 0, 3.1, -67.5, 0, 3, -82], [0.585, 0, 6.2, -82, 0, 2.5, -108], [0.61, 0, 2.2, -100, 0, 2, -120], [0.75, 0, 2.2, -141, 0, 2, -160],
    [0.79, 0, 1.5, -152, 0, 1.2, -170], [0.9, 0, 1.5, -192, 0, 1.2, -208], [0.95, 0.6, 2.4, -205.5, 0, 1.75, -214.5], [1, 0, 1.95, -208.2, 0, 1.75, -214.5]];
  const CP = new THREE.CatmullRomCurve3(K.map((k) => new THREE.Vector3(k[1], k[2], k[3])), false, "centripetal");
  const CL = new THREE.CatmullRomCurve3(K.map((k) => new THREE.Vector3(k[4], k[5], k[6])), false, "centripetal");
  const look = new THREE.Vector3();
  const pathU = (p) => { for (let i = 0; i < K.length - 1; i++) if (p <= K[i + 1][0]) return (i + (p - K[i][0]) / (K[i + 1][0] - K[i][0])) / (K.length - 1); return 1; };
  const GRPS = [RG, FD, EX, SK, JR, CT];

  /* ---------- captions ---------- */
  function caption(si, p) {
    if (si === 0) return ["lift",
      `<div class="eb">From the road · incident logged</div><h2>The rest of the work</h2><p class="lead">One camera, one take, from here to the contact desk.</p>
      <p class="body">RoadGuard was the first system on the road. The camera lifts off and keeps rolling: six more systems, the control room at Infrax.ai, the skills behind them, the road so far, and a way to reach me.</p>`,
      `<div class="rt">RoadGuard, measured</div><ul class="rd">${MET.map((m) => `<li><b>${esc(m[0])}</b>${esc(m[1])}<small class="opt">${esc(m[2])}</small></li>`).join("")}</ul>`];
    if (si === 1) {
      const pj = PROJ[workI];
      return ["w" + workI,
        `<div class="eb">02 · Work · model foundry · ${ix(workI + 1)} / ${ix(PROJ.length)}</div><h2>${esc(pj.t)}</h2><p class="lead">${esc(pj.k)}</p><p class="body">${esc(pj.lead)}</p>
        <div class="btns"><button type="button" class="btn p" data-open="${esc(pj.id)}">Open project →</button>${pj.g ? `<a class="btn" href="${esc(pj.g)}" target="_blank" rel="noreferrer">GitHub ↗</a>` : ""}</div>`,
        `<div class="rt">Architecture</div><ol class="ol">${pj.st.map((s) => `<li class="on">${esc(s)}</li>`).join("")}</ol><div class="note opt">${esc(pj.hi)}</div>` + (pj.g ? "" : `<div class="note opt">${esc(pj.n || "")}</div>`)];
    }
    if (si === 2) {
      const e = clamp((p - 0.46) / 0.1), vi = Math.min(3, Math.floor(e * 4));
      return ["e" + vi,
        `<div class="eb">03 · Experience · ${esc(EXP.mode)}</div><h2>${esc(EXP.role)}</h2><p class="lead">${esc(EXP.company)} · ${esc(EXP.period)}</p><p class="body">${esc(EXP.system)}</p>
        <div class="chips opt">${EXP.watches.map((w) => `<span class="chip">${esc(w)}</span>`).join("")}</div>
        <div class="btns opt"><button type="button" class="btn" data-open="tmcs">TMCS →</button><button type="button" class="btn" data-open="astra">ASTRA →</button></div>`,
        `<div class="rt">The work</div><ol class="ol">${EXP.work.map((w, i) => `<li class="${i === vi ? "on" : ""}"><div>${esc(w[0])}${i === vi ? `<span>${esc(w[1])}</span>` : ""}</div></li>`).join("")}</ol>`];
    }
    if (si === 3) {
      // the network itself does the explaining; the caption names where you are and offers the full list
      const g = SL[skL].grp[skG];
      return ["s" + skL + "-" + skG,
        `<div class="eb">04 · Skills · layer ${skL + 1} / ${SL.length}</div><h2>${esc(g.label)}</h2>
        <p class="lead">${g.sk.length} skill${g.sk.length === 1 ? "" : "s"}, each wired to the projects that used it.</p>`,
        ""];
    }
    if (si === 4) {
      const j = JOURNEY[jCur], certs = j[0] === "Certifications";
      return ["j" + jCur,
        `<div class="eb">05 · Journey · ${esc(j[0])}${j[1] ? " · " + esc(j[1]) : ""}</div><h2>${esc(j[2])}</h2><p class="body" style="display:block">${esc(j[3])}</p>`,
        certs
          ? `<div class="rt">Certifications</div><ol class="ol">${CERTS.map((c) => `<li class="on"><div>${esc(c.short)}<span>${esc(c.issuer)}${c.year ? " · " + esc(c.year) : ""}</span></div></li>`).join("")}</ol>`
          : `<div class="rt">Signboards passed</div><ol class="ol">${JOURNEY.map((x, i) => `<li class="${i <= jCur ? "on" : ""}">${esc(x[0])}${x[1] ? " · " + esc(x[1]) : ""}</li>`).join("")}</ol>`];
    }
    const tel = PROFILE.phone;
    const copyRow = (label, value, shown) =>
      `<div class="crow"><span class="cl">${label}</span><span class="cv">${esc(shown)}</span><button type="button" class="cp" data-copy="${esc(value)}" aria-label="Copy ${label.toLowerCase()}"><b>Copy</b><b>Copied</b></button></div>`;
    return ["c",
      `<div class="eb">06 · Contact · ${esc(PROFILE.loc)}</div><h2>${esc(PROFILE.name)}</h2><p class="lead">${esc(PROFILE.role)}</p>
      <div class="crows">${copyRow("Email", PROFILE.email, PROFILE.email)}${copyRow("Phone", tel.replace(/\s/g, ""), tel)}</div>
      <div class="btns"><a class="btn p" href="${esc(PROFILE.gmail)}" target="_blank" rel="noreferrer">Write to me ↗</a><a class="btn" href="${esc(PROFILE.gh)}" target="_blank" rel="noreferrer">GitHub ↗</a><a class="btn" href="${esc(PROFILE.li)}" target="_blank" rel="noreferrer">LinkedIn ↗</a><a class="btn" href="${esc(PROFILE.resume)}" download>Résumé ↓</a><button type="button" class="btn" data-arc>Ask Arc</button></div>`,
      `<div class="rt opt">What I build</div><p class="body">${esc(PROFILE.statement)}</p>
      <ul class="areas">${["Computer vision", "Vision-language models", "Voice AI", "RAG", "LLM agents"].map((x) => `<li>${x}</li>`).join("")}</ul>
      <div class="rt opt">Direction · now</div><p class="body">${esc(JOURNEY[JOURNEY.length - 1][3])}</p>`];
  }
  let capKey = "";
  function setCap(si, p) {
    const [k, l, r] = caption(si, p); if (k === capKey) return; capKey = k;
    capL.innerHTML = l; capR.innerHTML = r;
    if (!RM) for (const c of [capL, capR]) { c.classList.remove("sw"); void c.offsetWidth; c.classList.add("sw"); }
  }

  /* ---------- the loop ---------- */
  let target = 0, prog = 0, T = 0, last = performance.now(), raf = 0, inView = false, monT = -1, monDrawn = false, lastSi = -1;
  const readScroll = () => { const r = shot.getBoundingClientRect(), tot = r.height - innerHeight; target = clamp(-r.top / Math.max(1, tot)); };
  const resize = () => {
    const w = stage.clientWidth, h = stage.clientHeight; R.setPixelRatio(Math.min(devicePixelRatio || 1, 2)); R.setSize(w, h, false);
    cam.aspect = w / h; cam.fov = cam.aspect < 0.8 ? 64 : 50; cam.updateProjectionMatrix(); PS.value = 1.15 * R.getPixelRatio();
  };
  function update(scroll, dt) {
    const p = clamp(pathAt(clamp(scroll)));
    const u = pathU(p); CP.getPoint(u, cam.position); CL.getPoint(u, look);
    if (!RM) { cam.position.x += Math.sin(T * 0.4) * 0.05; cam.position.y += Math.sin(T * 0.55) * 0.04; }
    cam.lookAt(look);
    if (SK.visible) upSK(cam.position.z, T, dt);
    let si = 0; for (let i = 0; i < STATIONS.length; i++) if (p >= STATIONS[i].at) si = i;
    GRPS.forEach((g, i) => (g.visible = Math.abs(cam.position.z - STATIONS[i].z) < 62));
    if (FD.visible) upWork((p - 0.18) / 0.19, T);
    if (JR.visible) upJR(cam.position.z, dt);
    if (EX.visible && (RM ? !monDrawn : T - monT > 1 / 12)) { monT = T; monDrawn = true; MONS.forEach((m) => drawMon(m, T)); }
    if (CT.visible) upContact(p, T);
    setCap(si, p);
    if (si !== lastSi) {
      lastSi = si;
      // the page shows station-specific controls (the skills button, the contact lock-on) from this
      stage.dataset.station = STATIONS[si].name.toLowerCase();
    }
  }
  function frame(now) {
    // a rAF timestamp can predate the `last` taken when the loop was kicked, so never let dt go negative
    raf = 0; const dt = clamp((now - last) / 1000, 0, 0.05); last = now; if (!RM) T += dt;
    prog = RM ? target : prog + (target - prog) * (1 - Math.exp(-dt * 4.5)); if (Math.abs(target - prog) < 1e-5) prog = target;
    update(prog, dt); R.render(S, cam);
    if (!RM && inView && !document.hidden) raf = requestAnimationFrame(frame);
  }
  const kick = () => { if (!raf && inView && !document.hidden) { last = performance.now(); raf = requestAnimationFrame(frame); } };
  const onScroll = () => { readScroll(); kick(); };
  const onResize = () => { resize(); readScroll(); kick(); };
  const onVis = () => { if (!document.hidden) { last = performance.now(); kick(); } };
  addEventListener("scroll", onScroll, { passive: true });
  addEventListener("resize", onResize);
  document.addEventListener("visibilitychange", onVis);
  const io = new IntersectionObserver((es) => { inView = es[0].isIntersecting; kick(); });
  io.observe(stage);
  resize(); readScroll(); prog = target;
  // the first frame renders even before the stage scrolls into view, so it never pops in blank
  inView = true; kick(); requestAnimationFrame(() => { const r = stage.getBoundingClientRect(); inView = r.bottom > 0 && r.top < innerHeight; });

  return () => {
    cancelAnimationFrame(raf);
    removeEventListener("scroll", onScroll);
    removeEventListener("resize", onResize);
    document.removeEventListener("visibilitychange", onVis);
    io.disconnect();
    disposables.forEach((d) => d.dispose?.());
    R.dispose();
  };
}
