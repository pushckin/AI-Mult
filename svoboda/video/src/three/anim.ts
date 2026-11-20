// Анимация сцены 1 как функции кадра. Все позы - на двойках (hold), жёсткие смены.
import { PP, PPatch, mixP } from "./Person";
import * as S from "../data/scene1";
import { clamp, hold, holdKeys, hash, jitter, lerp, remap } from "./util";

export const GS = 1.5; // масштаб Грега
export const GZ = 0.42; // глубина Грега
const STAND_Y = 0.43 * GS;
export const LIE_X = 0.5;
export const STAND_X = -0.45;
export const HIT_X = -1.0;

const G = (o: PPatch = {}): PP => mixP({ scale: GS, z: GZ, y: STAND_Y, x: 0, ry: 72, eyeR: 2 }, o);

// ---------------- Фаза 1: бредёт по тротуару (0-167) ----------------
const walkX = (f: number) => -2.0 + 0.027 * Math.floor(Math.min(f, 150) / 4);

/** Куда смотрит/что делает: [от, до, заплатка] */
const WALK_LOOKS: ReadonlyArray<readonly [number, number, PPatch]> = [
  [0, 14, { hy: -26, hx: 2 }],
  [14, 30, { hy: -10, hx: -26, eyeL: 1, eyeR: 1, brow: 1 }], // смотрит вверх на байк
  [30, 44, { hy: -30, hx: 6, mouth: 3 }],
  [44, 58, { hy: -4, hx: -22, eyeL: 1, brow: 0.6 }],
  [58, 74, { hy: -28, hx: 4 }],
  [74, 90, { hy: -14, hx: -28, eyeL: 1, eyeR: 1, mouth: 1 }],
  [90, 108, { hy: -34, hx: 6, eyeR: 3 }], // «морщится»
  [108, 124, { hy: -6, hx: -20, eyeL: 1, brow: 0.8 }],
  [124, 140, { hy: -30, hx: 4, mouth: 3 }],
];
export const gregFlinch = (f: number) => {
  for (const [ef, ex] of EXPLOSIONS) {
    if (f >= ef && f < ef + 7 && Math.abs(ex - walkX(f)) < 2.3) return true;
  }
  return false;
};

// ---------------- Ракеты и цели ----------------
const RAW_TARGETS: ReadonlyArray<readonly [number, number, number]> = [
  [-2.6, 2.0, -2.0], [1.8, 1.1, -2.0], [-1.2, 0.1, -1.2], [3.6, 2.6, -2.0], [-4.2, 1.5, -2.0], [5.0, 0.3, -1.0], [0.4, 2.8, -2.0],
  [-2.2, 0.2, -1.0], [4.4, 1.7, -2.0], [-3.0, 3.0, -2.0], [2.6, 0.2, -1.0], [1.0, 1.8, -2.0], [-0.6, 2.4, -2.0],
];
/** взрывы ниже вывесок: y в диапазон 0.2-1.5 */
export const TARGETS: ReadonlyArray<readonly [number, number, number]> = RAW_TARGETS.map(([x, y, z]) => [x, 0.15 + 0.45 * y, z] as const);
export const FIRE_FRAMES = TARGETS.map((_, i) => 8 + 12 * i);
export const ROCKET_DUR = 14;
const EXPLOSIONS: ReadonlyArray<readonly [number, number]> = TARGETS.map((t, i) => [FIRE_FRAMES[i] + ROCKET_DUR, t[0]] as const);
export const explosionAt = (i: number) => ({ f: FIRE_FRAMES[i] + ROCKET_DUR, at: TARGETS[i] as readonly [number, number, number] });

// ---------------- Грег ----------------
interface FK extends PPatch {
  f: number;
  alt?: PPatch;
  px?: number;
  py?: number;
}
const FL = (f: number, o: PPatch, alt: PPatch = {}): FK => ({ f, mouth: 1, eyeL: 1, eyeR: 1, brow: 1, ...o, alt });
/** Полёт: жёсткие позы (кувырок против часовой, 450 градусов), дальше - плюх на спину */
export const FLIGHT_KEYS: FK[] = [
  FL(S.HIT_FRAME, { rz: 4, ry: -58, tl: 38, alx: 70, arx: 70, ale: 60, are: 60, llx: -30, lrx: -50, llk: 40, lrk: 20, hx: 20, hy: -10, cup: 20 }, { tl: 44, hx: 26, llx: -36, alx: 82 }),
  FL(176, { rz: 28, ry: -58, tl: 50, alx: 100, arx: 90, ale: 40, are: 50, llx: 20, lrx: 40, llk: 60, lrk: 40, hx: 28, hy: -14 }, { tl: 38, llx: 34, hx: 18, ale: 70 }),
  FL(190, { rz: 78, ry: -46, tl: 10, alx: 160, arx: 150, ale: 10, are: 10, llx: 40, lrx: 10, llk: 10, lrk: 70, hx: -10, hy: -20, mouth: 2 }, { tl: -10, alx: 130, llx: 70, lrx: 30, hx: -24 }),
  FL(206, { rz: 150, ry: -30, tl: 0, alx: 150, arx: 160, ale: 30, are: 10, llx: -50, lrx: 50, llk: 20, lrk: 20, hx: -22, hy: 12, mouth: 2 }, { llx: -70, lrx: 20, alx: 120, arx: 175, hx: -10 }),
  FL(222, { rz: 215, ry: -12, tl: -14, alx: 110, arx: 130, ale: 50, are: 40, llx: 60, lrx: -40, llk: 10, lrk: 60, hx: 20, hy: -16 }, { llx: 40, lrx: -60, alx: 140, arx: 100 }),
  FL(246, { rz: 290, ry: 20, rx: -14, tl: 12, alx: 90, arx: 140, ale: 20, are: 20, llx: 20, lrx: 70, llk: 50, lrk: 20, hx: 10, hy: 8, mouth: 2 }, { llx: 50, lrx: 40, alx: 130, arx: 100, hy: -8 }),
  FL(268, { rz: 360, ry: 50, rx: -40, tl: 20, alx: 130, arx: 90, ale: 30, are: 20, llx: 10, lrx: 40, llk: 30, lrk: 60, hx: -10, hy: -40 }, { alx: 100, arx: 130, llx: 30, hx: 0 }),
  FL(282, { rz: 360, ry: 70, rx: -58, tl: 10, alx: 140, arx: 120, ale: 20, are: 40, llx: 20, lrx: 50, llk: 40, lrk: 20, hx: 0, hy: -50, mouth: 2 }, { alx: 110, arx: 150, llx: 50, hx: 10 }),
  FL(290, { rz: 360, ry: 86, rx: -84, tl: 0, alx: 120, arx: 130, ale: 10, are: 20, llx: 10, lrx: 30, llk: 10, lrk: 10, hx: 0, hy: -70, mouth: 1 }, { alx: 90, arx: 100 }),
];
export const flightPos = (f: number) => {
  const F0 = S.FLIGHT_FROM;
  const t = clamp((Math.min(S.LAND_FRAME - 1, F0 + Math.floor((f - F0) / 4) * 4) - F0) / (S.LAND_FRAME - 1 - F0));
  const x = lerp(HIT_X + 0.55, LIE_X + 0.1, 1 - Math.pow(1 - t, 2.4));
  const APEX_T = 0.22;
  const y = t < APEX_T ? lerp(1.5, 3.1, 1 - Math.pow(1 - t / APEX_T, 2)) : lerp(3.1, 0.5, Math.pow((t - APEX_T) / (1 - APEX_T), 2));
  return { x, y, z: GZ + 0.35 * Math.sin(t * Math.PI) };
};
/** Контакт с машиной: 3 жёстких кадра (168, 170, 172) */
const CONTACT: ReadonlyArray<readonly [number, number]> = [[HIT_X, 0.82], [HIT_X + 0.2, 0.98], [HIT_X + 0.4, 1.2]];
/** Полёт: ключевая поза держится до следующего ключа (без интерполяции); каждые 4 кадра - альтернативная поза (рваный ритм) */
const flightPatch = (frame: number): PPatch => {
  const F0 = S.FLIGHT_FROM;
  const f4 = F0 + Math.floor((frame - F0) / 4) * 4;
  const k = holdKeys(f4, FLIGHT_KEYS) ?? FLIGHT_KEYS[0];
  const out: Record<string, number> = {};
  for (const key of Object.keys(k) as Array<keyof FK>) {
    if (key === "f" || key === "alt" || key === "px" || key === "py") continue;
    out[key] = k[key] as number;
  }
  return out as PPatch;
};

// Лежит на спине: rx -90, ry 90 - голова к -x
const LIE = (o: PPatch = {}): PP => mixP({ scale: GS, z: GZ - 0.05, x: LIE_X, y: 0.5, rx: -90, ry: 90, hy: -72, tl: 0, alx: 0, arx: 6, ale: 0, are: 0, llz: 6, lrz: 6, mouth: 0, eyeL: 0, eyeR: 0, ...o });
type LK = { f: number } & PPatch;
const LK_ = (f: number, o: PPatch = {}): LK => ({ f, ...o });
export const LIE_KEYS: LK[] = [
  LK_(S.LAND_FRAME, { y: 0.64, hy: -40, hx: 20, alx: 120, arx: 130, llx: 30, lrx: 40, mouth: 1, eyeL: 1, eyeR: 1, tl: 30 }),
  LK_(S.LAND_FRAME + 2, { y: 0.52, hy: -62, hx: -16, alx: 100, arx: 110, llx: 10, lrx: 20, mouth: 1, eyeL: 3, eyeR: 3 }),
  LK_(S.LAND_FRAME + 4, { y: 0.50, hy: -72, hx: 10, alx: 70, arx: 60, mouth: 1, eyeL: 3, eyeR: 3 }),
  LK_(S.LAND_FRAME + 7, { hy: -72, alx: 30, arx: 30, eyeL: 3, eyeR: 3 }),
  LK_(S.LAND_FRAME + 12, { hy: -70, hx: 4, alx: 20, arx: 20, eyeL: 3, eyeR: 3 }),
  LK_(312, { hy: -68, hx: 8, alx: 16, eyeL: 0, eyeR: 2 }),
  LK_(322, { hy: -74, alx: 40, llx: 14, eyeL: 0, eyeR: 0 }),
  LK_(330, { hy: -72, hx: -4, alx: 48, arx: 24, llx: 22, lrx: 4, mouth: 1 }),
  LK_(336, { hy: -66, alx: 30, llx: 8 }),
  LK_(346, { hy: -76, hx: 10, eyeL: 3, eyeR: 3 }),
  LK_(352, { hy: -70, alx: 6, mouth: 3 }),
  LK_(360, { hy: -64, hx: -10, arx: 34, mouth: 1, eyeL: 2 }),
  LK_(366, { hy: -72, arx: 14, lrx: 28, mouth: 0 }),
  LK_(376, { hy: -74, hx: 6, eyeR: 2 }),
  LK_(386, { hy: -68, alx: 50, llx: 16, lrx: 10 }),
  LK_(392, { hy: -76, alx: 14, llx: 0, lrx: 0, eyeL: 3 }),
  LK_(402, { hy: -62, hx: -8, arx: 40, eyeL: 0, mouth: 3 }),
  LK_(408, { hy: -72, arx: 10, mouth: 0 }),
  LK_(416, { hy: -70, alx: 24, llx: 20 }),
  LK_(S.BILLBOARD_FLIP, { hy: -50, hx: -20, alx: 100, arx: 90, llx: 30, lrx: 40, mouth: 1, eyeL: 1, eyeR: 1, tl: 20 }), // щёлкнул билборд
  LK_(S.BILLBOARD_FLIP + 4, { hy: -62, hx: 6, alx: 60, arx: 40, eyeL: 0, eyeR: 2 }),
  LK_(434, { hy: -72, alx: 30, mouth: 0 }),
  LK_(444, { hy: -66, hx: 8, arx: 28, llx: 10 }),
  LK_(452, { hy: -72, alx: 16, arx: 6, llx: 0 }),
  // пустая улица
  LK_(462, { hy: -66, hx: 10, alx: 20, llx: 8, eyeL: 0, eyeR: 0, mouth: 1 }),
  LK_(468, { hy: -74, alx: 8, llx: 0 }),
  LK_(474, { hy: -60, hx: -6, arx: 30, eyeL: 3 }),
  LK_(S.RISE_FROM, { hy: -70, hx: 0, arx: 6, eyeL: 0, eyeR: 0 }),
];
/** Подъём: (rx, ry, tl, y ...) жёсткими позами */
const RK = (f: number, o: PPatch = {}): LK => ({ f, ...o });
export const RISE_KEYS: LK[] = [
  RK(S.RISE_FROM, { hy: -70, hx: 0 }),
  RK(484, { hy: -60, hx: 24, alx: 40, tl: 8, eyeL: 0, eyeR: 2, mouth: 1 }), // голова приподнялась
  RK(488, { hy: -68, hx: 8, alx: -30, arx: -30, tl: 0, mouth: 0 }),
  RK(492, { hy: -50, hx: 26, alx: -50, arx: -45, tl: 26, y: 0.50, x: LIE_X }),
  RK(496, { hy: -40, hx: 20, alx: -62, arx: -58, tl: 52, y: 0.42 }), // садится
  RK(500, { hy: -36, hx: 14, alx: -70, arx: -64, tl: 74, y: 0.38 }),
  RK(504, { hy: -28, hx: 8, alx: -66, arx: -60, tl: 86, y: 0.38 }), // сидит
  RK(510, { hy: -30, hx: 10, alx: -50, arx: -55, tl: 88, y: 0.4, llx: 40, lrx: 50, llk: 40, lrk: 50 }), // колени
  RK(514, { rx: -80, hy: -34, hx: 8, alx: 20, arx: 30, ale: 50, are: 50, tl: 80, y: 0.4, llx: 70, lrx: 80, llk: 80, lrk: 90, llz: 14, lrz: 14, ry: 80 }),
  RK(518, { rx: -62, hy: -24, hx: 12, alx: 30, arx: 40, ale: 40, are: 50, tl: 60, y: 0.42, llx: 70, lrx: 78, llk: 78, lrk: 88, llz: 16, lrz: 16, ry: 70, x: -0.12 }),
  RK(522, { rx: -42, hy: -12, hx: 12, alx: 40, arx: 40, ale: 30, are: 60, tl: 46, y: 0.46, llx: 52, lrx: 64, llk: 60, lrk: 66, llz: 12, lrz: 12, ry: 56, x: -0.2 }),
  RK(526, { rx: -24, hy: -4, hx: 10, alx: 30, arx: 30, ale: 20, are: 70, tl: 30, y: 0.52, llx: 34, lrx: 38, llk: 30, lrk: 34, llz: 8, lrz: 8, ry: 40, x: -0.26 }),
  RK(530, { rx: -8, hy: 0, hx: 8, alx: 20, arx: 30, ale: 10, are: 70, tl: 14, y: 0.57, llx: 10, lrx: 14, llk: 6, lrk: 10, llz: 6, lrz: 6, ry: 22, x: -0.33 }),
  RK(534, { rx: 0, hy: 8, hx: 14, alx: 10, arx: 24, ale: 0, are: 74, tl: 8, y: STAND_Y, ry: 8, x: -0.4 }),
  RK(538, { rx: 0, hy: -8, hx: 6, alx: 8, arx: 20, ale: 0, are: 78, tl: 4, y: STAND_Y, ry: 2, x: STAND_X, eyeR: 2 }),
  RK(542, { hy: 6, hx: 8, tl: 6, alx: 12, arx: 22, are: 80, ry: 46, x: STAND_X }), // отворачивается: плечо к зрителю
  RK(546, { hy: -26, hx: 8, tl: 12, tz: 8, alx: 22, alz: 14, arx: 24, are: 80, ry: 46 }), // плечо: голова на плечо
  RK(550, { hy: -30, hx: 10, tl: 16, tz: 14, alx: 34, alz: 18, ale: 20, arx: 24, are: 80, ry: 46 }),
  RK(S.SHOULDER_FRAME, { hy: 26, hx: -4, tl: 30, tz: -14, alx: -118, alz: 44, ale: 0, arx: 24, are: 80, mouth: 1, eyeL: 1, eyeR: 1, brow: 1, ry: 0 }), // РЫВОК к камере
  RK(554, { hy: -18, hx: -8, tl: -16, tz: 4, alx: 150, alz: 34, mouth: 1, ry: 0 }),
  RK(556, { hy: 0, hx: 0, tl: 0, tz: 0, alx: 6, alz: 8, mouth: 0, ry: 0 }),
  RK(S.HEADJERK_FRAME, { hy: -44, hx: 4, tl: -4, alx: 6, mouth: 1 }),
  RK(560, { hy: 36, hx: -4, tl: 4, alx: 5, mouth: 0 }),
  RK(562, { hy: -8, hx: 2, tl: 0, mouth: 0 }),
  RK(564, { hy: 4, hx: 26, tl: 16, alx: 4 }),
  RK(S.SPIT_FRAME, { hy: 14, hx: 22, tl: 12, mouth: 1 }),
  RK(S.SPIT_FRAME + 3, { hy: 4, hx: 6, tl: 4, mouth: 0 }),
  RK(572, { hy: -4, hx: 8, tl: 0 }),
  RK(576, { hy: 4, hx: 4, tl: 0 }),
  RK(580, { hy: 4, hx: -10, tl: -4 }), // начинает смотреть вверх: ступенями
  RK(584, { hy: 0, hx: -20, tl: -8 }),
  RK(588, { hy: -4, hx: -28, tl: -10 }),
  RK(594, { hy: -6, hx: -32, tl: -12 }),
  RK(600, { hy: -8, hx: -34, tl: -12 }),
];
/** Шёпот: покачивания каждые 6 кадров [tl, hx, alx, hdx] */
const SWAY: ReadonlyArray<readonly [number, number, number, number]> = [[0, 0, 0, 0], [-3, -3, 4, 0.02], [3, 3, -3, -0.02], [-2, 5, 5, 0.01], [3, -4, -4, -0.01], [-4, 4, 3, 0.03]];

export const gregPose = (frame: number): PP => {
  const f = hold(frame);
  // ---- 0..167 ----
  if (frame < S.HIT_FRAME) {
    const ph = Math.floor(f / 4) % 2;
    const look = WALK_LOOKS.find(([a, b]) => f >= a && f < b)?.[2] ?? {};
    const turning = f >= 140;
    const ryK: Array<[number, number]> = [[0, 72], [138, 72], [142, 48], [146, 22], [150, 0], [154, -22], [158, -40], [162, -54], [168, -58]];
    const ry = remap(hold(f, 4) === f ? f : hold(f, 2), ryK);
    const walking = !turning && !gregFlinch(f);
    const wl = walking ? { llx: ph ? 24 : -24, lrx: ph ? -24 : 24, llk: ph ? 0 : 12, lrk: ph ? 12 : 0, alx: ph ? -16 : 16, arx: 30 + (ph ? 4 : -4), are: 78, tz: ph ? 2.5 : -2.5, tl: 4, y: STAND_Y + (ph ? 0.025 : 0) } : {};
    let p = G({ x: turning ? walkX(150) : walkX(f), ry: turning ? ry : 72, arx: 30, are: 78, ...wl, ...look });
    if (gregFlinch(f)) p = { ...p, tl: 18, alx: 70, alz: 34, arx: 60, arz: 24, are: 90, hx: 14, eyeL: 1, eyeR: 1, mouth: 1, brow: 1, hy: -20, llx: 8, lrx: -6, ry: 60 };
    if (turning && f >= 150) p = { ...p, hy: ry < -20 ? 18 : -10, eyeL: 1, eyeR: 1, mouth: f >= 158 ? 1 : 0, brow: 1, tl: -4, alx: 20, arx: 44, are: 86, llx: 6, lrx: -4, cup: ((f / 2) % 2) * 6 - 3 };
    if (turning && f < 150) p = { ...p, hy: -20, eyeL: 1 };
    return p;
  }
  // ---- удар и полёт ----
  if (frame < S.LAND_FRAME) {
    if (frame < S.FLIGHT_FROM) {
      const ci = Math.min(2, Math.floor((frame - S.HIT_FRAME) / 2));
      const { f: _kf, alt, px, py, ...patch } = FLIGHT_KEYS[0];
      void _kf; void px; void py;
      const [cx, cy] = CONTACT[ci];
      const jt = ci === 1 ? alt : {};
      return G({ ...patch, ...jt, x: cx, y: cy, z: GZ, rx: 0, tl: patch.tl! + ci * 6 });
    }
    const patch = flightPatch(frame);
    const odd = Math.floor((frame - S.FLIGHT_FROM) / 4) % 2 === 1;
    const k = holdKeys(frame, FLIGHT_KEYS) ?? FLIGHT_KEYS[0];
    const pos = flightPos(f);
    const rzJ = odd ? 16 : 0;
    return G({ ...patch, ...(odd ? k.alt : {}), rz: (patch.rz ?? 0) + rzJ, cs: 2.1, x: pos.x + (odd ? 0.04 : 0), y: pos.y + (odd ? 0.06 : 0), z: pos.z, rx: patch.rx ?? 0 });
  }
  // ---- лежит и встаёт ----
  if (frame < S.RISE_FROM) {
    const k = holdKeys(frame, LIE_KEYS) ?? LIE_KEYS[0];
    const { f: _f, ...patch } = k;
    void _f;
    let p = LIE(patch);
    if (frame >= S.LAND_FRAME + 14) {
      // дрожь на двойках: нет паузы без изменений
      const j = (s: number, a: number) => jitter(frame, s, 2) * a;
      p = { ...p, hy: p.hy + j(1, 2.5), hx: p.hx + j(2, 2), alx: p.alx + j(3, 4), llx: p.llx + j(4, 3), arx: p.arx + j(5, 3), lrx: p.lrx + j(6, 3) };
      // крупное шевеление раз в 14 кадров (4 кадра держится): голова, нога, рука, спина
      const t = frame - (S.LAND_FRAME + 18);
      if (t >= 0 && !(frame >= S.BILLBOARD_FLIP - 2 && frame < S.BILLBOARD_FLIP + 8)) {
        const e = Math.floor(t / 14);
        const on = t % 14 < 4;
        const sgn = e % 2 ? 1 : -1;
        if (on) {
          const ty = e % 4;
          if (ty === 0) p = { ...p, hy: p.hy + 30, hx: p.hx + 22 * sgn, y: p.y + 0.05 };
          else if (ty === 1) p = { ...p, llx: p.llx + 55, llk: 45, lrx: p.lrx + 15 };
          else if (ty === 2) p = { ...p, alx: p.alx + 70, ale: 40, arx: p.arx + 40 };
          else p = { ...p, tl: p.tl + 22, y: p.y + 0.09, hy: p.hy + 12, lrx: p.lrx + 40 };
        }
      }
    }
    return p;
  }
  const rk = holdKeys(frame, RISE_KEYS) ?? RISE_KEYS[0];
  const { f: _g, ...rpatch } = rk;
  void _g;
  // до 510 лежит/сидит (LIE-основа), после - стоячая основа
  let p: PP = frame < 514 ? LIE(rpatch) : G({ ry: 0, x: remap(f, [[514, LIE_X - 0.3], [538, STAND_X]]), arx: 24, are: 80, alz: 8, ...rpatch });
  if (frame >= 514 && frame < 538) p = { ...p, scale: GS, z: GZ + 0.04 - (frame - 514) * 0.0006 };
  if (frame >= 538) p = { ...p, z: GZ + 0.04 };
  // тик глаза
  if (frame >= 626 && Math.floor(f / 2) % 15 === 7) p = { ...p, eyeL: 2, eyeR: 3, brow: -1 };
  if (frame >= S.GREG_LINE.from && frame < S.GREG_LINE.to) {
    const k0 = f - S.GREG_LINE.from;
    const e = S.VOICE_ENV[k0] ?? 0;
    const pv = S.VOICE_ENV[k0 - 2] ?? 0;
    const nx = S.VOICE_ENV[k0 + 2] ?? 0;
    let m = e >= 0.45 ? 2 : e >= 0.1 ? 1 : 0;
    if (m && e <= pv && e <= nx && e < 0.75 * Math.max(pv, nx)) m = 0; // рот закрывается между слогами
    p = { ...p, mouth: m, hx: p.hx + (m === 2 ? 3 : 0) };
  }
  if (frame >= 604) {
    const w = SWAY[Math.floor((f - 604) / 6) % SWAY.length];
    p = { ...p, tl: p.tl + w[0], hx: p.hx + w[1], alx: p.alx + w[2], hdx: p.hdx + w[3] };
  }
  if (frame >= 566 && frame < 600 && frame % 12 < 2) p = { ...p, eyeR: 3 };
  return p;
};

// ---------------- Суперкар ----------------
export const CAR_Z = -0.2;
export const CAR_SCALE = 1.05;
const XO = 2.15 * 0.93 - 2.15 * CAR_SCALE; // нос машины в момент удара там же, где в v6
const LANE = 1.25; // тротуар у бордюра (впереди Грега)
/** сжатие машины по глубине: у бордюра тоньше, чтобы не пересекаться с Грегом */
export const carZScale = (z: number) => lerp(0.85, 0.5, clamp((z - CAR_Z) / (LANE - CAR_Z)));
export interface CarSt { on: boolean; x: number; z: number; yaw: number; dy: number; pitch: number; spin: number; fast: boolean; braking: boolean }
const R = (arr: Array<[number, number]>, f: number) => remap(f, arr);
export const carState = (frame: number): CarSt => {
  const f = hold(frame);
  if (f >= S.VANISH_FRAME) return { on: false, x: 0, z: 0, yaw: 0, dy: 0, pitch: 0, spin: 0, fast: false, braking: false };
  let x = 0, z = LANE, yaw = 0, dy = 0, pitch = 0, fast = false, braking = false, on = true;
  if (f >= 10 && f <= 46) { x = R([[10, 13], [46, -13]], f); yaw = 180; fast = true; }
  else if (f >= 54 && f <= 90) { x = R([[54, -13], [90, 13]], f); fast = true; }
  else if (f >= 96 && f <= 128) { x = R([[96, 13], [128, -13]], f); yaw = 180; fast = true; }
  else if (f >= 134 && f < S.HIT_FRAME) {
    x = R([[134, -21], [146, -11.5], [154, -7.4], [160, -5.4], [164, -4.4], [S.HIT_FRAME - 1, -3.6]], f);
    z = R([[134, LANE], [152, LANE], [156, 0.9], [160, 0.5], [163, 0.1], [165, CAR_Z], [S.HIT_FRAME - 1, CAR_Z]], f);
    yaw = R([[134, 0], [152, 0], [156, 10], [160, 14], [163, 8], [165, 2], [S.HIT_FRAME - 1, 0]], f);
    dy = f >= 158 && f < 166 ? ([0.18, 0.05, 0.12, 0][Math.floor((f - 158) / 2)] ?? 0) : 0;
    fast = true;
    x += XO * clamp((f - 150) / 14);
  } else if (f >= S.HIT_FRAME) {
    z = CAR_Z;
    x = XO + R([[S.HIT_FRAME, -3.55], [S.FLIGHT_FROM - 1, -3.3], [186, -2.8], [206, -1.4], [230, 1.2], [254, 2.6], [276, 3.2], [S.LAND_FRAME, 3.35], [1000, 3.35]], f);
    braking = f > 228 && f < S.LAND_FRAME;
    pitch = braking ? (Math.floor(f / 2) % 2 ? -3.2 : -1.6) : f >= S.FLIGHT_FROM && f < 230 ? 1.2 : 0;
    if (f >= S.HIT_FRAME && f < S.FLIGHT_FROM) { dy = Math.floor(f / 2) % 2 ? 0.05 : 0; pitch = -3; }
    yaw = braking ? (Math.floor(f / 2) % 2 ? 3 : 1) : 0;
  } else on = false;
  if (!on) return { on, x, z, yaw, dy, pitch, spin: 0, fast, braking };
  const dir = Math.abs(yaw) > 100 ? -1 : 1;
  const spin = (x * dir * 360) / (2 * Math.PI * 0.4);
  return { on, x, z, yaw, dy, pitch, spin: spin * (dir === -1 ? -1 : 1), fast, braking };
};

/** Поза пришельца в кабине (в системе координат машины) */
export const alienPose = (frame: number): PP => {
  const f = hold(frame);
  const bob = carState(frame).fast ? (Math.floor(f / 2) % 2 ? 0.03 : 0) : 0;
  let o: PPatch = { y: 0.93 + bob };
  if (f < S.HIT_FRAME) o = { ...o, mouth: f % 24 < 6 ? 1 : 0, hy: f > 120 ? -8 : 0, tl: carState(frame).fast ? 6 : 0 };
  else if (f < S.FLIGHT_FROM) o = { ...o, y: 1.0, alx: 170, arx: 170, ale: 0, are: 0, mouth: 1, hx: -10, hy: -30, tl: -10 }; // подпрыгнул, руки вверх
  else if (f < 206) o = { ...o, alx: 120, arx: 130, ale: 20, are: 20, mouth: 1, hy: -62, hx: -14, tl: -6 };
  else if (f < S.LAND_FRAME) o = { ...o, alx: f % 8 < 4 ? 70 : 90, arx: f % 8 < 4 ? 80 : 60, ale: 40, are: 40, mouth: 1, hy: -72, hx: -24, tl: -8 };
  else if (f < 330) o = { ...o, alx: 40, arx: 40, ale: 60, are: 60, mouth: 1, hy: -76, hx: -6, tl: 4 };
  else {
    const t = Math.floor((f - 330) / 14) % 4;
    o = { ...o, alx: 40, arx: 40, ale: 60, are: 60, mouth: t === 1 ? 1 : 0, hy: -78 + (t === 2 ? 6 : 0), hx: -4 + (t === 3 ? -6 : 0), tl: 2, alz: 24 + t * 3, arz: 24 + t * 3 };
  }
  return mixP({ x: -0.15, z: 0, ry: 90, scale: 0.88, llx: 88, lrx: 88, llk: 88, lrk: 88, llz: 6, lrz: 6, alx: 52, arx: 52, ale: 24, are: 24, alz: 18, arz: 18, eyeL: 0, eyeR: 0 }, o);
};

// ---------------- Байк ----------------
// Летает в верхней части неба слева направо и обратно (дугами); два пролёта «за билбордом» (z<-5, билборд его закрывает, а не наоборот).
type BK = readonly [number, number, number, number, number];
const LOOP: ReadonlyArray<BK> = [
  [0, -5.3, 4.5, -2.0, 0], [14, -4.4, 4.9, -2.0, 0], [28, -2.6, 5.1, -2.2, 0], [34, -1.8, 5.1, -2.4, 0],
  [38, -1.6, 5.1, -2.5, 180], [64, -4.6, 4.6, -2.0, 180], [72, -5.3, 4.4, -2.0, 180], [76, -5.3, 4.4, -2.0, 0],
];
const buildBikeKeys = (): BK[] => {
  const ks: BK[] = [];
  const add = (b: number, l: ReadonlyArray<BK>) => l.forEach(([f, x, y, z, yw]) => ks.push([b + f, x, y, z, yw]));
  add(0, LOOP); // 0-76
  // второй пролёт (78-170), весь в центре кадра
  add(78, [[0, -5.3, 4.4, -2.0, 0], [10, -4.4, 4.8, -2.0, 0], [20, -2.6, 5.0, -2.2, 0], [28, -1.8, 5.1, -2.4, 0], [29, -1.6, 5.1, -2.4, 180],
    [40, -2.4, 4.9, -2.2, 180], [60, -4.6, 4.6, -2.0, 180], [72, -5.3, 4.4, -2.0, 180], [76, -5.3, 4.4, -2.0, 0], [93, -5.3, 4.4, -2.0, 0]]);
  for (let b = 172; b < 520; b += 77) add(b, LOOP);
  return ks.sort((a, b) => a[0] - b[0]);
};
const BIKE_K = buildBikeKeys();
export interface BikeSt { x: number; y: number; z: number; yaw: number; roll: number; pitch: number; flame: number }
export const bikeState = (frame: number): BikeSt => {
  const f = hold(frame);
  const ch = (idx: number) => remap(f, BIKE_K.map((k) => [k[0], k[idx]] as [number, number]));
  const x = ch(1);
  const y = ch(2);
  const z = ch(3);
  const yawBase = ch(4);
  const odd = Math.floor(f / 2) % 2;
  const yaw = yawBase + (yawBase % 180 === 0 ? Math.sin(f * 0.11) * 16 : 0);
  const yawN = remap(f + 4, BIKE_K.map((k) => [k[0], k[4]] as [number, number]));
  const turning = Math.abs(yawN - yawBase) > 6;
  const roll = (turning ? 22 : 0) + (odd ? 6 : -6) + Math.sin(f * 0.21) * 4;
  const bob = Math.sin(f * 0.37) * 0.14 + (odd ? 0.06 : 0);
  return { x, y: y + bob - 0.9, z, yaw, roll, pitch: (odd ? 3 : -3) + Math.sin(f * 0.13) * 4, flame: 1 + (Math.floor(f / 2) % 2) };
};
export const podHidden = (frame: number): boolean[] => {
  const h = [false, false, false, false, false, false];
  FIRE_FRAMES.forEach((ff, i) => {
    if (frame >= ff && frame < ff + 8) h[i % 6] = true;
  });
  return h;
};

// ---------------- Статисты (бегут) ----------------
export interface ExtraDef { f0: number; f1: number; x0: number; x1: number; z: number; colorsKey: number }
export const EXTRAS: ExtraDef[] = [
  { f0: 14, f1: 44, x0: -3.2, x1: 4.2, z: 3.1, colorsKey: 0 },
  { f0: 40, f1: 70, x0: 5.2, x1: -3.5, z: -1.15, colorsKey: 1 },
  { f0: 74, f1: 104, x0: 4.4, x1: -3.2, z: 2.7, colorsKey: 2 },
  { f0: 100, f1: 134, x0: -4.5, x1: 5.5, z: -1.3, colorsKey: 0 },
];
export const extraPose = (frame: number, e: ExtraDef): PP | null => {
  const f = hold(frame);
  if (f < e.f0 || f > e.f1) return null;
  const t = (f - e.f0) / (e.f1 - e.f0);
  const dir = Math.sign(e.x1 - e.x0);
  const ph = Math.floor(f / 4) % 2;
  return mixP({
    scale: 1.0, x: lerp(e.x0, e.x1, t), z: e.z, y: 0.43 * 1.0 + (ph ? 0.07 : 0), ry: dir * 84, tl: 16,
    llx: ph ? 54 : -50, lrx: ph ? -50 : 54, llk: ph ? 0 : 50, lrk: ph ? 50 : 0, alx: ph ? -60 : 60, arx: ph ? 60 : -60, ale: 40, are: 40, alz: 20, arz: 20,
    mouth: 1, eyeL: 1, eyeR: 1, hy: -dir * 20,
  });
};

// ---------------- Камера ----------------
// Статичная: общий план (0-479) с еле заметным боковым дрейфом без зума, затем жёсткий стык на средний план (480+).
export const cameraAt = (frame: number) => {
  if (frame < S.RISE_FROM) {
    const camX = remap(frame, [[0, -1.05], [S.VANISH_FRAME, -0.4]]);
    return { camX, camY: 2.0, camZ: 9.9, tgtX: -0.65, tgtY: 3.0 };
  }
  return { camX: -0.5, camY: 1.55, camZ: 7.4, tgtX: -0.5, tgtY: 1.85 };
};
export const shakeAt = (frame: number): { x: number; y: number } => {
  const kick = (f0: number, amp: number, dur: number) => {
    const d = frame - f0;
    if (d < 0 || d > dur) return 0;
    return amp * Math.pow(1 - d / dur, 1.4);
  };
  let a = kick(S.HIT_FRAME, 0.22, 10) + kick(S.LAND_FRAME, 0.2, 10) + kick(S.SHOULDER_FRAME, 0.07, 6);
  EXPLOSIONS.forEach(([ef], i) => {
    if (i < TARGETS.length) a += kick(ef, 0.035, 5);
  });
  const n = Math.floor(frame / 2);
  return { x: (hash(n, 4) * 2 - 1) * a, y: (hash(n, 9) * 2 - 1) * a };
};
