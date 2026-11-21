// Анимация сцены 1 как функции НЕПРЕРЫВНОГО времени f (кадр24 как float: секунды = f/24). 60 fps, без квантований и холдов:
// позы - PCHIP-сплайны между ключами, циклы - синусы, тряска - затухающая синусоида. Жёсткие склейки остаются в сцене как cut.
import { PP, PPatch, mixP } from "./Person";
import * as S from "../data/scene1";
import { clamp, lerp, remap } from "./util";
import { curve, KeyPose, loopCR, mixPose, snoise, splinePose, sstep } from "./smooth";

export const GS = 1.5; // масштаб Грега
export const GZ = 0.42; // глубина Грега
const STAND_Y = 0.43 * GS;
export const LIE_X = 0.5;
export const STAND_X = -0.45;
export const HIT_X = -1.0;

const G = (o: PPatch = {}): PP => mixP({ scale: GS, z: GZ, y: STAND_Y, x: 0, ry: 72, eyeR: 2 }, o);

// ---------------- Фаза 1: бредёт по тротуару (0-167) ----------------
const walkX = (f: number) => -2.0 + (0.027 * Math.min(f, 150)) / 4;

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
/** Вес «вздрагивания» (0..1) от ближних взрывов: быстрая атака (~0.05 с), затухание ~0.15 с */
export const flinchW = (f: number) => {
  let w = 0;
  for (const [ef, ex] of EXPLOSIONS) {
    const d = f - ef;
    if (d < 0 || d >= 7 || Math.abs(ex - walkX(ef)) >= 2.3) continue;
    w = Math.max(w, sstep(d / 1.2) * (1 - sstep((d - 4) / 3)));
  }
  return w;
};

// ---------------- Ракеты и цели ----------------
export const TARGETS: ReadonlyArray<readonly [number, number, number]> = [
  [-2.6, 2.0, -2.0], [1.8, 1.1, -2.0], [-1.2, 0.1, -1.2], [3.6, 2.6, -2.0], [-4.2, 1.5, -2.0], [5.0, 0.3, -1.0], [0.4, 2.8, -2.0],
  [-2.2, 0.2, -1.0], [4.4, 1.7, -2.0], [-3.0, 3.0, -2.0], [2.6, 0.2, -1.0], [1.0, 1.8, -2.0], [-0.6, 2.4, -2.0],
];
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
  const t = clamp((f - F0) / (S.LAND_FRAME - 1 - F0));
  const x = lerp(HIT_X + 0.55, LIE_X + 0.1, 1 - Math.pow(1 - t, 2.4));
  const APEX_T = 0.22;
  const y = t < APEX_T ? lerp(1.5, 3.1, 1 - Math.pow(1 - t / APEX_T, 2)) : lerp(3.1, 0.5, Math.pow((t - APEX_T) / (1 - APEX_T), 2));
  return { x, y, z: GZ + 0.35 * Math.sin(t * Math.PI) };
};
/** Контакт с машиной (168-174): путь тела в 3 опорных точках, дальше - полёт */
const CONTACT_X: ReadonlyArray<readonly [number, number]> = [[S.HIT_FRAME, HIT_X], [S.HIT_FRAME + 2, HIT_X + 0.2], [S.HIT_FRAME + 4, HIT_X + 0.4], [S.FLIGHT_FROM, HIT_X + 0.55]];
const CONTACT_Y: ReadonlyArray<readonly [number, number]> = [[S.HIT_FRAME, 0.82], [S.HIT_FRAME + 2, 0.98], [S.HIT_FRAME + 4, 1.2], [S.FLIGHT_FROM, 1.5]];
const fkPatch = (k: FK): PPatch => {
  const { f: _f, alt: _a, px: _px, py: _py, ...patch } = k;
  void _f; void _a; void _px; void _py;
  return patch;
};
/** Ключи полёта: контакт (3 позы) + кувырок */
const FLIGHT_SPLINE: KeyPose[] = (() => {
  const base = FLIGHT_KEYS[0];
  const ks: KeyPose[] = [0, 1, 2].map((ci) => ({ f: S.HIT_FRAME + ci * 2, pose: G({ ...fkPatch(base), z: GZ, rx: 0, tl: base.tl! + ci * 6 }) }));
  FLIGHT_KEYS.slice(1).forEach((k) => ks.push({ f: k.f, pose: G(fkPatch(k)) }));
  return ks;
})();
const FLIGHT_LAG = { alx: 1.4, arx: 1.4, ale: 1.2, are: 1.2, hx: 1, hy: 1 }; // follow-through: руки и голова чуть запаздывают

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
  RK(542, { hy: 6, hx: 8, tl: 6, alx: 12, arx: 22, are: 80, ry: 0, x: STAND_X }),
  RK(546, { hy: -26, hx: 8, tl: 12, tz: 8, alx: 22, alz: 14, arx: 24, are: 80, ry: 0 }), // плечо: голова на плечо
  RK(550, { hy: -30, hx: 10, tl: 16, tz: 14, alx: 34, alz: 18, ale: 20, arx: 24, are: 80, ry: 0 }),
  RK(S.SHOULDER_FRAME, { hy: 26, hx: -4, tl: 30, tz: -12, alx: -78, alz: 30, ale: 0, arx: 24, are: 80, mouth: 1, eyeL: 1, eyeR: 1, brow: 1 }), // РЫВОК
  RK(554, { hy: -18, hx: -8, tl: -16, tz: 4, alx: 140, alz: 24, mouth: 1 }),
  RK(556, { hy: 0, hx: 0, tl: 0, tz: 0, alx: 6, alz: 8, mouth: 0 }),
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
// Ключи лёжа/подъёма как полные позы (для сплайна). До 514 - лёжачая основа, дальше - стоячая.
const riseBase = (f: number, patch: PPatch): PP => {
  if (f < 514) return LIE(patch);
  const p = G({ ry: 0, x: remap(f, [[514, LIE_X - 0.3], [538, STAND_X]]), arx: 24, are: 80, alz: 8, ...patch });
  return { ...p, scale: GS, z: f < 538 ? GZ + 0.04 - (f - 514) * 0.0006 : GZ + 0.04 };
};
const LIE_SPLINE: KeyPose[] = (() => {
  const ks: KeyPose[] = [];
  LIE_KEYS.filter((k) => k.f < S.RISE_FROM).forEach((k) => {
    const { f, ...patch } = k;
    ks.push({ f, pose: LIE(patch) });
  });
  RISE_KEYS.forEach((k) => {
    const { f, ...patch } = k;
    ks.push({ f, pose: riseBase(f, patch) });
  });
  return ks;
})();
const LIE_LAG = { alx: 1, arx: 1, ale: 1, are: 1 };

/** Шёпот: покачивания, цикл 6 значений по 6 кадров24 [tl, hx, alx, hdx], между ними - плавный Catmull-Rom */
const SWAY_V = [
  [0, 0, 0, 0], [-3, -3, 4, 0.02], [3, 3, -3, -0.02], [-2, 5, 5, 0.01], [3, -4, -4, -0.01], [-4, 4, 3, 0.03],
];

// ---- ходьба ----
const RY_K: Array<[number, number]> = [[0, 72], [138, 72], [142, 48], [146, 22], [150, 0], [154, -22], [158, -40], [162, -54], [168, -58]];
const LOOK_HY: Array<[number, number]> = WALK_LOOKS.map(([a, b, p]) => [(a + b) / 2, p.hy ?? 0]);
const LOOK_HX: Array<[number, number]> = WALK_LOOKS.map(([a, b, p]) => [(a + b) / 2, p.hx ?? 0]);
const LOOK_BROW: Array<[number, number]> = WALK_LOOKS.map(([a, b, p]) => [(a + b) / 2, p.brow ?? 0]);
const FLINCH_POSE = (f: number): PP => G({ x: walkX(f), ry: 60, tl: 18, alx: 70, alz: 34, arx: 60, arz: 24, are: 90, hx: 14, eyeL: 1, eyeR: 1, mouth: 1, brow: 1, hy: -20, llx: 8, lrx: -6 });

const walkPose = (f: number): PP => {
  const s = -Math.sin((2 * Math.PI * f) / 8); // непрерывный цикл шага (период 8 кадров24)
  const amt = remap(f, [[134, 1], [142, 0]]); // шаг затухает перед разворотом
  const seg = WALK_LOOKS.find(([a, b]) => f >= a && f < b)?.[2] ?? {};
  const ry = remap(f, RY_K);
  let p = G({
    x: walkX(f), ry, arx: 30 + 4 * s * amt, are: 78, alx: -16 * s * amt, tz: 2.5 * s * amt, tl: 4 * amt,
    y: STAND_Y + 0.0125 * (1 + s) * amt, llx: 24 * s * amt, lrx: -24 * s * amt, llk: 6 * (1 - s) * amt, lrk: 6 * (1 + s) * amt,
    hy: curve(f, LOOK_HY), hx: curve(f, LOOK_HX), brow: curve(f, LOOK_BROW),
    eyeL: seg.eyeL ?? 0, eyeR: seg.eyeR ?? 2, mouth: seg.mouth ?? 0,
  });
  // вздрагивание от близких взрывов (до разворота)
  const wF = flinchW(f) * (1 - sstep((f - 138) / 3));
  if (wF > 0) p = mixPose(p, FLINCH_POSE(f), wF);
  // разворот к машине: два этапа, плавно
  const w1 = sstep((f - 139) / 3);
  const w2 = sstep((f - 149) / 4);
  if (w1 > 0) {
    p = { ...p, hy: lerp(p.hy, -20, w1), eyeL: f >= 140 ? 1 : p.eyeL };
  }
  if (w2 > 0) {
    const hy2 = lerp(-10, 18, sstep((-ry - 10) / 20));
    p = {
      ...p, hy: lerp(p.hy, hy2, w2), tl: lerp(p.tl, -4, w2), alx: lerp(p.alx, 20, w2), arx: lerp(p.arx, 44, w2), are: lerp(p.are, 86, w2),
      llx: lerp(p.llx, 6, w2), lrx: lerp(p.lrx, -4, w2), brow: lerp(p.brow, 1, w2), cup: 3 * Math.sin((2 * Math.PI * f) / 4) * w2,
      eyeL: 1, eyeR: f >= 150 ? 1 : p.eyeR, mouth: f >= 158 ? 1 : f >= 150 ? 0 : p.mouth,
    };
  }
  return p;
};

/** Поза Грега в момент f (непрерывный кадр24) */
export const gregPose = (f: number): PP => {
  // ---- 0..167: идёт ----
  if (f < S.HIT_FRAME) return walkPose(f);
  // ---- удар и полёт: сплайн по ключам, позиция - непрерывная траектория ----
  if (f < S.LAND_FRAME) {
    const p = splinePose(FLIGHT_SPLINE, f, FLIGHT_LAG);
    const post = f >= S.FLIGHT_FROM;
    const pos = post ? flightPos(f) : { x: curve(f, CONTACT_X), y: curve(f, CONTACT_Y), z: GZ };
    // мелкая «трепетность» конечностей в полёте (вторичное движение), нарастает после контакта
    const w = sstep((f - 174) / 6);
    const fl = (per: number, ph: number) => Math.sin((2 * Math.PI * f) / per + ph) * w;
    return {
      ...p, x: pos.x, y: pos.y, z: pos.z, alx: p.alx + 6 * fl(9, 0), arx: p.arx + 6 * fl(9, 1.9), llx: p.llx + 6 * fl(11, 0.7), lrx: p.lrx + 6 * fl(11, 2.6),
      hx: p.hx + 3 * fl(13, 1.1), tl: p.tl + 3 * fl(15, 0.3),
    };
  }
  // ---- лежит, встаёт, стоит: сплайн по ключам ----
  let p = splinePose(LIE_SPLINE, f, LIE_LAG);
  if (f >= S.LAND_FRAME + 14 && f < S.RISE_FROM) {
    // непрерывная дрожь вместо шума на двойках, плавно включается и выключается
    const w = 0.8 * sstep((f - (S.LAND_FRAME + 14)) / 4) * (1 - sstep((f - 470) / 10));
    const j = (sd: number, a: number) => snoise(f, sd) * a * w;
    p = { ...p, hy: p.hy + j(1, 2.5), hx: p.hx + j(2, 2), alx: p.alx + j(3, 4), llx: p.llx + j(4, 3), arx: p.arx + j(5, 3), lrx: p.lrx + j(6, 3) };
  }
  if (f < S.RISE_FROM) return p;
  // тик глаза (мгновенный нервный тик, дискретно): раз в 30 кадров24, 2 кадра24
  if (f >= 626 && f % 30 >= 14 && f % 30 < 16) p = { ...p, eyeL: 2, eyeR: 3, brow: -1 };
  if (f >= S.GREG_LINE.from && f < S.GREG_LINE.to) {
    const k0 = f - S.GREG_LINE.from;
    const i = Math.floor(k0);
    const e = lerp(S.VOICE_ENV[i] ?? 0, S.VOICE_ENV[i + 1] ?? 0, k0 - i);
    p = { ...p, mouth: e > 0.5 ? 2 : e > 0.24 ? 1 : 0, hx: p.hx + 3 * sstep((e - 0.4) / 0.2) };
  }
  if (f >= 604) {
    const u = (f - 604) / 6;
    const a = sstep((f - 604) / 6);
    const sw = (c: number) => loopCR(SWAY_V.map((v) => v[c]), u) * a;
    p = { ...p, tl: p.tl + sw(0), hx: p.hx + sw(1), alx: p.alx + sw(2), hdx: p.hdx + sw(3) };
  }
  if (f >= 566 && f < 600 && f % 12 < 2) p = { ...p, eyeR: 3 };
  return p;
};

// ---------------- Суперкар ----------------
export const CAR_Z = -0.2;
export const CAR_SCALE = 0.93;
export interface CarSt { on: boolean; x: number; z: number; yaw: number; dy: number; pitch: number; spin: number; fast: boolean; braking: boolean }
const R = (arr: Array<[number, number]>, f: number) => remap(f, arr);
const PITCH_BASE: Array<[number, number]> = [[S.HIT_FRAME, -3], [S.HIT_FRAME + 4, -3], [S.FLIGHT_FROM + 3, 1.2], [227, 1.2], [231, 0], [1000, 0]];
const DY_BOUNCE: Array<[number, number]> = [[158, 0.18], [160, 0.05], [162, 0.12], [164, 0], [166, 0]];
export const carState = (f: number): CarSt => {
  if (f >= S.VANISH_FRAME) return { on: false, x: 0, z: 0, yaw: 0, dy: 0, pitch: 0, spin: 0, fast: false, braking: false };
  const lane = 3.5;
  let x = 0, z = lane, yaw = 0, dy = 0, pitch = 0, fast = false, braking = false, on = true;
  if (f >= 58 && f <= 92) { x = R([[58, -15], [92, 15]], f); fast = true; }
  else if (f >= 98 && f <= 130) { x = R([[98, 15], [130, -15]], f); z = lane - 0.9; yaw = 180; fast = true; }
  else if (f >= 134 && f < S.HIT_FRAME) {
    x = R([[134, -17], [150, -11], [156, -8.6], [160, -6.9], [164, -5.2], [166, -4.3], [S.HIT_FRAME, -3.6]], f);
    z = R([[134, lane], [152, lane], [156, 3.0], [160, 1.6], [163, 0.3], [165, CAR_Z], [S.HIT_FRAME, CAR_Z]], f);
    yaw = R([[134, 0], [152, 0], [156, 16], [160, 24], [163, 12], [165, 3], [S.HIT_FRAME, 0]], f);
    dy = f >= 158 && f < 166 ? curve(f, DY_BOUNCE) : 0;
    fast = true;
  } else if (f >= S.HIT_FRAME) {
    z = CAR_Z;
    x = R([[S.HIT_FRAME, -3.55], [S.FLIGHT_FROM, -3.3], [186, -2.8], [206, -1.4], [230, 1.2], [254, 2.6], [276, 3.2], [S.LAND_FRAME, 3.35], [1000, 3.35]], f);
    braking = f > 228 && f < S.LAND_FRAME;
    // торможение: плавный вход/выход, внутри - мелкая вибрация подвески (синус), а не переключение каждые 2 кадра
    const br = sstep((f - 228) / 3) * (1 - sstep((f - (S.LAND_FRAME - 2)) / 3));
    const vib = Math.sin((2 * Math.PI * f) / 4);
    pitch = lerp(curve(f, PITCH_BASE), -2.4 + 0.8 * vib, br);
    yaw = br * (2 + vib);
    if (f < S.FLIGHT_FROM) dy = 0.05 * Math.abs(Math.sin((Math.PI * f) / 2));
  } else on = false;
  if (!on) return { on, x, z, yaw, dy, pitch, spin: 0, fast, braking };
  const dir = Math.abs(yaw) > 100 ? -1 : 1;
  const spin = (x * dir * 360) / (2 * Math.PI * 0.4);
  return { on, x, z, yaw, dy, pitch, spin: spin * (dir === -1 ? -1 : 1), fast, braking };
};

/** Фазы пришельца в кабине: плавный переход ~2-4 кадра24 между позами */
const ALIEN_BASE: PPatch = { x: -0.15, z: 0, ry: 90, scale: 0.88, llx: 88, lrx: 88, llk: 88, lrk: 88, llz: 6, lrz: 6, alx: 52, arx: 52, ale: 24, are: 24, alz: 18, arz: 18, eyeL: 0, eyeR: 0 };
const AL = (o: PPatch): PP => mixP(ALIEN_BASE, { y: 0.93 }, o);
const ALIEN_PH: ReadonlyArray<readonly [number, number, PP]> = [
  [0, 3, AL({ mouth: 0 })],
  [S.HIT_FRAME, 2, AL({ y: 1.0, alx: 170, arx: 170, ale: 0, are: 0, mouth: 1, hx: -10, hy: -30, tl: -10 })], // подпрыгнул, руки вверх
  [S.FLIGHT_FROM, 3, AL({ alx: 120, arx: 130, ale: 20, are: 20, mouth: 1, hy: -62, hx: -14, tl: -6 })],
  [206, 3, AL({ alx: 80, arx: 70, ale: 40, are: 40, mouth: 1, hy: -72, hx: -24, tl: -8 })],
  [S.LAND_FRAME, 3, AL({ alx: 40, arx: 40, ale: 60, are: 60, mouth: 1, hy: -76, hx: -6, tl: 4 })],
  [330, 4, AL({ alx: 40, arx: 40, ale: 60, are: 60, mouth: 0, hy: -78, hx: -4, tl: 2, alz: 24, arz: 24 })],
];
const ALIEN_SPLINE: KeyPose[] = (() => {
  const ks: KeyPose[] = [];
  ALIEN_PH.forEach(([f0, ramp, pose], i) => {
    if (i > 0) ks.push({ f: f0, pose: ALIEN_PH[i - 1][2] }); // конец предыдущей фазы
    ks.push({ f: f0 + ramp, pose });
  });
  return ks;
})();
/** Поза пришельца в кабине (в системе координат машины) */
export const alienPose = (f: number): PP => {
  const st = carState(f);
  let p = splinePose(ALIEN_SPLINE, f);
  const wob = (per: number, ph: number) => Math.sin((2 * Math.PI * f) / per + ph);
  // руки в полёте машут, голова чуть покачивается: кадры никогда не повторяются
  const wave = sstep((f - 206) / 4) * (1 - sstep((f - S.LAND_FRAME) / 4));
  p = { ...p, alx: p.alx + 10 * wave * wob(8, 0) + 2.5 * wob(9, 0.5), arx: p.arx - 10 * wave * wob(8, 0) + 2.5 * wob(9, 2), hy: p.hy + 1.5 * wob(11, 1) };
  if (f < S.HIT_FRAME) {
    const fastW = sstep((f - 58) / 2);
    p = {
      ...p, y: p.y + (st.fast ? 0.015 * (1 + wob(4, 0)) : 0) * fastW, mouth: f % 24 < 6 ? 1 : 0,
      hy: curve(f, [[116, 0], [124, -8]]), tl: 6 * fastW,
    };
  } else if (f >= 330) {
    const u = (f - 330) / 14;
    const w = sstep((f - 330) / 4);
    const t = Math.floor(u) % 4;
    p = {
      ...p, mouth: t === 1 ? 1 : 0,
      hy: p.hy + (loopCR([0, 0, 6, 0], u) - 0) * w, hx: p.hx + loopCR([0, 0, 0, -6], u) * w, alz: 24 + loopCR([0, 3, 6, 9], u) * w, arz: 24 + loopCR([0, 3, 6, 9], u) * w,
    };
  }
  return p;
};

// ---------------- Байк ----------------
// Летает в верхней части неба слева направо и обратно (дугами); два пролёта «за билбордом» (z<-5, билборд его закрывает, а не наоборот).
type BK = readonly [number, number, number, number, number];
const LOOP: ReadonlyArray<BK> = [
  [0, -9.8, 5.5, -2.0, 0], [14, -5.2, 6.5, -2.0, 0], [28, -1.2, 6.9, -2.2, 0], [34, 0.3, 6.9, -2.4, 0],
  [38, 0.5, 6.9, -2.5, 180], [64, -7.6, 5.9, -2.0, 180], [76, -10.6, 5.6, -2.0, 180], [77, -10.8, 5.5, -2.0, 0],
];
const buildBikeKeys = (): BK[] => {
  const ks: BK[] = [];
  const add = (b: number, l: ReadonlyArray<BK>) => l.forEach(([f, x, y, z, yw]) => ks.push([b + f, x, y, z, yw]));
  add(0, LOOP.slice(0, 7)); // 0-76
  // пролёт слева направо за билбордом, и обратно (78-170)
  add(78, [[0, -10.8, 5.5, -2.0, 0], [10, -4.0, 6.4, -2.6, 0], [20, 0.4, 6.8, -5.4, 0], [38, 13, 6.2, -6.8, 0], [39, 13.4, 6.2, -6.8, 180],
    [40, 13.4, 6.6, -6.8, 180], [62, 2.0, 6.9, -5.6, 180], [76, -3.0, 6.5, -2.4, 180], [88, -9.0, 5.6, -2.0, 180], [92, -11.0, 5.5, -2.0, 180], [93, -11.0, 5.5, -2.0, 0]]);
  for (let b = 172; b < 520; b += 77) add(b, LOOP);
  return ks.sort((a, b) => a[0] - b[0]);
};
const BIK = (() => {
  const k = buildBikeKeys();
  const ch = (idx: number) => k.map((q) => [q[0], q[idx]] as [number, number]);
  return { x: ch(1), y: ch(2), z: ch(3), yaw: ch(4) };
})();
export interface BikeSt { x: number; y: number; z: number; yaw: number; roll: number; pitch: number; flame: number }
export const bikeState = (f: number): BikeSt => {
  const x = remap(f, BIK.x);
  const y = remap(f, BIK.y);
  const z = remap(f, BIK.z);
  const yawBase = remap(f, BIK.yaw);
  const dm = ((yawBase % 180) + 180) % 180;
  const flat = 1 - clamp(Math.min(dm, 180 - dm) / 20); // 1 в «ровных» позициях (0/180), плавно гаснет в развороте
  const yaw = yawBase + Math.sin(f * 0.11) * 16 * flat;
  const yawN = remap(f + 4, BIK.yaw);
  const turning = clamp((Math.abs(yawN - yawBase) - 4) / 6);
  const v = Math.sin((2 * Math.PI * f) / 4); // вибрация двигателя ~6 Гц, непрерывная
  const roll = 22 * turning + 6 * v + Math.sin(f * 0.21) * 4;
  const bob = Math.sin(f * 0.37) * 0.14 + 0.03 * (1 + v);
  return { x, y: y + bob - 0.9, z, yaw, roll, pitch: 3 * v + Math.sin(f * 0.13) * 4, flame: 1.5 + 0.5 * Math.sin((2 * Math.PI * f) / 4 + 1) };
};
export const podHidden = (f: number): boolean[] => {
  const h = [false, false, false, false, false, false];
  FIRE_FRAMES.forEach((ff, i) => {
    if (f >= ff && f < ff + 8) h[i % 6] = true;
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
export const extraPose = (f: number, e: ExtraDef): PP | null => {
  if (f < e.f0 || f > e.f1) return null;
  const t = (f - e.f0) / (e.f1 - e.f0);
  const dir = Math.sign(e.x1 - e.x0);
  const s = -Math.sin((2 * Math.PI * f) / 8); // непрерывный бег
  return mixP({
    scale: 1.0, x: lerp(e.x0, e.x1, t), z: e.z, y: 0.43 * 1.0 + 0.035 * (1 + s), ry: dir * 84, tl: 16,
    llx: 52 * s + 2, lrx: -52 * s + 2, llk: 25 * (1 - s), lrk: 25 * (1 + s), alx: 60 * s, arx: -60 * s, ale: 40, are: 40, alz: 20, arz: 20,
    mouth: 1, eyeL: 1, eyeR: 1, hy: -dir * 20,
  });
};

// ---------------- Камера ----------------
// Статичная: общий план (0-479) с еле заметным боковым дрейфом без зума, затем жёсткий стык на средний план (480+).
export const cameraAt = (f: number) => {
  if (f < S.RISE_FROM) {
    const camX = remap(f, [[0, -1.05], [S.VANISH_FRAME, -0.4]]);
    return { camX, camY: 2.0, camZ: 9.9, tgtX: -0.65, tgtY: 3.0 };
  }
  return { camX: -0.5, camY: 1.55, camZ: 7.4, tgtX: -0.5, tgtY: 1.85 };
};
/** Тряска: затухающая синусоида на каждом ударе/взрыве (≈8-11 Гц), не шум */
export const shakeAt = (f: number): { x: number; y: number } => {
  let sx = 0;
  let sy = 0;
  const kick = (f0: number, amp: number, dur: number, ph: number) => {
    const d = f - f0;
    if (d < 0 || d > dur) return;
    const env = amp * Math.pow(1 - d / dur, 1.4);
    const ts = d / S.SRC_FPS; // секунды
    sx += env * Math.cos(2 * Math.PI * 8 * ts + ph);
    sy += env * Math.sin(2 * Math.PI * 11 * ts + 1.3 + ph);
  };
  kick(S.HIT_FRAME, 0.22, 10, 0);
  kick(S.LAND_FRAME, 0.2, 10, 0.8);
  kick(S.SHOULDER_FRAME, 0.07, 6, 1.6);
  EXPLOSIONS.forEach(([ef], i) => kick(ef, 0.035, 5, i * 1.7));
  return { x: sx, y: sy };
};
