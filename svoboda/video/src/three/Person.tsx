// Персонаж South Park из геометрии: голова-блин, тело, варежки, обрубки-ноги. Жёсткие части на шарнирах.
import React from "react";
import * as THREE from "three";
import { Part, Flat, rbox, rcyl, sphereGeo, Shadow } from "./toon";
import { Decal, Line } from "./decal";
import { D2R } from "./util";
import { Eye3 } from "./Eyes3d";

export interface PP {
  x: number; y: number; z: number; // таз (мир)
  rx: number; ry: number; rz: number; // градусы: Rz(внешний) · Ry · Rx(внутренний)
  tl: number; ty: number; tz: number; // торс: наклон вперёд, поворот, наклон вбок
  hx: number; hy: number; hz: number; hdx: number; hdy: number; // голова: кивок вниз +, поворот влево(+x) +, крен; смещение
  alx: number; alz: number; ale: number; arx: number; arz: number; are: number; // руки: взмах вперёд, отвод, локоть
  llx: number; llz: number; llk: number; lrx: number; lrz: number; lrk: number; // ноги: взмах вперёд, разведение, колено
  mouth: number; // 0 закрыт, 1 «о», 2 широкий «а», 3 «э»
  eyeL: number; eyeR: number; // 0 норм, 1 широко, 2 прищур, 3 закрыт
  lx: number; ly: number; // взгляд
  brow: number; // -1 нахмурен .. 1 поднят
  cup: number; // наклон стакана (град)
  scale: number;
  // сцена 2 (Cast.tsx): аксессуар (0 - как есть, 1 - снят/убран), слёзы (0..3 фаза капли), руки: 0 варежка, 1 палец, 2 кулак; наклон предмета в руке; сирена мегафона (0 выкл, 1..4 фаза)
  acc: number; tear: number; hl: number; hr: number; hp: number; sir: number;
  sw: number; toe: number; my: number; py: number; // пот-капли (0 нет, 1..3 фаза), наклон стоп (носки вниз +), поворот мегафона (рыскание)
  atl: number; atr: number; // скрутка плеча вокруг своей оси (град): локоть сгибает предплечье вверх при отведённой руке (бицепс)
}
export const P0: PP = {
  x: 0, y: 0, z: 0, rx: 0, ry: 0, rz: 0, tl: 0, ty: 0, tz: 0, hx: 0, hy: 0, hz: 0, hdx: 0, hdy: 0,
  alx: 0, alz: 8, ale: 0, arx: 0, arz: 8, are: 0, llx: 0, llz: 4, llk: 0, lrx: 0, lrz: 4, lrk: 0,
  mouth: 0, eyeL: 0, eyeR: 2, lx: 0, ly: 0, brow: 0, cup: 0, scale: 1, acc: 0, tear: 0, hl: 0, hr: 0, hp: 0, sir: 0, sw: 0, toe: 0, my: 0, py: 0, atl: 0, atr: 0,
};
export type PPatch = Partial<PP>;
export const mixP = (...parts: Array<PPatch | undefined>): PP => Object.assign({}, P0, ...parts.filter(Boolean)) as PP;

export interface Palette {
  skin: string; shirt: string; collar: string; tie: string; pants: string; belt: string; shoes: string; hair: string; head: string; cuff: string;
}
export const GREG_COL: Palette = { skin: "#f4cfa4", shirt: "#e7d3a2", collar: "#f3e6c0", tie: "#d3293a", pants: "#6f5a43", belt: "#17151a", shoes: "#1a181d", hair: "#6a4322", head: "#f4cfa4", cuff: "#e7d3a2" };
// сцена 2: Грег ярче и контрастнее на тёмно-синем фоне (почти белая рубашка, тёмные штаны, яркий галстук)
export const GREG_S2: Palette = { ...GREG_COL, shirt: "#fff6d6", collar: "#ffffff", cuff: "#fff6d6", tie: "#ff2a3c", pants: "#43301f", skin: "#ffd9ae", head: "#ffd9ae" };
export const ALIEN_COL: Palette = { skin: "#f2c49b", shirt: "#f2c49b", collar: "#f2c49b", tie: "#f2c49b", pants: "#f2c49b", belt: "#f2c49b", shoes: "#f2c49b", hair: "#9ba7ae", head: "#a8b8c0", cuff: "#f2c49b" };

// ---- лицо Грега (глаза-шары рисуются отдельно, см. Person) ----
const SCAR_PTS: Array<[number, number]> = [[-0.26, 0.49], [-0.1, 0.2], [0.04, -0.08], [0.17, -0.35], [0.26, -0.49]];
const GregFace: React.FC<{ p: PP; c: Palette; big?: boolean }> = ({ p, c, big: bigScar }) => {
  const eyeY = 8;
  const brow = (side: 1 | -1) => (
    <Line key={`b${side}`} lon={side * 20} lat={eyeY + 30 + p.brow * 3} pts={[[-0.28, side * 0.0 - 0.03 * p.brow * side], [0.0, 0.03 + 0.03 * p.brow], [0.28, 0.0]]}
      w={0.05} color={c.hair} rot={side * (-12 + p.brow * -18)} lift={1.01} />
  );
  // шрам: длинная красная линия через щёку (правая щека Грега - ближняя к камере) + плоские тёмные стежки поперёк
  const stitches = [0.12, 0.31, 0.5, 0.69, 0.88].map((t) => {
    const f = t * (SCAR_PTS.length - 1);
    const i = Math.min(SCAR_PTS.length - 2, Math.floor(f));
    const k = f - i;
    return [SCAR_PTS[i][0] + (SCAR_PTS[i + 1][0] - SCAR_PTS[i][0]) * k, SCAR_PTS[i][1] + (SCAR_PTS[i + 1][1] - SCAR_PTS[i][1]) * k] as [number, number];
  });
  return (
    <>
      {/* волосы по бокам, зачёс */}
      <Decal lon={-84} lat={22} rx={0.5} ry={0.62} color={c.hair} ring={0.035} lift={1.012} />
      <Decal lon={84} lat={22} rx={0.5} ry={0.62} color={c.hair} ring={0.035} lift={1.012} />
      <Line lon={0} lat={62} pts={[[-0.5, -0.04], [-0.2, 0.06], [0.1, 0.07], [0.45, -0.02]]} w={0.03} color={c.hair} lift={1.008} />
      <Line lon={0} lat={70} pts={[[-0.4, 0.0], [-0.05, 0.08], [0.35, 0.02]]} w={0.028} color={c.hair} lift={1.008} />
      {brow(1)}
      {brow(-1)}
      {bigScar ? (
        <>
          <Line lon={-25} lat={-12} pts={SCAR_PTS} w={0.034} color="#e0182c" lift={1.012} />
          {stitches.map(([u, v], i) => (
            <Line key={i} lon={-25} lat={-12} pts={[[u - 0.1, v - 0.055], [u + 0.1, v + 0.055]]} w={0.016} color="#0c0a10" lift={1.02} />
          ))}
        </>
      ) : (
        <Line lon={-25} lat={-12} pts={SCAR_PTS} w={0.026} color="#cc2a3c" lift={1.012} />
      )}
      {/* рот-створка */}
      <Line lon={0} lat={-37} pts={[[-0.26, -0.02], [0, 0.03], [0.26, -0.02]]} w={0.026} color="#0c0a10" lift={1.008} visible={p.mouth === 0} />
      <Decal lon={0} lat={-37} rx={0.13} ry={0.17} color="#0c0a10" lift={1.008} visible={p.mouth === 1} />
      <Decal lon={0} lat={-40} rx={0.3} ry={0.21} color="#0c0a10" lift={1.008} visible={p.mouth === 2} />
      <Decal lon={0} lat={-46} rx={0.2} ry={0.07} color="#d9505f" lift={1.012} visible={p.mouth === 2} />
      <Decal lon={0} lat={-38} rx={0.27} ry={0.1} color="#0c0a10" lift={1.008} visible={p.mouth === 3} />
      {/* отвращение: перекошенная дуга вниз (4) и зубастая гримаса (6) */}
      <Line lon={0} lat={-41} pts={[[-0.3, -0.06], [-0.1, 0.05], [0.12, 0.03], [0.32, -0.08]]} w={0.034} color="#0c0a10" lift={1.009} visible={p.mouth === 4} />
      <Decal lon={0} lat={-40} rx={0.34} ry={0.15} color="#0c0a10" ring={0.015} lift={1.008} visible={p.mouth === 6} />
      <Decal lon={0} lat={-36.5} rx={0.28} ry={0.05} color="#fbfbf6" lift={1.012} visible={p.mouth === 6} />
    </>
  );
};

// ---- лицо пришельца-маски ----
const AlienFace: React.FC<{ p: PP }> = ({ p }) => (
  <>
    {[1, -1].map((s) => (
      <React.Fragment key={s}>
      <Decal lon={s * 26} lat={-4} rx={0.36} ry={0.17} rot={-s * 28} color="#0b0b12" ring={0.03} lift={1.006} />
      <Decal lon={s * 33} lat={3} rx={0.06} ry={0.04} color="#dfe8ee" lift={1.012} />
      </React.Fragment>
    ))}
    <Line lon={0} lat={-36} pts={[[-0.1, 0], [0.1, 0]]} w={0.02} color="#0b0b12" lift={1.008} visible={p.mouth === 0} />
    <Decal lon={0} lat={-36} rx={0.09} ry={0.12} color="#0b0b12" lift={1.008} visible={p.mouth > 0} />
    {/* маска: ободок по краю лба */}
    <Line lon={0} lat={40} pts={[[-0.9, 0], [-0.45, 0.08], [0.45, 0.08], [0.9, 0]]} w={0.025} color="#6f7f88" lift={1.006} />
  </>
);

const Cup: React.FC = () => (
  <group>
    <Part geo={rcyl(0.062, 0.078, 0.2, 0.018)} color="#fbfbf6" px={3.2} position={[0, 0.0, 0]} />
    <Part geo={rcyl(0.07, 0.074, 0.075, 0.01)} color="#ff3a22" px={0} position={[0, -0.005, 0]} scale={[1.03, 1, 1.03]} />
    <Part geo={rcyl(0.082, 0.084, 0.035, 0.012)} color="#2a1a14" px={3} position={[0, 0.115, 0]} />
  </group>
);

const Arm: React.FC<{ side: 1 | -1; swing: number; abd: number; elbow: number; c: Palette; cup?: boolean; cupTilt?: number; cupFix?: number; sleeve?: boolean; cupScale?: number }> = ({ side, swing, abd, elbow, c, cup, cupTilt = 0, cupFix = 0, sleeve = true, cupScale = 1.35 }) => (
  <group position={[side * 0.35, 0.5, 0]} rotation={[-swing * D2R, 0, side * abd * D2R]}>
    {sleeve && <Part geo={rcyl(0.112, 0.105, 0.2, 0.035)} color={c.cuff} position={[0, -0.09, 0]} />}
    {!sleeve && <Part geo={rcyl(0.085, 0.08, 0.2, 0.035)} color={c.skin} position={[0, -0.09, 0]} />}
    <group position={[0, -0.2, 0]} rotation={[-elbow * D2R, 0, 0]}>
      <Part geo={rcyl(0.078, 0.086, 0.24, 0.035)} color={c.skin} position={[0, -0.1, 0]} />
      <Part geo={sphereGeo(20)} color={c.skin} position={[0, -0.27, 0]} scale={[0.115, 0.12, 0.1]} />
      {cup && (
        <group position={[0, -0.27, 0.0]} rotation={[(swing + elbow + cupFix) * D2R, 0, cupTilt * D2R]} scale={cupScale}>
          <Cup />
        </group>
      )}
    </group>
  </group>
);

const Leg: React.FC<{ side: 1 | -1; swing: number; spread: number; knee: number; c: Palette; shoes?: boolean }> = ({ side, swing, spread, knee, c, shoes = true }) => (
  <group position={[side * 0.145, -0.04, 0]} rotation={[-swing * D2R, 0, side * spread * D2R]}>
    <Part geo={rcyl(0.125, 0.12, 0.2, 0.04)} color={c.pants} position={[0, -0.09, 0]} />
    <group position={[0, -0.19, 0]} rotation={[knee * D2R, 0, 0]}>
      <Part geo={rcyl(0.118, 0.112, 0.17, 0.04)} color={c.pants} position={[0, -0.05, 0]} />
      {shoes ? <Part geo={rbox(0.23, 0.11, 0.36, 0.05)} color={c.shoes} position={[0, -0.145, 0.07]} /> : <Part geo={rbox(0.2, 0.09, 0.3, 0.04)} color={c.skin} position={[0, -0.15, 0.05]} />}
    </group>
  </group>
);

const HEAD_G = { rx: 0.56, ry: 0.47, rz: 0.46 };
const HEAD_A = { rx: 0.4, ry: 0.52, rz: 0.36 };

// ---- лицо статиста ----
const PlainFace: React.FC<{ p: PP; c: Palette }> = ({ p, c }) => (
  <>
    <Decal lon={0} lat={0} rx={0} color={c.hair} lift={1.0} visible={false} />
    <Decal lon={0} lat={58} rx={1.05} ry={0.55} color={c.hair} lift={1.01} ring={0.03} />
    {[1, -1].map((s) => (
      <React.Fragment key={s}>
        <Decal lon={s * 15} lat={6} rx={0.27} color="#fbfbf6" ring={0.04} lift={1.004} />
        <Decal lon={s * 15 + p.lx * 6} lat={6 + p.ly * 6} rx={0.07} color="#0c0a10" lift={1.011} />
      </React.Fragment>
    ))}
    <Line lon={0} lat={-34} pts={[[-0.25, -0.02], [0, 0.03], [0.25, -0.02]]} w={0.026} color="#0c0a10" lift={1.008} visible={p.mouth === 0} />
    <Decal lon={0} lat={-36} rx={0.13} ry={0.18} color="#0c0a10" lift={1.008} visible={p.mouth > 0} />
  </>
);

export const Person: React.FC<{ pose: PP; kind?: "greg" | "alien" | "extra"; colors?: Palette; shadow?: boolean; groundY?: number; s2?: boolean }> = ({ pose: p, kind = "greg", colors, shadow = true, groundY = 0, s2 = false }) => {
  const c = colors ?? (kind === "alien" ? ALIEN_COL : s2 ? GREG_S2 : GREG_COL);
  const H = kind === "alien" ? HEAD_A : HEAD_G;
  const naked = kind === "alien";
  return (
    <>
      {shadow && <Shadow position={[p.x, groundY + 0.02, p.z]} w={0.5 * p.scale} d={0.34 * p.scale} />}
      <group position={[p.x, p.y, p.z]} scale={p.scale}>
        <group rotation={[0, 0, p.rz * D2R]}>
          <group rotation={[0, p.ry * D2R, 0]}>
            <group rotation={[p.rx * D2R, 0, 0]}>
              {/* таз + ноги */}
              <Part geo={rbox(0.58, 0.2, 0.38, 0.07)} color={c.pants} position={[0, -0.02, 0]} />
              <Leg side={1} swing={p.llx} spread={p.llz} knee={p.llk} c={c} shoes={!naked} />
              <Leg side={-1} swing={p.lrx} spread={p.lrz} knee={p.lrk} c={c} shoes={!naked} />
              {/* торс */}
              <group rotation={[p.tl * D2R, p.ty * D2R, p.tz * D2R]}>
                <Part geo={rbox(0.62, 0.58, 0.4, 0.13)} color={c.shirt} position={[0, 0.3, 0]} />
                {!naked && (
                  <>
                    <Part geo={rbox(0.645, 0.075, 0.425, 0.03)} color={c.belt} px={2.6} position={[0, 0.045, 0]} />
                    <Flat geo={rbox(0.07, 0.055, 0.02, 0.01)} color="#e8c53a" position={[0, 0.045, 0.22]} />
                    {/* воротник и кривой галстук */}
                    <group position={[0, 0.575, 0.18]}>
                      <Part geo={rbox(0.13, 0.05, 0.03, 0.015)} color={c.collar} px={2.4} position={[-0.075, 0.0, 0.01]} rotation={[0, 0, 0.5]} />
                      <Part geo={rbox(0.13, 0.05, 0.03, 0.015)} color={c.collar} px={2.4} position={[0.075, 0.0, 0.01]} rotation={[0, 0, -0.5]} />
                    </group>
                    <group position={[0.015, 0.54, 0.205]} rotation={[0, 0, 0.14]}>
                      <Part geo={rbox(0.085, 0.065, 0.045, 0.02)} color={c.tie} px={2.6} />
                      <Part geo={rbox(0.11, 0.32, 0.03, 0.012)} color={c.tie} px={2.6} position={[0, -0.2, 0.0]} rotation={[0, 0, 0]} />
                    </group>
                  </>
                )}
                {/* руки */}
                <Arm side={1} swing={p.alx} abd={p.alz} elbow={p.ale} c={c} sleeve={!naked} />
                <Arm side={-1} swing={p.arx} abd={p.arz} elbow={p.are} c={c} cup={kind === "greg"} cupTilt={p.cup} cupFix={p.tl} sleeve={!naked} cupScale={s2 ? 2.0 : 1.35} />
                {/* голова: эллипсоид + накладки */}
                <group position={[p.hdx, 0.93 + p.hdy + (naked ? 0.05 : 0), 0]} rotation={[p.hx * D2R, p.hy * D2R, p.hz * D2R]}>
                  <Part geo={sphereGeo(32)} color={c.head} px={3.6} scale={[H.rx, H.ry, H.rz]} />
                  {/* уши */}
                  {!naked && [1, -1].map((s) => <Part key={s} geo={sphereGeo(14)} color={c.skin} px={2.8} position={[s * (H.rx + 0.005), -0.04, -0.02]} scale={[0.05, 0.1, 0.075]} />)}
                  {kind === "greg" && (
                    <>
                      <Eye3 h={H} side={1} lon={20} lat={8} re={0.16} st={p.eyeL} lx={p.lx} ly={p.ly} lid={c.skin} />
                      <Eye3 h={H} side={-1} lon={20} lat={8} re={0.16} st={p.eyeR} lx={p.lx} ly={p.ly} lid={c.skin} />
                    </>
                  )}
                  <group scale={[H.rx, H.ry, H.rz]}>{kind === "greg" ? <GregFace p={p} c={c} big={s2} /> : kind === "alien" ? <AlienFace p={p} /> : <PlainFace p={p} c={c} />}</group>
                </group>
              </group>
            </group>
          </group>
        </group>
      </group>
    </>
  );
};
