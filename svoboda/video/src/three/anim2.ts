// Анимация сцены 2 (30 fps): позы по планам 07-12 как функции ВРЕМЕНИ (секунды). Всё на двойках: поза обновляется раз в 2 кадра (15 поз/с),
// в холдах/слоу-мо - раз в 4 (hq). Жёсткие позы без интерполяции. Все тайминги в секундах - от длительностей реплик (см. data/scene2.ts).
// Трёхмерные развороты: тело (ry) и голова (hy) вращаются вокруг вертикальной оси, лицо приклеено к голове.
import { PP, PPatch, mixP } from "./Person";
import { ShotT, S09, S12, STEP_AT, STEP, FPS, mouthFromEnv } from "../data/scene2";
import { jitter, clamp, hash } from "./util";
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
const H4 = 4 / FPS; // холд на 4 кадра
/** время, округлённое вниз до шага dt (секунды) */
const hq = (T: number, dt = H4) => Math.floor(T / dt + 1e-6) * dt;
/** чередование 0/1 с полупериодом p (секунды) */
const alt = (T: number, p: number) => Math.floor(T / p + 1e-6) % 2;
/** номер такта длиной p (секунды) по модулю n */
const cyc = (T: number, p: number, n: number) => Math.floor(T / p + 1e-6) % n;
/** кусочно-линейно по ключам [секунда, значение] */
const rm = (T: number, keys: ReadonlyArray<readonly [number, number]>) => {
  if (T <= keys[0][0]) return keys[0][1];
  for (let i = 1; i < keys.length; i++) {
    if (T <= keys[i][0]) {
      const [t0, v0] = keys[i - 1];
      const [t1, v1] = keys[i];
      return t1 === t0 ? v1 : v0 + ((v1 - v0) * (T - t0)) / (t1 - t0);
    }
  }
  return keys[keys.length - 1][1];
};

/** Жёсткие позы: ключ (секунда) действует и держится до следующего (никакой интерполяции) */
type K = PPatch & { t: number };
const seg = (keys: K[], T: number): PPatch => {
  let out: PPatch = {};
  for (const { t: kt, ...patch } of keys) if (kt <= T + 1e-6) out = { ...out, ...patch };
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

/** Реплика: рот по огибающей (пауза/провал между слогами - закрыт) + кивок на сильных слогах. f - кадры внутри плана */
const speak = (p: PP, sh: ShotT, f: number, env: number[] | undefined, nod = 3): PP => {
  const k = f - sh.vFrom;
  if (k < 0 || k >= sh.vLen) return { ...p, mouth: 0 };
  const m = mouthFromEnv(env, k, sh.vLen);
  return { ...p, mouth: m, hx: p.hx + (m === 2 ? nod : 0), tl: p.tl + (m === 2 ? nod * 0.5 : 0) };
};
const voiced = (sh: ShotT, f: number, env: number[] | undefined) => mouthFromEnv(env, f - sh.vFrom, sh.vLen) > 0;
const isSpeaking = (sh: ShotT, f: number) => f >= sh.vFrom && f < sh.vFrom + sh.vLen;

// =====================================================================================
// ПЛАН 07: Тони и Маркус выглядывают из-за горящей урны (Тони принюхивается: профиль -> 3/4)
// =====================================================================================
const TONY_X = 3.55;
const shot07 = (f: number, sh: ShotT, v: Voices): Actor[] => {
  const T = f / FPS;
  const L = sh.len / FPS;
  const squat = { llx: 70, lrx: 70, llk: 100, lrk: 100, y: 0.3 };
  const tk: K[] = [
    { t: 0, ...squat, ry: 74, rz: 0, tl: 12, hy: -8, hx: -3, brow: 0.3, alx: 40, ale: 60, arx: 40, are: 60, alz: 14, arz: 14, acc: 0, eyeL: 0, eyeR: 0, hp: 0 },
    { t: 0.25, hy: -2, hx: -8 }, { t: 0.5, hy: 6, hx: -2, ry: 72 },
    // принюхивание: подбородок вверх рывками, профиль к урне
    { t: 0.58, hx: -22, tl: 14 }, { t: 0.75, hx: -2, tl: 10 }, { t: 0.92, hx: -22, tl: 14 }, { t: 1.08, hx: -2, tl: 10 }, { t: 1.17, hx: -20, tl: 14, ry: 70 },
    // замечает: корпус разворачивается в 3/4, рука к очкам
    { t: 1.25, ry: 58, hy: 12, hx: -4, arx: 150, are: 100, alz: 8, arz: 8, brow: 0.6 },
    { t: 1.42, ry: 48, hy: 4, arx: 164, are: 112, acc: 1, hp: 1 },
    { t: 1.58, ry: 40, arx: 70, are: 60, brow: 1, eyeL: 2, eyeR: 2, hy: -6, y: 0.31 },
    { t: 1.75, ry: 36, arx: 22, are: 30, hy: -12 }, { t: 1.92, ry: 34, y: 0.34, hy: -14, alx: 100, ale: 50 },
    { t: 3.17, ry: 32, y: 0.44, llx: 50, lrx: 50, llk: 70, lrk: 70, tl: 8, alx: 40, arx: 24, ale: 50, are: 30, hy: -14 },
    { t: 5.0, ry: 30, y: 0.56, llx: 14, lrx: 14, llk: 24, lrk: 24, tl: 4, alx: 20, ale: 30, arx: 14, are: 30, hy: -16 },
    { t: 7.9, hy: -10, ry: 28 }, { t: L - 0.83, hy: -20, hx: 8, brow: 1 },
  ];
  const tp = seg(tk, T);
  let tpose = mixP({ scale: SC.tony, x: TONY_X, z: 0.25, eyeL: 0, eyeR: 0, llz: 4, lrz: 4, alz: 10, arz: 10, ...tp });
  if (T >= 0.58 && T < 1.25) tpose = { ...tpose, y: tpose.y + (alt(T, 0.133) ? 0.035 : 0) };
  if (T >= 1.58) tpose = { ...tpose, tear: 1 + cyc(T - 1.58, 0.33, 3), sw: 0, tl: tpose.tl + (alt(T, 0.25) ? 1.5 : -1) };
  if (T >= 1.92) tpose = { ...tpose, hy: tpose.hy + [0, 7, -7, 3][cyc(T, 0.42, 4)], eyeL: 2, eyeR: 2 };
  tpose = speak(tpose, sh, f, v.env[0]);

  // --- Маркус: справа от урны, поворачивается из профиля (к Тони) в 3/4, трясётся ---
  const peekX: Array<[number, number]> = [[0, 7.15], [0.42, 7.15], [0.5, 6.7], [0.92, 6.7], [1.0, 7.15], [1.42, 7.15], [1.5, 6.7], [2.5, 6.7], [2.58, 6.95], [3.08, 6.95], [3.17, 6.65]];
  let mx = peekX[0][1];
  for (const [kt, kx] of peekX) if (T >= kt) mx = kx;
  const mk: K[] = [
    { t: 0, ry: -74, hy: 6, y: 0.42, llx: 40, lrx: 40, llk: 60, lrk: 60, tl: 6 },
    { t: 0.5, hy: -4 }, { t: 1.0, hy: 8 }, { t: 1.5, hy: -2, ry: -66 }, { t: 2.0, hy: 10, y: 0.46, ry: -56 },
    { t: 3.0, ry: -46, hy: 12 },
    { t: 5.0, ry: -38, hy: 16, y: 0.5, llx: 20, lrx: 20, llk: 24, lrk: 24 }, { t: L - 2.5, hy: 8, y: 0.55, llx: 6, lrx: 6, llk: 6, lrk: 6, tl: 4 },
  ];
  let mp = mixP({
    scale: SC.marcus, z: 0.3, eyeL: 0, eyeR: 0, llz: 4, lrz: 4, alx: 55, ale: 105, arx: 55, are: 105, alz: 14, arz: 14, mouth: 4, brow: 1,
    ...seg(mk, hq(T)),
  });
  mp = {
    ...mp,
    x: mx,
    tz: jitter(f, 3, 4) * 7,
    tl: mp.tl + jitter(f, 5, 2) * 2,
    hz: jitter(f, 9, 4) * 7,
    y: mp.y + (alt(T, 0.133) ? 0.03 : 0),
    mouth: 4,
    tear: T > L - 8.3 ? 1 + cyc(T, 0.33, 3) : 0,
  };
  return [
    { kind: "marcus", pose: mp },
    { kind: "tony", pose: tpose },
  ];
};

// =====================================================================================
// ПЛАН 08: Маркус бросается Тони на шею; облёт камеры вокруг пары. Различимые силуэты, видны руки обоих.
// =====================================================================================
const T08 = { x: 3.95, z: 0.5 };
const M08 = { x: 2.85, z: 0.62 };
const shot08 = (f: number, sh: ShotT, v: Voices): Actor[] => {
  const T = f / FPS;
  // ----- Тони: профиль влево. A (0.58-1.67) руки вверх от неожиданности; B (1.67-4.0) обнимает в ответ; C (4.0-5.4) стискивает; D (5.4+) прижал -----
  const tk: K[] = [
    { t: 0, ry: -84, tl: 0, hy: 34, hx: 4, alx: 30, ale: 40, arx: 30, are: 40, alz: 30, arz: 30, brow: 1, eyeL: 2, eyeR: 2 },
    { t: 0.58, tl: 5, hy: 16, hx: 12, alx: 52, arx: 60, ale: 20, are: 20, alz: 70, arz: 70, brow: 1 },
    { t: 1.67, tl: 12, ry: -78, hx: 24, hy: 34, eyeL: 3, eyeR: 3, llx: 14, lrx: 14, llk: 26, lrk: 26, y: 0.43 * SC.tony - 0.07 },
    { t: 4.0, tl: 14, ry: -74, hx: 28, hy: 38, llx: 22, lrx: 22, llk: 40, lrk: 40, y: 0.43 * SC.tony - 0.11 },
    { t: 5.42, tl: 16, ry: -70, hx: 30, hy: 42, rz: -3 },
  ];
  const tg = hq(T, 0.0667);
  const tpp = seg(tk, tg);
  const hug = tg >= 1.67;
  let tp = mixP({ scale: SC.tony, x: T08.x, z: T08.z, y: 0.43 * SC.tony, llz: 6, lrz: 6, acc: 1, hl: 0, hr: 0, mouth: 0, ...tpp });
  const bob = tg >= 0.58 ? alt(T, 0.167) : 0;
  tp = { ...tp, tear: 1 + cyc(T, 0.25, 3), tz: tg > 0.58 ? (bob ? 2.5 : -1.5) : 0, y: tp.y + (tg > 0.58 && bob ? 0.03 : 0), x: tp.x + (tg >= 4.0 && bob ? -0.03 : 0) };

  // ----- Маркус: 0-0.42 бег рваными позами, 0.42-0.58 прыжок, 0.58+ виснет на шее на носочках -----
  const run = T < 0.42;
  const leap = T >= 0.42 && T < 0.58;
  let mp: PP;
  if (run) {
    const ph = alt(T, 0.083);
    const step = Math.floor(T / 0.083);
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
    // жёсткие позы объятия: A (0.58-1.67) на носочках; B (1.67-4.0) нога подогнута, рывком ближе; C (4.0-5.4) повис; D (5.4+) приподнят, голова на плече
    const poseA = tg < 1.67;
    const poseB = tg >= 1.67 && tg < 4.0;
    const poseD = tg >= 5.42;
    const bb = alt(T, 0.133);
    const push = poseA ? 0 : poseB ? 0.05 : poseD ? 0.1 : 0.07; // рывки к Тони
    // после прыжка Маркус встаёт на пол, колени согнуты, лицом в грудь Тони: голова заметно ниже головы Тони (не сливаются)
    mp = mixP({
      scale: SC.marcus, x: M08.x + push, z: poseA ? 0.74 : poseB ? 0.8 : 0.86, ry: poseD ? 74 : 84, y: poseA ? 0.7 : 0.5, tl: poseA ? 6 : 24, hy: poseD ? -34 : -12, hx: poseA ? 4 : 26, mouth: 0, brow: 1, eyeL: 0, eyeR: 0,
      llx: poseA ? 0 : 26, lrx: poseA ? 0 : 14, llk: poseA ? 0 : 56, lrk: poseA ? 0 : 36, llz: 7, lrz: 7, toe: poseA ? 58 : 0,
      ...(poseB ? { lrx: 4, lrk: 20, llx: 34, llk: 64 } : {}),
      ...(tg >= 4.0 ? { llx: 30, lrx: 18, llk: 58, lrk: 44, y: 0.47 } : {}),
      ...(poseD ? { llx: 36, lrx: 10, llk: 70, lrk: 26, y: 0.52, tl: 28 } : {}),
    });
    mp = { ...mp, tz: jitter(f, 4, 4) * 3, hz: jitter(f, 8, 4) * 4, hx: mp.hx + (bb ? 4 : 0), tear: 1 + cyc(T, 0.25, 3), y: mp.y + (bb ? 0.025 : 0) };
  }
  mp = speak({ ...mp, mouth: 0 }, sh, f, v.env[1], 3);
  if (!isSpeaking(sh, f) || mp.mouth === 0) mp = { ...mp, mouth: T < 0.58 ? 4 : 0 };

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
    const patting = (tg >= 2.25 && tg < 3.9) || (tg >= 4.4 && tg < 6.4);
    const pat = patting ? alt(T, 0.167) * 0.16 : 0;
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
// ПЛАН 09: Хлоя из куста: присед (голова и плечи над кустом) -> вылет с разворотом (всё тело, плакат и мегафон в руках) -> приземление
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
  cow: { t: [0.86, -0.2, 0.16] as V3, cup: -34 },
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
/** ключи полёта (секунды плана 09): x, y, ry */
const FLY_X: Array<[number, number]> = [[0.33, 8.7], [0.58, 8.62], [0.67, 8.5], [0.88, 7.95], [1.0, 7.6], [1.17, CH_LAND.x]];
const FLY_Y: Array<[number, number]> = [[0.33, 0.5], [0.58, 0.54], [0.64, 1.25], [0.78, 1.95], [0.9, 2.15], [1.05, 1.5], [1.17, 0.56]];
const FLY_RY: Array<[number, number]> = [[0.58, -46], [0.67, 0], [0.78, 90], [0.9, 30], [1.05, 0], [1.17, -50]];
const shot09 = (f: number, sh: ShotT, v: Voices): { actors: Actor[]; leaves: number } => {
  const T = f / FPS;
  if (T < 0.12) return { actors: [], leaves: -1 };
  const tg = hq(T, 0.0667);
  let pose: PP;
  if (T < S09.land) {
    type AirP = PPatch & { t: number; mega: Mega; plac: keyof typeof PLAC };
    const air: AirP[] = [
      // присед за кустом, лицом вправо-вперёд: голова и плечи над листвой, плакат поднят сбоку, мегафон у рта
      { t: 0.12, y: 0.52, ry: -50, tl: 14, rz: 0, llx: -34, lrx: -52, llk: 84, lrk: 66, hy: 22, hx: -4, mega: "side", plac: "hi", z: 0.45 },
      { t: 0.33, y: 0.44, ry: -46, tl: 22, hy: 10, llx: -34, lrx: -52, llk: 84, lrk: 66, mega: "down", plac: "hi", z: 0.5 }, // сжалась перед прыжком, профиль влево
      { t: S09.jump, tl: 8, rz: 2, llx: 22, lrx: 2, llk: 60, lrk: 22, hy: 0, mega: "air", plac: "mid", z: 0.58 }, // отрыв
      { t: S09.jump + 0.08, tl: 22, rz: -14, llx: 36, lrx: -20, llk: 104, lrk: 74, hy: -12, mega: "air", plac: "mid", z: 0.62 }, // вылет: ноги поджаты
      { t: S09.jump + 0.25, tl: -8, rz: 9, llx: 30, lrx: -30, llk: 18, lrk: 18, llz: 46, lrz: 46, hy: 16, mega: "fwd", plac: "hi", z: 0.7 }, // «герой» в воздухе: растопырена, плакат вверх
      { t: S09.jump + 0.45, tl: 4, rz: 2, llx: 10, lrx: 4, llk: 40, lrk: 40, llz: 22, lrz: 22, hy: 10, mega: "fwd", plac: "mid", z: 0.78 }, // снижается
    ];
    let cur = air[0];
    for (const a of air) if (tg >= a.t - 1e-6) cur = a;
    const { t: _t, mega, plac, ...patch } = cur;
    const crouching = T < S09.jump;
    const fx = crouching ? 8.62 : rm(T, FLY_X);
    const fy = crouching ? (patch.y ?? 0.5) : rm(T, FLY_Y);
    const fry = crouching ? (patch.ry ?? -46) : rm(T, FLY_RY);
    pose = CB("chloe", { eyeL: 1, eyeR: 1, brow: 1, mouth: 0, llz: 22, lrz: 22, ...patch, x: fx, y: fy, ry: fry });
    if (crouching && T < 0.33) pose = { ...pose, mouth: 4, hz: alt(T, 0.133) ? 3 : -3 };
    pose = chloeHands(pose, mega, plac);
  } else {
    const tt = tg - S09.land;
    // посадка: 0-0.13 сжатие, затем разворот лицом к камере, стойка 3/4
    const ry = tt < 0.07 ? -44 : tt < 0.13 ? -36 : tt < 0.27 ? -30 : -24;
    const sq = tt < 0.13;
    pose = CB("chloe", {
      x: CH_LAND.x, z: CH_LAND.z, ry, y: 0.56 - (sq ? 0.09 : 0), tl: sq ? 12 : -3, hx: sq ? 8 : -3, hy: sq ? 18 : 22, llz: sq ? 24 : 14, lrz: sq ? 24 : 14, llk: sq ? 56 : 0, lrk: sq ? 56 : 0, llx: sq ? 24 : 4, lrx: sq ? 18 : -2,
      mouth: 0, eyeL: sq ? 2 : 0, eyeR: sq ? 2 : 0, brow: 0.6,
    });
    const env = v.env[2];
    const speakingNow = isSpeaking(sh, f);
    const loud = T >= S09.siren && f < sh.vFrom;
    const mouthOpen = speakingNow && voiced(sh, f, env);
    const raised = tt >= 0.13 && (loud || mouthOpen || (speakingNow && mouthFromEnv(env, f - sh.vFrom + 6, sh.vLen) > 0));
    pose = chloeHands(pose, raised ? "side" : sq ? "air" : "down", sq ? "hi" : "std");
    if (loud) pose = { ...pose, sir: 1 + cyc(T - S09.siren, 0.083, 3), eyeL: 1, eyeR: 1 };
    if (speakingNow) {
      pose = speak({ ...pose, eyeL: 0, eyeR: 0, brow: 1, sir: mouthOpen && (env?.[Math.floor((f - sh.vFrom) / STEP) * STEP] ?? 0) > 0.55 ? 1 + cyc(T, 0.083, 3) : 0 }, sh, f, env, 4);
      pose = { ...pose, hy: pose.hy + [0, 6, -4, 5][cyc(T, 0.5, 4)] };
    } else if (f >= sh.vFrom + sh.vLen) pose = { ...pose, sir: 0, mouth: 0, eyeL: 0, eyeR: 0 };
    pose = { ...pose, tl: pose.tl + (alt(tt, 0.25) ? 1.5 : -1), hz: alt(tt, 0.33) ? 3 : -3 };
  }
  return { actors: [{ kind: "chloe", pose }], leaves: Math.round((T - S09.jump) * 24) };
};

// =====================================================================================
// ГРЕГ: живая реакция. Поза и мимика меняются каждые 0.5-0.65 с, одинаковых кадров дольше 0.7 с нет.
// =====================================================================================
const GREG_BEATS: Array<PPatch & { talk?: boolean }> = [
  { tl: -14, hx: -6, hy: 18, mouth: 4, brow: -1, eyeL: 2, eyeR: 2, ry: 52, alx: 38, alz: 40, ale: 20, lx: 1.2, ly: 0, arx: 8, are: 36, arz: 22, talk: true }, // откинулся, стаканчик опущен
  { tl: -4, hx: -16, hy: 8, mouth: 4, brow: -1, eyeL: 0, eyeR: 0, lx: 0, ly: 2.4, alx: 14, alz: 14, ale: 10, arx: 76, are: 40, arz: 30, ry: 56, talk: true }, // закатил глаза вверх
  { tl: 10, hx: 22, hy: 10, mouth: 1, brow: 0.4, eyeL: 3, eyeR: 3, alx: 4, alz: 8, ale: 6, arx: 14, are: 20, arz: 10, ry: 60 }, // вздох: плечи вперёд, глаза закрыты
  { tl: -6, hx: -4, hy: 14, mouth: 0, brow: -0.5, eyeL: 2, eyeR: 2, arx: 150, are: 122, arz: 10, ry: 52, lx: 0.6, ly: 0.8 }, // поднял стаканчик к губам
  { tl: 0, hx: 4, hy: 34, mouth: 4, brow: -1, eyeL: 2, eyeR: 2, alx: 22, alz: 26, ale: 30, arx: 40, are: 100, arz: 40, ry: 50, tz: 4, talk: true }, // мотает головой «нет»
  { tl: 4, hx: 14, hy: 6, mouth: 4, brow: -1, eyeL: 3, eyeR: 3, alx: 164, alz: 8, ale: 126, ry: 58 }, // ладонь на лоб
  { tl: -8, hx: -6, hy: 16, mouth: 6, brow: 1, eyeL: 1, eyeR: 1, alx: 58, alz: 74, ale: 28, arx: 54, arz: 62, are: 34, ry: 54, lx: 1.0, ly: 0, talk: true }, // руки в стороны: «серьёзно?!»
  { tl: -10, hx: -2, hy: 24, mouth: 6, brow: -1, eyeL: 2, eyeR: 2, alx: 92, alz: 18, ale: 6, ry: 48, lx: 1.6, ly: 0, talk: true }, // тычет пальцем в сторону Хлои
  { tl: -2, hx: 6, hy: 10, mouth: 4, brow: 0.2, eyeL: 2, eyeR: 2, alx: 14, alz: 52, ale: 62, arx: 28, arz: 40, are: 70, ry: 56, tz: -5, talk: true }, // пожал плечами, голова набок
];
// порядок: соседние биты никогда не повторяются; sip/facepalm (индексы 3, 5) молчаливые
const GREG_ORDER = [0, 3, 1, 7, 2, 4, 6, 5, 8, 1, 0, 6, 3, 4, 2, 8, 7, 5, 1, 0];
const GREG_DUR = [0.5, 0.6, 0.55, 0.65, 0.5, 0.6, 0.55, 0.65, 0.5, 0.6];
const gregBeat = (T: number, talking: boolean): { patch: PPatch; idx: number; k: number } => {
  // номер бита по накопленным длительностям (такты разной длины 0.5-0.65 с)
  let t = 0;
  let i = 0;
  for (;;) {
    const d = GREG_DUR[i % GREG_DUR.length];
    if (T < t + d) break;
    t += d;
    i++;
  }
  let bi = GREG_ORDER[i % GREG_ORDER.length];
  if (talking && !GREG_BEATS[bi].talk) bi = GREG_ORDER[(i + 1) % GREG_ORDER.length]; // говорящий Грег не пьёт и не закрывает лицо
  if (talking && !GREG_BEATS[bi].talk) bi = 0;
  const { talk: _tk, ...patch } = GREG_BEATS[bi];
  const j = hash(i, 5) * 2 - 1;
  return { patch: { ...patch, hy: (patch.hy ?? 0) + j * 4, tl: (patch.tl ?? 0) + j * 1.5 }, idx: i, k: T - t };
};
const gregPose = (T: number, f: number, base: PPatch, sh: ShotT, env: number[] | undefined, talkWindow: boolean): PP => {
  const talking = talkWindow && isSpeaking(sh, f) && voiced(sh, f, env);
  const { patch, k } = gregBeat(T, talkWindow && isSpeaking(sh, f));
  let gp = mixP({ scale: SC.greg, y: 0.43 * SC.greg, llz: 4, lrz: 4, arx: 30, are: 80, arz: 16, mouth: 0, ...base, ...patch });
  // внутри такта ещё и дрожь: подпрыгивание и моргание, чтобы кадры не были копией друг друга
  gp = { ...gp, y: gp.y + (alt(T, 0.167) ? 0.014 : 0), tz: (gp.tz ?? 0) + (alt(T, 0.25) ? 1.5 : -1.5), hx: gp.hx + (k > 0.25 ? 2 : 0) };
  if (cyc(T, 0.17, 7) === 3 && gp.eyeL !== 3) gp = { ...gp, eyeL: 3, eyeR: 3 };
  if (talkWindow && isSpeaking(sh, f)) {
    gp = speak(gp, sh, f, env, 3);
    if (!talking) gp = { ...gp, mouth: 0 };
  }
  return gp;
};

// =====================================================================================
// ПЛАН 10: Грег (3/4) говорит, Тони и Маркус рядом реагируют: переглядываются, Тони скрещивает руки и закатывает глаза, Маркус кивает и вытирает слёзы
// =====================================================================================
/** Тони в сцене реакций: руки скрещены (IK), голова переводит взгляд Грег -> Маркус -> Хлоя, закатывает глаза */
const tonyReact = (T: number, f: number, x: number, z: number, ry: number, looks: number[]): PP => {
  const L = looks[cyc(T, 0.7, looks.length)];
  const rollT = (T % 2.1) / 0.5; // раз в 2.1 с закатывает глаза (0.5 с)
  const a = (200 - 220 * clamp(rollT)) * (Math.PI / 180);
  const eyes: [number, number] = rollT < 1 ? [Math.cos(a) * 2.2, Math.sin(a) * 2.2] : [0, 0];
  const TS = 1.6;
  let tp = mixP({
    scale: TS, x, z, y: 0.43 * TS, ry, tl: alt(T, 0.7) * 2, hy: L, hx: alt(T, 1.4) ? -8 : 2, acc: 1, eyeL: 2, eyeR: 2, brow: -0.6, mouth: 0, llz: 5, lrz: 5, lx: eyes[0], ly: eyes[1], hz: rollT < 1 ? -6 + 12 * clamp(rollT) : 0,
  });
  tp = arm(tp, "tony", 1, [-0.3, 0.38, 0.5], 10); // руки скрещены на груди
  tp = arm(tp, "tony", -1, [0.3, 0.3, 0.52], 10);
  tp = { ...tp, y: tp.y + (alt(T, 0.4) ? 0.012 : 0), tz: alt(T, 0.5) ? 1.5 : -1.5 };
  if (cyc(T, 0.3, 9) === 4) tp = { ...tp, eyeL: 3, eyeR: 3 };
  void f;
  return tp;
};
/** Маркус в сцене реакций: хнычет, кивает на каждый такт, косится на Тони, вытирает слёзы рукой */
const marcusReact = (T: number, x: number, z: number, ry: number, towards: number): PP => {
  const MS = 1.5;
  let mp = mixP({
    scale: MS, x, z, y: 0.43 * MS, ry, tl: 6, hy: alt(T, 0.9) ? towards : towards * 0.2, hx: 4, alx: 55, ale: 105, arx: 55, are: 105, alz: 14, arz: 14, brow: 1, mouth: 4, llz: 4, lrz: 4,
  });
  const nod = cyc(T, 0.33, 3) === 1; // кивок
  mp = { ...mp, hx: mp.hx + (nod ? 14 : 0), tz: jitter(Math.round(T * FPS), 6, 4) * 4, hz: jitter(Math.round(T * FPS), 2, 4) * 4, tear: 1 + cyc(T, 0.23, 3), y: mp.y + (nod ? -0.03 : 0) };
  // вытирает слёзы рукой (раз в 1.5 с на 0.4 с)
  if (T % 1.5 > 1.0) {
    const eye = fromTorso(mp, [0, 0.93, 0]);
    const tgt = toTorso(mp, [eye[0] + 0.2, eye[1] - 0.05, eye[2] + 0.55]);
    mp = arm(mp, "marcus", -1, qv(tgt), 30);
  }
  return mp;
};
const shot10 = (f: number, sh: ShotT, v: Voices): Actor[] => {
  const T = f / FPS;
  const gp = gregPose(T, f, { x: GREG_X, z: 0.4, ry: 56, lx: 1.2, ly: 0, eyeL: 2, eyeR: 2, brow: -1 }, sh, v.env[3], true);
  const tp = tonyReact(T, f, 0.7, 1.0, -34, [34, -6, 48, -26]); // Тони смотрит то на Маркуса, то на Грега
  const mp = marcusReact(T, 2.85, 0.9, -26, 10);
  return [
    { kind: "greg", pose: gp },
    { kind: "marcus", pose: mp },
    { kind: "tony", pose: tp },
  ];
};

// =====================================================================================
// ПЛАН 11: Хлоя (справа) тычет в Грега и жестом на Тони и Маркуса; Грег реагирует, Тони и Маркус в кадре тоже живут
// =====================================================================================
const shot11 = (f: number, sh: ShotT, v: Voices): Actor[] => {
  const T = f / FPS;
  const env = v.env[4];
  const vk = f - sh.vFrom;
  const frac = clamp(vk / sh.vLen);
  const sp = isSpeaking(sh, f);
  // ----- Хлоя -----
  let ry = -40;
  let mega: Mega = "down";
  let hy = 12;
  let mp = 0;
  if (T < 0.33) {
    mega = T < 0.13 ? "up" : T < 0.27 ? "fwd" : "down";
    hy = 10;
  } else if (frac < 0.24 || (frac >= 0.52 && frac < 0.74)) {
    mega = "fwd"; // тычет мегафоном в Грега
    ry = -42 + (alt(T, 0.133) ? -3 : 3);
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
  let cp = CB("chloe", { x: 7.9, z: 1.15, ry, tl: -3, hx: -4, hy: hy + (alt(T, 0.267) ? 3 : 0), llz: 12, lrz: 12, mouth: 0, eyeL: 0, eyeR: 0, brow: -0.8, tz: jitter(f, 7, 4) * 1.5 });
  cp = chloeHands(cp, mega, "std", mp === 2 ? ([-0.9, 0.5, 0.45] as V3) : undefined);
  if (mp === 2) cp = { ...cp, my: -35 };
  if (mp === 1) cp = { ...cp, my: -18 };
  if (sp) cp = speak({ ...cp, eyeL: 0, eyeR: 0, brow: -1 }, sh, f, env, 4);
  else cp = { ...cp, mouth: 0, hx: f >= sh.vFrom + sh.vLen ? 6 : cp.hx };

  // ----- Грег: живая реакция (слушает, не говорит) -----
  const gp = gregPose(T, f, { x: 5.0, z: 0.8, ry: 52, lx: 1.0, ly: 0, eyeL: 2, eyeR: 2, brow: -1 }, sh, undefined, false);
  const tp = tonyReact(T + 0.3, f, 1.5, 1.0, 38, [-30, 40, 6, 44]);
  const mk = marcusReact(T + 0.1, 3.0, 0.75, 30, -16);
  return [
    { kind: "marcus", pose: mk },
    { kind: "tony", pose: tp },
    { kind: "greg", pose: gp },
    { kind: "chloe", pose: cp },
  ];
};

// =====================================================================================
// ПЛАН 12: финал жёсткими склейками: общий / Хлоя крупно / Тони снизу / ОБЩИЙ ВДВОЁМ (Тони нависает в 3/4, Хлоя вжимается)
// =====================================================================================
/** Какой под-план 12 в момент T (секунды) */
export const sub12 = (T: number) => (T < S12.b ? "a" : T < S12.c ? "b" : T < S12.d ? "c" : "d");
const DBL = { arx: 90, arz: 86, are: 104, alx: 90, alz: 86, ale: 104, hl: 2, hr: 2 };
const shot12 = (f: number, sh: ShotT, v: Voices): Actor[] => {
  const T = f / FPS;
  const sub = sub12(T);
  const tg = hq(T, 0.0667);
  const env = v.env[5];
  const blink = cyc(T, 0.4, 5) === 2;
  const mkTony = (o: PPatch): PP => {
    let tp = mixP({ scale: SC.tony, z: 1.0, y: 0.43 * SC.tony, tl: 3, hy: -10, hx: -4, alz: 10, arz: 10, brow: -1, eyeL: 2, eyeR: 2, mouth: 0, llz: 8, lrz: 8, acc: 1, ...o });
    tp = speak(tp, sh, f, env, 4);
    if (tp.mouth === 0) tp = { ...tp, brow: -1 };
    return { ...tp, tz: tp.mouth ? jitter(f, 5, 4) * 1.5 : 0 };
  };
  // Хлоя: плакат ниже и сбоку (не закрывает лицо), мегафон в руке сбоку, глаза - кружки с зрачками, слёзы - 2-3 капли
  const mkChloe = (o: PPatch, cow: boolean): PP => {
    let cp = CB("chloe", {
      ry: -62, rz: cow ? -5 : 0, tl: cow ? -1 : 0, hx: cow ? -2 : -4, hy: cow ? 16 : 8, hdy: cow ? -0.1 : 0, y: 0.43 * SC.chloe - (cow ? 0.05 : 0), llz: 12, lrz: 12, brow: 1,
      eyeL: cow ? (blink ? 3 : 1) : 0, eyeR: cow ? (blink ? 3 : 1) : 0, mouth: cow ? (alt(T, 0.133) ? 6 : 4) : 0, ...o,
    });
    if (cow) cp = { ...cp, tz: jitter(f, 11, 4) * 3, hz: jitter(f, 12, 4) * 3, tear: 1 + cyc(T, 0.37, 3), sw: 0, y: cp.y + (alt(T, 0.133) ? 0.018 : 0) };
    return chloeHands(cp, cow ? "side" : "down", "cow");
  };
  const mkMarcus = (o: PPatch): PP => {
    const mp = mixP({ scale: SC.marcus, z: 0.45, y: 0.43 * SC.marcus, tl: 6, hy: 12, hx: 4, alx: 52, ale: 108, arx: 52, are: 108, alz: 14, arz: 14, brow: 1, mouth: 4, llz: 4, lrz: 4, ...o });
    return { ...mp, tz: jitter(f, 8, 4) * 3, hz: alt(T, 0.42) ? 3 : -3, tear: T > 1.5 ? 1 + cyc(T, 0.33, 3) : 0 };
  };

  if (sub === "a") {
    // ОБЩИЙ: Тони подходит тяжёлыми шагами (профиль вправо, кулаки), Хлоя вжимается, Маркус всхлипывает позади
    let x = 3.9;
    let stepPh = -1;
    STEP_AT.slice(0, 3).forEach((s, i) => {
      x += 0.5 * (tg >= s + 0.08 ? 1 : 0);
      if (T >= s && T < s + 0.5) stepPh = i;
    });
    const ph = stepPh >= 0 ? Math.floor((T - STEP_AT[stepPh]) / 0.167) % 2 : 0;
    const poses: K[] = [{ t: 0, ry: 84, hr: 2, hl: 2, alx: 40, ale: 100, alz: 12, arx: 34, are: 104, arz: 12, hy: -12 }, { t: 1.67, ry: 80, hy: -10 }, { t: 2.9, ry: 72, hy: -16, tl: 8 }];
    let tp = mkTony({ x, ...seg(poses, tg) });
    if (stepPh >= 0) tp = { ...tp, llx: ph ? 34 : -22, lrx: ph ? -22 : 34, llk: ph ? 0 : 30, lrk: ph ? 30 : 0, y: tp.y + (ph ? 0.05 : 0), tl: tp.tl + 4 };
    const cx = 8.25 + (tg >= 1.83 ? 0.12 : 0);
    const cp = mkChloe({ x: cx, z: 1.8, ry: -64, hy: 14 }, T >= 0.33);
    const mp = mkMarcus({ x: 2.7, z: 0.45, ry: 40, hy: -12 });
    return [{ kind: "marcus", pose: mp }, { kind: "chloe", pose: cp }, { kind: "tony", pose: tp }];
  }
  if (sub === "b") {
    // КРУПНЫЙ ПЛАН ХЛОИ: 3 акцентные позы с паузами: (1) отступает назад, (2) вжимает голову в плечи, (3) осторожно выглядывает
    const k = T - S12.b;
    const ps: K[] = [
      { t: 0, ry: -30, hy: 8 },
      { t: 0.42, ry: -58, hy: 22, hx: -8, rz: -10, tl: -6, hdy: 0, x: 8.05, y: 0.43 * SC.chloe + 0.03 }, // отступила: корпус отвёрнут, подбородок вверх
      { t: 1.0, ry: -30, hy: 6, hx: 8, rz: 0, tl: 4, hdy: -0.16, x: 7.8 }, // голова втянута в плечи
      { t: 1.83, ry: -24, hy: 4, hx: 12, tl: 6, hdy: -0.2 }, // пауза: сжалась ещё
      { t: 2.4, ry: -44, hy: 20, hx: -6, tl: -2, hdy: -0.06, rz: -3, x: 7.88 }, // выглядывает
      { t: 2.9, ry: -28, hy: 12, hx: 2, tl: 2, hdy: -0.1, x: 7.7 },
    ];
    const pk = seg(ps, hq(k, 0.0667));
    const cp = mkChloe({ x: 7.7, z: 1.8, ...pk }, true);
    const shut = k >= 1.0 && k < 1.2; // зажмуривается на долю секунды, остальное время глаза - круги с зрачками
    return [{ kind: "chloe", pose: { ...cp, eyeL: shut || blink ? 3 : 1, eyeR: shut || blink ? 3 : 1, brow: shut ? 1 : cp.brow } }];
  }
  if (sub === "c") {
    // НИЖНИЙ РАКУРС: Тони - позы-бицепсы с паузами: двойной бицепс (3/4), поворот и боковой бицепс, финальный двойной
    const k = T - S12.c;
    const FLEX = { hl: 2, hr: 2 };
    const ps: K[] = [
      { t: 0, ry: 54, arx: 8, arz: 18, are: 20, alx: 8, alz: 18, ale: 20, ...FLEX, rz: 0, tl: 2, hy: -26, hx: -4 }, // замах: кулаки вдоль тела
      { t: 0.33, ry: 26, ...DBL, rz: -3, tl: -5, hy: -20, hx: -14 }, // ДВОЙНОЙ БИЦЕПС
      { t: 0.75, ry: 2, ...DBL, rz: 3, tl: -6, hy: 18, hx: -12, y: 0.43 * SC.tony + 0.03 }, // грудью в камеру, голова через плечо
      { t: 1.17, ry: -40, ...DBL, rz: 4, tl: -8, hy: 46, hx: -12 }, // корпус влево
      { t: 1.67, ry: 62, arx: 90, arz: 84, are: 118, hr: 2, alx: 6, alz: 40, ale: 70, hl: 2, rz: -4, tl: -6, hy: -40, hx: -16 }, // БОКОВОЙ БИЦЕПС
      { t: 2.17, ry: 62, arx: 90, arz: 84, are: 128, hy: -34, hx: -18 }, // рука сжата сильнее
      { t: 2.58, ry: 14, ...DBL, rz: -2, tl: -10, hy: -8, hx: -22, y: 0.43 * SC.tony + 0.04 }, // финальный двойной, подбородок вверх
      { t: 3.17, ry: 20, hy: -14 },
    ];
    const tp = mkTony({ x: 6.2, z: 0.4, ...seg(ps, hq(k, 0.0667)), y: 0.43 * SC.tony + (alt(T, 0.067) ? 0.012 : 0) });
    return [{ kind: "tony", pose: tp }];
  }
  // d: ОБЩИЙ ВДВОЁМ: Тони (ближе к камере, нависает в 3/4) идёт к Хлое тремя тяжёлыми шагами; Хлоя вжимается в угол кадра
  const k = T - S12.d;
  const stepK = STEP_AT.slice(3).map((s) => s - S12.d);
  const steps = stepK.filter((s) => k >= s + 0.08).length;
  const ps: K[] = [
    { t: 0, ry: 60, ...DBL, rz: -3, tl: -4, hy: -26, hx: -10 }, // профиль-3/4 вправо, двойной бицепс
    { t: stepK[0] + 0.08, ry: 52, hy: -30 }, // шаг 1: корпус довернул
    { t: stepK[1] + 0.08, ry: 44, arx: 6, arz: 48, are: 66, alx: 6, alz: 48, ale: 66, hl: 2, hr: 2, rz: -2, tl: -4, hy: -26, hx: -8 }, // шаг 2: кулаки в боки
    { t: stepK[2] + 0.08, ry: 36, hy: -16, hx: -6, tl: 2 }, // шаг 3: нависает, взгляд сверху вниз на Хлою
    { t: stepK[2] + 0.5, ry: 36, ...DBL, rz: -2, tl: -6, hy: -14, hx: -16 }, // двойной бицепс в 3/4 (пауза)
    { t: stepK[2] + 1.4, ry: 30, arx: 70, arz: 40, are: 40, hl: 1, hr: 2, tl: 8, hx: 6, hy: -20 }, // грозит пальцем (левая рука - указательный)
  ];
  let tp = mkTony({ x: 5.4 + steps * 0.4, z: 2.1, ...seg(ps, tg) });
  const stepNow = stepK.findIndex((s) => k >= s && k < s + 0.42);
  if (stepNow >= 0) {
    const ph = Math.floor((k - stepK[stepNow]) / 0.167) % 2;
    tp = { ...tp, llx: ph ? -22 : 34, lrx: ph ? 34 : -22, llk: ph ? 30 : 0, lrk: ph ? 0 : 30, y: tp.y + 0.04, tl: tp.tl + 4 };
  }
  const stepAt = [0.4, 1.2, 2.0];
  const back = stepAt.filter((s) => k >= s + 0.08).length * 0.2;
  const cwalk = stepAt.some((s) => k >= s && k < s + 0.13);
  const cp0 = mkChloe({ x: 9.3 + back, z: 1.9, ry: -46, hy: 12 }, true);
  const cp = { ...cp0, llx: cwalk ? 22 : 0, lrx: cwalk ? -14 : 0, llk: cwalk ? 24 : 0, y: cp0.y + (cwalk ? 0.04 : 0) };
  const mp = mkMarcus({ x: 3.4, z: 0.45, ry: 50, hy: -14 });
  return [{ kind: "marcus", pose: mp }, { kind: "chloe", pose: cp }, { kind: "tony", pose: tp }];
};

// =====================================================================================
// Камеры. Верх кадра выше крыш (небо), вывеска «VEGAN COFFEE» по центру фона и выше голов.
// =====================================================================================
const CAM_Y = 1.5;
const CAM_PITCH = 0.1;
const camAt = (x: number, z: number, y = CAM_Y, pitch = CAM_PITCH) => ({ x, y, z, tx: x, ty: y + z * pitch, tz: 0 });
const CAMS = {
  c07: camAt(5.1, 7.0),
  c09: camAt(7.9, 7.6),
  c10: camAt(-0.1, 6.6),
  c11: camAt(5.7, 8.6),
  c12a: camAt(6.1, 8.2),
  c12b: { ...camAt(7.85, 6.6, 1.4), ty: 1.95, tz: 0 },
  c12c: camAt(6.3, 6.3, 0.6, 0.22),
  c12d: { ...camAt(7.5, 8.2, 0.9, 0.1), ty: 2.0, tz: 0 },
};
/** Облёт объятия (план 08): камера обходит пару по дуге постоянного радиуса; шаги на двойках (ступенчатый облёт, кукольный стоп-кадр) */
export const ORBIT = { cx: 3.3, cz: 0.6, ty: 1.75, r: 5.6, a0: 38, a1: -38, t0: 0.58, t1: 6.33 };
const orbitCam = (T: number): Cam & { az: number } => {
  const u = clamp((T - ORBIT.t0) / (ORBIT.t1 - ORBIT.t0));
  const e = u * u * (3 - 2 * u); // сглаженная ступень, но T уже квантован на двойки -> облёт идёт рывками
  const az = ORBIT.a0 + (ORBIT.a1 - ORBIT.a0) * e;
  const a = (az * Math.PI) / 180;
  return {
    x: q2(ORBIT.cx + ORBIT.r * Math.sin(a)), z: q2(ORBIT.cz + ORBIT.r * Math.cos(a)), y: q2(1.2 + 0.4 * Math.sin(Math.PI * e)),
    tx: ORBIT.cx, ty: ORBIT.ty, tz: ORBIT.cz, shake: 0, az,
  };
};
/** x кофейни (VEGAN COFFEE) в мире = 0.2; фон сдвигаем так, чтобы она была в центре кадра */
const bgFor = (camX: number) => camX - 0.2;
const camShake = (f: number, amp: number, seed = 1) => ({ x: jitter(f, seed, 2) * amp, y: jitter(f, seed + 7, 2) * amp });

export const frameAt = (frame: number, sh: ShotT, tlCount: number, v: Voices): Frame => {
  // внутри плана время квантуется на двойки: 15 обновлений в секунду
  const fr = frame - sh.from;
  const f = Math.floor(fr / STEP) * STEP;
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
      // лёгкий боковой дрейф камеры (ступеньками на 4 кадра); фон закреплён в мире - настоящий параллакс
      const dx = -0.35 + 0.8 * (hq(T) / (sh.len / FPS));
      cam = { ...CAMS.c07, x: CAMS.c07.x + dx, shake: 0 };
      bgx = bgFor(CAMS.c07.x);
      bin = BIN.x;
      break;
    }
    case 8:
      actors = shot08(f, sh, v);
      cam = orbitCam(T);
      bgx = bgFor(ORBIT.cx);
      bin = BIN.x;
      if (T >= 0.58 && T < 0.92) {
        const s = camShake(f, 0.05 * (1 - (T - 0.58) / 0.33), 4);
        sx = s.x;
        sy = s.y;
      }
      break;
    case 9: {
      const r = shot09(f, sh, v);
      actors = r.actors;
      leaves = r.leaves;
      bgx = bgFor(CAMS.c09.x);
      bin = BIN.x;
      // жёсткая склейка на кусты; небольшой наезд камеры на приземлении
      const zc = T < S09.land ? 7.9 : 7.1;
      cam = { ...CAMS.c09, z: zc, ty: CAM_Y + zc * CAM_PITCH + (T < S09.land ? 0.5 : 0), shake: 0 };
      bushShake = T >= S09.rustle && T < S09.jump + 0.08 ? 0.07 : 0;
      if (T >= S09.land && T < S09.land + 0.33) {
        const s = camShake(f, 0.07 * (1 - (T - S09.land) / 0.33), 5);
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
      const c = sub === "a" ? CAMS.c12a : sub === "b" ? CAMS.c12b : sub === "c" ? CAMS.c12c : CAMS.c12d;
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
