// Непрерывная анимация для сцены 1 (60 fps): монотонные сплайны (PCHIP), интерполяция поз, гладкий шум.
// Время везде - непрерывный «кадр24» (float): секунды = f24 / 24. Ступеней/холдов нет.
import type { PP } from "./Person";
import { clamp, lerp } from "./util";

export const sstep = (t: number) => {
  const c = clamp(t);
  return c * c * (3 - 2 * c);
};

// ---------- PCHIP: монотонный кубический Эрмит (без перелётов, с мягкими остановками в экстремумах) ----------
const slopes = (xs: number[], ys: number[]): number[] => {
  const n = xs.length;
  const h: number[] = [];
  const d: number[] = [];
  for (let i = 0; i < n - 1; i++) {
    h.push(xs[i + 1] - xs[i]);
    d.push((ys[i + 1] - ys[i]) / (h[i] || 1e-6));
  }
  const m: number[] = new Array(n).fill(0);
  if (n === 1) return m;
  m[0] = d[0];
  m[n - 1] = d[n - 2];
  for (let i = 1; i < n - 1; i++) {
    if (d[i - 1] * d[i] <= 0) m[i] = 0;
    else {
      const w1 = 2 * h[i] + h[i - 1];
      const w2 = h[i] + 2 * h[i - 1];
      m[i] = (w1 + w2) / (w1 / d[i - 1] + w2 / d[i]);
    }
  }
  return m;
};
const hermite = (xs: number[], ys: number[], m: number[], x: number) => {
  const n = xs.length;
  if (x <= xs[0]) return ys[0];
  if (x >= xs[n - 1]) return ys[n - 1];
  let i = 0;
  while (i < n - 2 && x > xs[i + 1]) i++;
  const h = xs[i + 1] - xs[i];
  const t = (x - xs[i]) / h;
  const t2 = t * t;
  const t3 = t2 * t;
  return (2 * t3 - 3 * t2 + 1) * ys[i] + (t3 - 2 * t2 + t) * h * m[i] + (-2 * t3 + 3 * t2) * ys[i + 1] + (t3 - t2) * h * m[i + 1];
};

type Pts = ReadonlyArray<readonly [number, number]>;
const curveCache = new WeakMap<object, { xs: number[]; ys: number[]; m: number[] }>();
/** Гладкая кривая через точки [f, значение] (PCHIP) */
export const curve = (f: number, pts: Pts): number => {
  let c = curveCache.get(pts);
  if (!c) {
    const xs = pts.map((p) => p[0]);
    const ys = pts.map((p) => p[1]);
    c = { xs, ys, m: slopes(xs, ys) };
    curveCache.set(pts, c);
  }
  return hermite(c.xs, c.ys, c.m, f);
};

// ---------- позы ----------
/** Дискретные поля (форма рта, глаза и т.п.) не смешиваем: берётся значение действующего ключа */
export const DISCRETE = new Set<string>(["mouth", "eyeL", "eyeR", "acc", "tear", "hl", "hr", "hp", "sir", "pl", "sw"]);
export interface KeyPose {
  f: number;
  pose: PP;
}
interface Prep {
  xs: number[];
  ys: Record<string, number[]>;
  ms: Record<string, number[]>;
  num: string[];
  disc: string[];
}
const poseCache = new WeakMap<object, Prep>();
const prep = (keys: ReadonlyArray<KeyPose>): Prep => {
  let p = poseCache.get(keys);
  if (p) return p;
  const xs = keys.map((k) => k.f);
  const all = Object.keys(keys[0].pose);
  const num = all.filter((k) => !DISCRETE.has(k));
  const disc = all.filter((k) => DISCRETE.has(k));
  const ys: Record<string, number[]> = {};
  const ms: Record<string, number[]> = {};
  for (const k of num) {
    ys[k] = keys.map((kp) => (kp.pose as unknown as Record<string, number>)[k]);
    ms[k] = slopes(xs, ys[k]);
  }
  p = { xs, ys, ms, num, disc };
  poseCache.set(keys, p);
  return p;
};
/** Поза в момент f: числа - PCHIP по ключам, дискретные поля - значение последнего ключа. lag - запаздывание поля в кадрах24 (follow-through). */
export const splinePose = (keys: ReadonlyArray<KeyPose>, f: number, lag?: Readonly<Record<string, number>>): PP => {
  const p = prep(keys);
  const out: Record<string, number> = {};
  for (const k of p.num) out[k] = hermite(p.xs, p.ys[k], p.ms[k], f - (lag?.[k] ?? 0));
  let idx = 0;
  for (let i = 0; i < keys.length; i++) if (keys[i].f <= f) idx = i;
  for (const k of p.disc) out[k] = (keys[idx].pose as unknown as Record<string, number>)[k];
  return out as unknown as PP;
};
/** Смешать две позы: числа линейно, дискретные - по порогу w>0.5 */
export const mixPose = (a: PP, b: PP, w: number): PP => {
  if (w <= 0) return a;
  if (w >= 1) return b;
  const out: Record<string, number> = {};
  const A = a as unknown as Record<string, number>;
  const B = b as unknown as Record<string, number>;
  for (const k of Object.keys(A)) out[k] = DISCRETE.has(k) ? (w > 0.5 ? B[k] : A[k]) : lerp(A[k], B[k], w);
  return out as unknown as PP;
};

// ---------- гладкий шум и циклы ----------
/** -1..1, непрерывный, период ~6-17 кадров24 */
export const snoise = (f: number, seed = 1) =>
  (Math.sin(f * 0.61 + seed * 7.13) + 0.8 * Math.sin(f * 0.37 + seed * 3.31) + 0.5 * Math.sin(f * 0.93 + seed * 1.93)) / 2.3;
/** Периодический Catmull-Rom по значениям одного цикла; u - фаза в элементах (целая часть - номер значения) */
export const loopCR = (vals: ReadonlyArray<number>, u: number) => {
  const n = vals.length;
  const i = Math.floor(u);
  const t = u - i;
  const g = (k: number) => vals[((k % n) + n) % n];
  const p0 = g(i - 1), p1 = g(i), p2 = g(i + 1), p3 = g(i + 2);
  return 0.5 * (2 * p1 + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t * t + (-p0 + 3 * p1 - 3 * p2 + p3) * t * t * t);
};
