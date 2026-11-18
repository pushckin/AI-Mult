// Бумажный стиль: зерно цветной бумаги, кэш материалов и геометрий вырезанных фигур.
import * as THREE from "three";

// ---------- детерминированный ГПСЧ ----------
export function rng(seed: number) {
  let s = (seed * 2654435761) >>> 0 || 1;
  return () => {
    s ^= s << 13; s >>>= 0;
    s ^= s >> 17;
    s ^= s << 5; s >>>= 0;
    return s / 4294967296;
  };
}

// ---------- текстура зерна бумаги (светлая, умножается на цвет) ----------
let grainTex: THREE.CanvasTexture | null = null;
export function paperGrain(): THREE.CanvasTexture {
  if (grainTex) return grainTex;
  const S = 256;
  const c = document.createElement("canvas");
  c.width = S; c.height = S;
  const g = c.getContext("2d")!;
  const img = g.createImageData(S, S);
  const r = rng(7);
  for (let i = 0; i < S * S; i++) {
    const v = 232 + Math.floor(r() * 23);
    img.data[i * 4] = v; img.data[i * 4 + 1] = v; img.data[i * 4 + 2] = v; img.data[i * 4 + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  // волокна
  g.globalAlpha = 0.07;
  for (let i = 0; i < 260; i++) {
    g.strokeStyle = r() > 0.5 ? "#000" : "#fff";
    g.lineWidth = 0.6 + r();
    g.beginPath();
    const x = r() * S, y = r() * S, a = r() * Math.PI;
    g.moveTo(x, y);
    g.lineTo(x + Math.cos(a) * (6 + r() * 18), y + Math.sin(a) * (6 + r() * 18));
    g.stroke();
  }
  grainTex = new THREE.CanvasTexture(c);
  grainTex.wrapS = grainTex.wrapT = THREE.RepeatWrapping;
  grainTex.colorSpace = THREE.SRGBColorSpace;
  return grainTex;
}

// ---------- материалы ----------
const matCache = new Map<string, THREE.Material>();
export function paper(color: string, opts: { emissive?: string; emissiveIntensity?: number; opacity?: number; side?: THREE.Side; grain?: boolean } = {}): THREE.Material {
  const key = `${color}|${opts.emissive ?? ""}|${opts.emissiveIntensity ?? 0}|${opts.opacity ?? 1}|${opts.side ?? 0}|${opts.grain ?? true}`;
  let m = matCache.get(key);
  if (!m) {
    m = new THREE.MeshStandardMaterial({
      color: new THREE.Color(color),
      roughness: 0.95,
      metalness: 0,
      map: opts.grain === false ? null : paperGrain(),
      emissive: new THREE.Color(opts.emissive ?? "#000000"),
      emissiveIntensity: opts.emissiveIntensity ?? 0,
      transparent: (opts.opacity ?? 1) < 1,
      opacity: opts.opacity ?? 1,
      side: opts.side ?? THREE.FrontSide,
    });
    matCache.set(key, m);
  }
  return m;
}
// «светящийся» материал (экраны, вспышки, неон) — не зависит от освещения
const basicCache = new Map<string, THREE.Material>();
export function glow(color: string, opacity = 1): THREE.Material {
  const key = color + "|" + opacity;
  let m = basicCache.get(key);
  if (!m) {
    m = new THREE.MeshBasicMaterial({ color: new THREE.Color(color), transparent: opacity < 1, opacity, depthWrite: opacity >= 1, toneMapped: false });
    basicCache.set(key, m);
  }
  return m;
}

// ---------- 2D-контуры ----------
export type Pt = [number, number];
export function roundedRectShape(w: number, h: number, r: number): THREE.Shape {
  const s = new THREE.Shape();
  const x = -w / 2, y = -h / 2;
  r = Math.min(r, w / 2, h / 2);
  s.moveTo(x + r, y);
  s.lineTo(x + w - r, y);
  s.quadraticCurveTo(x + w, y, x + w, y + r);
  s.lineTo(x + w, y + h - r);
  s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  s.lineTo(x + r, y + h);
  s.quadraticCurveTo(x, y + h, x, y + h - r);
  s.lineTo(x, y + r);
  s.quadraticCurveTo(x, y, x + r, y);
  return s;
}
export function ellipseShape(rx: number, ry: number, a0 = 0, a1 = Math.PI * 2): THREE.Shape {
  const s = new THREE.Shape();
  if (a1 - a0 < Math.PI * 2 - 1e-6) s.moveTo(0, 0);
  s.absellipse(0, 0, rx, ry, a0, a1, false, 0);
  return s;
}
export function polyShape(pts: Pt[], round = 0): THREE.Shape {
  const s = new THREE.Shape();
  if (round <= 0) {
    s.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) s.lineTo(pts[i][0], pts[i][1]);
    s.closePath();
    return s;
  }
  // скруглённые углы: от середины ребра к середине ребра через вершину
  const n = pts.length;
  const mid = (a: Pt, b: Pt, k: number): Pt => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k];
  const start = mid(pts[0], pts[1], 0.5);
  s.moveTo(start[0], start[1]);
  for (let i = 1; i <= n; i++) {
    const p = pts[i % n], prev = pts[(i - 1) % n], next = pts[(i + 1) % n];
    const lenA = Math.hypot(p[0] - prev[0], p[1] - prev[1]);
    const lenB = Math.hypot(next[0] - p[0], next[1] - p[1]);
    const a = mid(p, prev, Math.min(0.5, round / lenA));
    const b = mid(p, next, Math.min(0.5, round / lenB));
    s.lineTo(a[0], a[1]);
    s.quadraticCurveTo(p[0], p[1], b[0], b[1]);
  }
  s.closePath();
  return s;
}

// ---------- кэш экструдированных геометрий («толщина картона») ----------
const geoCache = new Map<string, THREE.BufferGeometry>();
export function cutGeo(key: string, make: () => THREE.Shape | THREE.Shape[], depth = 0.03): THREE.BufferGeometry {
  const k = key + "|" + depth;
  let g = geoCache.get(k);
  if (!g) {
    g = new THREE.ExtrudeGeometry(make(), { depth, bevelEnabled: true, bevelThickness: depth * 0.25, bevelSize: Math.min(0.006, depth * 0.2), bevelSegments: 1, curveSegments: 24 });
    // UV под зерно: плоские координаты контура в масштабе
    const uv = g.attributes.uv as THREE.BufferAttribute;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * 1.6, uv.getY(i) * 1.6);
    g.translate(0, 0, -depth / 2);
    geoCache.set(k, g);
  }
  return g;
}
export const geo = {
  rrect: (w: number, h: number, r: number, depth = 0.03) => cutGeo(`rr${w.toFixed(3)}_${h.toFixed(3)}_${r.toFixed(3)}`, () => roundedRectShape(w, h, r), depth),
  ellipse: (rx: number, ry: number, depth = 0.03) => cutGeo(`el${rx.toFixed(3)}_${ry.toFixed(3)}`, () => ellipseShape(rx, ry), depth),
  arc: (rx: number, ry: number, a0: number, a1: number, depth = 0.03) => cutGeo(`ar${rx.toFixed(3)}_${ry.toFixed(3)}_${a0.toFixed(3)}_${a1.toFixed(3)}`, () => ellipseShape(rx, ry, a0, a1), depth),
  poly: (key: string, pts: Pt[], round = 0, depth = 0.03) => cutGeo(`po${key}_${round}`, () => polyShape(pts, round), depth),
};

// ---------- текстура с надписью/рисунком (канвас) ----------
const texCache = new Map<string, THREE.CanvasTexture>();
export function canvasTex(key: string, w: number, h: number, draw: (g: CanvasRenderingContext2D, w: number, h: number) => void): THREE.CanvasTexture {
  let t = texCache.get(key);
  if (!t) {
    const c = document.createElement("canvas");
    c.width = w; c.height = h;
    const g = c.getContext("2d")!;
    draw(g, w, h);
    t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 4;
    texCache.set(key, t);
  }
  return t;
}
export const FONT = '"Inter Display", "Inter", "DejaVu Sans", sans-serif';
