// Плоский «мультяшный» рендер: 2-ступенчатая заливка + чёрный контур (inverted hull) постоянной экранной толщины.
import React from "react";
import * as THREE from "three";
import { mergeVertices } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";

export const INK = "#0c0a10";
export const FOV = 40;
export const VIEW_H = 1080;
const FOCAL_PX = VIEW_H / 2 / Math.tan((FOV * Math.PI) / 360);
export const LIGHT_DIR = new THREE.Vector3(0.66, 0.6, 0.5).normalize();

// ---------- материалы ----------
// MeshToonMaterial с жёсткой 2-ступенчатой градиент-картой: светлая сторона / тёмная сторона + настоящие тени от направленного света.
// lit = цвет модели; тень = цвет * AMB (холодная, насыщенная). AMB + SUN = 1 по каналам (линейное пространство).
export const AMB = new THREE.Color().setRGB(0.33, 0.33, 0.58);
export const SUN = new THREE.Color().setRGB(0.67, 0.67, 0.42);
const gradTex = (() => {
  const N = 20;
  const d = new Uint8Array(N);
  for (let i = 0; i < N; i++) d[i] = i >= 11 ? 255 : 0; // порог dot(N,L) ~ 0.1
  const t = new THREE.DataTexture(d, N, 1, THREE.RedFormat);
  t.minFilter = THREE.NearestFilter;
  t.magFilter = THREE.NearestFilter;
  t.generateMipmaps = false;
  t.needsUpdate = true;
  return t;
})();
const toonCache = new Map<string, THREE.MeshToonMaterial>();
export const toonMat = (hex: string): THREE.MeshToonMaterial => {
  let m = toonCache.get(hex);
  if (m) return m;
  m = new THREE.MeshToonMaterial({ color: hex, gradientMap: gradTex });
  toonCache.set(hex, m);
  return m;
};
const outlineCache = new Map<number, THREE.ShaderMaterial>();
export const outlineMat = (px: number): THREE.ShaderMaterial => {
  let m = outlineCache.get(px);
  if (m) return m;
  m = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    uniforms: { uK: { value: px / FOCAL_PX }, uInk: { value: new THREE.Color(INK) } },
    vertexShader: /* glsl */ `
      uniform float uK;
      void main() {
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        vec3 n = normalize(normalMatrix * normal);
        mv.xyz += n * (-mv.z) * uK;
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */ `
      uniform vec3 uInk;
      void main() {
        gl_FragColor = vec4(uInk, 1.0);
        #include <colorspace_fragment>
      }`,
  });
  outlineCache.set(px, m);
  return m;
};
const flatCache = new Map<string, THREE.MeshBasicMaterial>();
export const flatMat = (hex: string, opts: { double?: boolean } = {}): THREE.MeshBasicMaterial => {
  const key = hex + (opts.double ? "d" : "");
  let m = flatCache.get(key);
  if (!m) {
    m = new THREE.MeshBasicMaterial({ color: hex, toneMapped: false, side: opts.double ? THREE.DoubleSide : THREE.FrontSide });
    flatCache.set(key, m);
  }
  return m;
};

// ---------- геометрии (кэш) ----------
const geoCache = new Map<string, THREE.BufferGeometry>();
const cached = (key: string, make: () => THREE.BufferGeometry) => {
  let g = geoCache.get(key);
  if (!g) {
    g = make();
    geoCache.set(key, g);
  }
  return g;
};
export const sphereGeo = (seg = 24) => cached(`s${seg}`, () => new THREE.SphereGeometry(1, seg, Math.max(10, Math.round(seg * 0.65))));
export const rbox = (w: number, h: number, d: number, r = 0.04, seg = 3) =>
  cached(`b${w}_${h}_${d}_${r}_${seg}`, () => new RoundedBoxGeometry(w, h, d, seg, Math.min(r, w / 2, h / 2, d / 2) * 0.999));
/** Лате́: профиль [радиус, высота] снизу вверх. Скруглённые рёбра - чтобы контур не рвался. */
export const latheGeo = (key: string, pts: Array<[number, number]>, seg = 28) =>
  cached(`l${key}_${seg}`, () => new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(r, y)), seg));
/** Скруглённый цилиндр (в т.ч. конус): rb снизу, rt сверху, высота h, скругление c */
export const rcyl = (rb: number, rt: number, h: number, c = 0.02, seg = 28) => {
  const key = `rc${rb}_${rt}_${h}_${c}`;
  const pts: Array<[number, number]> = [];
  const hh = h / 2;
  pts.push([0, -hh]);
  const arc = (cx: number, cy: number, a0: number, a1: number) => {
    for (let i = 0; i <= 4; i++) {
      const a = a0 + ((a1 - a0) * i) / 4;
      pts.push([cx + Math.cos(a) * c, cy + Math.sin(a) * c]);
    }
  };
  arc(rb - c, -hh + c, -Math.PI / 2, 0);
  arc(rt - c, hh - c, 0, Math.PI / 2);
  pts.push([0, hh]);
  return latheGeo(key, pts, seg);
};

// ---------- компонент ----------
export interface PartProps {
  geo: THREE.BufferGeometry;
  hull?: THREE.BufferGeometry; // геометрия для контура (со сглаженными нормалями)
  color: string;
  px?: number; // толщина контура в пикселях кадра; 0 = без контура
  position?: [number, number, number];
  rotation?: [number, number, number];
  scale?: number | [number, number, number];
  visible?: boolean;
  children?: React.ReactNode;
}
export const Part: React.FC<PartProps> = ({ geo, hull, color, px = 3.6, position, rotation, scale, visible, children }) => (
  <mesh geometry={geo} material={toonMat(color)} position={position} rotation={rotation} scale={scale as any} visible={visible} castShadow receiveShadow>
    {px > 0 && <mesh geometry={hull ?? geo} material={outlineMat(px)} />}
    {children}
  </mesh>
);

/** Плоская (без освещения) фигура-накладка */
export const Flat: React.FC<Omit<PartProps, "px"> & { double?: boolean; order?: number }> = ({ geo, color, position, rotation, scale, visible, double, order, children }) => (
  <mesh geometry={geo} material={flatMat(color, { double })} position={position} rotation={rotation} scale={scale as any} visible={visible} renderOrder={order}>
    {children}
  </mesh>
);

/** Круглая плоская тень на земле (непрозрачная тёмная лепёшка, без размытия) */
const shadowGeo = new THREE.CircleGeometry(1, 28);
export const Shadow: React.FC<{ position: [number, number, number]; w: number; d: number; color?: string }> = ({ position, w, d, color = "#4e4c6a" }) => (
  <mesh geometry={shadowGeo} material={flatMat(color)} position={position} rotation={[-Math.PI / 2, 0, 0]} scale={[w, d, 1]} renderOrder={1} />
);

export const planeGeo = cached("plane", () => new THREE.PlaneGeometry(1, 1));
export const circleGeo = cached("circle", () => new THREE.CircleGeometry(1, 32));

/** Выдавленный контур (крыло, звезда...). pts - в плоскости XY, толщина по Z. Возвращает геометрию и «сглаженную» для контура. */
const exCache = new Map<string, { geo: THREE.BufferGeometry; hull: THREE.BufferGeometry }>();
export const extrude = (key: string, pts: Array<[number, number]>, depth: number, bevel = 0.015) => {
  let e = exCache.get(key);
  if (e) return e;
  const shape = new THREE.Shape(pts.map(([x, y]) => new THREE.Vector2(x, y)));
  const geo = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: bevel > 0, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 1, curveSegments: 8 });
  geo.translate(0, 0, -depth / 2);
  const h = geo.clone();
  h.deleteAttribute("normal");
  h.deleteAttribute("uv");
  const hull = mergeVertices(h, 1e-4);
  hull.computeVertexNormals();
  e = { geo, hull };
  exCache.set(key, e);
  return e;
};

/** Общий свет: ambient (цвет тени) + направленный сбоку-сверху (светлая сторона) с тенями */
export const Lights: React.FC<{ target?: [number, number, number]; shadowSize?: number }> = ({ target = [0, 0, 0], shadowSize = 4096 }) => {
  const L = LIGHT_DIR;
  const ref = React.useRef<THREE.DirectionalLight>(null);
  return (
    <>
      <ambientLight color={AMB} intensity={Math.PI} />
      <directionalLight
        ref={ref}
        color={SUN}
        intensity={Math.PI}
        position={[target[0] + L.x * 40, target[1] + L.y * 40, target[2] + L.z * 40]}
        castShadow
        shadow-mapSize={[shadowSize, shadowSize]}
        shadow-camera-left={-13}
        shadow-camera-right={13}
        shadow-camera-top={11}
        shadow-camera-bottom={-9}
        shadow-camera-near={1}
        shadow-camera-far={100}
        shadow-bias={-0.0004}
        shadow-normalBias={0.03}
      />
    </>
  );
};
