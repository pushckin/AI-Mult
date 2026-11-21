// Сцена 4: Офицер Джексон, Стейси, Бренда, спецназовец. Куклы той же конструкции, что и Cast.tsx (рука/нога скопированы, общие файлы не трогаем).
import React from "react";
import * as THREE from "three";
import { Part, Flat, rbox, rcyl, sphereGeo, Shadow, planeGeo, circleGeo, extrude } from "./toon";
import { Decal, Line } from "./decal";
import { PP, P0, mOpen, mClosed } from "./Person";
import { Eye3, HeadDim } from "./Eyes3d";
import { D2R } from "./util";
import type { ArmGeom } from "./ik";

export interface PP4 extends PP {
  gun: number; // дробовик в руках (1)
  gx: number; gy: number; gz: number; gp: number; gw: number; // положение дробовика в торсе, тангаж (вверх +), рыскание
  rk: number; // ход цевья/затвора 0..1
  cb: number; // монтировка в правой руке
  mst: number; // дёргается ус
  sp: number; // слюна (1), пот-капли
  tg: number; // язык
  ps: number; // зрачок: 0 норм, 1 точка
}
export const P4: PP4 = { ...P0, gun: 0, gx: 0.2, gy: 0.66, gz: 0.55, gp: 0, gw: 0, rk: 0, cb: 0, mst: 0, sp: 0, tg: 0, ps: 0 };
export const mix4 = (...parts: Array<Partial<PP4> | undefined>): PP4 => Object.assign({}, P4, ...parts.filter(Boolean)) as PP4;

export type Kind4 = "jackson" | "stacey" | "brenda" | "swat";
export const COL4 = {
  jackson: { skin: "#f2a58a", shirt: "#6f9df0", shirtD: "#4f78c8", pants: "#26307f", belt: "#15131a", boot: "#17151c", hat: "#1f2c70", gold: "#f6c628", hair: "#b8b8c8", stache: "#4a2a18" },
  stacey: { skin: "#e9b48e", vest: "#2e2636", pants: "#3a58a8", boot: "#6e4a2c", hair: "#2b1b16", metal: "#c9cfdc" },
  brenda: { skin: "#cf9468", flan: "#d8383c", flanD: "#8e1e2a", pants: "#2d4180", boot: "#3a2c24", hair: "#5a3420", wrench: "#9aa3b8" },
  swat: { skin: "#e8b48e", armor: "#2a2e3c", armorL: "#464d62", pants: "#23262f", boot: "#15151a", glove: "#2a2c34", visor: "#3b6aa8", text: "#ffd72a" },
};

// ---------- текст на плоскости ----------
const texCache = new Map<string, THREE.CanvasTexture>();
const FONT = "'Arial Black','Impact','DejaVu Sans',sans-serif";
export const textTex = (key: string, w: number, h: number, draw: (g: CanvasRenderingContext2D) => void) => {
  let t = texCache.get(key);
  if (!t) {
    const c = document.createElement("canvas");
    c.width = w;
    c.height = h;
    draw(c.getContext("2d")!);
    t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 4;
    texCache.set(key, t);
  }
  return t;
};
const swatTex = () =>
  textTex("swat_chest", 256, 96, (g) => {
    g.clearRect(0, 0, 256, 96);
    g.fillStyle = COL4.swat.text;
    g.textAlign = "center";
    g.textBaseline = "middle";
    g.font = `900 78px ${FONT}`;
    g.fillText("SWAT", 128, 50);
  });

// ---------- руки и ноги (копия Arm2/Leg2 из Cast.tsx) ----------
interface ArmSpec {
  sx: number; y?: number; up: number; fo: number; hand: number; upCol: string; foCol: string; upSleeve?: boolean; foSleeve?: boolean;
  bicep?: number; skin: string; len?: number; shoulderCol?: string;
}
export const armGeom4 = (s: { sx: number; len?: number }): ArmGeom => ({ sx: s.sx, sy: 0.5, l1: 0.2 * (s.len ?? 1), l2: 0.3 * (s.len ?? 1) });
const Hand: React.FC<{ s: ArmSpec; kind: number; side: 1 | -1 }> = ({ s, kind, side }) => {
  const k = s.hand * (kind === 2 ? 1.06 : 1);
  return (
    <group position={[0, -0.27 * (s.len ?? 1), 0]}>
      <Part geo={rbox(0.19 * k, 0.2 * k, 0.15 * k, 0.07 * k)} color={s.skin} px={3} position={[0, -0.03, 0]} />
      <Part geo={sphereGeo(12)} color={s.skin} px={2.6} position={[-side * 0.095 * k, -0.01, 0.045 * k]} scale={[0.05 * k, 0.07 * k, 0.05 * k]} />
      {kind === 2 && <Part geo={rbox(0.15 * k, 0.05 * k, 0.04, 0.02)} color={s.skin} px={2.4} position={[0, -0.07 * k, 0.085 * k]} />}
      {kind === 1 && <Part geo={rcyl(0.045 * k, 0.042 * k, 0.2, 0.018, 12)} color={s.skin} px={2.8} position={[0, -0.2, 0.01]} />}
    </group>
  );
};
const Arm4: React.FC<{ side: 1 | -1; swing: number; abd: number; elbow: number; spec: ArmSpec; hand: number; held?: React.ReactNode; heldOri?: [number, number, number]; heldY?: number }> = ({ side, swing, abd, elbow, spec: s, hand, held, heldOri, heldY = 0 }) => {
  const len = s.len ?? 1;
  let heldQ: THREE.Quaternion | undefined;
  if (held && heldOri) {
    const rArm = new THREE.Quaternion().setFromEuler(new THREE.Euler(-swing * D2R, 0, side * abd * D2R, "XYZ")).multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(-elbow * D2R, 0, 0)));
    const want = new THREE.Quaternion().setFromEuler(new THREE.Euler(heldOri[0] * D2R, heldOri[1] * D2R, heldOri[2] * D2R, "YXZ"));
    heldQ = rArm.invert().multiply(want);
  }
  const bk = s.bicep ?? 0;
  return (
    <group position={[side * s.sx, s.y ?? 0.5, 0]} rotation={[-swing * D2R, 0, side * abd * D2R]}>
      <Part geo={sphereGeo(16)} color={s.shoulderCol ?? s.upCol} px={2.6} position={[0, -0.02, 0]} scale={(s.upSleeve ? 0.115 : 0.095) * s.up} />
      <Part geo={rcyl((s.upSleeve ? 0.112 : 0.088) * s.up, (s.upSleeve ? 0.105 : 0.082) * s.up, 0.2 * len, 0.035)} color={s.upCol} position={[0, -0.09 * len, 0]} />
      {bk > 0 && <Part geo={sphereGeo(16)} color={s.skin} px={2.4} position={[0, -0.1 * len, 0.07 * s.up]} scale={[0.1 * bk, 0.12 * bk, 0.085 * bk]} />}
      <group position={[0, -0.2 * len, 0]} rotation={[-elbow * D2R, 0, 0]}>
        <Part geo={sphereGeo(14)} color={s.upCol === s.foCol ? s.foCol : s.upCol} px={2.6} scale={0.085 * s.fo} />
        <Part geo={rcyl((s.foSleeve ? 0.086 : 0.078) * s.fo, (s.foSleeve ? 0.092 : 0.086) * s.fo, 0.26 * len, 0.035)} color={s.foCol} position={[0, -0.11 * len, 0]} />
        <Hand s={s} kind={hand} side={side} />
        {held && (
          <group position={[0, -0.27 * len + heldY, 0]} quaternion={heldQ}>
            {held}
          </group>
        )}
      </group>
    </group>
  );
};
interface LegSpec { hipX: number; th: number; ca: number; thCol: string; caCol: string; shoe: React.ReactNode }
const Leg4: React.FC<{ side: 1 | -1; swing: number; spread: number; knee: number; spec: LegSpec }> = ({ side, swing, spread, knee, spec: s }) => (
  <group position={[side * s.hipX, -0.04, 0]} rotation={[-swing * D2R, 0, side * spread * D2R]}>
    <Part geo={rcyl(0.125 * s.th, 0.12 * s.th, 0.2, 0.04)} color={s.thCol} position={[0, -0.09, 0]} />
    <group position={[0, -0.19, 0]} rotation={[knee * D2R, 0, 0]}>
      <Part geo={rcyl(0.118 * s.ca, 0.112 * s.ca, 0.17, 0.04)} color={s.caCol} position={[0, -0.05, 0]} />
      <group position={[0, -0.14, 0.03]}>
        <group position={[0, 0.14, -0.03]}>{s.shoe}</group>
      </group>
    </group>
  </group>
);

// ---------- общие лицевые элементы ----------
const Brows: React.FC<{ p: PP; lat: number; lon?: number; w?: number; color: string }> = ({ p, lat, lon = 20, w = 0.04, color }) => (
  <>
    {([1, -1] as const).map((side) => (
      <Line key={side} lon={side * lon} lat={lat + p.brow * 3} pts={[[-0.26, -0.02 * p.brow * side], [0.0, 0.03 + 0.03 * p.brow], [0.26, 0.0]]} w={w} color={color} rot={side * (-10 + p.brow * -16)} lift={1.012} />
    ))}
  </>
);
const Mouth: React.FC<{ p: PP; lat: number; line?: string; inner?: string; teeth?: string }> = ({ p, lat, line = "#0c0a10", inner = "#2a0a12", teeth = "#fbfbf6" }) => (
  <>
    <Line lon={0} lat={lat} pts={[[-0.26, -0.02], [0, 0.03], [0.26, -0.02]]} w={0.026} color={line} lift={1.008} visible={mClosed(p)} />
    <Decal lon={0} lat={lat} rx={0.13} ry={0.17} color={inner} ring={0.02} ringColor="#0c0a10" lift={1.008} mo={p.mo} visible={mOpen(p, 1)} />
    <Decal lon={0} lat={lat - 3} rx={0.3} ry={0.21} color={inner} ring={0.02} ringColor="#0c0a10" lift={1.008} mo={p.mo} visible={mOpen(p, 2)} />
    <Decal lon={0} lat={lat - 9} rx={0.2} ry={0.07} color="#e8607a" lift={1.012} mo={p.mo} visible={mOpen(p, 2) && (p.mo < 0 || p.mo > 0.4)} />
    <Decal lon={0} lat={lat - 1} rx={0.27} ry={0.1} color={inner} ring={0.02} ringColor="#0c0a10" lift={1.008} mo={p.mo} visible={mOpen(p, 3)} />
    <Line lon={0} lat={lat - 3} pts={[[-0.22, -0.05], [0, 0.04], [0.22, -0.05]]} w={0.028} color={line} lift={1.008} visible={p.mouth === 4} />
    <Decal lon={0} lat={lat - 2} rx={0.3} ry={0.17} color={inner} ring={0.02} ringColor="#0c0a10" lift={1.008} mo={p.mo} visible={mOpen(p, 5)} />
    <Decal lon={0} lat={lat + 2} rx={0.26} ry={0.05} color={teeth} lift={1.012} mo={p.mo} visible={mOpen(p, 5) && (p.mo < 0 || p.mo > 0.35)} />
    <Line lon={0} lat={lat - 2} pts={[[-0.26, -0.03], [-0.13, 0.05], [0, -0.03], [0.13, 0.05], [0.26, -0.03]]} w={0.026} color={line} lift={1.008} visible={p.mouth === 6} />
  </>
);

// ---------- дробовик: +z вперёд; начало - цевьё/ствольная коробка ----------
export const GUN = { grip: [0, -0.07, -0.34] as [number, number, number], pump: [0, -0.07, 0.3] as [number, number, number], muzzle: [0, 0.02, 1.0] as [number, number, number] };
const Shotgun: React.FC<{ rk: number }> = ({ rk }) => (
  <group>
    <group rotation={[Math.PI / 2, 0, 0]} position={[0, 0.02, 0.5]}>
      <Part geo={rcyl(0.04, 0.04, 1.0, 0.01, 12)} color="#3a3d4c" px={2.8} />
    </group>
    <group rotation={[Math.PI / 2, 0, 0]} position={[0, -0.04, 0.4]}>
      <Part geo={rcyl(0.032, 0.032, 0.7, 0.01, 12)} color="#2a2c38" px={2.4} />
    </group>
    <Part geo={rbox(0.11, 0.14, 0.36, 0.03)} color="#555a70" px={2.8} position={[0, 0.0, -0.1 - 0.12 * rk]} />
    <Part geo={rbox(0.12, 0.1, 0.3, 0.035)} color="#a05a2a" px={2.8} position={[0, -0.07, 0.3 - 0.2 * rk]} />
    <Part geo={rbox(0.1, 0.17, 0.46, 0.04)} color="#a05a2a" px={2.8} position={[0, -0.03, -0.5]} rotation={[-0.1, 0, 0]} />
    <Part geo={rbox(0.025, 0.05, 0.05, 0.01)} color="#c9cfdc" px={0} position={[0, 0.08, 0.98]} />
  </group>
);
/** Монтировка: начало - ладонь, стержень вверх (+y), изогнутый коготь на конце */
export const Crowbar: React.FC = () => (
  <group>
    <Part geo={rcyl(0.028, 0.028, 0.86, 0.01, 10)} color="#d8353b" px={3} position={[0, 0.3, 0]} />
    <Part geo={rcyl(0.03, 0.03, 0.14, 0.01, 10)} color="#2a2c38" px={2.4} position={[0, -0.1, 0]} />
    <Part geo={rcyl(0.026, 0.026, 0.24, 0.01, 10)} color="#d8353b" px={3} position={[0.07, 0.78, 0]} rotation={[0, 0, 0.9]} />
    <Part geo={rbox(0.05, 0.14, 0.05, 0.01)} color="#c9cfdc" px={2.4} position={[0.15, 0.7, 0]} rotation={[0, 0, 0.2]} />
  </group>
);

// ---------- сборка ----------
interface Build {
  head: HeadDim;
  headCol: string;
  skin: string;
  pelvis: [number, number, number];
  pelvisCol: string;
  torso: [number, number, number];
  torsoCol: string;
  arm: ArmSpec;
  leg: LegSpec;
  shadow: [number, number];
  headY?: number;
}
const J = COL4.jackson;
const S = COL4.stacey;
const B = COL4.brenda;
const W = COL4.swat;
export const BUILD4: Record<Kind4, Build> = {
  jackson: {
    head: { rx: 0.54, ry: 0.47, rz: 0.47 }, headCol: J.skin, skin: J.skin, pelvis: [0.8, 0.24, 0.52], pelvisCol: J.pants, torso: [0.98, 0.6, 0.62], torsoCol: J.shirt,
    arm: { sx: 0.55, up: 1.55, fo: 1.35, hand: 1.15, upCol: J.shirt, foCol: J.skin, upSleeve: true, skin: J.skin, len: 1.7 },
    leg: { hipX: 0.22, th: 1.5, ca: 1.38, thCol: J.pants, caCol: J.pants, shoe: <Part geo={rbox(0.3, 0.14, 0.44, 0.06)} color={J.boot} position={[0, -0.145, 0.08]} /> },
    shadow: [1.1, 0.5],
  },
  stacey: {
    head: { rx: 0.52, ry: 0.46, rz: 0.44 }, headCol: S.skin, skin: S.skin, pelvis: [0.5, 0.2, 0.34], pelvisCol: S.pants, torso: [0.62, 0.6, 0.4], torsoCol: S.vest,
    arm: { sx: 0.39, up: 1.05, fo: 1.05, hand: 1.0, upCol: S.skin, foCol: S.skin, skin: S.skin, len: 1.3 },
    leg: { hipX: 0.13, th: 0.92, ca: 0.88, thCol: S.pants, caCol: S.pants, shoe: <Part geo={rbox(0.22, 0.16, 0.36, 0.06)} color={S.boot} position={[0, -0.12, 0.07]} /> },
    shadow: [0.5, 0.34],
  },
  brenda: {
    head: { rx: 0.56, ry: 0.47, rz: 0.46 }, headCol: B.skin, skin: B.skin, pelvis: [0.8, 0.22, 0.5], pelvisCol: B.pants, torso: [1.02, 0.6, 0.55], torsoCol: B.flan,
    arm: { sx: 0.57, up: 1.95, fo: 1.55, hand: 1.15, upCol: B.skin, foCol: B.skin, bicep: 1.1, skin: B.skin, len: 1.4 },
    leg: { hipX: 0.21, th: 1.45, ca: 1.3, thCol: B.pants, caCol: B.pants, shoe: <Part geo={rbox(0.3, 0.15, 0.42, 0.06)} color={B.boot} position={[0, -0.14, 0.08]} /> },
    shadow: [0.9, 0.42],
  },
  swat: {
    head: { rx: 0.5, ry: 0.45, rz: 0.44 }, headCol: W.skin, skin: W.skin, pelvis: [0.66, 0.22, 0.42], pelvisCol: W.pants, torso: [0.9, 0.6, 0.5], torsoCol: W.armor,
    arm: { sx: 0.5, up: 1.35, fo: 1.25, hand: 1.1, upCol: W.armor, foCol: W.armor, upSleeve: true, foSleeve: true, skin: W.glove, len: 1.3 },
    leg: { hipX: 0.17, th: 1.15, ca: 1.05, thCol: W.pants, caCol: W.pants, shoe: <Part geo={rbox(0.26, 0.18, 0.4, 0.06)} color={W.boot} position={[0, -0.13, 0.08]} /> },
    shadow: [0.7, 0.38],
  },
};

// ---------- лица ----------
const JacksonFace: React.FC<{ p: PP4 }> = ({ p }) => (
  <>
    {/* седые виски */}
    <Decal lon={-84} lat={4} rx={0.2} ry={0.34} color={J.hair} ring={0.03} lift={1.012} />
    <Decal lon={84} lat={4} rx={0.2} ry={0.34} color={J.hair} ring={0.03} lift={1.012} />
    <Brows p={p} lat={34} lon={22} w={0.095} color={J.stache} />
    {/* красные прожилки на висках (безумие) */}
    {([1, -1] as const).map((s) => (
      <Line key={s} lon={s * 40} lat={14} pts={[[-0.1, 0.1], [0.0, 0.0], [0.12, -0.06]]} w={0.012} color="#d8283a" lift={1.012} />
    ))}
    {/* усы подковой */}
    <Decal lon={0} lat={-22 + p.mst * 1.2} rx={0.5} ry={0.115} rot={p.mst ? 3 : 0} color={J.stache} ring={0.03} lift={1.013} />
    <Decal lon={-27} lat={-31} rx={0.1} ry={0.19} color={J.stache} ring={0.02} lift={1.014} />
    <Decal lon={27} lat={-31} rx={0.1} ry={0.19} color={J.stache} ring={0.02} lift={1.014} />
    <Mouth p={p} lat={-41} line="#2a0a12" inner="#4a0a14" />
    {p.sp > 0 && <Decal lon={19} lat={-52} rx={0.05} ry={0.1 + p.sp * 0.04} color="#f4fbff" ring={0.02} lift={1.02} />}
  </>
);
const StaceyFace: React.FC<{ p: PP4 }> = ({ p }) => (
  <>
    <Decal lon={0} lat={64} rx={1.2} ry={0.6} color={S.hair} ring={0.03} lift={1.012} />
    <Brows p={{ ...p, brow: Math.min(p.brow, -0.6) }} lat={33} lon={21} w={0.075} color={S.hair} />
    <Mouth p={p} lat={-36} line="#2a0a12" inner="#4a0a14" />
    {/* щербинка */}
    {p.mouth > 0 && !mClosed(p) && <Decal lon={5} lat={-30} rx={0.04} ry={0.06} color="#2a0a12" lift={1.02} />}
  </>
);
const BrendaFace: React.FC<{ p: PP4 }> = ({ p }) => (
  <>
    <Decal lon={0} lat={66} rx={1.2} ry={0.58} color={B.hair} ring={0.03} lift={1.012} />
    <Brows p={{ ...p, brow: Math.min(p.brow, -0.2) }} lat={34} lon={22} w={0.09} color={B.hair} />
    <Mouth p={p} lat={-36} line="#2a0a12" inner="#4a0a14" />
  </>
);
const SwatFace: React.FC<{ p: PP4 }> = ({ p }) => (
  <>
    <Mouth p={p} lat={-40} line="#2a0a12" inner="#4a0a14" />
    {p.tg > 0 && <Decal lon={0} lat={-50} rx={0.12} ry={0.2} color="#ff6a86" ring={0.02} lift={1.014} />}
  </>
);
const wrenchPts: Array<[number, number]> = [[-0.02, -0.12], [0.02, -0.12], [0.02, 0.04], [0.06, 0.05], [0.06, 0.13], [0.025, 0.12], [0.0, 0.09], [-0.025, 0.12], [-0.06, 0.13], [-0.06, 0.05], [-0.02, 0.04]];

export const Doll4: React.FC<{ pose: PP4; kind: Kind4; shadow?: boolean; groundY?: number }> = ({ pose: p, kind, shadow = true, groundY = 0 }) => {
  const b = BUILD4[kind];
  const [pw, ph, pd] = b.pelvis;
  const [tw, th, td] = b.torso;
  const heldR = kind === "stacey" && p.cb ? <Crowbar /> : null;
  const heldOriR: [number, number, number] | undefined = kind === "stacey" ? [p.hp, p.my, 0] : undefined;
  const wr = extrude("wrench4", wrenchPts, 0.02, 0.006);
  return (
    <>
      {shadow && <Shadow position={[p.x, groundY + 0.02, p.z]} w={b.shadow[0] * p.scale} d={b.shadow[1] * p.scale} />}
      <group position={[p.x, p.y, p.z]} scale={p.scale}>
        <group rotation={[0, 0, p.rz * D2R]}>
          <group rotation={[0, p.ry * D2R, 0]}>
            <group rotation={[p.rx * D2R, 0, 0]}>
              {/* таз + ноги */}
              <Part geo={rbox(pw, ph, pd, 0.07)} color={b.pelvisCol} position={[0, -0.02, 0]} />
              {kind === "jackson" && (
                <>
                  <Part geo={rbox(pw + 0.04, 0.08, pd + 0.04, 0.02)} color={J.belt} px={2.6} position={[0, 0.07, 0]} />
                  {/* кобура и дубинка на поясе */}
                  <Part geo={rbox(0.14, 0.3, 0.16, 0.04)} color="#1b1a22" px={2.6} position={[0.44, -0.05, 0.1]} />
                  <Part geo={rcyl(0.035, 0.035, 0.46, 0.01, 10)} color="#22222a" px={2.4} position={[-0.46, -0.1, 0.0]} rotation={[0.1, 0, 0.12]} />
                </>
              )}
              {kind === "brenda" && <Part geo={rbox(pw + 0.03, 0.07, pd + 0.03, 0.02)} color="#3a2a22" px={2.4} position={[0, 0.07, 0]} />}
              {kind === "swat" && <Part geo={rbox(pw + 0.04, 0.1, pd + 0.04, 0.02)} color={W.armorL} px={2.4} position={[0, 0.07, 0]} />}
              <Leg4 side={1} swing={p.llx} spread={p.llz} knee={p.llk} spec={b.leg} />
              <Leg4 side={-1} swing={p.lrx} spread={p.lrz} knee={p.lrk} spec={b.leg} />
              {/* торс */}
              <group rotation={[p.tl * D2R, p.ty * D2R, p.tz * D2R]}>
                <Part geo={rbox(tw, th, td, 0.13)} color={b.torsoCol} position={[0, 0.3, 0]} />
                {kind === "jackson" && (
                  <>
                    {/* огромное пузо: рубашка трещит на пуговицах */}
                    <group position={[0, 0.14, 0.27]} scale={[0.64, 0.52, 0.54]}>
                      <Part geo={sphereGeo(26)} color={J.shirt} px={3.6} />
                      {[-30, -12, 6, 24, 42].map((la, i) => (
                        <Decal key={i} lon={0} lat={la} rx={0.045} color="#e8ecf8" ring={0.015} lift={1.012} />
                      ))}
                      {[-21, -3, 15, 33].map((la, i) => (
                        <Decal key={i} lon={0} lat={la} rx={0.15} ry={0.04} color={J.shirtD} lift={1.01} rot={i % 2 ? 6 : -6} />
                      ))}
                    </group>
                    {/* пояс поверх живота снизу и золотой значок */}
                    <Part geo={rbox(0.14, 0.15, 0.03, 0.03)} color={J.gold} px={2.6} position={[-0.3, 0.5, 0.3]} />
                    <Part geo={rbox(0.12, 0.08, 0.1, 0.02)} color="#15131a" px={2.4} position={[-0.42, 0.62, 0.1]} />
                    <Part geo={rbox(0.12, 0.2, 0.02, 0.01)} color="#15131a" px={2} position={[0.28, 0.5, 0.31]} />
                  </>
                )}
                {kind === "stacey" && (
                  <>
                    {/* кожаная жилетка на голое тело: V-вырез кожей и заклёпки */}
                    <Flat geo={extrude("stacey_v", [[-0.15, 0], [0.15, 0], [0.03, -0.46], [-0.03, -0.46]], 0.01, 0).geo} color={S.skin} position={[0, 0.6, td / 2 + 0.006]} />
                    {[0.1, 0.2, 0.3, 0.4, 0.5].map((y, i) => (
                      <Flat key={i} geo={circleGeo} color={S.metal} position={[i % 2 ? 0.2 : -0.2, y, td / 2 + 0.008]} scale={0.022} />
                    ))}
                    {([1, -1] as const).map((s) => (
                      <Part key={s} geo={sphereGeo(14)} color={S.skin} px={0} position={[s * 0.31, 0.62, 0]} scale={0.1} />
                    ))}
                  </>
                )}
                {kind === "brenda" && (
                  <>
                    {/* промасленная фланелька в клетку без рукавов */}
                    {[-0.26, 0, 0.26].map((x, i) => (
                      <Flat key={i} geo={planeGeo} color={B.flanD} position={[x, 0.3, td / 2 + 0.004]} scale={[0.07, 0.56, 1]} />
                    ))}
                    {[0.14, 0.34, 0.52].map((y, i) => (
                      <Flat key={i} geo={planeGeo} color={B.flanD} position={[0, y, td / 2 + 0.005]} scale={[0.72, 0.06, 1]} />
                    ))}
                    <Flat geo={circleGeo} color="#2a2a30" position={[0.26, 0.12, td / 2 + 0.01]} scale={[0.09, 0.05, 1]} />
                    {/* шея с татуировкой разводного ключа */}
                    <Part geo={rcyl(0.19, 0.21, 0.3, 0.04, 20)} color={B.skin} position={[0, 0.7, 0]} />
                    <group position={[0.07, 0.7, 0.2]} rotation={[0, 0.2, 0.7]}>
                      <Part geo={wr.geo} hull={wr.hull} color={B.wrench} px={2} />
                    </group>
                    {([1, -1] as const).map((s) => (
                      <Part key={s} geo={sphereGeo(16)} color={B.skin} px={2.6} position={[s * 0.5, 0.55, 0]} scale={0.2} />
                    ))}
                  </>
                )}
                {kind === "swat" && (
                  <>
                    <Part geo={rbox(0.66, 0.42, 0.1, 0.04)} color={W.armorL} px={2.8} position={[0, 0.34, td / 2 + 0.03]} />
                    <mesh geometry={planeGeo} position={[0, 0.34, td / 2 + 0.085]} scale={[0.52, 0.2, 1]}>
                      <meshBasicMaterial map={swatTex()} toneMapped={false} transparent alphaTest={0.5} />
                    </mesh>
                    {([1, -1] as const).map((s) => (
                      <Part key={s} geo={sphereGeo(14)} color={W.armorL} px={2.6} position={[s * 0.5, 0.58, 0]} scale={[0.17, 0.12, 0.17]} />
                    ))}
                  </>
                )}
                <Arm4 side={1} swing={p.alx} abd={p.alz} elbow={p.ale} spec={b.arm} hand={p.hl} />
                <Arm4 side={-1} swing={p.arx} abd={p.arz} elbow={p.are} spec={b.arm} hand={p.hr} held={heldR} heldOri={heldOriR} heldY={-0.03} />
                {kind === "jackson" && p.gun > 0 && (
                  <group position={[p.gx, p.gy, p.gz]} rotation={new THREE.Euler(-p.gp * D2R, p.gw * D2R, 0, "YXZ")}>
                    <Shotgun rk={p.rk} />
                  </group>
                )}
                {/* голова */}
                <group position={[p.hdx, 0.93 + p.hdy, 0]} rotation={[p.hx * D2R, p.hy * D2R, p.hz * D2R]}>
                  <Part geo={sphereGeo(32)} color={b.headCol} px={3.6} scale={[b.head.rx, b.head.ry, b.head.rz]} />
                  {[1, -1].map((s) => (
                    <Part key={s} geo={sphereGeo(14)} color={b.skin} px={2.8} position={[s * (b.head.rx + 0.005), -0.04, -0.02]} scale={[0.05, 0.1, 0.075]} />
                  ))}
                  {kind === "jackson" && (
                    <>
                      {/* фуражка: тулья, околыш и козырёк, золотая кокарда */}
                      <Part geo={rcyl(0.52, 0.5, 0.26, 0.05, 24)} color={J.hat} px={3.2} position={[0, 0.4, 0.0]} />
                      <Part geo={rcyl(0.55, 0.55, 0.1, 0.03, 24)} color="#121228" px={2.8} position={[0, 0.27, 0.02]} scale={[1, 1, 1]} />
                      <Part geo={rbox(0.62, 0.05, 0.34, 0.025)} color="#121228" px={2.8} position={[0, 0.22, 0.46]} rotation={[0.12, 0, 0]} />
                      <Part geo={rbox(0.1, 0.1, 0.03, 0.02)} color={J.gold} px={2.4} position={[0, 0.34, 0.54]} />
                    </>
                  )}
                  {kind === "stacey" &&
                    [0, 1, 2, 3, 4, 5, 6].map((i) => {
                      const a = (i / 7) * Math.PI * 2;
                      return <Part key={i} geo={rcyl(0.07, 0.0, 0.2, 0.01, 8)} color={S.hair} px={2.4} position={[Math.sin(a) * 0.3, 0.4 + Math.cos(a * 2) * 0.01, Math.cos(a) * 0.26 - 0.02]} rotation={[Math.cos(a) * 0.35, 0, -Math.sin(a) * 0.35]} />;
                    })}
                  {kind === "brenda" && (
                    <>
                      <Part geo={sphereGeo(18)} color={B.hair} px={3.2} position={[0, 0.16, -0.3]} scale={[0.5, 0.36, 0.3]} />
                      <Part geo={sphereGeo(16)} color={B.hair} px={3} position={[0, 0.5, -0.14]} scale={[0.2, 0.18, 0.2]} />
                      {/* вечный окурок */}
                      <group position={[0.14, -0.2, 0.43]} rotation={[0.1, 0.25, 0]}>
                        <Part geo={rcyl(0.026, 0.026, 0.3, 0.008, 8)} color="#f4f4ee" px={2.2} position={[0, 0, 0.14]} rotation={[Math.PI / 2, 0, 0]} />
                        <Part geo={sphereGeo(8)} color="#ff7a1a" px={0} position={[0, 0, 0.3]} scale={0.032} />
                      </group>
                    </>
                  )}
                  {kind === "swat" && (
                    <>
                      <Part geo={sphereGeo(26)} color="#1b1e28" px={3.4} position={[0, 0.06, -0.02]} scale={[b.head.rx * 1.08, b.head.ry * 0.82, b.head.rz * 1.08]} />
                      <Part geo={rbox(0.82, 0.22, 0.12, 0.06)} color={W.visor} px={3} position={[0, 0.05, b.head.rz * 0.9]} />
                      <Flat geo={planeGeo} color="#9fc8ff" position={[-0.18, 0.08, b.head.rz * 0.9 + 0.07]} rotation={[0, 0, 0.5]} scale={[0.14, 0.03, 1]} />
                    </>
                  )}
                  {kind !== "swat" && (
                    <>
                      <Eye3 h={b.head} side={1} lon={21} lat={kind === "stacey" ? 8 : 6} re={0.142} st={p.eyeL} lx={p.lx} ly={p.ly} lid={b.skin} pupil={p.ps ? 0.13 : kind === "jackson" ? 0.3 : 0.36} />
                      <Eye3 h={b.head} side={-1} lon={21} lat={kind === "stacey" ? 8 : 6} re={0.142} st={p.eyeR} lx={p.lx} ly={p.ly} lid={b.skin} pupil={p.ps ? 0.13 : kind === "jackson" ? 0.3 : 0.36} />
                    </>
                  )}
                  <group scale={[b.head.rx, b.head.ry, b.head.rz]}>
                    {kind === "jackson" ? <JacksonFace p={p} /> : kind === "stacey" ? <StaceyFace p={p} /> : kind === "brenda" ? <BrendaFace p={p} /> : <SwatFace p={p} />}
                  </group>
                </group>
              </group>
            </group>
          </group>
        </group>
      </group>
    </>
  );
};
void P0;
