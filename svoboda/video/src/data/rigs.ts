// Скелеты кукол. Координаты attach - «пространство персонажа»: начало = центр стоп, y вверх, px.
// attach = где в нейтральной позе стоит ШАРНИР (pivot) части. Можно переопределить в manifest.json (attach).
// У каждого персонажа два скелета: stub (заглушки) и real (настоящие PNG; включается, когда
// `probe`-ассет загружен из public/img). Масштаб персонажа запечён в скелет (pose.scale = 1).
import type { Pose } from "../engine/types";

export type Joint = "torso" | "head" | "armL" | "armR" | "legL" | "legR" | "none";

export interface RigPart {
  id: string;
  parent?: string;
  attach: [number, number];
  /** высота в мировых px (ширина по аспекту ассета) */
  h: number;
  /** порядок рисования (больше = ближе к зрителю) */
  z: number;
  joint: Joint;
  kind?: "tick" | "prop";
  /** ключ ассета; по умолчанию `${char}_${id}` */
  key?: (p: Pose) => string;
}

export interface Rig {
  /** центр вращения всего тела (ragdoll, лежание): одинаков в stub/real, чтобы данные сцены не зависели от режима */
  center: [number, number];
  probe?: string;
  parts: RigPart[];
}

export const CENTER_Y = 160;

const person = (scale: number, props: boolean, char: string): Rig => {
  const s = (v: number) => v * scale;
  const parts: RigPart[] = [
    { id: "leg_r", attach: [s(28), s(118)], h: s(120), z: 1, joint: "legR" },
    { id: "leg_l", attach: [s(-28), s(118)], h: s(120), z: 2, joint: "legL" },
    { id: "arm_l", parent: "torso", attach: [s(-86), s(285)], h: s(124), z: 3, joint: "armL" },
    { id: "torso", attach: [0, s(112)], h: s(190), z: 4, joint: "torso" },
    { id: "head", parent: "torso", attach: [0, s(296)], h: s(152), z: 6, joint: "head" },
    { id: "mouth", parent: "head", attach: [s(2), s(332)], h: s(36), z: 7, joint: "none", key: (p) => `${char}_mouth_${p.mouth}` },
    { id: "arm_r", parent: "torso", attach: [s(86), s(285)], h: s(124), z: 9, joint: "armR" },
  ];
  if (props) {
    parts.push({ id: "tick", parent: "head", attach: [s(-24), s(372)], h: s(30), z: 8, joint: "none", kind: "tick" });
    parts.push({ id: "cup", parent: "arm_r", attach: [s(86), s(172)], h: s(48), z: 10, joint: "none", kind: "prop" });
  }
  return { center: [0, CENTER_Y], parts };
};

/** Настоящие части Грега (public/img/greg_*.png). k - px мира на px PNG. */
const gregReal = (): Rig => {
  const k = 0.4;
  const hip = 242 * k;
  return {
    center: [0, CENTER_Y],
    probe: "greg_torso",
    parts: [
      { id: "leg_r", attach: [40 * k, hip + 5 * k], h: 252 * k, z: 1, joint: "legR", key: () => "greg_leg_right" },
      { id: "leg_l", attach: [-40 * k, hip + 5 * k], h: 252 * k, z: 2, joint: "legL", key: () => "greg_leg_left" },
      { id: "arm_l", parent: "torso", attach: [-90 * k, hip + 239 * k], h: 260 * k, z: 3, joint: "armL", key: () => "greg_arm_left" },
      { id: "torso", attach: [0, hip], h: 320 * k, z: 4, joint: "torso", key: () => "greg_torso" },
      { id: "head", parent: "torso", attach: [0, hip + 273 * k], h: 340 * k, z: 6, joint: "head", key: (p) => (p.mouth === "closed" ? "greg_head_closed" : p.mouth === "o" ? "greg_head_o" : "greg_head_open") },
      // в правой руке стаканчик уже нарисован
      { id: "arm_r", parent: "torso", attach: [90 * k, hip + 239 * k], h: 290 * k, z: 9, joint: "armR", key: () => "greg_arm_right_coffee" },
    ],
  };
};

export const RIGS: Record<string, { stub: Rig; real?: Rig }> = {
  greg: { stub: person(0.8, true, "greg"), real: gregReal() },
  alien: { stub: person(0.7, false, "alien") },
};
