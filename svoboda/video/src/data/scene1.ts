// СЦЕНА 1 «Великое исчезновение» (0:00-0:30) как ДАННЫЕ. 24 fps, 720 кадров.
// Координаты - авторские px (центр кадра 0,0; y вверх; плоскость z=0).
// v2: стабильный свет (без мигалок), камера держит кадр с билбордом, удар/полёт на ключевых позах, вырез+вспышка, финал крупно.
import type { CamKey } from "../engine/camera";
import { focusOn } from "../engine/camera";
import type { AudioCue } from "../engine/audio";
import type { Pose } from "../engine/types";
import { CENTER_Y } from "./rigs";

export const FPS = 24;
export const WIDTH = 1920;
export const HEIGHT = 1080;
export const DURATION = 720;
export const sec = (s: number) => Math.round(s * FPS);

/** Линия тротуара: сюда ставятся стопы */
export const GROUND = -315;
export const GREG_SCALE = 1;

export const SHOTS = [
  { n: 1, from: 0, to: 168, name: "Общий план, хаос, Грег идёт, суперкар въезжает" },
  { n: 2, from: 168, to: 296, name: "Удар, слоу-мо, полёт (кадр держится, лёгкий наезд)" },
  { n: 3, from: 296, to: 360, name: "Шлёп, пауза" },
  { n: 4, from: 360, to: 420, name: "Билборд 23:59 -> 00:00, 19 НОЯБРЯ 2026" },
  { n: 5, from: 420, to: 480, name: "Общий, вырез + вспышка, пустая улица, тишина" },
  { n: 6, from: 480, to: 720, name: "Грег встаёт, плечо, зуб, небо, реплика, наезд" },
] as const;

// ---------- Фоновые слои (параллакс по depth) ----------
export interface LayerDef {
  id: string;
  asset: string;
  parallax: number;
  k: number;
  order: number;
  tiles: boolean;
}
export const LAYERS: LayerDef[] = [
  { id: "sky", asset: "bg_sky", parallax: 0.05, k: 1.3, order: -1000, tiles: true },
  { id: "far", asset: "bg_far", parallax: 0.15, k: 1.0, order: -900, tiles: true },
  { id: "mid", asset: "bg_mid", parallax: 0.4, k: 1.0, order: -800, tiles: true },
  { id: "ground", asset: "bg_fore", parallax: 1, k: 1.0, order: -700, tiles: true },
];
export const GROUND_FILL = "#363641";
/** Билборд - отдельный объект на глубине 60; поднят, чтобы лицо Грега/пальмы/подвесы его не перекрывали */
export const BILLBOARD = {
  asset: "billboard",
  depth: 60,
  x: 500,
  y: 265,
  w: 620,
  flipAt: 392,
  glitchFrom: 388,
  time0: "23:59",
  time1: "00:00",
  date: "19 НОЯБРЯ 2026",
};

// ---------- Ключевые кадры ----------
export const HIT_FRAME = 168; // кадр-вспышка удара
export const FLIGHT_FROM = 172; // конец хит-стопа, старт слоу-мо полёта
export const LAND_FRAME = 296; // шлёп на асфальт
export const LAND_X = 420;
export const VANISH_FRAME = 440; // вырез + белая вспышка
export const RISE_FROM = 480; // финальный план
export const SHOULDER_FRAME = 552;
export const SPIT_FRAME = 566;
/** Реплика Грега (voice_greg_01.wav = 3.35 с = 80 кадров) */
export const GREG_LINE = { from: 630, to: 710 };

const bb = focusOn(BILLBOARD.x, BILLBOARD.y - 10, BILLBOARD.depth);
export const gregWalkX = (f: number) => -420 + 3.3 * f;

// ---------- Камера ----------
// Билборд и дата всегда целиком в кадре (до 420): держим общий план, только лёгкий наезд.
export const CAMERA: CamKey[] = [
  { f: 0, x: 60, y: 30, zoom: 1.0, ease: "linear" },
  { f: 100, x: 90, y: 30, zoom: 1.05, ease: "linear" },
  { f: 167, x: 125, y: 30, zoom: 1.12, ease: "linear" },
  { f: FLIGHT_FROM, x: 130, y: 30, zoom: 1.12, ease: "linear" },
  { f: LAND_FRAME, x: 320, y: 25, zoom: 1.18, ease: "linear" },
  { f: 359, x: 330, y: 25, zoom: 1.2, ease: "cut" },
  // 04 билборд целиком, деталь
  { f: 360, x: bb.x, y: bb.y, zoom: 1.6, ease: "linear" },
  { f: 419, x: bb.x, y: bb.y, zoom: 1.75, ease: "cut" },
  // 05 общий: объекты -> вырез -> пустая улица
  { f: 420, x: 300, y: 20, zoom: 1.0, ease: "linear" },
  { f: 479, x: 310, y: 14, zoom: 1.08, ease: "cut" },
  // 06 средний -> крупный, наезд на лицо
  { f: 480, x: 425, y: -140, zoom: 1.55, ease: "linear" },
  { f: 540, x: 428, y: -115, zoom: 1.8, ease: "linear" },
  { f: 620, x: 430, y: -85, zoom: 2.0, ease: "linear" },
  { f: 719, x: 432, y: -50, zoom: 2.7, ease: "linear" },
];

/** Лёгкое дрожание на двойках (рваное, без цветовых изменений) */
export const HANDHELD = [
  { from: 0, to: 168, amp: 2.5, roll: 0.1, seed: 2 },
  { from: 480, to: 720, amp: 0.8, roll: 0.04, seed: 9 },
];

// ---------- Ракеты с байка ----------
const h01 = (n: number, seed = 1) => {
  const s = Math.sin(n * 127.1 + seed * 311.7) * 43758.5453;
  return s - Math.floor(s);
};
export const ROCKET_W = 150;
export const ROCKET_DUR = 14;
export const ROCKETS = [12, 22, 33, 44, 55, 67, 79, 90, 102, 114, 126, 138].map((f, i) => ({
  f,
  tx: -900 + h01(i, 3) * 760,
  ty: -320 + h01(i, 8) * 200,
}));

/** Ударные тряски (кадр, амплитуда, длительность) */
export const IMPACTS = [
  { f: HIT_FRAME, amp: 38, dur: 24 },
  { f: LAND_FRAME, amp: 30, dur: 24 },
  { f: BILLBOARD.flipAt, amp: 6, dur: 8 },
  { f: SHOULDER_FRAME, amp: 11, dur: 10 },
  { f: SPIT_FRAME, amp: 3, dur: 5 },
  ...ROCKETS.map((r) => ({ f: r.f + ROCKET_DUR, amp: 7, dur: 7 })),
];

/** Белые вспышки на весь кадр: кадр -> непрозрачность */
export const FLASH: Record<number, number> = {
  [HIT_FRAME]: 0.95,
  [HIT_FRAME + 1]: 0.35,
  [VANISH_FRAME]: 1,
  [VANISH_FRAME + 1]: 0.5,
};
/** Пульс зума на ударе (кадров от HIT_FRAME) */
export const HIT_PUNCH = { dur: 5, zoom: 0.16 };

// ---------- Движения Грега ----------
export type PosePatch = Partial<Pose>;
export type GregKey = { f: number } & PosePatch;

/** Положение Грега в момент удара (стопы) */
export const HIT_X = gregWalkX(166);
/** Центр тела над асфальтом -> y начала координат персонажа */
export const originY = (centerHeight: number) => GROUND + centerHeight - CENTER_Y;

// Ключи полёта. Между ключами поза СТОИТ. rot: минус = по часовой (головой вперёд).
const F = (f: number, rot: number, torso: number, head: number, armL: number, armR: number, legL: number, legR: number, o: PosePatch = {}): GregKey => ({
  f, rot, torso, head, armL, armR, legL, legR, cupUpright: true, mouth: "closed", ...o,
});
export const FLIGHT_KEYS: GregKey[] = [
  // контакт: бампер в ноги, сложился пополам, голова-блин мотнулась назад
  F(HIT_FRAME, 0, -58, 24, 125, 24, 64, 40, { mouth: "o", headDx: -8, headDy: 6 }),
  F(HIT_FRAME + 2, -4, -62, -18, 135, 28, 68, 44, { mouth: "o", headDx: 6, headDy: -4 }),
  F(HIT_FRAME + 4, -22, -64, 30, 150, 30, 72, 28, { headDy: 8, headDx: -5 }),
  F(176, -45, -22, -38, 60, 40, -20, 78, { headDx: 8 }),
  F(180, -62, 25, 42, 172, 15, 52, -30, { headDy: 5 }),
  F(184, -88, -36, -25, 25, 46, 88, 10, { headDx: -7 }),
  F(190, -118, 10, 38, 142, 20, -38, 62, { headDy: -5 }),
  F(196, -150, -30, -42, 50, 35, 72, -20, { headDx: 9 }),
  F(204, -182, 22, 32, 168, 10, -52, 82),
  F(212, -212, -26, -32, 30, 40, 62, -46, { headDy: 6 }),
  F(220, -240, 16, 40, 152, 20, 22, 92, { headDx: -8 }),
  F(230, -270, -20, -26, 70, 36, 76, -10),
  F(240, -300, 12, 32, 162, 15, -30, 56, { headDy: -6 }),
  F(250, -330, -16, -30, 46, 30, 62, 0, { headDx: 7 }),
  F(260, -360, 8, 26, 150, 20, -10, 46),
  F(270, -385, -10, -16, 100, 26, 30, 10, { headDy: 4 }),
  F(280, -410, 0, 12, 132, 20, 22, 20),
  F(288, -432, 0, 16, 152, 15, 8, -6, { headDx: 4 }),
  F(294, -444, 0, 10, 160, 12, -8, 6),
];
/** Траектория центра тела в полёте */
export const FLIGHT = {
  x0: HIT_X + 12,
  cy0: GROUND + 150,
  cyL: GROUND + 50,
  apex: 135,
  xL: LAND_X,
};

/** Ключ позы на земле/подъёме. h - высота центра тела над асфальтом. */
const G = (f: number, h: number, rot: number, o: PosePatch = {}): GregKey => ({
  f, y: originY(h), rot, x: 0, armL: 0, armR: 12, legL: 0, legR: 0, torso: 0, head: 0, cupUpright: true, mouth: "closed", ...o,
});
const LYE = { armL: 160, armR: 12, legL: -12, legR: 8, head: -12 } as const;
export const GREG_GROUND_KEYS: GregKey[] = [
  // шлёп (-450 = -90): жёсткий отскок, потом лежит
  G(LAND_FRAME, 66, -84, { ...LYE, legL: 40, legR: -30, armL: 170, head: -30, mouth: "o" }),
  G(LAND_FRAME + 2, 50, -90, { ...LYE, head: 14, x: 8 }),
  G(LAND_FRAME + 4, 60, -87, { ...LYE, head: -6, x: 16, legL: 22 }),
  G(LAND_FRAME + 6, 50, -90, { ...LYE, x: 22 }),
  G(LAND_FRAME + 10, 50, -90, { ...LYE, x: 22, armL: 150 }),
  // пауза: лежит, редкие подёргивания
  G(330, 50, -90, { ...LYE, x: 22, legR: 22 }),
  G(332, 50, -90, { ...LYE, x: 22 }),
  G(372, 50, -90, { ...LYE, x: 22, head: -4, tick: true }),
  G(374, 50, -90, { ...LYE, x: 22 }),
  G(428, 50, -90, { ...LYE, x: 22, armL: 148 }),
  G(430, 50, -90, { ...LYE, x: 22 }),
  G(470, 50, -90, { ...LYE, x: 22, armL: 150, head: -6 }),
  // 06: встаёт рывками (каждая поза держится 4-6 кадров, суставы дёргаются)
  G(RISE_FROM, 50, -90, { ...LYE, x: 22 }),
  G(484, 50, -90, { ...LYE, x: 22, armL: 120, head: 8, tick: true }),
  G(488, 52, -90, { ...LYE, x: 20, armL: 80, head: -6, legL: 10 }),
  G(494, 62, -80, { armL: 40, torso: -6, head: 14, legL: -18, legR: 20, x: 18 }),
  G(500, 78, -66, { armL: 100, torso: 6, head: -10, legL: 20, legR: -10, x: 14 }),
  G(506, 96, -50, { armL: 30, torso: -10, head: 12, legL: -25, legR: 30, x: 10 }),
  G(512, 116, -36, { armL: 70, torso: 8, head: -14, legL: 15, legR: -20, x: 6 }),
  G(518, 134, -22, { armL: 20, torso: -12, head: 10, legL: -12, legR: 18, x: 4 }),
  G(524, 148, -10, { armL: 45, torso: -16, head: 14, legL: 8, legR: -6, x: 2 }),
  G(530, 160, 0, { armL: 30, torso: -12, head: 10, x: 0 }),
  G(536, 160, 0, { armL: 34, torso: 6, head: -8, headDx: 6, x: 4 }),
  G(542, 160, 0, { armL: 28, torso: -8, head: 10, headDx: -4, x: -3 }),
  // плечо выбито: перекос, взгляд на плечо
  G(548, 160, 0, { armL: 46, torso: 11, head: -22, x: 0 }),
  G(552, 160, 0, { armL: -40, torso: 20, head: 16, headDx: 8, x: 0 }), // дёрнул
  G(554, 160, 0, { armL: 112, torso: -10, head: -14, headDy: -4, x: 0 }),
  G(556, 160, 0, { armL: 6, torso: 0, head: 0, headDy: -8, tick: true }), // встало на место
  G(560, 160, 0, { armL: 4, torso: 2, head: 4 }),
  G(564, 160, 0, { armL: 4, torso: -4, head: 10, headDy: 2 }),
  G(SPIT_FRAME, 160, 0, { armL: 4, torso: 8, head: -16, headDx: 10, headDy: 4, mouth: "o" }), // плюнул
  G(SPIT_FRAME + 2, 160, 0, { armL: 4, torso: 2, head: -4 }),
  G(572, 160, 0, { armL: 4, torso: 0, head: 8, tick: true }),
  G(574, 160, 0, { armL: 4, torso: 0, head: 6 }),
  // смотрит в небо
  G(580, 160, 0, { armL: 4, torso: -6, head: 14, headDy: 4 }),
  G(586, 160, 0, { armL: 4, torso: -8, head: 20, headDy: 6 }),
  G(598, 160, 0, { armL: 4, torso: -8, head: 22, headDy: 6, headDx: 2 }),
  G(608, 160, 0, { armL: 3, torso: -8, head: 18, headDy: 7, tick: true }),
  G(612, 160, 0, { armL: 3, torso: -8, head: 18, headDy: 7 }),
  G(620, 160, 0, { armL: 4, torso: -7, head: 24, headDy: 6 }),
  G(626, 160, 0, { armL: 4, torso: -5, head: 14, headDy: 3 }),
];
/** Тик глаза в финале вне ключей */
export const GREG_TICK = { from: 626, to: 720, seed: 7, every: 30 };

/** Огибающая голоса voice_greg_01.wav по кадрам (0..1): рот открывается по слогам */
export const VOICE_ENV = [
  0.18, 0.21, 0.22, 0.26, 0.36, 0.3, 0.19, 0.01, 0.02, 0.01, 0.01, 0.36, 0.4, 0.45, 0.26, 0.34, 0.42, 0.89, 0.52, 0.17, 0.57, 0.48, 0.21, 0.14,
  0.11, 0.06, 0.01, 0.07, 0.15, 0.16, 0.12, 0.09, 0.07, 0.06, 0.04, 0.04, 0.03, 0.02, 0.01, 0.0, 0.0, 0.0, 0.01, 0.05, 0.13, 0.15, 0.15, 0.12, 0.09,
  0.12, 0.07, 0.09, 0.17, 0.16, 0.15, 0.23, 0.58, 0.96, 0.77, 0.19, 0.46, 0.16, 0.37, 0.9, 0.75, 0.68, 0.31, 0.35, 0.18, 0.0, 0.18, 0.34, 0.4, 0.51,
  0.22, 0.22, 0.31, 0.58, 1.0, 0.9,
];

/** Зуб: вылет изо рта, дуга, лежит на асфальте */
export const GREG_SPIT = { f: SPIT_FRAME, from: [LAND_X + 14, GROUND + 238] as [number, number], to: [LAND_X + 170, GROUND + 6] as [number, number], life: 14, arc: 95 };

// ---------- Суперкар ----------
export const CAR_W = 840;
export const CAR_Y = GROUND - 6;
export const CAR_Y_ROAD = GROUND - 125;
export const CAR_STOP_X = 1000;
export interface CarSeg {
  from: number;
  to: number;
  keys: ReadonlyArray<readonly [number, number]>;
  y: number;
  flip: boolean;
}
/** Носится туда-сюда по проезжей части, затем на тротуар - в Грега (контакт на HIT_FRAME-1) */
export const CAR_SEGS: CarSeg[] = [
  { from: 6, to: 40, keys: [[6, -1700], [40, 1700]], y: CAR_Y_ROAD, flip: false },
  { from: 62, to: 96, keys: [[62, 1700], [96, -1700]], y: CAR_Y_ROAD, flip: true },
  {
    from: 120,
    to: VANISH_FRAME,
    y: CAR_Y,
    flip: false,
    keys: [
      [120, -2400], [140, -1550], [154, -950], [160, -660],
      [167, HIT_X - 20 - 420], // носок бампера в ноги
      [FLIGHT_FROM - 1, HIT_X - 20 - 420], // хит-стоп
      [180, -190], [200, 60], [230, 480], [260, 820], [292, CAR_STOP_X], [1000, CAR_STOP_X],
    ],
  },
];

// ---------- Байк ----------
export const BIKE_W = 540;
export const BIKE_KEYS: ReadonlyArray<readonly [number, number, number]> = [
  [0, -1150, 318],
  [30, -800, 326],
  [70, -520, 314],
  [110, -740, 330],
  [150, -460, 318],
  [200, -420, 322],
  [260, -400, 318],
  [1000, -400, 318],
];

/** Горящие урны: [кадр появления, x] */
export const TRASHFIRES: ReadonlyArray<readonly [number, number]> = [
  [48, -690],
  [86, -250],
  [118, 700],
];

/** Пришелец в машине: высота спрайта и точка в системе координат машины */
export const ALIEN_H = 170;
export const ALIEN_AT: [number, number] = [20, 80];

// ---------- Аудио ----------
export const AUDIO_CUES: AudioCue[] = [
  { base: "music_s1", from: 0, to: HIT_FRAME, volume: 0.35, note: "тревожный фон (опц.)" },
  { base: "sfx_siren", from: 0, to: VANISH_FRAME, volume: 0.45, loop: true },
  { base: "sfx_engine_roar", from: 6, to: 44, volume: 0.8 },
  { base: "sfx_engine_roar", from: 62, to: 100, volume: 0.8 },
  { base: "sfx_engine_roar", from: 118, to: HIT_FRAME, volume: 0.9 },
  { base: "sfx_rocket_whoosh", from: 12, to: 60, volume: 0.6 },
  { base: "sfx_rocket_whoosh", from: 66, to: 130, volume: 0.6 },
  { base: "sfx_explosion_far", from: 26, to: 80, volume: 0.55 },
  { base: "sfx_explosion_far", from: 80, to: 165, volume: 0.55 },
  { base: "sfx_crunch_hit", from: HIT_FRAME - 1, to: HIT_FRAME + 40, volume: 1 },
  { base: "sfx_bass_drop", from: HIT_FRAME, to: HIT_FRAME + 60, volume: 0.9 },
  { base: "sfx_slowmo_hum", from: FLIGHT_FROM, to: LAND_FRAME + 4, volume: 0.6 },
  { base: "sfx_body_thud", from: LAND_FRAME, to: LAND_FRAME + 30, volume: 1 },
  { base: "sfx_digital_click", from: BILLBOARD.flipAt - 1, to: BILLBOARD.flipAt + 30, volume: 1 },
  { base: "sfx_unplug", from: VANISH_FRAME, to: VANISH_FRAME + 30, volume: 1, note: "выдёргивание вилки" },
  { base: "sfx_glitch", from: VANISH_FRAME - 4, to: VANISH_FRAME + 4, volume: 0.8 },
  // РЕЗКАЯ ТИШИНА до ~492, затем:
  { base: "sfx_crickets", from: 494, to: DURATION, volume: 0.5, loop: true },
  { base: "sfx_water_drip", from: 504, to: DURATION, volume: 0.5, loop: true },
  { base: "sfx_bone_crack", from: SHOULDER_FRAME - 1, to: SHOULDER_FRAME + 28, volume: 1 },
  { base: "sfx_spit", from: SPIT_FRAME - 2, to: SPIT_FRAME + 20, volume: 0.9 },
  { base: "voice_greg_01", from: GREG_LINE.from, to: DURATION, volume: 1, note: "реплика Грега, 3.35 с" },
  { base: "voice_greg_s1", from: GREG_LINE.from, to: DURATION, volume: 1 },
];
