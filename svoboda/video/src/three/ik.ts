// Мини-IK для рук (цельная конечность плечо -> предплечье -> кисть) и преобразование мир <-> торс персонажа.
import * as THREE from "three";
import type { PP } from "./Person";
import { D2R } from "./util";

export interface ArmGeom {
  sx: number; // смещение плеча по x в торс-координатах (абс.)
  sy: number; // высота плеча
  l1: number; // плечо (до локтя)
  l2: number; // предплечье до центра кисти
}
/** Геометрии рук (согласованы с Arm2 в Cast.tsx: l1 = 0.2·len, l2 = 0.27·len) */
export const ARM_GEOM = {
  tony: { sx: 0.5, sy: 0.5, l1: 0.2 * 1.4, l2: 0.3 * 1.4 },
  marcus: { sx: 0.3, sy: 0.5, l1: 0.2 * 1.3, l2: 0.3 * 1.3 },
  chloe: { sx: 0.5, sy: 0.5, l1: 0.2 * 1.3, l2: 0.3 * 1.3 },
} as const;

type V3 = [number, number, number];
/** Рука: Rx(-swing)·Rz(side·abd), локоть Rx(-elbow); точка кисти в торс-координатах */
export const armFK = (g: ArmGeom, side: 1 | -1, swing: number, abd: number, elbow: number): V3 => {
  const sa = Math.sin(side * abd * D2R);
  const ca = Math.cos(side * abd * D2R);
  const sw = Math.sin(-swing * D2R);
  const cw = Math.cos(-swing * D2R);
  const se = Math.sin(-elbow * D2R);
  const ce = Math.cos(-elbow * D2R);
  // локальный вектор от плеча до кисти (в системе плеча до поворота): локоть (0,-l1,0) + Rx(-elbow)(0,-l2,0)
  const lx = 0;
  const ly = -g.l1 + (-g.l2) * ce;
  const lz2 = -g.l2 * se; // Rx(θ)(0,y,0) = (0, y cosθ, y sinθ)
  // Rz
  const x1 = lx * ca - ly * sa;
  const y1 = lx * sa + ly * ca;
  const z1 = lz2;
  // Rx(-swing)
  const y2 = y1 * cw - z1 * sw;
  const z2 = y1 * sw + z1 * cw;
  return [side * g.sx + x1, g.sy + y2, z2];
};

const dist2 = (a: V3, b: V3) => (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2;
export interface ArmAngles { swing: number; abd: number; elbow: number }
const cache = new Map<string, ArmAngles>();
/** Углы руки, при которых кисть ближе всего к target (торс-координаты). pref - предпочтительное отведение для устойчивости */
export const armIK = (g: ArmGeom, side: 1 | -1, target: V3, abdPref = 20): ArmAngles => {
  const key = `${g.sx}_${g.l1}_${side}_${target.map((v) => v.toFixed(3)).join(",")}_${abdPref}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const cost = (sw: number, ab: number, el: number) => dist2(armFK(g, side, sw, ab, el), target) + 2e-6 * (ab - abdPref) ** 2 + (el < 0 ? 0.001 * el * el : 0) + (el > 150 ? 0.001 * (el - 150) ** 2 : 0);
  let best = { sw: 0, ab: 10, el: 20, c: Infinity };
  for (let sw = -60; sw <= 200; sw += 10)
    for (let ab = -70; ab <= 160; ab += 10)
      for (let el = 0; el <= 150; el += 10) {
        const c = cost(sw, ab, el);
        if (c < best.c) best = { sw, ab, el, c };
      }
  let step = 8;
  for (let it = 0; it < 40 && step > 0.05; it++) {
    let improved = false;
    for (const [ds, da, de] of [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]] as const) {
      const c = cost(best.sw + ds * step, best.ab + da * step, best.el + de * step);
      if (c < best.c) {
        best = { sw: best.sw + ds * step, ab: best.ab + da * step, el: best.el + de * step, c };
        improved = true;
      }
    }
    if (!improved) step *= 0.5;
  }
  const out = { swing: best.sw, abd: best.ab, elbow: Math.max(0, best.el) };
  cache.set(key, out);
  return out;
};

/** Матрица торса персонажа в мире */
export const torsoMatrix = (p: PP): THREE.Matrix4 => {
  const m = new THREE.Matrix4().makeTranslation(p.x, p.y, p.z);
  m.multiply(new THREE.Matrix4().makeScale(p.scale, p.scale, p.scale));
  m.multiply(new THREE.Matrix4().makeRotationZ(p.rz * D2R));
  m.multiply(new THREE.Matrix4().makeRotationY(p.ry * D2R));
  m.multiply(new THREE.Matrix4().makeRotationX(p.rx * D2R));
  m.multiply(new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(p.tl * D2R, p.ty * D2R, p.tz * D2R, "XYZ")));
  return m;
};
export const toTorso = (p: PP, world: V3): V3 => {
  const inv = torsoMatrix(p).invert();
  const v = new THREE.Vector3(...world).applyMatrix4(inv);
  return [v.x, v.y, v.z];
};
export const fromTorso = (p: PP, local: V3): V3 => {
  const v = new THREE.Vector3(...local).applyMatrix4(torsoMatrix(p));
  return [v.x, v.y, v.z];
};
/** Мировая точка головы персонажа (центр головы) */
export const headWorld = (p: PP): V3 => fromTorso(p, [p.hdx, 0.93 + p.hdy, 0]);
