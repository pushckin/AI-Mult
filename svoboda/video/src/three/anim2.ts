// Анимация сцены 2: позы по планам 07-12 как функции кадра. Всё на двойках, жёсткие позы (без плавной интерполяции).
// Трёхмерные развороты: тело (ry) и голова (hy) вращаются вокруг вертикальной оси, лицо и борода приклеены к голове.
import { PP, PPatch, mixP } from "./Person";
import { ShotT, S09, STEP_AT, mouthFromEnv } from "../data/scene2";
import { hold, jitter, clamp } from "./util";
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

/** Жёсткие позы: ключ действует с кадра t и держится до следующего (никакой интерполяции) */
type K = PPatch & { t: number };
const seg = (keys: K[], t: number): PPatch => {
  let out: PPatch = {};
  for (const { t: kt, ...patch } of keys) if (kt <= t) out = { ...out, ...patch };
  return out;
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
  x: number; y: number; z: number; tx: number; ty: number; shake: number;
}
export interface Frame {
  actors: Actor[];
  cam: Cam;
  bgx: number; // сдвиг фона
  bin: number | null; // x горящей урны (или нет)
  bushShake: number; // 0 нет, иначе амплитуда
  leaves: number; // кадр полёта листьев (или -1)
  dust: Array<{ x: number; z: number; k: number }>;
  tl: number;
}

/** Реплика: рот по огибающей (паузы - закрыт) + кивок на сильных слогах */
const speak = (p: PP, sh: ShotT, t: number, env: number[] | undefined, nod = 3): PP => {
  const k = t - sh.vFrom;
  if (k < 0 || k >= sh.vLen) return { ...p, mouth: 0 };
  const m = mouthFromEnv(env, k, sh.vLen);
  return { ...p, mouth: m, hx: p.hx + (m === 2 ? nod : 0), tl: p.tl + (m === 2 ? nod * 0.5 : 0) };
};
const voiced = (sh: ShotT, t: number, env: number[] | undefined) => mouthFromEnv(env, t - sh.vFrom, sh.vLen) > 0;

// =====================================================================================
// ПЛАН 07: Тони и Маркус выглядывают из-за горящей урны (Тони принюхивается: профиль -> 3/4)
// =====================================================================================
const TONY_X = 3.55;
const shot07 = (t: number, sh: ShotT, v: Voices): Actor[] => {
  const L = sh.len;
  const squat = { llx: 70, lrx: 70, llk: 100, lrk: 100, y: 0.3 };
  const tk: K[] = [
    { t: 0, ...squat, ry: 74, rz: 0, tl: 12, hy: -8, hx: -3, brow: 0.3, alx: 40, ale: 60, arx: 40, are: 60, alz: 14, arz: 14, acc: 0, eyeL: 0, eyeR: 0, hp: 0 },
    { t: 6, hy: -2, hx: -8 }, { t: 12, hy: 6, hx: -2, ry: 72 },
    // принюхивание: подбородок вверх рывками, профиль к урне
    { t: 14, hx: -22, tl: 14 }, { t: 18, hx: -2, tl: 10 }, { t: 22, hx: -22, tl: 14 }, { t: 26, hx: -2, tl: 10 }, { t: 28, hx: -20, tl: 14, ry: 70 },
    // замечает: корпус разворачивается в 3/4, рука к очкам
    { t: 30, ry: 58, hy: 12, hx: -4, arx: 150, are: 100, alz: 8, arz: 8, brow: 0.6 },
    { t: 34, ry: 48, hy: 4, arx: 164, are: 112, acc: 1, hp: 1 },
    { t: 38, ry: 40, arx: 70, are: 60, brow: 1, eyeL: 2, eyeR: 2, hy: -6, y: 0.31 },
    { t: 42, ry: 36, arx: 22, are: 30, hy: -12 }, { t: 46, ry: 34, y: 0.34, hy: -14, alx: 100, ale: 50 },
    { t: 76, ry: 32, y: 0.44, llx: 50, lrx: 50, llk: 70, lrk: 70, tl: 8, alx: 40, arx: 24, ale: 50, are: 30, hy: -14 },
    { t: 120, ry: 30, y: 0.56, llx: 14, lrx: 14, llk: 24, lrk: 24, tl: 4, alx: 20, ale: 30, arx: 14, are: 30, hy: -16 },
    { t: 190, hy: -10, ry: 28 }, { t: L - 20, hy: -20, hx: 8, brow: 1 },
  ];
  const tp = seg(tk, hold(t, 2));
  let tpose = mixP({ scale: SC.tony, x: TONY_X, z: 0.25, eyeL: 0, eyeR: 0, llz: 4, lrz: 4, alz: 10, arz: 10, ...tp });
  if (t >= 14 && t < 30) tpose = { ...tpose, y: tpose.y + (Math.floor(t / 2) % 2 ? 0.035 : 0) };
  if (t >= 38) tpose = { ...tpose, tear: 1 + (Math.floor((t - 38) / 8) % 3), sw: 0, tl: tpose.tl + (Math.floor(t / 6) % 2 ? 1.5 : -1) };
  if (t >= 46) tpose = { ...tpose, hy: tpose.hy + [0, 7, -7, 3][Math.floor(t / 10) % 4], eyeL: 2, eyeR: 2 };
  tpose = speak(tpose, sh, t, v.env[0]);

  // --- Маркус: справа от урны, поворачивается из профиля (к Тони) в 3/4, трясётся ---
  const peekX = [[0, 7.15], [10, 7.15], [12, 6.7], [22, 6.7], [24, 7.15], [34, 7.15], [36, 6.7], [60, 6.7], [62, 6.95], [74, 6.95], [76, 6.65]];
  let mx = peekX[0][1];
  for (const [kt, kx] of peekX) if (t >= kt) mx = kx;
  const mk: K[] = [
    { t: 0, ry: -74, hy: 6, y: 0.42, llx: 40, lrx: 40, llk: 60, lrk: 60, tl: 6 },
    { t: 12, hy: -4 }, { t: 24, hy: 8 }, { t: 36, hy: -2, ry: -66 }, { t: 48, hy: 10, y: 0.46, ry: -56 },
    { t: 72, ry: -46, hy: 12 },
    { t: 120, ry: -38, hy: 16, y: 0.5, llx: 20, lrx: 20, llk: 24, lrk: 24 }, { t: L - 60, hy: 8, y: 0.55, llx: 6, lrx: 6, llk: 6, lrk: 6, tl: 4 },
  ];
  let mp = mixP({
    scale: SC.marcus, z: 0.3, eyeL: 0, eyeR: 0, llz: 4, lrz: 4, alx: 55, ale: 105, arx: 55, are: 105, alz: 14, arz: 14, mouth: 4, brow: 1,
    ...seg(mk, hold(t, 4)),
  });
  mp = {
    ...mp,
    x: mx,
    tz: jitter(t, 3, 4) * 7,
    tl: mp.tl + jitter(t, 5, 2) * 2,
    hz: jitter(t, 9, 4) * 7,
    y: mp.y + (Math.floor(t / 4) % 2 ? 0.03 : 0),
    mouth: 4,
    tear: t > L - 200 ? 1 + (Math.floor(t / 8) % 3) : 0,
  };
  return [
    { kind: "marcus", pose: mp },
    { kind: "tony", pose: tpose },
  ];
};

// =====================================================================================
// ПЛАН 08: Маркус бросается Тони на шею; оба в профиль лицом друг к другу (объятие)
// =====================================================================================
const T08 = { x: 3.8, z: 0.5 };
const M08 = { x: 2.15, z: 0.45 };
const shot08 = (t: number, sh: ShotT, v: Voices): Actor[] => {
  const tg = hold(t, 2);
  // ----- Тони: профиль влево; поза 1 (14-40) руки вверх от неожиданности; поза 2 (40-96) обнимает в ответ; поза 3 (96+) стискивает -----
  const tk: K[] = [
    { t: 0, ry: -84, tl: 0, hy: 34, hx: 4, alx: 30, ale: 40, arx: 30, are: 40, alz: 30, arz: 30, brow: 1, eyeL: 2, eyeR: 2 },
    { t: 14, tl: 6, hy: 16, hx: 16, alx: 52, arx: 60, ale: 20, are: 20, alz: 70, arz: 70, brow: 1 },
    { t: 40, tl: 10, ry: -84, hx: 22, hy: 8, eyeL: 3, eyeR: 3 },
    { t: 96, tl: 12, ry: -84, hx: 26, hy: 4 },
  ];
  const tpp = seg(tk, tg);
  const hug = tg >= 40;
  let tp = mixP({ scale: SC.tony, x: T08.x, z: T08.z, y: 0.43 * SC.tony, llz: 4, lrz: 4, acc: 1, hl: 0, hr: 0, mouth: 0, ...tpp });
  const bob = tg >= 14 ? Math.floor(t / 4) % 2 : 0;
  tp = { ...tp, tear: 1 + (Math.floor(t / 6) % 3), tz: tg > 14 ? (bob ? 2.5 : -1.5) : 0, y: tp.y + (tg > 14 && bob ? 0.03 : 0), x: tp.x + (tg >= 96 && bob ? -0.03 : 0) };

  // ----- Маркус: 0-10 бег рваными позами, 10-14 прыжок, 14+ виснет на шее на носочках -----
  const run = t < 10;
  const leap = t >= 10 && t < 14;
  let mp: PP;
  if (run) {
    const ph = Math.floor(t / 2) % 2;
    const step = Math.floor(t / 2);
    mp = mixP({
      scale: SC.marcus, x: M08.x - 2.4 + step * 0.34, z: 0.62, ry: 80, y: 0.58 + (ph ? 0.07 : 0), tl: 14, hy: -28, hx: 6, mouth: 4, brow: 1, eyeL: 0, eyeR: 0,
      llx: ph ? 52 : -48, lrx: ph ? -48 : 52, llk: ph ? 6 : 64, lrk: ph ? 64 : 6, alx: ph ? -50 : 50, arx: ph ? 50 : -50, ale: 64, are: 64, alz: 14, arz: 14,
    });
  } else if (leap) {
    mp = mixP({
      scale: SC.marcus, x: M08.x - 0.9 + (t >= 12 ? 0.55 : 0), z: 0.62, ry: 82, y: 1.0 + (t >= 12 ? 0.08 : 0), tl: 6, hy: -36, mouth: 4, brow: 1, eyeL: 0, eyeR: 0,
      llx: 40, lrx: 14, llk: 80, lrk: 50, alx: 150, arx: 150, ale: 20, are: 20, alz: 50, arz: 50,
    });
  } else {
    // три жёсткие позы объятия: A (14-40) на носочках, обе ноги; B (40-96) одна нога подогнута назад; C (96+) обе подогнуты, повис
    const poseA = tg < 40;
    const poseB = tg >= 40 && tg < 96;
    const bb = Math.floor(t / 4) % 2;
    mp = mixP({
      scale: SC.marcus, x: M08.x + (tg >= 40 ? 0.06 : 0), z: M08.z, ry: 84, y: 0.58 + 0.12, tl: poseA ? 6 : 9, hy: -6, hx: poseA ? 4 : 10, mouth: 0, brow: 1, eyeL: 0, eyeR: 0,
      llx: 0, lrx: 0, llk: 0, lrk: 0, llz: 5, lrz: 5, toe: 58,
      ...(poseB ? { lrx: -34, lrk: 74, toe: 58 } : {}),
      ...(tg >= 96 ? { llx: -22, lrx: -30, llk: 54, lrk: 68, y: 0.58 + 0.16, toe: 30 } : {}),
    });
    mp = { ...mp, tz: jitter(t, 4, 4) * 3, hz: jitter(t, 8, 4) * 4, hx: mp.hx + (bb ? 4 : 0), tear: 1 + (Math.floor(t / 6) % 3), y: mp.y + (bb ? 0.025 : 0) };
  }
  mp = speak({ ...mp, mouth: 0 }, sh, t, v.env[1], 3);
  if (t < sh.vFrom || t >= sh.vFrom + sh.vLen || mp.mouth === 0) mp = { ...mp, mouth: t < 14 ? 4 : 0 };

  // ----- руки обхватывают: IK по положению партнёра -----
  if (!run && !leap) {
    const neck = fromTorso(tp, [0, 0.66, 0]);
    // Маркус: ближняя рука (правая, к камере) через плечо Тони за шею, дальняя - вокруг со спины
    mp = arm(mp, "marcus", -1, qv(toTorso(mp, [neck[0] + 0.28, neck[1] - 0.1, neck[2] - 0.22])), 40);
    mp = arm(mp, "marcus", 1, qv(toTorso(mp, [neck[0] + 0.3, neck[1] - 0.22, neck[2] + 0.2])), 40);
    mp = { ...mp, hl: 0, hr: 0 };
  } else if (leap) {
    mp = { ...mp, hl: 0, hr: 0 };
  }
  if (hug) {
    // Тони обнимает в ответ: руки на спине Маркуса
    const back = (dy: number, dz: number): V3 => qv(toTorso(tp, [mp.x - 0.16, mp.y + 0.55 * SC.marcus + dy, mp.z + dz]));
    tp = arm(tp, "tony", 1, back(0.0, 0.16), 30);
    tp = arm(tp, "tony", -1, back(-0.2, -0.12), 30);
    tp = { ...tp, hl: 0, hr: 0 };
  }
  return [
    { kind: "tony", pose: tp },
    { kind: "marcus", pose: mp },
  ];
};

// =====================================================================================
// ПЛАН 09: Хлоя выпрыгивает из кустов боком и приземляется разворотом к камере
// =====================================================================================
const CH_LAND = { x: 7.15, z: 0.9 };
type Mega = "up" | "down" | "fwd" | "air";
const MEGA: Record<Mega, { t: V3; hp: number; my: number }> = {
  up: { t: [-0.14, 0.48, 0.5], hp: -4, my: 6 },
  down: { t: [-0.6, 0.24, 0.12], hp: 48, my: 0 },
  fwd: { t: [-0.5, 0.5, 0.62], hp: 0, my: 0 },
  air: { t: [-0.36, 0.74, 0.6], hp: -6, my: 0 },
};
const PLAC = { mid: { t: [0.84, 0.55, 0.3] as V3, cup: -8 }, cow: { t: [0.8, -0.02, 0.2] as V3, cup: -16 }, std: { t: [0.82, 0.38, 0.3] as V3, cup: -6 }, hi: { t: [0.84, 0.74, 0.3] as V3, cup: -10 }, low: { t: [0.74, 0.18, 0.3] as V3, cup: -12 } };
/** Хлоя: мегафон всегда в правой руке (ручка в кулаке), плакат всегда в левой */
const chloeHands = (p: PP, mega: Mega, plac: keyof typeof PLAC, megaT?: V3): PP => {
  const m = MEGA[mega];
  const pl = PLAC[plac];
  let r = arm(p, "chloe", -1, qv(megaT ?? m.t), 30);
  r = arm(r, "chloe", 1, pl.t, 40);
  return { ...r, hr: 2, hl: 2, hp: m.hp, my: m.my, cup: pl.cup, py: Math.max(-75, Math.min(75, -p.ry * 0.85)) };
};
const shot09 = (t: number, sh: ShotT, v: Voices): { actors: Actor[]; leaves: number } => {
  if (t < S09.jump) return { actors: [], leaves: -1 };
  const k = t - S09.jump;
  const tg = hold(t, 2);
  let pose: PP;
  if (t < S09.land) {
    // полёт боком влево: 6 жёстких поз по 2 кадра
    const air: PPatch[] = [
      { x: 8.6, y: 0.5, ry: -86, tl: 26, rz: 0, llx: -30, lrx: -50, llk: 80, lrk: 60, hy: 6 }, // присед-толчок
      { x: 8.25, y: 1.05, ry: -90, tl: 34, rz: -10, llx: -55, lrx: -40, llk: 20, lrk: 30, hy: 4 }, // растяжка вверх
      { x: 7.95, y: 1.6, ry: -90, tl: 22, rz: -16, llx: -45, lrx: -28, llk: 90, lrk: 40, hy: 2 }, // апекс боком
      { x: 7.65, y: 1.7, ry: -86, tl: 14, rz: -12, llx: -20, lrx: 10, llk: 70, lrk: 30, hy: 0 },
      { x: 7.4, y: 1.2, ry: -78, tl: 8, rz: -6, llx: 14, lrx: 28, llk: 40, lrk: 14, hy: -2 }, // снижение
      { x: 7.2, y: 0.78, ry: -68, tl: 4, rz: -2, llx: 30, lrx: 36, llk: 10, lrk: 4, hy: -4 }, // ноги вперёд к земле
    ];
    const i = Math.min(5, Math.floor((tg - S09.jump) / 2));
    pose = CB("chloe", { z: 0.62 + 0.03 * i, eyeL: 1, eyeR: 1, brow: 1, mouth: 0, llz: 22, lrz: 22, ...air[i] });
    pose = chloeHands(pose, "air", "mid");
  } else {
    const tt = tg - S09.land;
    // посадка: 0-4 сжатие, 4-6 разворот лицом к камере, затем стойка 3/4
    const ry = tt < 2 ? -62 : tt < 4 ? -44 : tt < 8 ? -30 : -24;
    const sq = tt < 4;
    pose = CB("chloe", {
      x: CH_LAND.x, z: CH_LAND.z, ry, y: 0.56 - (sq ? 0.09 : 0), tl: sq ? 12 : -3, hx: sq ? 8 : -3, hy: tt < 4 ? 18 : 22, llz: sq ? 24 : 14, lrz: sq ? 24 : 14, llk: sq ? 56 : 0, lrk: sq ? 56 : 0, llx: sq ? 24 : 4, lrx: sq ? 18 : -2,
      mouth: 0, eyeL: sq ? 2 : 0, eyeR: sq ? 2 : 0, brow: 0.6,
    });
    const env = v.env[2];
    const speakingNow = t >= sh.vFrom && t < sh.vFrom + sh.vLen;
    const loud = t >= S09.siren && t < sh.vFrom;
    const mouthOpen = speakingNow && voiced(sh, t, env);
    const raised = tt >= 4 && (loud || mouthOpen || (speakingNow && mouthFromEnv(env, t - sh.vFrom + 6, sh.vLen) > 0));
    pose = chloeHands(pose, raised ? "up" : tt < 4 ? "air" : "down", sq ? "mid" : "std");
    if (loud) pose = { ...pose, sir: 1 + (Math.floor((t - S09.siren) / 2) % 3), eyeL: 3, eyeR: 3 };
    if (speakingNow) {
      pose = speak({ ...pose, eyeL: 0, eyeR: 0, brow: 1, sir: mouthOpen && (env?.[Math.floor((t - sh.vFrom) / 2) * 2] ?? 0) > 0.55 ? 1 + (Math.floor(t / 2) % 3) : 0 }, sh, t, env, 4);
      pose = { ...pose, hy: pose.hy + [0, 6, -4, 5][Math.floor(t / 12) % 4] };
    } else if (t >= sh.vFrom + sh.vLen) pose = { ...pose, sir: 0, mouth: 0, eyeL: 0, eyeR: 0 };
    pose = { ...pose, tl: pose.tl + (Math.floor(tt / 6) % 2 ? 1.5 : -1), hz: Math.floor(tt / 8) % 2 ? 3 : -3 };
  }
  void k;
  return { actors: [{ kind: "chloe", pose }], leaves: t - S09.jump };
};

// =====================================================================================
// ПЛАН 10: Грег смотрит на Хлою (3/4), Тони закатывает глаза, Маркус всхлипывает
// =====================================================================================
const shot10 = (t: number, sh: ShotT, v: Voices): Actor[] => {
  const L = sh.len;
  const gk: K[] = [
    { t: 0, ry: 58, hy: 8, hx: 2 },
    { t: 40, hy: 4 }, { t: 90, hy: 14, hx: 0, ry: 54 }, { t: L - 30, hy: 6, hx: 5, tl: 4, ry: 60 },
  ];
  let gp = mixP({
    scale: SC.greg, x: GREG_X, z: 0.4, y: 0.43 * SC.greg, tl: 2, eyeL: 2, eyeR: 2, brow: -1, mouth: 0, lx: 1.2, ly: 0, llz: 4, lrz: 4,
    // правая (к камере) рука держит стакан у груди
    arx: 34, are: 84, arz: 16, alx: 12, alz: 10, ...seg(gk, hold(t, 4)),
  });
  if (voiced(sh, t, v.env[3]) && t >= sh.vFrom) {
    const g = [[16, 14], [58, 30], [24, 24], [74, 36], [30, 20]][Math.floor((t - sh.vFrom) / 14) % 5];
    gp = speak({ ...gp, alx: g[0], alz: g[1], tz: Math.floor(t / 6) % 2 ? 2 : -2 }, sh, t, v.env[3], 3);
  } else gp = speak({ ...gp, mouth: 0 }, sh, t, v.env[3], 0);
  if (Math.floor(t / 2) % 13 === 6) gp = { ...gp, eyeL: 3, eyeR: 2 };
  gp = { ...gp, y: gp.y + (Math.floor(t / 6) % 2 ? 0.012 : 0) };

  // Тони: скрестил руки, закатывает глаза (3/4 к камере, чуть повёрнут к Грегу)
  const roll = (u: number): [number, number] => {
    const a = (200 - 220 * clamp(u)) * (Math.PI / 180);
    return [Math.cos(a) * 2.2, Math.sin(a) * 2.2];
  };
  let [lx, ly] = [0, 0];
  let rollHead = 0;
  if (t >= 8 && t < 44) {
    const u = (hold(t, 4) - 8) / 32;
    [lx, ly] = roll(u);
    rollHead = -6 + 12 * u;
  } else if (t >= 44 && t < 52) [lx, ly] = [-2.2, 0.4];
  const TS = 1.6;
  let tp = mixP({
    scale: TS, x: 0.7, z: 1.0, y: 0.43 * TS, ry: -34, tl: 0, hy: 18, hx: 0, acc: 1, eyeL: 2, eyeR: 2, brow: -0.6, mouth: 0, llz: 5, lrz: 5, lx, ly, hz: rollHead,
  });
  tp = arm(tp, "tony", 1, [-0.3, 0.38, 0.5], 10); // руки скрещены на груди
  tp = arm(tp, "tony", -1, [0.3, 0.3, 0.52], 10);
  if (t >= 44) tp = { ...tp, hx: -10 + (Math.floor(t / 10) % 2 ? 2 : 0), tl: -5 };
  if (t > 40 && Math.floor(t / 2) % 9 === 3) tp = { ...tp, eyeL: 3, eyeR: 3 };
  const MS = 1.5;
  let mp = mixP({ scale: MS, x: 2.2, z: 0.9, y: 0.43 * MS, ry: -26, tl: 6, hy: 10, hx: 4, alx: 55, ale: 105, arx: 55, are: 105, alz: 14, arz: 14, brow: 1, mouth: 4, llz: 4, lrz: 4 });
  mp = { ...mp, tz: jitter(t, 6, 4) * 4, hz: jitter(t, 2, 4) * 4, tear: 1 + (Math.floor(t / 7) % 3) };
  return [
    { kind: "greg", pose: gp },
    { kind: "marcus", pose: mp },
    { kind: "tony", pose: tp },
  ];
};

// =====================================================================================
// ПЛАН 11: Хлоя (справа, 3/4) и Грег (слева) в одном кадре; Грег брезгливо откидывается
// =====================================================================================
const shot11 = (t: number, sh: ShotT, v: Voices): Actor[] => {
  const env = v.env[4];
  const vk = t - sh.vFrom;
  const frac = clamp(vk / sh.vLen);
  const sp = t >= sh.vFrom && t < sh.vFrom + sh.vLen;
  const talk = sp && voiced(sh, t, env);
  const tg = hold(t, 4);
  // ----- Хлоя -----
  let ry = -40;
  let mega: Mega = "down";
  let hy = 12;
  let mp = 0;
  if (t < 10) {
    // опускает мегафон от рта к бедру жёсткими позами
    mega = t < 4 ? "up" : t < 8 ? "fwd" : "down";
    hy = 10;
  } else {
    if (frac < 0.24 || (frac >= 0.52 && frac < 0.74)) {
      mega = "fwd"; // тычет мегафоном в Грега
      ry = -42 + (Math.floor(t / 4) % 2 ? -3 : 3);
      hy = 8;
      mp = 1;
    } else if (frac >= 0.24 && frac < 0.52) {
      mega = "down";
      ry = -40;
      hy = 14;
    } else {
      // жест на Тони и Маркуса: корпус в профиль влево, мегафон указывает назад-влево
      const s = Math.min(2, Math.floor((frac - 0.74) / 0.09));
      mega = "fwd";
      ry = [-62, -78, -84][s];
      hy = [20, 26, 30][s];
      mp = 2;
    }
  }
  let cp = CB("chloe", { x: 7.6, z: 1.15, ry, tl: -3, hx: -4, hy: hy + (Math.floor(t / 8) % 2 ? 3 : 0), llz: 12, lrz: 12, mouth: 0, eyeL: 2, eyeR: 2, brow: -0.8, tz: jitter(t, 7, 4) * 1.5 });
  cp = chloeHands(cp, mega, mp === 2 ? "std" : "std", mp === 2 ? ([-0.9, 0.5, 0.45] as V3) : undefined);
  if (mp === 2) cp = { ...cp, my: -35 };
  if (mp === 1) cp = { ...cp, my: -18 };
  if (sp) cp = speak({ ...cp, eyeL: 2, eyeR: 2, brow: -1 }, sh, t, env, 4);
  else cp = { ...cp, mouth: 0, hx: t >= sh.vFrom + sh.vLen ? 6 : cp.hx };
  void talk;

  // ----- Грег: тело откинуто, гримаса -----
  const gk: K[] = [
    { t: 0, tl: -14, hy: 18, hx: -6, mouth: 4, brow: -1, eyeL: 2, eyeR: 2, ry: 52, alx: 38, alz: 40, ale: 20 },
    { t: 12, tl: -9, mouth: 6, hx: -8, hy: 14 }, { t: 28, tl: -16, mouth: 4, hy: 22, alx: 30, alz: 54, ale: 30 },
    { t: 48, tl: -8, mouth: 6, hy: 12, hx: -10 }, { t: 72, tl: -17, mouth: 4, ry: 46, hy: 8 }, { t: 100, tl: -10, mouth: 6, hy: 18, hx: -4 },
    { t: 140, tl: -16, mouth: 4, hy: 26, alx: 20, alz: 60 }, { t: 180, tl: -9, mouth: 6, hy: 10 }, { t: 220, tl: -15, mouth: 4, hy: 22 },
  ];
  let gp = mixP({
    scale: SC.greg, x: 4.9, z: 0.8, y: 0.43 * SC.greg, lx: 1.0, ly: 0, llz: 4, lrz: 4, arx: 30, are: 80, arz: 16, ...seg(gk, tg),
  });
  gp = { ...gp, y: gp.y + (Math.floor(t / 6) % 2 ? 0.012 : 0), tz: (Math.floor(t / 8) % 2 ? 2 : -2) };
  if (t > 20 && Math.floor(t / 2) % 11 === 5) gp = { ...gp, eyeL: 3, eyeR: 3 };
  return [
    { kind: "greg", pose: gp },
    { kind: "chloe", pose: cp },
  ];
};

// =====================================================================================
// ПЛАН 12: финал нарезан жёсткими склейками (общий / Хлоя крупно / Тони снизу / общий)
// =====================================================================================
export const S12 = { a: 0, b: 104, c: 184, d: 286 };
/** Какой под-план 12 в кадре t */
export const sub12 = (t: number) => (t < S12.b ? "a" : t < S12.c ? "b" : t < S12.d ? "c" : "d");
const DBL = { arx: 90, arz: 86, are: 104, alx: 90, alz: 86, ale: 104, hl: 2, hr: 2 };
const shot12 = (t: number, sh: ShotT, v: Voices): Actor[] => {
  const sub = sub12(t);
  const tg = hold(t, 2);
  const env = v.env[5];
  const blink = Math.floor(t / 12) % 5 === 2;
  const mkTony = (o: PPatch): PP => {
    let tp = mixP({ scale: SC.tony, z: 1.0, y: 0.43 * SC.tony, tl: 3, hy: -10, hx: -4, alz: 10, arz: 10, brow: -1, eyeL: 2, eyeR: 2, mouth: 0, llz: 8, lrz: 8, acc: 1, ...o });
    tp = speak(tp, sh, t, env, 4);
    if (tp.mouth === 0) tp = { ...tp, brow: -1 };
    return { ...tp, tz: tp.mouth ? jitter(t, 5, 4) * 1.5 : 0 };
  };
  const mkChloe = (o: PPatch, cow: boolean): PP => {
    let cp = CB("chloe", { ry: -62, rz: cow ? -5 : 0, tl: cow ? -1 : 0, hx: cow ? -2 : -4, hy: cow ? 16 : 8, hdy: cow ? -0.1 : 0, y: 0.43 * SC.chloe - (cow ? 0.05 : 0), llz: 12, lrz: 12, brow: 1, eyeL: cow ? (blink ? 3 : 1) : 0, eyeR: cow ? (blink ? 3 : 1) : 0, mouth: cow ? (Math.floor(t / 4) % 2 ? 6 : 4) : 0, ...o });
    if (cow) cp = { ...cp, tz: jitter(t, 11, 4) * 3, hz: jitter(t, 12, 4) * 3, tear: 1 + (Math.floor(t / 9) % 3), sw: 1 + (Math.floor(t / 7) % 3), y: cp.y + (Math.floor(t / 4) % 2 ? 0.018 : 0) };
    return chloeHands(cp, "down", "cow");
  };
  const mkMarcus = (o: PPatch): PP => {
    const mp = mixP({ scale: SC.marcus, z: 0.45, y: 0.43 * SC.marcus, tl: 6, hy: 12, hx: 4, alx: 52, ale: 108, arx: 52, are: 108, alz: 14, arz: 14, brow: 1, mouth: 4, llz: 4, lrz: 4, ...o });
    return { ...mp, tz: jitter(t, 8, 4) * 3, hz: Math.floor(t / 10) % 2 ? 3 : -3, tear: t > 40 ? 1 + (Math.floor(t / 8) % 3) : 0 };
  };

  if (sub === "a") {
    // ОБЩИЙ: Тони подходит тяжёлыми шагами (профиль вправо, кулаки), Хлоя вжимается, Маркус всхлипывает позади
    let x = 3.9;
    let stepPh = -1;
    STEP_AT.slice(0, 3).forEach((s, i) => {
      x += 0.5 * (tg >= s + 2 ? 1 : 0);
      if (t >= s && t < s + 12) stepPh = i;
    });
    const ph = stepPh >= 0 ? Math.floor((t - STEP_AT[stepPh]) / 4) % 2 : 0;
    const poses: K[] = [{ t: 0, ry: 84, hr: 2, hl: 2, alx: 40, ale: 100, alz: 12, arx: 34, are: 104, arz: 12, hy: -12 }, { t: 40, ry: 80, hy: -10 }, { t: 70, ry: 72, hy: -16, tl: 8 }];
    let tp = mkTony({ x, ...seg(poses, tg) });
    if (stepPh >= 0) tp = { ...tp, llx: ph ? 34 : -22, lrx: ph ? -22 : 34, llk: ph ? 0 : 30, lrk: ph ? 30 : 0, y: tp.y + (ph ? 0.05 : 0), tl: tp.tl + 4 };
    const cx = 8.15 + (tg >= 44 ? 0.12 : 0);
    const cp = mkChloe({ x: cx, z: 1.8, ry: -64, hy: 14 }, t >= 8);
    const mp = mkMarcus({ x: 2.7, z: 0.45, ry: 40, hy: -12 });
    return [{ kind: "marcus", pose: mp }, { kind: "chloe", pose: cp }, { kind: "tony", pose: tp }];
  }
  if (sub === "b") {
    // СРЕДНИЙ/КРУПНЫЙ: Хлоя вжимает голову, 3/4 к камере, страх (слёзы, пот-капли плоскими формами)
    const k = t - S12.b;
    const ps: K[] = [{ t: 0, ry: -30, hy: 8 }, { t: 24, ry: -24, hy: 14, hx: -6 }, { t: 48, ry: -34, hy: 6, hx: 2 }, { t: 66, ry: -26, hy: 12, hx: -4 }];
    const cp = mkChloe({ x: 7.7, z: 1.8, ...seg(ps, hold(k, 4)) }, true);
    return [{ kind: "chloe", pose: { ...cp, eyeL: blink ? 3 : 1, eyeR: blink ? 3 : 1 } }];
  }
  if (sub === "c") {
    // НИЖНИЙ РАКУРС: Тони с бицепсами (двойной бицепс, развороты тела влево/вправо рывками)
    const k = t - S12.c;
    const ps: K[] = [
      { t: 0, ry: 22, ...DBL, rz: -3, tl: -4, hy: -18, hx: -14 }, // двойной бицепс, грудью к камере (3/4)
      { t: 26, ry: -34, ...DBL, rz: 2, tl: -8, hy: 40, hx: -12 }, // корпус влево, лицом к камере через плечо
      { t: 52, ry: 48, arx: 90, arz: 84, are: 112, hr: 2, alx: 6, alz: 40, ale: 70, hl: 2, rz: -4, tl: -6, hy: -34, hx: -16 }, // правая рука на бицепс, левая в бок
      { t: 76, ry: 8, ...DBL, rz: -2, tl: -10, hy: -6, hx: -22, y: 0.43 * SC.tony + 0.02 }, // финальная грудью вперёд, подбородок вверх
    ];
    const tp = mkTony({ x: 6.2, z: 1.3, ...seg(ps, hold(k, 4)), y: 0.43 * SC.tony + (Math.floor(t / 2) % 2 ? 0.015 : 0) });
    return [{ kind: "tony", pose: tp }];
  }
  // d: ОБЩИЙ: Хлоя отступает, Тони в профиль -> 3/4
  const k = t - S12.d;
  const stepAt = [10, 30, 50];
  const back = stepAt.filter((s) => k >= s + 2).length * 0.4;
  const ps: K[] = [
    { t: 0, ry: 86, ...DBL, rz: -3, tl: -6, hy: -26, hx: -10 }, // профиль вправо, двойной бицепс
    { t: 40, ry: 66, ...DBL, rz: -2, tl: -8, hy: -30, hx: -12 },
    { t: 62, ry: 46, arx: 6, arz: 48, are: 66, alx: 6, alz: 48, ale: 66, hl: 2, hr: 2, rz: -2, tl: -4, hy: -26, hx: -8 }, // 3/4, кулаки в боки
    { t: 84, ry: 28, hy: -14, hx: -6 },
  ];
  const stepNow = t >= STEP_AT[3] && t < STEP_AT[3] + 10;
  let tp = mkTony({ x: 5.4 + (tg >= STEP_AT[3] + 2 ? 0.4 : 0), z: 1.0, ...seg(ps, hold(k, 4)) });
  if (stepNow) tp = { ...tp, llx: Math.floor((t - STEP_AT[3]) / 4) % 2 ? -22 : 34, lrx: Math.floor((t - STEP_AT[3]) / 4) % 2 ? 34 : -22, y: tp.y + 0.04 };
  const cwalk = stepAt.some((s) => k >= s && k < s + 4);
  const cp = mkChloe({ x: 8.2 + back, z: 1.8, ry: -68, hy: 12 }, true);
  const cq = { ...cp, llx: cwalk ? 22 : 0, lrx: cwalk ? -14 : 0, llk: cwalk ? 24 : 0, y: cp.y + (cwalk ? 0.04 : 0) };
  const mp = mkMarcus({ x: 3.3, z: 0.45, ry: 50, hy: -14 });
  return [{ kind: "marcus", pose: mp }, { kind: "chloe", pose: cq }, { kind: "tony", pose: tp }];
};

// =====================================================================================
// Камеры. Верх кадра выше крыш (небо), вывеска «VEGAN COFFEE» по центру фона и выше голов.
// =====================================================================================
const camAt = (x: number, z: number, ty: number, drop = 0.9) => ({ x, y: ty - drop, z, tx: x, ty });
const CAMS = {
  c07: camAt(5.1, 6.7, 1.95),
  c08: camAt(3.2, 6.3, 1.95),
  c09a: camAt(7.4, 7.9, 2.1),
  c09b: camAt(7.4, 7.5, 2.1),
  c10: camAt(-0.1, 6.3, 2.0),
  c11: camAt(6.25, 6.2, 2.0),
  c12a: camAt(6.1, 8.4, 1.85, 0.8),
  c12b: camAt(7.85, 4.6, 1.6, 0.15),
  c12c: camAt(6.3, 6.2, 2.25, 2.0),
  c12d: camAt(6.9, 8.6, 1.85, 0.8),
};
/** x кофейни (VEGAN COFFEE) в мире = 0.2; фон сдвигаем так, чтобы она была в центре кадра */
const bgFor = (camX: number) => camX - 0.2;
const camShake = (t: number, amp: number, seed = 1) => ({ x: jitter(t, seed, 2) * amp, y: jitter(t, seed + 7, 2) * amp });

export const frameAt = (frame: number, sh: ShotT, tlCount: number, v: Voices): Frame => {
  const t = frame - sh.from;
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
      actors = shot07(t, sh, v);
      // лёгкий боковой дрейф камеры без зума (фон закреплён в мире - настоящий параллакс)
      const dx = -0.35 + 0.8 * (hold(t, 4) / sh.len);
      cam = { ...CAMS.c07, x: CAMS.c07.x + dx, shake: 0 };
      bgx = bgFor(CAMS.c07.x);
      bin = BIN.x;
      break;
    }
    case 8:
      actors = shot08(t, sh, v);
      cam = { ...CAMS.c08, shake: 0 };
      bgx = bgFor(CAMS.c08.x);
      bin = BIN.x;
      if (t >= 14 && t < 22) {
        const s = camShake(t, 0.05 * (1 - (t - 14) / 8), 4);
        sx = s.x;
        sy = s.y;
      }
      break;
    case 9: {
      const r = shot09(t, sh, v);
      actors = r.actors;
      leaves = r.leaves;
      bgx = bgFor(CAMS.c09a.x);
      bin = BIN.x;
      const wx = t < 2 ? 5.0 : t < 4 ? 5.9 : t < 6 ? 6.8 : 7.4;
      cam = t < S09.jump ? { ...CAMS.c09a, x: wx, tx: wx, shake: 0 } : { ...CAMS.c09b, shake: 0 };
      if (t >= S09.jump && t < S09.jump + 4) cam = { ...CAMS.c09a, z: t < S09.jump + 2 ? 7.5 : 7.3, shake: 0 };
      bushShake = t >= S09.rustle && t < S09.jump ? 0.07 : 0;
      if (t >= S09.land && t < S09.land + 8) {
        const s = camShake(t, 0.07 * (1 - (t - S09.land) / 8), 5);
        sx = s.x;
        sy = s.y;
      }
      if (t >= S09.siren && t < sh.vFrom) {
        const s = camShake(t, 0.035, 9);
        sx = s.x;
        sy = s.y;
      }
      if (t >= S09.land && t < S09.land + 14) dust.push({ x: CH_LAND.x, z: CH_LAND.z + 0.1, k: t - S09.land });
      break;
    }
    case 10:
      actors = shot10(t, sh, v);
      cam = { ...CAMS.c10, shake: 0 };
      bgx = bgFor(CAMS.c10.x);
      break;
    case 11:
      actors = shot11(t, sh, v);
      cam = { ...CAMS.c11, shake: 0 };
      bgx = bgFor(CAMS.c11.x);
      break;
    default: {
      actors = shot12(t, sh, v);
      const sub = sub12(t);
      const c = sub === "a" ? CAMS.c12a : sub === "b" ? CAMS.c12b : sub === "c" ? CAMS.c12c : CAMS.c12d;
      cam = { ...c, shake: 0 };
      bgx = bgFor(c.x);
      STEP_AT.forEach((s) => {
        if (t >= s + 6 && t < s + 16) {
          const k = camShake(t, 0.06 * (1 - (t - s - 6) / 10), 12);
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
