// СЦЕНА 1 «Великое исчезновение» (0:00-0:30) как ДАННЫЕ. 24 fps, 720 кадров.
// Координаты - авторские px (центр кадра 0,0; y вверх; плоскость z=0).
// v4: статичная широкая камера (один склей на удар), плоские FX, 7 жёстких поз полёта, свободная стена для Грега в финале.
import type { CamKey } from "../engine/camera";
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
  { n: 1, from: 0, to: 168, name: "Общий план (статичный, лёгкий наезд): хаос, Грег идёт, суперкар въезжает" },
  { n: 2, from: 168, to: 178, name: "Удар: один жёсткий склей на крупный (без смены зума), звезда-импакт 3 кадра" },
  { n: 2.5, from: 178, to: 296, name: "Тот же широкий масштаб: 7 жёстких поз полёта/падения" },
  { n: 3, from: 296, to: 456, name: "Шлёп, лежит; билборд 23:59 -> 00:00 (всё в одном широком кадре)" },
  { n: 5, from: 456, to: 480, name: "Жёсткий стык: всё исчезло, холодная пустая улица, тишина" },
  { n: 6, from: 480, to: 720, name: "Грег встаёт, плечо, рывок головой, зуб дугой, небо, реплика; еле заметный наезд" },
] as const;

// ---------- Фоновые слои (параллакс по depth) ----------
export interface LayerDef {
  id: string;
  asset: string;
  parallax: number;
  /** сдвиг слоя по y (px) */
  dy?: number;
  k: number;
  order: number;
  tiles: boolean;
}
export const LAYERS: LayerDef[] = [
  { id: "sky", asset: "bg_sky", parallax: 0.05, k: 1.3, order: -1000, tiles: true },
  { id: "far", asset: "bg_far", parallax: 0.15, k: 1.0, order: -900, tiles: true },
  { id: "mid", asset: "bg_mid", parallax: 0.4, dy: -70, k: 1.0, order: -800, tiles: true },
  { id: "ground", asset: "bg_fore", parallax: 1, k: 1.0, order: -700, tiles: true },
];
export const GROUND_FILL = "#363641";
/** Камера статична: центр кадра по x. bg_mid нарисован под это значение (мир = px - 1122) */
export const CX = 130;
/** Билборд целиком в кадре: x 120..840, низ ножек y~20 (над Грегом, который лежит/стоит левее) */
export const BILLBOARD = {
  asset: "billboard",
  assetZero: "prop_billboard_0000",
  depth: 60,
  x: 480,
  y: 292,
  w: 640,
  flipAt: 424,
  glitchFrom: 416,
  time0: "23:59",
  time1: "00:00",
  date: "19 НОЯБРЯ 2026",
};

// ---------- Ключевые кадры ----------
export const HIT_FRAME = 168; // кадр-импакт (склей на крупный)
export const FLIGHT_FROM = 178; // конец хит-стопа, возврат на широкий
export const LAND_FRAME = 296; // шлёп на асфальт
export const LAND_X = -80;
export const VANISH_FRAME = 456; // жёсткий стык: всё исчезло
export const RISE_FROM = 480; // финал
export const SHOULDER_FRAME = 552;
export const HEADJERK_FRAME = 558;
export const SPIT_FRAME = 566;
/** Реплика Грега (voice_greg_01.wav = 3.35 с = 80 кадров) */
export const GREG_LINE = { from: 630, to: 710 };

export const gregWalkX = (f: number) => -600 + (320 / 166) * f;
/** Положение Грега в момент удара (стопы) */
export const HIT_X = gregWalkX(166);

// ---------- Камера: статичная, широкая ----------
export const CAMERA: CamKey[] = [
  // 01-03: широкий, еле заметный наезд 1.0 -> 1.025
  { f: 0, x: CX, y: 0, zoom: 1.0, ease: "linear" },
  { f: 166, x: CX, y: 0, zoom: 1.025, ease: "cut" },
  // удар: единственный склей на крупный, фиксированный масштаб без зума внутри
  { f: HIT_FRAME, x: HIT_X - 40, y: -105, zoom: 1.7, ease: "cut" },
  // обратно на тот же широкий масштаб; держится до самого конца паузы (192-480 - ОДИН масштаб)
  { f: FLIGHT_FROM, x: CX, y: 0, zoom: 1.025, ease: "cut" },
  { f: 479, x: CX, y: 0, zoom: 1.025, ease: "linear" },
  // финал: Грег целиком, едва заметный наезд
  { f: 480, x: CX, y: -10, zoom: 1.025, ease: "linear" },
  { f: 719, x: CX, y: -20, zoom: 1.09, ease: "linear" },
];

/** Тряска камеры: только крошечные толчки (px) на ударе и шлёпе, без смены масштаба */
export const IMPACTS = [
  { f: HIT_FRAME, amp: 10, dur: 8 },
  { f: LAND_FRAME, amp: 10, dur: 8 },
  { f: SHOULDER_FRAME, amp: 5, dur: 6 },
];

/** Холодная заливка кадра после стыка (плоский прямоугольник, не градиент) */
export const COLD = { from: VANISH_FRAME, color: "#2c4d8f", opacity: 0.3 };

// ---------- Ракеты с байка ----------
export const ROCKET_W = 250;
export const ROCKET_DUR = 14; // кадров полёта
export const ROCKET_BEAT = 18;
export const ROCKETS = [10, 28, 46, 64, 82, 100, 118, 136].map((f, i) => ({
  f,
  tx: [-40, 160, 40, 300, 120, 420, 220, 520][i],
  ty: -245 + [0, 40, 15, 45, 5, 30, 20, 35][i],
}));

// ---------- Движения Грега ----------
export type PosePatch = Partial<Pose>;
export type GregKey = { f: number } & PosePatch;

/** Центр тела над асфальтом (px мира) -> y начала координат персонажа (с учётом масштаба) */
export const originY = (centerHeight: number) => GROUND + (centerHeight - CENTER_Y) * GREG_SCALE;

/**
 * Полёт: 7 жёстких поз (контакт, сложился, подлёт, вершина, падение A, падение B, перед шлёпом).
 * Каждая поза ДЕРЖИТСЯ; внутри позы каждые 4 кадра "alt" - жёсткая перестановка конечностей.
 * Положение центра тела - по параболе, но обновляется только раз в 4 кадра.
 * rot - минус = по часовой.
 */
export interface FlightKey extends PosePatch {
  f: number;
  alt?: PosePatch;
}
const FK = (f: number, rot: number, torso: number, head: number, armL: number, armR: number, legL: number, legR: number, o: PosePatch = {}, alt: PosePatch = {}): FlightKey => ({
  f, rot, torso, head, armL, armR, legL, legR, cupUpright: true, mouth: "closed", ...o, alt,
});
export const FLIGHT_KEYS: FlightKey[] = [
  // 1. контакт (168-177): бампер в ноги, сложился пополам, голова мотнулась
  FK(HIT_FRAME, -6, -58, 24, 125, 24, 64, 40, { mouth: "o", headDx: -8, headDy: 6 }, { torso: -64, head: -18, armL: 138, legL: 70, headDx: 6, headDy: -4, rot: -2 }),
  // 2. сложился (178-189): лёгкий кувырок, всё поджато
  FK(178, -38, -52, 34, 140, 20, 66, 36, { headDy: 4 }, { torso: -40, head: -22, armL: 120, legL: 80, headDx: -6 }),
  // 3. подлёт вверх (190-205): летит головой вперёд почти горизонтально
  FK(190, -100, 22, 40, 172, 12, 50, -30, { headDy: 5 }, { torso: -30, head: -26, armL: 30, legL: 88, legR: 10, headDx: -7 }),
  // 4. вершина (206-221): вверх тормашками, руки и ноги растопырены
  FK(206, -190, 22, 32, 168, 10, -52, 82, {}, { torso: -26, head: -32, armL: 30, armR: 40, legL: 62, legR: -46, headDy: 6 }),
  // 5. падение A (222-245)
  FK(222, -255, 16, 40, 152, 20, 22, 92, { headDx: -8 }, { torso: -20, head: -26, armL: 70, legL: 76, legR: -10, headDx: 7 }),
  // 6. падение B (246-275)
  FK(246, -330, 10, 30, 120, 20, 30, 60, {}, { torso: -12, head: -18, armL: 90, legL: 8, legR: 50, headDy: 4 }),
  // 7. перед шлёпом (276-295): головой вперёд, руки выброшены
  FK(276, -430, 6, 24, 150, 20, -10, 46, {}, { torso: -10, head: -16, armL: 100, legL: 30, legR: 10, headDy: 4 }),
];
/** Центр тела в полёте: x - линейно, высота - парабола; обновляется раз в 4 кадра */
const FL0 = FLIGHT_FROM;
const FL_APEX = 214;
const FL_APEX_H = 372;
const FL_START_H = 215;
export const FLIGHT_X0 = HIT_X + 30;
export const FLIGHT_X1 = LAND_X - 50;
export const flightPos = (frame: number): { x: number; cy: number } => {
  if (frame < FL0) return { x: HIT_X + 6, cy: GROUND + FL_START_H };
  const f = Math.min(LAND_FRAME - 1, FL0 + Math.floor((frame - FL0) / 4) * 4);
  const x = FLIGHT_X0 + ((FLIGHT_X1 - FLIGHT_X0) * (f - FL0)) / (LAND_FRAME - 1 - FL0);
  let h: number;
  if (f <= FL_APEX) h = FL_APEX_H - (FL_APEX_H - FL_START_H) * Math.pow((FL_APEX - f) / (FL_APEX - FL0), 2);
  else h = FL_APEX_H - ((FL_APEX_H - 108) / Math.pow(LAND_FRAME - 1 - FL_APEX, 2)) * Math.pow(f - FL_APEX, 2);
  return { x, cy: GROUND + h };
};

/** Ключ позы на земле/подъёме. h - высота центра тела над асфальтом. */
const G = (f: number, h: number, rot: number, o: PosePatch = {}): GregKey => ({
  f, y: originY(h), rot, x: 0, armL: 0, armR: 12, legL: 0, legR: 0, torso: 0, head: 0, cupUpright: true, mouth: "closed", ...o,
});
const LYE = { armL: 160, armR: 12, legL: -12, legR: 8, head: -12, x: -50 } as const;
export const GREG_GROUND_KEYS: GregKey[] = [
  // шлёп (-90): жёсткий отскок, потом лежит
  G(LAND_FRAME, 66, -84, { ...LYE, legL: 40, legR: -30, armL: 170, head: -30, mouth: "o" }),
  G(LAND_FRAME + 2, 50, -90, { ...LYE, head: 14 }),
  G(LAND_FRAME + 4, 60, -87, { ...LYE, head: -6, legL: 22 }),
  G(LAND_FRAME + 6, 50, -90, { ...LYE }),
  G(LAND_FRAME + 10, 50, -90, { ...LYE, armL: 150 }),
  // лежачая пауза: событие минимум раз в 1.5 с (поза/шевеление), между ними дрожь на двойках (в gregPose)
  G(318, 50, -90, { ...LYE, head: 6, armL: 144 }),
  G(328, 50, -90, { ...LYE, legR: 30, armL: 128, head: 6 }),
  G(332, 50, -90, { ...LYE, legR: 26, armL: 140, head: -2 }),
  G(338, 50, -90, { ...LYE }),
  G(350, 50, -90, { ...LYE, head: -8, mouth: "o" }),
  G(354, 50, -90, { ...LYE, head: -2 }),
  G(366, 50, -90, { ...LYE, head: -4, tick: true, armL: 136 }),
  G(369, 50, -90, { ...LYE }),
  G(384, 50, -90, { ...LYE, legL: 14, legR: 14 }),
  G(390, 50, -90, { ...LYE }),
  G(402, 50, -90, { ...LYE, head: 10, armL: 140 }),
  G(408, 50, -90, { ...LYE, head: 4, legR: 22 }),
  G(418, 50, -90, { ...LYE, head: -6 }),
  // билборд щёлкнул: Грег дёргается на звук
  G(BILLBOARD.flipAt, 52, -90, { ...LYE, head: 16, armL: 120, tick: true, mouth: "o" }),
  G(BILLBOARD.flipAt + 4, 50, -90, { ...LYE, head: 8 }),
  G(438, 50, -90, { ...LYE, armL: 132, legL: 6 }),
  G(446, 50, -90, { ...LYE }),
  // пустая улица: лежит, едва шевелится
  G(462, 50, -90, { ...LYE, head: 6, armL: 138, legL: 4 }),
  G(466, 50, -90, { ...LYE, head: 14, armL: 128, legL: 10, mouth: "o" }),
  G(472, 50, -90, { ...LYE }),
  G(476, 50, -90, { ...LYE, armL: 150, head: -6 }),
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
  // плечо выбито: голова на плечо, корпус перекошен (544-551), РЫВОК (552) и вправление (554-556), клац
  G(544, 160, 0, { armL: 52, torso: 12, head: -30, headDx: 4, x: -22 }),
  G(548, 160, 0, { armL: 58, torso: 16, head: -34, headDx: 6, x: -22 }),
  G(552, 160, 0, { armL: -78, torso: 30, head: 26, headDx: 14, headDy: -4, x: -22, mouth: "o" }),
  G(554, 160, 0, { armL: 135, torso: -20, head: -18, headDy: -6, x: -22, mouth: "o" }),
  G(556, 160, 0, { armL: 6, torso: 0, head: 0, headDy: -10, tick: true, x: -22 }),
  // рывок головой: в сторону, обратно, хруст шеи
  G(HEADJERK_FRAME, 160, 0, { armL: 6, torso: -4, head: -36, headDx: 14, headDy: -2, x: -22, mouth: "o" }),
  G(560, 160, 0, { armL: 5, torso: 4, head: 24, headDx: -9, headDy: 2, x: -22 }),
  G(562, 160, 0, { armL: 4, torso: 0, head: -6, headDx: 2, tick: true, x: -22 }),
  // наклон вперёд, набирает слюну, ПЛЮЁТ (566)
  G(564, 160, 0, { armL: 4, torso: 14, head: 28, headDy: 6, headDx: 6, x: -20 }),
  G(SPIT_FRAME, 160, 0, { armL: 4, torso: 10, head: -20, headDx: 14, headDy: 6, mouth: "o", x: -22 }),
  G(SPIT_FRAME + 3, 160, 0, { armL: 4, torso: 3, head: -6, x: -22 }),
  G(572, 160, 0, { armL: 4, torso: 0, head: 8, tick: true, x: -22 }),
  G(576, 160, 0, { armL: 4, torso: 0, head: 4, x: -22 }),
  // смотрит в небо: голова и корпус откидываются ступенями, держит до конца
  G(580, 160, 0, { armL: 4, torso: 8, head: 22, headDy: 4, x: -14 }),
  G(584, 160, 0, { armL: 5, torso: 12, head: 34, headDx: -2, headDy: 5, x: -6 }),
  G(588, 160, 0, { armL: 6, torso: 16, head: 44, headDx: -4, headDy: 7, x: 4 }),
  G(594, 160, 0, { armL: 7, torso: 18, head: 48, headDx: -5, headDy: 8, x: 14 }),
  G(600, 160, 0, { armL: 8, torso: 20, head: 50, headDx: -5, headDy: 9, x: 22 }),
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

/** Зуб: вылетает изо рта (маленький), по дуге, растёт, падает на асфальт */
export const TOOTH_W = 88;
const MOUTH_X = LAND_X - 22 + 26;
export const GREG_SPIT = { f: SPIT_FRAME, from: [MOUTH_X, GROUND + 318] as [number, number], to: [MOUTH_X + 190, GROUND + 28] as [number, number], life: 26, arc: 190 };

// ---------- Суперкар ----------
export const CAR_W = 850;
const CK = CAR_W / 840;
export const CAR_Y = GROUND - 6;
export const CAR_Y_ROAD = GROUND - 125;
export const CAR_STOP_X = 630;
export const CAR_NOSE = 422 * CK;
export interface CarSeg {
  from: number;
  to: number;
  keys: ReadonlyArray<readonly [number, number]>;
  y: number;
  flip: boolean;
}
/** Первый пролёт по проезжей части ~0:02.5, обратный, затем на тротуар - в Грега (контакт на HIT_FRAME-1, стоит до FLIGHT_FROM-1) */
export const CAR_SEGS: CarSeg[] = [
  { from: 58, to: 92, keys: [[58, -1900], [92, 1900]], y: CAR_Y_ROAD, flip: false },
  { from: 98, to: 130, keys: [[98, 1900], [130, -1900]], y: CAR_Y_ROAD, flip: true },
  {
    from: 134,
    to: VANISH_FRAME,
    y: CAR_Y,
    flip: false,
    keys: [
      [134, -2300], [150, -1500], [160, -1000],
      [167, HIT_X - 20 - CAR_NOSE], // носок бампера в ноги
      [FLIGHT_FROM - 1, HIT_X - 20 - CAR_NOSE], // хит-стоп: машина стоит
      [186, HIT_X + 20], [206, HIT_X + 240], [230, 200], [254, 420], [276, CAR_STOP_X - 60], [296, CAR_STOP_X], [1000, CAR_STOP_X],
    ],
  },
];

// ---------- Байк ----------
export const BIKE_W = 680;
export const BIKE_KEYS: ReadonlyArray<readonly [number, number, number]> = [
  [0, -460, 312],
  [30, -330, 318],
  [60, -440, 306],
  [96, -310, 316],
  [132, -430, 310],
  [170, -340, 318],
  [230, -450, 312],
  [330, -400, 316],
  [1000, -400, 316],
];

/** Горящие урны на втором плане (за Грегом): [кадр появления, x] */
export const TRASHFIRES: ReadonlyArray<readonly [number, number]> = [
  [30, -730],
  [96, 150],
];

/** Летящий по ветру мусор (второй план): y, скорость px/кадр, фаза, ширина, спрайт, спереди ли */
export const TRASH: ReadonlyArray<{ y: number; v: number; ph: number; w: number; a: string; front: boolean }> = [
  { y: -210, v: 22, ph: 100, w: 80, a: "fx_paper1", front: false },
  { y: -150, v: 17, ph: 900, w: 64, a: "fx_paper2", front: false },
  { y: -60, v: 26, ph: 1700, w: 74, a: "fx_paper1", front: false },
  { y: 40, v: 15, ph: 400, w: 60, a: "fx_paper2", front: false },
  { y: -285, v: 28, ph: 1300, w: 90, a: "fx_paper1", front: true },
  { y: -240, v: 20, ph: 2300, w: 70, a: "fx_paper2", front: true },
  { y: -110, v: 24, ph: 2000, w: 84, a: "fx_paper1", front: false },
];

/** Пришелец в машине: высота спрайта и точка в системе координат машины */
export const ALIEN_H = 190 * CK;
export const ALIEN_AT: [number, number] = [20 * CK, 80 * CK];

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
