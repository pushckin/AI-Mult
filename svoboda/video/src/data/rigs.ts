// Скелеты кукол. Координаты attach - «пространство персонажа»: начало = центр стоп, y вверх, px.
// attach = где в нейтральной позе стоит ШАРНИР (pivot) части. Можно переопределить в manifest.json (attach).
// Размеры частей (w,h) - боксы раскладки: настоящие PNG вписываются в них по высоте.
export type Joint = "torso" | "head" | "armL" | "armR" | "legL" | "legR" | "none";

export interface RigPart {
  id: string;
  /** ключ ассета = `${char}_${id}` (для рта `${char}_mouth_${variant}`) */
  parent?: string;
  attach: [number, number];
  /** высота в мировых px (ширина по аспекту ассета) */
  h: number;
  /** порядок рисования (больше = ближе к зрителю) */
  z: number;
  joint: Joint;
  kind?: "mouth" | "tick" | "prop";
}

export interface Rig {
  /** центр вращения всего тела (ragdoll, лежание) */
  center: [number, number];
  parts: RigPart[];
}

const person = (scale: number, props: boolean): Rig => {
  const s = (v: number) => v * scale;
  const parts: RigPart[] = [
    { id: "leg_r", attach: [s(28), s(118)], h: s(120), z: 1, joint: "legR" },
    { id: "leg_l", attach: [s(-28), s(118)], h: s(120), z: 2, joint: "legL" },
    { id: "arm_l", parent: "torso", attach: [s(-86), s(285)], h: s(124), z: 3, joint: "armL" },
    { id: "torso", attach: [0, s(112)], h: s(190), z: 4, joint: "torso" },
    { id: "head", parent: "torso", attach: [0, s(296)], h: s(152), z: 6, joint: "head" },
    { id: "mouth", parent: "head", attach: [s(2), s(332)], h: s(36), z: 7, joint: "none", kind: "mouth" },
    { id: "arm_r", parent: "torso", attach: [s(86), s(285)], h: s(124), z: 9, joint: "armR" },
  ];
  if (props) {
    parts.push({ id: "tick", parent: "head", attach: [s(-24), s(372)], h: s(30), z: 8, joint: "none", kind: "tick" });
    parts.push({ id: "cup", parent: "arm_r", attach: [s(86), s(172)], h: s(48), z: 10, joint: "none", kind: "prop" });
  }
  return { center: [0, s(200)], parts };
};

export const RIGS: Record<string, Rig> = {
  greg: person(1, true),
  alien: person(1, false),
};
