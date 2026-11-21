// Сцена 2: Тони, Маркус, Хлоя. Те же жёсткие куклы, что и Грег (Person.tsx): голова-блин, части на шарнирах, детали одежды плоскими формами.
import React from "react";
import * as THREE from "three";
import { Part, Flat, rbox, rcyl, sphereGeo, Shadow, planeGeo, circleGeo, extrude } from "./toon";
import { Decal, Line } from "./decal";
import { PP, mOpen, mClosed } from "./Person";
import { Eye3, HeadDim, headPt, headNormalQ } from "./Eyes3d";
import { D2R } from "./util";

export type CastKind = "tony" | "marcus" | "chloe";

// ---------- палитры ----------
export const COL = {
  tony: { skin: "#b9763f", tank: "#ff2fa8", tankDark: "#c91a85", shorts: "#2f6bf0", sock: "#f6f6fb", shoe: "#f6f6fb", sole: "#ff2fa8", hair: "#241812", beard: "#3a2418" },
  marcus: { skin: "#ffe0c8", leo: "#ffb21c", spot: "#6a3412", pants: "#9a3cff", belt: "#ffd23a", shoe: "#fff2dc", hair: "#1b1424", bag: "#35d6c0", gold: "#e0b030" },
  chloe: { skin: "#f6d4c6", hood: "#28d8f2", hoodDark: "#12a3c0", text: "#10101a", hair: "#7dff1a", hairDark: "#4fc90a", pants: "#2a2338", boot: "#22202a", sole: "#f6f6fb" },
};

// ---------- мелочи ----------
const polyGeo = (key: string, pts: Array<[number, number]>) => extrude(`poly_${key}`, pts, 0.012, 0).geo;
const textCache = new Map<string, THREE.CanvasTexture>();
const FONT = "'Arial Black','Impact','DejaVu Sans',sans-serif";
const textTex = (key: string, w: number, h: number, draw: (g: CanvasRenderingContext2D) => void) => {
  let t = textCache.get(key);
  if (!t) {
    const c = document.createElement("canvas");
    c.width = w;
    c.height = h;
    draw(c.getContext("2d")!);
    t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 4;
    textCache.set(key, t);
  }
  return t;
};
const fitText = (g: CanvasRenderingContext2D, text: string, cx: number, cy: number, maxW: number, size: number) => {
  let s = size;
  g.font = `900 ${s}px ${FONT}`;
  while (g.measureText(text).width > maxW && s > 20) {
    s -= 4;
    g.font = `900 ${s}px ${FONT}`;
  }
  g.fillText(text, cx, cy);
};
const hoodTex = () =>
  textTex("hood_npc4", 512, 320, (g) => {
    g.clearRect(0, 0, 512, 320);
    g.fillStyle = COL.chloe.text;
    g.textAlign = "center";
    g.textBaseline = "middle";
    // две строки, обе на всю ширину, вытянуты по вертикали (буквы крупные и высокие)
    g.save();
    g.translate(0, 80);
    g.scale(1, 1.6);
    fitText(g, "NPC LIVES", 256, 0, 506, 150);
    g.restore();
    g.save();
    g.translate(0, 235);
    g.scale(1, 1.6);
    fitText(g, "MATTER", 256, 0, 506, 150);
    g.restore();
  });
/** сцена 3: прожжённая окурком дыра в плакате (0 нет, 1 тлеет - оранжевый ободок, 2 прожжена) */
export const PLACARD3 = { hole: 0 };
const placardTex = () =>
  textTex("placard_npc" + (PLACARD3.hole ? `_h${PLACARD3.hole}` : ""), 512, 384, (g) => {
    g.fillStyle = "#d1a468";
    g.fillRect(0, 0, 512, 384);
    g.strokeStyle = "#a9793c";
    g.lineWidth = 14;
    g.strokeRect(10, 10, 492, 364);
    g.fillStyle = "#16141c";
    g.textAlign = "center";
    g.textBaseline = "middle";
    fitText(g, "NPC LIVES", 256, 130, 440, 130);
    fitText(g, "MATTER", 256, 270, 440, 150);
    g.fillRect(70, 345, 372, 12);
    if (PLACARD3.hole) {
      const poly = (r: number, col: string) => {
        g.fillStyle = col;
        g.beginPath();
        for (let i = 0; i < 22; i++) {
          const a = (i / 22) * Math.PI * 2;
          const rr = r * (0.86 + 0.14 * Math.sin(i * 2.7 + 1) + (i % 3 === 0 ? 0.08 : 0));
          g.lineTo(256 + Math.cos(a) * rr * 1.1, 200 + Math.sin(a) * rr);
        }
        g.closePath();
        g.fill();
      };
      poly(78, PLACARD3.hole === 1 ? "#ff8a1c" : "#6a3a14");
      poly(64, PLACARD3.hole === 1 ? "#3a1a0c" : "#2a1608");
      poly(46, "#0e0c16");
    }
  });
const TexPlane: React.FC<{ tex: THREE.Texture; w: number; h: number; position: [number, number, number]; rotation?: [number, number, number]; cutout?: boolean }> = ({ tex, w, h, position, rotation, cutout }) => (
  <mesh geometry={planeGeo} position={position} rotation={rotation} scale={[w, h, 1]}>
    <meshBasicMaterial map={tex} toneMapped={false} transparent={cutout} alphaTest={cutout ? 0.5 : 0} />
  </mesh>
);

/** Точка на передней грани скруглённого бокса (ширина w, глубина d, радиус r) при смещении x: [z, поворот вокруг y] */
const surf = (w: number, d: number, x: number, r = 0.13): [number, number] => {
  const rr = Math.min(r, w / 2, d / 2) * 0.999;
  const flat = w / 2 - rr;
  const ax = Math.abs(x);
  if (ax <= flat) return [d / 2, 0];
  const dx = Math.min(ax - flat, rr * 0.98);
  const z = d / 2 - rr + Math.sqrt(Math.max(0, rr * rr - dx * dx));
  return [z, Math.sign(x) * Math.asin(dx / rr)];
};
/** Плоское пятно/значок на торсе */
const Dot: React.FC<{ w: number; d: number; x: number; y: number; r: number; ry?: number; sx?: number; color: string; rot?: number; lift?: number; ink?: boolean }> = ({ w, d, x, y, r, sx = 1, color, rot = 0, lift = 0.004, ink }) => {
  const [z, a] = surf(w, d, x);
  return (
    <group position={[x, y, z + lift]} rotation={[0, a, 0]}>
      {ink && <Flat geo={circleGeo} color="#0c0a10" scale={[(r + 0.008) * sx, r + 0.008, 1]} rotation={[0, 0, rot]} />}
      <Flat geo={circleGeo} color={color} position={[0, 0, 0.002]} scale={[r * sx, r, 1]} rotation={[0, 0, rot]} />
    </group>
  );
};

// ---------- руки и ноги ----------
interface ArmSpec {
  sx: number; // плечо по x
  y?: number;
  up: number; // радиус плеча (множитель)
  fo: number; // радиус предплечья
  hand: number; // размер кисти
  upCol: string;
  foCol: string;
  upSleeve?: boolean; // рукав: «цилиндр» шире кожи
  foSleeve?: boolean;
  bicep?: number; // шар бицепса (множитель размера)
  bicepCol?: string;
  delt?: string; // цвет дельты (шар на плече)
  skin: string;
  len?: number; // множитель длины конечности
  shoulderCol?: string;
  spotCol?: string; // пятна на рукаве (леопард)
}
/** Кисть: коробка со скруглением + большой палец; 1 - с указательным, 2 - кулак (костяшки) */
const Hand: React.FC<{ s: ArmSpec; kind: number; side: 1 | -1 }> = ({ s, kind, side }) => {
  const k = s.hand * (kind === 2 ? 1.06 : 1);
  return (
    <group position={[0, -0.27 * (s.len ?? 1), 0]}>
      <Part geo={rbox(0.19 * k, 0.2 * k, 0.15 * k, 0.07 * k)} color={s.skin} px={3} position={[0, -0.03, 0]} />
      <Part geo={sphereGeo(12)} color={s.skin} px={2.6} position={[-side * 0.095 * k, -0.01, 0.045 * k]} scale={[0.05 * k, 0.07 * k, 0.05 * k]} />
      {kind === 2 && <Part geo={rbox(0.15 * k, 0.05 * k, 0.04, 0.02)} color={s.skin} px={2.4} position={[0, -0.07 * k, 0.085 * k]} />}
      {kind === 1 && <Part geo={rcyl(0.045 * k, 0.042 * k, 0.2, 0.018, 12)} color={s.skin} px={2.8} position={[0, -0.2 * 1, 0.01]} />}
    </group>
  );
};
const D = Math.PI / 180;
/** Рука: плечо-шар -> плечо -> локоть-шар -> предплечье -> запястье -> кисть. heldOri = [тангаж, рыскание, крен] предмета относительно торса (град) */
const Arm2: React.FC<{ side: 1 | -1; swing: number; abd: number; elbow: number; twist?: number; spec: ArmSpec; hand: number; held?: React.ReactNode; heldRot?: number; heldOri?: [number, number, number]; heldY?: number; shrug?: number }> = ({ side, swing, abd, elbow, twist = 0, spec: s, hand, held, heldRot = 0, heldOri, heldY = 0, shrug = 0 }) => {
  const len = s.len ?? 1;
  const flex = hand === 2 && elbow > 50 && s.bicep ? 1 : 0;
  const bk = (s.bicep ?? 0) * (flex ? 1.4 : 1);
  let heldQ: THREE.Quaternion | undefined;
  if (held && heldOri) {
    const rArm = new THREE.Quaternion().setFromEuler(new THREE.Euler(-swing * D, 0, side * abd * D, "XYZ")).multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(-elbow * D, 0, 0)));
    const want = new THREE.Quaternion().setFromEuler(new THREE.Euler(heldOri[0] * D, heldOri[1] * D, heldOri[2] * D, "YXZ"));
    heldQ = rArm.invert().multiply(want);
  }
  return (
    <group position={[side * s.sx, (s.y ?? 0.5) + shrug, 0]} rotation={[-swing * D2R, 0, side * abd * D2R]}>
      {/* плечевой сустав: шар кожи/рукава (у Тони - большая дельта), чтобы рука срасталась с торсом */}
      <Part geo={sphereGeo(16)} color={s.shoulderCol ?? s.upCol} px={2.6} position={[0, -0.02, 0]} scale={(s.upSleeve ? 0.115 : 0.095) * s.up} />
      <group rotation={[0, side * twist * D2R, 0]}>
        <Part geo={rcyl((s.upSleeve ? 0.112 : 0.088) * s.up, (s.upSleeve ? 0.105 : 0.082) * s.up, 0.2 * len, 0.035)} color={s.upCol} position={[0, -0.09 * len, 0]} />
        {bk > 0 && <Part geo={sphereGeo(16)} color={s.bicepCol ?? s.skin} px={2.4} position={[0, -0.1 * len, (0.07 + (flex ? 0.035 : 0)) * s.up]} scale={[0.1 * bk, 0.12 * bk, 0.085 * bk]} />}
        {s.spotCol && (
          <>
            <Flat geo={circleGeo} color={s.spotCol} position={[0, -0.05 * len, 0.106 * s.up]} rotation={[0, 0, 0.5]} scale={[0.04, 0.026, 1]} />
            <Flat geo={circleGeo} color={s.spotCol} position={[0.02, -0.14 * len, 0.1 * s.up]} rotation={[0, 0, -0.6]} scale={[0.034, 0.024, 1]} />
            <Flat geo={circleGeo} color={s.spotCol} position={[0.104 * s.up, -0.09 * len, 0.02]} rotation={[0, Math.PI / 2, 0.4]} scale={[0.036, 0.026, 1]} />
          </>
        )}
        <group position={[0, -0.2 * len, 0]} rotation={[-elbow * D2R, 0, 0]}>
          <Part geo={sphereGeo(14)} color={s.upCol === s.foCol ? s.foCol : s.upCol} px={2.6} position={[0, 0, 0]} scale={0.085 * s.fo} />
          <Part geo={rcyl((s.foSleeve ? 0.086 : 0.078) * s.fo, (s.foSleeve ? 0.092 : 0.086) * s.fo, 0.26 * len, 0.035)} color={s.foCol} position={[0, -0.11 * len, 0]} />
          {s.foSleeve && <Part geo={rcyl(0.1 * s.fo, 0.1 * s.fo, 0.05, 0.015)} color={s.foCol} px={2.6} position={[0, -0.23 * len, 0]} />}
          <Hand s={s} kind={hand} side={side} />
          {held && (
            <group position={[0, -0.27 * len + heldY, 0]} rotation={heldQ ? undefined : [heldRot * D2R, 0, 0]} quaternion={heldQ}>
              {held}
            </group>
          )}
        </group>
      </group>
    </group>
  );
};

interface LegSpec { hipX: number; th: number; ca: number; thCol: string; caCol: string; shoe: React.ReactNode; sock?: string }
const Leg2: React.FC<{ side: 1 | -1; swing: number; spread: number; knee: number; spec: LegSpec; toe?: number }> = ({ side, swing, spread, knee, spec: s, toe = 0 }) => (
  <group position={[side * s.hipX, -0.04, 0]} rotation={[-swing * D2R, 0, side * spread * D2R]}>
    <Part geo={rcyl(0.125 * s.th, 0.12 * s.th, 0.2, 0.04)} color={s.thCol} position={[0, -0.09, 0]} />
    <group position={[0, -0.19, 0]} rotation={[knee * D2R, 0, 0]}>
      <Part geo={rcyl(0.118 * s.ca, 0.112 * s.ca, 0.17, 0.04)} color={s.caCol} position={[0, -0.05, 0]} />
      {s.sock && <Part geo={rcyl(0.122 * s.ca, 0.122 * s.ca, 0.07, 0.02)} color={s.sock} px={2.6} position={[0, -0.095, 0]} />}
      <group position={[0, -0.14, 0.03]} rotation={[toe * D2R, 0, 0]}>
        <group position={[0, 0.14, -0.03]}>{s.shoe}</group>
      </group>
    </group>
  </group>
);

// ---------- реквизит ----------
/** Мегафон: начало (амбушюр) около руки, раструб вперёд (+z) */
const SOUND_PTS = (r: number, a0: number): Array<[number, number]> => {
  const out: Array<[number, number]> = [];
  const n = 8;
  for (let i = 0; i <= n; i++) {
    const a = -a0 + (2 * a0 * i) / n;
    out.push([Math.cos(a) * (r + 0.03), Math.sin(a) * (r + 0.03)]);
  }
  for (let i = n; i >= 0; i--) {
    const a = -a0 + (2 * a0 * i) / n;
    out.push([Math.cos(a) * (r - 0.03), Math.sin(a) * (r - 0.03)]);
  }
  return out;
};
/** Мегафон: начало координат - центр ладони на ручке; раструб вперёд (+z), ось конуса над ручкой (y=+0.2) */
export const Megaphone: React.FC<{ sir?: number }> = ({ sir = 0 }) => (
  <group scale={0.95}>
    <group rotation={[Math.PI / 2, 0, 0]} position={[0, 0.16, 0.1]}>
      <Part geo={rcyl(0.045, 0.145, 0.46, 0.012, 24)} color="#e8263a" px={3.2} />
      <Part geo={rcyl(0.1, 0.13, 0.1, 0.008, 24)} color="#fbfbf6" px={0} position={[0, 0.03, 0]} />
      <Part geo={rcyl(0.15, 0.15, 0.04, 0.012, 24)} color="#2a2a38" px={3} position={[0, 0.25, 0]} />
      <Part geo={rcyl(0.055, 0.055, 0.06, 0.015, 16)} color="#2a2a38" px={3} position={[0, -0.25, 0]} />
    </group>
    {/* ручка с курком */}
    <Part geo={rbox(0.1, 0.26, 0.12, 0.035)} color="#2a2a38" px={3} position={[0, 0.03, 0.03]} />
    <Part geo={rbox(0.05, 0.05, 0.06, 0.015)} color="#fbfbf6" px={2.4} position={[0, 0.13, 0.12]} />
    {sir > 0 &&
      [0, 1, 2].map((i) => {
        const r = 0.34 + ((sir + i) % 3) * 0.26;
        const e = extrude(`snd_${i}_${r.toFixed(2)}`, SOUND_PTS(r, 0.55), 0.04, 0);
        return (
          <group key={i} position={[0, 0.2, 0.55 + ((sir + i) % 3) * 0.22]} rotation={[0, Math.PI / 2, 0]}>
            <Part geo={e.geo} hull={e.hull} color={i === 1 ? "#ff8a1c" : "#ffd23a"} px={3} />
          </group>
        );
      })}
  </group>
);
/** Плакат: начало - ладонь на шесте */
const Placard: React.FC = () => (
  <group>
    <Part geo={rcyl(0.03, 0.03, 0.9, 0.01, 10)} color="#9a6a3a" px={2.8} position={[0, 0.15, 0]} />
    <Part geo={rbox(0.78, 0.58, 0.06, 0.02)} color="#d1a468" px={3.2} position={[0, 0.5, 0.05]} />
    <TexPlane tex={placardTex()} w={0.73} h={0.54} position={[0, 0.5, 0.085]} />
    <Part geo={rbox(0.76, 0.56, 0.02, 0.01)} color="#a9793c" px={0} position={[0, 0.5, 0.015]} />
  </group>
);
/** Очки в руке: две толстые линзы-диска и перемычка */
const Shades: React.FC = () => (
  <group position={[0, -0.1, 0.1]} scale={0.9}>
    {([1, -1] as const).map((s) => (
      <Part key={s} geo={sphereGeo(14)} color="#3a2f6e" px={3} position={[s * 0.12, 0, 0]} scale={[0.105, 0.085, 0.04]} />
    ))}
    <Part geo={rbox(0.07, 0.03, 0.03, 0.01)} color="#0c0a10" px={2} position={[0, 0.01, 0]} />
  </group>
);
const Bag: React.FC = () => (
  <group>
    <Part geo={rbox(0.42, 0.28, 0.14, 0.05)} color={COL.marcus.bag} px={3} />
    <Part geo={rbox(0.1, 0.07, 0.02, 0.01)} color={COL.marcus.gold} px={2} position={[0, 0.07, 0.078]} />
    <Part geo={rcyl(0.02, 0.02, 0.5, 0.008, 8)} color={COL.marcus.gold} px={2.4} position={[-0.17, 0.3, 0]} rotation={[0, 0, 0.5]} />
    <Part geo={rcyl(0.02, 0.02, 0.5, 0.008, 8)} color={COL.marcus.gold} px={2.4} position={[0.17, 0.3, 0]} rotation={[0, 0, -0.5]} />
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
/** Рот-створка: 0 закрыт, 1 «о», 2 широкий «а», 3 «э», 4 грусть (дрожит), 5 оскал */
const Mouth: React.FC<{ p: PP; lat: number; line?: string; inner?: string }> = ({ p, lat, line = "#0c0a10", inner = "#0c0a10" }) => (
  <>
    <Line lon={0} lat={lat} pts={[[-0.26, -0.02], [0, 0.03], [0.26, -0.02]]} w={0.026} color={line} lift={1.008} visible={mClosed(p)} />
    <Decal lon={0} lat={lat} rx={0.13} ry={0.17} color={inner} ring={0.02} ringColor="#0c0a10" lift={1.008} mo={p.mo} visible={mOpen(p, 1)} />
    <Decal lon={0} lat={lat - 3} rx={0.3} ry={0.21} color={inner} ring={0.02} ringColor="#0c0a10" lift={1.008} mo={p.mo} visible={mOpen(p, 2)} />
    <Decal lon={0} lat={lat - 9} rx={0.2} ry={0.07} color="#e8607a" lift={1.012} mo={p.mo} visible={mOpen(p, 2) && (p.mo < 0 || p.mo > 0.4)} />
    <Decal lon={0} lat={lat - 1} rx={0.27} ry={0.1} color={inner} ring={0.02} ringColor="#0c0a10" lift={1.008} mo={p.mo} visible={mOpen(p, 3)} />
    <Line lon={0} lat={lat - 3} pts={[[-0.22, -0.05], [0, 0.04], [0.22, -0.05]]} w={0.028} color={line} lift={1.008} visible={p.mouth === 4} />
    <Decal lon={0} lat={lat - 2} rx={0.3} ry={0.17} color={inner} ring={0.02} ringColor="#0c0a10" lift={1.008} mo={p.mo} visible={mOpen(p, 5)} />
    <Decal lon={0} lat={lat + 2} rx={0.26} ry={0.05} color="#fbfbf6" lift={1.012} mo={p.mo} visible={mOpen(p, 5) && (p.mo < 0 || p.mo > 0.35)} />
    <Line lon={0} lat={lat - 2} pts={[[-0.26, -0.03], [-0.13, 0.05], [0, -0.03], [0.13, 0.05], [0.26, -0.03]]} w={0.026} color={line} lift={1.008} visible={p.mouth === 6} />
  </>
);
const Tears: React.FC<{ p: PP; lon: number; lat: number }> = ({ p, lon, lat }) => (
  <>
    {p.tear > 0 &&
      ([1, -1] as const).map((s) => (
        <React.Fragment key={s}>
          {/* одна плоская капля на щеке, фаза 1..3 - ползёт вниз */}
          <Decal lon={s * (lon + 4)} lat={lat - 8 - p.tear * 6} rx={0.085} ry={0.14} color="#5ec8ff" ring={0.02} lift={1.016} />
        </React.Fragment>
      ))}
    {/* третья капля: падает сбоку от лица (только на 3-й фазе) */}
    {p.tear === 3 && <Decal lon={lon + 40} lat={lat - 26} rx={0.075} ry={0.12} color="#5ec8ff" ring={0.02} lift={1.3} rot={-20} />}
  </>
);
/** Капли пота: плоские светлые «капли» на лбу и висках (фаза 1..3 - падают) */
const Sweat: React.FC<{ p: PP }> = ({ p }) =>
  p.sw > 0 ? (
    <>
      {([1, -1] as const).map((s) => (
        <Decal key={s} lon={s * 44} lat={30 - ((p.sw + (s > 0 ? 1 : 0)) % 3) * 8} rx={0.085} ry={0.15} color="#bfeaff" ring={0.02} lift={1.03} rot={s * 14} />
      ))}
    </>
  ) : null;

// ---------- 3D-очки: линзы и дужки - настоящие объёмы на голове, поворачиваются вместе с ней ----------
const Bar: React.FC<{ a: THREE.Vector3; b: THREE.Vector3; w: number; color: string }> = ({ a, b, w, color }) => {
  const d = b.clone().sub(a);
  const len = d.length();
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), d.normalize());
  return (
    <group position={a.clone().add(b).multiplyScalar(0.5).toArray() as [number, number, number]} quaternion={q}>
      <Part geo={rbox(w, w, len, w * 0.4)} color={color} px={2.4} />
    </group>
  );
};
/** Круглые очки Тони (до снятия): толстая линза-диск впереди выпуклых глаз */
const RoundSpecs: React.FC<{ h: HeadDim; lon: number; lat: number; rw: number; rh: number; lens: string; frame: string }> = ({ h, lon, lat, rw, rh, lens, frame }) => {
  const out = 0.13;
  return (
    <group>
      {([1, -1] as const).map((s) => (
        <group key={s} position={headPt(h, s * lon, lat, out).toArray() as [number, number, number]} quaternion={headNormalQ(h, s * lon, lat)}>
          <Part geo={sphereGeo(20)} color={frame} px={3} position={[0, 0, -0.004]} scale={[rw * 1.14, rh * 1.14, 0.05]} />
          <Part geo={sphereGeo(20)} color={lens} px={0} position={[0, 0, 0.02]} scale={[rw, rh, 0.045]} />
        </group>
      ))}
      <Bar a={headPt(h, 9, lat + 2, out)} b={headPt(h, -9, lat + 2, out)} w={0.03} color={frame} />
      {([1, -1] as const).map((s) => (
        <Bar key={s} a={headPt(h, s * (lon + 20), lat, out - 0.02)} b={new THREE.Vector3(s * (h.rx - 0.004), -0.02, 0.0)} w={0.028} color={frame} />
      ))}
    </group>
  );
};
/** Очки-авиаторы: каплевидные линзы (широкий верх, сужение вниз к носу), золотая оправа с двойной перемычкой; на одной линзе одна светлая диагональная трещина */
const aviatorPts = (side: 1 | -1, k: number): Array<[number, number]> => {
  const out: Array<[number, number]> = [];
  const N = 26;
  for (let i = 0; i < N; i++) {
    const a = (i / N) * Math.PI * 2;
    let x = Math.cos(a);
    const y = Math.sin(a);
    if (y < 0) x = x * (1 + 0.3 * y) - 0.2 * -y;
    out.push([side * x * k, y * k * 1.0]);
  }
  return side === -1 ? out.reverse() : out;
};
const Aviators: React.FC<{ h: HeadDim; lon: number; lat: number; rw: number; rh: number; lens: string; frame: string; crackSide?: 1 | -1 }> = ({ h, lon, lat, rw, rh, lens, frame, crackSide }) => {
  const out = 0.045;
  const outer = lon + ((rw * 1.1) / (h.rx * Math.cos(lat * D))) / D;
  return (
    <group>
      {([1, -1] as const).map((s) => {
        const L = extrude(`avi_l_${s}_${rw}_${rh}`, aviatorPts(s, 1).map(([x, y]) => [x * rw, y * rh] as [number, number]), 0.03, 0.012);
        const R = extrude(`avi_r_${s}_${rw}_${rh}`, aviatorPts(s, 1.13).map(([x, y]) => [x * rw, y * rh] as [number, number]), 0.016, 0.008);
        return (
          <group key={s} position={headPt(h, s * lon, lat, out).toArray() as [number, number, number]} quaternion={headNormalQ(h, s * lon, lat)}>
            <Part geo={R.geo} hull={R.hull} color={frame} px={3} position={[0, 0, -0.012]} />
            <Part geo={L.geo} hull={L.hull} color={lens} px={0} position={[0, 0, 0.004]} />
            {crackSide === s && <Flat geo={planeGeo} color="#ffffff" position={[0, 0, 0.0325]} rotation={[0, 0, s * 0.95]} scale={[rh * 2.05, 0.016, 1]} />}
          </group>
        );
      })}
      <Bar a={headPt(h, 11, lat + 7, out + 0.008)} b={headPt(h, -11, lat + 7, out + 0.008)} w={0.026} color={frame} />
      <Bar a={headPt(h, 8, lat + 15, out)} b={headPt(h, -8, lat + 15, out)} w={0.022} color={frame} />
      {([1, -1] as const).map((s) => (
        <Bar key={s} a={headPt(h, s * outer, lat + 8, out - 0.01)} b={new THREE.Vector3(s * (h.rx - 0.004), 0.0, 0.0)} w={0.026} color={frame} />
      ))}
    </group>
  );
};

// ---------- Тони ----------
const TonyFace: React.FC<{ p: PP }> = ({ p }) => {
  const c = COL.tony;
  return (
    <>
      <Decal lon={0} lat={62} rx={1.2} ry={0.62} color={c.hair} ring={0.03} lift={1.01} />
      {/* борода: одна плоская тёмная форма по челюсти + усы (без штрихов) */}
      <Decal lon={0} lat={-46} rx={1.12} ry={0.52} color={c.beard} lift={1.006} />
      <Decal lon={0} lat={-25} rx={0.34} ry={0.08} color={c.beard} lift={1.007} />
      <Brows p={p} lat={36} lon={22} w={0.085} color={c.hair} />
      <Tears p={p} lon={21} lat={8} />
      <Sweat p={p} />
      <Mouth p={p} lat={-37} line="#f0b8a0" inner="#6a1020" />
    </>
  );
};

// ---------- Маркус ----------
const MarcusFace: React.FC<{ p: PP }> = ({ p }) => {
  const c = COL.marcus;
  return (
    <>
      <Decal lon={0} lat={64} rx={1.1} ry={0.6} color={c.hair} ring={0.03} lift={1.01} />
      <Line lon={0} lat={-27} pts={[[-0.24, -0.02], [0, 0.03], [0.24, -0.02]]} w={0.02} color={c.hair} lift={1.008} />
      <Tears p={p} lon={21} lat={-4} />
      <Sweat p={p} />
      <Mouth p={p} lat={-38} line="#0c0a10" inner="#2a0a12" />
    </>
  );
};

// ---------- Хлоя ----------
const ChloeFace: React.FC<{ p: PP }> = ({ p }) => {
  const c = COL.chloe;
  return (
    <>
      <Brows p={p} lat={36} lon={23} w={0.045} color={c.hairDark} />
      {/* чёлка: гладкая шапка над бровями (без зубцов, чтобы не мешала глазам) */}
      <Decal lon={0} lat={72} rx={1.3} ry={0.5} color={c.hair} ring={0.03} lift={1.012} />
      {/* кольцо в носу */}
      <Decal lon={5} lat={-14} rx={0.075} ry={0.075} color={c.skin} ring={0.022} ringColor="#ffd23a" lift={1.012} />
      <Decal lon={0} lat={-12} rx={0.03} ry={0.03} color="#c88a78" lift={1.01} />
      <Tears p={p} lon={23} lat={6} />
      <Sweat p={p} />
      <Mouth p={p} lat={-35} line="#0c0a10" inner="#4a0a1a" />
    </>
  );
};

// ---------- сборка ----------
interface Build {
  head: { rx: number; ry: number; rz: number };
  headCol: string;
  skin: string;
  pelvis: [number, number, number];
  pelvisCol: string;
  torso: [number, number, number];
  torsoCol: string;
  arm: ArmSpec;
  leg: LegSpec;
}
const HAIR_SKIRT = (c: string, d: string) => (
  <>
    {/* боб поменьше: шапка волос на затылке и две короткие пряди по бокам */}
    <Part geo={sphereGeo(24)} color={c} px={3.4} position={[0, 0.1, -0.08]} scale={[0.56, 0.4, 0.4]} />
    {([1, -1] as const).map((s) => (
      <Part key={s} geo={rbox(0.1, 0.26, 0.34, 0.04)} color={d} px={3} position={[s * 0.5, -0.06, -0.06]} rotation={[0, 0, s * 0.05]} />
    ))}
  </>
);

const TonyBuild: Build = (() => {
  const c = COL.tony;
  return {
    head: { rx: 0.5, ry: 0.45, rz: 0.46 },
    headCol: c.skin,
    skin: c.skin,
    pelvis: [0.78, 0.2, 0.46],
    pelvisCol: c.shorts,
    torso: [1.12, 0.6, 0.58],
    torsoCol: c.tank,
    arm: { sx: 0.5, up: 1.85, fo: 1.45, hand: 1.0, upCol: c.skin, foCol: c.skin, bicep: 1.0, delt: c.skin, skin: c.skin, len: 1.4 },
    leg: {
      hipX: 0.21, th: 1.55, ca: 1.35, thCol: c.shorts, caCol: c.skin, sock: c.sock,
      shoe: (
        <>
          <Part geo={rbox(0.3, 0.13, 0.42, 0.06)} color={c.shoe} position={[0, -0.145, 0.08]} />
          <Part geo={rbox(0.31, 0.04, 0.43, 0.02)} color={c.sole} px={2.4} position={[0, -0.2, 0.08]} />
        </>
      ),
    },
  };
})();
const MarcusBuild: Build = (() => {
  const c = COL.marcus;
  return {
    head: { rx: 0.5, ry: 0.47, rz: 0.43 },
    headCol: c.skin,
    skin: c.skin,
    pelvis: [0.58, 0.22, 0.34],
    pelvisCol: c.pants,
    torso: [0.6, 0.6, 0.38],
    torsoCol: c.leo,
    arm: { sx: 0.37, up: 0.95, fo: 0.9, hand: 1.0, upCol: c.leo, foCol: c.skin, upSleeve: true, skin: c.skin, len: 1.3, spotCol: c.spot },
    leg: {
      hipX: 0.16, th: 1.08, ca: 1.02, thCol: c.pants, caCol: c.pants,
      shoe: <Part geo={rbox(0.22, 0.12, 0.38, 0.05)} color={c.shoe} position={[0, -0.14, 0.09]} />,
    },
  };
})();
const ChloeBuild: Build = (() => {
  const c = COL.chloe;
  return {
    head: { rx: 0.54, ry: 0.47, rz: 0.45 },
    headCol: c.skin,
    skin: c.skin,
    pelvis: [0.5, 0.2, 0.34],
    pelvisCol: c.pants,
    torso: [0.86, 0.6, 0.5],
    torsoCol: c.hood,
    arm: { sx: 0.5, up: 1.3, fo: 1.28, hand: 0.95, upCol: c.hood, foCol: c.hood, upSleeve: true, foSleeve: true, skin: c.skin, len: 1.3 },
    leg: {
      hipX: 0.13, th: 0.82, ca: 0.8, thCol: c.pants, caCol: c.pants,
      shoe: (
        <>
          <Part geo={rbox(0.2, 0.2, 0.34, 0.06)} color={c.boot} position={[0, -0.1, 0.06]} />
          <Part geo={rbox(0.21, 0.05, 0.36, 0.02)} color={c.sole} px={2.4} position={[0, -0.2, 0.06]} />
        </>
      ),
    },
  };
})();
const BUILDS: Record<CastKind, Build> = { tony: TonyBuild, marcus: MarcusBuild, chloe: ChloeBuild };

// ---------- одежда на торсе ----------
/** V-образный торс Тони: широкие плечи, узкая талия (трапеция с фаской), розовая майка в обтяжку */
const TONY_TORSO = extrude("tony_v_torso", [[-0.3, 0], [0.3, 0], [0.5, 0.6], [-0.5, 0.6]], 0.44, 0.07);
const TonyBody: React.FC = () => {
  const c = COL.tony;
  return (
    <>
      <Part geo={TONY_TORSO.geo} hull={TONY_TORSO.hull} color={c.tank} />
      {/* грудные мышцы (под майкой), трапеции и бычья шея */}
      {([1, -1] as const).map((s) => (
        <React.Fragment key={s}>
          <Part geo={sphereGeo(18)} color={c.tank} px={0} position={[s * 0.25, 0.4, 0.2]} scale={[0.27, 0.17, 0.14]} />
          <Part geo={sphereGeo(16)} color={c.skin} px={2.8} position={[s * 0.27, 0.63, -0.02]} scale={[0.26, 0.13, 0.2]} />
        </React.Fragment>
      ))}
      <Part geo={rcyl(0.21, 0.23, 0.34, 0.05, 22)} color={c.skin} position={[0, 0.7, 0]} />
    </>
  );
};
const TonyTorso: React.FC = () => {
  const c = COL.tony;
  const d = 0.58;
  const v = polyGeo("tony_v", [[-0.21, 0.0], [0.21, 0.0], [0.1, -0.24], [-0.1, -0.24]]);
  return (
    <>
      {/* вырез майки кожей */}
      <Flat geo={v} color={c.skin} position={[0, 0.6, d / 2 + 0.004]} />
      {/* кулон-цепь */}
      <Flat geo={circleGeo} color="#ffd23a" position={[0, 0.45, d / 2 + 0.034]} scale={0.04} />
    </>
  );
};
const MarcusTorso: React.FC = () => {
  const c = COL.marcus;
  const [w, , d] = MarcusBuild.torso;
  // рубашка расстёгнута до пупа: широкий V-вырез кожей, видна грудь
  const v = polyGeo("marcus_v2", [[-0.19, 0.0], [0.19, 0.0], [0.045, -0.53], [-0.045, -0.53]]);
  const hw = (y: number) => 0.05 + ((y - 0.05) / 0.53) * 0.15;
  // крупные плоские коричневые пятна-эллипсы по обе стороны от выреза
  const spots: Array<[number, number, number, number]> = [
    [-0.24, 0.5, 0.05, 30], [-0.15, 0.34, 0.045, -30], [-0.24, 0.24, 0.05, 50], [-0.13, 0.12, 0.04, 0], [-0.22, 0.07, 0.045, -40],
    [0.24, 0.48, 0.048, -35], [0.15, 0.33, 0.05, 25], [0.25, 0.23, 0.045, -50], [0.13, 0.11, 0.042, 10], [0.22, 0.06, 0.046, 40],
  ];
  return (
    <>
      <Flat geo={v} color={c.skin} position={[0, 0.58, d / 2 + 0.004]} />
      {spots.map(([x, y, r, rot], i) => (
        <Dot key={i} w={w} d={d} x={Math.sign(x) * Math.max(Math.abs(x), hw(y) + 0.07)} y={y} r={r} sx={1.7} rot={(rot * Math.PI) / 180} color={c.spot} lift={0.006} />
      ))}
      {/* линия груди и пупок */}
      <Flat geo={circleGeo} color="#0c0a10" position={[0, 0.06, d / 2 + 0.006]} scale={[0.016, 0.016, 1]} />
      {([1, -1] as const).map((s) => (
        <Flat key={s} geo={planeGeo} color="#e0b49c" position={[s * 0.075, 0.38, d / 2 + 0.006]} rotation={[0, 0, -s * 0.08]} scale={[0.1, 0.014, 1]} />
      ))}
      {/* большие воротничковые лацканы */}
      {([1, -1] as const).map((s) => (
        <Part key={s} geo={rbox(0.15, 0.17, 0.03, 0.012)} color={c.leo} px={2.6} position={[s * 0.18, 0.55, d / 2 + 0.01]} rotation={[0, 0, -s * 0.5]} />
      ))}
      {/* золотая цепочка */}
      <Flat geo={circleGeo} color={c.gold} position={[0, 0.4, d / 2 + 0.008]} scale={0.026} />
    </>
  );
};
const ChloeTorso: React.FC<{ p: PP }> = () => {
  const c = COL.chloe;
  const [w, , d] = ChloeBuild.torso;
  const front = d / 2 + 0.005;
  const badges: Array<[number, number, number, string]> = [
    [-0.37, 0.5, 0.034, "#ff2fa8"], [-0.37, 0.4, 0.03, "#ffd23a"], [0.37, 0.5, 0.034, "#7dff1a"], [0.37, 0.4, 0.03, "#ff3b3b"], [-0.37, 0.1, 0.03, "#ff8a1c"], [0.37, 0.1, 0.03, "#b06bff"],
  ];
  return (
    <>
      <Part geo={rbox(w + 0.04, 0.1, d + 0.04, 0.04)} color={c.hoodDark} px={2.8} position={[0, 0.04, 0]} />
      <TexPlane tex={hoodTex()} w={0.82} h={0.5} position={[0, 0.215, front + 0.012]} cutout />
      {badges.map(([x, y, r, col], i) => (
        <Dot key={i} w={w} d={d} x={x} y={y} r={r} color={col} ink lift={0.01} />
      ))}
      {/* капюшон за шеей и шнурки */}
      <Part geo={sphereGeo(20)} color={c.hoodDark} position={[0, 0.62, -0.17]} scale={[0.4, 0.2, 0.2]} />
    </>
  );
};

export const Cast: React.FC<{ pose: PP; kind: CastKind; shadow?: boolean; groundY?: number }> = ({ pose: p, kind, shadow = true, groundY = 0 }) => {
  const b = BUILDS[kind];
  const [pw, ph, pd] = b.pelvis;
  const [tw, th, td] = b.torso;
  const sir = p.sir;
  // предметы в руках: Хлоя всегда держит мегафон правой (ручка в кулаке) и плакат левой; ориентацию задают hp (тангаж, вниз +), my (рыскание), cup (крен плаката)
  const heldR = kind === "tony" ? (p.hp === 1 ? <Shades /> : null) : kind === "chloe" ? <Megaphone sir={sir} /> : null;
  const heldOriR: [number, number, number] | undefined = kind === "chloe" ? [p.hp, p.my, 0] : undefined;
  const heldL = kind === "chloe" && p.pl === 0 ? <Placard /> : null;
  const heldOriL: [number, number, number] | undefined = kind === "chloe" ? [0, p.py, p.cup] : undefined;
  const shrug = kind === "chloe" && p.hdy < -0.1 ? -p.hdy * 0.5 : 0;
  return (
    <>
      {shadow && <Shadow position={[p.x, groundY + 0.02, p.z]} w={(kind === "tony" ? 0.8 : kind === "chloe" ? 0.6 : 0.46) * p.scale} d={0.34 * p.scale} />}
      {kind === "chloe" && p.pl > 0 && (
        // плакат воткнут в землю рядом (не закрывает ни лицо, ни худи)
        <group position={[p.x + (p.pl === 1 ? -1.0 : 1.0) * p.scale, groundY + 0.3 * p.scale, p.z - 0.25]} rotation={[0, p.pl === 1 ? 0.25 : -0.25, p.pl === 1 ? 0.06 : -0.06]} scale={p.scale}>
          <Placard />
        </group>
      )}
      <group position={[p.x, p.y, p.z]} scale={p.scale}>
        <group rotation={[0, 0, p.rz * D2R]}>
          <group rotation={[0, p.ry * D2R, 0]}>
            <group rotation={[p.rx * D2R, 0, 0]}>
              {/* таз + ноги */}
              <Part geo={rbox(pw, ph, pd, 0.07)} color={b.pelvisCol} position={[0, -0.02, 0]} />
              {kind === "marcus" && <Part geo={rbox(pw + 0.02, 0.06, pd + 0.02, 0.02)} color={COL.marcus.belt} px={2.4} position={[0, 0.07, 0]} />}
              <Leg2 side={1} swing={p.llx} spread={p.llz} knee={p.llk} spec={b.leg} toe={p.toe} />
              <Leg2 side={-1} swing={p.lrx} spread={p.lrz} knee={p.lrk} spec={b.leg} toe={p.toe} />
              {/* торс */}
              <group rotation={[p.tl * D2R, p.ty * D2R, p.tz * D2R]}>
                {kind === "tony" ? <TonyBody /> : <Part geo={rbox(tw, th, td, 0.13)} color={b.torsoCol} position={[0, 0.3, 0]} />}
                {kind === "tony" && <TonyTorso />}
                {kind === "marcus" && <MarcusTorso />}
                {kind === "chloe" && <ChloeTorso p={p} />}

                {/* сумочка на бедре (не закрывает грудь), ремешок вдоль бока */}
                {kind === "marcus" && (
                  <group position={[-0.34, 0.02, td / 2 + 0.05]} rotation={[0.1, 0, 0.12]} scale={0.8}>
                    <Part geo={rbox(0.42, 0.28, 0.14, 0.05)} color={COL.marcus.bag} px={3} />
                    <Part geo={rbox(0.1, 0.07, 0.02, 0.01)} color={COL.marcus.gold} px={2} position={[0, 0.07, 0.078]} />
                    <Part geo={rcyl(0.022, 0.022, 0.5, 0.008, 8)} color={COL.marcus.gold} px={2.4} position={[-0.1, 0.36, -0.02]} rotation={[0, 0, -0.16]} />
                  </group>
                )}
                <Arm2 side={1} swing={p.alx} abd={p.alz} elbow={p.ale} twist={p.atl} spec={b.arm} hand={p.hl} held={heldL} heldOri={heldOriL} heldY={-0.03} shrug={shrug} />
                <Arm2 side={-1} swing={p.arx} abd={p.arz} elbow={p.are} twist={p.atr} spec={b.arm} hand={p.hr} held={heldR} heldOri={heldOriR} heldY={-0.03} shrug={shrug} />
                {/* голова */}
                <group position={[p.hdx, 0.93 + p.hdy + (kind === "tony" ? 0.07 : 0), 0]} rotation={[p.hx * D2R, p.hy * D2R, p.hz * D2R]}>
                  <Part geo={sphereGeo(32)} color={b.headCol} px={3.6} scale={[b.head.rx, b.head.ry, b.head.rz]} />
                  {[1, -1].map((s) => (
                    <Part key={s} geo={sphereGeo(14)} color={b.skin} px={2.8} position={[s * (b.head.rx + 0.005), -0.04, -0.02]} scale={[0.05, 0.1, 0.075]} />
                  ))}
                  {kind === "marcus" && (
                    <>
                      <Part geo={sphereGeo(20)} color={COL.marcus.hair} px={3.2} position={[0, 0.4, 0.07]} scale={[0.34, 0.22, 0.3]} />
                      <Part geo={sphereGeo(16)} color={COL.marcus.hair} px={3} position={[0, 0.5, 0.19]} scale={[0.22, 0.14, 0.18]} />
                    </>
                  )}
                  {kind === "chloe" && HAIR_SKIRT(COL.chloe.hair, COL.chloe.hairDark)}
                  {/* выпуклые глаза-шары (у Маркуса закрыты тёмными линзами) */}
                  {(kind !== "marcus" || p.acc === 1) && (
                    <>
                      <Eye3 h={b.head} side={1} lon={kind === "chloe" ? 23 : 21} lat={kind === "chloe" ? 6 : 8} re={kind === "chloe" ? 0.14 : 0.145} st={p.eyeL} lx={p.lx} ly={p.ly} lid={b.skin} />
                      <Eye3 h={b.head} side={-1} lon={kind === "chloe" ? 23 : 21} lat={kind === "chloe" ? 6 : 8} re={kind === "chloe" ? 0.14 : 0.145} st={p.eyeR} lx={p.lx} ly={p.ly} lid={b.skin} />
                    </>
                  )}
                  {kind === "tony" && p.acc === 0 && <RoundSpecs h={b.head} lon={25} lat={8} rw={0.19} rh={0.16} lens="#3a2f6e" frame="#15121f" />}
                  {kind === "marcus" && p.acc !== 1 && <Aviators h={b.head} lon={26} lat={4} rw={0.17} rh={0.19} lens="#2a2350" frame="#e8b820" crackSide={-1} />}
                  <group scale={[b.head.rx, b.head.ry, b.head.rz]}>
                    {kind === "tony" ? <TonyFace p={p} /> : kind === "marcus" ? <MarcusFace p={p} /> : <ChloeFace p={p} />}
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

// сцена 3 (Cast3.tsx) использует эти детали
export { Hand, Arm2, Leg2, Brows, Mouth, Tears, Sweat, polyGeo, TexPlane, Dot, textTex };
export type { ArmSpec, LegSpec };
