// Персонаж в стиле «вырезанной бумаги» (оригинальные персонажи, только стилистика cutout-анимации).
// Начало координат — между ступнями, персонаж смотрит на +Z. Рост ≈ 1.55 (голова ≈ половина роста).
import React from "react";
import * as THREE from "three";
import { geo, paper, glow, Pt } from "./paper";

export type Eyes = "normal" | "angry" | "sad" | "wide" | "crazy" | "closed" | "dead" | "squint" | "tiny";
export type Mouth = "talk" | "closed" | "smile" | "frown" | "grin" | "scream" | "o" | "wavy" | "teethGrit";
export type Hat =
  | "none" | "combover" | "militaryCap" | "helmet" | "balaclava" | "messyHair" | "beanie"
  | "strawHat" | "hardHat" | "slickHair" | "baldGray" | "headset" | "cap" | "bun" | "curly" | "ponytail";
export type Outfit = "suit" | "uniform" | "camo" | "hoodie" | "tshirt" | "dress" | "flannel" | "tactical" | "cardigan" | "overalls";

export interface CharacterProps {
  position?: [number, number, number];
  rotationY?: number;
  scale?: number;
  skin?: string;
  outfit?: Outfit;
  color?: string;      // основной цвет одежды
  color2?: string;     // штаны / вторичный цвет
  tie?: string | null;
  hat?: Hat;
  hairColor?: string;
  hatColor?: string;
  mustache?: boolean;
  beard?: boolean;
  stubble?: boolean;
  glasses?: "none" | "round" | "shades" | "goggles";
  medals?: boolean;
  eyes?: Eyes;
  mouth?: Mouth;
  mouthOpen?: number;  // 0..1 (для talk/scream)
  lookX?: number;      // -1..1
  lookY?: number;
  brow?: number;       // -1 (злые) .. 1 (испуг); по умолчанию из eyes
  tears?: number;      // 0..1
  sweat?: number;      // 0..1 (капли пота)
  blood?: number;      // 0..1 (кровь/ссадины)
  missingEar?: boolean;
  ears?: boolean;
  blush?: boolean;
  armL?: number;       // угол руки (рад), 0 — вниз, + — вверх наружу
  armR?: number;
  handL?: React.ReactNode; // предмет в левой руке (в координатах кисти)
  handR?: React.ReactNode;
  bodyTilt?: number;   // наклон туловища
  headTilt?: number;
  squash?: number;     // 1 — норма; >1 сплющен, <1 вытянут
  legs?: "stand" | "run" | "sit" | "none";
  legPhase?: number;   // фаза бега
  back?: React.ReactNode; // что примотано к спине (выглядывает из-за плеч)
  front?: React.ReactNode; // доп. детали поверх туловища
  shadow?: boolean;
  seed?: number;
  adult?: boolean;     // взрослые пропорции: длиннее туловище и ноги
}

const D = 0.035; // толщина картона
const Z = (n: number) => n * 0.012; // слои по Z

const Piece: React.FC<{ g: THREE.BufferGeometry; c: string; p?: [number, number, number]; r?: number; s?: [number, number, number]; m?: THREE.Material }> = ({ g, c, p = [0, 0, 0], r = 0, s, m }) => (
  <mesh geometry={g} material={m ?? paper(c)} position={p} rotation={[0, 0, r]} scale={s} />
);

// ---------- глаза ----------
const EyesPart: React.FC<{ kind: Eyes; lookX: number; lookY: number; brow: number; tears: number; skin: string }> = ({ kind, lookX, lookY, brow, tears, skin }) => {
  const ex = 0.118, ey = 1.17;
  const wide = kind === "wide" || kind === "crazy";
  const rx = wide ? 0.155 : 0.138, ry = wide ? 0.185 : kind === "squint" ? 0.08 : kind === "tiny" ? 0.11 : 0.165;
  const eyeWhite = geo.ellipse(rx, ry, 0.02);
  const pupilR = kind === "wide" ? 0.022 : kind === "crazy" ? 0.02 : 0.03;
  const pupil = geo.ellipse(pupilR, pupilR, 0.015);
  const els: React.ReactNode[] = [];
  for (const side of [-1, 1]) {
    const x = side * ex;
    if (kind === "closed") {
      els.push(<Piece key={"c" + side} g={geo.rrect(0.2, 0.025, 0.012, 0.015)} c="#111" p={[x, ey - 0.02, Z(6)]} r={side * 0.12} />);
      continue;
    }
    if (kind === "dead") {
      els.push(<Piece key={"w" + side} g={eyeWhite} c="#fbfbf6" p={[x, ey, Z(5)]} />);
      els.push(<Piece key={"x1" + side} g={geo.rrect(0.16, 0.025, 0.01, 0.015)} c="#111" p={[x, ey, Z(7)]} r={0.78} />);
      els.push(<Piece key={"x2" + side} g={geo.rrect(0.16, 0.025, 0.01, 0.015)} c="#111" p={[x, ey, Z(7)]} r={-0.78} />);
      continue;
    }
    els.push(<Piece key={"w" + side} g={eyeWhite} c="#fbfbf6" p={[x, ey, Z(5) + (side > 0 ? 0.002 : 0)]} r={side * 0.12} />);
    const crazyOff = kind === "crazy" ? side * 0.03 : 0;
    const px = x + THREE.MathUtils.clamp(lookX, -1, 1) * (rx - pupilR - 0.015) * 0.85 + crazyOff - side * 0.012;
    const py = ey + THREE.MathUtils.clamp(lookY, -1, 1) * (ry - pupilR - 0.015) * 0.8;
    els.push(<Piece key={"p" + side} g={pupil} c="#111" p={[px, py, Z(7)]} />);
    // веки для злых/грустных/прищура: часть эллипса глаза выше наклонной линии
    if (kind === "angry" || kind === "sad" || kind === "squint") {
      const slope = kind === "angry" ? side * 0.55 : kind === "sad" ? -side * 0.5 : 0;
      const cut = kind === "squint" ? 0.0 : ry * 0.12;
      const pts: Pt[] = [];
      const N = 28;
      for (let i = 0; i <= N; i++) {
        const a = (i / N) * Math.PI * 2;
        const px0 = Math.cos(a) * rx * 1.06, py0 = Math.sin(a) * ry * 1.06;
        const line = cut + slope * px0;
        pts.push([px0, Math.max(py0, Math.min(line, ry * 1.06))]);
      }
      const lidPts = pts.filter((q) => q[1] >= cut + slope * q[0] - 1e-6);
      if (lidPts.length > 2) els.push(<Piece key={"l" + side} g={geo.poly(`lid_${kind}_${side}_${rx}_${ry}`, lidPts, 0, 0.015)} c={skin} p={[x, ey, Z(8)]} />);
    }
  }
  // брови
  const b = brow;
  for (const side of [-1, 1]) {
    const ang = -side * b * 0.45;
    els.push(<Piece key={"b" + side} g={geo.rrect(0.17, 0.035, 0.015, 0.015)} c="#1a1a1a" p={[side * (ex + 0.01), ey + ry + 0.035 + Math.abs(b) * 0.01, Z(9)]} r={ang} />);
  }
  if (tears > 0) {
    for (const side of [-1, 1]) {
      const len = 0.08 + tears * 0.35;
      els.push(<Piece key={"t" + side} g={geo.rrect(0.05, len, 0.025, 0.015)} c="#7cc8f2" m={glow("#8fd3ff", 0.92)} p={[side * (ex + 0.05), ey - ry - len / 2 + 0.03, Z(10)]} />);
    }
  }
  return <>{els}</>;
};

// ---------- рот ----------
const MouthPart: React.FC<{ kind: Mouth; open: number }> = ({ kind, open }) => {
  const y = 0.93;
  const o = THREE.MathUtils.clamp(open, 0, 1);
  if (kind === "closed" || ((kind === "talk") && o < 0.08)) return <Piece g={geo.rrect(0.13, 0.022, 0.011, 0.015)} c="#2a1410" p={[0, y, Z(6)]} />;
  if (kind === "smile") return <Piece g={geo.arc(0.09, 0.05, Math.PI, Math.PI * 2, 0.015)} c="#2a1410" p={[0, y + 0.02, Z(6)]} />;
  if (kind === "frown") return <Piece g={geo.arc(0.08, 0.035, 0, Math.PI, 0.015)} c="#2a1410" p={[0, y - 0.025, Z(6)]} />;
  if (kind === "o") return <Piece g={geo.ellipse(0.04, 0.05, 0.015)} c="#3a0d0d" p={[0, y - 0.01, Z(6)]} />;
  if (kind === "wavy") return (
    <group position={[0, y, Z(6)]}>
      {[-0.06, -0.02, 0.02, 0.06].map((x, i) => <Piece key={i} g={geo.rrect(0.045, 0.02, 0.01, 0.015)} c="#2a1410" p={[x, i % 2 ? 0.01 : -0.01, 0]} r={i % 2 ? -0.5 : 0.5} />)}
    </group>
  );
  if (kind === "grin" || kind === "teethGrit") {
    const w = kind === "grin" ? 0.26 : 0.2, h = kind === "grin" ? 0.1 : 0.07;
    return (
      <group position={[0, y, Z(6)]}>
        <Piece g={kind === "grin" ? geo.arc(w / 2, h, Math.PI, Math.PI * 2, 0.015) : geo.rrect(w, h, 0.02, 0.015)} c="#2a0b0b" p={[0, kind === "grin" ? 0.04 : 0, 0]} />
        <Piece g={geo.rrect(w * 0.86, h * 0.36, 0.01, 0.015)} c="#ffffff" p={[0, kind === "grin" ? 0.02 : 0.012, Z(1)]} />
        {kind === "teethGrit" && <Piece g={geo.rrect(w * 0.86, h * 0.36, 0.01, 0.015)} c="#ffffff" p={[0, -0.016, Z(1)]} />}
        {[-1, 0, 1].map((k) => <Piece key={k} g={geo.rrect(0.006, h * 0.8, 0.002, 0.015)} c="#555" p={[k * w * 0.18, 0, Z(2)]} />)}
      </group>
    );
  }
  // talk / scream: открытый рот с зубами и языком
  const scream = kind === "scream";
  const w = scream ? 0.17 + o * 0.08 : 0.12 + o * 0.06;
  const h = scream ? 0.1 + o * 0.16 : 0.03 + o * 0.11;
  return (
    <group position={[0, y - h * 0.25, Z(6)]}>
      <Piece g={geo.ellipse(w / 2, h / 2, 0.015)} c="#3a0b0b" />
      <Piece g={geo.rrect(w * 0.7, Math.min(0.03, h * 0.3), 0.01, 0.015)} c="#ffffff" p={[0, h / 2 - Math.min(0.03, h * 0.3) / 2 - 0.004, Z(1)]} />
      {h > 0.06 && <Piece g={geo.ellipse(w * 0.3, h * 0.2, 0.015)} c="#d9535b" p={[0, -h / 2 + h * 0.2, Z(1)]} />}
    </group>
  );
};

// ---------- головные уборы / причёски ----------
const HatPart: React.FC<{ hat: Hat; hairColor: string; hatColor: string; skin: string }> = ({ hat, hairColor, hatColor, skin }) => {
  const top = 1.53;
  switch (hat) {
    case "none": return null;
    case "combover": return (
      <group>
        <Piece g={geo.arc(0.46, 0.2, 0.05, Math.PI - 0.05, D)} c={hairColor} p={[0, 1.36, Z(2)]} />
        <Piece g={geo.poly("comb", [[-0.42, 0], [0.4, 0.04], [0.35, 0.12], [-0.3, 0.1]], 0.04, D)} c={hairColor} p={[0, 1.42, Z(3)]} r={-0.08} />
      </group>
    );
    case "slickHair": return <Piece g={geo.arc(0.475, 0.26, 0.0, Math.PI, D)} c={hairColor} p={[0, 1.33, Z(2)]} />;
    case "baldGray": return (
      <group>
        {[-1, 1].map((s) => <Piece key={s} g={geo.ellipse(0.11, 0.13, D)} c={hairColor} p={[s * 0.43, 1.2, Z(2)]} />)}
      </group>
    );
    case "messyHair": return (
      <group>
        <Piece g={geo.arc(0.48, 0.26, 0, Math.PI, D)} c={hairColor} p={[0, 1.34, Z(2)]} />
        {[-0.32, -0.16, 0, 0.16, 0.32].map((x, i) => <Piece key={i} g={geo.poly("spike", [[-0.08, 0], [0.08, 0], [0.02, 0.17]], 0.02, D)} c={hairColor} p={[x, 1.5 + (i % 2) * 0.02, Z(2)]} r={(i - 2) * -0.25} />)}
      </group>
    );
    case "curly": return (
      <group>
        {[-0.38, -0.22, -0.06, 0.1, 0.26, 0.4].map((x, i) => <Piece key={i} g={geo.ellipse(0.12, 0.11, D)} c={hairColor} p={[x, 1.42 + Math.sin(i * 2) * 0.04 + (Math.abs(x) < 0.3 ? 0.06 : -0.03), Z(2)]} />)}
      </group>
    );
    case "bun": return (
      <group>
        <Piece g={geo.arc(0.48, 0.25, 0, Math.PI, D)} c={hairColor} p={[0, 1.34, Z(2)]} />
        <Piece g={geo.ellipse(0.14, 0.12, D)} c={hairColor} p={[0, 1.62, Z(1)]} />
      </group>
    );
    case "ponytail": return (
      <group>
        <Piece g={geo.arc(0.48, 0.25, 0, Math.PI, D)} c={hairColor} p={[0, 1.34, Z(2)]} />
        <Piece g={geo.rrect(0.16, 0.5, 0.08, D)} c={hairColor} p={[0.42, 1.05, Z(-2)]} r={0.2} />
      </group>
    );
    case "beanie": return (
      <group>
        <Piece g={geo.arc(0.5, 0.36, 0, Math.PI, D)} c={hatColor} p={[0, 1.3, Z(3)]} />
        <Piece g={geo.rrect(1.0, 0.13, 0.05, D)} c={shade(hatColor, -0.25)} p={[0, 1.31, Z(4)]} />
        <Piece g={geo.ellipse(0.09, 0.09, D)} c="#f4d03f" p={[0, 1.7, Z(3)]} />
      </group>
    );
    case "cap": return (
      <group>
        <Piece g={geo.arc(0.49, 0.3, 0, Math.PI, D)} c={hatColor} p={[0, 1.38, Z(3)]} />
        <Piece g={geo.rrect(0.5, 0.07, 0.035, D)} c={shade(hatColor, -0.2)} p={[0.3, 1.39, Z(4)]} />
      </group>
    );
    case "militaryCap": return (
      <group>
        <Piece g={geo.poly("mcap", [[-0.5, 0], [0.5, 0], [0.62, 0.3], [-0.62, 0.3]], 0.05, D)} c={hatColor} p={[0, 1.38, Z(3)]} />
        <Piece g={geo.rrect(1.02, 0.1, 0.03, D)} c="#1b1b1b" p={[0, 1.36, Z(4)]} />
        <Piece g={geo.arc(0.5, 0.12, Math.PI, Math.PI * 2, D)} c="#111" p={[0, 1.33, Z(5)]} />
        <Piece g={geo.ellipse(0.07, 0.07, D)} c="#e8c547" p={[0, 1.55, Z(5)]} />
      </group>
    );
    case "helmet": return (
      <group>
        <Piece g={geo.arc(0.53, 0.42, 0, Math.PI, D)} c={hatColor} p={[0, 1.3, Z(3)]} />
        <Piece g={geo.rrect(1.12, 0.07, 0.03, D)} c={shade(hatColor, -0.2)} p={[0, 1.31, Z(4)]} />
      </group>
    );
    case "hardHat": return (
      <group>
        <Piece g={geo.arc(0.5, 0.36, 0, Math.PI, D)} c="#f5c518" p={[0, 1.32, Z(3)]} />
        <Piece g={geo.rrect(1.15, 0.07, 0.03, D)} c="#d9a80f" p={[0, 1.33, Z(4)]} />
        <Piece g={geo.rrect(0.08, 0.3, 0.03, D)} c="#d9a80f" p={[0, 1.5, Z(4)]} />
      </group>
    );
    case "strawHat": return (
      <group>
        <Piece g={geo.rrect(1.3, 0.09, 0.04, D)} c="#e2c275" p={[0, 1.4, Z(4)]} />
        <Piece g={geo.rrect(0.66, 0.3, 0.1, D)} c="#e9cf8b" p={[0, 1.55, Z(3)]} />
        <Piece g={geo.rrect(0.66, 0.06, 0.02, D)} c="#8c2f1c" p={[0, 1.45, Z(5)]} />
      </group>
    );
    case "balaclava": return (
      <group>
        <Piece g={geo.ellipse(0.49, 0.44, D)} c={hatColor} p={[0, 1.12, Z(2.6)]} />
        <Piece g={geo.rrect(0.64, 0.32, 0.13, 0.015)} c={skin} p={[0, 1.17, Z(4)]} />
      </group>
    );
    case "headset": return (
      <group>
        <Piece g={geo.arc(0.48, 0.26, 0, Math.PI, D)} c={hairColor} p={[0, 1.34, Z(2)]} />
        <Piece g={geo.arc(0.53, 0.5, 0.15, Math.PI - 0.15, 0.02)} c="#222" p={[0, 1.1, Z(1)]} />
        {[-1, 1].map((s) => <Piece key={s} g={geo.rrect(0.12, 0.2, 0.05, D)} c="#c62828" p={[s * 0.5, 1.12, Z(4)]} />)}
      </group>
    );
  }
  return null;
};

export function shade(hex: string, k: number) {
  const c = new THREE.Color(hex);
  const hsl = { h: 0, s: 0, l: 0 };
  c.getHSL(hsl);
  c.setHSL(hsl.h, hsl.s, THREE.MathUtils.clamp(hsl.l + k * 0.5, 0, 1));
  return "#" + c.getHexString();
}

// ---------- рука ----------
const Arm: React.FC<{ side: -1 | 1; angle: number; sleeve: string; skin: string; mitten?: string; children?: React.ReactNode }> = ({ side, angle, sleeve, mitten, children }) => {
  const len = 0.34;
  return (
    <group position={[side * 0.3, 0.68, Z(-1)]} rotation={[0, 0, side * angle]}>
      <Piece g={geo.rrect(0.15, len, 0.06, D)} c={sleeve} p={[side * 0.035, -len / 2, 0]} r={side * 0.18} />
      <group position={[side * 0.07, -len - 0.02, Z(1)]}>
        <Piece g={geo.ellipse(0.085, 0.085, D)} c={mitten ?? sleeve} />
        <Piece g={geo.ellipse(0.035, 0.05, D)} c={mitten ?? sleeve} p={[-side * 0.075, 0.035, Z(0.5)]} r={side * 0.6} />
        <group rotation={[0, 0, -side * angle]}>{children}</group>
      </group>
    </group>
  );
};

const OUTFIT_DEFAULT: Record<Outfit, [string, string]> = {
  suit: ["#3b4252", "#2b303b"], uniform: ["#55613a", "#3f4a2a"], camo: ["#5f6b3a", "#4a5230"], hoodie: ["#6b6f78", "#2c3e66"],
  tshirt: ["#c0392b", "#2c3e66"], dress: ["#8e44ad", "#8e44ad"], flannel: ["#b03a2e", "#3d5a80"], tactical: ["#1f2326", "#1a1d20"],
  cardigan: ["#7d6b5d", "#4a4a4a"], overalls: ["#2e5e9e", "#2e5e9e"],
};

export const Character: React.FC<CharacterProps> = (p) => {
  const skin = p.skin ?? "#f6d1a8";
  const outfit = p.outfit ?? "suit";
  const [dc1, dc2] = OUTFIT_DEFAULT[outfit];
  const c1 = p.color ?? dc1, c2 = p.color2 ?? dc2;
  const eyes = p.eyes ?? "normal";
  const brow = p.brow ?? (eyes === "angry" ? -1 : eyes === "sad" ? 0.8 : eyes === "wide" ? 1 : eyes === "crazy" ? -0.6 : 0);
  const squash = p.squash ?? 1;
  const legs = p.legs ?? "stand";
  const hatColor = p.hatColor ?? "#4b5320";
  const hairColor = p.hairColor ?? "#4a2f1b";

  // туловище — трапеция
  const bodyG = geo.poly("body", [[-0.4, 0], [0.4, 0], [0.31, 0.62], [-0.31, 0.62]], 0.1, D);
  const legL = legs === "run" ? Math.sin(p.legPhase ?? 0) * 0.5 : 0;
  const LEG = p.adult && legs !== "sit" ? 0.13 : 0; // удлинение ног
  const TK = p.adult ? 1.3 : 1;                      // растяжение туловища
  const TOP = (TK - 1) * 0.62;                       // насколько поднимается голова/плечи
  return (
    <group position={p.position} rotation={[0, p.rotationY ?? 0, 0]} scale={p.scale ?? 1}>
      {p.shadow !== false && (
        <mesh position={[0, 0.004, 0.02]} rotation={[-Math.PI / 2, 0, 0]} material={glow("#000000", 0.22)}>
          <circleGeometry args={[0.42, 24]} />
        </mesh>
      )}
      <group scale={[1 / Math.sqrt(squash), squash < 1 ? 1 / squash : 1 / squash, 1]}>
        {/* ноги */}
        {legs !== "none" && legs !== "sit" && [-1, 1].map((s) => {
          const sw = legs === "run" ? (s === -1 ? legL : -legL) : 0;
          return (
            <group key={s} position={[s * 0.15, 0.17 + LEG, Z(-2)]} rotation={[0, 0, sw]}>
              <Piece g={geo.rrect(0.2, 0.17 + LEG, 0.03, D)} c={c2} p={[0, -0.06 - LEG / 2, 0]} />
              <Piece g={geo.ellipse(0.15, 0.065, D)} c="#1b1b1b" p={[s * 0.03, -0.14 - LEG, Z(1)]} />
            </group>
          );
        })}
        {legs === "sit" && [-1, 1].map((s) => (
          <group key={s} position={[s * 0.15, 0.16, Z(2)]}>
            <Piece g={geo.rrect(0.2, 0.12, 0.03, D)} c={c2} />
            <Piece g={geo.ellipse(0.14, 0.06, D)} c="#1b1b1b" p={[0, -0.07, Z(1)]} />
          </group>
        ))}
        <group rotation={[0, 0, p.bodyTilt ?? 0]} position={[0, 0.12 + LEG, 0]}>
          {/* что примотано к спине — выглядывает из-за плеч */}
          {p.back && <group position={[0, 0.62 + TOP, Z(-4)]}>{p.back}</group>}
          <group position={[0, -0.12, 0]}>
            {/* руки за туловищем */}
            <group position={[0, TOP, 0]}>
              <Arm side={-1} angle={p.armL ?? 0.12} sleeve={c1} skin={skin} mitten={outfit === "tactical" ? "#222" : undefined}>{p.handL}</Arm>
              <Arm side={1} angle={p.armR ?? 0.12} sleeve={c1} skin={skin} mitten={outfit === "tactical" ? "#222" : undefined}>{p.handR}</Arm>
            </group>
            <group position={[0, 0.12 * (1 - TK), 0]} scale={[1, TK, 1]}>
              <Piece g={bodyG} c={c1} p={[0, 0.12, 0]} />
              <OutfitDetails outfit={outfit} c1={c1} c2={c2} tie={p.tie} medals={p.medals} />
            </group>
            {p.front}
            {(p.blood ?? 0) > 0.3 && <Piece g={geo.poly("bl1", [[-0.1, 0], [0.12, 0.03], [0.05, 0.12], [-0.06, 0.1]], 0.03, 0.02)} c="#b3121b" p={[0.14, 0.45 + TOP * 0.5, Z(4)]} />}
            {/* голова */}
            <group position={[0, TOP, 0]} rotation={[0, 0, p.headTilt ?? 0]}>
              <group position={[0, -0.12, 0]} scale={1.08}>
                {p.ears && [-1, 1].map((s) => (p.missingEar && s === 1)
                  ? <Piece key={s} g={geo.arc(0.07, 0.09, -Math.PI / 2, Math.PI / 2 - 0.9, D)} c={skin} p={[s * 0.47, 1.12, Z(-0.5)]} />
                  : <Piece key={s} g={geo.ellipse(0.075, 0.1, D)} c={skin} p={[s * 0.47, 1.12, Z(-0.5)]} />)}
                {p.missingEar && <Piece g={geo.ellipse(0.04, 0.05, 0.02)} c="#a50f18" p={[0.49, 1.13, Z(0.5)]} />}
                <Piece g={geo.ellipse(0.48, 0.43, D * 1.4)} c={skin} p={[0, 1.12, Z(1)]} />
                {p.stubble && <Piece g={geo.arc(0.42, 0.3, Math.PI * 1.08, Math.PI * 1.92, 0.015)} c={shade(skin, -0.25)} p={[0, 1.0, Z(3)]} />}
                {p.beard && <Piece g={geo.arc(0.46, 0.34, Math.PI * 1.02, Math.PI * 1.98, D)} c={p.hairColor ?? "#ddd"} p={[0, 1.02, Z(3)]} />}
                {p.blush && [-1, 1].map((s) => <Piece key={s} g={geo.ellipse(0.06, 0.035, 0.015)} c="#f08a8a" p={[s * 0.27, 1.0, Z(4)]} />)}
                <EyesPart kind={eyes} lookX={p.lookX ?? 0} lookY={p.lookY ?? 0} brow={brow} tears={p.tears ?? 0} skin={skin} />
                <MouthPart kind={p.mouth ?? "closed"} open={p.mouthOpen ?? 0} />
                {p.mustache && <Piece g={geo.poly("must", [[-0.17, 0], [0.17, 0], [0.12, 0.06], [0, 0.04], [-0.12, 0.06]], 0.02, D)} c={hairColor} p={[0, 0.975, Z(8)]} />}
                {p.glasses === "round" && [-1, 1].map((s) => (
                  <group key={s} position={[s * 0.125, 1.17, Z(11)]}>
                    <mesh geometry={ringGeo} material={paper("#222")} />
                  </group>
                ))}
                {p.glasses === "shades" && <Piece g={geo.poly("shades", [[-0.31, 0.06], [0.31, 0.06], [0.28, -0.06], [0.04, -0.08], [0, -0.03], [-0.04, -0.08], [-0.28, -0.06]], 0.03, D)} c="#0d0d0d" p={[0, 1.17, Z(11)]} />}
                {p.glasses === "goggles" && <Piece g={geo.rrect(0.62, 0.2, 0.08, D)} c="#2d3436" p={[0, 1.19, Z(11)]} />}
                {(p.blood ?? 0) > 0 && <BloodFace amount={p.blood ?? 0} />}
                {(p.sweat ?? 0) > 0 && <Sweat amount={p.sweat ?? 0} />}
                <HatPart hat={p.hat ?? "none"} hairColor={hairColor} hatColor={hatColor} skin={skin} />
              </group>
            </group>
          </group>
        </group>
      </group>
    </group>
  );
};

const ringGeo = new THREE.RingGeometry(0.115, 0.14, 28);

const BloodFace: React.FC<{ amount: number }> = ({ amount }) => (
  <group>
    <Piece g={geo.poly("bf1", [[0, 0], [0.06, -0.02], [0.05, -0.16], [0.02, -0.17], [0.01, -0.06]], 0.01, 0.015)} c="#b3121b" p={[-0.3, 1.38, Z(12)]} />
    {amount > 0.4 && <Piece g={geo.poly("bf2", [[0, 0], [0.12, 0.02], [0.09, -0.05], [0.03, -0.04]], 0.01, 0.015)} c="#b3121b" p={[0.15, 1.33, Z(12)]} />}
    {amount > 0.6 && <Piece g={geo.rrect(0.03, 0.12, 0.012, 0.015)} c="#b3121b" p={[0.05, 0.85, Z(12)]} />}
    {amount > 0.5 && <Piece g={geo.ellipse(0.06, 0.04, 0.015)} c="#7a5af5" p={[-0.25, 1.05, Z(12)]} />}
  </group>
);
const Sweat: React.FC<{ amount: number }> = ({ amount }) => (
  <group>
    {[[-0.38, 1.3], [0.4, 1.25], [0.33, 1.42]].slice(0, Math.ceil(amount * 3)).map(([x, y], i) => (
      <Piece key={i} g={geo.poly("drop", [[0, 0.06], [0.03, 0], [0.02, -0.03], [-0.02, -0.03], [-0.03, 0]], 0.012, 0.015)} c="#9fd8ff" m={glow("#a9dcff", 0.95)} p={[x, y, Z(12)]} />
    ))}
  </group>
);

const OutfitDetails: React.FC<{ outfit: Outfit; c1: string; c2: string; tie?: string | null; medals?: boolean }> = ({ outfit, c1, tie, medals }) => {
  const y0 = 0.12;
  const els: React.ReactNode[] = [];
  if (outfit === "suit" || outfit === "uniform") {
    els.push(<Piece key="shirt" g={geo.poly("vneck", [[-0.13, 0.62], [0.13, 0.62], [0, 0.3]], 0.01, 0.02)} c="#f4f4f4" p={[0, y0, Z(2)]} />);
    if (tie !== null) els.push(<Piece key="tie" g={geo.poly("tie", [[-0.035, 0.6], [0.035, 0.6], [0.05, 0.38], [0, 0.3], [-0.05, 0.38]], 0.01, 0.02)} c={tie ?? (outfit === "uniform" ? "#3f4a2a" : "#b71c1c")} p={[0, y0, Z(3)]} />);
    els.push(<Piece key="lap1" g={geo.poly("lapL", [[-0.13, 0.62], [-0.04, 0.38], [-0.2, 0.5]], 0.01, 0.02)} c={shade(c1, -0.15)} p={[0, y0, Z(3)]} />);
    els.push(<Piece key="lap2" g={geo.poly("lapR", [[0.13, 0.62], [0.04, 0.38], [0.2, 0.5]], 0.01, 0.02)} c={shade(c1, -0.15)} p={[0, y0, Z(3)]} />);
    [0.2, 0.1].forEach((y, i) => els.push(<Piece key={"btn" + i} g={geo.ellipse(0.02, 0.02, 0.015)} c="#111" p={[0, y0 + y, Z(3)]} />));
  }
  if (outfit === "uniform" && medals) {
    [[-0.22, 0.42, "#e8c547"], [-0.15, 0.42, "#c0392b"], [-0.22, 0.34, "#3498db"], [-0.15, 0.34, "#e8c547"]].forEach(([x, y, c], i) =>
      els.push(<Piece key={"m" + i} g={geo.rrect(0.055, 0.06, 0.01, 0.02)} c={c as string} p={[x as number, y0 + (y as number), Z(4)]} />));
  }
  if (outfit === "camo") {
    [[-0.18, 0.15, 0.12], [0.15, 0.35, 0.1], [-0.05, 0.48, 0.09], [0.2, 0.08, 0.08], [-0.22, 0.42, 0.07]].forEach(([x, y, r], i) =>
      els.push(<Piece key={"c" + i} g={geo.ellipse(r, r * 0.6, 0.02)} c={i % 2 ? "#3d4527" : "#8a8a5c"} p={[x, y0 + y, Z(2)]} />));
  }
  if (outfit === "tactical") {
    els.push(<Piece key="vest" g={geo.rrect(0.56, 0.4, 0.06, 0.03)} c="#2f3a2f" p={[0, y0 + 0.32, Z(2)]} />);
    [-0.15, 0, 0.15].forEach((x, i) => els.push(<Piece key={"pc" + i} g={geo.rrect(0.11, 0.12, 0.02, 0.02)} c="#26302a" p={[x, y0 + 0.24, Z(3)]} />));
  }
  if (outfit === "hoodie") {
    els.push(<Piece key="pocket" g={geo.rrect(0.42, 0.16, 0.05, 0.02)} c={shade(c1, -0.12)} p={[0, y0 + 0.16, Z(2)]} />);
    els.push(<Piece key="hood" g={geo.arc(0.3, 0.1, Math.PI, Math.PI * 2, 0.02)} c={shade(c1, -0.18)} p={[0, y0 + 0.62, Z(2)]} />);
    [-0.06, 0.06].forEach((x, i) => els.push(<Piece key={"str" + i} g={geo.rrect(0.018, 0.18, 0.008, 0.015)} c="#eee" p={[x, y0 + 0.5, Z(3)]} />));
  }
  if (outfit === "flannel") {
    [-0.24, -0.08, 0.08, 0.24].forEach((x, i) => els.push(<Piece key={"v" + i} g={geo.rrect(0.035, 0.6, 0.01, 0.015)} c={shade(c1, -0.18)} p={[x, y0 + 0.31, Z(2)]} />));
    [0.12, 0.28, 0.44].forEach((y, i) => els.push(<Piece key={"h" + i} g={geo.rrect(0.66, 0.03, 0.01, 0.015)} c={shade(c1, -0.18)} p={[0, y0 + y, Z(2)]} />));
  }
  if (outfit === "overalls") {
    els.push(<Piece key="bib" g={geo.rrect(0.36, 0.3, 0.04, 0.02)} c={shade(c1, 0.05)} p={[0, y0 + 0.38, Z(2)]} />);
    els.push(<Piece key="shirt" g={geo.rrect(0.6, 0.12, 0.04, 0.02)} c="#c0392b" p={[0, y0 + 0.57, Z(1.5)]} />);
  }
  if (outfit === "cardigan") {
    els.push(<Piece key="open" g={geo.rrect(0.14, 0.62, 0.03, 0.02)} c="#e8e2d0" p={[0, y0 + 0.31, Z(2)]} />);
    [0.18, 0.32, 0.46].forEach((y, i) => els.push(<Piece key={"b" + i} g={geo.ellipse(0.018, 0.018, 0.015)} c="#3b2a20" p={[0.09, y0 + y, Z(3)]} />));
  }
  if (outfit === "tshirt") {
    els.push(<Piece key="neck" g={geo.arc(0.12, 0.07, Math.PI, Math.PI * 2, 0.02)} c={shade(c1, -0.2)} p={[0, y0 + 0.62, Z(2)]} />);
  }
  if (outfit === "dress") {
    els.push(<Piece key="collar" g={geo.arc(0.16, 0.1, Math.PI, Math.PI * 2, 0.02)} c="#f4f4f4" p={[0, y0 + 0.62, Z(2)]} />);
  }
  return <>{els}</>;
};

export { Piece };
