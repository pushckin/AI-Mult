// Анимация сцены 3 (30 fps): позы по планам 13-18 как функции ВРЕМЕНИ (секунды). Рваная кукольная анимация: поза обновляется раз в 4 кадра (7.5/с),
// «биты» держатся ≥0.3 с, никакого плавного покачивания; камера - только жёсткие склейки (в плане 17 - редкие удары-подпрыгивания).
import { PP, PPatch, mixP } from "./Person";
import { ShotT, STEP, FPS, mouthFromEnv, sec } from "../data/scene3";
import { ARM_GEOM, armIK, armFK, fromTorso, toTorso, ArmGeom } from "./ik";
import { ARM3, X3 } from "./Cast3";
import { D2R } from "./util";

// ---------- масштаб, места ----------
export type Kind3 = "brenda" | "stacey" | "tony" | "marcus" | "chloe" | "greg";
export const SC3: Record<Kind3, number> = { greg: 1.55, tony: 1.55, marcus: 1.4, chloe: 1.3, brenda: 1.6, stacey: 1.15 };
const FOOT: Record<Kind3, number> = { greg: 0.43, tony: 0.43, marcus: 0.43, chloe: 0.43, brenda: 0.465, stacey: 0.465 };
const GREG_ARM: ArmGeom = { sx: 0.35, sy: 0.5, l1: 0.2, l2: 0.27 };
const armGeom = (k: Kind3): ArmGeom => (k === "greg" ? GREG_ARM : k === "brenda" ? ARM3.brenda : k === "stacey" ? ARM3.stacey : ARM_GEOM[k]);
export const HEAD_Y: Record<Kind3, number> = { greg: 0.93, tony: 1.0, marcus: 0.93, chloe: 0.93, brenda: 1.04, stacey: 0.93 };

/** Декорации (постоянные места) */
export const MACHINE = { x: -5.4, z: -1.35 };
export const TRUCK_X = 6.6;
export const TRUCK_Z = 3.9;

type V3 = [number, number, number];
export interface Actor3 {
  kind: Kind3;
  pose: PP;
  x?: X3;
  gy?: number; // уровень земли под ногами (дорога ниже тротуара)
}
export interface Cam3 {
  x: number; y: number; z: number; tx: number; ty: number; tz?: number; roll?: number;
}
export interface Puff3 { x: number; y: number; z: number; r: number; color?: string }
export interface Frame3 {
  actors: Actor3[];
  cam: Cam3;
  bgOff: number; // сдвиг фона относительно камеры (кофейня в мире стоит в cam.x - 0.2 + bgOff)
  signY?: number;
  truck: null | { x: number; yaw: number; nose: number; lean: number; doorF: number; doorR: number; idle: number; spin: number };
  machine: null | { shake: number; tilt: number };
  hole: number; // дыра в плакате
  puffs: Puff3[];
  dust: Array<{ x: number; z: number; k: number }>;
  star: null | { x: number; y: number; z: number; s: number; rot: number };
  bar: null | { x: number; y: number; z: number; rot: number }; // батончик, который тянут Тони и Маркус
}

// ---------- время и поза ----------
const groundAt = (z: number) => (z > 2.1 ? -0.3 : 0);
const mk = (kind: Kind3, o: PPatch = {}): PP => mixP({ scale: SC3[kind], y: FOOT[kind] * SC3[kind], z: 1.0, eyeL: 0, eyeR: 0, alz: 8, arz: 8, llz: 4, lrz: 4 }, o);
const act = (kind: Kind3, pose: PP, x?: X3): Actor3 => {
  const gy = groundAt(pose.z);
  return { kind, pose: { ...pose, y: pose.y + gy }, x, gy };
};
type K = PPatch & { t: number };
/** Жёсткие позы: ключ (секунда) действует и держится до следующего */
const seg = (keys: K[], T: number): PPatch => {
  let out: PPatch = {};
  for (const { t: kt, ...patch } of keys) if (kt <= T + 1e-6) out = { ...out, ...patch };
  return out;
};
type Beat<T = PPatch> = readonly [number, T];
const beatAt = <T,>(T0: number, list: ReadonlyArray<Beat<T>>, off = 0): { p: T; i: number; k: number } => {
  let tot = 0;
  for (const [d] of list) tot += d;
  let t = (((T0 + off) % tot) + tot) % tot;
  for (let i = 0; i < list.length; i++) {
    const [d, p] = list[i];
    if (t < d - 1e-6) return { p, i, k: t };
    t -= d;
  }
  return { p: list[0][1], i: 0, k: 0 };
};
const arm = (p: PP, kind: Kind3, side: 1 | -1, target: V3, abdPref = 20): PP => {
  const a = armIK(armGeom(kind), side, target, abdPref);
  return side === 1 ? { ...p, alx: a.swing, alz: a.abd, ale: a.elbow } : { ...p, arx: a.swing, arz: a.abd, are: a.elbow };
};
const q2 = (v: number) => Math.round(v * 50) / 50;
const qv = (v: V3): V3 => [q2(v[0]), q2(v[1]), q2(v[2])];
/** Рука в мировую точку */
const armW = (p: PP, kind: Kind3, side: 1 | -1, w: V3, abd = 30): PP => arm(p, kind, side, qv(toTorso(p, w)), abd);
/** Мировая точка кисти по текущим углам руки */
export const handW = (p: PP, kind: Kind3, side: 1 | -1): V3 => {
  const g = armGeom(kind);
  return fromTorso(p, armFK(g, side, side === 1 ? p.alx : p.arx, side === 1 ? p.alz : p.arz, side === 1 ? p.ale : p.are));
};
export const headW = (p: PP, kind: Kind3): V3 => fromTorso(p, [p.hdx, HEAD_Y[kind] + p.hdy, 0]);

// ---------- контекст кадра: рот по огибающей ----------
interface Ctx {
  f: number; // кадр плана (квантованный на STEP)
  T: number;
  raw: number; // кадр плана (на MSTEP)
  sh: ShotT;
  env: Array<number[] | undefined>;
}
const voiceOf = (c: Ctx, idx: number) => c.sh.voices.find((v) => v.idx === idx);
const speaking = (c: Ctx, idx: number) => {
  const v = voiceOf(c, idx);
  return !!v && c.raw >= v.from && c.raw < v.from + v.len;
};
/** Рот 0/1/2 по огибающей реплики idx */
const mouthOf = (c: Ctx, idx: number): number => {
  const v = voiceOf(c, idx);
  if (!v) return 0;
  return mouthFromEnv(c.env[idx], c.raw - v.from, v.len);
};
const TM = (c: Ctx, idx: number) => {
  const v = voiceOf(c, idx);
  return v ? (c.f - v.from) / FPS : -9; // секунды от начала реплики
};
type Style = "plain" | "bare" | "shout";
const say = (c: Ctx, p: PP, idx: number, style: Style = "plain"): PP => {
  const m = mouthOf(c, idx);
  if (!m) return { ...p, mouth: 0 };
  if (style === "bare") return { ...p, mouth: m === 2 ? 5 : 3 }; // Стейси: оскал / «э»
  if (style === "shout") return { ...p, mouth: m === 2 ? 2 : 1 };
  return { ...p, mouth: m };
};

// ---------- пресеты рук ----------
const NEUTRAL_L: V3 = [0.62, 0.05, 0.1];
const NEUTRAL_R: V3 = [-0.62, 0.05, 0.1];
/** Мегафон Хлои: точка кисти (торс-координаты), тангаж и рыскание предмета */
const MEGA: Record<string, { t: V3; hp: number; my: number }> = {
  up: { t: [-0.14, 0.48, 0.5], hp: -4, my: 6 },
  side: { t: [-0.62, 0.52, 0.34], hp: -8, my: -22 },
  down: { t: [-0.6, 0.24, 0.12], hp: 48, my: 0 },
  fwd: { t: [-0.5, 0.5, 0.62], hp: 0, my: 0 },
  mid: { t: [-0.1, 0.2, 0.66], hp: 0, my: 0 },
  air: { t: [-0.36, 0.74, 0.6], hp: -6, my: 0 },
  out: { t: [-1.12, 0.46, 0.14], hp: 10, my: 0 },
};
/** Плакат: точка кисти левой руки; шест выше кисти на 0.5 */
const PLAC: Record<string, { t: V3; cup: number }> = {
  up: { t: [0.66, 1.04, 0.16], cup: -6 },
  front: { t: [0.95, 0.5, 0.36], cup: 0 },
  low: { t: [0.74, 0.08, 0.3], cup: -14 },
  side: { t: [0.98, 0.7, 0.2], cup: 8 },
};
const chloeArms = (p: PP, mega: string, plac: string, over?: { megaT?: V3; lt?: V3 }): PP => {
  const m = MEGA[mega];
  let r = arm(p, "chloe", -1, qv(over?.megaT ?? m.t), 30);
  const pl = PLAC[plac];
  r = arm(r, "chloe", 1, qv(over?.lt ?? pl.t), 40);
  return { ...r, hr: 2, hl: 2, hp: m.hp, my: m.my, cup: pl.cup, pl: 0, py: Math.max(-75, Math.min(75, -p.ry * 0.85)) };
};
/** Мировая точка центра плаката (его лицевая сторона) по позе Хлои */
const placardCenter = (cp: PP, plac: string): V3 => {
  const t = PLAC[plac].t;
  const a = cp.py * D2R;
  return fromTorso(cp, [t[0] + 0.09 * Math.sin(a), t[1] + 0.47, t[2] + 0.09 * Math.cos(a) + 0.05]);
};

// ---------- ходьба ----------
/** шаг пошагово (рывками): позиция меняется раз в period, ноги чередуются */
const walkX = (T: number, t0: number, t1: number, a: number, b: number, period = 0.267) => {
  if (T < t0) return { v: a, ph: 0, n: 0, moving: false };
  const n = Math.max(1, Math.round((t1 - t0) / period));
  const i = Math.min(n, Math.floor((T - t0) / period + 1e-6) + 1);
  return { v: a + ((b - a) * i) / n, ph: i % 2, n: i, moving: T < t1 - 1e-6 };
};
const legs = (ph: number, amp = 30, kn = 40): PPatch => ({ llx: ph ? amp : -amp * 0.7, lrx: ph ? -amp * 0.7 : amp, llk: ph ? 0 : kn, lrk: ph ? kn : 0 });
const swing = (ph: number, amp = 26): PPatch => ({ alx: ph ? -amp : amp, arx: ph ? amp : -amp });

// =====================================================================================
// ПЛАН 13: общий. Пикап с заносом справа, Бренда и Стейси выходят, Хлоя подбегает
// =====================================================================================
const TRUCK_KEYS: Array<{ t: number; x: number; yaw: number; nose: number; lean: number }> = [
  { t: 0, x: -10.5, yaw: 0, nose: 0, lean: 0 },
  { t: 0.133, x: -7.4, yaw: 0, nose: 0, lean: 0 },
  { t: 0.267, x: -4.3, yaw: 0, nose: 0, lean: 0 },
  { t: 0.4, x: -1.2, yaw: 0, nose: 0, lean: 0 },
  { t: 0.533, x: 1.8, yaw: 6, nose: 3, lean: 1 },
  { t: 0.667, x: 4.0, yaw: 18, nose: 5, lean: 3 },
  { t: 0.8, x: 5.6, yaw: 27, nose: 6, lean: 4 },
  { t: 0.933, x: 6.3, yaw: 24, nose: 4, lean: 3 },
  { t: 1.067, x: 6.6, yaw: 12, nose: -3, lean: 1 },
  { t: 1.2, x: 6.7, yaw: 5, nose: 2, lean: 0 },
  { t: 1.333, x: TRUCK_X, yaw: 1, nose: -1, lean: 0 },
  { t: 1.467, x: TRUCK_X, yaw: 0, nose: 0, lean: 0 },
];
const DOOR_F = (T: number) => (T < 1.5 ? 0 : T < 1.633 ? 18 : 64);
const DOOR_R = (T: number) => (T < 1.8 ? 0 : T < 1.933 ? 16 : 58);

const shot13 = (c: Ctx): Partial<Frame3> => {
  const T = c.T;
  const actors: Actor3[] = [];
  const truckK = seg(TRUCK_KEYS as unknown as K[], T) as any;
  const dust: Frame3["dust"] = [];
  const puffs: Puff3[] = [];
  // пыль и дым из-под колёс на заносе
  [0.533, 0.667, 0.8, 0.933, 1.067].forEach((t0, i) => {
    if (T >= t0 && T < t0 + 0.58) dust.push({ x: (truckK.x ?? 0) - 2.6 + (i % 2) * 0.8, z: TRUCK_Z + 1.3 + (i % 2) * 0.5, k: Math.round((T - t0) * 24) });
  });
  if (T >= 1.3 && T < 2.6) puffs.push({ x: TRUCK_X - 1.65, y: 3.9 + (T - 1.3) * 0.7, z: TRUCK_Z + 1.08, r: 0.2 + (T - 1.3) * 0.15, color: "#6b6a82" });
  if (T >= 1.5 && T < 2.9) puffs.push({ x: TRUCK_X - 1.4, y: 4.5 + (T - 1.5) * 0.6, z: TRUCK_Z + 1.0, r: 0.16 + (T - 1.5) * 0.12, color: "#7d7c94" });
  const truck: Frame3["truck"] = { x: truckK.x, yaw: truckK.yaw, nose: truckK.nose, lean: truckK.lean, doorF: DOOR_F(T), doorR: DOOR_R(T), idle: T > 1.4 ? (Math.floor(T / 0.133) % 2) : 0, spin: T < 0.6 ? Math.floor(T / 0.133) * 130 : 0 };

  // ----- Тони и Маркус у автомата: следят за пикапом -----
  const tonyB: Beat[] = [
    [0.667, { ry: 40, hy: -26, hx: -2, tl: 2, alx: 20, ale: 40, arx: 20, are: 40, brow: -0.6, eyeL: 2, eyeR: 2 }],
    [0.533, { ry: 24, hy: -10, hx: 2, tl: 0, alx: 12, ale: 70, arx: 70, are: 120, brow: 0, eyeL: 0, eyeR: 0 }],
    [0.667, { ry: 44, hy: -30, hx: -4, tl: 3, alx: 70, ale: 100, arx: 22, are: 40, brow: -1, eyeL: 2, eyeR: 2 }],
  ];
  const marB: Beat[] = [
    [0.533, { ry: 30, hy: -20, hx: 6, tl: 8, alx: 150, ale: 120, arx: 150, are: 120, brow: 1, eyeL: 1, eyeR: 1 }],
    [0.4, { ry: 44, hy: -34, hx: 2, tl: 4, alx: 40, ale: 50, arx: 110, are: 110, brow: 1, eyeL: 0, eyeR: 0 }],
    [0.667, { ry: 20, hy: -12, hx: 8, tl: 10, alx: 160, ale: 130, arx: 40, are: 60, brow: 1, eyeL: 1, eyeR: 1 }],
  ];
  const tp = mk("tony", { x: -6.2, z: 0.35, acc: 1, ...beatAt(T, tonyB).p });
  const mp = mk("marcus", { x: -4.5, z: 0.25, ...beatAt(T + 0.3, marB).p });
  actors.push(act("tony", tp), act("marcus", mp));

  // ----- Хлоя: ждёт у кофейни -> замечает пикап -> прыжок радости -> бежит к сёстрам и говорит -----
  const CX0 = -2.4;
  const run = walkX(T, 1.9, 5.1, CX0, -0.9, 0.4);
  const cz = 1.2 + (run.v - CX0) / (-0.9 - CX0) * 2.6;
  const ck: K[] = [
    { t: 0, ry: 66, hy: 30, hx: -2, x: CX0, z: 1.2, brow: 0, tl: -2 },
    { t: 0.4, hy: 38, brow: 1, eyeL: 1, eyeR: 1 },
    { t: 1.0, ry: 52, hy: 24, tl: 4 },
    { t: 1.5, ry: 20, hy: 6, hx: -6, tl: -4, y: 0.43 * SC3.chloe + 0.2, brow: 1, eyeL: 1, eyeR: 1, llx: 12, lrx: -8, llk: 30, lrk: 20 }, // прыжок радости
    { t: 1.633, y: 0.43 * SC3.chloe },
  ];
  let cp = mk("chloe", { ...seg(ck, T), llz: 10, lrz: 10 });
  let cMega = "down";
  let cPlac = "up";
  if (T >= 1.9) {
    cp = { ...cp, x: run.v, z: cz, ry: 78, hy: 4, hx: -4, tl: -4, brow: 1, ...(run.moving ? { ...legs(run.ph, 36, 50), y: 0.43 * SC3.chloe + (run.ph ? 0.07 : 0) } : { llx: 0, lrx: 0, llk: 0, lrk: 0 }) };
    const sp: Beat<{ m: string; pl: string; ry?: number }>[] = [
      [0.4, { m: "air", pl: "up" }],
      [0.533, { m: "out", pl: "up", ry: 66 }],
      [0.4, { m: "up", pl: "side" }],
      [0.533, { m: "air", pl: "up", ry: 60 }],
      [0.4, { m: "fwd", pl: "side" }],
    ];
    const b = beatAt(T - 1.9, sp).p;
    cMega = b.m;
    cPlac = b.pl;
    if (b.ry) cp = { ...cp, ry: b.ry };
    if (!run.moving) cp = { ...cp, ry: 70, y: cp.y + (Math.floor(T / 0.4) % 2 ? 0.08 : 0) }; // подпрыгивает от радости
  } else if (T >= 1.5) {
    cMega = "air";
    cPlac = "up";
  } else if (T >= 0.4) {
    cMega = "up";
  }
  cp = chloeArms(cp, cMega, cPlac);
  if (speaking(c, 0)) cp = say(c, { ...cp, eyeL: 0, eyeR: 0 }, 0);
  else cp = { ...cp, mouth: T >= 1.5 && T < 1.9 ? 2 : 0 };
  actors.push(act("chloe", cp));

  // ----- Бренда: выходит из передней двери (пиво в ближней руке), идёт к Хлое -----
  if (T >= 1.667) {
    const bw = walkX(T, 2.2, 5.8, 6.9, 1.4, 0.4);
    const bz = 5.9 - ((bw.v - 6.9) / (1.4 - 6.9)) * 2.0;
    let bp: PP;
    if (T < 1.8) bp = mk("brenda", { x: 7.1, z: 5.5, ry: -48, tl: 24, hx: 10, y: 0.47 * SC3.brenda - 0.35, llx: 50, lrx: -10, llk: 80, lrk: 30, alx: 30, ale: 40, arx: 30, are: 40, brow: -1, eyeL: 2, eyeR: 2 });
    else if (T < 2.2) bp = mk("brenda", { x: 6.9, z: 5.9, ry: -78, tl: 6, hx: 2, y: 0.465 * SC3.brenda + (T < 1.933 ? 0.12 : 0), llx: 18, lrx: -6, llk: 10, lrk: 6, brow: -1, eyeL: 2, eyeR: 2, alx: 8, ale: 30, arx: 14, are: 30 });
    else {
      bp = mk("brenda", { x: bw.v, z: bz, ry: -82, tl: 4, hx: -2, hy: -6, brow: -1, eyeL: 2, eyeR: 2, ...swing(bw.ph, 18), ale: 30, are: 30, y: 0.465 * SC3.brenda + (bw.moving && bw.ph ? 0.05 : 0), ...(bw.moving ? legs(bw.ph, 28, 36) : {}) });
    }
    // пиво в ближней (левой) руке; к концу идёт к губам и глоток
    const sip = T >= 5.8 && (T - 5.8) % 2.4 < 0.6;
    if (T >= 5.6) bp = { ...bp, ry: -74, hy: sip ? 10 : -8, hx: sip ? -16 : 2, tl: sip ? -6 : 2 };
    bp = arm(bp, "brenda", 1, sip ? [0.18, 0.92, 0.56] : [0.7, 0.02, 0.25], 30);
    bp = { ...bp, cup: sip ? 62 : 6, py: 0, hr: 2 };
    actors.push(act("brenda", bp, { cig: 1, beer: 1 }));
  }
  // ----- Стейси: из задней двери, постукивает монтировкой по ладони -----
  if (T >= 2.0) {
    const sw = walkX(T, 2.5, 5.9, 5.6, 3.1, 0.4);
    const sz = 5.9 - ((sw.v - 5.6) / (3.1 - 5.6)) * 2.4;
    const tapT = (Math.floor(T / 0.4) % 2) as 0 | 1;
    let sp2: PP;
    if (T < 2.2) sp2 = mk("stacey", { x: 5.7, z: 5.5, ry: -60, tl: 22, hx: 8, y: 0.465 * SC3.stacey - 0.3, llx: 46, lrx: -8, llk: 76, lrk: 28, brow: -1, eyeL: 2, eyeR: 2, alx: 30, ale: 40, arx: 30, are: 40 });
    else sp2 = mk("stacey", { x: sw.v, z: sz, ry: -80, tl: 6, hx: -4, hy: -8, brow: -1, eyeL: 2, eyeR: 2, y: 0.465 * SC3.stacey + (sw.moving && sw.ph ? 0.05 : 0), ...(sw.moving ? legs(sw.ph, 34, 40) : {}) });
    // монтировка в левой руке (ближняя): поднимает и бьёт по правой ладони
    sp2 = arm(sp2, "stacey", 1, tapT ? [0.1, 0.28, 0.5] : [0.34, 0.62, 0.34], 30);
    sp2 = arm(sp2, "stacey", -1, [-0.14, 0.26, 0.5], 40);
    sp2 = { ...sp2, cup: tapT ? 74 : 20, py: 0, hr: 2 };
    actors.push(act("stacey", sp2, { crowbar: 1 }));
  }
  return { actors, truck, dust, puffs, machine: { shake: 0, tilt: 0 } };
};

// =====================================================================================
// ПЛАН 14: окурок в плакат (деталь) -> лицо Бренды (речь)
// =====================================================================================
const S14 = { chloe: { x: -2.3, z: 0.6 }, brenda: { x: -0.6, z: 0.0 } };
/** точка плаката, в которую упирается окурок (мир) */
const P14: V3 = [-0.78, 0, 1.45];
export const CUTS14 = [0, 0.9, 3.8, 6.0, 7.4];
const BRENDA_TALK: Beat[] = [
  [0.667, { hx: 4, hy: -6, tl: 8, brow: -1 }],
  [0.533, { hx: -4, hy: 0, tl: 2, brow: -1, hz: -5 }],
  [0.667, { hx: 8, hy: -10, tl: 12, brow: -1, hz: 3 }],
  [0.4, { hx: 0, hy: -2, tl: 4, brow: -1, hz: 0 }],
  [0.533, { hx: 6, hy: 4, tl: 10, brow: -1, hz: -4 }],
  [0.667, { hx: -6, hy: -8, tl: 0, brow: -0.6, hz: 4 }],
];
/** жесты Бренды при речи: ближняя (левая) рука; дальняя (правая) с пивом */
const BRENDA_GEST: Beat<{ l: V3; r: V3; hl: number; ry: number }>[] = [
  [0.667, { l: [0.62, 0.04, 0.12], r: [-0.62, 0.2, 0.14], hl: 2, ry: -62 }],
  [0.533, { l: [0.86, 0.66, 0.55], r: [-0.55, 0.2, 0.2], hl: 1, ry: -70 }], // тычет пальцем
  [0.667, { l: [0.88, 0.38, 0.2], r: [-0.7, 0.28, 0.3], hl: 0, ry: -56 }], // развёл
  [0.4, { l: [0.5, 0.45, 0.62], r: [-0.62, 0.1, 0.1], hl: 2, ry: -66 }], // кулак вперёд
  [0.533, { l: [0.86, 0.66, 0.55], r: [-0.4, 0.55, 0.45], hl: 1, ry: -72 }], // палец, пиво поднято
  [0.667, { l: [0.7, 0.1, 0.12], r: [-0.62, 0.1, 0.12], hl: 2, ry: -60 }],
];

export const shot14 = (c: Ctx): Partial<Frame3> & { P: V3 } => {
  const T = c.T;
  const actors: Actor3[] = [];
  const puffs: Puff3[] = [];
  // ----- Хлоя (слева, плакат вынесен вперёд, стоит боком к Бренде) -----
  const chk: K[] = [
    { t: 0, hy: 52, hx: -2, brow: 0.6, eyeL: 0, eyeR: 0 },
    { t: 0.4, hy: 56, hx: 6, tl: -8, brow: 1, eyeL: 1, eyeR: 1, mouth: 1, y: 0.43 * SC3.chloe + 0.06 }, // дёрнулась
    { t: 0.9, y: 0.43 * SC3.chloe },
    { t: 1.067, hy: 50, hx: 8, tl: -6, hdy: -0.1, brow: 1, sw: 1 },
    { t: 2.4, hy: 56, hx: 10, tl: -10, hdy: -0.16, sw: 2 },
    { t: 3.6, hy: 40, hx: 14, tl: -4, hdy: -0.2, sw: 3, eyeL: 3, eyeR: 3 },
    { t: 4.4, hy: 54, hx: 6, tl: -12, hdy: -0.12, sw: 1, eyeL: 1, eyeR: 1 },
    { t: 5.4, hy: 44, hx: 12, tl: -6, hdy: -0.22, sw: 2, eyeL: 3, eyeR: 3 },
    { t: 6.4, hy: 52, hx: 4, tl: -14, hdy: -0.1, sw: 3, eyeL: 1, eyeR: 1 },
    { t: 7.6, hy: 42, hx: 14, tl: -8, hdy: -0.24, sw: 1, eyeL: 3, eyeR: 3 },
  ];
  let cp = mk("chloe", { x: 0, z: 0, llz: 10, lrz: 10, ...seg(chk, T), ry: -20 });
  cp = chloeArms(cp, T < 0.9 ? "mid" : T < 3.8 ? "down" : "mid", "front");
  {
    // Хлоя ставится так, чтобы центр плаката пришёлся в P14 по x, z (остальное - по её позе)
    const P0 = placardCenter(cp, "front");
    cp = { ...cp, x: P14[0] - P0[0], z: P14[2] - P0[2] };
  }
  if (T >= 0.9 && (T < 2.5 || T > 7)) cp = { ...cp, mouth: 0 };
  else cp = { ...cp, mouth: cp.mouth ?? 0 };
  if (T >= 0.9) cp = { ...cp, mouth: ((Math.floor(T / 0.8) % 2) ? 4 : 0) };
  actors.push(act("chloe", cp));
  const P = placardCenter(cp, "front");

  // ----- Бренда: окурок из рта -> в плакат -> суровая речь -----
  const speakOn = T >= 1.0;
  const b = beatAt(Math.max(0, TM(c, 1)), BRENDA_TALK).p as any;
  const gst = beatAt(Math.max(0, TM(c, 1)) + 0.2, BRENDA_GEST).p;
  let bp = mk("brenda", { x: S14.brenda.x, z: S14.brenda.z, ry: -64, hy: -8, hx: -2, tl: 6, brow: -1, eyeL: 2, eyeR: 2, llz: 12, lrz: 12 });
  const fwd = new Float32Array([Math.sin(bp.ry * D2R), 0, Math.cos(bp.ry * D2R)]);
  let stubOn = 1;
  if (T < 0.9) {
    // рука с окурком: подносит (0-0.27), вжимает (0.4-0.9)
    const away = T < 0.133 ? 0.75 : T < 0.267 ? 0.35 : T < 0.4 ? 0.1 : 0;
    const tip: V3 = [P[0] - fwd[0] * 0.2 + away * 0.9, P[1] + 0.02 + away * 0.3, P[2] - fwd[2] * 0.2 + away * 0.25];
    bp = { ...bp, tl: 10, hx: 2 };
    bp = armW(bp, "brenda", 1, tip, 40);
    bp = arm(bp, "brenda", -1, qv([-0.62, 0.2, 0.14]), 20);
    bp = { ...bp, cup: 0, py: 0 };
  } else {
    stubOn = T < 2.0 ? 1 : 0;
    if (speakOn) bp = { ...bp, ...b, ry: gst.ry, mouth: 0 };
    bp = arm(bp, "brenda", 1, qv(gst.l), 30);
    bp = arm(bp, "brenda", -1, qv(gst.r), 30);
    bp = { ...bp, hl: gst.hl, hp: 20, cup: 0 };
    bp = say(c, bp, 1);
  }
  const stubSide = stubOn ? 1 : 0;
  actors.push(act("brenda", bp, { cig: T >= 2.0 ? 1 : 0, stub: stubSide, beer: T >= 0.9 ? 2 : 0 }));

  // ----- дым и искры от дыры -----
  let hole = 0;
  let star: Frame3["star"] = null;
  if (T >= 0.4) hole = T < 1.0 ? 1 : 2;
  if (T >= 0.4 && T < 0.9) star = { x: P[0], y: P[1], z: P[2] + 0.12, s: 0.12 + (Math.floor(T / 0.133) % 2) * 0.04, rot: T * 4 };
  if (T >= 0.4 && T < 6.5)
    for (let j = 0; j < 3; j++) {
      const age = ((T - 0.4) * 1.1 + j * 0.45) % 1.35;
      puffs.push({ x: P[0] + 0.1 + age * 0.25 + (j % 2) * 0.05, y: P[1] + 0.1 + age * 0.85, z: P[2] + 0.15 + j * 0.02, r: 0.06 + age * 0.12, color: j % 2 ? "#a8a7bd" : "#d6d5e2" });
    }
  return { actors, puffs, hole, star, P };
};

// =====================================================================================
// ПЛАН 15: Стейси (справа, монтировка в ближней левой руке) тычет в мегафон Хлои, прижатой к стене
// =====================================================================================
const shot15 = (c: Ctx): Partial<Frame3> & { Q: V3 } => {
  const T = c.T;
  const jab = (Math.floor(Math.max(0, T - 0.1) / 0.4) % 2) as 0 | 1; // 0 - тычок (контакт), 1 - отвела
  const sec2 = Math.floor(T / 0.8) % 3;
  let cp = mk("chloe", { x: -0.3, z: -1.2, ry: -4, llz: 12, lrz: 12, tl: jab ? -4 : -12, hx: jab ? 4 : 10, hdy: jab ? -0.08 : -0.2, eyeL: jab ? 1 : 3, eyeR: jab ? 1 : 3, brow: 1, sw: 1 + sec2, mouth: jab ? 4 : 1 });
  cp = chloeArms(cp, "mid", "low");
  const qt = MEGA.mid.t;
  const Q = fromTorso(cp, [qt[0], qt[1] + 0.2, qt[2] + 0.25]);
  const sx = Q[0] + 1.5;
  let sp = mk("stacey", { x: sx, z: Q[2], ry: -82, hy: 0, hx: 0, tl: jab ? 10 : 16, brow: -1, eyeL: 2, eyeR: 2, llz: 12, lrz: 12, y: 0.465 * SC3.stacey + (jab ? 0 : 0.03) });
  const tip = jab ? 0.0 : 0.3;
  const H: V3 = [Q[0] + 1.12 + tip, Q[1] + 0.02, Q[2] + 0.02];
  sp = armW(sp, "stacey", 1, H, 30);
  sp = arm(sp, "stacey", -1, qv([-0.36, 0.1, 0.22]), 40);
  sp = { ...sp, hr: 2, cup: 80, py: -8 };
  sp = say(c, sp, 2, "bare");
  if (!speaking(c, 2)) sp = { ...sp, mouth: 5 };
  return { actors: [act("chloe", cp), act("stacey", sp, { crowbar: 1 })], Q };
};

// =====================================================================================
// ПЛАН 16: Маркус хватается за голову, Тони машет рукой -> лицо вытягивается
// =====================================================================================
const TX = { tony: { x: -4.2, z: 0.4 }, marcus: { x: -6.3, z: 0.3 } };
const shot16 = (c: Ctx): Partial<Frame3> => {
  const T = c.T;
  const vm = voiceOf(c, 3)!;
  const vt = voiceOf(c, 4)!;
  const tm = TM(c, 3);
  const tt = TM(c, 4);
  const real = tt > (vt.len / FPS) * 0.62; // «Ой, блядь...» - осознание
  // ----- Маркус: паника рваными позами (руки на голове / в стороны / на щёках) -----
  const MB: Beat<{ l: V3; r: V3; hy: number; tl: number; ry: number; eye: number }>[] = [
    [0.533, { l: [0.5, 1.1, 0.1], r: [-0.5, 1.1, 0.1], hy: 10, tl: 10, ry: 34, eye: 1 }], // за голову
    [0.4, { l: [0.9, 0.6, 0.3], r: [-0.9, 0.6, 0.3], hy: 24, tl: -6, ry: 24, eye: 1 }], // руки врозь
    [0.533, { l: [0.45, 0.85, 0.5], r: [-0.45, 0.85, 0.5], hy: 6, tl: 14, ry: 40, eye: 3 }], // ладони на щёки
    [0.4, { l: [0.5, 1.15, 0.05], r: [-0.8, 0.95, 0.3], hy: 28, tl: 4, ry: 30, eye: 1 }],
    [0.533, { l: [0.5, 1.1, 0.1], r: [-0.5, 1.1, 0.1], hy: -4, tl: 16, ry: 36, eye: 1 }],
  ];
  const mb = beatAt(T, MB).p;
  let mp = mk("marcus", { x: TX.marcus.x, z: TX.marcus.z, ry: mb.ry, hy: mb.hy, tl: mb.tl, hx: 6, brow: 1, eyeL: mb.eye, eyeR: mb.eye, llz: 6, lrz: 6, sw: 1 + (Math.floor(T / 0.8) % 3), tear: 0 });
  mp = arm(mp, "marcus", 1, qv(mb.l), 40);
  mp = arm(mp, "marcus", -1, qv(mb.r), 40);
  mp = { ...mp, hl: 2, hr: 2 };
  if (tm < -0.01 || tt > -0.01) mp = { ...mp, ry: 30, hy: 28, tl: 8, eyeL: 1, eyeR: 1 }; // до реплики и после: смотрит на Тони
  mp = say(c, mp, 3);
  // ----- Тони: беспечно машет рукой, потом лицо вытягивается -----
  const WV: Beat<{ r: V3; hy: number; tl: number }>[] = [
    [0.4, { r: [-0.78, 0.98, 0.3], hy: -26, tl: -2 }],
    [0.4, { r: [-0.5, 0.92, 0.42], hy: -30, tl: 0 }],
  ];
  const w = beatAt(Math.max(0, tt), WV).p;
  let tp = mk("tony", { x: TX.tony.x, z: TX.tony.z, acc: 1, ry: -32, hx: -4, hy: w.hy, tl: w.tl, brow: -0.5, eyeL: 2, eyeR: 2, llz: 8, lrz: 8 });
  tp = arm(tp, "tony", -1, qv(w.r), 30);
  tp = arm(tp, "tony", 1, qv([0.62, 0.28, 0.2]), 20);
  tp = { ...tp, hr: 0, hl: 0 };
  if (tt < -0.01) tp = { ...tp, ry: -30, hy: -28, eyeL: 0, eyeR: 0, brow: 0, mouth: 0, tl: 4, alx: 12, ale: 20, arx: 12, are: 20 }; // слушает
  if (real) {
    const a = Math.floor((tt - (vt.len / FPS) * 0.62) / 0.4) % 2;
    tp = arm(tp, "tony", -1, qv([-0.6, 0.95, 0.35]), 40);
    tp = arm(tp, "tony", 1, qv([0.6, 0.95, 0.35]), 40);
    tp = { ...tp, hr: 0, hl: 0, eyeL: 1, eyeR: 1, brow: 1, hx: -10, hy: -10, tl: -6, hdy: 0.08, sw: 1 + a, y: tp.y + 0.03 };
  }
  tp = say(c, tp, 4);
  if (real && speaking(c, 4) === false) tp = { ...tp, mouth: 2 }; // рот открыт: лицо вытянулось
  if (T < 0 || tt > (vt.len / FPS) + 0.1) tp = { ...tp, mouth: 2, eyeL: 1, eyeR: 1, brow: 1 };
  void vm;
  return { actors: [act("marcus", mp), act("tony", tp)] };
};

// =====================================================================================
// ПЛАН 17: балаган (общий): Хлоя орёт в мегафон, Стейси замахивается, Бренда держит её одной рукой, Тони и Маркус тянут батончик у автомата
// =====================================================================================
const BAR_X = -4.75;
const CH = { chloe: -2.1, stacey: 0.4, brenda: 1.8, tony: -5.7, marcus: -3.8 };
interface Chaos { actors: Actor3[]; machine: Frame3["machine"]; bar: Frame3["bar"]; hit: boolean }
const chaos = (Tc: number, mouthOn = true): Chaos => {
  const e = (Math.floor(Tc / 0.4) % 2) as 0 | 1; // чередование «замах / удар» 0.4 с
  const k = Math.floor(Tc / 0.8) % 3;
  // Хлоя
  let cp = mk("chloe", { x: CH.chloe, z: 0.5, ry: e ? -22 : -34, hy: e ? 20 : 10, hx: -6, tl: e ? -12 : -6, llz: 12, lrz: 12, brow: 1, eyeL: e ? 1 : 3, eyeR: e ? 1 : 3, mouth: mouthOn ? (e ? 2 : 1) : 2, sir: mouthOn ? 1 + (Math.floor(Tc / 0.133) % 3) : 0, y: 0.43 * SC3.chloe + (e ? 0.08 : 0) });
  cp = chloeArms(cp, e ? "up" : "fwd", e ? "up" : "side");
  // Стейси (бьёт, её оттягивают)
  const pulled = e === 1;
  let sp = mk("stacey", { x: CH.stacey + (pulled ? 0.3 : 0), z: 0.45, ry: -84, tl: e ? -10 : 18, hx: e ? -4 : 8, hy: 0, brow: -1, eyeL: 2, eyeR: 2, mouth: mouthOn ? 5 : 5, llz: 14, lrz: 14, llx: e ? 24 : -10, lrx: e ? -14 : 24, llk: e ? 10 : 28, lrk: 20, y: 0.465 * SC3.stacey + (e ? 0.05 : 0) });
  sp = arm(sp, "stacey", 1, e ? [0.42, 1.55, 0.1] : [0.5, 0.45, 0.8], 40);
  sp = arm(sp, "stacey", -1, qv([-0.3, 0.35, 0.3]), 30);
  sp = { ...sp, hr: 2, cup: e ? -25 : 105, py: -6, hy: 0 };
  // Бренда держит Стейси за воротник одной рукой, в другой пиво
  const bx = sp.x + 1.4;
  let bp = mk("brenda", { x: bx, z: 0.35, ry: -78, tl: e ? 8 : 0, hx: 0, hy: e ? -6 : -16, brow: -1, eyeL: e ? 1 : 2, eyeR: e ? 1 : 2, mouth: mouthOn ? (e ? 2 : 0) : 2, llz: 14, lrz: 14 });
  bp = armW(bp, "brenda", 1, [sp.x + 0.22, 1.35 * 1.0 + 0.1, sp.z + 0.2], 40);
  bp = arm(bp, "brenda", -1, qv(e ? [-0.5, 0.95, 0.3] : [-0.6, 0.3, 0.3]), 30);
  bp = { ...bp, hl: 2, hp: e ? 40 : 10, cup: 0 };
  // Тони и Маркус: тянут батончик
  const bxm = BAR_X + (e ? 0.22 : -0.22);
  let tp = mk("tony", { x: CH.tony + (e ? 0.12 : -0.06), z: 0.5, acc: 1, ry: 80, hx: 4, hy: -8, tl: e ? 10 : -6, brow: -1, eyeL: 2, eyeR: 2, mouth: mouthOn ? (e ? 2 : 1) : 2, llz: 8, lrz: 8, llx: e ? 20 : -6, lrx: e ? -10 : 18, llk: 20 });
  tp = armW(tp, "tony", -1, [bxm - 0.18, 1.8, 1.05], 40);
  tp = arm(tp, "tony", 1, qv(e ? [0.7, 0.9, 0.2] : [0.7, 0.4, 0.3]), 40);
  tp = { ...tp, hl: 2, hr: 2 };
  let mp = mk("marcus", { x: CH.marcus + (e ? 0.1 : 0.0), z: 0.45, ry: -78, hx: 4, hy: 10, tl: e ? -8 : 8, brow: 1, eyeL: 1, eyeR: 1, mouth: mouthOn ? (e ? 1 : 2) : 2, llz: 6, lrz: 6, llx: e ? -16 : 20, lrx: e ? 20 : -8, llk: 24 });
  mp = armW(mp, "marcus", 1, [bxm + 0.18, 1.7, 1.05], 40);
  mp = arm(mp, "marcus", -1, qv(e ? [-0.8, 0.85, 0.2] : [-0.6, 0.3, 0.3]), 40);
  mp = { ...mp, hl: 2, hr: 2 };
  const hit = k === 1 && e === 1;
  return {
    actors: [act("marcus", mp), act("tony", tp), act("chloe", cp), act("stacey", sp, { crowbar: 1 }), act("brenda", bp, { cig: 1, beer: 2 })],
    machine: { shake: e ? 0.07 : 0, tilt: e ? 1.6 : 0 },
    bar: { x: bxm, y: 1.78, z: 1.12, rot: e ? 6 : -6 },
    hit,
  };
};
const shot17 = (c: Ctx): Partial<Frame3> => {
  const o = chaos(c.T);
  return { actors: o.actors, machine: o.machine, bar: o.bar };
};

// =====================================================================================
// ПЛАН 18: Грег выходит в центр, расставляет руки, орёт: вся какофония обрывается, все замирают (холд)
// =====================================================================================
const FREEZE_T = 1.6;
const GREG_C = { x: -0.8, z: 1.7 };
const GB: Beat<{ l: V3; r: V3; ry: number; hy: number; tl: number; hx: number; brow: number; eye: number; mouthStyle: number }>[] = [
  [0.667, { l: [0.95, 0.55, 0.2], r: [-0.95, 0.55, 0.2], ry: 8, hy: 0, tl: -10, hx: -10, brow: -1, eye: 2, mouthStyle: 2 }], // руки расставлены, орёт
  [0.533, { l: [0.55, 1.15, 0.1], r: [-0.55, 1.1, 0.2], ry: 20, hy: -10, tl: 6, hx: 4, brow: 1, eye: 1, mouthStyle: 2 }], // руки к голове: «с ума посходили?!»
  [0.667, { l: [0.9, 0.85, 0.45], r: [-0.4, 1.0, 0.4], ry: -8, hy: 14, tl: -6, hx: -4, brow: -1, eye: 2, mouthStyle: 2 }], // палец вперёд
  [0.533, { l: [0.9, 0.4, 0.2], r: [-0.5, 1.3, 0.3], ry: 14, hy: -6, tl: -12, hx: -14, brow: -1, eye: 2, mouthStyle: 2 }], // стаканчик вверх
  [0.4, { l: [0.7, 0.9, 0.5], r: [-0.7, 0.9, 0.5], ry: 0, hy: 0, tl: 4, hx: 6, brow: -1, eye: 2, mouthStyle: 2 }], // кулаки
  [0.667, { l: [0.95, 0.5, 0.15], r: [-0.95, 0.6, 0.15], ry: 10, hy: 8, tl: -8, hx: -6, brow: -1, eye: 2, mouthStyle: 2 }],
];
const shot18 = (c: Ctx): Partial<Frame3> => {
  const v = voiceOf(c, 5)!;
  const T = c.T;
  const t0 = v.from / FPS;
  const frozen = T >= t0 - 0.01;
  const ch = chaos(frozen ? FREEZE_T : T, false);
  // Грег
  let gp: PP;
  const tv = Math.max(0, T - t0);
  if (T < t0) {
    const g = walkX(T, 0.0, t0 - 0.13, 2.3, GREG_C.x, 0.4);
    gp = mk("greg", { x: g.v, z: GREG_C.z, ry: -60, tl: 6, brow: -1, eyeL: 2, eyeR: 2, ...(g.moving ? legs(g.ph, 28, 30) : { llx: 0, lrx: 0 }), arz: 14 });
    gp = arm(gp, "greg", 1, qv([0.6, 0.1, 0.2]), 20);
    gp = arm(gp, "greg", -1, qv([-0.5, 0.45, 0.4]), 20);
    gp = { ...gp, mouth: 0 };
    if (!g.moving) {
      gp = { ...gp, ry: 8, tl: -10, hx: -10 };
      gp = arm(gp, "greg", 1, qv([0.95, 0.55, 0.2]), 40);
      gp = arm(gp, "greg", -1, qv([-0.95, 0.55, 0.2]), 40);
    }
  } else {
    const calm = tv > (v.len / FPS) * 0.9;
    const b = beatAt(tv, GB).p;
    gp = mk("greg", { x: GREG_C.x, z: GREG_C.z, ry: b.ry, hy: b.hy, hx: b.hx, tl: b.tl, brow: b.brow, eyeL: b.eye, eyeR: b.eye, llz: 12, lrz: 12, llx: 4, lrx: -4 });
    gp = arm(gp, "greg", 1, qv(calm ? [0.55, 0.0, 0.2] : b.l), 40);
    gp = arm(gp, "greg", -1, qv(calm ? [-0.5, 0.5, 0.4] : b.r), 40);
    const m = mouthOf(c, 5);
    gp = { ...gp, mouth: m === 2 ? 2 : m === 1 ? 1 : 0, cup: 0 };
    if (calm) gp = { ...gp, ry: 20, tl: 8, hx: 12, brow: 0.2, eyeL: 3, eyeR: 3, mouth: 0, y: gp.y - 0.04 };
  }
  let actors = ch.actors;
  if (frozen) {
    // все замерли: тела как в разгар драки, лица обращены к Грегу, рты разинуты
    actors = actors.map((a) => {
      const ang = (Math.atan2(GREG_C.x - a.pose.x, GREG_C.z - a.pose.z) / D2R) as number;
      const hy = Math.max(-75, Math.min(75, ang - a.pose.ry));
      return { ...a, pose: { ...a.pose, hy, eyeL: 1, eyeR: 1, brow: 1, mouth: a.kind === "chloe" ? 2 : 1 } };
    });
  }
  const machine = frozen ? { shake: 0, tilt: 0 } : ch.machine;
  return { actors: [...actors, act("greg", gp)], machine, bar: ch.bar };
};

// =====================================================================================
// камеры
// =====================================================================================
const camTo = (x: number, y: number, z: number, tx: number, ty: number, tz = 0.6, roll = 0): Cam3 => ({ x, y, z, tx, ty, tz, roll });
/** Камера на точку t с расстояния d, азимут az (град, от +z к +x) */
const orbit = (t: V3, d: number, az: number, dy = 0, roll = 0, tyOff = 0): Cam3 => ({
  x: t[0] + d * Math.sin(az * D2R), y: t[1] + dy, z: t[2] + d * Math.cos(az * D2R), tx: t[0], ty: t[1] + tyOff, tz: t[2], roll,
});
const signFor = (cm: { y: number; z: number; ty: number }) => cm.ty + 0.74 * 0.364 * (cm.z + 2.04);
const find = (a: Actor3[], k: Kind3) => a.find((x) => x.kind === k)!.pose;
/** номер текущего ракурса по таблице моментов (секунды от начала плана) */
const cutIdx = (T: number, cuts: number[]) => {
  let i = 0;
  cuts.forEach((t, j) => {
    if (T >= t - 1e-6) i = j;
  });
  return i;
};

export const frameAt3 = (frame: number, sh: ShotT, env: Array<number[] | undefined>): Frame3 => {
  const fr = frame - sh.from;
  const f = Math.floor(fr / STEP) * STEP;
  const raw = Math.floor(fr / 2) * 2;
  const T = f / FPS;
  const c: Ctx = { f, T, raw, sh, env };
  let out: Partial<Frame3> = {};
  let cam: Cam3 = camTo(1.8, 2.4, 13, 1.8, 1.9, 0.5);
  let bgOff = 0;
  const base: Frame3 = { actors: [], cam, bgOff, truck: null, machine: { shake: 0, tilt: 0 }, hole: 0, puffs: [], dust: [], star: null, bar: null };
  const v0 = sh.voices[0];
  const vs = v0 ? v0.from / FPS : 0;
  const vl = v0 ? v0.len / FPS : 1;
  const fr0 = (x: number) => vs + x * vl; // момент внутри реплики (доля)
  switch (sh.n) {
    case 13: {
      out = shot13(c);
      const cut = Math.max(4.2, vs + 0.4 * vl);
      cam = T < cut ? camTo(2.6, 2.7, 14.8, 2.6, 2.0, 0.5) : T < fr0(0.78) ? camTo(0.5, 2.0, 10.0, 0.5, 1.7, 3.0) : camTo(0.3, 1.5, 6.6, 0.3, 2.0, 3.6);
      bgOff = T < cut ? -2.6 : 0.6;
      break;
    }
    case 14: {
      const o = shot14(c);
      out = o;
      const a = o.actors!;
      const bp = find(a, "brenda");
      const cp = find(a, "chloe");
      const bh = headW(bp, "brenda");
      const ch = headW(cp, "chloe");
      const cuts = [0, 0.9, fr0(0.0) + 0.3, fr0(0.3), fr0(0.45), fr0(0.6), fr0(0.75), fr0(0.88)];
      const cams = [
        orbit(o.P, 2.5, -32, 0.1, 0, -0.05), // деталь: окурок в плакат
        orbit(bh, 3.4, -28, 0.05), // суровое лицо Бренды
        camTo(-1.0, 2.0, 8.0, -1.0, 1.8, 1.0), // средний двухфигурный
        orbit(bh, 3.0, -10, -0.4, 0, 0.1), // Бренда снизу
        orbit(ch, 3.6, 20, 0.1), // Хлоя реагирует (дыра в плакате рядом)
        camTo(-0.4, 1.8, 7.6, -1.2, 1.7, 1.0), // средний с другой стороны
        orbit(bh, 3.3, -40, 0.1), // Бренда с наклоном
        orbit(bh, 2.8, -6, -0.45, 0, 0.15),
      ];
      cam = cams[cutIdx(T, cuts)];
      bgOff = 0.8;
      break;
    }
    case 15: {
      const o = shot15(c);
      out = o;
      const a = o.actors!;
      const sp = find(a, "stacey");
      const cp = find(a, "chloe");
      const cuts = [0, fr0(0.1), fr0(0.28), fr0(0.42), fr0(0.58), fr0(0.72), fr0(0.86)];
      const mid: V3 = [(cp.x + sp.x) / 2, 1.5, (cp.z + sp.z) / 2];
      const cams = [
        camTo(mid[0] + 0.2, 1.8, 6.2, mid[0], 1.7, mid[2], 6),
        orbit(headW(sp, "stacey"), 3.0, -38, 0.55, -8, -0.1),
        orbit(o.Q, 2.3, -18, 0.15, 7, 0),
        orbit(headW(cp, "chloe"), 3.0, 8, 0.1, -7),
        orbit(headW(sp, "stacey"), 2.7, -22, -0.2, 9, 0.1),
        camTo(mid[0], 1.7, 5.4, mid[0] - 0.2, 1.6, mid[2], -6),
        orbit(o.Q, 2.0, 25, 0.2, -7, 0.1),
      ];
      cam = cams[cutIdx(T, cuts)];
      bgOff = 1.4;
      break;
    }
    case 16: {
      out = shot16(c);
      const a = out.actors!;
      const tp = find(a, "tony");
      const mp = find(a, "marcus");
      const mid: V3 = [(tp.x + mp.x) / 2, 1.9, 0.4];
      const vm = voiceOf(c, 3)!;
      const vt = voiceOf(c, 4)!;
      const t4 = vt.from / FPS;
      const L = vm.len / FPS;
      const cuts = [0, vm.from / FPS + 0.3 * L, vm.from / FPS + 0.62 * L, t4 - 0.05, t4 + 0.5, t4 + (vt.len / FPS) * 0.55, t4 + (vt.len / FPS) * 0.8];
      const cams = [
        camTo(mid[0], 1.9, 7.6, mid[0], 1.9, 0.4), // двухфигурный средний
        orbit(headW(mp, "marcus"), 3.4, 22, 0.05), // Маркус крупно
        camTo(mid[0] - 0.3, 1.9, 6.8, mid[0], 1.9, 0.4),
        orbit(headW(tp, "tony"), 3.6, -20, 0.0), // Тони беспечно
        camTo(mid[0], 1.9, 7.6, mid[0], 1.9, 0.4),
        orbit(headW(tp, "tony"), 3.0, -12, -0.3, 0, 0.1), // осознание: лицо вытягивается
        orbit(headW(tp, "tony"), 2.4, -8, -0.1, 0, 0.0),
      ];
      cam = cams[cutIdx(T, cuts)];
      bgOff = 2.2;
      break;
    }
    case 17: {
      out = shot17(c);
      cam = camTo(-2.2, 2.0, 9.4, -2.2, 1.65, 0.3);
      // удары: камера подскакивает на 0.27 с (две позы) в моменты ударов по автомату
      const kick = [0.4, 1.2, 2.0].some((t) => T >= t - 1e-6 && T < t + 0.27);
      if (kick) cam = { ...cam, x: cam.x + 0.14, y: cam.y - 0.1, roll: 1.2 };
      bgOff = 1.6;
      break;
    }
    default: {
      const o = shot18(c);
      out = o;
      const a = o.actors!;
      const gp = find(a, "greg");
      const t0 = vs;
      const cuts = [0, t0, t0 + 0.133, t0 + 0.267, t0 + 0.5, fr0(0.3), fr0(0.5), fr0(0.64), fr0(0.82), fr0(0.92)];
      const cams = [
        camTo(-2.2, 2.0, 9.4, -2.2, 1.65, 0.3), // общий: продолжается балаган
        camTo(-1.5, 2.1, 9.6, -1.3, 1.8, 0.5), // crash zoom: рывок 1
        camTo(-1.2, 1.95, 7.8, -1.0, 1.85, 0.8), // рывок 2
        camTo(-1.0, 1.9, 6.4, -0.9, 1.95, 1.0), // рывок 3
        camTo(-1.0, 1.9, 6.4, -0.9, 1.95, 1.0), // средний (держится)
        orbit(headW(gp, "greg"), 3.4, 6, 0.1), // лицо Грега
        camTo(-2.2, 2.2, 9.6, -2.2, 1.8, 0.5), // замершая толпа за Грегом
        orbit(headW(gp, "greg"), 3.0, -10, -0.5, 0, 0.1), // Грег снизу
        camTo(-1.0, 1.9, 6.4, -0.9, 1.95, 1.0),
        orbit(headW(gp, "greg"), 2.6, 4, 0.0),
      ];
      cam = cams[cutIdx(T, cuts)];
      bgOff = 1.6;
      break;
    }
  }
  const res: Frame3 = { ...base, ...out, cam, bgOff } as Frame3;
  res.signY = signFor(cam);
  void sec;
  return res;
};
