// СЦЕНА 1 «Великое исчезновение» (0:00-0:30) как ДАННЫЕ. 24 fps, 720 кадров.
// Координаты - авторские px (центр кадра 0,0; y вверх; плоскость z=0).
// v2: стабильный свет (без мигалок), камера держит кадр с билбордом, удар/полёт на ключевых позах, вырез+вспышка, финал крупно.
import type { CamKey } from "../engine/camera";
import { focusOn } from "../engine/camera";
import type { AudioCue } from "../engine/audio";
import type { Pose } from "../engine/types";
import { CENTER_Y } from "./rigs";
export const CENTER_Y_PX = CENTER_Y;

export const FPS = 24;
export const WIDTH = 1920;
export const HEIGHT = 1080;
export const DURATION = 720;
export const sec = (s: number) => Math.round(s * FPS);

/** Линия тротуара: сюда ставятся стопы */
export const GROUND = -315;
export const GREG_SCALE = 1.3;

export const SHOTS = [
  { n: 1, from: 0, to: 168, name: "Общий план, хаос, Грег идёт, суперкар въезжает" },
  { n: 2, from: 168, to: 296, name: "Удар крупно, слоу-мо: 4 позы-холда, полёт над капотом" },
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
  assetZero: "prop_billboard_0000",
  depth: 60,
  x: 500,
  y: 320,
  w: 620,
  flipAt: 392,
  glitchFrom: 388,
  time0: "23:59",
  time1: "00:00",
  date: "19 НОЯБРЯ 2026",
};

// ---------- Ключевые кадры ----------
export const HIT_FRAME = 168; // кадр-вспышка удара
export const FLIGHT_FROM = 178; // конец хит-стопа (машина стоит 168..177), старт полёта
export const LAND_FRAME = 296; // шлёп на асфальт
export const LAND_X = 560;
export const VANISH_FRAME = 440; // вырез + белая вспышка
export const RISE_FROM = 480; // финальный план
export const SHOULDER_FRAME = 552;
export const SPIT_FRAME = 566;
/** Реплика Грега (voice_greg_01.wav = 3.35 с = 80 кадров) */
export const GREG_LINE = { from: 630, to: 710 };

export const gregWalkX = (f: number) => -420 + 3.3 * f;
/** Положение Грега в момент удара (стопы) */
export const HIT_X = gregWalkX(166);
const bb = focusOn(BILLBOARD.x, BILLBOARD.y - 10, BILLBOARD.depth);

// ---------- Камера ----------
/** Финальный кадр (06): Грег целиком, справа от центра - так голова встаёт между вывесками, а не на COFFEE; шпиль не за головой */
export const FINAL_CAM_X = LAND_X - 22 - 420;
export const CAMERA: CamKey[] = [
  // 01 общий, лёгкий наезд
  { f: 0, x: 40, y: 40, zoom: 1.0, ease: "linear" },
  { f: 100, x: 80, y: 40, zoom: 1.03, ease: "linear" },
  { f: 166, x: 110, y: 40, zoom: 1.06, ease: "cut" },
  // 02 удар: жёсткий склей на крупный план контакта, наезд на Грега в кадре удара
  { f: HIT_FRAME, x: HIT_X + 90, y: -95, zoom: 2.1, ease: "linear" },
  { f: 177, x: HIT_X + 110, y: -80, zoom: 2.5, ease: "cut" },
  // пролёт над капотом (камера меняет кадр вместе с позой, жёстко)
  { f: 178, x: 292, y: -10, zoom: 1.85, ease: "linear" },
  { f: 201, x: 320, y: -10, zoom: 1.75, ease: "cut" },
  // апекс (вверх тормашками)
  { f: 202, x: 430, y: 20, zoom: 1.6, ease: "linear" },
  { f: 229, x: 440, y: 20, zoom: 1.6, ease: "cut" },
  // падение
  { f: 230, x: 505, y: -30, zoom: 1.6, ease: "linear" },
  { f: 263, x: 515, y: -40, zoom: 1.6, ease: "cut" },
  { f: 264, x: 545, y: -110, zoom: 1.7, ease: "linear" },
  { f: 295, x: LAND_X, y: -125, zoom: 1.75, ease: "linear" },
  // 03 шлёп, лежит: камера стоит, без дрейфа
  { f: LAND_FRAME, x: LAND_X, y: -125, zoom: 1.7, ease: "linear" },
  { f: 359, x: LAND_X, y: -125, zoom: 1.7, ease: "cut" },
  // 04 билборд целиком (рамка в кадре)
  { f: 360, x: bb.x, y: bb.y, zoom: 1.6, ease: "linear" },
  { f: 419, x: bb.x, y: bb.y, zoom: 1.7, ease: "cut" },
  // 05 общий: статичный до выреза и после него (смена композиции - только склейкой)
  { f: 420, x: 440, y: -10, zoom: 1.05, ease: "cut" },
  { f: 479, x: 440, y: -10, zoom: 1.05, ease: "cut" },
  // 06 Грег целиком: ноги не обрезаются, голова вне вывески COFFEE
  { f: 480, x: FINAL_CAM_X, y: -30, zoom: 1.45, ease: "linear" },
  { f: 530, x: FINAL_CAM_X, y: 0, zoom: 1.45, ease: "linear" },
  { f: 600, x: FINAL_CAM_X, y: -4, zoom: 1.45, ease: "linear" },
  { f: 719, x: FINAL_CAM_X, y: -18, zoom: 1.55, ease: "linear" },
];

/** Лёгкое дрожание на двойках (рваное, без цветовых изменений) */
export const HANDHELD = [
  { from: 0, to: 166, amp: 2.5, roll: 0.1, seed: 2 },
  { from: 480, to: 720, amp: 0.8, roll: 0.04, seed: 9 },
];

// ---------- Ракеты с байка: редко, одна за такт (18 кадров), без перекрытия ----------
export const ROCKET_W = 150;
export const ROCKET_DUR = 12;
export const ROCKET_BEAT = 18;
/** Цели - на тротуаре/асфальте ниже вывесок; ракета летит круто вниз, её хвост короткий */
export const ROCKETS = [14, 32, 50, 68, 86, 104, 122, 140].map((f, i) => ({
  f,
  dx: [-40, 90, -60, 40, -20, 130, 60, 150][i],
  ty: -255 + [0, 25, 10, 30, 0, 20, 10, 25][i],
}));

/** Ударные тряски (кадр, амплитуда, длительность) */
export const IMPACTS = [
  { f: HIT_FRAME, amp: 38, dur: 24 },
  { f: LAND_FRAME, amp: 30, dur: 24 },
  { f: BILLBOARD.flipAt, amp: 6, dur: 8 },
  { f: SHOULDER_FRAME, amp: 16, dur: 10 },
  { f: SPIT_FRAME, amp: 3, dur: 5 },
  ...ROCKETS.map((r) => ({ f: r.f + ROCKET_DUR, amp: 7, dur: 6 })),
];

/** Белые вспышки на весь кадр: только удар и исчезновение, не дольше 2 кадров */
export const FLASH: Record<number, number> = {
  [HIT_FRAME]: 0.9,
  [HIT_FRAME + 1]: 0.4,
  [VANISH_FRAME]: 1,
  [VANISH_FRAME + 1]: 0.4,
};
/** Пульс зума на ударе (кадров от HIT_FRAME) */
export const HIT_PUNCH = { dur: 5, zoom: 0.16 };
/** Пульс зума на вправлении плеча */
export const SHOULDER_PUNCH = { dur: 6, zoom: 0.3 };

// ---------- Движения Грега ----------
export type PosePatch = Partial<Pose>;
export type GregKey = { f: number } & PosePatch;

/** Центр тела над асфальтом (px мира) -> y начала координат персонажа (с учётом масштаба) */
export const originY = (centerHeight: number) => GROUND + (centerHeight - CENTER_Y) * GREG_SCALE;

/**
 * Полёт: 4 чётких позы-холда (контакт, над капотом, апекс вверх тормашками, падение) + подход к земле.
 * Поза и положение ДЕРЖАТСЯ без интерполяции; внутри позы каждые 4 кадра - "alt" (жёсткая перестановка конечностей, +-4 px).
 * x, cy - центр тела в мире (px), rot - минус = по часовой.
 */
export interface FlightKey extends PosePatch {
  f: number;
  x: number;
  cy: number;
  alt?: PosePatch & { cy?: number };
}
const FK = (f: number, x: number, cy: number, rot: number, torso: number, head: number, armL: number, armR: number, legL: number, legR: number, o: PosePatch = {}, alt: PosePatch & { cy?: number } = {}): FlightKey => ({
  f, x, cy: GROUND + cy, rot, torso, head, armL, armR, legL, legR, cupUpright: true, mouth: "closed", ...o, alt,
});
export const FLIGHT_KEYS: FlightKey[] = [
  // 1. контакт (168-177): бампер в ноги, сложился пополам, голова мотнулась; машина стоит
  FK(HIT_FRAME, HIT_X + 6, 215, -6, -58, 24, 125, 24, 64, 40, { mouth: "o", headDx: -8, headDy: 6 }, { torso: -64, head: -18, armL: 138, legL: 70, headDx: 6, headDy: -4, rot: -2 }),
  // 2. над капотом (178-201): летит головой вперёд, горизонтально
  FK(178, 292, 300, -78, 25, 42, 172, 15, 52, -30, { mouth: "o", headDy: 5 }, { torso: -36, head: -25, armL: 25, legL: 88, legR: 10, headDx: -7, x: 6, cy: 6 }),
  // 3. апекс (202-229): вверх тормашками, руки и ноги растопырены
  FK(202, 425, 385, -188, 22, 32, 168, 10, -52, 82, {}, { torso: -26, head: -32, armL: 30, armR: 40, legL: 62, legR: -46, headDy: 6, x: -6, cy: -8 }),
  // 4. падение (230-263): головой вниз-влево
  FK(230, 500, 335, -292, 16, 40, 152, 20, 22, 92, { headDx: -8 }, { torso: -20, head: -26, armL: 70, legL: 76, legR: -10, headDx: 7, x: 6, cy: 6 }),
  // подход к земле (264-295): наклон вперёд, готов шлёпнуться
  FK(264, 548, 235, -398, 8, 26, 150, 20, -10, 46, {}, { torso: -10, head: -16, armL: 100, legL: 30, legR: 10, headDy: 4, x: -4, cy: 5 }),
];

/** Ключ позы на земле/подъёме. h - высота центра тела над асфальтом. */
const G = (f: number, h: number, rot: number, o: PosePatch = {}): GregKey => ({
  f, y: originY(h), rot, x: 0, armL: 0, armR: 12, legL: 0, legR: 0, torso: 0, head: 0, cupUpright: true, mouth: "closed", ...o,
});
const LYE = { armL: 160, armR: 12, legL: -12, legR: 8, head: -12, x: -50 } as const;
export const GREG_GROUND_KEYS: GregKey[] = [
  // шлёп (-450 = -90): жёсткий отскок, потом лежит
  G(LAND_FRAME, 66, -84, { ...LYE, legL: 40, legR: -30, armL: 170, head: -30, mouth: "o" }),
  G(LAND_FRAME + 2, 50, -90, { ...LYE, head: 14 }),
  G(LAND_FRAME + 4, 60, -87, { ...LYE, head: -6, legL: 22 }),
  G(LAND_FRAME + 6, 50, -90, { ...LYE }),
  G(LAND_FRAME + 10, 50, -90, { ...LYE, armL: 150 }),
  // пауза: лежит, мелкая дрожь (в gregPose) + одно заметное шевеление: нога и рука (328-335), голова (450-457)
  G(328, 50, -90, { ...LYE, legR: 30, armL: 128, head: 6 }),
  G(332, 50, -90, { ...LYE, legR: 26, armL: 140, head: -2 }),
  G(336, 50, -90, { ...LYE }),
  G(372, 50, -90, { ...LYE, head: -4, tick: true }),
  G(374, 50, -90, { ...LYE }),
  G(448, 50, -90, { ...LYE, head: 6, armL: 138, legL: 4 }),
  G(452, 50, -90, { ...LYE, head: 14, armL: 128, legL: 10, mouth: "o" }),
  G(458, 50, -90, { ...LYE }),
  G(470, 50, -90, { ...LYE, armL: 150, head: -6 }),
  // 06: встаёт рывками (каждая поза держится 4-6 кадров, суставы дёргаются)
  G(RISE_FROM, 50, -90, { ...LYE }),
  G(484, 50, -90, { ...LYE, armL: 120, head: 8, tick: true }),
  G(488, 52, -90, { ...LYE, x: -48, armL: 80, head: -6, legL: 10 }),
  G(494, 62, -80, { armL: 40, torso: -6, head: 14, legL: -18, legR: 20, x: -46 }),
  G(500, 78, -66, { armL: 100, torso: 6, head: -10, legL: 20, legR: -10, x: -44 }),
  G(506, 96, -50, { armL: 30, torso: -10, head: 12, legL: -25, legR: 30, x: -41 }),
  G(512, 116, -36, { armL: 70, torso: 8, head: -14, legL: 15, legR: -20, x: -38 }),
  G(518, 134, -22, { armL: 20, torso: -12, head: 10, legL: -12, legR: 18, x: -34 }),
  G(524, 148, -10, { armL: 45, torso: -16, head: 14, legL: 8, legR: -6, x: -30 }),
  G(530, 160, 0, { armL: 30, torso: -12, head: 10, x: -26 }),
  G(536, 160, 0, { armL: 34, torso: 6, head: -8, headDx: 6, x: -22 }),
  G(542, 160, 0, { armL: 28, torso: -8, head: 10, headDx: -4, x: -22 }),
  // плечо выбито: голова поворачивается на плечо, корпус перекошен (544-551), РЫВОК (552) и вправление (554-556), крупно
  G(544, 160, 0, { armL: 52, torso: 12, head: -30, headDx: 4, x: -22 }),
  G(548, 160, 0, { armL: 58, torso: 16, head: -34, headDx: 6, x: -22 }),
  G(552, 160, 0, { armL: -78, torso: 30, head: 26, headDx: 14, headDy: -4, x: -22, mouth: "o" }), // дёрнул
  G(554, 160, 0, { armL: 135, torso: -20, head: -18, headDy: -6, x: -22, mouth: "o" }), // выкинуло вверх
  G(556, 160, 0, { armL: 6, torso: 0, head: 0, headDy: -10, tick: true, x: -22 }), // встало на место
  G(560, 160, 0, { armL: 4, torso: 3, head: 4, x: -22 }),
  G(564, 160, 0, { armL: 4, torso: -4, head: 10, headDy: 2, x: -22 }),
  G(SPIT_FRAME, 160, 0, { armL: 4, torso: 10, head: -18, headDx: 12, headDy: 4, mouth: "o", x: -22 }), // плюнул
  G(SPIT_FRAME + 2, 160, 0, { armL: 4, torso: 2, head: -4, x: -22 }),
  G(572, 160, 0, { armL: 4, torso: 0, head: 8, tick: true, x: -22 }),
  G(574, 160, 0, { armL: 4, torso: 0, head: 6, x: -22 }),
  // смотрит в небо: жёсткий наклон головы и корпуса назад (ступенями), держит до конца
  G(580, 160, 0, { armL: 4, torso: 8, head: 22, headDy: 4, x: -10 }),
  G(586, 160, 0, { armL: 6, torso: 17, head: 42, headDx: -4, headDy: 7, x: 12 }),
  G(598, 160, 0, { armL: 8, torso: 20, head: 50, headDx: -5, headDy: 9, x: 32 }),
];
/** Тик глаза в финале вне ключей */
export const GREG_TICK = { from: 626, to: 720, seed: 7, every: 30 };
/** Покачивание тела пока шепчет (на каждые 6 кадров): [torso, head, armL, headDx] */
export const WHISPER_SWAY: ReadonlyArray<readonly [number, number, number, number]> = [
  [0, 0, 0, 0], [-4, -6, 5, 3], [3, 5, -4, -3], [-2, 8, 6, 2], [4, -4, -5, -2], [-5, 6, 4, 4],
];

/** Огибающая голоса voice_greg_01.wav по кадрам (0..1): рот открывается по слогам */
export const VOICE_ENV = [
  0.18, 0.21, 0.22, 0.26, 0.36, 0.3, 0.19, 0.01, 0.02, 0.01, 0.01, 0.36, 0.4, 0.45, 0.26, 0.34, 0.42, 0.89, 0.52, 0.17, 0.57, 0.48, 0.21, 0.14,
  0.11, 0.06, 0.01, 0.07, 0.15, 0.16, 0.12, 0.09, 0.07, 0.06, 0.04, 0.04, 0.03, 0.02, 0.01, 0.0, 0.0, 0.0, 0.01, 0.05, 0.13, 0.15, 0.15, 0.12, 0.09,
  0.12, 0.07, 0.09, 0.17, 0.16, 0.15, 0.23, 0.58, 0.96, 0.77, 0.19, 0.46, 0.16, 0.37, 0.9, 0.75, 0.68, 0.31, 0.35, 0.18, 0.0, 0.18, 0.34, 0.4, 0.51,
  0.22, 0.22, 0.31, 0.58, 1.0, 0.9,
];

/** Зуб: вылет изо рта, дуга, лежит на асфальте (крупный: TOOTH_W) */
export const TOOTH_W = 88;
export const GREG_SPIT = { f: SPIT_FRAME, from: [(LAND_X - 22) + 36, GROUND + 330] as [number, number], to: [(LAND_X - 22) + 125, GROUND + 28] as [number, number], life: 14, arc: 110 };

// ---------- Суперкар ----------
export const CAR_W = 840;
export const CAR_Y = GROUND - 6;
export const CAR_Y_ROAD = GROUND - 125;
export const CAR_STOP_X = LAND_X + 720;
export interface CarSeg {
  from: number;
  to: number;
  keys: ReadonlyArray<readonly [number, number]>;
  y: number;
  flip: boolean;
}
/** Носится туда-сюда по проезжей части, затем на тротуар - в Грега (контакт на HIT_FRAME-1, стоит до FLIGHT_FROM-1) */
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
      [FLIGHT_FROM - 1, HIT_X - 20 - 420], // хит-стоп: машина стоит
      [186, HIT_X + 60], [204, 160], [226, 520], [250, 860], [272, CAR_STOP_X - 150], [292, CAR_STOP_X], [1000, CAR_STOP_X],
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
  [260, -330, 318],
  [330, -220, 322],
  [1000, -220, 322],
];

/** Горящие урны на тротуаре: [кадр появления, x] - всего две, все гаснут в кадр VANISH_FRAME */
export const TRASHFIRES: ReadonlyArray<readonly [number, number]> = [
  [48, -690],
  [118, -200],
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
