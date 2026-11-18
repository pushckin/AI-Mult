// p2/breakthrough — биты p2_door / p2_ded / p2_gamer2: квартира, семья за ужином, десять потных мужиков, тройник в тройник.
import React from "react";
import * as THREE from "three";
import { Character, CharacterProps } from "../../kit/Character";
import { CAST } from "../../kit/cast";
import { Cam, PaperLights, Sheet, CanvasPlane, Puff } from "../../kit/Stage";
import { geo, paper, glow, rng, FONT } from "../../kit/paper";
import { cue, prog, easeOut, easeIn, easeInOut, easeOutBack, shake, twos, hash, lerp, clamp01, mouthFor } from "../../kit/anim";
import { Plasma, BackGear, PowerStrip, Cable, Socket, Fridge, Ventilator, VentMask, Sparks } from "./breakthrough_props";

type V3 = [number, number, number];
const DOOR = () => cue("p2", "p2_door");
const DED = () => cue("p2", "p2_ded");
const G2 = () => cue("p2", "p2_gamer2");
export const FLAT_START = () => cue("p2", "p2_news2").end;
export const DOOR_HIT = () => DOOR().start + 0.35;          // дверь слетает с петель
export const FRIDGE_OFF = () => DOOR().start + 1.25;
export const VENT_OFF = () => DOOR().start + 1.5;
export const CLOSE_IN = () => Math.min(DOOR().start + 1.95, DED().start - 1.2); // крупный: тройники
export const DED_IN = () => DED().start - 0.05;
export const G2_IN = () => DED().end + 0.12;
export const HDMI_AT = () => G2().start + 0.45;
export const REACT_IN = () => G2().start + (G2().end - G2().start) * 0.72;
export const FLAT_END = () => cue("p2", "p2_space").start;
// время тройников внутри крупного плана
export const STRIP_A = () => CLOSE_IN() + 0.22;
export const STRIP_B = () => CLOSE_IN() + 0.5;
export const STRIP_X = (i: number) => CLOSE_IN() + 0.74 + i * 0.12;
export const STRIP_BOOM = () => CLOSE_IN() + 1.1;

// ---------- комната ----------
function drawWallpaper(g: CanvasRenderingContext2D, W: number, H: number) {
  g.fillStyle = "#c9b46b"; g.fillRect(0, 0, W, H);
  for (let x = 0; x < W; x += 64) { g.fillStyle = "#bba45c"; g.fillRect(x, 0, 26, H); }
  g.fillStyle = "#d9c785";
  for (let y = 20; y < H; y += 70) for (let x = 45; x < W; x += 64) { g.beginPath(); g.ellipse(x, y + ((x / 64) % 2) * 35, 6, 9, 0, 0, 7); g.fill(); }
  g.fillStyle = "#7a5a3a"; g.fillRect(0, H - 26, W, 26);
}
function drawCloth(g: CanvasRenderingContext2D, W: number, H: number) {
  const s = 32;
  for (let y = 0; y < H; y += s) for (let x = 0; x < W; x += s) { g.fillStyle = ((x + y) / s) % 2 ? "#f4f1ea" : "#d64541"; g.fillRect(x, y, s, s); }
}
function drawPicture(g: CanvasRenderingContext2D, W: number, H: number) {
  g.fillStyle = "#8fc2e8"; g.fillRect(0, 0, W, H);
  g.fillStyle = "#6aa84f"; g.beginPath(); g.moveTo(0, H); g.lineTo(W * 0.35, H * 0.45); g.lineTo(W * 0.7, H * 0.8); g.lineTo(W, H * 0.5); g.lineTo(W, H); g.fill();
  g.fillStyle = "#fff"; for (let i = 0; i < 4; i++) { g.beginPath(); g.ellipse(W * (0.2 + i * 0.2), H * 0.85, 12, 8, 0, 0, 7); g.fill(); }
  g.strokeStyle = "#6b4226"; g.lineWidth = 14; g.strokeRect(0, 0, W, H);
}

const SOCKET_F: V3 = [-0.85, 0.38, -2.97], SOCKET_V: V3 = [0.85, 0.38, -2.97];
const GRANDPA_P: V3 = [0.98, 0.05, -0.15];
const VENT_P: V3 = [1.4, 0, -2.2];

const Room: React.FC<{ t: number }> = ({ t }) => {
  const fOn = t < FRIDGE_OFF();
  const vOn = t < VENT_OFF();
  return (
    <>
      <PaperLights intensity={1.0} tint="#fff3df" />
      <CanvasPlane texKey="bt_wallpaper" w={9} h={3.6} px={1024} position={[0, 1.8, -3.0]} glowing={false} draw={drawWallpaper} />
      <Sheet w={9} h={8} color="#8a5a34" position={[0, 0, 0.5]} rotation={[-Math.PI / 2, 0, 0]} />
      {[-3, -2, -1, 0, 1, 2, 3].map((x, i) => <mesh key={i} position={[x * 0.6, 0.002, 0.5]} rotation={[-Math.PI / 2, 0, 0]} material={paper("#7a4d2b")}><planeGeometry args={[0.03, 8]} /></mesh>)}
      <CanvasPlane texKey="bt_pic" w={0.7} h={0.5} px={256} position={[-0.75, 2.45, -2.98]} glowing={false} draw={drawPicture} />
      {/* дверной проём */}
      <mesh position={[0, 1.08, -2.99]} geometry={geo.rrect(1.2, 2.25, 0.03, 0.04)} material={paper("#5b3a22")} />
      <mesh position={[0, 1.05, -2.985]} material={paper("#2a1d16")}><planeGeometry args={[1.0, 2.1]} /></mesh>
      {/* холодильник и розетка */}
      <Fridge position={[-1.45, 0, -2.6]} on={fOn} />
      <Socket position={SOCKET_F} scale={0.8} plugged={fOn} />
      {fOn ? <Cable pts={[[-0.95, 0.2, -2.7], [-0.9, 0.1, -2.85], [SOCKET_F[0], SOCKET_F[1] - 0.05, -2.92]]} r={0.018} color="#eee" />
        : <Cable pts={[[-0.95, 0.2, -2.7], [-0.75, 0.03, -2.6], [-0.55, 0.03, -2.4]]} r={0.018} color="#eee" />}
      {/* ИВЛ и розетка */}
      <Ventilator position={VENT_P} t={t} alive={vOn} screenOn />
      <Socket position={SOCKET_V} scale={0.8} plugged={vOn} />
      {vOn ? <Cable pts={[[1.2, 0.4, -2.25], [1.0, 0.15, -2.6], [SOCKET_V[0], SOCKET_V[1] - 0.05, -2.92]]} r={0.018} color="#333" />
        : <Cable pts={[[1.2, 0.4, -2.25], [1.0, 0.03, -2.3], [0.7, 0.03, -2.1]]} r={0.018} color="#333" />}
    </>
  );
};

const Table: React.FC<{ t: number; tv?: boolean }> = ({ t, tv }) => (
  <group position={[0, 0, -0.85]}>
    <mesh position={[0, 0.36, 0]} material={paper("#6b4226")}><boxGeometry args={[1.45, 0.72, 1.0]} /></mesh>
    <CanvasPlane texKey="bt_cloth" w={1.55} h={1.1} px={256} position={[0, 0.735, 0]} rotation={[-Math.PI / 2, 0, 0]} glowing={false} draw={drawCloth} />
    <mesh position={[0, 0.62, 0.52]} material={paper("#d64541")}><planeGeometry args={[1.55, 0.24]} /></mesh>
    {/* еда */}
    {!tv && <group position={[0, 0.8, -0.1]}>
      <mesh geometry={geo.ellipse(0.32, 0.12, 0.04)} material={paper("#f4f4f4")} position={[0, -0.04, 0]} />
      <mesh geometry={geo.ellipse(0.22, 0.13, 0.08)} material={paper("#c9822b")} position={[0, 0.04, 0.03]} />
      {[-1, 1].map((s) => <mesh key={s} geometry={geo.rrect(0.07, 0.16, 0.035, 0.04)} material={paper("#e8c9a0")} position={[s * 0.2, 0.12, 0.04]} rotation={[0, 0, s * 0.5]} />)}
    </group>}
    {[-0.5, -0.17, 0.17, 0.5].map((x, i) => <mesh key={i} position={[x, 0.745, 0.25]} rotation={[-Math.PI / 2, 0, 0]} material={paper("#ffffff")}><circleGeometry args={[0.13, 20]} /></mesh>)}
    <mesh position={[-0.75, 0.86, -0.1]} geometry={geo.rrect(0.12, 0.22, 0.03, 0.06)} material={paper("#8e44ad", { opacity: 0.8 })} />
  </group>
);

const Grandpa: React.FC<{ t: number; mood: "calm" | "shock" | "yell" | "blue"; pos?: V3 }> = ({ t, mood, pos = GRANDPA_P }) => {
  const tq = twos(t);
  const m = mouthFor("p2", ["p2_ded"], t);
  const blue = mood === "blue" ? clamp01(prog(t, REACT_IN(), REACT_IN() + 0.6)) : 0;
  const skin = "#" + new THREE.Color("#efc9a3").lerp(new THREE.Color("#8fa6e0"), blue).getHexString();
  const maskOff = mood === "yell" ? 0.7 : 0;
  const props = ({
    calm: { eyes: "closed", mouth: "smile", armL: 0.35, armR: 0.35 },
    shock: { eyes: "wide", mouth: "o", armL: 0.8, armR: 0.8 },
    yell: { eyes: "angry", mouth: "scream", mouthOpen: m, armR: -0.3, armL: 2.5 + Math.sin(tq * 22) * 0.15, sweat: 1, bodyTilt: Math.sin(tq * 16) * 0.04 },
    blue: { eyes: "tiny", mouth: "wavy", armR: -0.3, armL: 0.4, sweat: 1, bodyTilt: -0.12 * blue, headTilt: -0.15 * blue },
  } as Record<string, Partial<CharacterProps>>)[mood];
  return (
    <group position={pos}>
      <Character {...CAST.grandpa} legs="sit" {...props} skin={skin} front={(mood === "yell" || mood === "blue") ? <HeartClutch t={t} skin={skin} /> : undefined} />
      <group position={[0, -0.0, 0]} scale={1.12}><VentMask off={maskOff} /></group>
    </group>
  );
};
/** Рука деда, прижатая к сердцу (поверх туловища) */
const HeartClutch: React.FC<{ t: number; skin: string }> = ({ t, skin }) => {
  const j = Math.sin(twos(t) * 30) * 0.015;
  return (
    <group position={[0.08 + j, 0.62, 0.14]}>
      <mesh position={[0.2, 0.1, 0]} rotation={[0, 0, 0.9]} geometry={geo.rrect(0.42, 0.15, 0.06, 0.03)} material={paper("#8b7765")} />
      <mesh position={[-0.04, -0.02, 0.03]} geometry={geo.ellipse(0.11, 0.1, 0.03)} material={paper(skin)} />
      <mesh position={[-0.13, 0.05, 0.05]} rotation={[0, 0, 0.8]} geometry={geo.rrect(0.1, 0.05, 0.025, 0.02)} material={paper(skin)} />
      <mesh position={[-0.12, 0.17, 0.02]} geometry={geo.poly("heart", [[0, -0.07], [0.08, 0.02], [0.05, 0.07], [0, 0.04], [-0.05, 0.07], [-0.08, 0.02]], 0.02, 0.02)} material={glow("#e53935")} />
    </group>
  );
};
const Tube: React.FC<{ off?: number }> = ({ off = 0 }) => (
  <Cable pts={[[GRANDPA_P[0] + off * 0.34, 0.95 - off * 0.27, GRANDPA_P[2] + 0.3], [GRANDPA_P[0] + 0.45, 0.6, GRANDPA_P[2] + 0.12], [GRANDPA_P[0] + 0.6, 0.55, GRANDPA_P[2] - 0.6], [VENT_P[0] - 0.05, 0.7, VENT_P[2] + 0.4], [VENT_P[0], 0.8, VENT_P[2] + 0.1]]} r={0.035} color="#9fd0e8" />
);

const Family: React.FC<{ t: number; grandpaMood: "calm" | "shock" | "yell" | "blue"; panic: boolean; noMom?: boolean }> = ({ t, grandpaMood, panic, noMom }) => {
  const tq = twos(t);
  const chew = Math.abs(Math.sin(tq * 7)) * 0.4;
  const fork = <mesh position={[0.02, 0.15, 0.05]} geometry={geo.rrect(0.04, 0.32, 0.02, 0.02)} material={paper("#bbb")} />;
  return (
    <>
      <Character {...CAST.dad} position={[-0.5, 0.05, -1.6]} legs="sit" eyes={panic ? "wide" : "normal"} mouth={panic ? "scream" : "talk"} mouthOpen={panic ? 0.7 : chew} armR={panic ? 2.4 : 0.9 + chew * 0.5} handR={fork} armL={panic ? 2.2 : 0.3} lookX={panic ? 0.3 : 0.4} />
      {!noMom && <Character {...CAST.mom} position={[0.45, 0.05, -1.6]} legs="sit" eyes={panic ? "wide" : "normal"} mouth={panic ? "scream" : "smile"} mouthOpen={0.9} armL={panic ? 2.6 : 0.4} armR={panic ? 2.6 : 0.4} lookX={panic ? -0.3 : -0.4} />}
      <Character {...CAST.kid} position={[-0.98, 0.32, -0.2]} legs="sit" eyes={panic ? "wide" : "normal"} mouth={panic ? "o" : "grin"} armR={1.2} handR={fork} lookX={panic ? 0.5 : 0} />
      <Grandpa t={t} mood={grandpaMood} />
      <Tube off={grandpaMood === "yell" ? 0.7 : 0} />
    </>
  );
};

// ---------- десять потных мужиков ----------
const MEN = (() => {
  const r = rng(404);
  const outfits = ["hoodie", "tshirt", "tshirt", "hoodie", "flannel"] as const;
  const hats = ["messyHair", "cap", "beanie", "curly", "headset", "none", "slickHair"] as const;
  const cols = ["#c0392b", "#2c3e50", "#16a085", "#8e44ad", "#d35400", "#2980b9", "#7f8c8d", "#27ae60", "#34495e", "#f39c12"];
  const targets: [number, number][] = [[-0.85, -2.35], [0.8, -2.4], [-0.3, -2.75], [0.35, -2.7], [-1.3, -1.95], [1.35, -1.95], [-0.7, -2.0], [0.75, -1.95], [0.05, -2.3], [-1.1, -2.7]];
  return targets.map(([x, z], i) => ({
    x, z, delay: i * 0.09, outfit: outfits[i % 5], hat: hats[Math.floor(r() * hats.length)], color: cols[i], hatColor: cols[(i + 4) % 10],
    hair: ["#2b1b10", "#4a2f1b", "#111", "#c9a227"][i % 4], skin: ["#f6d1a8", "#e8b98f", "#c68b59", "#f3c9a0", "#d9a37a"][i % 5], gear: i, scream: r() < 0.5,
  }));
})();

const Men: React.FC<{ t: number; backOnly?: boolean }> = ({ t, backOnly }) => {
  const t0 = DOOR_HIT() + 0.2;
  const tq = twos(t);
  return (
    <>
      {MEN.map((mn, i) => {
        const ts = t0 + mn.delay;
        if (t < ts || (backOnly && mn.z > -1)) return null;
        const front = mn.z > -1;
        const u = easeOut(prog(t, ts, ts + (front ? 0.8 : 0.5)));
        let x = lerp(0, mn.x, u), z = lerp(-3.2, mn.z, u);
        if (front) { // обегают стол сбоку
          const side = mn.x < 0 ? -1.75 : 1.75;
          if (u < 0.5) { const v = u / 0.5; x = lerp(0, side, v); z = lerp(-3.2, -1.9, v); }
          else { const v = (u - 0.5) / 0.5; x = lerp(side, mn.x, v); z = lerp(-1.9, mn.z, v); }
        }
        const running = u < 1;
        const busy = !running;
        const grabbing = (i === 0 && t > FRIDGE_OFF() - 0.1) || (i === 1 && t > VENT_OFF() - 0.1);
        return (
          <Character key={i} position={[x, running ? Math.abs(Math.sin(tq * 14 + i)) * 0.08 : 0, z]} scale={0.95} adult outfit={mn.outfit} color={mn.color} color2="#3b3f5c" hat={mn.hat} hairColor={mn.hair} hatColor={mn.hatColor}
            skin={mn.skin} stubble sweat={1} eyes={i % 3 === 0 ? "crazy" : "wide"} mouth={mn.scream ? "scream" : "grin"} mouthOpen={0.8}
            legs={running ? "run" : "stand"} legPhase={tq * 16 + i} armL={grabbing ? 2.7 : busy ? 0.8 + Math.sin(tq * 9 + i) * 0.5 : 2.4} armR={busy ? 1.2 + Math.sin(tq * 11 + i * 2) * 0.6 : 2.2}
            handL={grabbing ? <group position={[0, 0.08, 0.05]}><mesh geometry={geo.rrect(0.12, 0.14, 0.03, 0.05)} material={paper(i === 0 ? "#eee" : "#333")} /></group> : undefined}
            back={<BackGear kind={mn.gear} />} rotationY={(i % 2 ? 1 : -1) * 0.1} />
        );
      })}
    </>
  );
};

/** Дверь, слетающая с петель */
const FlyingDoor: React.FC<{ t: number }> = ({ t }) => {
  const h = DOOR_HIT();
  const u = prog(t, h, h + 0.55);
  const pos: V3 = t < h ? [0, 1.05, -2.96] : [lerp(0, 0.7, u), 1.05 + Math.sin(u * Math.PI) * 1.4 + u * 0.6, lerp(-2.96, 4.5, easeIn(u))];
  if (u >= 1) return null;
  const tr = t < h ? Math.sin(twos(t) * 50) * 0.015 * prog(t, DOOR().start, h) : 0;
  return (
    <group position={pos} rotation={[-u * 1.2, u * 0.6, tr + u * 2.6]}>
      <mesh geometry={geo.rrect(1.0, 2.1, 0.04, 0.07)} material={paper("#a0673a")} />
      {[0.5, -0.45].map((y, i) => <mesh key={i} position={[0, y, 0.04]} geometry={geo.rrect(0.7, 0.7, 0.04, 0.02)} material={paper("#8c5630")} />)}
      <mesh position={[0.36, 0, 0.06]} geometry={geo.ellipse(0.06, 0.06, 0.04)} material={paper("#e8c547")} />
      {t >= h && <mesh position={[-0.45, 0.4, 0.06]} geometry={geo.rrect(0.08, 0.2, 0.02, 0.02)} material={paper("#777")} />}
    </group>
  );
};

// ============ D1: общий план квартиры ============
export const FlatWide: React.FC<{ t: number }> = ({ t }) => {
  const h = DOOR_HIT();
  const k = prog(t, FLAT_START(), CLOSE_IN());
  const [sx, sy] = shake(t, h, 0.18, 0.6);
  const [sx2, sy2] = shake(t, VENT_OFF(), 0.06, 0.3);
  const panic = t > h + 0.05;
  const z = easeOut(prog(t, h + 0.05, h + 0.35));
  return (
    <>
      <Cam pos={[sx + sx2, lerp(3.1, 4.7, z) + sy + sy2, lerp(4.0, lerp(5.6, 5.1, easeInOut(k)), z)]} look={[0, lerp(1.25, 1.05, z), lerp(-1.3, -1.6, z)]} fov={lerp(44, 50, z)} />
      <Room t={t} />
      <Men t={t} />
      <Family t={t} grandpaMood={t > VENT_OFF() ? "shock" : panic ? "shock" : "calm"} panic={panic} />
      <Table t={t} />
      <FlyingDoor t={t} />
      {t > h && t < h + 0.7 && <Puff position={[0, 0.9, -2.6]} scale={0.9 + (t - h) * 2} color="#d9cbb0" opacity={0.9} />}
    </>
  );
};

// ============ D3: крупно — тройник в тройник ============
const HandIn: React.FC<{ tip: V3; ang: number; sleeve: string; skin?: string; scale?: number; children?: React.ReactNode }> = ({ tip, ang, sleeve, skin = "#e8b98f", scale = 0.7, children }) => (
  <group position={tip} rotation={[0, 0, ang]} scale={scale}>
    {/* рука идёт от кончика в сторону −X локально */}
    <mesh position={[-0.95, 0, -0.02]} geometry={geo.rrect(1.5, 0.3, 0.12, 0.05)} material={paper(sleeve)} />
    <mesh position={[-0.12, 0, 0.02]} geometry={geo.ellipse(0.19, 0.17, 0.05)} material={paper(skin)} />
    <mesh position={[-0.08, 0.15, 0.04]} rotation={[0, 0, 0.5]} geometry={geo.rrect(0.16, 0.08, 0.04, 0.03)} material={paper(skin)} />
    <group rotation={[0, 0, -ang]}>{children}</group>
  </group>
);
const PlugFront: React.FC<{ color?: string; size?: number }> = ({ color = "#eee", size = 0.2 }) => (
  <group>
    <mesh geometry={geo.rrect(size, size, size * 0.25, 0.08)} material={paper(color)} />
    <mesh position={[0, 0, 0.045]} geometry={geo.rrect(size * 0.5, size * 0.12, 0.01, 0.01)} material={paper("#999")} />
  </group>
);

export const StripClose: React.FC<{ t: number }> = ({ t }) => {
  const [sx, sy] = shake(t, STRIP_BOOM(), 0.06, 0.5);
  const [sx1, sy1] = shake(t, STRIP_A() + 0.2, 0.025, 0.2);
  const [sx2, sy2] = shake(t, STRIP_B() + 0.2, 0.025, 0.2);
  const k = prog(t, CLOSE_IN(), DED_IN());
  // геометрия: розетка, тройник A (белый, вертикальный), тройник B (оранжевый)
  const SOCK: V3 = [0.05, 2.05, 0];
  const A_C: V3 = [-0.32, 1.42, 0.06], B_C: V3 = [0.42, 1.18, 0.06];
  const sockY = (c: V3, i: number) => c[1] + 0.315 - i * 0.32; // сверху вниз
  const pushIn = (at: number) => { const u = prog(t, at - 0.22, at); return t >= at ? 0 : lerp(0.7, 0, easeIn(u)); };
  const aIn = t > STRIP_A() - 0.25, bIn = t > STRIP_B() - 0.25;
  const aZ = pushIn(STRIP_A()), bZ = pushIn(STRIP_B());
  const extras = [
    { at: STRIP_X(0), p: [B_C[0], sockY(B_C, 1), 0.12] as V3, c: "#222", from: 0.4 },
    { at: STRIP_X(1), p: [B_C[0], sockY(B_C, 2), 0.12] as V3, c: "#c0392b", from: -0.3 },
    { at: STRIP_X(2), p: [A_C[0], sockY(A_C, 2), 0.12] as V3, c: "#2980b9", from: 3.4 },
  ];
  const boom = t > STRIP_BOOM();
  return (
    <>
      <Cam pos={[0.1 + sx + sx1 + sx2, 1.6 + sy + sy1 + sy2, lerp(4.4, 4.0, k)]} look={[0.1, 1.5, 0]} fov={40} />
      <PaperLights intensity={1.05} tint="#fff3df" />
      <CanvasPlane texKey="bt_wallpaper" w={6} h={4} px={1024} position={[0, 1.6, -0.02]} glowing={false} draw={drawWallpaper} />
      <group position={SOCK} scale={2.0}><Socket plugged={false} /></group>
      {boom && <mesh position={[SOCK[0], SOCK[1] + 0.35, 0.03]} geometry={geo.ellipse(0.4, 0.3, 0.01)} material={paper("#2a2420")} />}
      {/* тройник A: вилка в розетке */}
      {aIn && (
        <>
          <group position={[SOCK[0], SOCK[1], 0.08 + aZ]} scale={1 + aZ}><PlugFront size={0.28} /></group>
          <Cable pts={[[SOCK[0], SOCK[1] - 0.12, 0.1 + aZ], [SOCK[0] - 0.1, SOCK[1] - 0.25, 0.1], [A_C[0], A_C[1] + 0.7, 0.08], [A_C[0], A_C[1] + 0.56, 0.08]]} r={0.025} color="#f0f0f0" />
          <PowerStrip position={A_C} rot={-Math.PI / 2} n={3} scale={1} />
        </>
      )}
      {/* тройник B: вилка в тройник A */}
      {bIn && (
        <>
          <group position={[A_C[0], sockY(A_C, 0), 0.14 + bZ]} scale={1 + bZ}><PlugFront color="#f39c12" size={0.2} /></group>
          <Cable pts={[[A_C[0] + 0.1, sockY(A_C, 0), 0.16 + bZ], [A_C[0] + 0.35, sockY(A_C, 0) + 0.1, 0.15], [B_C[0], B_C[1] + 0.75, 0.1], [B_C[0], B_C[1] + 0.56, 0.08]]} r={0.025} color="#e67e22" />
          <PowerStrip position={B_C} rot={-Math.PI / 2} n={3} scale={1} color="#f39c12" />
          <group position={[B_C[0], sockY(B_C, 0), 0.14]}><PlugFront color="#333" size={0.2} /></group>
          <Cable pts={[[B_C[0] + 0.1, sockY(B_C, 0), 0.15], [B_C[0] + 0.45, sockY(B_C, 0) - 0.1, 0.2], [1.6, 0.9, 0.3]]} r={0.022} color="#333" />
        </>
      )}
      {extras.map((e, i) => t > e.at - 0.25 && (
        <React.Fragment key={i}>
          <group position={[e.p[0], e.p[1], e.p[2] + pushIn(e.at)]} scale={1 + pushIn(e.at)}><PlugFront color={e.c} size={0.2} /></group>
          <Cable pts={[[e.p[0], e.p[1], e.p[2] + pushIn(e.at)], [e.p[0] + Math.cos(e.from) * 0.4, e.p[1] + Math.sin(e.from) * 0.4 - 0.1, 0.2], [e.p[0] + Math.cos(e.from) * 1.6, e.p[1] + Math.sin(e.from) * 1.6 - 0.4, 0.3]]} r={0.022} color={e.c} />
        </React.Fragment>
      ))}
      {/* руки */}
      {t < STRIP_A() + 0.25 && <HandIn tip={[SOCK[0] - 0.05, SOCK[1] - 0.05, 0.25 + aZ]} ang={-0.5} sleeve="#2980b9" />}
      {t > STRIP_B() - 0.3 && t < STRIP_B() + 0.22 && <HandIn tip={[A_C[0] + 0.12, sockY(A_C, 0) - 0.05, 0.3 + bZ]} ang={Math.PI + 0.35} sleeve="#c0392b" skin="#c68b59" />}
      {extras.map((e, i) => t > e.at - 0.3 && t < e.at + 0.12 && <HandIn key={"h" + i} tip={[e.p[0] + 0.12 * Math.cos(e.from), e.p[1] + 0.12 * Math.sin(e.from) - 0.04, 0.3 + pushIn(e.at)]} ang={e.from + Math.PI} sleeve={["#27ae60", "#8e44ad", "#34495e"][i]} skin={["#f3c9a0", "#d9a37a", "#f6d1a8"][i]} />)}
      {/* искры от каждого щелчка + финальный бабах */}
      <Sparks t={t} t0={STRIP_A()} origin={[SOCK[0], SOCK[1], 0.25]} n={8} dur={0.25} seed={1} scale={0.6} />
      <Sparks t={t} t0={STRIP_B()} origin={[A_C[0], sockY(A_C, 0), 0.25]} n={8} dur={0.25} seed={2} scale={0.6} />
      <Sparks t={t} t0={STRIP_BOOM()} origin={[SOCK[0], SOCK[1], 0.3]} n={20} dur={0.6} seed={3} scale={1.4} />
      <Sparks t={t} t0={STRIP_BOOM() + 0.05} origin={[B_C[0], B_C[1], 0.3]} n={14} dur={0.5} seed={4} scale={1.1} />
      {boom && <Puff position={[SOCK[0] + 0.1, SOCK[1] + 0.3 + (t - STRIP_BOOM()) * 0.8, 0.3]} scale={0.5 + (t - STRIP_BOOM()) * 0.8} color="#5a5450" opacity={0.85} />}
    </>
  );
};

// ============ D4: дед орёт ============
export const DedShot: React.FC<{ t: number }> = ({ t }) => {
  const k = prog(t, DED_IN(), G2_IN());
  const [sx, sy] = shake(t, DED().start + 0.1, 0.04, 0.6);
  return (
    <>
      <Cam pos={[GRANDPA_P[0] + 0.12 + sx, 1.8 + sy, lerp(3.7, 3.3, easeOut(k))]} look={[GRANDPA_P[0] + 0.1, 1.05, GRANDPA_P[2]]} fov={40} />
      <Room t={t} />
      <Men t={t} backOnly />
      <Family t={t} grandpaMood="yell" panic noMom />
      <Table t={t} />
    </>
  );
};

// ============ D5: геймер втыкает HDMI ============
function drawTv(g: CanvasRenderingContext2D, W: number, H: number, on: boolean) {
  if (!on) {
    g.fillStyle = "#1d3fa8"; g.fillRect(0, 0, W, H);
    g.fillStyle = "#fff"; g.font = `900 ${H * 0.13}px ${FONT}`; g.textAlign = "center"; g.textBaseline = "middle";
    g.fillText("HDMI 1", W / 2, H * 0.4); g.fillText("НЕТ СИГНАЛА", W / 2, H * 0.58);
    return;
  }
  const bands = ["#2b1055", "#6a1b6e", "#b8336a", "#ef6f48", "#ffb347"];
  bands.forEach((c, i) => { g.fillStyle = c; g.fillRect(0, (H * i) / 5 * 0.7, W, H); });
  g.fillStyle = "#ffe066"; g.beginPath(); g.arc(W * 0.62, H * 0.62, H * 0.2, 0, 7); g.fill();
  g.fillStyle = "#1a0b2e"; g.fillRect(0, H * 0.74, W, H);
  for (const [x, s] of [[0.15, 1], [0.85, 0.85], [0.3, 0.7]] as [number, number][]) {
    g.fillStyle = "#1a0b2e"; g.fillRect(W * x - 4, H * (0.74 - 0.4 * s), 8, H * 0.4 * s);
    for (let a = 0; a < 5; a++) { g.save(); g.translate(W * x, H * (0.74 - 0.4 * s)); g.rotate(-1.2 + a * 0.6); g.fillRect(0, -4, H * 0.14 * s, 8); g.restore(); }
  }
  g.font = `900 ${H * 0.2}px ${FONT}`; g.textAlign = "center"; g.textBaseline = "middle";
  g.lineWidth = 10; g.strokeStyle = "#1a0b2e"; g.strokeText("GTA VI", W / 2, H * 0.3);
  g.fillStyle = "#ff4fd8"; g.fillText("GTA VI", W / 2, H * 0.3);
  g.font = `900 ${H * 0.2}px ${FONT}`; g.textAlign = "center";
  g.fillStyle = "#000"; g.fillRect(W * 0.08, H * 0.6, W * 0.62, H * 0.28);
  g.fillStyle = "#39ff7a"; g.fillText("60 FPS", W * 0.39, H * 0.745);
}
const TV_P: V3 = [-0.25, 0.76, -1.0];
const TvOnTable: React.FC<{ on: boolean; boot: number }> = ({ on, boot }) => (
  <group position={TV_P}>
    <mesh position={[0, 0.05, 0]} geometry={geo.rrect(0.4, 0.08, 0.02, 0.15)} material={paper("#222")} />
    <mesh position={[0, 0.15, -0.03]} geometry={geo.rrect(0.08, 0.2, 0.02, 0.05)} material={paper("#222")} />
    <group position={[0, 0.62, 0]}>
      <Plasma w={1.35} h={0.82} screenNode={
        <CanvasPlane texKey={"bt_tv2_" + (on ? 1 : 0)} w={1.27} h={0.74} px={512} position={[0, 0, 0.045]} draw={(g, W, H) => drawTv(g, W, H, on)} />
      } />
      {on && boot < 1 && <mesh position={[0, 0, 0.05]} material={glow("#ffffff", 1 - boot)}><planeGeometry args={[1.27, 0.74]} /></mesh>}
    </group>
  </group>
);

export const GamerShot: React.FC<{ t: number }> = ({ t }) => {
  const tq = twos(t);
  const on = t >= HDMI_AT();
  const k = prog(t, G2_IN(), REACT_IN());
  const m = mouthFor("p2", ["p2_gamer2"], t);
  const push = easeIn(prog(t, HDMI_AT() - 0.3, HDMI_AT()));
  const [sx, sy] = shake(t, HDMI_AT(), 0.02, 0.2);
  // кисть геймера держит HDMI у правого края телевизора
  const hdmi = (
    <group position={[-0.12 + push * 0.06, 0.04, 0.1]}>
      <mesh geometry={geo.rrect(0.16, 0.09, 0.02, 0.06)} material={paper("#151515")} />
      <mesh position={[-0.11, 0, 0]} geometry={geo.rrect(0.07, 0.06, 0.01, 0.04)} material={paper("#c9c9c9")} />
    </group>
  );
  return (
    <>
      <Cam pos={[0.0 + sx, 1.9 + sy, lerp(5.2, 4.8, easeInOut(k))]} look={[0.0, 1.0, -0.5]} fov={44} />
      <Room t={t} />
      <Men t={t + 10} backOnly />
      <Family t={t} grandpaMood="shock" panic />
      <Table t={t} tv />
      <TvOnTable on={on} boot={prog(t, HDMI_AT(), HDMI_AT() + 0.25)} />
      <Cable pts={[[-0.2, 1.03, 0.25], [0.0, 0.5, 0.35], [0.3, 0.05, 0.5], [0.9, 0.03, 0.6]]} r={0.022} color="#151515" />
      <Character {...CAST.gamer2} position={[0.5, 0, 0.2]} mouth="talk" mouthOpen={m} eyes="squint" lookX={0.9} headTilt={-0.08 + Math.sin(tq * 2.5) * 0.04}
        armL={1.45 - push * 0.08} handL={hdmi} armR={0.9 + Math.sin(tq * 6) * 0.15} back={<BackGear kind={0} />} />
    </>
  );
};

// ============ D6: реакция деда ============
export const ReactShot: React.FC<{ t: number }> = ({ t }) => {
  const k = prog(t, REACT_IN(), FLAT_END());
  return (
    <>
      <Cam pos={[GRANDPA_P[0] + 0.12, 1.6, lerp(2.5, 2.1, easeOut(k))]} look={[GRANDPA_P[0] + 0.1, 1.0, GRANDPA_P[2]]} fov={40} />
      <Room t={t} />
      <Men t={t + 10} backOnly />
      <Family t={t} grandpaMood="blue" panic noMom />
      <Table t={t} tv />
    </>
  );
};

// ============ D2: врезка — выдёргивают холодильник и ИВЛ деда ============
export const UNPLUG_IN = () => DOOR().start + 1.0;
const Tag: React.FC<{ text: string; position: V3; rot?: number; color?: string }> = ({ text, position, rot = 0, color = "#fff6d5" }) => (
  <group position={position} rotation={[0, 0, rot]}>
    <mesh geometry={geo.rrect(0.52, 0.15, 0.03, 0.02)} material={paper("#222")} />
    <CanvasPlane texKey={"bt_tag2_" + text} w={0.49} h={0.12} px={420} position={[0, 0, 0.035]} glowing={false}
      draw={(g, W, H) => { g.fillStyle = color; g.fillRect(0, 0, W, H); g.fillStyle = "#111"; let fs = H * 0.66; g.font = `900 ${fs}px ${FONT}`; const mw = g.measureText(text).width; if (mw > W * 0.9) { fs *= (W * 0.9) / mw; g.font = `900 ${fs}px ${FONT}`; } g.textAlign = "center"; g.textBaseline = "middle"; g.fillText(text, W / 2, H * 0.55); }} />
  </group>
);
export const UnplugInsert: React.FC<{ t: number }> = ({ t }) => {
  const tq = twos(t);
  const fOn = t < FRIDGE_OFF(), vOn = t < VENT_OFF();
  const yf = easeOut(prog(t, FRIDGE_OFF() - 0.05, FRIDGE_OFF() + 0.12));
  const yv = easeOut(prog(t, VENT_OFF() - 0.05, VENT_OFF() + 0.12));
  const [sx, sy] = shake(t, FRIDGE_OFF(), 0.04, 0.25);
  const [sx2, sy2] = shake(t, VENT_OFF(), 0.04, 0.25);
  const SF: V3 = [-0.28, 0.62, 0.02], SV: V3 = [0.3, 0.62, 0.02];
  const pf: V3 = [SF[0] - yf * 0.35, SF[1] - yf * 0.55, 0.12 + yf * 0.2];
  const pv: V3 = [SV[0] + yv * 0.35, SV[1] - yv * 0.55, 0.12 + yv * 0.2];
  return (
    <>
      <Cam pos={[0.0 + sx + sx2, 1.3 + sy + sy2, 4.2]} look={[0, 1.05, 0]} fov={40} />
      <PaperLights intensity={1.0} tint="#fff3df" />
      <CanvasPlane texKey="bt_wallpaper" w={6} h={4} px={1024} position={[0, 1.6, -0.6]} glowing={false} draw={drawWallpaper} />
      <Sheet w={6} h={4} color="#8a5a34" position={[0, 0, 1]} rotation={[-Math.PI / 2, 0, 0]} />
      {/* холодильник слева, ИВЛ справа */}
      <Fridge position={[-1.0, 0, -0.5]} on={fOn} />
      <Ventilator position={[0.95, 0, -0.45]} t={t} alive={vOn} screenOn />
      {!vOn && Math.floor(t * 4) % 2 === 0 && <mesh position={[0.85, 1.48, -0.3]} material={glow("#ff3b30")}><circleGeometry args={[0.07, 14]} /></mesh>}
      {/* розетки на плинтусе */}
      <mesh position={[0, 0.62, -0.01]} geometry={geo.rrect(1.1, 0.4, 0.04, 0.03)} material={paper("#efe9da")} />
      <group position={SF} scale={1.2}><Socket plugged={false} /></group>
      <group position={SV} scale={1.2}><Socket plugged={false} /></group>
      {/* вилки с бирками */}
      <group position={pf} rotation={[0, 0, yf * 0.8]}><mesh geometry={geo.rrect(0.2, 0.2, 0.05, 0.08)} material={paper("#eeeeee")} /></group>
      <Cable pts={[[pf[0], pf[1] - 0.08, pf[2]], [pf[0] - 0.15, pf[1] - 0.3, 0.1], [-0.7, 0.15, -0.2], [-0.9, 0.3, -0.45]]} r={0.022} color="#eee" />
      <group position={[SF[0] - 0.02, SF[1] + 0.38, 0.02]} scale={1.15}><Tag text="ХОЛОДИЛЬНИК" position={[0, 0, 0]} rot={0.06} /></group>
      <group position={pv} rotation={[0, 0, -yv * 0.8]}><mesh geometry={geo.rrect(0.2, 0.2, 0.05, 0.08)} material={paper("#333")} /></group>
      <Cable pts={[[pv[0], pv[1] - 0.08, pv[2]], [pv[0] + 0.12, pv[1] - 0.3, 0.1], [0.7, 0.2, -0.2], [0.9, 0.5, -0.4]]} r={0.022} color="#333" />
      <group position={[SV[0] + 0.03, SV[1] + 0.38, 0.02]} scale={1.15}><Tag text="ИВЛ ДЕДА" position={[0, 0, 0]} rot={-0.06} color="#ffd6d6" /></group>
      {/* руки, выдёргивающие вилки */}
      {t > FRIDGE_OFF() - 0.35 && <HandIn tip={[pf[0] - 0.02, pf[1] + 0.02, pf[2] + 0.05]} ang={0.9} sleeve="#2980b9" scale={0.5} />}
      {t > VENT_OFF() - 0.35 && <HandIn tip={[pv[0] + 0.02, pv[1] + 0.02, pv[2] + 0.05]} ang={2.25} sleeve="#d35400" skin="#c68b59" scale={0.5} />}
      <Sparks t={t} t0={FRIDGE_OFF()} origin={[SF[0], SF[1], 0.15]} n={10} dur={0.3} seed={6} scale={0.6} />
      <Sparks t={t} t0={VENT_OFF()} origin={[SV[0], SV[1], 0.15]} n={10} dur={0.3} seed={7} scale={0.6} />
      {tq < 0 && null}
    </>
  );
};
