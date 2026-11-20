// СЦЕНА 1 «Великое исчезновение» (0:00-0:30) как ДАННЫЕ. 24 fps, 720 кадров.
// Раскладка кадров 01-06 из сценария. Координаты - авторские px (центр кадра 0,0; y вверх; плоскость z=0).
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
// масштаб запечён в скелеты (data/rigs.ts), здесь 1
export const GREG_SCALE = 1;
export const ALIEN_SCALE = 1;

export const SHOTS = [
  { n: 1, from: 0, to: 144, name: "Общий план, хаос, handheld" },
  { n: 2, from: 144, to: 264, name: "Трекинг сбоку -> удар -> слоу-мо" },
  { n: 3, from: 264, to: 360, name: "Крупно, нижний ракурс, шлепок" },
  { n: 4, from: 360, to: 456, name: "Билборд 23:59 -> 00:00, 19 НОЯБРЯ 2026" },
  { n: 5, from: 456, to: 576, name: "Зум-аут, распад на пиксели, тишина" },
  { n: 6, from: 576, to: 720, name: "Грег встаёт, наезд, реплика" },
] as const;

// ---------- Фоновые слои (параллакс по depth) ----------
export interface LayerDef {
  id: string;
  asset: string;
  /** Коэфф. сдвига относительно камеры (1 = плоскость персонажей, меньше = дальше). depth = CAM_Z*(1/p-1) */
  parallax: number;
  /** Масштаб картинки (запас по высоте для неба) */
  k: number;
  order: number;
  /** Зеркальные копии слева/справа (бесшовно) - камера не упирается в край */
  tiles: boolean;
}
// Размеры/порядок как в manifest.json: слои 1080 высотой, центр слоя = центр кадра.
export const LAYERS: LayerDef[] = [
  { id: "sky", asset: "bg_sky", parallax: 0.05, k: 1.3, order: -1000, tiles: true },
  { id: "far", asset: "bg_far", parallax: 0.15, k: 1.0, order: -900, tiles: true },
  { id: "mid", asset: "bg_mid", parallax: 0.4, k: 1.0, order: -800, tiles: true },
  { id: "ground", asset: "bg_fore", parallax: 1, k: 1.0, order: -700, tiles: true },
];
/** Цвет асфальта под низом слоя ground (ниже y=-540, при отъезде камеры) */
export const GROUND_FILL = "#363641";
/** Билборд - отдельный объект на глубине 60 (чтобы можно было наехать камерой), центр в авторских px */
export const BILLBOARD = {
  asset: "billboard",
  depth: 60,
  x: 470,
  y: 215,
  w: 760,
  /** кадр, где 23:59 -> 00:00 (щелчок) */
  flipAt: 402,
  glitchFrom: 398,
  time0: "23:59",
  time1: "00:00",
  date: "19 НОЯБРЯ 2026",
};

// ---------- Камера ----------
const bb = focusOn(BILLBOARD.x, BILLBOARD.y - 20, BILLBOARD.depth);
const gregWalkX = (f: number) => -250 + 2.4 * f; // x Грега при ходьбе (см. GREG)
export const HIT_FRAME = 170; // бампер встречает Грега
export const LAND_FRAME = 300; // шлепок на асфальт
export const LAND_X = 520;

export const CAMERA: CamKey[] = [
  // 01 общий, handheld
  { f: 0, x: 0, y: -10, zoom: 0.88, roll: 0, ease: "linear" },
  { f: 143, x: 70, y: -10, zoom: 0.95, ease: "cut" },
  // 02 трекинг сбоку: камера ведёт Грега
  { f: 144, x: gregWalkX(144) + 170, y: -90, zoom: 1.35, ease: "linear" },
  { f: HIT_FRAME, x: gregWalkX(HIT_FRAME) + 170, y: -90, zoom: 1.35, ease: "out" },
  { f: HIT_FRAME + 8, x: 330, y: -70, zoom: 1.55, ease: "inout" },
  { f: 232, x: 450, y: -30, zoom: 1.3, ease: "linear" },
  { f: 263, x: 520, y: -20, zoom: 1.25, ease: "cut" },
  // 03 крупно, нижний ракурс, лёгкий голландский угол
  { f: 264, x: LAND_X, y: -205, zoom: 2.2, roll: -4, ease: "linear" },
  { f: 359, x: LAND_X + 10, y: -215, zoom: 2.35, roll: -3, ease: "cut" },
  // 04 деталь: статичная камера на билборде
  { f: 360, x: bb.x, y: bb.y, zoom: 1.85, roll: 0, ease: "linear" },
  { f: 455, x: bb.x, y: bb.y, zoom: 1.85, ease: "cut" },
  // 05 резкий зум-аут от машины к общему плану
  { f: 456, x: 760, y: -60, zoom: 2.6, ease: "out" },
  { f: 468, x: 470, y: -30, zoom: 0.82, ease: "linear" },
  { f: 575, x: 470, y: -30, zoom: 0.82, ease: "cut" },
  // 06 средний план -> медленный наезд на лицо
  { f: 576, x: LAND_X + 40, y: -150, zoom: 1.7, ease: "inout" },
  { f: 640, x: LAND_X + 40, y: -70, zoom: 2.0, ease: "linear" },
  { f: 719, x: LAND_X + 40, y: -35, zoom: 3.0, ease: "linear" },
];

/** Тряска: handheld на двойках (от-до кадры, амплитуда px, крен град.) */
export const HANDHELD = [
  { from: 0, to: 144, amp: 9, roll: 0.4, seed: 2 },
  { from: 144, to: HIT_FRAME, amp: 3, roll: 0.15, seed: 5 },
  { from: 456, to: 470, amp: 14, roll: 0.5, seed: 8 },
  { from: 576, to: 720, amp: 0.8, roll: 0.05, seed: 9 },
];
/** Ударные тряски (кадр, амплитуда, длительность) */
export const IMPACTS = [
  { f: HIT_FRAME, amp: 34, dur: 22 },
  { f: LAND_FRAME, amp: 30, dur: 24 },
  { f: BILLBOARD.flipAt, amp: 6, dur: 8 },
  { f: 636, amp: 9, dur: 10 }, // вправление плеча
];

/** Мигалки сирен (до «выдёргивания вилки») */
export const SIREN = { until: 456, every: 6, opacity: 0.1, a: "#ff1d2b", b: "#2a52ff" };

// ---------- Слоу-мо: [кадр вывода, игровое время] ----------
export const SLOWMO: ReadonlyArray<readonly [number, number]> = [
  [HIT_FRAME, 0],
  [HIT_FRAME + 6, 6], // удар на полной скорости
  [HIT_FRAME + 16, 8], // резкое замедление
  [264, 24],
  [LAND_FRAME, 28], // приземление
];
export const FLIGHT_GAME_FRAMES = 28;

// ---------- Актёры ----------
export type PosePatch = Partial<Pose>;
export type GregSeg =
  | { mode: "walk"; from: number; to: number; x0: number; x1: number }
  | { mode: "flight"; from: number; to: number; fromXY: [number, number]; toXY: [number, number]; apex: number; spin: number }
  | { mode: "keys"; from: number; to: number; x: number; keys: Array<{ f: number } & PosePatch> };

/** Лежание: корпус повёрнут на -90 (головой вперёд), центр тела ~60 px над асфальтом */
const LY = GROUND + 50 - CENTER_Y; // центр тела ~50 px над асфальтом
const LYING: PosePatch = { rot: -90, y: LY, x: 0, armL: 160, armR: 12, legL: -12, legR: 8, torso: 0, head: -12, cupUpright: true };

export const GREG: GregSeg[] = [
  { mode: "walk", from: 0, to: HIT_FRAME, x0: gregWalkX(0), x1: gregWalkX(HIT_FRAME) },
  {
    mode: "flight",
    from: HIT_FRAME,
    to: LAND_FRAME,
    fromXY: [gregWalkX(HIT_FRAME) + 20, GROUND + 20],
    toXY: [LAND_X, LY],
    apex: 300,
    spin: -90,
  },
  // шлепок: пара жёстких поз, затем лежит. Стаканчик стоит ровно (cupUpright).
  {
    mode: "keys",
    from: LAND_FRAME,
    to: 600,
    x: LAND_X,
    keys: [
      { f: LAND_FRAME, ...LYING, y: LY + 16, rot: -84 },
      { f: LAND_FRAME + 2, ...LYING, y: LY, x: 6 },
      { f: LAND_FRAME + 4, ...LYING, y: LY + 6, rot: -87, x: 14 },
      { f: LAND_FRAME + 6, ...LYING, x: 22 },
    ],
  },
  // 06: встаёт на жёстких позах, вправляет плечо, плюёт зуб, смотрит в небо, реплика
  {
    mode: "keys",
    from: 600,
    to: DURATION,
    x: LAND_X + 22,
    keys: [
      { f: 600, ...LYING, x: 0 },
      { f: 606, ...LYING, x: 0, armL: 120, head: 10 },
      { f: 612, rot: -70, y: LY + 10, x: 0, armL: 80, armR: 12, legL: -20, legR: 10, head: 6, cupUpright: true },
      { f: 618, rot: -45, y: LY + 30, x: -4, armL: 40, armR: 12, legL: -10, legR: 20, head: 4, cupUpright: true },
      { f: 624, rot: -22, y: GROUND - 60, x: -6, armL: 15, armR: 14, legL: -8, legR: 14, torso: 10, head: -8, cupUpright: true },
      { f: 630, rot: -8, y: GROUND - 18, x: -6, armL: 8, armR: 24, legL: 4, legR: 4, torso: 8, head: -10, cupUpright: true },
      // стоит: перекошен, плечо вывихнуто (левая рука болтается)
      { f: 636, rot: 0, y: GROUND, x: -6, armL: 38, armR: 14, torso: 6, head: -6, cupUpright: true },
      { f: 640, rot: 0, y: GROUND, x: -6, armL: -10, armR: 14, torso: 2, head: 0, tick: true, cupUpright: true }, // дёрнул плечом, щёлк
      { f: 644, rot: 0, y: GROUND, x: -6, armL: 6, armR: 14, torso: 4, head: -4, cupUpright: true },
      { f: 652, rot: 0, y: GROUND, x: -6, armL: 4, armR: 14, torso: 0, head: 8, mouth: "o", cupUpright: true }, // сплёвывает
      { f: 656, rot: 0, y: GROUND, x: -6, armL: 4, armR: 14, torso: 0, head: -4, mouth: "closed", cupUpright: true },
      { f: 664, rot: 0, y: GROUND, x: -6, armL: 4, armR: 14, torso: -4, head: 18, cupUpright: true }, // поднял глаза в небо
      { f: 672, rot: 0, y: GROUND, x: -6, armL: 4, armR: 14, torso: -6, head: 22, cupUpright: true },
    ],
  },
];
/** Окно «глаза в небо + реплика» (для рта/тика) */
export const GREG_TICK = { seed: 5, every: 34, from: 0, to: 140 }; // тик глаза вне ключей (до удара и в конце)
export const GREG_TICK2 = { from: 560, to: 720 };
export const GREG_SPIT = { f: 652, from: [LAND_X + 22 - 6 + 50, GROUND + 180] as [number, number], to: [LAND_X + 22 + 90, GROUND - 4] as [number, number], life: 10 };
/** Реплика «Ебать… Неужели съебались?» - подстроить под фактическую длину voice_*.wav */
export const GREG_LINE = { from: 674, to: 716 };

export const TRACKS = {
  /** Суперкар: проносится слева направо, разворачивается за кадром, второй заход - в Грега */
  car: [
    [-60, -3000],
    [-8, -3000],
    [8, -1700],
    [40, 1800],
    [78, 3600],
    [110, -3000],
    [132, -1900],
    [HIT_FRAME - 2, 130],
    [HIT_FRAME + 10, 420],
    [HIT_FRAME + 26, 790],
    [HIT_FRAME + 44, 900],
    [1000, 900],
  ] as ReadonlyArray<readonly [number, number]>,
  /** Oppressor Mk II: x, y */
  bike: [
    [0, -1000, 360],
    [70, -100, 400],
    [144, 800, 380],
    [210, 1800, 420],
    [400, -1900, 380],
    [450, -380, 372],
    [1000, -380, 372],
  ] as ReadonlyArray<readonly [number, number, number]>,
};
export const CAR_Y = GROUND - 6;
/** Первый проезд - по проезжей части (перед Грегом), второй - по тротуару в Грега. Смена полосы за кадром. */
export const CAR_Y_TRACK: ReadonlyArray<readonly [number, number]> = [
  [0, GROUND - 125],
  [90, GROUND - 125],
  [95, CAR_Y],
  [1000, CAR_Y],
];
/** Размеры спрайтов-реквизита в мире (ширина px; высота по аспекту) */
export const CAR_W = 840;
export const BIKE_W = 480;
export const ROCKET_W = 150;
/** Пришелец в машине: высота спрайта и точка (pivot=низ-центр) в системе координат машины (pivot машины = низ колёс) */
export const ALIEN_H = 170;
export const ALIEN_AT: [number, number] = [20, 80];
/** Ракеты с байка: кадр запуска */
export const ROCKET_LAUNCHES = [18, 34, 52, 70, 92, 110, 126, 150];
export const ROCKET = { vx: 34, vy: -12, life: 30 };

/** Распад на пиксели (кадр начала/конца) и пыль от пришельца */
export const VANISH = {
  alien: { from: 462, to: 468 },
  dust: { from: 466, to: 494 },
  car: { from: 470, to: 484 },
  bike: { from: 472, to: 484 },
};

// ---------- Аудио ----------
// Имена файлов ищутся в public/audio/ (.wav/.mp3/.ogg/.m4a). Нет файла - слой пропускается.
const t = (s: number) => Math.round(s * FPS);
export const AUDIO_CUES: AudioCue[] = [
  { base: "music_s1", from: 0, to: HIT_FRAME, volume: 0.35, note: "тревожный фон (опц.)" },
  { base: "sfx_siren", from: 0, to: 456, volume: 0.45, loop: true },
  { base: "sfx_engine_roar", from: 6, to: 90, volume: 0.8 },
  { base: "sfx_engine_roar", from: 108, to: HIT_FRAME + 8, volume: 0.9 },
  { base: "sfx_rocket_whoosh", from: 18, to: 60, volume: 0.6 },
  { base: "sfx_rocket_whoosh", from: 70, to: 130, volume: 0.6 },
  { base: "sfx_explosion_far", from: 52, to: 110, volume: 0.55 },
  { base: "sfx_explosion_far", from: 110, to: 160, volume: 0.55 },
  { base: "sfx_crunch_hit", from: HIT_FRAME, to: HIT_FRAME + 40, volume: 1 },
  { base: "sfx_bass_drop", from: HIT_FRAME, to: HIT_FRAME + 60, volume: 0.9 },
  { base: "sfx_slowmo_hum", from: HIT_FRAME + 8, to: LAND_FRAME + 4, volume: 0.6 },
  { base: "sfx_body_thud", from: LAND_FRAME, to: LAND_FRAME + 30, volume: 1 },
  { base: "sfx_digital_click", from: BILLBOARD.flipAt - 1, to: BILLBOARD.flipAt + 30, volume: 1 },
  { base: "sfx_unplug", from: 456, to: 500, volume: 1, note: "выдёргивание вилки" },
  { base: "sfx_glitch", from: 460, to: 490, volume: 0.8 },
  // РЕЗКАЯ ТИШИНА с 488 до ~516, затем:
  { base: "sfx_crickets", from: 516, to: DURATION, volume: 0.5, loop: true },
  { base: "sfx_water_drip", from: 524, to: DURATION, volume: 0.5, loop: true },
  { base: "sfx_bone_crack", from: 636, to: 666, volume: 1 },
  { base: "sfx_spit", from: 652, to: 672, volume: 0.9 },
  { base: "voice_greg_01", from: GREG_LINE.from - 2, to: DURATION, volume: 1, note: "реплика Грега; имя файла = voice_greg_01" },
  { base: "voice_greg_s1", from: GREG_LINE.from - 2, to: DURATION, volume: 1 },
];
void t;
