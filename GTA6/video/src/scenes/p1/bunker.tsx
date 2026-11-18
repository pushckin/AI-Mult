// Сцена p1/bunker — «Бункер правительства в Веллингтоне». От 0 до начала cue p1_wall.
import React from "react";
import { AbsoluteFill } from "remotion";
import { SceneDef } from "../types";
import { Character } from "../../kit/Character";
import { CAST } from "../../kit/cast";
import { Cam } from "../../kit/Stage";
import { PartBadge } from "../../kit/Overlays";
import { FONT, glow, geo } from "../../kit/paper";
import { mouthFor, prog, twos, easeOut, easeInOut, easeOutBack, easeIn, shake, lerp, clamp01, noise1, hash } from "../../kit/anim";
import { C, subT, Room, PM_POS, DEF_POS, MugCrash, Mug, handPos, Puff, BigScreen } from "./bunker_set";
import { WindowSet, BeachSet, FerrySet, MattressSet, BarnInterior, BarnExterior, Sheep, Binoculars } from "./bunker_cut";
import { Pad } from "./bunker_set";

// ---------- тайминги (всё от cue) ----------
const O = C("p1_open"), P1 = C("p1_pm1"), D = C("p1_def1"), AI = C("p1_agri_in"), A = C("p1_agri1"), P2 = C("p1_pm2"), W = C("p1_wall");
const s_pm2 = subT("p1_pm1", "пять миллионов"), s_pm3 = subT("p1_pm1", "Откуда");
const d_boe = subT("p1_def1", "Боинги"), d_fer = subT("p1_def1", "Паромы"), d_mat = subT("p1_def1", "матрасах");
const a_each = subT("p1_agri1", "На каждую"), a_15 = subT("p1_agri1", "пятнадцать"), a_out = subT("p1_agri1", "выгоняют"), a_st = subT("p1_agri1", "стойла");
const q_3 = subT("p1_pm2", "Третья"), q_wall = subT("p1_pm2", "Строим"), q_now = subT("p1_pm2", "Немедленно");

const T_REL = O.start + 1.72;          // кружка выскальзывает
const T_HIT = O.start + 2.3;          // удар об пол
const T_SLAM = lerp(q_wall.start, q_wall.end, 0.5); // кулак об стол (на «стену»)
const T_DOOR = AI.start + 0.12;
const WW3_CUT = lerp(q_3.start, q_wall.start, 0.55); // врезка экрана со штампом
const NOW_CUT = lerp(q_now.start, W.start, 0.5);     // «Немедленно!»: сверхкрупно → общий план       // дверь распахивается

const pmMouth = (t: number) => mouthFor("p1", ["p1_pm1", "p1_pm2"], t);
const defMouth = (t: number) => mouthFor("p1", ["p1_def1"], t);
const agriMouth = (t: number) => mouthFor("p1", ["p1_agri1"], t);

// ---------- 2D-оверлеи ----------
const Vignette: React.FC<{ k?: number; color?: string }> = ({ k = 0.55, color = "0,0,0" }) => (
  <AbsoluteFill style={{ pointerEvents: "none", background: `radial-gradient(ellipse 75% 60% at 50% 45%, rgba(${color},0) 55%, rgba(${color},${k}) 100%)` }} />
);
const RedFlash: React.FC<{ t: number; from: number }> = ({ t, from }) => {
  if (t < from) return null;
  const on = Math.floor((t - from) * 4) % 2 === 0;
  return <AbsoluteFill style={{ pointerEvents: "none", background: "#ff0000", opacity: on ? 0.22 : 0.06, mixBlendMode: "multiply" }} />;
};
/** маска бинокля: k=0 — два круга, k=1 — раскрыта во весь кадр */
const BinoMask: React.FC<{ k: number }> = ({ k }) => {
  if (k >= 1) return null;
  const r = lerp(420, 1500, easeIn(k));
  const cy = 820;
  const dx = lerp(270, 400, k);
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <svg width={1080} height={1920} viewBox="0 0 1080 1920">
        <defs><mask id="bino"><rect width={1080} height={1920} fill="white" /><circle cx={540 - dx} cy={cy} r={r} fill="black" /><circle cx={540 + dx} cy={cy} r={r} fill="black" /></mask></defs>
        <rect width={1080} height={1920} fill="#050505" mask="url(#bino)" />
        <line x1={540} y1={cy - 60} x2={540} y2={cy + 60} stroke="rgba(0,0,0,0.5)" strokeWidth={4} opacity={1 - k} />
        <line x1={480} y1={cy} x2={600} y2={cy} stroke="rgba(0,0,0,0.5)" strokeWidth={4} opacity={1 - k} />
      </svg>
    </AbsoluteFill>
  );
};
const Bam: React.FC<{ t: number; at: number; text: string; color?: string; x?: number; y?: number }> = ({ t, at, text, color = "#ffd23f", x = 540, y = 560 }) => {
  const k = prog(t, at, at + 0.15);
  const out = 1 - prog(t, at + 0.55, at + 0.75);
  if (t < at || out <= 0) return null;
  const s = easeOutBack(k);
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <div style={{ position: "absolute", left: x, top: y, transform: `translate(-50%,-50%) scale(${s}) rotate(-8deg)`, opacity: out }}>
        <svg width={520} height={340} viewBox="-260 -170 520 340" style={{ position: "absolute", left: -260, top: -170 }}>
          <polygon fill={color} stroke="#111" strokeWidth={10} points={Array.from({ length: 24 }, (_, i) => { const a = (i / 24) * Math.PI * 2; const rr = i % 2 ? 110 : 165; return `${Math.cos(a) * rr * 1.45},${Math.sin(a) * rr}`; }).join(" ")} />
        </svg>
        <div style={{ position: "relative", fontFamily: FONT, fontWeight: 900, fontSize: 108, color: "#c62828", WebkitTextStroke: "8px #111", paintOrder: "stroke fill", whiteSpace: "nowrap" }}>{text}</div>
      </div>
    </AbsoluteFill>
  );
};
const Caption: React.FC<{ text: string; t: number; at: number; y?: number; bg?: string; fg?: string; rot?: number }> = ({ text, t, at, y = 330, bg = "#f7e9c9", fg = "#111", rot = -3 }) => {
  if (t < at) return null;
  const k = easeOutBack(prog(t, at, at + 0.2));
  return (
    <AbsoluteFill style={{ pointerEvents: "none", alignItems: "center" }}>
      <div style={{ position: "absolute", top: y, transform: `scale(${k}) rotate(${rot}deg)`, background: bg, border: "6px solid #111", padding: "10px 26px", boxShadow: "8px 8px 0 rgba(0,0,0,0.45)", fontFamily: FONT, fontWeight: 900, fontSize: 58, color: fg, whiteSpace: "nowrap" }}>{text}</div>
    </AbsoluteFill>
  );
};

// ---------- общий конструктор шота ----------
type Shot = { id: string; from: number; to: number; bg?: string; r: (t: number) => React.ReactNode; o?: (t: number) => React.ReactNode };
const badge = (t: number) => <PartBadge pid="p1" t={t} until={P1.start} />;

// плавающая камера со смещением от тряски
function camShake(t: number, hits: [number, number][], base = 0) {
  let x = noise1(t * 0.9) * base, y = noise1(t * 0.9 + 40) * base;
  for (const [at, amp] of hits) { const [a, b] = shake(t, at, amp); x += a; y += b; }
  return [x, y] as const;
}

// эмоции ПМ во время pm1: руки вверх «на двойках»
function pmPanic(t: number) {
  const tq = twos(t);
  const wig = Math.sin(tq * 17) * 0.25;
  return { armL: 2.55 + wig, armR: 2.55 - wig, squash: 1 + Math.sin(tq * 23) * 0.03, headTilt: Math.sin(tq * 11) * 0.08 };
}

const AGRI_SPOT: [number, number, number] = [1.8, 0, -2.95];
const agriSob = (t: number, extra: object = {}) => ({
  position: AGRI_SPOT, eyes: "sad" as const, mouth: "scream" as const, mouthOpen: 0.25 + agriMouth(t) * 0.75, tears: 1, brow: 1,
  armL: 2.35 + Math.sin(twos(t) * 13) * 0.15, armR: 0.5, headTilt: Math.sin(twos(t) * 9) * 0.1,
  squash: 1 + Math.abs(Math.sin(twos(t) * 8)) * 0.05, ...extra,
});
/** летящие слёзы-капли (мировые координаты относительно головы) */
const TearSpray: React.FC<{ t: number; x: number; y: number; z: number }> = ({ t, x, y, z }) => (
  <group>
    {Array.from({ length: 10 }, (_, i) => {
      const per = 0.6, age = ((t + hash(i) * per) % per);
      const side = i % 2 ? 1 : -1;
      const px = x + side * (0.2 + age * (0.9 + hash(i + 3) * 0.5)), py = y + 0.9 * age - 3.2 * age * age;
      return <mesh key={i} position={[px, py, z + 0.25]} material={glow("#8fd3ff", 0.95)}><circleGeometry args={[0.035 + hash(i + 8) * 0.02, 10]} /></mesh>;
    })}
  </group>
);

const SHEEP_PHOTO = (
  <group position={[0.02, 0.12, 0.08]}>
    <mesh material={glow("#5a3b26")}><planeGeometry args={[0.42, 0.36]} /></mesh>
    <mesh position={[0, 0, 0.005]} material={glow("#bfe4f2")}><planeGeometry args={[0.34, 0.28]} /></mesh>
    <group position={[-0.08, -0.12, 0.01]} scale={0.26}><Sheep position={[0, 0, 0]} t={0} /></group>
  </group>
);

const STAR = (() => {
  const pts: [number, number][] = [];
  for (let i = 0; i < 16; i++) { const a = (i / 16) * Math.PI * 2; const r = i % 2 ? 0.12 : 0.32; pts.push([Math.cos(a) * r, Math.sin(a) * r]); }
  return geo.poly("slamStar", pts, 0, 0.01);
})();

const shots: Shot[] = [];

// 1. Экран: карта и счётчик, «из-за спины» министров
shots.push({
  id: "bk_screen", from: 0, to: O.start + 0.95, bg: "#0b0d0c",
  r: (t) => {
    const k = easeInOut(prog(t, 0, O.start + 0.95));
    return <>
      <Cam pos={[lerp(0.9, 0.55, k), lerp(1.9, 2.15, k), -4.75]} look={[0, 3.0, 5]} fov={lerp(40, 30, k)} />
      <Room t={t} backView />
    </>;
  },
  o: (t) => <><Vignette k={0.6} />{badge(t)}</>,
});
// 2. Крупно: барабаны счётчика бешено крутятся
shots.push({
  id: "bk_counter", from: O.start + 0.95, to: O.start + 1.5, bg: "#0b0d0c",
  r: (t) => {
    const k = prog(t, O.start + 0.95, O.start + 1.5);
    const [sx, sy] = camShake(t, [[O.start + 1.25, 0.05]], 0.02);
    return <>
      <Cam pos={[lerp(1.3, -0.9, k) + sx, 4.0 + sy, 2.35]} look={[lerp(0.6, -0.4, k), 4.15, 5.12]} fov={40} roll={0.12} />
      <Room t={t} backView />
    </>;
  },
  o: (t) => <><Vignette k={0.5} />{badge(t)}</>,
});
// 3. ПМ смотрит на экран, кружка выскальзывает
shots.push({
  id: "bk_pm_mug", from: O.start + 1.5, to: O.start + 2.05, bg: "#0b0d0c",
  r: (t) => {
    const k = prog(t, O.start + 1.5, O.start + 2.05);
    const a = 1.55;
    const [hx, hy] = handPos(1, a);
    return <>
      <Cam pos={[0.3, 1.75, lerp(-0.2, -0.6, k)]} look={[0.4, 1.12, -3.55]} fov={40} />
      <Room t={t} hide={["old", "slick", "curly"]}
        pm={{ eyes: "wide", lookY: 0.9, mouth: "o", brow: 1, armR: a, armL: 0.2, sweat: t > T_REL ? 0.5 : 0, handR: t < T_REL ? <group position={[0.02, 0.06, 0.08]} rotation={[0, 0, -2.25 + 2.25]}><Mug /></group> : undefined }}
        mug={<MugCrash x={PM_POS[0] + hx + 0.02} y0={hy + 0.06} z={PM_POS[2] + 0.12} tRelease={T_REL} tHit={T_HIT} t={t} />} />
    </>;
  },
  o: (t) => <><Vignette />{badge(t)}</>,
});
// 4. У пола: кружка вдребезги
shots.push({
  id: "bk_crash", from: O.start + 2.05, to: P1.start, bg: "#0b0d0c",
  r: (t) => {
    const [hx, hy] = handPos(1, 1.55);
    const [sx, sy] = camShake(t, [[T_HIT, 0.03]]);
    return <>
      <Cam pos={[1.15 + sx, 0.8 + sy, -2.25]} look={[0.62, 0.3, -3.45]} fov={42} />
      <Room t={t} hide={["curly"]} pm={{ eyes: "wide", armR: 1.55 }} mug={<MugCrash x={PM_POS[0] + hx + 0.02} y0={hy + 0.06} z={PM_POS[2] + 0.12} tRelease={T_REL} tHit={T_HIT} t={t} />} />
    </>;
  },
  o: (t) => <><Vignette />{badge(t)}<Bam t={t} at={T_HIT} text="ДЗЫНЬ!" y={640} /></>,
});
// 5. «Какого … происходит?!» — крупный план, наезд
shots.push({
  id: "bk_pm_scream", from: P1.start, to: s_pm2.start, bg: "#0b0d0c",
  r: (t) => {
    const k = easeOut(prog(t, P1.start, s_pm2.start));
    const [sx, sy] = camShake(t, [[P1.start, 0.08]], 0.015);
    return <>
      <Cam pos={[sx, lerp(1.85, 1.7, k) + sy, lerp(0.3, -0.85, k)]} look={[0, 1.13, -3.55]} fov={40} />
      <Room t={t} pm={{ eyes: "wide", mouth: "scream", mouthOpen: 0.3 + pmMouth(t) * 0.7, sweat: 1, brow: 1, ...pmPanic(t) }}
        extras={{ bun: { eyes: "wide", mouth: "o", bodyTilt: 0.15 }, curly: { eyes: "wide", mouth: "o", bodyTilt: -0.15, sweat: 1 } }}
        mug={<MugCrash x={0.55} y0={1} z={PM_POS[2] + 0.12} tRelease={T_REL} tHit={T_HIT} t={t} />} />
    </>;
  },
  o: (t) => <><Vignette />{badge(t)}</>,
});
// 6. «У нас вчера было пять миллионов!» — из-за спины ПМ на экран
shots.push({
  id: "bk_pm_ots", from: s_pm2.start, to: s_pm3.start, bg: "#0b0d0c",
  r: (t) => {
    const k = easeInOut(prog(t, s_pm2.start, s_pm3.start));
    return <>
      <Cam pos={[lerp(-0.45, -0.25, k), lerp(1.95, 2.15, k), -4.8]} look={[0, 2.85, 5]} fov={lerp(40, 36, k)} />
      <Room t={t} backView />
      {/* рука ПМ тычет в экран (силуэт) */}
      <group position={[0.42, 1.25, -3.5]} rotation={[0, 0, -1.9 + Math.sin(twos(t) * 18) * 0.12]}>
        <mesh position={[0, 0.25, 0]} material={glow("#141816")}><planeGeometry args={[0.15, 0.55]} /></mesh>
        <mesh position={[0, 0.55, 0]} material={glow("#141816")}><circleGeometry args={[0.09, 12]} /></mesh>
      </group>
    </>;
  },
  o: (t) => <><Vignette /><Caption t={t} at={s_pm2.start + 0.25} text="ВЧЕРА: 5 000 000" y={300} /><Caption t={t} at={s_pm2.start + 1.2} text="СЕГОДНЯ: 86 000 000+" y={410} bg="#c62828" fg="#fff" rot={2} /></>,
});
// 7. «Откуда, … взялось ещё восемьдесят?!» — сверхкрупно, тряска
shots.push({
  id: "bk_pm_ecu", from: s_pm3.start, to: s_pm3.start + Math.max(0.8, D.start - s_pm3.start - 1.0), bg: "#0b0d0c",
  r: (t) => {
    const [sx, sy] = camShake(t, [[s_pm3.start, 0.1], [s_pm3.start + 0.6, 0.06]], 0.03);
    return <>
      <Cam pos={[sx, 1.62 + sy, -1.15]} look={[0, 1.2, -3.55]} fov={38} roll={noise1(t * 3) * 0.06} />
      <Room t={t} pm={{ eyes: "crazy", mouth: "scream", mouthOpen: 0.4 + pmMouth(t) * 0.6, sweat: 1, ...pmPanic(t) }} />
    </>;
  },
  o: () => <Vignette k={0.7} />,
});
// 8. Общий план: министры в ужасе
shots.push({
  id: "bk_wide1", from: s_pm3.start + Math.max(0.8, D.start - s_pm3.start - 1.0), to: D.start, bg: "#0b0d0c",
  r: (t) => {
    const k = easeOut(prog(t, D.start - 1.0, D.start));
    const tq = twos(t);
    return <>
      <Cam pos={[lerp(0.25, 0.1, k), lerp(2.6, 2.5, k), lerp(0.7, 0.2, k)]} look={[0, 1.35, -3.0]} fov={44} />
      <Room t={t} hide={["old", "slick"]} pm={{ eyes: "crazy", mouth: "scream", mouthOpen: 0.3 + pmMouth(t) * 0.7, sweat: 1, ...pmPanic(t) }}
        extras={{
          bun: { eyes: "wide", mouth: "o", bodyTilt: 0.25, armL: 2.6, armR: 2.6, sweat: 1 },
          curly: { eyes: "wide", mouth: "scream", mouthOpen: 0.6, bodyTilt: -0.25, armL: 1.6 + Math.sin(tq * 20) * 0.2, armR: 1.6 },
          old: { eyes: "dead", mouth: "o", bodyTilt: 0.35, headTilt: 0.3 },
          slick: { eyes: "wide", mouth: "frown", sweat: 1, armR: 2.7, handR: <group rotation={[0, 0, 0.4]}><Pad /></group> },
        }} />
    </>;
  },
  o: () => <Vignette />,
});
// 9. Министр обороны у бойницы с биноклем (снаружи бункера)
shots.push({
  id: "bk_def_window", from: D.start, to: d_boe.start, bg: "#9cc6e8",
  r: (t) => {
    const k = easeInOut(prog(t, D.start, d_boe.start));
    return <>
      <Cam pos={[lerp(0.9, 0.25, k), lerp(1.55, 1.5, k), lerp(3.4, 2.3, k)]} look={[0, 1.38, -0.5]} fov={40} />
      <WindowSet t={t} mouth={defMouth(t)} scared={0.3} lower={0} />
    </>;
  },
  o: () => <Vignette k={0.2} />,
});
// 10. Врезка: «Боинг» садится на пляж без шасси
shots.push({
  id: "bk_beach", from: d_boe.start, to: d_fer.start, bg: "#9cc6e8",
  r: (t) => {
    const k = prog(t, d_boe.start, d_fer.start);
    const touchT = lerp(d_boe.start, d_fer.start, 0.18);
    // та же траектория, что в BeachSet (x — центр фюзеляжа)
    const plX = k < 0.18 ? lerp(9, 4.2, k / 0.18) : lerp(4.2, -1.4, easeOut((k - 0.18) / 0.82));
    const plY = k < 0.18 ? lerp(2.6, 0, easeIn(k / 0.18)) : 0;
    const px = plX + 0.35;
    const [sx, sy] = camShake(t, [[touchT, 0.25]], 0.0);
    return <>
      <Cam pos={[px + 0.3 + sx, 1.6 + plY * 0.5 + sy, 9.4]} look={[px, 0.55 + plY * 0.6, 0]} fov={42} roll={0.5} />
      <BeachSet t={t} t0={d_boe.start} t1={d_fer.start} />
    </>;
  },
  o: (t) => <><BinoMask k={prog(t, d_boe.start + 0.55, d_boe.start + 0.95)} /><Caption t={t} at={lerp(d_boe.start, d_fer.start, 0.3)} text="БЕЗ ШАССИ!" y={300} bg="#ffd23f" /></>,
});
// 11. Врезка: паром тонет от перегруза
shots.push({
  id: "bk_ferry", from: d_fer.start, to: d_mat.start, bg: "#9cc6e8",
  r: (t) => {
    const k = easeInOut(prog(t, d_fer.start, d_mat.start));
    return <>
      <Cam pos={[lerp(-0.6, 0.2, k), lerp(1.2, 0.9, k), lerp(10.8, 9.6, k)]} look={[0, -0.1, 0]} fov={42} />
      <FerrySet t={t} t0={d_fer.start} t1={d_mat.start} />
    </>;
  },
  o: (t) => <><BinoMask k={prog(t, d_fer.start + 0.25, d_fer.start + 0.6)} /><Caption t={t} at={d_fer.start + 0.5} text="ПЕРЕГРУЗ: 4 000%" y={300} bg="#c62828" fg="#fff" rot={3} /></>,
});
// 12. Врезка: доплывают на надувных матрасах
const MAT_END = Math.max(d_mat.start + 1.2, D.end - 0.6);
shots.push({
  id: "bk_mattress", from: d_mat.start, to: MAT_END, bg: "#9cc6e8",
  r: (t) => {
    const k = easeInOut(prog(t, d_mat.start, MAT_END));
    return <>
      <Cam pos={[lerp(-0.3, 0.2, k), lerp(3.2, 2.9, k), lerp(5.6, 5.0, k)]} look={[0, 0.1, -3.0]} fov={44} />
      <MattressSet t={t} t0={d_mat.start} />
    </>;
  },
  o: (t) => <BinoMask k={prog(t, d_mat.start + 0.2, d_mat.start + 0.55)} />,
});
// 13. Министр обороны опускает бинокль
shots.push({
  id: "bk_def_lower", from: MAT_END, to: AI.start, bg: "#9cc6e8",
  r: (t) => {
    const k = prog(t, MAT_END, MAT_END + 0.25);
    return <>
      <Cam pos={[0.2, 1.55, 2.7]} look={[0, 1.3, -0.5]} fov={40} />
      <WindowSet t={t} mouth={defMouth(t)} scared={1} lower={k > 0.5 ? 1 : 0} />
    </>;
  },
  o: () => <Vignette k={0.2} />,
});
// 14. Дверь с грохотом: врывается министр сельского хозяйства
const AGRI_RUN_END = A.start + 0.35;
shots.push({
  id: "bk_door", from: AI.start, to: A.start + 0.55, bg: "#0b0d0c",
  r: (t) => {
    const open = t < T_DOOR ? 0 : easeOutBack(prog(t, T_DOOR, T_DOOR + 0.3));
    const run = prog(t, T_DOOR + 0.05, AGRI_RUN_END);
    const ax = lerp(2.05, AGRI_SPOT[0], easeOut(run)), az = lerp(-4.6, AGRI_SPOT[2], easeOut(run));
    const look = t > T_DOOR + 0.1 ? 1 : 0;
    const [sx, sy] = camShake(t, [[T_DOOR + 0.12, 0.09]]);
    const running = run < 1;
    return <>
      <Cam pos={[2.55 + sx, 2.25 + sy, 0.9]} look={[1.75, 1.2, -4.0]} fov={42} />
      <Room t={t} doorOpen={open}
        pm={{ eyes: "wide", lookX: look, mouth: "o", sweat: 1, armL: 0.6, armR: 0.6 }}
        def={{ eyes: "wide", lookX: look, armR: 0.5, handR: <group rotation={[0, 0, 0.3]}><Binoculars /></group> }}
        extras={{ bun: { lookX: look, eyes: "wide" }, curly: { lookX: look, eyes: "wide", bodyTilt: 0.15 }, old: { lookX: look }, slick: { lookX: look, eyes: "wide" } }}
        agri={t > T_DOOR ? agriSob(t, { position: [ax, 0, az], legs: running ? "run" : "stand", legPhase: twos(t) * 22, bodyTilt: running ? -0.12 : 0 }) : null} />
      {t > T_DOOR && t < T_DOOR + 1.0 && [0, 1, 2].map((i) => <Puff key={i} position={[1.4 + i * 0.5, 0.3 + i * 0.25 + (t - T_DOOR) * 0.4, -4.6]} scale={0.3 + (t - T_DOOR) * 0.5} color="#9a9a8a" opacity={0.9} />)}
      {t > T_DOOR && <TearSpray t={t} x={ax} y={1.5} z={az} />}
    </>;
  },
  o: (t) => <><Vignette /><Bam t={t} at={T_DOOR} text="БАХ!" x={700} y={420} /></>,
});
// 15. «Нашим овцам …!» — крупно, рыдает с фото овечки
shots.push({
  id: "bk_agri_close", from: A.start + 0.55, to: a_each.start, bg: "#0b0d0c",
  r: (t) => {
    const k = easeOut(prog(t, A.start + 0.55, a_each.start));
    return <>
      <Cam pos={[lerp(1.85, 1.75, k), 1.75, lerp(0.5, -0.2, k)]} look={[1.62, 1.15, -2.95]} fov={40} />
      <Room t={t} def={{}} hide={["slick", "old", "curly"]} agri={agriSob(t, { armL: 1.95, handL: SHEEP_PHOTO, armR: 2.35 + Math.sin(twos(t) * 13) * 0.15 })} />
      <TearSpray t={t} x={AGRI_SPOT[0]} y={1.5} z={AGRI_SPOT[2]} />
    </>;
  },
  o: () => <Vignette />,
});
// 16. Сарай: на одну овцу — всё больше мужиков
shots.push({
  id: "bk_barn_count", from: a_each.start, to: a_15.start, bg: "#5a2a1a",
  r: (t) => {
    const k = prog(t, a_each.start, a_15.start);
    const men = Math.min(16, 1 + Math.floor(easeIn(k) * 16));
    return <>
      <Cam pos={[lerp(0.3, -0.1, k), 2.1, lerp(5.8, 5.2, k)]} look={[0, 0.75, -1]} fov={44} />
      <BarnInterior t={t} men={men} board={false} />
    </>;
  },
  o: (t) => {
    const k = prog(t, a_each.start, a_15.start);
    const men = Math.min(15, 1 + Math.floor(easeIn(k) * 16));
    return <Caption t={t} at={a_each.start} text={`МУЖИКОВ НА ОВЦУ: ${men}`} y={190} bg="#ffd23f" />;
  },
});
// 17. Крупнее: овца в шоке, потные мужики сжимают кольцо
shots.push({
  id: "bk_barn_close", from: a_15.start, to: a_out.start, bg: "#5a2a1a",
  r: (t) => {
    const k = easeInOut(prog(t, a_15.start, a_out.start));
    return <>
      <Cam pos={[lerp(0.35, 0.15, k), 1.6, lerp(4.4, 3.8, k)]} look={[0.0, 1.0, -0.6]} fov={40} />
      <BarnInterior t={t} men={16} />
    </>;
  },
});
// 18. Снаружи: овец вышвыривают из сарая
shots.push({
  id: "bk_barn_out", from: a_out.start, to: a_st.start, bg: "#78b8e6",
  r: (t) => {
    const k = easeInOut(prog(t, a_out.start, a_st.start));
    return <>
      <Cam pos={[lerp(-0.3, 0.2, k), 1.6, lerp(7.6, 6.9, k)]} look={[0, 1.15, -1]} fov={44} />
      <BarnExterior t={t} t0={a_out.start} />
    </>;
  },
});
// 19. Стойла заняты: мужики с консолями лежат в соломе
const AGRI_BACK = Math.max(a_st.start + 0.9, A.end - 0.5);
shots.push({
  id: "bk_barn_stalls", from: a_st.start, to: AGRI_BACK, bg: "#5a2a1a",
  r: (t) => {
    const k = easeInOut(prog(t, a_st.start, AGRI_BACK));
    return <>
      <Cam pos={[lerp(-0.5, 0.3, k), 3.1, 4.4]} look={[0, 0.65, -1.2]} fov={44} />
      <BarnInterior t={t} men={9} sheep={false} lying board={false} />
      <Sheep position={[2.0, 0, 0.6]} t={t} s={0.9} flip eyes="sad" />
    </>;
  },
});
// 20. Снова министр сельского хозяйства — рыдает
shots.push({
  id: "bk_agri_sob", from: AGRI_BACK, to: P2.start, bg: "#0b0d0c",
  r: (t) => <>
    <Cam pos={[1.72, 1.75, 0.35]} look={[1.6, 1.15, -2.95]} fov={40} />
    <Room t={t} def={{}} hide={["slick", "old", "curly"]} agri={agriSob(t, { mouth: "wavy", armL: 1.95, handL: SHEEP_PHOTO, armR: 2.35 + Math.sin(twos(t) * 13) * 0.15, eyes: "closed" })} />
    <TearSpray t={t} x={AGRI_SPOT[0]} y={1.5} z={AGRI_SPOT[2]} />
  </>,
  o: () => <Vignette />,
});
// 21. «Это вторжение...» — темно, медленный наезд
shots.push({
  id: "bk_pm_dark", from: P2.start, to: q_3.start, bg: "#050605",
  r: (t) => {
    const k = easeInOut(prog(t, P2.start, q_3.start));
    return <>
      <Cam pos={[0, lerp(1.75, 1.65, k), lerp(0.2, -0.9, k)]} look={[0, 1.15, -3.55]} fov={38} />
      <Room t={t} dark={1} hide={["old", "slick"]} pm={{ eyes: "squint", brow: -0.7, mouth: "talk", mouthOpen: pmMouth(t), lookY: -0.3 }} />
    </>;
  },
  o: () => <Vignette k={0.85} />,
});
// 22. «Началась Третья мировая!» — сверхкрупно, глаза
shots.push({
  id: "bk_pm_ww3", from: q_3.start, to: WW3_CUT, bg: "#050605",
  r: (t) => {
    const k = easeOut(prog(t, q_3.start, WW3_CUT));
    return <>
      <Cam pos={[0, 1.65, lerp(-0.7, -1.5, k)]} look={[0, 1.22, -3.55]} fov={36} roll={lerp(0, -0.08, k)} />
      <Room t={t} dark={1} pm={{ eyes: "angry", mouth: "talk", mouthOpen: pmMouth(t), sweat: 1 }} />
    </>;
  },
  o: () => <Vignette k={0.8} color="40,0,0" />,
});
// 22b. Экран: на карте штамп «ВТОРЖЕНИЕ»
shots.push({
  id: "bk_stamp", from: WW3_CUT, to: q_wall.start, bg: "#050605",
  r: (t) => {
    const k = easeOut(prog(t, WW3_CUT, q_wall.start));
    const [sx, sy] = camShake(t, [[WW3_CUT + 0.1, 0.12]]);
    return <>
      <Cam pos={[-0.15 + sx, 2.1 + sy, lerp(-4.7, -4.1, k)]} look={[0, 2.12, 5]} fov={24} roll={0.04} />
      <Room t={t} dark={1} backView stamp={t > WW3_CUT + 0.1} />
    </>;
  },
  o: () => <Vignette k={0.8} color="40,0,0" />,
});
// 23. «Строим стену!» — кулак об стол, тревога
shots.push({
  id: "bk_slam", from: q_wall.start, to: q_now.start, bg: "#0b0d0c",
  r: (t) => {
    const up = prog(t, q_wall.start, T_SLAM - 0.05);
    const down = prog(t, T_SLAM - 0.05, T_SLAM);
    const armR = t < T_SLAM - 0.05 ? lerp(1.2, 2.9, easeOut(up)) : lerp(2.9, 0.75, down);
    const [sx, sy] = camShake(t, [[T_SLAM, 0.16]]);
    const jump = t > T_SLAM ? Math.max(0, Math.sin(prog(t, T_SLAM, T_SLAM + 0.3) * Math.PI)) * 0.18 : 0;
    const alarm = t >= T_SLAM;
    return <>
      <Cam pos={[0.35 + sx, 2.1 + sy, -0.3]} look={[0.2, 1.05, -3.3]} fov={42} />
      <Room t={t} alarm={alarm} tableJump={jump} hide={["curly"]}
        pm={{ eyes: "angry", mouth: "scream", mouthOpen: 0.4 + pmMouth(t) * 0.6, armR, armL: 0.5, bodyTilt: t > T_SLAM - 0.05 ? -0.12 : 0.05, sweat: 1, squash: t > T_SLAM && t < T_SLAM + 0.1 ? 1.12 : 1 }}
        def={{ eyes: "wide", bodyTilt: 0.1 }}
        agri={agriSob(t, { mouth: "o", eyes: "wide", tears: 0.6 })}
        extras={alarm ? { bun: { eyes: "wide", bodyTilt: 0.2 }, old: { eyes: "wide" }, slick: { eyes: "wide", mouth: "o" } } : undefined} />
      {/* удар кулака: вспышка-звезда и трещины на столе */}
      {t >= T_SLAM && t < T_SLAM + 0.35 && <group position={[0.6, 0.8, -3.3]} scale={0.6 + prog(t, T_SLAM, T_SLAM + 0.15) * 0.6}>
        <mesh material={glow("#fff3a0", 0.95)} geometry={STAR} />
      </group>}
      {t >= T_SLAM && [0, 1, 2, 3].map((i) => <mesh key={i} position={[0.45 + i * 0.06, 0.655, -2.9 - i * 0.03]} rotation={[-Math.PI / 2, 0, i * 1.3]} material={glow("#111")}><planeGeometry args={[0.32, 0.018]} /></mesh>)}
    </>;
  },
  o: (t) => <><RedFlash t={t} from={T_SLAM} /><Vignette /><Bam t={t} at={T_SLAM} text="БАМ!" x={300} y={420} /></>,
});
// 24. «Немедленно!» — сверхкрупно, красная мигалка
shots.push({
  id: "bk_now", from: q_now.start, to: NOW_CUT, bg: "#0b0d0c",
  r: (t) => {
    const k = easeOut(prog(t, q_now.start, NOW_CUT));
    const [sx, sy] = camShake(t, [[q_now.start, 0.12], [q_now.start + 0.5, 0.08]], 0.03);
    return <>
      <Cam pos={[sx, 1.65 + sy, lerp(-0.4, -1.45, k)]} look={[0, 1.2, -3.55]} fov={38} roll={lerp(0.06, -0.06, k)} />
      <Room t={t} alarm pm={{ eyes: "angry", mouth: "scream", mouthOpen: 0.5 + pmMouth(t) * 0.5, sweat: 1, armL: 2.0, armR: 2.8, headTilt: Math.sin(twos(t) * 19) * 0.08 }} />
    </>;
  },
  o: (t) => <><RedFlash t={t} from={q_now.start} /><Vignette k={0.7} color="60,0,0" /></>,
});
// 25. Общий план под тревогой: все мечутся, ПМ тычет пальцем
shots.push({
  id: "bk_now_wide", from: NOW_CUT, to: W.start, bg: "#0b0d0c",
  r: (t) => {
    const k = easeOut(prog(t, NOW_CUT, W.start));
    const tq = twos(t);
    const [sx, sy] = camShake(t, [[NOW_CUT, 0.08]], 0.02);
    return <>
      <Cam pos={[lerp(0.1, 0.4, k) + sx, lerp(2.4, 2.9, k) + sy, lerp(0.0, 1.6, k)]} look={[0, 1.3, -2.8]} fov={44} roll={lerp(-0.05, 0.03, k)} />
      <Room t={t} alarm hide={["old", "slick"]}
        pm={{ eyes: "angry", mouth: "scream", mouthOpen: 0.4 + pmMouth(t) * 0.6, sweat: 1, armL: 0.4, armR: 1.65 + Math.sin(tq * 16) * 0.1, bodyTilt: -0.08 }}
        def={{ eyes: "angry", mouth: "scream", mouthOpen: 0.7, armR: 2.7, armL: 0.3, handR: <group rotation={[0, 0, 0.3]}><Binoculars /></group> }}
        agri={agriSob(t, { eyes: "wide", mouth: "scream", tears: 0.5, armL: 2.6, armR: 2.6 })}
        extras={{ bun: { eyes: "wide", mouth: "scream", mouthOpen: 0.8, armL: 2.6, armR: 2.6, bodyTilt: Math.sin(tq * 14) * 0.15 }, curly: { eyes: "crazy", mouth: "scream", mouthOpen: 0.8, armL: 2.4, armR: 2.7, bodyTilt: -Math.sin(tq * 14) * 0.15, sweat: 1 } }} />
    </>;
  },
  o: (t) => <><RedFlash t={t} from={NOW_CUT} /><Vignette k={0.6} color="60,0,0" /></>,
});

export const SCENES: SceneDef[] = shots.map((s) => ({
  id: s.id, from: s.from, to: s.to, bg: s.bg, render3d: s.r, overlay: s.o ? (t) => s.o!(t) : undefined,
}));

// для отладки
void Character; void CAST; void DEF_POS; void BigScreen; void clamp01; void easeIn;
