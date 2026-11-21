// Плоский «мультяшный» рендер: 2-ступенчатая заливка + чёрный контур (inverted hull) постоянной экранной толщины.
import React from "react";
import * as THREE from "three";
import { mergeVertices } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";

export const INK = "#0c0a10";
export const FOV = 40;
export const VIEW_H = 1080;
const FOCAL_PX = VIEW_H / 2 / Math.tan((FOV * Math.PI) / 360);
export const LIGHT_DIR = new THREE.Vector3(-0.42, 0.78, 0.5).normalize();
/** Стиль v5 (сцена 2): все материалы строго 2-ступенчатые, одна толщина контура, яркие плоские цвета. Сцена 1 остаётся как была. */
export const STYLE = { v5: false };
export const OUTLINE_PX = 5.6;
const INK_L = 0.14;
/** Подкрутка цвета: насыщеннее и чуть ярче (почти чёрное и почти белое не трогаем) */
export const pop = (hex: string): THREE.Color => {
  const c = new THREE.Color(hex);
  if (!STYLE.v5) return c;
  const hsl = { h: 0, s: 0, l: 0 };
  c.getHSL(hsl);
  if (hsl.l < INK_L || hsl.l > 0.93) return c;
  return c.setHSL(hsl.h, Math.min(1, hsl.s * 1.14), Math.min(0.9, hsl.l * 1.06 + 0.012));
};

// ---------- материалы ----------
const toonCache = new Map<string, THREE.ShaderMaterial>();
const shadeOf = (hex: string) => {
  const c = pop(hex);
  const hsl = { h: 0, s: 0, l: 0 };
  c.getHSL(hsl);
  // тень: темнее, чуть холоднее и насыщеннее (как у вырезанной бумаги); в v5 - одна заметная ступень
  const s = new THREE.Color().setHSL(hsl.h, Math.min(1, hsl.s * 1.05), hsl.l * (STYLE.v5 ? 0.68 : 0.7));
  return s.lerp(new THREE.Color("#2a2a66"), 0.12);
};
export const toonMat = (hex: string): THREE.ShaderMaterial => {
  const key = hex + (STYLE.v5 ? "#5" : "");
  let m = toonCache.get(key);
  if (m) return m;
  m = new THREE.ShaderMaterial({
    uniforms: { uColor: { value: pop(hex) }, uShade: { value: shadeOf(hex) }, uLight: { value: LIGHT_DIR } },
    vertexShader: /* glsl */ `
      varying vec3 vN;
      void main() {
        vN = normalize(transpose(inverse(mat3(modelMatrix))) * normal);
        gl_Position = projectionMatrix * viewMatrix * modelMatrix * vec4(position, 1.0);
      }`,
    fragmentShader: /* glsl */ `
      uniform vec3 uColor; uniform vec3 uShade; uniform vec3 uLight; varying vec3 vN;
      void main() {
        float d = dot(normalize(vN), uLight);
        vec3 c = d > 0.02 ? uColor : uShade;
        gl_FragColor = vec4(c, 1.0);
        #include <colorspace_fragment>
      }`,
  });
  toonCache.set(key, m);
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
  const key = hex + (opts.double ? "d" : "") + (STYLE.v5 ? "#5" : "");
  let m = flatCache.get(key);
  if (!m) {
    m = new THREE.MeshBasicMaterial({ color: pop(hex), toneMapped: false, side: opts.double ? THREE.DoubleSide : THREE.FrontSide });
    flatCache.set(key, m);
  }
  return m;
};

/** Материал накладок на сферах: плоский цвет + polygonOffset (чтобы хорды сферы не просвечивали «штриховкой» z-fighting) */
const decalCache = new Map<string, THREE.MeshBasicMaterial>();
export const decalMat = (hex: string): THREE.MeshBasicMaterial => {
  const key = hex + (STYLE.v5 ? "#5" : "");
  let m = decalCache.get(key);
  if (!m) {
    m = new THREE.MeshBasicMaterial({ color: pop(hex), toneMapped: false, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4 });
    decalCache.set(key, m);
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
  quaternion?: THREE.Quaternion;
  scale?: number | [number, number, number];
  visible?: boolean;
  flat?: boolean; // без освещения: одна плоская заливка (огонь, предметы без 3D-объёма)
  children?: React.ReactNode;
}
export const Part: React.FC<PartProps> = ({ geo, hull, color, px = 3.6, position, rotation, quaternion, scale, visible, flat, children }) => {
  const w = STYLE.v5 ? (px > 0 ? OUTLINE_PX : 0) : px; // v5: у всех деталей одна толщина контура
  return (
    <mesh geometry={geo} material={flat ? flatMat(color) : toonMat(color)} position={position} rotation={rotation} quaternion={quaternion} scale={scale as any} visible={visible}>
      {w > 0 && <mesh geometry={hull ?? geo} material={outlineMat(w)} />}
      {children}
    </mesh>
  );
};

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
