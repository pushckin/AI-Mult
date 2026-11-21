// Сцена 3: Бренда и Стейси (те же жёсткие куклы, что Тони/Хлоя: Cast.tsx) + реквизит: монтировка, пиво, окурок, батончик.
import React, { useMemo } from "react";
import * as THREE from "three";
import { Part, Flat, rbox, rcyl, sphereGeo, Shadow, planeGeo, circleGeo } from "./toon";
import { Decal, Line } from "./decal";
import type { PP } from "./Person";
import { Eye3, headPt, headNormalQ } from "./Eyes3d";
import { D2R } from "./util";
import { Arm2, Leg2, Brows, Mouth, Sweat, polyGeo, Dot } from "./Cast";
import type { ArmSpec, LegSpec } from "./Cast";

export type Cast3Kind = "brenda" | "stacey";
/** Дополнительные флаги куклы. Сторона руки: 1 - левая (+x торса), 2 - правая (-x). При развороте влево (ry<0) ближняя к камере - левая. */
export interface X3 {
  cig?: number; // 1 - окурок во рту (тлеет)
  stub?: number; // тлеющий окурок в пальцах
  beer?: number; // бутылка
  bar?: number; // батончик
  crowbar?: number; // монтировка (Стейси)
}

export const COL3 = {
  brenda: { skin: "#dc9a6a", skinD: "#c07a4c", hair: "#3b2418", flannel: "#c23a24", plaid: "#7c1c12", plaid2: "#f0c2a0", jeans: "#37589a", belt: "#4a2e1a", buckle: "#e8c53a", boot: "#8a5a2c", sole: "#2a1c12", oil: "#2a1810", ink: "#1c2a6a" },
  stacey: { skin: "#f7d8c0", hair: "#ffe45a", vest: "#1c1a24", stud: "#c9ccd8", pants: "#5d7040", pantsD: "#3e4e2a", boot: "#16141c", sole: "#f6f6fb", lace: "#ff3a3a", gold: "#ffd23a" },
};

// ---------- реквизит ----------
/** Монтировка: ручка (красная обмотка) в кулаке, начало - ладонь; стержень вверх по +y, на конце загнутый коготь */
export const Crowbar: React.FC = () => (
  <group>
    <Part geo={rcyl(0.034, 0.034, 1.05, 0.012, 10)} color="#aab3c9" px={3} position={[0, 0.32, 0]} />
    <Part geo={rcyl(0.047, 0.047, 0.3, 0.015, 10)} color="#e83a3a" px={2.4} position={[0, -0.05, 0]} />
    <Part geo={rbox(0.075, 0.2, 0.04, 0.015)} color="#aab3c9" px={3} position={[0, 0.9, 0.065]} rotation={[0.6, 0, 0]} />
    <Part geo={rbox(0.075, 0.16, 0.04, 0.015)} color="#aab3c9" px={3} position={[0, 1.02, 0.17]} rotation={[1.1, 0, 0]} />
    <Part geo={rbox(0.09, 0.13, 0.03, 0.012)} color="#aab3c9" px={2.6} position={[0, -0.26, 0]} />
  </group>
);
/** Пивная бутылка: горлышко вверх, начало - ладонь */
export const Beer: React.FC = () => (
  <group position={[0, 0.1, 0]}>
    <Part geo={rcyl(0.075, 0.075, 0.3, 0.035, 14)} color="#7a4a1c" px={3} position={[0, 0, 0]} />
    <Part geo={rcyl(0.075, 0.034, 0.12, 0.02, 14)} color="#7a4a1c" px={3} position={[0, 0.2, 0]} />
    <Part geo={rcyl(0.034, 0.034, 0.12, 0.012, 12)} color="#7a4a1c" px={3} position={[0, 0.3, 0]} />
    <Part geo={rcyl(0.04, 0.04, 0.03, 0.01, 12)} color="#ffd23a" px={2.4} position={[0, 0.375, 0]} />
    <Flat geo={planeGeo} color="#f4e8c0" position={[0, 0.0, 0.078]} scale={[0.1, 0.17, 1]} />
    <Flat geo={planeGeo} color="#d63a2a" position={[0, 0.02, 0.0795]} scale={[0.1, 0.05, 1]} />
  </group>
);
/** Тлеющий окурок в пальцах */
export const Stub: React.FC = () => (
  <group>
    <Part geo={rcyl(0.026, 0.026, 0.2, 0.01, 8)} color="#f4ead0" px={2.4} position={[0, 0.03, 0.02]} rotation={[1.1, 0, 0]} />
    <Part geo={sphereGeo(8)} color="#ff6a1c" px={0} position={[0, 0.095, 0.115]} scale={0.032} />
  </group>
);
/** Последний батончик: обёртка с красной полосой, скруглённые «хвостики» */
export const CandyBar: React.FC = () => (
  <group>
    <Part geo={rbox(0.42, 0.13, 0.07, 0.03)} color="#ffd23a" px={2.8} />
    <Flat geo={planeGeo} color="#e8263a" position={[0, 0, 0.0365]} scale={[0.22, 0.09, 1]} />
    {[1, -1].map((s) => (
      <Part key={s} geo={rbox(0.06, 0.1, 0.03, 0.01)} color="#c9a420" px={2} position={[s * 0.24, 0, 0]} />
    ))}
  </group>
);

const torusGeo = new THREE.TorusGeometry(0.04, 0.012, 8, 16);
// ---------- лица ----------
const BrendaFace: React.FC<{ p: PP }> = ({ p }) => {
  const c = COL3.brenda;
  return (
    <>
      {/* жёсткая короткая причёска набок + бакенбарды */}
      <Decal lon={0} lat={63} rx={1.3} ry={0.72} color={c.hair} ring={0.03} lift={1.012} />
      <Decal lon={-62} lat={30} rx={0.4} ry={0.5} color={c.hair} lift={1.01} />
      <Decal lon={62} lat={30} rx={0.4} ry={0.5} color={c.hair} lift={1.01} />
      {/* тяжёлые брови, мешки под глазами, щетина на челюсти, мазут на щеке и лбу */}
      <Brows p={p} lat={34} lon={22} w={0.082} color={c.hair} />
      {([1, -1] as const).map((s) => (
        <Line key={s} lon={s * 22} lat={-6} pts={[[-0.2, 0.0], [0, -0.03], [0.2, 0.0]]} w={0.022} color={c.skinD} lift={1.008} />
      ))}
      <Decal lon={0} lat={-50} rx={1.05} ry={0.5} color={c.skinD} lift={1.005} />
      <Decal lon={-34} lat={-14} rx={0.2} ry={0.12} color={c.oil} lift={1.009} rot={25} />
      <Decal lon={18} lat={50} rx={0.12} ry={0.08} color={c.oil} lift={1.011} rot={-20} />
      <Sweat p={p} />
      <Mouth p={p} lat={-38} line="#2a0a0a" inner="#3a0a14" />
    </>
  );
};
const StaceyFace: React.FC<{ p: PP }> = ({ p }) => {
  const c = COL3.stacey;
  return (
    <>
      <Brows p={p} lat={34} lon={21} w={0.052} color="#8a6a10" />
      {/* прорезь в брови и золотая точка в носу */}
      <Line lon={-31} lat={33} pts={[[-0.1, -0.05], [0.1, 0.07]]} w={0.016} color="#fbfbf6" lift={1.014} />
      <Decal lon={9} lat={-13} rx={0.035} ry={0.035} color={c.gold} ring={0.014} lift={1.012} />
      <Decal lon={-24} lat={-10} rx={0.09} ry={0.05} color="#d98a6a" lift={1.006} />
      <Decal lon={24} lat={-10} rx={0.09} ry={0.05} color="#d98a6a" lift={1.006} />
      <Sweat p={p} />
      <Mouth p={p} lat={-35} line="#2a0a0a" inner="#5a0a1a" />
    </>
  );
};

// ---------- сборка ----------
interface Build {
  head: { rx: number; ry: number; rz: number };
  headY: number;
  skin: string;
  pelvis: [number, number, number];
  pelvisCol: string;
  torso: [number, number, number];
  arm: ArmSpec;
  leg: LegSpec;
}
const B = COL3.brenda;
const S = COL3.stacey;
const BUILD: Record<Cast3Kind, Build> = {
  brenda: {
    head: { rx: 0.58, ry: 0.5, rz: 0.48 },
    headY: 1.04,
    skin: B.skin,
    pelvis: [0.9, 0.24, 0.5],
    pelvisCol: B.jeans,
    torso: [1.0, 0.64, 0.56],
    arm: { sx: 0.58, up: 2.1, fo: 1.75, hand: 1.3, upCol: B.skin, foCol: B.skin, bicep: 1.25, bicepCol: B.skin, skin: B.skin, len: 1.2, shoulderCol: B.flannel },
    leg: {
      hipX: 0.24, th: 1.55, ca: 1.3, thCol: B.jeans, caCol: B.jeans,
      shoe: (
        <>
          <Part geo={rbox(0.34, 0.2, 0.5, 0.08)} color={B.boot} position={[0, -0.12, 0.1]} />
          <Part geo={rbox(0.36, 0.05, 0.52, 0.02)} color={B.sole} px={2.4} position={[0, -0.215, 0.1]} />
        </>
      ),
    },
  },
  stacey: {
    head: { rx: 0.5, ry: 0.45, rz: 0.42 },
    headY: 0.93,
    skin: S.skin,
    pelvis: [0.5, 0.2, 0.32],
    pelvisCol: S.pants,
    torso: [0.56, 0.6, 0.34],
    arm: { sx: 0.37, up: 0.82, fo: 0.74, hand: 0.9, upCol: S.skin, foCol: S.skin, skin: S.skin, len: 1.2, shoulderCol: S.vest },
    leg: {
      hipX: 0.14, th: 0.9, ca: 0.82, thCol: S.pants, caCol: S.pants,
      shoe: (
        <>
          <Part geo={rbox(0.2, 0.26, 0.34, 0.06)} color={S.boot} position={[0, -0.08, 0.05]} />
          <Part geo={rbox(0.21, 0.05, 0.36, 0.02)} color={S.sole} px={2.4} position={[0, -0.215, 0.05]} />
        </>
      ),
    },
  },
};
/** Геометрии рук для IK (согласованы с Arm2: l1 = 0.2·len, l2 = 0.3·len) */
export const ARM3 = {
  brenda: { sx: 0.58, sy: 0.5, l1: 0.2 * 1.2, l2: 0.3 * 1.2 },
  stacey: { sx: 0.37, sy: 0.5, l1: 0.2 * 1.2, l2: 0.3 * 1.2 },
};

const StaceyHair: React.FC<{ h: { rx: number; ry: number; rz: number } }> = ({ h }) => {
  const spikes: Array<[number, number, number]> = [[0, 84, 1.2], [0, 66, 1.0], [24, 74, 1.0], [-24, 74, 1.0], [48, 62, 0.95], [-48, 62, 0.95], [72, 52, 0.9], [-72, 52, 0.9], [26, 54, 0.9], [-26, 54, 0.9], [0, 46, 0.85], [90, 36, 0.75], [-90, 36, 0.75], [140, 60, 0.9], [-140, 60, 0.9], [180, 70, 1.0]];
  return (
    <>
      {spikes.map(([lon, lat, k], i) => {
        const pos = headPt(h, lon, lat, -0.04);
        const q = headNormalQ(h, lon, lat);
        return (
          <group key={i} position={pos.toArray() as [number, number, number]} quaternion={q}>
            <group rotation={[Math.PI / 2, 0, 0]}>
              <Part geo={rcyl(0.085 * k, 0.012, 0.25 * k, 0.012, 8)} color={COL3.stacey.hair} px={3} position={[0, 0.115 * k, 0]} />
            </group>
          </group>
        );
      })}
    </>
  );
};

export const Cast3: React.FC<{ pose: PP; kind: Cast3Kind; x?: X3; shadow?: boolean; groundY?: number }> = ({ pose: p, kind, x = {}, shadow = true, groundY = 0 }) => {
  const b = BUILD[kind];
  const [pw, ph, pd] = b.pelvis;
  const [tw, th, td] = b.torso;
  const isB = kind === "brenda";
  const tex = useMemo(() => polyGeo("wrench", [[-0.05, -0.26], [0.05, -0.26], [0.05, 0.08], [0.12, 0.12], [0.12, 0.24], [0.04, 0.24], [0.04, 0.16], [-0.04, 0.16], [-0.04, 0.24], [-0.12, 0.24], [-0.12, 0.12], [-0.05, 0.08]]), []);
  const vneck = useMemo(() => polyGeo("brenda_v", [[-0.24, 0.0], [0.24, 0.0], [0.07, -0.34], [-0.07, -0.34]]), []);
  // предметы по рукам; ориентация правой [hp, my, 0], левой [cup, py, 0]
  const item = (side: number) => (x.beer === side ? <Beer /> : x.stub === side ? <Stub /> : x.bar === side ? <CandyBar /> : x.crowbar === side ? <Crowbar /> : null);
  const heldL = item(1);
  const heldR = item(2);
  const heldOriR: [number, number, number] | undefined = heldR ? [p.hp, p.my, 0] : undefined;
  const heldOriL: [number, number, number] | undefined = heldL ? [p.cup, p.py, 0] : undefined;
  const hr = heldR ? 2 : p.hr;
  const hl = heldL ? 2 : p.hl;
  return (
    <>
      {shadow && <Shadow position={[p.x, groundY + 0.02, p.z]} w={(isB ? 0.78 : 0.5) * p.scale} d={0.36 * p.scale} />}
      <group position={[p.x, p.y, p.z]} scale={p.scale}>
        <group rotation={[0, 0, p.rz * D2R]}>
          <group rotation={[0, p.ry * D2R, 0]}>
            <group rotation={[p.rx * D2R, 0, 0]}>
              {/* таз, ремень и ноги */}
              <Part geo={rbox(pw, ph, pd, 0.07)} color={b.pelvisCol} position={[0, -0.02, 0]} />
              <Part geo={rbox(pw + 0.03, 0.07, pd + 0.03, 0.02)} color={isB ? B.belt : "#17151e"} px={2.4} position={[0, 0.07, 0]} />
              {isB ? (
                <Flat geo={planeGeo} color={B.buckle} position={[0, 0.07, pd / 2 + 0.022]} scale={[0.14, 0.06, 1]} />
              ) : (
                [-0.18, -0.06, 0.06, 0.18].map((sx) => <Flat key={sx} geo={circleGeo} color={S.stud} position={[sx, 0.07, pd / 2 + 0.022]} scale={0.022} />)
              )}
              <Leg2 side={1} swing={p.llx} spread={p.llz} knee={p.llk} spec={b.leg} toe={p.toe} />
              <Leg2 side={-1} swing={p.lrx} spread={p.lrz} knee={p.lrk} spec={b.leg} toe={p.toe} />
              {/* торс */}
              <group rotation={[p.tl * D2R, p.ty * D2R, p.tz * D2R]}>
                {isB ? (
                  <>
                    <Part geo={rbox(tw, th, td, 0.14)} color={B.flannel} position={[0, 0.3, 0]} />
                    {/* клетка фланели: плоские полосы */}
                    {[0.12, 0.3, 0.48].map((y) => (
                      <Flat key={y} geo={planeGeo} color={B.plaid} position={[0, y, td / 2 + 0.006]} scale={[tw - 0.26, 0.05, 1]} />
                    ))}
                    {[-0.3, -0.12, 0.12, 0.3].map((px) => (
                      <Flat key={px} geo={planeGeo} color={px < 0 ? B.plaid2 : B.plaid} position={[px, 0.3, td / 2 + 0.007]} scale={[0.035, th - 0.2, 1]} />
                    ))}
                    {/* V-вырез и масляные пятна */}
                    <Flat geo={vneck} color={B.skin} position={[0, 0.6, td / 2 + 0.009]} />
                    <Dot w={tw} d={td} x={-0.28} y={0.2} r={0.07} sx={1.5} color={B.oil} rot={0.5} lift={0.012} />
                    <Dot w={tw} d={td} x={0.3} y={0.38} r={0.05} sx={1.3} color={B.oil} rot={-0.4} lift={0.012} />
                    <Dot w={tw} d={td} x={0.12} y={0.08} r={0.04} sx={1.2} color={B.oil} lift={0.012} />
                    {/* кармашки и воротник */}
                    {([1, -1] as const).map((s) => (
                      <Part key={s} geo={rbox(0.15, 0.18, 0.03, 0.012)} color={B.flannel} px={2.6} position={[s * 0.22, 0.56, td / 2 + 0.01]} rotation={[0, 0, -s * 0.55]} />
                    ))}
                    {/* шея и татуировка «разводной ключ» */}
                    <Part geo={rcyl(0.27, 0.29, 0.32, 0.05, 22)} color={B.skin} px={2.8} position={[0, 0.7, 0]} />
                    <Flat geo={tex} color={B.ink} position={[-0.12, 0.7, 0.285]} rotation={[0, -0.12, 0.62]} scale={1.15} />
                  </>
                ) : (
                  <>
                    <Part geo={rbox(tw, th, td, 0.12)} color={S.skin} position={[0, 0.3, 0]} />
                    {/* кожаная жилетка на голое тело: две полы, лацканы, заклёпки */}
                    {([1, -1] as const).map((s) => (
                      <React.Fragment key={s}>
                        <Part geo={rbox(0.2, 0.58, td + 0.04, 0.07)} color={S.vest} px={2.8} position={[s * 0.2, 0.3, 0]} />
                        <Part geo={rbox(0.17, 0.2, 0.03, 0.012)} color={S.vest} px={2.4} position={[s * 0.14, 0.56, td / 2 + 0.03]} rotation={[0, 0, -s * 0.5]} />
                        {[0.12, 0.28, 0.44].map((y) => (
                          <Flat key={y} geo={circleGeo} color={S.stud} position={[s * 0.2, y, td / 2 + 0.024]} scale={0.02} />
                        ))}
                      </React.Fragment>
                    ))}
                  </>
                )}
                {/* руки */}
                <Arm2 side={1} swing={p.alx} abd={p.alz} elbow={p.ale} twist={p.atl} spec={b.arm} hand={hl} held={heldL} heldOri={heldOriL} heldY={-0.03} />
                <Arm2 side={-1} swing={p.arx} abd={p.arz} elbow={p.are} twist={p.atr} spec={b.arm} hand={hr} held={heldR} heldOri={heldOriR} heldY={-0.03} />
                {/* голова */}
                <group position={[p.hdx, b.headY + p.hdy, 0]} rotation={[p.hx * D2R, p.hy * D2R, p.hz * D2R]}>
                  <Part geo={sphereGeo(32)} color={b.skin} px={3.6} scale={[b.head.rx, b.head.ry, b.head.rz]} />
                  {[1, -1].map((s) => (
                    <Part key={s} geo={sphereGeo(14)} color={b.skin} px={2.8} position={[s * (b.head.rx + 0.005), -0.04, -0.02]} scale={[0.05, 0.1, 0.075]} />
                  ))}
                  {!isB && [1, -1].map((s) => <Part key={`r${s}`} geo={torusGeo} color={S.gold} px={2.2} position={[s * (b.head.rx + 0.04), -0.1, -0.02]} rotation={[0, Math.PI / 2, 0]} />)}
                  {!isB && <StaceyHair h={b.head} />}
                  <Eye3 h={b.head} side={1} lon={isB ? 22 : 21} lat={6} re={isB ? 0.125 : 0.13} st={p.eyeL} lx={p.lx} ly={p.ly} lid={b.skin} />
                  <Eye3 h={b.head} side={-1} lon={isB ? 22 : 21} lat={6} re={isB ? 0.125 : 0.13} st={p.eyeR} lx={p.lx} ly={p.ly} lid={b.skin} />
                  <group scale={[b.head.rx, b.head.ry, b.head.rz]}>{isB ? <BrendaFace p={p} /> : <StaceyFace p={p} />}</group>
                  {/* окурок в углу рта */}
                  {isB && x.cig ? (
                    <group position={headPt(b.head, 15, -37, 0.0).toArray() as [number, number, number]} rotation={[0.2, 0.12, 0]}>
                      <Part geo={rcyl(0.034, 0.034, 0.36, 0.012, 10)} color="#f4ead0" px={2.6} position={[0, 0, 0.18]} rotation={[Math.PI / 2, 0, 0]} />
                      <Part geo={rcyl(0.036, 0.036, 0.07, 0.01, 10)} color="#c9822a" px={0} position={[0, 0, 0.04]} rotation={[Math.PI / 2, 0, 0]} />
                      <Part geo={sphereGeo(10)} color="#ff5a1c" px={2} position={[0, 0, 0.37]} scale={0.04} />
                    </group>
                  ) : null}
                </group>
              </group>
            </group>
          </group>
        </group>
      </group>
    </>
  );
};
