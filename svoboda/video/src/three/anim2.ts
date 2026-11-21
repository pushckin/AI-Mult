// Анимация сцены 2 (30 fps): позы по планам 07-12 как функции ВРЕМЕНИ (секунды).
// Рваная кукольная анимация: поза обновляется раз в 4 кадра (7.5 поз/с), между позами крупная разница (≥15-25° у конечностей), никакого «дыхания»
// и плавного покачивания: «биты» держатся 0.4-0.67 с, холды перед акцентами. Тело, руки, голова - на отдельных шарнирах (корпус ry, голова hy, руки IK).
// Все тайминги в секундах - от длительностей реплик (см. data/scene2.ts). Развороты персонажей: корпус (ry) и голова (hy) вращаются вокруг вертикальной оси.
import { PP, PPatch, mixP } from "./Person";
import { ShotT, S09, S12, CUTS08, STEP_AT, STEP, FPS, mouthFromEnv } from "../data/scene2";
import { clamp } from "./util";
import { ARM_GEOM, armIK, fromTorso, toTorso } from "./ik";

// ---------- масштаб и места ----------
export const SC = { greg: 1.45, tony: 1.5, marcus: 1.35, chloe: 1.3 };
export const BIN = { x: 5.0, z: 1.0 };
export const BUSH = { x: 8.7, z: 0.7 };
export const GREG_X = -2.4;

type V3 = [number, number, number];
type Kind = keyof typeof SC;
const CB = (kind: Kind, o: PPatch = {}): PP =>
  mixP({ scale: SC[kind], y: 0.43 * SC[kind], z: 0.4, eyeL: 0, eyeR: 0, alz: 8, arz: 8, llz: 4, lrz: 4 }, o);

// ---------- время ----------
/** чередование 0/1 с полупериодом p (секунды) */
const alt = (T: number, p: number) => Math.floor(T / p + 1e-6) % 2;
/** номер такта длиной p (секунды) по модулю n */
const cyc = (T: number, p: number, n: number) => Math.floor(T / p + 1e-6) % n;

/** Жёсткие позы: ключ (секунда) действует и держится до следующего (никакой интерполяции) */
type K = PPatch & { t: number };
const seg = (keys: K[], T: number): PPatch => {
  let out: PPatch = {};
  for (const { t: kt, ...patch } of keys) if (kt <= T + 1e-6) out = { ...out, ...patch };
  return out;
};
/** Бит - поза, которая держится d секунд; список битов крутится по кругу */
type BP = PPatch & { dy?: number; ryd?: number; mega?: Mega; plac?: keyof typeof PLAC; cross?: boolean };
type Beat = readonly [number, BP];
const beatAt = (T: number, list: ReadonlyArray<Beat>, off = 0): { p: BP; i: number; k: number } => {
  let tot = 0;
  for (const [d] of list) tot += d;
  let t = (((T + off) % tot) + tot) % tot;
  for (let i = 0; i < list.length; i++) {
    const [d, p] = list[i];
    if (t < d - 1e-6) return { p, i, k: t };
    t -= d;
  }
  return { p: list[0][1], i: 0, k: 0 };
};
/** Рука в точку target (торс-координаты персонажа) */
const arm = (p: PP, kind: Kind, side: 1 | -1, target: V3, abdPref = 20): PP => {
  const a = armIK(ARM_GEOM[kind === "greg" ? "tony" : kind], side, target, abdPref);
  return side === 1 ? { ...p, alx: a.swing, alz: a.abd, ale: a.elbow } : { ...p, arx: a.swing, arz: a.abd, are: a.elbow };
};
const q2 = (v: number) => Math.round(v * 50) / 50;
const qv = (v: V3): V3 => [q2(v[0]), q2(v[1]), q2(v[2])];

export interface Voices {
  env: Array<number[] | undefined>;
}
export interface Actor {
  kind: "greg" | "tony" | "marcus" | "chloe";
  pose: PP;
}
export interface Cam {
  x: number; y: number; z: number; tx: number; ty: number; tz?: number; shake: number;
}
export interface Frame {
  actors: Actor[];
  cam: Cam;
  bgx: number; // сдвиг фона
  bin: number | null; // x горящей урны (или нет)
  bushShake: number; // 0 нет, иначе амплитуда
  leaves: number; // «тики 1/24 с» полёта листьев (или -1)
  dust: Array<{ x: number; z: number; k: number }>; // k - тики 1/24 с (эффекты рассчитаны на 24)
  tl: number;
}

// Рот обновляется чаще позы (каждые 2 кадра), чтобы попадать в слоги: RAW - кадр плана, округлённый на MSTEP вниз
let RAW = 0;
/** Реплика: рот по огибающей (пауза/провал между слогами - закрыт) */
const speak = (p: PP, sh: ShotT, env: number[] | undefined): PP => {
  const k = RAW - sh.vFrom;
  if (k < 0 || k >= sh.vLen) return { ...p, mouth: 0 };
  return { ...p, mouth: mouthFromEnv(env, k, sh.vLen) };
};
const voiced = (sh: ShotT, env: number[] | undefined, ahead = 0) => mouthFromEnv(env, RAW - sh.vFrom + ahead, sh.vLen) > 0;
const isSpeaking = (sh: ShotT) => RAW >= sh.vFrom && RAW < sh.vFrom + sh.vLen;

// =====================================================================================
// ПЛАН 07: Тони и Маркус выглядывают из-за горящей урны. Тони принюхивается: профиль -> 3/4 -> анфас (снимает очки), дальше рыдает рваными позами
// =====================================================================================
const TONY_X = 3.55;
const TONY_CRY: Beat[] = [
  [0.533, { ry: 10, hy: -6, hx: -8, tl: 8, alx: 20, alz: 14, ale: 30, arx: 24, arz: 14, are: 34, eyeL: 2, eyeR: 2, brow: 1 }], // кулаки вниз, очки в руке
  [0.4, { ry: 42, hy: -24, hx: 10, tl: 20, alx: 150, alz: 8, ale: 125, arx: 30, arz: 14, are: 40, eyeL: 3, eyeR: 3, brow: 0.5 }], // трёт глаз ладонью, корпус в 3/4
  [0.533, { ry: -12, hy: 18, hx: -12, tl: 2, alx: 58, alz: 50, ale: 30, arx: 58, arz: 50, are: 30, eyeL: 1, eyeR: 1, brow: 1 }], // руки в стороны: «за что?!»
  [0.4, { ry: 28, hy: 2, hx: 20, tl: 22, alx: 40, alz: 22, ale: 108, arx: 40, arz: 22, are: 108, eyeL: 3, eyeR: 3, brow: 0.6 }], // всхлип: сложился, обнимает себя
  [0.667, { ry: 2, hy: -16, hx: -22, tl: -4, alx: 92, alz: 40, ale: 62, arx: 92, arz: 40, are: 62, eyeL: 2, eyeR: 2, brow: 1 }], // вой с поднятым подбородком
];
const MARCUS_CRY: Beat[] = [
  [0.533, { tl: 14, hx: 16, hy: 0, alx: 55, alz: 14, ale: 105, arx: 55, arz: 14, are: 105, mouth: 4, ryd: 0 }], // всхлип: кивок, руки у груди
  [0.667, { tl: 2, hx: 2, hy: 8, alx: 24, alz: 12, ale: 50, arx: 24, arz: 12, are: 50, mouth: 4, ryd: 14 }], // смотрит на Тони, руки вниз
  [0.4, { tl: 6, hx: 6, hz: -10, alx: 55, alz: 14, ale: 105, arx: 152, arz: 12, are: 122, mouth: 1, ryd: -10 }], // вытирает глаза рукой
  [0.533, { tl: 8, hx: 10, alx: 158, alz: 20, ale: 130, arx: 158, arz: 20, are: 130, mouth: 3, ryd: 8 }], // обе ладони на щеках
  [0.4, { tl: -6, hx: -14, hy: -8, alx: 20, alz: 52, ale: 30, arx: 20, arz: 52, are: 30, mouth: 2, ryd: -18 }], // вой: руки в стороны
];
const shot07 = (f: number, sh: ShotT, v: Voices): Actor[] => {
  const T = f / FPS;
  const L = sh.len / FPS;
  const squat = { llx: 70, lrx: 70, llk: 100, lrk: 100, y: 0.3 };
  const tk: K[] = [
    { t: 0, ...squat, ry: 74, rz: 0, tl: 12, hy: -8, hx: -3, brow: 0.3, alx: 40, ale: 60, arx: 40, are: 60, alz: 14, arz: 14, acc: 0, eyeL: 0, eyeR: 0, hp: 0 },
    // принюхивание: подбородок вверх рывками (профиль к урне)
    { t: 0.4, hx: -26, tl: 18 }, { t: 0.667, hx: 0, tl: 8 }, { t: 0.933, hx: -26, tl: 18, hy: -14 }, { t: 1.2, hx: -2, tl: 8, hy: -4 },
    // замечает: корпус разворачивается из профиля в 3/4, рука к очкам
    { t: 1.333, ry: 42, hy: 12, hx: -14, tl: 14, brow: 0.6, arx: 150, are: 100, alz: 8, arz: 8 },
    // анфас: очки сняты, глаза выпучены
    { t: 1.6, ry: 6, hy: -6, hx: -4, arx: 164, are: 112, acc: 1, hp: 1, brow: 1, eyeL: 1, eyeR: 1, y: 0.31 },
    { t: 1.867, y: 0.34 },
    { t: 3.2, y: 0.44, llx: 50, lrx: 50, llk: 70, lrk: 70 },
    { t: 5.0, y: 0.56, llx: 14, lrx: 14, llk: 24, lrk: 24 },
  ];
  let tpose = mixP({ scale: SC.tony, x: TONY_X, z: 0.25, eyeL: 0, eyeR: 0, llz: 4, lrz: 4, alz: 10, arz: 10, ...seg(tk, T) });
  if (T >= 1.867) {
    const { p } = beatAt(T - 1.867, TONY_CRY);
    tpose = { ...tpose, ...p, tear: 1 + cyc(T - 1.6, 0.267, 3) };
  } else if (T >= 1.6) tpose = { ...tpose, tear: 1 };
  tpose = speak(tpose, sh, v.env[0]);

  // --- Маркус: справа от урны, из профиля (к Тони) поворачивается в 3/4, всхлипывает рваными позами ---
  const peekX: Array<[number, number]> = [[0, 7.15], [0.4, 7.15], [0.533, 6.7], [0.933, 6.7], [1.067, 7.15], [1.467, 7.15], [1.6, 6.7], [2.533, 6.7], [2.667, 6.95], [3.067, 6.95], [3.2, 6.65]];
  let mx = peekX[0][1];
  for (const [kt, kx] of peekX) if (T >= kt - 1e-6) mx = kx;
  const mk: K[] = [
    { t: 0, ry: -74, y: 0.42, llx: 40, lrx: 40, llk: 60, lrk: 60 },
    { t: 2.0, ry: -62, y: 0.46 },
    { t: 4.0, ry: -50 },
    { t: 5.0, ry: -40, y: 0.5, llx: 20, lrx: 20, llk: 24, lrk: 24 },
    { t: L - 2.5, y: 0.55, llx: 6, lrx: 6, llk: 6, lrk: 6 },
  ];
  const mb = seg(mk, T);
  const { p: mbeat } = beatAt(T, MARCUS_CRY);
  const { ryd = 0, ...mrest } = mbeat;
  const mp = mixP({ scale: SC.marcus, z: 0.3, eyeL: 0, eyeR: 0, llz: 4, lrz: 4, brow: 1, ...mb, ...mrest, x: mx, ry: (mb.ry ?? -74) + ryd, tear: T > 4.0 ? 1 + cyc(T, 0.267, 3) : 0 });
  return [
    { kind: "marcus", pose: mp },
    { kind: "tony", pose: tpose },
  ];
};

// =====================================================================================
// ПЛАН 08: Маркус бросается Тони на шею; объятие в профиль. Камера - только жёсткие склейки (см. cam08)
// =====================================================================================
const T08 = { x: 3.95, z: 0.5 };
const M08 = { x: 2.85, z: 0.62 };
const shot08 = (f: number, sh: ShotT, v: Voices): Actor[] => {
  const T = f / FPS;
  // ----- Тони: профиль влево. A (0.67-1.67) руки вверх от неожиданности; B (1.67-4.0) обнимает в ответ; C (4.0-5.4) стискивает; D (5.4+) прижал -----
  const tk: K[] = [
    { t: 0, ry: -84, tl: 0, hy: 34, hx: 4, alx: 30, ale: 40, arx: 30, are: 40, alz: 30, arz: 30, brow: 1, eyeL: 2, eyeR: 2 },
    { t: 0.667, tl: 5, hy: 16, hx: 12, alx: 52, arx: 60, ale: 20, are: 20, alz: 70, arz: 70, brow: 1 },
    { t: 1.667, tl: 12, ry: -78, hx: 24, hy: 34, eyeL: 3, eyeR: 3, llx: 14, lrx: 14, llk: 26, lrk: 26, y: 0.43 * SC.tony - 0.07 },
    { t: 4.0, tl: 14, ry: -74, hx: 28, hy: 38, llx: 22, lrx: 22, llk: 40, lrk: 40, y: 0.43 * SC.tony - 0.11 },
    { t: 5.467, tl: 16, ry: -70, hx: 30, hy: 42 },
  ];
  const tpp = seg(tk, T);
  const hug = T >= 1.667;
  const sob = T >= 0.667 ? alt(T, 0.4) : 0; // рыдания рваными толчками: корпус и голова меняются сразу на 10-14°
  let tp = mixP({ scale: SC.tony, x: T08.x, z: T08.z, y: 0.43 * SC.tony, llz: 6, lrz: 6, acc: 1, hl: 0, hr: 0, mouth: 0, ...tpp });
  tp = { ...tp, tear: 1 + cyc(T, 0.267, 3), tl: tp.tl + (sob ? 8 : 0), hx: tp.hx + (sob ? 12 : 0) };

  // ----- Маркус: 0-0.4 бег рваными позами, 0.4-0.67 прыжок, 0.67+ виснет на шее на носочках -----
  const run = T < 0.4;
  const leap = T >= 0.4 && T < 0.667;
  let mp: PP;
  if (run) {
    const ph = alt(T, 0.1333);
    const step = Math.floor(T / 0.1333);
    mp = mixP({
      scale: SC.marcus, x: M08.x - 2.55 + step * 0.34, z: 0.62, ry: 80, y: 0.58 + (ph ? 0.07 : 0), tl: 14, hy: -28, hx: 6, mouth: 4, brow: 1, eyeL: 0, eyeR: 0,
      llx: ph ? 52 : -48, lrx: ph ? -48 : 52, llk: ph ? 6 : 64, lrk: ph ? 64 : 6, alx: ph ? -50 : 50, arx: ph ? 50 : -50, ale: 64, are: 64, alz: 14, arz: 14,
    });
  } else if (leap) {
    mp = mixP({
      scale: SC.marcus, x: M08.x - 1.1 + (T >= 0.5 ? 0.6 : 0), z: 0.62, ry: 82, y: 1.0 + (T >= 0.5 ? 0.08 : 0), tl: 6, hy: -36, mouth: 4, brow: 1, eyeL: 0, eyeR: 0,
      llx: 40, lrx: 14, llk: 80, lrk: 50, alx: 150, arx: 150, ale: 20, are: 20, alz: 50, arz: 50,
    });
  } else {
    // жёсткие позы объятия: A (0.67-1.67) на носочках; B (1.67-4.0) нога подогнута, рывком ближе; C (4.0-5.4) повис; D (5.4+) приподнят, голова на плече
    const poseA = T < 1.667;
    const poseB = T >= 1.667 && T < 4.0;
    const poseD = T >= 5.467;
    const push = poseA ? 0 : poseB ? 0.05 : poseD ? 0.1 : 0.07; // рывки к Тони
    mp = mixP({
      scale: SC.marcus, x: M08.x + push, z: poseA ? 0.74 : poseB ? 0.8 : 0.86, ry: poseD ? 74 : 84, y: poseA ? 0.7 : 0.5, tl: poseA ? 6 : 16, hy: poseD ? -22 : -4, hx: poseA ? 4 : 10, mouth: 0, brow: 1, eyeL: 0, eyeR: 0,
      llx: poseA ? 0 : 26, lrx: poseA ? 0 : 14, llk: poseA ? 0 : 56, lrk: poseA ? 0 : 36, llz: 7, lrz: 7, toe: poseA ? 58 : 0,
      ...(poseB ? { lrx: 4, lrk: 20, llx: 34, llk: 64 } : {}),
      ...(T >= 4.0 ? { llx: 30, lrx: 18, llk: 58, lrk: 44, y: 0.47 } : {}),
      ...(poseD ? { llx: 36, lrx: 10, llk: 70, lrk: 26, y: 0.52, tl: 20 } : {}),
    });
    mp = { ...mp, hx: mp.hx + (sob ? 10 : 0), tl: mp.tl + (sob ? -6 : 0), tear: 1 + cyc(T, 0.267, 3), y: mp.y + (sob ? 0.04 : 0) };
  }
  mp = speak({ ...mp, mouth: 0 }, sh, v.env[1]);
  if (!isSpeaking(sh) || mp.mouth === 0) mp = { ...mp, mouth: T < 0.667 ? 4 : 0 };

  // ----- руки обхватывают: IK по положению партнёра. Ближняя к камере рука Маркуса (side -1) ложится спереди на шею и плечо Тони, дальняя - за шею -----
  if (!run && !leap) {
    const neck = fromTorso(tp, [0, 0.62, 0]);
    mp = arm(mp, "marcus", -1, qv(toTorso(mp, [neck[0] + 0.1, neck[1] - 0.08, neck[2] + 0.34])), 40);
    mp = arm(mp, "marcus", 1, qv(toTorso(mp, [neck[0] + 0.26, neck[1] - 0.22, neck[2] - 0.3])), 40);
    mp = { ...mp, hl: 0, hr: 0 };
  } else if (leap) {
    mp = { ...mp, hl: 0, hr: 0 };
  }
  if (hug) {
    // Тони обнимает в ответ: ближняя к камере рука (side +1) на спине Маркуса сверху, дальняя - пониже; хлопает по спине рывками
    const patting = (T >= 2.267 && T < 3.9) || (T >= 4.4 && T < 6.4);
    const pat = patting ? alt(T, 0.267) * 0.18 : 0;
    const back = (dy: number, dz: number): V3 => qv(toTorso(tp, [mp.x - 0.12, mp.y + 0.62 * SC.marcus + dy, mp.z + dz]));
    tp = arm(tp, "tony", 1, back(pat, 0.2), 30);
    tp = arm(tp, "tony", -1, back(-0.22 - pat * 0.5, -0.14), 30);
    tp = { ...tp, hl: 0, hr: 0 };
  }
  return [
    { kind: "tony", pose: tp },
    { kind: "marcus", pose: mp },
  ];
};

// =====================================================================================
// ПЛАН 09: Хлоя из куста. Присед 0.4 с (3 жёсткие позы) -> вылет по дуге с разворотом на 360° 0.67 с (4 позы, поза-акцент «герой» с холдом)
//         -> приземление 0.4 с (3 позы). В руках плакат и мегафон всегда. Дальше сирена и речь рваными битами.
// =====================================================================================
const CH_LAND = { x: 7.15, z: 0.9 };
type Mega = "up" | "down" | "fwd" | "air" | "side";
const MEGA: Record<Mega, { t: V3; hp: number; my: number }> = {
  up: { t: [-0.14, 0.48, 0.5], hp: -4, my: 6 },
  side: { t: [-0.62, 0.52, 0.34], hp: -8, my: -22 }, // у рта сбоку, не закрывая лица
  down: { t: [-0.6, 0.24, 0.12], hp: 48, my: 0 },
  fwd: { t: [-0.5, 0.5, 0.62], hp: 0, my: 0 },
  air: { t: [-0.36, 0.74, 0.6], hp: -6, my: 0 },
};
const PLAC = {
  mid: { t: [0.84, 0.55, 0.3] as V3, cup: -8 },
  cow: { t: [0.86, -0.2, 0.16] as V3, cup: -14 },
  std: { t: [0.86, 0.3, 0.3] as V3, cup: -10 },
  hi: { t: [0.84, 0.74, 0.3] as V3, cup: -10 },
  low: { t: [0.78, 0.18, 0.3] as V3, cup: -14 },
};
/** Хлоя: мегафон всегда в правой руке (ручка в кулаке), плакат всегда в левой */
const chloeHands = (p: PP, mega: Mega, plac: keyof typeof PLAC, megaT?: V3): PP => {
  const m = MEGA[mega];
  const pl = PLAC[plac];
  let r = arm(p, "chloe", -1, qv(megaT ?? m.t), 30);
  r = arm(r, "chloe", 1, pl.t, 40);
  return { ...r, hr: 2, hl: 2, hp: m.hp, my: m.my, cup: pl.cup, py: Math.max(-75, Math.min(75, -p.ry * 0.85)) };
};
/** речь Хлои в мегафон: каждые 0.4-0.67 с другая поза и поворот корпуса */
const CH_SPEAK: Beat[] = [
  [0.533, { ry: -30, hy: 22, hx: -2, tl: -3, mega: "side", plac: "std" }], // мегафон у рта
  [0.4, { ry: -74, hy: 30, hx: -4, tl: -6, mega: "fwd", plac: "std" }], // корпус в профиль: тычет мегафоном влево
  [0.533, { ry: -4, hy: 6, hx: -4, tl: -8, mega: "down", plac: "hi" }], // анфас: плакат вверх
  [0.4, { ry: -52, hy: 16, hx: 2, tl: 4, mega: "up", plac: "mid" }],
  [0.667, { ry: -22, hy: 26, hx: -4, tl: -4, mega: "side", plac: "low" }],
];
type AirP = PPatch & { t: number; mega: Mega; plac: keyof typeof PLAC };
const AIR: AirP[] = [
  // выглядывает над кустом (лицом вправо-вперёд), затем смотрит в другую сторону
  { t: 0.133, x: 8.62, z: 0.45, y: 0.52, ry: -50, tl: 14, llx: -34, lrx: -52, llk: 84, lrk: 66, hy: 22, hx: -4, mouth: 4, mega: "side", plac: "hi" },
  { t: 0.267, x: 8.62, z: 0.45, y: 0.5, ry: -70, tl: 10, llx: -34, lrx: -52, llk: 84, lrk: 66, hy: -14, hx: 2, mouth: 4, mega: "side", plac: "hi" },
  // ПРИСЕД 0.4 с (0.4-0.8): сжимается в три жёстких приёма
  { t: 0.4, x: 8.62, z: 0.5, y: 0.44, ry: -46, tl: 24, llx: -34, lrx: -50, llk: 90, lrk: 76, hy: 8, hx: 4, mega: "down", plac: "hi" },
  { t: 0.533, x: 8.62, z: 0.5, y: 0.38, ry: -42, tl: 32, llx: -40, lrx: -56, llk: 102, lrk: 92, hy: 0, hx: 10, eyeL: 2, eyeR: 2, mega: "down", plac: "low" },
  { t: 0.667, x: 8.62, z: 0.5, y: 0.33, ry: -38, tl: 38, llx: -44, lrx: -58, llk: 110, lrk: 100, hy: -4, hx: 14, eyeL: 2, eyeR: 2, mega: "down", plac: "low" },
  // ВЫЛЕТ с разворотом на 360° (0.8-1.47): взлёт - полёт спиной - переворот - поза-акцент «герой» с холдом
  { t: 0.8, x: 8.55, z: 0.55, y: 1.0, ry: -25, tl: 4, rz: 0, llx: 6, lrx: -4, llk: 8, lrk: 6, llz: 14, lrz: 14, hy: 0, hx: -6, mouth: 2, mega: "air", plac: "hi" },
  { t: 0.933, x: 8.25, z: 0.62, y: 1.75, ry: 65, tl: 12, rz: -14, llx: 44, lrx: 26, llk: 96, lrk: 82, hy: -10, hx: 4, mouth: 2, mega: "fwd", plac: "mid" },
  { t: 1.067, x: 7.9, z: 0.7, y: 2.3, ry: 160, tl: 20, rz: 14, llx: 56, lrx: 36, llk: 110, lrk: 100, hy: 12, hx: 6, mouth: 2, mega: "air", plac: "low" },
  { t: 1.2, x: 7.6, z: 0.8, y: 2.15, ry: -42, tl: -8, rz: 8, llx: 30, lrx: -30, llk: 14, lrk: 14, llz: 46, lrz: 46, hy: 16, hx: -8, mouth: 2, mega: "fwd", plac: "hi" }, // АКЦЕНТ: растопырена, плакат вверх
  { t: 1.333, x: 7.4, z: 0.85, y: 1.5, ry: -42, tl: -8, rz: 8, llx: 30, lrx: -30, llk: 14, lrk: 14, llz: 46, lrz: 46, hy: 16, hx: -8, mouth: 2, mega: "fwd", plac: "hi" }, // холд: падает той же позой
];
const shot09 = (f: number, sh: ShotT, v: Voices): { actors: Actor[]; leaves: number } => {
  const T = f / FPS;
  if (T < 0.133) return { actors: [], leaves: -1 };
  let pose: PP;
  if (T < S09.land) {
    let cur = AIR[0];
    for (const a of AIR) if (T >= a.t - 1e-6) cur = a;
    const { t: _t, mega, plac, ...patch } = cur;
    pose = CB("chloe", { eyeL: 1, eyeR: 1, brow: 1, mouth: 0, llz: 22, lrz: 22, ...patch });
    pose = chloeHands(pose, mega, plac);
  } else if (T < S09.siren) {
    // ПРИЗЕМЛЕНИЕ 0.4 с: глубокое сжатие - выпрямление - стойка
    const tt = T - S09.land;
    const st = tt < 0.1 ? 0 : tt < 0.25 ? 1 : 2;
    const ry = [-44, -38, -30][st];
    pose = CB("chloe", {
      x: CH_LAND.x, z: CH_LAND.z, ry, y: [0.45, 0.5, 0.56][st], tl: [16, 6, -3][st], hx: [10, 2, -3][st], hy: [18, 20, 22][st], llz: [28, 18, 14][st], lrz: [28, 18, 14][st],
      llk: [72, 30, 0][st], lrk: [62, 24, 0][st], llx: [28, 12, 4][st], lrx: [20, 8, -2][st], mouth: 0, eyeL: st === 0 ? 2 : 0, eyeR: st === 0 ? 2 : 0, brow: 0.6,
    });
    pose = chloeHands(pose, (["air", "down", "side"] as Mega[])[st], (["hi", "std", "std"] as Array<keyof typeof PLAC>)[st]);
  } else {
    // сирена (до реплики) и речь: биты 0.4-0.67 с, корпус вертится из профиля в анфас
    const speakingNow = isSpeaking(sh);
    const loud = f < sh.vFrom;
    const { p, i } = beatAt(T - S09.siren, CH_SPEAK, 0);
    const { mega = "side", plac = "std", ...patch } = p;
    pose = CB("chloe", { x: CH_LAND.x, z: CH_LAND.z, y: 0.56, brow: 0.8, llz: 14, lrz: 14, ...patch, mouth: 0 });
    pose = chloeHands(pose, mega, plac);
    const env = v.env[2];
    if (loud) pose = { ...pose, sir: 1 + cyc(T, 0.1333, 3), eyeL: 1, eyeR: 1, mouth: i % 2 ? 2 : 1 };
    if (speakingNow) {
      pose = speak({ ...pose, eyeL: 0, eyeR: 0, brow: 1 }, sh, env);
      if (pose.mouth === 2 && mega !== "down") pose = { ...pose, sir: 1 + cyc(T, 0.1333, 3) };
    } else if (RAW >= sh.vFrom + sh.vLen) pose = { ...pose, sir: 0, mouth: 0, eyeL: 0, eyeR: 0 };
  }
  return { actors: [{ kind: "chloe", pose }], leaves: Math.round((T - S09.jump) * 24) };
};

// =====================================================================================
// ГРЕГ: живая реакция. Поза и мимика меняются каждые 0.4-0.67 с, одинаковых кадров дольше 0.7 с нет; тело откидывается, сдувается, вздыхает,
// корпус и голова вертятся (ry от 25° до 78°) - в сторону Хлои и обратно.
// =====================================================================================
type GBeat = PPatch & { talk?: boolean; dy?: number };
const GREG_BEATS: GBeat[] = [
  { tl: -16, hx: -8, hy: 20, mouth: 4, brow: -1, eyeL: 2, eyeR: 2, ry: 64, alx: 38, alz: 40, ale: 20, lx: 1.2, ly: 0, arx: 8, are: 36, arz: 22, dy: 0.03, talk: true }, // откинулся, стаканчик опущен
  { tl: -4, hx: -18, hy: 6, mouth: 4, brow: -1, eyeL: 0, eyeR: 0, lx: 0, ly: 2.4, alx: 14, alz: 14, ale: 10, arx: 76, are: 40, arz: 30, ry: 34, talk: true }, // закатил глаза вверх
  { tl: 16, hx: 26, hy: 8, mouth: 1, brow: 0.4, eyeL: 3, eyeR: 3, alx: 4, alz: 8, ale: 6, arx: 14, are: 20, arz: 10, ry: 48, dy: -0.08, llk: 26, lrk: 26, llx: 6, lrx: 6 }, // вздох: сдулся, плечи вперёд, колени подогнуты
  { tl: -8, hx: -8, hy: 14, mouth: 0, brow: -0.5, eyeL: 2, eyeR: 2, arx: 150, are: 122, arz: 10, ry: 58, lx: 0.6, ly: 0.8 }, // поднял стаканчик к губам
  { tl: 0, hx: 4, hy: 34, mouth: 4, brow: -1, eyeL: 2, eyeR: 2, alx: 22, alz: 26, ale: 30, arx: 40, are: 100, arz: 40, ry: 26, tz: 5, talk: true }, // мотает головой «нет»
  { tl: 6, hx: 16, hy: 6, mouth: 4, brow: -1, eyeL: 3, eyeR: 3, alx: 164, alz: 8, ale: 126, ry: 42 }, // ладонь на лоб
  { tl: -10, hx: -2, hy: 16, mouth: 6, brow: 1, eyeL: 1, eyeR: 1, alx: 58, alz: 74, ale: 28, arx: 54, arz: 62, are: 34, ry: 76, lx: 1.0, ly: 0, talk: true }, // руки в стороны: «серьёзно?!», к Хлое
  { tl: -12, hx: -2, hy: 24, mouth: 6, brow: -1, eyeL: 2, eyeR: 2, alx: 92, alz: 18, ale: 6, ry: 80, lx: 1.6, ly: 0, talk: true }, // тычет пальцем в Хлою
  { tl: -2, hx: 6, hy: 10, mouth: 4, brow: 0.2, eyeL: 2, eyeR: 2, alx: 14, alz: 52, ale: 62, arx: 28, arz: 40, are: 70, ry: 30, tz: -6, talk: true }, // пожал плечами, голова набок
];
// порядок: соседние биты никогда не повторяются; sip/facepalm (индексы 3, 5) молчаливые
const GREG_ORDER = [0, 3, 1, 7, 2, 4, 6, 5, 8, 1, 0, 6, 3, 4, 2, 8, 7, 5, 1, 0];
const GREG_DUR = [0.533, 0.667, 0.533, 0.667, 0.4, 0.667, 0.533, 0.667, 0.533, 0.4];
const gregBeat = (T: number, talking: boolean): GBeat => {
  let t = 0;
  let i = 0;
  for (;;) {
    const d = GREG_DUR[i % GREG_DUR.length];
    if (T < t + d - 1e-6) break;
    t += d;
    i++;
  }
  let bi = GREG_ORDER[i % GREG_ORDER.length];
  if (talking && !GREG_BEATS[bi].talk) bi = GREG_ORDER[(i + 1) % GREG_ORDER.length]; // говорящий Грег не пьёт и не закрывает лицо
  if (talking && !GREG_BEATS[bi].talk) bi = 0;
  return GREG_BEATS[bi];
};
const gregPose = (T: number, base: PPatch, sh: ShotT, env: number[] | undefined, talkWindow: boolean): PP => {
  const talkingWin = talkWindow && isSpeaking(sh);
  const { talk: _tk, dy = 0, ...patch } = gregBeat(T, talkingWin);
  let gp = mixP({ scale: SC.greg, y: 0.43 * SC.greg, llz: 4, lrz: 4, arx: 30, are: 80, arz: 16, mouth: 0, ...base, ...patch });
  gp = { ...gp, y: gp.y + dy };
  if (talkingWin) {
    gp = speak(gp, sh, env);
    if (!voiced(sh, env)) gp = { ...gp, mouth: 0 };
  }
  return gp;
};

// =====================================================================================
// ПЛАН 10: Грег (3/4) говорит, Тони и Маркус рядом реагируют: переглядываются, Тони скрещивает руки, закатывает глаза, хватается за лицо
// =====================================================================================
const TONY_REACT: Beat[] = [
  [0.667, { cross: true, hy: 0, hx: 2, eyeL: 2, eyeR: 2, brow: -1, ryd: 0 }], // скептично: руки скрещены
  [0.533, { cross: true, hy: 40, hx: -2, eyeL: 0, eyeR: 0, brow: 0, ryd: 24 }], // поворачивается к Маркусу
  [0.533, { cross: true, hy: -10, hx: -12, hz: -8, lx: 0, ly: 2.2, eyeL: 0, eyeR: 0, brow: -0.4, ryd: -8 }], // закатил глаза
  [0.667, { alx: 164, alz: 10, ale: 126, arx: 20, arz: 14, are: 50, hy: 6, hx: 16, eyeL: 3, eyeR: 3, brow: -1, ryd: -4 }], // ладонь на лицо
  [0.4, { alx: 24, alz: 18, ale: 70, arx: 24, arz: 18, are: 70, hl: 2, hr: 2, hy: -34, hx: -4, eyeL: 1, eyeR: 1, brow: 1, ryd: -26 }], // двойной взгляд на Грега, кулаки
  [0.533, { cross: true, hy: 14, hx: 6, eyeL: 2, eyeR: 2, brow: -1, ryd: 10 }],
];
/** Тони в сцене реакций */
const tonyReact = (T: number, x: number, z: number, ry0: number, off = 0): PP => {
  const { p } = beatAt(T, TONY_REACT, off);
  const { ryd = 0, cross, ...patch } = p;
  const TS = 1.6;
  let tp = mixP({ scale: TS, x, z, y: 0.43 * TS, ry: ry0 + ryd, tl: 2, acc: 1, eyeL: 2, eyeR: 2, brow: -0.6, mouth: 0, llz: 5, lrz: 5, ...patch });
  if (cross) {
    tp = arm(tp, "tony", 1, [-0.3, 0.38, 0.5], 10); // руки скрещены на груди
    tp = arm(tp, "tony", -1, [0.3, 0.3, 0.52], 10);
  }
  return tp;
};
const MARCUS_REACT: Beat[] = MARCUS_CRY;
/** Маркус в сцене реакций */
const marcusReact = (T: number, x: number, z: number, ry0: number, towards: number, off = 0): PP => {
  const MS = 1.5;
  const { p, i } = beatAt(T, MARCUS_REACT, off);
  const { ryd = 0, ...patch } = p;
  const hy = (patch.hy ?? 0) + (i % 2 ? towards : towards * 0.3);
  return { ...mixP({ scale: MS, x, z, y: 0.43 * MS, ry: ry0 + ryd, brow: 1, llz: 4, lrz: 4, ...patch, hy }), tear: 1 + cyc(T, 0.267, 3) };
};
const shot10 = (f: number, sh: ShotT, v: Voices): Actor[] => {
  const T = f / FPS;
  const gp = gregPose(T, { x: GREG_X, z: 0.4, lx: 1.2, ly: 0, eyeL: 2, eyeR: 2, brow: -1 }, sh, v.env[3], true);
  const tp = tonyReact(T, 0.7, 1.0, -34);
  const mp = marcusReact(T, 2.85, 0.9, -26, 10, 0.4);
  return [
    { kind: "greg", pose: gp },
    { kind: "marcus", pose: mp },
    { kind: "tony", pose: tp },
  ];
};

// =====================================================================================
// ПЛАН 11: Хлоя (справа) тычет в Грега и жестом на Тони и Маркуса: корпус на 90° (профиль) - анфас - снова профиль; Грег поворачивается к Хлое
// =====================================================================================
type CSec = { t: number; ry: number; hy: number; mega: Mega; plac: keyof typeof PLAC; tl?: number; aim?: V3; my?: number; mp?: number; brow?: number };
const C11: CSec[] = [
  { t: -9, ry: -34, hy: 12, mega: "down", plac: "std", brow: -0.8 }, // обиженно опустила мегафон
  { t: 0.0, ry: -88, hy: 16, mega: "fwd", plac: "std", my: -18, tl: -4, brow: -1 }, // 90°: тычет мегафоном в Грега
  { t: 0.9, ry: 8, hy: -4, mega: "down", plac: "hi", tl: -6, brow: -1 }, // анфас: возмущённо, плакат вверх
  { t: 1.8, ry: -86, hy: 14, mega: "fwd", plac: "std", my: -18, tl: -6, brow: -1 }, // опять на Грега
  { t: 2.7, ry: 22, hy: -8, mega: "down", plac: "mid", tl: -4, brow: 0 },
  { t: 3.6, ry: -84, hy: 18, mega: "fwd", plac: "low", my: -18, tl: -8, brow: -1 }, // Грег в третий раз
  { t: 4.5, ry: 2, hy: -2, mega: "up", plac: "hi", tl: -4, brow: -0.6 },
  { t: 5.4, ry: -90, hy: 26, mega: "fwd", plac: "std", aim: [-0.9, 0.58, 0.45], my: -35, tl: -6, brow: -1 }, // 90°: мегафон на Маркуса
  { t: 6.3, ry: -86, hy: 30, mega: "fwd", plac: "hi", aim: [-0.95, 0.3, 0.42], my: -35, tl: -2, brow: -1 }, // на Тони, плакат вверх
  { t: 7.2, ry: 12, hy: -6, mega: "down", plac: "mid", tl: -4, brow: 0.4 },
  { t: 8.1, ry: -90, hy: 30, mega: "fwd", plac: "low", aim: [-0.9, 0.5, 0.45], my: -35, tl: -8, brow: -1 }, // снова на них
  { t: 9.0, ry: -4, hy: 8, mega: "down", plac: "std", tl: 0, brow: 0.6 },
];
const shot11 = (f: number, sh: ShotT, v: Voices): Actor[] => {
  const T = f / FPS;
  const env = v.env[4];
  const vs = (f - sh.vFrom) / FPS; // секунды от начала реплики
  const sp = isSpeaking(sh);
  const after = f >= sh.vFrom + sh.vLen;
  // ----- Хлоя: секция по времени реплики -----
  let sec = C11[0];
  for (const c of C11) if (vs >= c.t - 1e-6) sec = c;
  if (after) sec = { t: 0, ry: -30, hy: 14, mega: "down", plac: "std", brow: 0.2 };
  if (T < 0.4) sec = { t: 0, ry: -36, hy: 10, mega: T < 0.133 ? "up" : T < 0.267 ? "fwd" : "down", plac: "std", brow: -0.8 };
  let cp = CB("chloe", { x: 7.5, z: 1.15, ry: sec.ry, tl: sec.tl ?? -3, hx: -4, hy: sec.hy, llz: 12, lrz: 12, mouth: 0, eyeL: 0, eyeR: 0, brow: sec.brow ?? -0.8 });
  cp = chloeHands(cp, sec.mega, sec.plac, sec.aim);
  if (sec.my !== undefined) cp = { ...cp, my: sec.my };
  if (sp) cp = speak({ ...cp, eyeL: 0, eyeR: 0 }, sh, env);
  else cp = { ...cp, mouth: 0 };

  // ----- Грег: живая реакция, поворачивается корпусом к Хлое (справа) и обратно -----
  const gp = gregPose(T, { x: 5.0, z: 0.8, lx: 1.0, ly: 0, eyeL: 2, eyeR: 2, brow: -1 }, sh, undefined, false);
  const tp = tonyReact(T + 0.3, 2.2, 1.0, 38, 1.2);
  const mk = marcusReact(T + 0.1, 3.4, 0.75, 30, -16, 0.8);
  return [
    { kind: "marcus", pose: mk },
    { kind: "tony", pose: tp },
    { kind: "greg", pose: gp },
    { kind: "chloe", pose: cp },
  ];
};

// =====================================================================================
// ПЛАН 12: финал жёсткими склейками: общий (a1, a2) / Хлоя крупно / Тони снизу / ОБЩИЙ ВДВОЁМ (Маркус слева на переднем плане, Тони и Хлоя справа лицом друг к другу в 3/4)
// =====================================================================================
/** Какой под-план 12 в момент T (секунды) */
export const sub12 = (T: number) => (T < S12.a2 ? "a" : T < S12.b ? "a2" : T < S12.c ? "b" : T < S12.d ? "c" : "d");
/** Двойной бицепс: плечи отведены в стороны, плечо скручено так, что локоть сгибает предплечья ВВЕРХ, кулаки, бугор бицепса на верхней стороне руки */
const DBL = { arx: 0, arz: 86, are: 104, atr: 90, alx: 0, alz: 86, ale: 104, atl: 90, hl: 2, hr: 2 };
/** Бицепс одной рукой (правая - ближняя): плечо отведено в сторону горизонтально, предплечье вертикально вверх, бугор бицепса сверху - виден сбоку, как профиль руки; левая рука - кулак на поясе */
const SIDE_R = { arx: 0, arz: 88, are: 92, atr: 90, alx: 4, alz: 40, ale: 85, atl: 0, hl: 2, hr: 2 };
const SIDE_L = { alx: 0, alz: 88, ale: 92, atl: 90, arx: 4, arz: 22, are: 105, atr: 0, hl: 2, hr: 2 }; // то же левой рукой (к Хлое)
const shot12 = (f: number, sh: ShotT, v: Voices): Actor[] => {
  const T = f / FPS;
  const sub = sub12(T);
  const env = v.env[5];
  const blink = cyc(T, 0.4, 5) === 2;
  const mkTony = (o: PPatch): PP => {
    let tp = mixP({ scale: SC.tony, z: 1.0, y: 0.43 * SC.tony, tl: 3, hy: -10, hx: -4, alz: 10, arz: 10, brow: -1, eyeL: 2, eyeR: 2, mouth: 0, llz: 8, lrz: 8, acc: 1, ...o });
    tp = speak(tp, sh, env);
    if (tp.mouth === 0) tp = { ...tp, brow: -1 };
    return tp;
  };
  // Хлоя: плакат ниже и сбоку (не закрывает лицо), мегафон в руке сбоку, глаза - шары с зрачками, слёзы - 2-3 капли
  const mkChloe = (o: PPatch, cow: boolean): PP => {
    let cp = CB("chloe", {
      ry: -62, rz: cow ? -5 : 0, tl: cow ? -1 : 0, hx: cow ? -2 : -4, hy: cow ? 16 : 8, hdy: cow ? -0.1 : 0, y: 0.43 * SC.chloe - (cow ? 0.05 : 0), llz: 12, lrz: 12, brow: 1,
      eyeL: cow ? (blink ? 3 : 1) : 0, eyeR: cow ? (blink ? 3 : 1) : 0, mouth: cow ? (alt(T, 0.267) ? 6 : 4) : 0, ...o,
    });
    if (cow) cp = { ...cp, tear: 1 + cyc(T, 0.4, 3), sw: 0 };
    return chloeHands(cp, cow ? "side" : "down", "cow");
  };
  const mkMarcus = (o: PPatch, off = 0): PP => {
    const { p, i } = beatAt(T, MARCUS_CRY, off);
    const { ryd = 0, ...patch } = p;
    const base = { ...mixP({ scale: SC.marcus, z: 0.45, y: 0.43 * SC.marcus, brow: 1, llz: 4, lrz: 4, ...o, ...patch, ry: (o.ry ?? 0) + ryd }), tear: T > 1.5 ? 1 + cyc(T, 0.267, 3) : 0 };
    return i % 2 ? { ...base, hy: (o.hy ?? 0) + 14 } : base;
  };

  if (sub === "a" || sub === "a2") {
    // ОБЩИЙ: Тони подходит тяжёлыми шагами (профиль вправо, кулаки), Хлоя вжимается, Маркус всхлипывает позади
    let x = 3.9;
    let stepPh = -1;
    STEP_AT.slice(0, 3).forEach((s, i) => {
      x += 0.5 * (T >= s + 0.08 ? 1 : 0);
      if (T >= s && T < s + 0.5) stepPh = i;
    });
    const ph = stepPh >= 0 ? Math.floor((T - STEP_AT[stepPh]) / 0.1333) % 2 : 0;
    const poses: K[] = [{ t: 0, ry: 84, hr: 2, hl: 2, alx: 40, ale: 100, alz: 12, arx: 34, are: 104, arz: 12, hy: -12 }, { t: 1.667, ry: 80, hy: -10, hx: -10, tl: 6 }, { t: 2.9, ry: 72, hy: -16, tl: 8, alx: 70, arx: 60, ale: 90, are: 96 }];
    let tp = mkTony({ x, ...seg(poses, T) });
    if (stepPh >= 0) tp = { ...tp, llx: ph ? 34 : -22, lrx: ph ? -22 : 34, llk: ph ? 0 : 30, lrk: ph ? 30 : 0, y: tp.y + (ph ? 0.05 : 0), tl: tp.tl + 4 };
    const CWA: K[] = [{ t: 0, ry: -64, hy: 14, hx: -2, rz: -5 }, { t: 0.533, ry: -40, hy: 22, hx: 6, rz: 0 }, { t: 1.2, ry: -70, hy: 8, hx: 10, rz: -8 }, { t: 1.867, ry: -52, hy: 20, hx: -4, rz: -3 }, { t: 2.8, ry: -66, hy: 12, hx: 8 }, { t: 3.4, ry: -44, hy: 24, hx: -2 }];
    const cx = 8.25 + (T >= 1.867 ? 0.12 : 0);
    const cp = mkChloe({ x: cx, z: 1.8, ...seg(CWA, T) }, T >= 0.4);
    const mp = mkMarcus({ x: 2.7, z: 0.45, ry: 40, hy: -12 });
    return [{ kind: "marcus", pose: mp }, { kind: "chloe", pose: cp }, { kind: "tony", pose: tp }];
  }
  if (sub === "b") {
    // КРУПНЫЙ ПЛАН ХЛОИ: 3 акцентные позы с паузами: (1) отступает назад, (2) вжимает голову в плечи, (3) осторожно выглядывает
    const k = T - S12.b;
    const ps: K[] = [
      { t: 0, ry: -30, hy: 8 },
      { t: 0.4, ry: -62, hy: 24, hx: -10, rz: -10, tl: -6, hdy: 0, x: 8.05, y: 0.43 * SC.chloe + 0.03 }, // отступила: корпус отвёрнут, подбородок вверх
      { t: 0.933, ry: -24, hy: 4, hx: 12, rz: 0, tl: 6, hdy: -0.18, x: 7.8 }, // голова втянута в плечи
      { t: 1.733, ry: -80, hy: 10, hx: 14, tl: 8, hdy: -0.2 }, // пауза: сжалась ещё, повернулась боком
      { t: 2.4, ry: -34, hy: 26, hx: -6, tl: -2, hdy: -0.06, rz: -3, x: 7.88 }, // выглядывает
      { t: 2.933, ry: -66, hy: 12, hx: 4, tl: 2, hdy: -0.1, x: 7.7 },
    ];
    const cp = mkChloe({ x: 7.7, z: 1.8, ...seg(ps, k) }, true);
    const shut = k >= 0.933 && k < 1.2; // зажмуривается, остальное время глаза - шары с зрачками
    return [{ kind: "chloe", pose: { ...cp, eyeL: shut || blink ? 3 : 1, eyeR: shut || blink ? 3 : 1, brow: shut ? 1 : cp.brow } }];
  }
  if (sub === "c") {
    // НИЖНИЙ РАКУРС: Тони - позы-бицепсы с паузами: замах, двойной бицепс (3/4), анфас, корпус влево, БОКОВОЙ бицепс (профиль, бугор виден сбоку), финальный двойной
    const k = T - S12.c;
    const ps: K[] = [
      { t: 0, ry: 54, arx: 8, arz: 18, are: 20, alx: 8, alz: 18, ale: 20, atl: 0, atr: 0, hl: 2, hr: 2, rz: 0, tl: 2, hy: -26, hx: -4 }, // замах: кулаки вдоль тела
      { t: 0.4, ry: 26, ...DBL, rz: -3, tl: -5, hy: -20, hx: -14 }, // ДВОЙНОЙ БИЦЕПС
      { t: 0.8, ry: 2, ...DBL, rz: 3, tl: -6, hy: 18, hx: -12, y: 0.43 * SC.tony + 0.05 }, // грудью в камеру, голова через плечо
      { t: 1.2, ry: -40, ...DBL, rz: 4, tl: -8, hy: 46, hx: -12 }, // корпус влево
      { t: 1.733, ry: 22, ...SIDE_R, rz: -4, tl: -6, hy: 22, hx: -10 }, // БИЦЕПС ОДНОЙ РУКОЙ: рука согнута в локте, бугор виден сбоку
      { t: 2.267, ry: 22, ...SIDE_R, are: 110, rz: -4, hy: 26, hx: -16, y: 0.43 * SC.tony + 0.04 }, // рука сжата сильнее
      { t: 2.667, ry: 14, ...DBL, rz: -2, tl: -10, hy: -8, hx: -22, y: 0.43 * SC.tony + 0.05 }, // финальный двойной, подбородок вверх
      { t: 3.2, ry: 22, hy: -14, hx: -10, y: 0.43 * SC.tony },
    ];
    const tp = mkTony({ x: 6.2, z: 0.4, ...seg(ps, k) });
    return [{ kind: "tony", pose: tp }];
  }
  // d: ОБЩИЙ ВДВОЁМ: Маркус слева на переднем плане (3/4, всхлипывает), Тони и Хлоя справа лицом друг к другу в 3/4; Тони идёт тремя шагами и в финале - боковой бицепс
  const k = T - S12.d;
  const stepK = STEP_AT.slice(3).map((s) => s - S12.d);
  const steps = stepK.filter((s) => k >= s + 0.08).length;
  const ps: K[] = [
    { t: 0, ry: 52, ...DBL, rz: -3, tl: -4, hy: -6, hx: -10 }, // 3/4 вправо (к Хлое), двойной бицепс
    { t: stepK[0] + 0.12, ry: 46, hy: -14 }, // шаг 1: корпус довернул
    { t: stepK[1] + 0.12, ry: 50, arx: 6, arz: 48, are: 66, alx: 6, alz: 48, ale: 66, atl: 0, atr: 0, hl: 2, hr: 2, rz: -2, tl: -4, hy: -12, hx: -8 }, // шаг 2: кулаки в боки
    { t: stepK[2] + 0.12, ry: 52, hy: -10, hx: -6, tl: 2 }, // шаг 3: нависает, взгляд сверху вниз на Хлою
    { t: stepK[2] + 0.55, ry: 34, ...SIDE_L, rz: -2, tl: -6, hy: 22, hx: -10 }, // БОКОВОЙ БИЦЕПС в 3/4: рука согнута в локте, бугор виден сбоку (пауза)
    { t: stepK[2] + 1.75, ry: 34, ...SIDE_L, ale: 108, hy: 26, hx: -16, tl: -8 }, // сжал сильнее
  ];
  let tp = mkTony({ x: 5.4 + steps * 0.35, z: 1.4, ...seg(ps, k) });
  const stepNow = stepK.findIndex((s) => k >= s && k < s + 0.42);
  if (stepNow >= 0) {
    const ph = Math.floor((k - stepK[stepNow]) / 0.1333) % 2;
    tp = { ...tp, llx: ph ? -22 : 34, lrx: ph ? 34 : -22, llk: ph ? 30 : 0, lrk: ph ? 0 : 30, y: tp.y + 0.04, tl: tp.tl + 4 };
  }
  const stepAt = [0.4, 1.2, 2.0];
  const back = stepAt.filter((s) => k >= s + 0.08).length * 0.2;
  const cwalk = stepAt.some((s) => k >= s && k < s + 0.13);
  const cp0 = mkChloe({ x: 8.45 + back, z: 1.5, ry: -52, hy: 12 }, true);
  const cp = { ...cp0, llx: cwalk ? 22 : 0, lrx: cwalk ? -14 : 0, llk: cwalk ? 24 : 0, y: cp0.y + (cwalk ? 0.04 : 0) };
  const mp = mkMarcus({ x: 4.85, z: 1.9, ry: 55, hy: -10 });
  return [{ kind: "marcus", pose: mp }, { kind: "chloe", pose: cp }, { kind: "tony", pose: tp }];
};

// =====================================================================================
// Камеры. Верх кадра выше крыш (небо), вывеска «VEGAN COFFEE» по центру фона и выше голов. Только жёсткие склейки между планами и внутри планов.
// =====================================================================================
const CAM_Y = 1.5;
const CAM_PITCH = 0.1;
const camAt = (x: number, z: number, y = CAM_Y, pitch = CAM_PITCH) => ({ x, y, z, tx: x, ty: y + z * pitch, tz: 0 });
const camTo = (x: number, y: number, z: number, tx: number, ty: number, tz = 0.6) => ({ x, y, z, tx, ty, tz });
const CAMS = {
  c07: camAt(5.1, 7.0),
  c09: camAt(7.9, 7.9, 1.6),
  c10: camAt(-0.1, 6.6),
  c11: camAt(5.7, 8.6),
  c12a: camAt(6.1, 8.2),
  c12a2: camTo(6.9, 1.3, 8.4, 6.1, 1.8, 1.0),
  c12b: { ...camAt(7.85, 6.6, 1.4), ty: 1.95, tz: 0 },
  c12c: camAt(6.3, 6.3, 0.6, 0.22),
  c12d: camTo(7.6, 1.1, 8.0, 7.4, 1.95, 1.2),
};
/** Объятие (план 08): шесть фиксированных ракурсов, переключение жёсткой склейкой (без облёта и интерполяции) */
const CAMS08 = [
  camTo(3.0, 1.45, 7.4, 3.0, 1.9),
  camTo(1.5, 1.35, 5.6, 3.5, 1.75),
  camTo(5.5, 1.35, 5.6, 3.4, 1.75),
  camTo(3.5, 1.05, 4.5, 3.4, 1.75),
  camTo(3.4, 1.6, 6.8, 3.4, 1.9),
  camTo(2.1, 1.5, 6.0, 3.5, 1.85),
];
const cam08 = (T: number): Cam => {
  let i = 0;
  CUTS08.forEach((c, j) => {
    if (T >= c - 1e-6) i = j + 1;
  });
  return { ...CAMS08[i], shake: 0 };
};
/** x кофейни (VEGAN COFFEE) в мире = 0.2; фон сдвигаем так, чтобы она была в центре кадра */
const bgFor = (camX: number) => camX - 0.2;
const jit = (f: number, seed: number) => {
  const s = Math.sin(Math.floor(f / STEP) * 127.1 + seed * 311.7) * 43758.5453;
  return (s - Math.floor(s)) * 2 - 1;
};
const camShake = (f: number, amp: number, seed = 1) => ({ x: jit(f, seed) * amp, y: jit(f, seed + 7) * amp });

export const frameAt = (frame: number, sh: ShotT, tlCount: number, v: Voices): Frame => {
  // внутри плана время квантуется на STEP (4 кадра): 7.5 поз в секунду; рот - чаще (2 кадра)
  const fr = frame - sh.from;
  const f = Math.floor(fr / STEP) * STEP;
  RAW = Math.floor(fr / 2) * 2;
  const T = f / FPS;
  let actors: Actor[] = [];
  let cam: Cam = { ...CAMS.c07, shake: 0 };
  let bushShake = 0;
  let leaves = -1;
  let dust: Array<{ x: number; z: number; k: number }> = [];
  let sx = 0;
  let sy = 0;
  let bgx = bgFor(CAMS.c07.x);
  let bin: number | null = null;
  switch (sh.n) {
    case 7: {
      actors = shot07(f, sh, v);
      cam = { ...CAMS.c07, shake: 0 };
      bgx = bgFor(CAMS.c07.x);
      bin = BIN.x;
      break;
    }
    case 8: {
      actors = shot08(f, sh, v);
      cam = cam08(T);
      bgx = bgFor(cam.x);
      bin = 6.9; // урна сдвинута вправо: не закрывает пару ни с одного ракурса
      if (T >= 0.667 && T < 0.933) {
        const s = camShake(f, 0.05, 4);
        sx = s.x;
        sy = s.y;
      }
      break;
    }
    case 9: {
      const r = shot09(f, sh, v);
      actors = r.actors;
      leaves = r.leaves;
      bgx = bgFor(CAMS.c09.x);
      bin = 3.4;
      // жёсткая склейка на кусты (камера выше и дальше - всё тело в прыжке видно); на приземлении - жёсткая склейка поближе
      const land = T >= S09.land;
      cam = land ? { ...camAt(7.7, 7.8, 1.4), shake: 0, ty: 1.85 } : { ...CAMS.c09, shake: 0, ty: 2.2 };
      bushShake = T >= S09.rustle && T < S09.jump + 0.133 ? 0.07 : 0;
      if (T >= S09.land && T < S09.land + 0.4) {
        const s = camShake(f, 0.07 * (1 - (T - S09.land) / 0.4), 5);
        sx = s.x;
        sy = s.y;
      }
      if (T >= S09.siren && f < sh.vFrom) {
        const s = camShake(f, 0.035, 9);
        sx = s.x;
        sy = s.y;
      }
      if (T >= S09.land && T < S09.land + 0.58) dust.push({ x: CH_LAND.x, z: CH_LAND.z + 0.1, k: Math.round((T - S09.land) * 24) });
      if (T >= S09.jump && T < S09.jump + 0.58) dust.push({ x: BUSH.x - 0.5, z: BUSH.z + 0.55, k: Math.round((T - S09.jump) * 24) });
      break;
    }
    case 10:
      actors = shot10(f, sh, v);
      cam = { ...CAMS.c10, shake: 0 };
      bgx = bgFor(CAMS.c10.x);
      break;
    case 11:
      actors = shot11(f, sh, v);
      cam = { ...CAMS.c11, shake: 0 };
      bgx = bgFor(CAMS.c11.x);
      break;
    default: {
      actors = shot12(f, sh, v);
      const sub = sub12(T);
      const c = sub === "a" ? CAMS.c12a : sub === "a2" ? CAMS.c12a2 : sub === "b" ? CAMS.c12b : sub === "c" ? CAMS.c12c : CAMS.c12d;
      cam = { ...c, shake: 0 };
      bgx = bgFor(c.x);
      STEP_AT.forEach((s) => {
        if (T >= s + 0.25 && T < s + 0.65) {
          const k = camShake(f, 0.06 * (1 - (T - s - 0.25) / 0.4), 12);
          sx = k.x;
          sy = k.y;
        }
      });
    }
  }
  cam = { ...cam, x: cam.x + sx, y: cam.y + sy, tx: cam.tx + sx * 0.5, ty: cam.ty + sy * 0.5 };
  dust = dust.slice();
  return { actors, cam, bgx, bin, bushShake, leaves, dust, tl: tlCount };
};
void clamp;
