// Общие элементы сцен «Стена» и «Допрос»: бумажная толпа (свой атлас: спереди / со спины с техникой / трупы),
// бетонная стена из картонных плит, колючка, турели, реквизит (мегафон, автомат, геймпад, тройник, зуб и т.п.).
import React, { useMemo } from "react";
import * as THREE from "three";
import { geo, paper, glow, rng, Pt } from "../../kit/paper";
import { Puff } from "../../kit/Stage";
import { hash, twos, prog, easeOutBack, clamp01 } from "../../kit/anim";

// ---------- геометрия взрослого персонажа (adult:true, scale 1) ----------
export const AD = { head: 1.405, mouth: 1.2, eyes: 1.46, shoulder: 1.0, top: 1.95 };

// ---------- стена ----------
export const WH = 30;   // высота стены
export const WT = 4;    // толщина
export const SEG = 4;   // ширина секции

// ==================== БУМАЖНАЯ ТОЛПА ====================
const NID = 12; // личностей; позы: 0 спереди руки вниз, 1 спереди кулаки вверх, 2 спина, 3 спина руки вверх, 4 труп
export const cell = (pose: number, id: number) => pose * NID + (id % NID);

const IDS = (() => {
  const r = rng(91);
  const skins = ["#f6d1a8", "#e8b98f", "#c68b59", "#8d5a3b", "#f3c9a0", "#d9a37a"];
  const shirts = ["#c0392b", "#2c3e50", "#27ae60", "#8e44ad", "#f39c12", "#16a085", "#7f8c8d", "#d35400", "#2980b9", "#6d4c41", "#e84393", "#1e272e"];
  const pants = ["#2c3e66", "#3b3b3b", "#4a4a5a", "#5b4636", "#26324a"];
  const hairs = ["#2b1b10", "#4a2f1b", "#111", "#c9a227", "#7a4a24", "#555"];
  return Array.from({ length: NID }, (_, i) => ({
    skin: skins[Math.floor(r() * skins.length)], shirt: shirts[i % shirts.length], pants: pants[Math.floor(r() * pants.length)],
    hair: hairs[Math.floor(r() * hairs.length)], cap: r() < 0.3 ? shirts[Math.floor(r() * shirts.length)] : null, gear: i % 5,
  }));
})();

function drawGear(g: CanvasRenderingContext2D, u: number, gear: number, cx: number, cy: number, k = 1) {
  const O = "rgba(25,18,12,0.7)";
  const R = (x: number, y: number, w: number, h: number, c: string) => { g.fillStyle = c; g.fillRect(cx + (x - w / 2) * u * k, cy + (y - h / 2) * u * k, w * u * k, h * u * k); g.strokeStyle = O; g.lineWidth = 1.4 * u; g.strokeRect(cx + (x - w / 2) * u * k, cy + (y - h / 2) * u * k, w * u * k, h * u * k); };
  if (gear === 0) { // PS5: белые «крылья» и чёрная середина
    g.fillStyle = "#f4f4f2"; g.beginPath(); g.moveTo(cx - 13 * u * k, cy + 19 * u * k); g.quadraticCurveTo(cx - 16 * u * k, cy, cx - 10 * u * k, cy - 21 * u * k); g.lineTo(cx + 10 * u * k, cy - 21 * u * k); g.quadraticCurveTo(cx + 16 * u * k, cy, cx + 13 * u * k, cy + 19 * u * k); g.closePath(); g.fill(); g.strokeStyle = O; g.lineWidth = 1.4 * u; g.stroke();
    R(0, 0, 7, 40, "#141414");
    g.fillStyle = "#3f7dff"; g.fillRect(cx - 0.8 * u * k, cy - 16 * u * k, 1.6 * u * k, 30 * u * k);
  } else if (gear === 1) { // Xbox: чёрный куб
    R(0, 0, 26, 30, "#1b1b1b"); g.fillStyle = "#3cb043"; g.beginPath(); g.arc(cx, cy - 9 * u * k, 4 * u * k, 0, 7); g.fill();
    g.fillStyle = "#333"; for (let i = 0; i < 4; i++) g.fillRect(cx - 9 * u * k, cy + (2 + i * 4) * u * k, 18 * u * k, 1.5 * u * k);
  } else if (gear === 2) { // телевизор
    R(0, 0, 44, 28, "#202020"); R(0, -0.5, 39, 23, "#3d5a8a");
    g.fillStyle = "rgba(255,255,255,0.35)"; g.beginPath(); g.moveTo(cx - 16 * u * k, cy - 9 * u * k); g.lineTo(cx - 6 * u * k, cy - 9 * u * k); g.lineTo(cx - 14 * u * k, cy + 6 * u * k); g.closePath(); g.fill();
  } else if (gear === 3) { // системник с RGB
    R(0, 0, 20, 36, "#2d2d2d"); g.fillStyle = "#ff2fd0"; g.fillRect(cx - 7 * u * k, cy - 14 * u * k, 2.5 * u * k, 28 * u * k); g.fillStyle = "#00e5ff"; g.fillRect(cx + 4.5 * u * k, cy - 14 * u * k, 2.5 * u * k, 28 * u * k);
  } else { // бухта удлинителя + тройник
    g.lineWidth = 3.4 * u * k; g.strokeStyle = "#ff7f11";
    for (let i = 0; i < 3; i++) { g.beginPath(); g.ellipse(cx, cy - 3 * u * k, (15 - i * 4) * u * k, (12 - i * 3) * u * k, 0, 0, 7); g.stroke(); }
    R(0, 10, 30, 8, "#f2f2f2"); g.fillStyle = "#222"; for (let i = 0; i < 4; i++) { g.beginPath(); g.arc(cx + (-10.5 + i * 7) * u * k, cy + 10 * u * k, 1.8 * u * k, 0, 7); g.fill(); }
  }
}

function drawPerson(g: CanvasRenderingContext2D, u: number, cx: number, cy: number, id: number, pose: number) {
  const P = IDS[id];
  const front = pose === 0 || pose === 1 || pose === 4, up = pose === 1 || pose === 3, dead = pose === 4;
  const O = "rgba(25,18,12,0.65)";
  const X = (x: number) => cx + x * u, Y = (y: number) => cy + y * u;
  const fillStroke = (c: string) => { g.fillStyle = c; g.fill(); g.strokeStyle = O; g.lineWidth = 1.5 * u; g.stroke(); };
  // техника за спиной выглядывает из-за плеч (спереди)
  if (front) drawGear(g, u, P.gear, X(P.gear === 2 || P.gear === 4 ? 0 : (id % 2 ? 15 : -15)), Y(P.gear === 2 ? 22 : 30), 1.08);
  // ноги
  for (const s of [-1, 1]) {
    g.save(); g.translate(X(s * 7.5), Y(76)); if (dead) g.rotate(s * 0.35);
    g.beginPath(); g.rect(-4.5 * u, 0, 9 * u, 18 * u); fillStroke(P.pants);
    g.beginPath(); g.ellipse(s * 1.5 * u, 19 * u, 6.5 * u, 3 * u, 0, 0, 7); fillStroke("#1b1b1b");
    g.restore();
  }
  // руки
  const arm = (s: number, x1: number, y1: number) => {
    g.strokeStyle = O; g.lineCap = "round"; g.lineWidth = 9.5 * u; g.beginPath(); g.moveTo(X(s * 13), Y(47)); g.lineTo(X(x1), Y(y1)); g.stroke();
    g.strokeStyle = P.shirt; g.lineWidth = 7 * u; g.beginPath(); g.moveTo(X(s * 13), Y(47)); g.lineTo(X(x1), Y(y1)); g.stroke();
    g.beginPath(); g.arc(X(x1), Y(y1), (up ? 5.2 : 4.2) * u, 0, 7); fillStroke(P.skin);
  };
  for (const s of [-1, 1]) {
    if (dead) arm(s, s * 37, 40);
    else if (up) arm(s, s * (24 + (id % 3)), 9 + (id % 2) * 4);
    else arm(s, s * 20, 72);
  }
  // туловище
  g.beginPath(); g.moveTo(X(-17), Y(78)); g.lineTo(X(17), Y(78)); g.lineTo(X(13), Y(42)); g.lineTo(X(-13), Y(42)); g.closePath(); fillStroke(P.shirt);
  if (!front) {
    // со спины: техника примотана скотчем
    drawGear(g, u, P.gear, X(0), Y(P.gear === 2 ? 48 : 54), 1.18);
    // скотч — короткими полосками по краям, чтобы техника читалась
    g.fillStyle = "rgba(214,182,104,0.95)";
    g.fillRect(X(-22), Y(41), 9 * u, 4 * u); g.fillRect(X(13), Y(41), 9 * u, 4 * u);
    g.fillRect(X(-22), Y(70), 9 * u, 4 * u); g.fillRect(X(13), Y(70), 9 * u, 4 * u);
  }
  // голова
  g.beginPath(); g.ellipse(X(0), Y(26), 16 * u, 15 * u, 0, 0, 7); fillStroke(P.skin);
  if (!front) {
    for (const s of [-1, 1]) { g.beginPath(); g.ellipse(X(s * 15.5), Y(27), 3.2 * u, 4.5 * u, 0, 0, 7); fillStroke(P.skin); }
    g.beginPath(); g.ellipse(X(0), Y(24), 15.6 * u, 14 * u, 0, Math.PI * 0.9, Math.PI * 2.1); g.closePath(); fillStroke(P.cap ?? P.hair);
    return;
  }
  // волосы / кепка
  g.beginPath(); g.ellipse(X(0), Y(21), 16 * u, P.cap ? 11 * u : 8.5 * u, 0, Math.PI, 0); g.closePath(); fillStroke(P.cap ?? P.hair);
  if (P.cap) { g.fillStyle = P.cap; g.fillRect(X(2), Y(19.5), 18 * u, 3 * u); }
  // глаза
  for (const s of [-1, 1]) {
    g.beginPath(); g.ellipse(X(s * 6), Y(26), 5.4 * u, 6.2 * u, s * 0.12, 0, 7); g.fillStyle = "#fbfbf6"; g.fill(); g.strokeStyle = O; g.lineWidth = 0.8 * u; g.stroke();
    if (dead) {
      g.strokeStyle = "#111"; g.lineWidth = 1.8 * u; g.beginPath();
      g.moveTo(X(s * 6 - 3.2), Y(23)); g.lineTo(X(s * 6 + 3.2), Y(29)); g.moveTo(X(s * 6 + 3.2), Y(23)); g.lineTo(X(s * 6 - 3.2), Y(29)); g.stroke();
    } else {
      g.fillStyle = "#111"; g.beginPath(); g.arc(X(s * 6 + ((id * 7 + s * 3) % 5 - 2) * 0.6), Y(26.5 + (id % 3) * 0.6), 1.8 * u, 0, 7); g.fill();
      g.strokeStyle = "#1a1a1a"; g.lineWidth = 2 * u; g.beginPath(); g.moveTo(X(s * 2.5), Y(19.5)); g.lineTo(X(s * 10), Y(17)); g.stroke();
    }
  }
  // рот
  if (dead) {
    g.strokeStyle = "#2a1410"; g.lineWidth = 1.6 * u; g.beginPath(); g.moveTo(X(-5), Y(35)); g.quadraticCurveTo(X(0), Y(32), X(5), Y(35)); g.stroke();
    g.beginPath(); g.ellipse(X(2.5), Y(37), 2.6 * u, 3.4 * u, 0, 0, 7); g.fillStyle = "#d9535b"; g.fill();
    g.fillStyle = "#b3121b"; g.beginPath(); g.ellipse(X(-9), Y(58), 7 * u, 5 * u, 0.4, 0, 7); g.fill();
    g.beginPath(); g.ellipse(X(9), Y(16), 4 * u, 3 * u, 0, 0, 7); g.fill();
  } else {
    const h = up ? 5.5 : 3.6;
    g.beginPath(); g.ellipse(X(0), Y(34.5), 5.5 * u, h * u, 0, 0, 7); g.fillStyle = "#3a0b0b"; g.fill();
    g.fillStyle = "#fff"; g.fillRect(X(-3.6), Y(34.5 - h + 0.6), 7.2 * u, 1.8 * u);
  }
}

function makeAtlasTex(): THREE.CanvasTexture {
  const W = 2048, N = 8, c = document.createElement("canvas");
  c.width = W; c.height = W;
  const g = c.getContext("2d")!;
  g.clearRect(0, 0, W, W);
  const cs = W / N, u = cs / 100;
  for (let pose = 0; pose < 5; pose++) for (let id = 0; id < NID; id++) {
    const i = cell(pose, id);
    const cx = (i % N) * cs + cs / 2, cy = Math.floor(i / N) * cs + 1 * u;
    g.save(); g.beginPath(); g.rect((i % N) * cs + 2, Math.floor(i / N) * cs + 2, cs - 4, cs - 4); g.clip();
    drawPerson(g, u, cx, cy, id, pose);
    g.restore();
  }
  const t = new THREE.CanvasTexture(c);
  t.anisotropy = 4;
  return t;
}
let atlas: THREE.CanvasTexture | null = null;
const getAtlas = () => (atlas ??= makeAtlasTex());

export interface PM { x: number; y?: number; z: number; rx?: number; ry?: number; rz?: number; s?: number; front: number; back: number; shade?: number; hidden?: boolean }

const VS = `
attribute float aFront; attribute float aBack; attribute float aShade;
varying vec2 vUv; varying float vFront; varying float vBack; varying float vShade; varying float vDepth;
void main(){ vUv = uv; vFront = aFront; vBack = aBack; vShade = aShade;
  vec4 mv = modelViewMatrix * instanceMatrix * vec4(position, 1.0); vDepth = -mv.z; gl_Position = projectionMatrix * mv; }`;
const FS = `
uniform sampler2D map; uniform vec3 uFog; uniform float uNear; uniform float uFar;
varying vec2 vUv; varying float vFront; varying float vBack; varying float vShade; varying float vDepth;
void main(){ float c = floor((gl_FrontFacing ? vFront : vBack) + 0.5); vec2 uv = vUv; if(!gl_FrontFacing) uv.x = 1.0 - uv.x;
  vec2 cl = vec2(mod(c, 8.0), 7.0 - floor(c / 8.0)); vec4 tx = texture2D(map, (uv * 0.985 + 0.0075 + cl) / 8.0);
  if (tx.a < 0.5) discard; vec3 col = tx.rgb * vShade; col = mix(col, uFog, smoothstep(uNear, uFar, vDepth)); gl_FragColor = vec4(col, 1.0); }`;

/** Толпа плоских бумажных человечков; front/back — ячейки атласа для лицевой/тыльной стороны. ry=π — смотрят на −Z (на стену). */
export const PaperCrowd: React.FC<{ members: PM[]; size?: number; fog?: [number, number, string] }> = ({ members, size = 2.05, fog = [400, 500, "#2b2632"] }) => {
  const n = Math.max(1, members.length);
  const mesh = useMemo(() => {
    const g = new THREE.PlaneGeometry(size, size); g.translate(0, size / 2, 0);
    g.setAttribute("aFront", new THREE.InstancedBufferAttribute(new Float32Array(n), 1));
    g.setAttribute("aBack", new THREE.InstancedBufferAttribute(new Float32Array(n), 1));
    g.setAttribute("aShade", new THREE.InstancedBufferAttribute(new Float32Array(n), 1));
    const m = new THREE.ShaderMaterial({ vertexShader: VS, fragmentShader: FS, side: THREE.DoubleSide,
      uniforms: { map: { value: getAtlas() }, uFog: { value: new THREE.Color() }, uNear: { value: 400 }, uFar: { value: 500 } } });
    const im = new THREE.InstancedMesh(g, m, n); im.frustumCulled = false;
    return im;
  }, [n, size]);
  const mat = mesh.material as THREE.ShaderMaterial;
  mat.uniforms.uNear.value = fog[0]; mat.uniforms.uFar.value = fog[1]; (mat.uniforms.uFog.value as THREE.Color).set(fog[2]);
  const geom = mesh.geometry;
  const aF = geom.getAttribute("aFront") as THREE.InstancedBufferAttribute, aB = geom.getAttribute("aBack") as THREE.InstancedBufferAttribute, aS = geom.getAttribute("aShade") as THREE.InstancedBufferAttribute;
  const d = new THREE.Object3D(); d.rotation.order = "YXZ";
  members.forEach((m, i) => {
    d.position.set(m.x, m.y ?? 0, m.z); d.rotation.set(m.rx ?? 0, m.ry ?? 0, m.rz ?? 0);
    const s = m.hidden ? 0.0001 : m.s ?? 1; d.scale.set(s, s, s); d.updateMatrix(); mesh.setMatrixAt(i, d.matrix);
    aF.setX(i, m.front); aB.setX(i, m.back); aS.setX(i, m.shade ?? 1);
  });
  for (let i = members.length; i < n; i++) { d.scale.set(0.0001, 0.0001, 0.0001); d.updateMatrix(); mesh.setMatrixAt(i, d.matrix); }
  mesh.instanceMatrix.needsUpdate = true; aF.needsUpdate = true; aB.needsUpdate = true; aS.needsUpdate = true;
  return <primitive object={mesh} />;
};

/** Тёмная «масса» голов до горизонта (текстура-плитка) — бесконечная толпа издалека */
let massTex: THREE.CanvasTexture | null = null;
function getMassTex() {
  if (massTex) return massTex;
  const S = 512, c = document.createElement("canvas"); c.width = S; c.height = S;
  const g = c.getContext("2d")!; const r = rng(5);
  g.fillStyle = "#26222b"; g.fillRect(0, 0, S, S);
  const skins = ["#c9a07a", "#a87a52", "#7a5236", "#d8b08a"], cols = ["#4a3030", "#2e3a4e", "#3b4a35", "#55406a", "#6a5a2a"];
  for (let i = 0; i < 260; i++) {
    const x = r() * S, y = r() * S;
    g.fillStyle = cols[Math.floor(r() * cols.length)]; g.fillRect(x - 14, y + 6, 28, 22);
    g.fillStyle = skins[Math.floor(r() * skins.length)]; g.beginPath(); g.arc(x, y, 9, 0, 7); g.fill();
    g.fillStyle = "#1a1714"; g.beginPath(); g.arc(x, y - 3, 9, Math.PI, 0); g.fill();
  }
  massTex = new THREE.CanvasTexture(c); massTex.wrapS = massTex.wrapT = THREE.RepeatWrapping; massTex.colorSpace = THREE.SRGBColorSpace;
  return massTex;
}
export const CrowdMass: React.FC<{ x0: number; x1: number; z0: number; z1: number; y?: number }> = ({ x0, x1, z0, z1, y = 0.03 }) => {
  const mat = useMemo(() => { const t = getMassTex().clone(); t.needsUpdate = true; t.repeat.set((x1 - x0) / 3.2, (z1 - z0) / 3.2); return new THREE.MeshBasicMaterial({ map: t, toneMapped: false }); }, [x0, x1, z0, z1]);
  return <mesh position={[(x0 + x1) / 2, y, (z0 + z1) / 2]} rotation={[-Math.PI / 2, 0, 0]} material={mat}><planeGeometry args={[x1 - x0, z1 - z0]} /></mesh>;
};

// ==================== ПЛЯЖНАЯ ТОЛПА: генерация и состояние во времени ====================
export interface Body0 { x: number; z: number; id: number; s: number; ph: number; armsUp: boolean; die: number; shade: number }
export function makeBeach(n: number, x0: number, x1: number, z0: number, z1: number, seed: number): Body0[] {
  // ряды через 0.25 м, внутри ряда люди не перекрываются (иначе соседние плоскости мерцают)
  const r = rng(seed); const out: Body0[] = [];
  const rows = Math.max(1, Math.round((z1 - z0) / 0.25));
  const step = ((x1 - x0) * rows) / Math.max(1, n); // средний шаг по x внутри ряда
  for (let row = 0; row < rows; row++) {
    const z = z0 + row * 0.25 + (r() - 0.5) * 0.04;
    let x = x0 + r() * step;
    while (x < x1) {
      out.push({ x, z, id: Math.floor(r() * NID), s: 0.9 + r() * 0.2, ph: r() * 10, armsUp: r() < 0.35, die: r(), shade: 0.85 + r() * 0.15 });
      x += Math.max(1.05, step * (0.5 + r()));
    }
  }
  return out;
}

// ==================== СТЕНА ====================
const boxG = new THREE.BoxGeometry(1, 1, 1);
const Box: React.FC<{ p: [number, number, number]; s: [number, number, number]; c: string; r?: [number, number, number]; m?: THREE.Material }> = ({ p, s, c, r, m }) => (
  <mesh geometry={boxG} material={m ?? paper(c)} position={p} scale={s} rotation={r} />
);
export { Box, boxG };

const SLAB = ["#b3b1aa", "#a19f98", "#aaa8a0", "#97958e", "#bbb9b1"];
/** Секция стены: фронт на z=0 (смотрит на +Z), тело уходит в −Z. k — 0..1 «вырастание». */
export const WallSeg: React.FC<{ x: number; k: number; seed: number; parapet?: boolean }> = ({ x, k, seed, parapet = true }) => {
  const y0 = -(1 - k) * (WH + 3);
  if (k <= 0) return null;
  const rows = 3, rh = WH / rows;
  return (
    <group position={[x, y0, 0]}>
      <Box p={[0, WH / 2, -WT / 2]} s={[SEG, WH, WT]} c="#8f8d87" />
      {Array.from({ length: rows }, (_, i) => (
        <Box key={i} p={[(hash(seed * 7 + i) - 0.5) * 0.12, rh * i + rh / 2, 0.14]} s={[SEG - 0.22, rh - 0.24, 0.3]} c={SLAB[Math.floor(hash(seed * 3 + i) * SLAB.length)]} r={[0, 0, (hash(seed + i * 9) - 0.5) * 0.012]} />
      ))}
      {/* потёки/пятна */}
      <Box p={[(hash(seed) - 0.5) * 4, WH * 0.55, 0.3]} s={[0.35, WH * 0.3, 0.02]} c="#8a8880" />
      <Box p={[0, WH + 0.15, -WT / 2]} s={[SEG, 0.3, WT]} c="#77766f" />
      {parapet && <Box p={[0, WH + 0.6, -0.4]} s={[SEG, 0.9, 0.8]} c="#9c9a93" />}
      {parapet && <Box p={[0, WH + 1.08, -0.4]} s={[SEG, 0.08, 0.9]} c="#7d7c77" />}
      {/* горизонтальные «этажные» швы — масштаб небоскрёба */}
      {Array.from({ length: 9 }, (_, i) => <Box key={"f" + i} p={[0, 3 + i * 3, 0.31]} s={[SEG, 0.12, 0.04]} c="#8c8a83" />)}
    </group>
  );
};

/** Колючая проволока (спираль из колец, инстансами) вдоль x0..x1 над парапетом. rise(x) — смещение по Y */
export const BarbedWire: React.FC<{ x0: number; x1: number; y: number; z: number; rise?: (x: number) => number; r?: number }> = ({ x0, x1, y, z, rise, r = 0.5 }) => {
  const step = 0.32;
  const n = Math.ceil((x1 - x0) / step);
  const mesh = useMemo(() => {
    const g = new THREE.TorusGeometry(r, 0.028, 3, 18);
    const im = new THREE.InstancedMesh(g, paper("#3b3b3d"), n); im.frustumCulled = false; return im;
  }, [n, r]);
  const d = new THREE.Object3D();
  for (let i = 0; i < n; i++) {
    const x = x0 + i * step;
    d.position.set(x, y + (rise ? rise(x) : 0), z); d.rotation.set(0, Math.PI / 2 - 0.38, 0.05 * Math.sin(i)); d.scale.set(1, 1, 1);
    d.updateMatrix(); mesh.setMatrixAt(i, d.matrix);
  }
  mesh.instanceMatrix.needsUpdate = true;
  return <primitive object={mesh} />;
};

/** Электрическая искра — звезда с лучами */
export const Spark: React.FC<{ p: [number, number, number]; s?: number; c?: string; rot?: number }> = ({ p, s = 1, c = "#fff36b", rot = 0 }) => (
  <group position={p} scale={s} rotation={[0, 0, rot]}>
    <mesh geometry={starG(7, 0.42, 0.12)} material={glow(c)} />
    <mesh geometry={starG(5, 0.2, 0.07)} material={glow("#ffffff")} position={[0, 0, 0.02]} />
  </group>
);
const starCache = new Map<string, THREE.BufferGeometry>();
export function starG(n: number, R: number, r: number) {
  const k = `${n}_${R}_${r}`;
  let g = starCache.get(k);
  if (!g) {
    const pts: Pt[] = [];
    for (let i = 0; i < n * 2; i++) { const a = (i / (n * 2)) * Math.PI * 2; const rr = i % 2 ? r : R * (0.75 + 0.25 * hash(i + n)); pts.push([Math.cos(a) * rr, Math.sin(a) * rr]); }
    g = geo.poly("star" + k, pts, 0, 0.01); starCache.set(k, g);
  }
  return g;
}

/** Турель на стене */
export const Turret: React.FC<{ p: [number, number, number]; yaw?: number; pitch?: number; flash?: boolean }> = ({ p, yaw = 0, pitch = -0.35, flash }) => (
  <group position={p} scale={1.9}>
    <Box p={[0, 0.5, 0]} s={[2.0, 1.0, 2.0]} c="#4f5640" />
    <group position={[0, 1.2, 0]} rotation={[0, yaw, 0]}>
      <mesh material={paper("#66704f")} scale={[1, 0.8, 1]}><sphereGeometry args={[0.95, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2]} /></mesh>
      <group position={[0, 0.35, 0.4]} rotation={[pitch, 0, 0]}>
        <Box p={[0.22, 0, 1.2]} s={[0.18, 0.18, 2.2]} c="#2a2a2a" />
        <Box p={[-0.22, 0, 1.2]} s={[0.18, 0.18, 2.2]} c="#2a2a2a" />
        {flash && <group position={[0, 0, 2.5]}><Spark p={[0, 0, 0]} s={2.6} c="#ffd23a" /></group>}
      </group>
      <mesh position={[0, 0.82, 0]} material={glow("#ff3b30")}><sphereGeometry args={[0.1, 8, 6]} /></mesh>
    </group>
  </group>
);

// ==================== РЕКВИЗИТ (в координатах кисти, плоский картон) ====================
export const Megaphone: React.FC<{ rot?: number; flip?: boolean }> = ({ rot = 0, flip }) => (
  <group rotation={[0, 0, rot]} scale={[flip ? -1 : 1, 1, 1]}>
    <mesh geometry={geo.poly("mega_bell", [[0, -0.08], [0, 0.08], [0.55, 0.27], [0.55, -0.27]], 0.02, 0.04)} material={paper("#f2ede0")} position={[0.05, 0, 0.06]} />
    <mesh geometry={geo.rrect(0.12, 0.2, 0.02, 0.05)} material={paper("#d32f2f")} position={[0.36, 0, 0.09]} />
    <mesh geometry={geo.ellipse(0.06, 0.28, 0.05)} material={paper("#2a2a2a")} position={[0.61, 0, 0.07]} />
    <mesh geometry={geo.rrect(0.16, 0.11, 0.03, 0.05)} material={paper("#333")} position={[0.0, 0, 0.07]} />
    <mesh geometry={geo.rrect(0.07, 0.2, 0.03, 0.04)} material={paper("#333")} position={[0.18, -0.15, 0.03]} rotation={[0, 0, -0.2]} />
  </group>
);
export const Rifle: React.FC<{ rot?: number; flash?: number }> = ({ rot = 0, flash = 0 }) => (
  <group rotation={[0, 0, rot]}>
    <mesh geometry={geo.poly("rifle", [[-0.38, -0.05], [-0.38, 0.06], [-0.2, 0.08], [0.35, 0.08], [0.35, 0.03], [0.72, 0.03], [0.72, -0.01], [0.3, -0.03], [0.12, -0.04], [0.08, -0.2], [0.0, -0.2], [0.02, -0.04], [-0.2, -0.04]], 0.01, 0.05)} material={paper("#262626")} position={[0, 0, 0.06]} />
    <mesh geometry={geo.rrect(0.22, 0.04, 0.01, 0.05)} material={paper("#5a4632")} position={[-0.27, 0.01, 0.1]} />
    {flash > 0 && <group position={[0.85, 0.01, 0.12]} scale={flash}><mesh geometry={starG(6, 0.32, 0.1)} material={glow("#ffd23a")} /><mesh geometry={starG(5, 0.16, 0.06)} material={glow("#ffffff")} position={[0, 0, 0.02]} /></group>}
  </group>
);
export const Gamepad: React.FC<{ s?: number; rot?: number }> = ({ s = 1, rot = 0 }) => (
  <group scale={s} rotation={[0, 0, rot]} position={[0, 0, 0.08]}>
    {[-1, 1].map((k) => <mesh key={k} geometry={geo.ellipse(0.09, 0.11, 0.05)} material={paper("#1f1f24")} position={[k * 0.13, -0.05, 0]} rotation={[0, 0, k * 0.4]} />)}
    <mesh geometry={geo.rrect(0.34, 0.15, 0.06, 0.05)} material={paper("#26262c")} position={[0, 0, 0.005]} />
    <mesh geometry={geo.rrect(0.07, 0.022, 0.008, 0.02)} material={paper("#999")} position={[-0.1, 0.01, 0.04]} />
    <mesh geometry={geo.rrect(0.022, 0.07, 0.008, 0.02)} material={paper("#999")} position={[-0.1, 0.01, 0.04]} />
    {[["#e74c3c", 0.12, 0.03], ["#3498db", 0.09, 0.0], ["#2ecc71", 0.15, 0.0], ["#f1c40f", 0.12, -0.03]].map(([c, x, y], i) =>
      <mesh key={i} geometry={geo.ellipse(0.017, 0.017, 0.02)} material={paper(c as string)} position={[x as number, y as number, 0.04]} />)}
  </group>
);
export const PowerStrip: React.FC<{ s?: number; rot?: number; glowSockets?: boolean }> = ({ s = 1, rot = 0 }) => (
  <group scale={s} rotation={[0, 0, rot]} position={[0, 0, 0.09]}>
    <mesh geometry={geo.rrect(0.78, 0.17, 0.05, 0.05)} material={paper("#f3f1ea")} />
    {[0, 1, 2, 3, 4].map((i) => (
      <group key={i} position={[-0.26 + i * 0.12, 0, 0.035]}>
        <mesh geometry={geo.ellipse(0.045, 0.05, 0.02)} material={paper("#d8d5cc")} />
        {[-1, 1].map((k) => <mesh key={k} geometry={geo.ellipse(0.009, 0.012, 0.02)} material={paper("#222")} position={[k * 0.018, 0, 0.012]} />)}
      </group>
    ))}
    <mesh geometry={geo.rrect(0.07, 0.09, 0.015, 0.03)} material={glow("#ff3b30")} position={[0.33, 0, 0.035]} />
    {[0, 1, 2, 3].map((i) => <mesh key={"c" + i} geometry={geo.rrect(0.16, 0.028, 0.014, 0.03)} material={paper("#1b1b1b")} position={[-0.45 - i * 0.12, -0.03 - i * i * 0.025, -0.01]} rotation={[0, 0, -0.2 - i * 0.22]} />)}
  </group>
);
export const Tooth: React.FC<{ s?: number }> = ({ s = 1 }) => (
  <group scale={s}>
    <mesh geometry={geo.poly("tooth", [[-0.05, 0.04], [0.05, 0.04], [0.045, -0.01], [0.03, -0.06], [0.012, -0.02], [-0.012, -0.02], [-0.03, -0.06], [-0.045, -0.01]], 0.012, 0.025)} material={paper("#fffdf2")} />
    <mesh geometry={geo.ellipse(0.012, 0.01, 0.02)} material={paper("#c0161f")} position={[0.022, -0.05, 0.015]} />
  </group>
);
/** Перекушенный кусок колючки в зубах */
export const WireBit: React.FC<{ s?: number }> = ({ s = 1 }) => (
  <group scale={s}>
    {[0, 1, 2, 3, 4].map((i) => <mesh key={i} geometry={geo.rrect(0.13, 0.022, 0.01, 0.02)} material={paper("#5d6066")} position={[-0.24 + i * 0.12, (i % 2) * 0.03, 0]} rotation={[0, 0, i % 2 ? -0.35 : 0.35]} />)}
    {[0, 2, 4].map((i) => (
      <group key={"b" + i} position={[-0.24 + i * 0.12, 0.015, 0.01]}>
        <mesh geometry={geo.rrect(0.07, 0.014, 0.005, 0.015)} material={paper("#3e4146")} rotation={[0, 0, 0.8]} />
        <mesh geometry={geo.rrect(0.07, 0.014, 0.005, 0.015)} material={paper("#3e4146")} rotation={[0, 0, -0.8]} />
      </group>
    ))}
  </group>
);
/** Трассер: светящаяся полоса из a в b, k — 0..1 положение «пули» */
const tmpV = new THREE.Vector3(), Zv = new THREE.Vector3(0, 0, 1);
export const Tracer: React.FC<{ a: [number, number, number]; b: [number, number, number]; k: number; len?: number; w?: number; c?: string }> = ({ a, b, k, len = 2.2, w = 0.07, c = "#ffe25a" }) => {
  if (k <= 0 || k >= 1) return null;
  tmpV.set(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
  const L = tmpV.length(); tmpV.normalize();
  const q = new THREE.Quaternion().setFromUnitVectors(Zv, tmpV);
  const p: [number, number, number] = [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];
  const l = Math.min(len, L * k);
  return (
    <group position={p} quaternion={q}>
      <mesh geometry={boxG} material={glow(c)} position={[0, 0, -l / 2]} scale={[w, w, l]} />
      <mesh geometry={boxG} material={glow("#ffffff")} position={[0, 0, -l * 0.2]} scale={[w * 0.5, w * 0.5, l * 0.4]} />
    </group>
  );
};

/** Пыль/дым у основания */
export const Dust: React.FC<{ p: [number, number, number]; k: number; s?: number; c?: string }> = ({ p, k, s = 1, c = "#cfc8b8" }) => {
  if (k <= 0 || k >= 1) return null;
  const sc = s * (0.5 + 1.4 * Math.sqrt(k));
  return <Puff position={[p[0], p[1] + k * s * 1.2, p[2]]} scale={sc} color={c} opacity={Math.min(1, (1 - k) * 1.6)} />;
};

/** Небо-бумага: облака */
export const Clouds: React.FC<{ z: number; y?: number; spread?: number; n?: number; seed?: number; s?: number }> = ({ z, y = 40, spread = 160, n = 7, seed = 3, s = 9 }) => {
  const r = rng(seed);
  const cl = Array.from({ length: n }, () => [(r() - 0.5) * spread, y + r() * 30, z + (r() - 0.5) * 20, s * (0.7 + r() * 0.6)]);
  return <>{cl.map(([x, yy, zz, ss], i) => <Puff key={i} position={[x, yy, zz]} scale={ss} color="#fbfbf7" />)}</>;
};

/** Холмы суши (зелёные, бумажные дуги) — для фонов Новой Зеландии */
export const Hills: React.FC<{ z: number; y?: number; facing?: 1 | -1; spread?: number; seed?: number; s?: number }> = ({ z, y = 0, facing = 1, spread = 220, seed = 4, s = 1 }) => {
  const r = rng(seed);
  const greens = ["#6fae4f", "#5e9a43", "#82bd5e", "#4f8a3a"];
  const hs = Array.from({ length: 9 }, (_, i) => [(r() - 0.5) * spread, (14 + r() * 22) * s, (8 + r() * 10) * s, i]);
  return (
    <group position={[0, y, z]} rotation={[0, facing === 1 ? 0 : Math.PI, 0]}>
      {hs.map(([x, w, h, i]) => <mesh key={i} geometry={geo.arc(w, h, 0, Math.PI, 0.3)} material={paper(greens[i % greens.length])} position={[x, 0, -i * 1.5]} />)}
    </group>
  );
};

/** Бумажная овца */
export const Sheep: React.FC<{ p: [number, number, number]; s?: number; rot?: number }> = ({ p, s = 1, rot = 0 }) => (
  <group position={p} scale={s} rotation={[0, rot, 0]}>
    {[[-0.25, 0.55, 0.3], [0.05, 0.62, 0.34], [0.32, 0.55, 0.28], [0.05, 0.45, 0.3]].map(([x, y, rr], i) => <mesh key={i} geometry={geo.ellipse(rr, rr * 0.85, 0.05)} material={paper("#f7f5ee")} position={[x, y, i * 0.01]} />)}
    <mesh geometry={geo.ellipse(0.16, 0.2, 0.05)} material={paper("#222")} position={[0.55, 0.62, 0.06]} />
    {[-0.25, -0.1, 0.15, 0.3].map((x, i) => <mesh key={"l" + i} geometry={geo.rrect(0.06, 0.3, 0.02, 0.03)} material={paper("#222")} position={[x, 0.15, -0.02]} />)}
  </group>
);

/** Капли слюны: облачко голубых капель, вылетающих из точки o в направлении dir */
export const SpitSpray: React.FC<{ o: [number, number, number]; dir: [number, number, number]; t: number; active: (tt: number) => number; seed?: number; n?: number }> = ({ o, dir, t, active, seed = 1, n = 6 }) => {
  const els: React.ReactNode[] = [];
  const tq = twos(t, 15);
  for (let w = 0; w < 7; w++) {
    const t0 = Math.floor(tq / 0.18) * 0.18 - w * 0.18; // волны каждые 0.18 с
    const a = active(t0); if (a < 0.35) continue;
    const age = tq - t0; if (age < 0 || age > 0.9) continue;
    for (let i = 0; i < n; i++) {
      const h1 = hash(Math.round(t0 * 100) * 13 + i + seed * 7), h2 = hash(Math.round(t0 * 100) * 29 + i * 3 + seed), h3 = hash(i * 17 + Math.round(t0 * 100));
      const sp = 1.6 + h3 * 2.2;
      const x = o[0] + (dir[0] + (h1 - 0.5) * 0.9) * age * sp, y = o[1] + (dir[1] + (h2 - 0.4) * 0.7) * age * sp - 2.5 * age * age, z = o[2] + dir[2] * age * sp;
      const r = 0.018 + h1 * 0.03;
      els.push(<mesh key={w + "_" + i} geometry={geo.ellipse(r, r * 1.2, 0.01)} material={glow("#bfe9ff", 0.95)} position={[x, y, z]} />);
    }
  }
  return <>{els}</>;
};

/** Крупная узнаваемая техника, примотанная к спине (для props back у Character). Читается и спереди (торчит из-за плеч), и со спины. */
const torusCache = new Map<number, THREE.BufferGeometry>();
const torusG = (r: number) => { let g = torusCache.get(r); if (!g) { g = new THREE.TorusGeometry(r, 0.045, 4, 24); torusCache.set(r, g); } return g; };
const TAPE = "#d9b866";
export const Gear3D: React.FC<{ kind: number }> = ({ kind }) => {
  const k = kind % 4;
  const tape = (y: number, w: number, x = 0, r = 0) => <mesh geometry={geo.rrect(w, 0.11, 0.02, 0.02)} material={paper(TAPE)} position={[x, y, -0.07]} rotation={[0, 0, r]} />;
  if (k === 0) return ( // PS5: белые «крылья», чёрная середина, синяя подсветка
    <group position={[0.52, 0.42, 0]} rotation={[0, 0, -0.16]}>
      <mesh geometry={geo.poly("ps5w", [[-0.34, -0.62], [0.34, -0.62], [0.4, 0.2], [0.26, 0.66], [-0.26, 0.66], [-0.4, 0.2]], 0.08, 0.1)} material={paper("#f6f6f3")} />
      {[0.06, -0.06].map((z) => <mesh key={z} geometry={geo.rrect(0.15, 1.2, 0.03, 0.02)} material={paper("#151515")} position={[0, 0.02, z]} />)}
      {[0.08, -0.08].map((z) => <mesh key={"l" + z} geometry={geo.rrect(0.03, 1.0, 0.01, 0.01)} material={glow("#3f7dff")} position={[0, 0.02, z]} />)}
      {tape(0.35, 0.95, 0, 0.1)}{tape(-0.35, 0.95, 0, -0.1)}
    </group>
  );
  if (k === 1) return ( // Xbox: чёрный короб с зелёным кругом + геймпад
    <group position={[-0.5, 0.3, 0]} rotation={[0, 0, 0.14]}>
      <mesh geometry={geo.rrect(0.62, 0.78, 0.05, 0.1)} material={paper("#1c1c1c")} />
      {[0.06, -0.06].map((z) => <mesh key={z} geometry={geo.ellipse(0.13, 0.13, 0.02)} material={paper("#3cb043")} position={[0, 0.2, z]} />)}
      {[0.06, -0.06].map((z) => [0, 1, 2].map((i) => <mesh key={z + "_" + i} geometry={geo.rrect(0.4, 0.03, 0.01, 0.01)} material={paper("#3a3a3a")} position={[0, -0.12 - i * 0.09, z]} />))}
      {tape(0.0, 0.85, 0, 0.5)}{tape(0.0, 0.85, 0, -0.5)}
    </group>
  );
  if (k === 2) return ( // телевизор
    <group position={[0, 0.62, 0]}>
      <mesh geometry={geo.rrect(1.75, 1.05, 0.05, 0.1)} material={paper("#202020")} />
      <mesh geometry={geo.rrect(1.6, 0.9, 0.03, 0.02)} material={glow("#4f78b8")} position={[0, 0, 0.06]} />
      <mesh geometry={geo.poly("tvglare", [[-0.7, 0.4], [-0.35, 0.4], [-0.62, -0.15]], 0, 0.01)} material={glow("#b9d3ff", 0.6)} position={[0, 0, 0.075]} />
      <mesh geometry={geo.rrect(1.2, 0.7, 0.05, 0.02)} material={paper("#3a3a3a")} position={[0, -0.05, -0.06]} />
      {[-0.45, 0.45].map((x) => <mesh key={x} geometry={geo.rrect(0.08, 0.25, 0.02, 0.06)} material={paper("#333")} position={[x, -0.6, 0]} rotation={[0, 0, x > 0 ? -0.4 : 0.4]} />)}
      {tape(0.3, 1.9)}{tape(-0.3, 1.9)}
    </group>
  );
  return ( // бухта удлинителя + тройник
    <group position={[-0.42, 0.42, 0]}>
      {[0.42, 0.34, 0.26].map((r, i) => <mesh key={r} geometry={torusG(r)} material={paper("#ff7f11")} position={[i * 0.03, i * 0.02, 0]} />)}
      <group position={[0.1, -0.42, 0.04]} rotation={[0, 0, 0.2]}>
        <mesh geometry={geo.rrect(0.75, 0.16, 0.04, 0.06)} material={paper("#f3f1ea")} />
        {[0, 1, 2, 3, 4].map((i) => [0.04, -0.04].map((z) => <mesh key={i + "_" + z} geometry={geo.ellipse(0.035, 0.04, 0.01)} material={paper("#2a2a2a")} position={[-0.26 + i * 0.13, 0, z]} />))}
      </group>
      {tape(0.1, 1.0, 0, 0.6)}
    </group>
  );
};

export { easeOutBack, prog, clamp01 };
