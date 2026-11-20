// Общие типы движка «бумажных кукол».

/** Запись манифеста public/img/manifest.json (после нормализации). */
export interface AssetEntry {
  key: string;
  /** Имя файла относительно public/img/ */
  file: string;
  /** Размер PNG в пикселях (если не указан - берётся из загруженной текстуры) */
  w?: number;
  h?: number;
  /** Шарнир в пикселях PNG от левого верхнего угла (по умолчанию - центр) */
  pivot?: [number, number];
  /** Позиция шарнира в «пространстве персонажа» (начало = центр стоп, y вверх), переопределяет rigs.ts */
  attach?: [number, number];
  /** Экран билборда [x, y, w, h] в пикселях PNG (для оверлея цифр) */
  screen?: [number, number, number, number];
}

export type AssetMap = Record<string, AssetEntry>;

/** Загруженный (или заглушечный) ассет, готовый к рисованию. */
export interface LoadedAsset {
  key: string;
  texture: import("three").Texture;
  /** Размер текстуры в px */
  texW: number;
  texH: number;
  /** Шарнир в px текстуры от левого верхнего угла */
  pivot: [number, number];
  attach?: [number, number];
  screen?: [number, number, number, number];
  isStub: boolean;
}

/** Поза куклы. Углы - в градусах; + = против часовой (y вверх). */
export interface Pose {
  /** Позиция начала координат персонажа (центр стоп) в авторских координатах сцены */
  x: number;
  y: number;
  /** Вращение всего тела вокруг rig.center (для полёта/падения/лежания) */
  rot: number;
  flip: boolean;
  scale: number;
  // суставы относительно родителя. Для рук/ног 0 = висит вниз, + = вперёд (по взгляду).
  torso: number;
  head: number;
  armL: number;
  armR: number;
  legL: number;
  legR: number;
  /** Смещение головы (тик/дёрганье), px */
  headDx: number;
  headDy: number;
  /** Вариант рта: closed | a | o | wide */
  mouth: string;
  /** Показать накладку «тик глаза» */
  tick: boolean;
  /** Держать предмет в руке вертикально, как бы ни вращалось тело */
  cupUpright: boolean;
  opacity: number;
  /** 0..1 пиксельный распад */
  dissolve: number;
  /** Белая/цветная вспышка: [r,g,b,amount] */
  tint?: [number, number, number, number];
  seed: number;
}

export const IDLE_POSE: Pose = {
  x: 0,
  y: 0,
  rot: 0,
  flip: false,
  scale: 1,
  torso: 0,
  head: 0,
  armL: 0,
  armR: 0,
  legL: 0,
  legR: 0,
  headDx: 0,
  headDy: 0,
  mouth: "closed",
  tick: false,
  cupUpright: false,
  opacity: 1,
  dissolve: 0,
  seed: 1,
};

export const pose = (p: Partial<Pose> = {}): Pose => ({ ...IDLE_POSE, ...p });
