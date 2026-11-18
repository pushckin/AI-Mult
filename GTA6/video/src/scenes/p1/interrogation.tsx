// Часть 1, сцена 3 «Допрос на границе — клиффхэнгер»: p1_grab → p1_cmd2 → p1_spit → p1_gamer1 → p1_zoom → p1_title.
import React from "react";
import { AbsoluteFill } from "remotion";
import { SceneDef } from "../types";
import { cue, part, prog, easeInOut, easeOut, easeIn, easeOutBack, shake, twos, hash, lerp, mouthFor, clamp01 } from "../../kit/anim";
import { Character } from "../../kit/Character";
import { CAST } from "../../kit/cast";
import { Cam, PaperLights, Sheet, Puff, CanvasPlane } from "../../kit/Stage";
import { geo, paper, glow, rng, FONT } from "../../kit/paper";
import { WallSeg, WH, Gamepad, PowerStrip, Tooth, WireBit, Clouds, Hills, Sheep, SpitSpray, Spark, starG, Box, PaperCrowd, PM, cell } from "./wall_kit";

const P = "p1" as const;
const GR = () => cue(P, "p1_grab"), C2 = () => cue(P, "p1_cmd2"), SP = () => cue(P, "p1_spit"), G1 = () => cue(P, "p1_gamer1"), ZM = () => cue(P, "p1_zoom"), TT = () => cue(P, "p1_title");
const SKY = "#9fd3f0";
type V3 = [number, number, number];
const WZ = -6; // внутренняя грань стены
const CZ = 1.15; // командир стоит здесь, лицом к −Z
const CX = 0.7;
const subsIn = (a: number, b: number) => part(P).subs.filter((s) => s.start >= a - 0.05 && s.start < b);

// ======================= ДЕКОРАЦИЯ =======================
const drawStencil = (g: CanvasRenderingContext2D, W: number, H: number) => {
  g.clearRect(0, 0, W, H);
  g.fillStyle = "rgba(20,20,20,0.85)"; g.font = `900 ${H * 0.3}px ${FONT}`; g.textAlign = "center"; g.textBaseline = "middle";
  g.fillText("НОВАЯ ЗЕЛАНДИЯ", W / 2, H * 0.3);
  g.font = `800 ${H * 0.2}px ${FONT}`; g.fillText("СУВЕРЕННАЯ ТЕРРИТОРИЯ", W / 2, H * 0.7);
  g.strokeStyle = "rgba(20,20,20,0.85)"; g.lineWidth = H * 0.04; g.strokeRect(W * 0.02, H * 0.04, W * 0.96, H * 0.92);
};
const drawGraffiti = (g: CanvasRenderingContext2D, W: number, H: number) => {
  g.clearRect(0, 0, W, H);
  g.save(); g.translate(W / 2, H / 2); g.rotate(-0.12);
  g.font = `900 ${H * 0.55}px ${FONT}`; g.textAlign = "center"; g.textBaseline = "middle";
  g.lineWidth = H * 0.07; g.strokeStyle = "#111"; g.strokeText("GTA VI", 0, -H * 0.08);
  g.fillStyle = "#e8318a"; g.fillText("GTA VI", 0, -H * 0.08);
  g.font = `900 ${H * 0.2}px ${FONT}`; g.fillStyle = "#1db954"; g.fillText("ЗАПУСКАЙ!!!", 0, H * 0.33);
  g.restore();
};

/** Трещины на стене: ветвящиеся ломаные из точки, k 0..1 — рост */
const CRACKS = (() => {
  const r = rng(31); const segs: { x: number; y: number; a: number; l: number; d: number }[] = [];
  const grow = (x: number, y: number, a: number, depth: number, d0: number) => {
    let cx = x, cy = y, ca = a;
    for (let i = 0; i < 5 - depth; i++) {
      const l = 0.7 + r() * 1.1; ca += (r() - 0.5) * 0.9;
      segs.push({ x: cx, y: cy, a: ca, l, d: d0 + i * 0.06 });
      cx += Math.cos(ca) * l; cy += Math.sin(ca) * l;
      if (depth < 1 && r() < 0.3) grow(cx, cy, ca + (r() < 0.5 ? 0.9 : -0.9), depth + 1, d0 + i * 0.06 + 0.05);
    }
  };
  for (let k = 0; k < 6; k++) grow(0.3, 9.5, (k / 7) * Math.PI * 2 + 0.3, 0, 0);
  for (let k = 0; k < 4; k++) grow(-4 + k * 3, 0.2, Math.PI / 2 + (r() - 0.5) * 0.8, 1, 0.35);
  return segs;
})();
const Cracks: React.FC<{ k: number }> = ({ k }) => (
  <>
    {CRACKS.map((s, i) => {
      const kk = clamp01((k - s.d) / 0.12);
      if (kk <= 0) return null;
      const l = s.l * kk;
      return <mesh key={i} geometry={geo.rrect(1, 0.07, 0.02, 0.03)} material={paper("#3a3530")} scale={[l, 1 + (i % 3) * 0.3, 1]}
        position={[s.x + Math.cos(s.a) * l / 2, s.y + Math.sin(s.a) * l / 2, WZ + 0.36]} rotation={[0, 0, s.a]} />;
    })}
  </>
);

const InnerSet: React.FC<{ t: number; crumble?: number }> = ({ t, crumble = 0 }) => {
  const tw = twos(t);
  return (
    <>
      <PaperLights intensity={1.05} dir={[4, 8, 10]} />
      <Sheet w={80} h={22} color="#c9c1ad" position={[0, 0, WZ + 11]} rotation={[-Math.PI / 2, 0, 0]} />
      <Sheet w={500} h={300} color="#6fae4f" position={[0, -0.01, 150]} rotation={[-Math.PI / 2, 0, 0]} />
      {/* стена (внутренняя сторона) */}
      <group position={[0, 0, WZ]}>
        {[-20, -12, -4, 4, 12, 20].map((x, i) => <WallSeg key={x} x={x} k={1} seed={40 + i} parapet={false} />)}
      </group>
      <CanvasPlane texKey="nz_stencil" w={4.2} h={1.5} px={768} glowing={false} transparent draw={drawStencil} position={[-2.6, 3.4, WZ + 0.31]} />
      <CanvasPlane texKey="nz_graffiti" w={3.4} h={1.9} px={768} glowing={false} transparent draw={drawGraffiti} position={[3.0, 2.0, WZ + 0.31]} />
      {/* «верёвочная лестница» из удлинителей, свисающая со стены */}
      <group position={[1.35, 0, WZ + 0.42]}>
        {[-0.45, 0.45].map((x) => <mesh key={x} geometry={geo.rrect(0.07, 14, 0.03, 0.04)} material={paper("#ff7f11")} position={[x, 7, 0]} rotation={[0, 0, Math.sin(tw * 2) * 0.004]} />)}
        {Array.from({ length: 10 }, (_, i) => <mesh key={i} geometry={geo.rrect(1.05, 0.14, 0.04, 0.05)} material={paper(i % 2 ? "#f3f1ea" : "#dcd8cc")} position={[0, 0.9 + i * 1.3, 0.03]} />)}
      </group>
      {/* кровавые отпечатки ладоней */}
      {[[-0.6, 1.9], [-0.1, 2.3], [5.2, 1.1]].map(([x, y], i) => (
        <group key={i} position={[x, y, WZ + 0.33]} rotation={[0, 0, (i - 1) * 0.4]}>
          <mesh geometry={geo.ellipse(0.13, 0.15, 0.01)} material={paper("#a3121b")} />
          {[-0.09, -0.03, 0.03, 0.09].map((fx, j) => <mesh key={j} geometry={geo.rrect(0.045, 0.13, 0.02, 0.01)} material={paper("#a3121b")} position={[fx, 0.18, 0]} />)}
        </group>
      ))}
      {/* мешки с песком */}
      {[-3.6, -2.8, -3.2].map((x, i) => <mesh key={i} geometry={geo.rrect(0.85, 0.42, 0.18, 0.4)} material={paper("#b39b6b")} position={[x, 0.22 + (i === 2 ? 0.38 : 0), WZ + 1.2]} />)}
      {/* фон суши (за спиной командира) */}
      <Hills z={90} facing={-1} spread={240} seed={6} />
      <Clouds z={160} y={30} spread={260} n={8} s={12} seed={5} />
      <Sheep p={[-6, 0, 16]} s={1.3} rot={Math.PI} />
      <Sheep p={[-3.6, 0, 19]} s={1.2} rot={Math.PI} />
      <Sheep p={[5, 0, 22]} s={1.3} rot={Math.PI} />
      <group position={[7, 0, 13]} rotation={[0, Math.PI, 0]}>
        <mesh geometry={geo.rrect(4.2, 1.6, 0.3, 0.3)} material={paper("#4f5a36")} position={[0, 1.3, 0]} />
        <mesh geometry={geo.rrect(1.6, 1.2, 0.2, 0.3)} material={paper("#5b6840")} position={[1.0, 2.5, 0.05]} />
        <mesh geometry={geo.rrect(1.0, 0.7, 0.15, 0.3)} material={paper("#a9d3ea")} position={[1.0, 2.55, 0.1]} />
        {[-1.3, 1.3].map((x) => <mesh key={x} geometry={geo.ellipse(0.55, 0.55, 0.3)} material={paper("#1d1d1d")} position={[x, 0.55, 0.2]} />)}
      </group>
      {crumble > 0 && <Cracks k={crumble} />}
    </>
  );
};

// летящие через стену (видны в небе на общих планах)
function overFlyers(t: number): PM[] {
  const out: PM[] = [];
  for (let j = 0; j < 14; j++) {
    const tl = GR().start - 1 + j * 0.55, k = (t - tl) / 1.8;
    if (k < 0 || k > 1) continue;
    const x = -6 + hash(j) * 12;
    out.push({ x: x + k * 3, y: WH + 4 + Math.sin(k * Math.PI) * 6 - k * 14, z: WZ - 2 + k * 9, rz: k * 8 + j, front: cell(1, j % 12), back: cell(3, j % 12), s: 1 });
  }
  return out;
}

// ======================= ПЕРСОНАЖИ =======================
const GEAR_BACK = <group><mesh geometry={geo.rrect(0.95, 0.62, 0.05, 0.08)} material={paper("#202020")} /><mesh geometry={geo.rrect(0.84, 0.5, 0.04, 0.08)} material={paper("#3d5a8a")} position={[0, 0, 0.02]} /></group>;

const SPIT_SPOTS: [number, number, number][] = [[-0.38, 1.0, 0.035], [0.36, 1.06, 0.03], [-0.15, 1.6, 0.03], [0.2, 1.62, 0.025], [-0.42, 1.2, 0.025], [0.43, 0.98, 0.022], [0.0, 0.88, 0.028]];
interface GamerState { y?: number; x?: number; eyes?: "crazy" | "wide" | "angry"; mouth?: "grin" | "talk" | "o" | "teethGrit" | "closed"; open?: number; armL?: number; armR?: number; wire?: boolean; strip?: boolean; tilt?: number; headTilt?: number; spit?: number; squash?: number; gap?: boolean; legs?: "stand" | "run"; lookX?: number; lookY?: number }
const Gamer: React.FC<{ s: GamerState; t: number }> = ({ s, t }) => {
  const mo = s.mouth ?? "grin";
  return (
    <group position={[s.x ?? 0, s.y ?? 0, 0]}>
      <Character {...CAST.gamer} eyes={s.eyes ?? "crazy"} mouth={mo} mouthOpen={s.open ?? 0} armL={s.armL ?? 1.2} armR={s.armR ?? 1.2} blood={1} sweat={0.3}
        lookX={s.lookX ?? 0} lookY={s.lookY ?? 0} bodyTilt={s.tilt ?? 0} headTilt={s.headTilt ?? 0} squash={s.squash ?? 1} legs={s.legs ?? "stand"} legPhase={t * 14}
        handL={<group position={[0.0, 0.0, 0.02]}><Gamepad s={0.95} rot={0.3} /></group>}
        handR={s.strip ? <group position={[-0.05, 0.12, 0]}><PowerStrip s={0.95} rot={0.12} /></group> : undefined}
        front={<group>
          {s.wire && <group position={[0.06, 1.08, 0.2]} rotation={[0, 0, -0.08]}><WireBit s={0.95} /></group>}
          {s.gap && mo === "grin" && <mesh geometry={geo.rrect(0.05, 0.04, 0.005, 0.02)} material={paper("#2a0b0b")} position={[0.05, 1.11, 0.2]} />}
          {/* слюна командира на лице */}
          {SPIT_SPOTS.slice(0, Math.floor((s.spit ?? 0) * SPIT_SPOTS.length)).map(([x, y, r], i) => (
            <mesh key={i} geometry={geo.ellipse(r, r * 1.25, 0.01)} material={glow("#cfeeff", 0.9)} position={[x, y, 0.22]} />
          ))}
        </group>}
        back={GEAR_BACK} />
      {/* затылок (для кадров со спины) */}
      <mesh geometry={geo.ellipse(0.5, 0.44, 0.03)} material={paper("#3a2414")} position={[0, 1.47, -0.075]} />
      <mesh geometry={geo.arc(0.36, 0.2, 0, Math.PI, 0.03)} material={paper("#4a505c")} position={[0, 0.92, -0.08]} />
    </group>
  );
};

interface CmdState { eyes?: "angry" | "wide" | "normal"; mouth?: "scream" | "o" | "frown" | "talk"; open?: number; armL?: number; armR?: number; tilt?: number; headTilt?: number; shades?: number; sweat?: number; lean?: number; hide?: boolean }
const Commander: React.FC<{ s: CmdState }> = ({ s }) => {
  if (s.hide) return null;
  const sh = s.shades ?? 0; // 0 — на месте, 1 — сползли/упали
  return (
    <group position={[CX, 0, CZ - (s.lean ?? 0)]}>
      <Character {...CAST.commander} glasses="none" rotationY={Math.PI} eyes={s.eyes ?? "angry"} mouth={s.mouth ?? "scream"} mouthOpen={s.open ?? 0}
        armL={s.armL ?? 0.6} armR={s.armR ?? 1.0} bodyTilt={s.tilt ?? 0} headTilt={s.headTilt ?? 0} sweat={s.sweat ?? 0} />
      {/* свои очки (могут сползать) */}
      {sh < 1 && (
        <mesh geometry={geo.poly("shades2", [[-0.335, 0.065], [0.335, 0.065], [0.3, -0.065], [0.04, -0.086], [0, -0.032], [-0.04, -0.086], [-0.3, -0.065]], 0.03, 0.035)} material={paper("#0d0d0d")}
          position={[0, 1.46 - easeIn(sh) * 0.32, -0.15 - sh * 0.05]} rotation={[0, Math.PI, sh * 0.5]} />
      )}
      {/* каска со спины */}
      <mesh geometry={geo.arc(0.6, 0.52, 0, Math.PI, 0.04)} material={paper("#4b5320")} position={[0, 1.52, 0.075]} />
      <mesh geometry={geo.rrect(1.24, 0.09, 0.04, 0.04)} material={paper("#3d4419")} position={[0, 1.53, 0.095]} />
    </group>
  );
};

const SWAT: React.FC<{ x: number; z: number; armL?: number; armR?: number; tilt?: number; eyes?: "angry" | "wide"; y?: number; legs?: "stand" | "run"; t?: number }> = ({ x, z, armL = 0.3, armR = 0.3, tilt = 0, eyes = "angry", y = 0, legs = "stand", t = 0 }) => (
  <Character {...CAST.swat} position={[x, y, z]} armL={armL} armR={armR} bodyTilt={tilt} eyes={eyes} legs={legs} legPhase={t * 16} />
);

/** Кулак командира на воротнике геймера */
const CollarFist: React.FC = () => (
  <group position={[0.22, 1.0, 0.24]}>
    <mesh geometry={geo.poly("fold", [[-0.2, 0.05], [0.2, 0.05], [0.12, -0.1], [-0.12, -0.1]], 0.03, 0.03)} material={paper("#4a505c")} position={[0, 0, -0.01]} />
    <mesh geometry={geo.ellipse(0.12, 0.1, 0.05)} material={paper("#5f6b3a")} position={[0, 0.0, 0.02]} />
    {[-0.06, 0, 0.06].map((x, i) => <mesh key={i} geometry={geo.ellipse(0.035, 0.03, 0.03)} material={paper("#4f5a30")} position={[x, 0.05, 0.05]} />)}
  </group>
);

// ======================= ШОТЫ =======================
/** базовый «держат с трёх сторон» */
const Holders: React.FC<{ t: number; releaseR?: number; onlyL?: boolean }> = ({ t, releaseR = 0, onlyL }) => {
  const tw = twos(t);
  return (
    <>
      <SWAT x={-1.2} z={-0.2} armR={1.25 + Math.sin(tw * 7) * 0.05} armL={0.5} tilt={0.08} />
      {!onlyL && <SWAT x={1.2} z={-0.2} armL={lerp(1.25 + Math.sin(tw * 7 + 1) * 0.05, 0.25, releaseR)} armR={0.5} tilt={lerp(-0.08, 0, releaseR)} eyes={releaseR > 0.5 ? "wide" : "angry"} />}
      {!onlyL && <SWAT x={-0.62} z={-0.75} y={0.05} armL={0.4} armR={2.3} tilt={-0.12} />}
    </>
  );
};

// grab: прорвавшийся спрыгивает, на него налетают трое, драка-облако, скрутили
function shotGrab(t: number) {
  const g = GR(), lt = t - g.start;
  const land = 0.3, cloudA = 0.5, cloudB = 1.25;
  const fall = prog(lt, 0, land);
  const [sx, sy] = shake(t, g.start + land, 0.12, 0.5);
  const [sx2, sy2] = shake(t, g.start + cloudA, 0.1, 0.8);
  const end = prog(t, g.start, C2().start);
  const els: React.ReactNode[] = [];
  const inCloud = lt >= cloudA && lt < cloudB;
  if (lt < cloudA) {
    // падает сверху и приземляется
    const sq = lt > land ? 1 - 0.25 * Math.max(0, 1 - (lt - land) / 0.15) : 1;
    els.push(<Gamer key="g" t={t} s={{ y: (1 - easeIn(fall)) * 5, armL: 2.6, armR: 2.4, eyes: "crazy", mouth: "teethGrit", wire: true, squash: lt > land ? 1 / sq : 1 }} />);
    // спецназ прыгает с боков
    const j = prog(lt, land, cloudA);
    els.push(<SWAT key="a" x={lerp(-4, -1.0, j)} z={0.1} y={Math.sin(j * Math.PI) * 0.8} armL={2.4} armR={2.0} tilt={-0.5} legs="run" t={t} />);
    els.push(<SWAT key="b" x={lerp(4, 1.0, j)} z={0.1} y={Math.sin(j * Math.PI) * 0.8} armL={2.0} armR={2.4} tilt={0.5} legs="run" t={t} />);
    els.push(<SWAT key="c" x={0.5} z={lerp(-6, -0.7, j)} y={Math.sin(j * Math.PI) * 1.4} armL={2.6} armR={2.6} legs="run" t={t} />);
  } else if (inCloud) {
    // мультяшное облако драки: клубы, конечности, звёздочки
    const tq = Math.floor(lt * 12);
    for (let i = 0; i < 9; i++) {
      const a = i * 0.7 + tq * 0.9, r = 0.55 + hash(i + tq) * 0.35;
      els.push(<Puff key={"p" + i} position={[Math.cos(a) * r, 1.0 + Math.sin(a) * r * 0.8, 0.2 + i * 0.03]} scale={0.75 + hash(i * 3 + tq) * 0.35} color={i % 2 ? "#e8e3d6" : "#d4cdbd"} />);
    }
    for (let i = 0; i < 5; i++) {
      const a = hash(i * 9 + tq) * 6.28;
      els.push(<mesh key={"l" + i} geometry={geo.rrect(0.5, 0.13, 0.06, 0.04)} material={paper(i % 2 ? "#1f2326" : "#5b6270")} position={[Math.cos(a) * 0.95, 1.0 + Math.sin(a) * 0.75, 0.6]} rotation={[0, 0, a]} />);
      els.push(<mesh key={"s" + i} geometry={starG(5, 0.14, 0.06)} material={glow("#ffd23a")} position={[Math.cos(a + 2) * 0.7, 1.3 + Math.sin(a + 2) * 0.6, 0.7]} />);
    }
    els.push(<Gamepad key="gp" s={1.4} rot={tq} />);
  } else {
    els.push(<Gamer key="g" t={t} s={{ armL: 1.2, armR: 1.2, eyes: "crazy", mouth: "teethGrit", wire: true, tilt: Math.sin(twos(t) * 9) * 0.04 }} />);
    els.push(<Holders key="h" t={t} />);
    const pk = prog(lt, cloudB, cloudB + 0.35);
    if (pk < 1) els.push(<Puff key="pf" position={[0, 0.6, 0.5]} scale={1.4 * (1 - pk) + 0.3} color="#e8e3d6" opacity={1 - pk} />);
  }
  return (
    <>
      <Cam pos={[0.3 + sx + sx2, 2.0 + sy + sy2 - end * 0.2, 9.0 - end * 1.6]} look={[0, 1.75 - end * 0.2, 0]} fov={44} />
      <InnerSet t={t} />
      <PaperCrowd members={overFlyers(t)} />
      {els}
    </>
  );
}

// cmd2: восьмёрка через плечо, командир орёт, слюна летит
const C2_CHUNKS = () => {
  const c = C2();
  const ss = subsIn(c.start, c.end);
  const bounds = ss.length >= 2 ? ss.map((s) => s.start) : [0, 0.2, 0.37, 0.62, 0.84].map((f) => c.start + f * (c.end - c.start));
  bounds[0] = c.start - 0.1;
  return bounds;
};
function shotCmd2(t: number) {
  const c = C2();
  const b = C2_CHUNKS();
  let idx = 0; for (let i = 0; i < b.length; i++) if (t >= b[i]) idx = i;
  const lt = t - b[idx];
  const m = mouthFor(P, ["p1_cmd2"], t);
  const tw = twos(t);
  const last = idx === b.length - 1;
  const onCmd = idx % 2 === 0; // чётные — лицо командира (из-за спины геймера)
  const spitAmt = prog(t, c.start + 0.8, c.end);
  const [sx, sy] = shake(t, b[idx], last ? 0.06 : 0.03, 0.4);
  const cmd: CmdState = { eyes: "angry", mouth: "scream", open: Math.max(0.15, m), armR: 1.0, armL: 0.5 + Math.abs(Math.sin(tw * 4)) * 0.8, tilt: Math.sin(tw * 5) * 0.05, headTilt: Math.sin(tw * 7) * 0.06, lean: 0.12 + m * 0.08 };
  const gm: GamerState = { eyes: "crazy", mouth: "teethGrit", wire: true, armL: 1.2, armR: 1.2, spit: spitAmt, headTilt: -0.05, lookX: 0, lookY: 0.2 };
  const push = Math.min(1, lt / 1.6);
  const cam = onCmd
    ? { pos: [1.0 + sx, 1.8 + sy, -3.7 + push * (last ? 1.1 : 0.4)] as V3, look: [CX - 0.1, 1.35, CZ] as V3, fov: 44 }
    : { pos: [-0.6 + sx, 1.8 + sy, 4.9 - push * 0.4] as V3, look: [0.05, 1.2, 0] as V3, fov: 44 };
  return (
    <>
      <Cam pos={cam.pos} look={cam.look} fov={cam.fov} roll={onCmd ? -0.03 : 0.03} />
      <InnerSet t={t} />
      <Gamer t={t} s={gm} />
      <Holders t={t} onlyL={onCmd} />
      <CollarFist />
      <Commander s={cmd} />
      <SpitSpray o={[CX, 1.2, CZ - 0.25]} dir={[0, 0.15, -1]} t={t} active={(tt) => (mouthFor(P, ["p1_cmd2"], tt))} seed={3} n={8} />
    </>
  );
}

// spit: плевок зубом, отскок, тройник из кармана
function shotSpit(t: number) {
  const s = SP(), lt = t - s.start;
  const spitAt = 0.4;
  const els: React.ReactNode[] = [];
  const [sx, sy] = shake(t, s.start + spitAt, 0.03, 0.35);
  if (lt < 0.85) {
    // ЭКСТРА-крупный: надувает щёки и плюёт
    const pre = lt < spitAt;
    const tk = prog(lt, spitAt, spitAt + 0.5);
    const gm: GamerState = { eyes: pre ? "angry" : "crazy", mouth: pre ? "closed" : "o", open: 1, wire: false, armL: 1.2, armR: 1.2, spit: 1, squash: pre ? 1 - 0.04 * Math.sin(lt * 30) : 1, headTilt: pre ? 0.05 : -0.1 };
    els.push(<Cam key="c" pos={[0.06 + sx, 1.42 + sy, 3.0 - lt * 0.3]} look={[0.0, 1.3, 0]} fov={44} />);
    els.push(<Gamer key="g" t={t} s={gm} />);
    if (pre) els.push(<group key="w" position={[0.06, 1.21, 0.22]}><WireBit s={0.95} /></group>);
    if (tk > 0 && tk < 1) {
      els.push(<group key="tooth" position={[lerp(0.05, -0.55, tk), 1.2 + Math.sin(tk * Math.PI) * 0.12 - tk * 0.25, lerp(0.25, 0.75, tk)]} rotation={[0, 0, tk * 12]}><Tooth s={1.6} /></group>);
      els.push(<group key="wire" position={[0.06 + tk * 0.2, 1.24 - easeIn(tk) * 0.8, 0.22 + tk * 0.2]} rotation={[0, 0, -tk * 2]}><WireBit s={0.95} /></group>);
      for (let i = 0; i < 6; i++) els.push(<mesh key={"d" + i} geometry={geo.ellipse(0.02, 0.025, 0.01)} material={glow(i % 2 ? "#c0161f" : "#cfeeff")} position={[lerp(0.05, -0.4 - hash(i) * 0.3, tk), 1.2 + (hash(i * 3) - 0.3) * 0.25 * tk, 0.3 + tk * 0.4]} />);
    }
    els.push(<Holders key="h" t={t} />);
  } else if (lt < 1.55) {
    // вставка: зуб скачет по бетону у сапог командира
    const k = lt - 0.85;
    const bx = -0.25 - k * 0.55;
    const bounce = Math.abs(Math.sin(k * 9)) * 0.35 * Math.exp(-k * 3.2);
    els.push(<Cam key="c" pos={[-0.05, 0.32, 2.6]} look={[-0.5, 0.15, 0.9]} fov={40} />);
    els.push(<group key="tooth" position={[bx, 0.06 + bounce, 0.95]} rotation={[0, 0, k * 10]}><Tooth s={1.5} /></group>);
    els.push(<mesh key="bl" geometry={geo.ellipse(0.06, 0.03, 0.005)} material={paper("#b3121b")} position={[-0.3, 0.005, 0.95]} rotation={[-Math.PI / 2, 0, 0]} />);
    els.push(<Gamer key="g" t={t} s={{ eyes: "crazy", mouth: "grin", gap: true, armL: 1.2, armR: 1.2 }} />);
    els.push(<Commander key="cm" s={{ eyes: "angry", mouth: "frown", armR: 0.4 }} />);
    els.push(<Holders key="h" t={t} />);
  } else {
    // достаёт тройник и смотрит в глаза
    const k = prog(lt, 1.6, 2.15);
    const armR = lerp(0.15, 1.55, easeOutBack(k));
    const clack = s.start + 2.15;
    const glint = prog(t, clack, clack + 0.4);
    els.push(<Cam key="c" pos={[1.0, 0.95, 4.3 - prog(lt, 1.55, 3.1) * 0.6]} look={[0.25, 1.3, 0]} fov={44} roll={-0.06} />);
    els.push(<Gamer key="g" t={t} s={{ eyes: "crazy", mouth: "grin", gap: true, armL: 1.2, armR, strip: true, spit: 1, lookX: 0, lookY: 0 }} />);
    if (glint > 0 && glint < 1) els.push(<mesh key="gl" geometry={starG(4, 0.2 * Math.sin(glint * Math.PI), 0.03)} material={glow("#ffffff")} position={[0.95, 1.15, 0.5]} rotation={[0, 0, glint * 2]} />);
    els.push(<Holders key="h" t={t} releaseR={1} />);
  }
  return (
    <>
      <InnerSet t={t} />
      {els}
    </>
  );
}

// gamer1: хриплая реплика, медленный наезд, реакция командира
function shotGamer1(t: number) {
  const g = G1();
  const ss = subsIn(g.start, g.end);
  const b1 = ss[1]?.start ?? g.start + (g.end - g.start) * 0.35;
  const b2 = ss[2]?.start ?? g.start + (g.end - g.start) * 0.7;
  const react0 = b1 + (b2 - b1) * 0.42, react1 = b1 + (b2 - b1) * 0.72;
  const m = mouthFor(P, ["p1_gamer1"], t);
  const talking = m > 0.12;
  const tw = twos(t);
  const gm: GamerState = { eyes: "crazy", mouth: talking ? "talk" : "grin", open: m, gap: true, armL: 1.2, armR: 1.55, strip: true, spit: 1, headTilt: Math.sin(tw * 1.3) * 0.06, lookX: 0 };
  let cam: { pos: V3; look: V3; fov: number; roll?: number };
  let showCmd = false;
  const cmd: CmdState = { eyes: "normal", mouth: "o", open: 0.3, sweat: 1, armR: 0.3, armL: 0.3, lean: 0 };
  if (t < b1) {
    const k = prog(t, g.start - 0.1, b1);
    cam = { pos: [0.15, 1.45, 4.0 - easeInOut(k) * 1.5], look: [0.2, 1.25, 0], fov: 44, roll: 0.05 * k };
  } else if (t < react0) {
    const k = prog(t, b1, react0);
    cam = { pos: [-1.4 + k * 0.3, 0.3, 3.0], look: [0, 1.55, 0], fov: 46, roll: 0.15 }; // снизу сбоку, голландский угол
  } else if (t < react1) {
    const k = prog(t, react0, react1);
    showCmd = true;
    cam = { pos: [1.0, 1.75, -3.5 + k * 0.5], look: [CX - 0.1, 1.38, CZ], fov: 44 };
  } else if (t < b2) {
    const k = prog(t, react1, b2);
    cam = { pos: [-0.6, 1.8, 4.8 - k * 0.3], look: [0.05, 1.2, 0], fov: 44 };
    showCmd = true;
  } else {
    const k = prog(t, b2, ZM().start);
    cam = { pos: [0.08, 1.42, 3.4 - easeInOut(k) * 1.1], look: [0.08, 1.32, 0], fov: 44 };
  }
  const hideCmd = cam.pos[2] < CZ - 0.2 ? false : cam.pos[2] > 0.5 && !showCmd;
  return (
    <>
      <Cam pos={cam.pos} look={cam.look} fov={cam.fov} roll={cam.roll ?? 0} />
      <InnerSet t={t} />
      <Gamer t={t} s={gm} />
      <Holders t={t} releaseR={1} onlyL={cam.pos[2] < 0} />
      <Commander s={{ ...cmd, hide: hideCmd }} />
    </>
  );
}

// zoom: очки сползают, резкий наезд в глаза, стена трескается
function shotZoom(t: number) {
  const z = ZM(), lt = t - z.start;
  const a = 0.5, b = 1.35;
  const tw = twos(t);
  if (lt < b) {
    const sh = prog(lt, 0.1, 0.42);
    const zk = easeIn(prog(lt, a, b - 0.15));
    const [sx, sy] = shake(t, z.start + a, 0.015, 0.9, 40);
    const pos: V3 = [CX + sx, 1.46 + sy, lerp(CZ - 4.4, CZ - 1.15, zk)];
    return (
      <>
        <Cam pos={pos} look={[CX, 1.46, CZ]} fov={lerp(44, 26, zk)} />
        <InnerSet t={t} />
        <Commander s={{ eyes: sh > 0.6 ? "wide" : "normal", mouth: "o", open: 0.6, shades: sh, sweat: 1, armL: 0.2, armR: 0.2 }} />
      </>
    );
  }
  // общий план снизу из-за спины командира: стена трескается
  const k = prog(lt, b, z.end - z.start);
  const crack = prog(lt, b + 0.05, b + 1.5);
  const [sx, sy] = shake(t, z.start + b, 0.25, 2.0, 24);
  const chunks: React.ReactNode[] = [];
  const r = rng(12);
  for (let i = 0; i < 12; i++) {
    const t0 = b + 0.3 + r() * 1.3, x = (r() - 0.5) * 10, y0 = 7 + r() * 9, sz = 0.5 + r() * 1.1, rs = (r() - 0.5) * 6;
    const ft = lt - t0;
    if (ft < 0) continue;
    const y = y0 - 4.9 * ft * ft * 1.5;
    if (y < -1) continue;
    chunks.push(<Box key={i} p={[x, y, WZ + 0.9 + ft * 1.2]} s={[sz, sz * 0.8, sz * 0.6]} c={i % 2 ? "#a19f98" : "#b3b1aa"} r={[ft * rs * 0.3, ft * rs * 0.2, ft * rs]} />);
  }
  const dust: React.ReactNode[] = [];
  for (let i = 0; i < 6; i++) {
    const t0 = b + 0.6 + i * 0.18, dk = prog(lt, t0, t0 + 1.3);
    if (dk > 0 && dk < 1) dust.push(<Puff key={i} position={[-5 + i * 2, 0.4 + dk * 1.6, WZ + 1.0]} scale={1 + dk * 1.8} color="#d6cfbf" opacity={1 - dk} />);
  }
  // дыра в стене: из темноты горят глаза толпы
  const hole = prog(lt, b + 1.2, b + 1.5);
  return (
    <>
      <Cam pos={[-1.3 + sx, 0.6 + sy, 4.8 - k * 0.6]} look={[0.2, 4.6 + k * 0.6, -3]} fov={64} roll={-0.04} />
      <InnerSet t={t} crumble={crack} />
      {hole > 0 && (
        <group position={[0.4, 9.4, WZ + 0.4]} scale={easeOutBack(hole)}>
          <mesh geometry={geo.poly("hole", [[-1.6, -0.6], [-0.8, -1.3], [0.6, -1.1], [1.7, -0.2], [1.2, 1.0], [0, 1.4], [-1.3, 0.9]], 0.1, 0.02)} material={paper("#0e0c10")} />
          {Array.from({ length: 7 }, (_, i) => (
            <group key={i} position={[-1.0 + (i % 4) * 0.65 + (i > 3 ? 0.3 : 0), i > 3 ? -0.45 : 0.35, 0.03]}>
              {[-0.09, 0.09].map((ex) => <mesh key={ex} geometry={geo.ellipse(0.07, 0.09, 0.01)} material={glow("#fffbe0")} position={[ex, 0, 0]} />)}
              {[-0.09, 0.09].map((ex) => <mesh key={"p" + ex} geometry={geo.ellipse(0.025, 0.025, 0.01)} material={glow("#111")} position={[ex + Math.sin(tw * 3 + i) * 0.02, 0, 0.01]} />)}
            </group>
          ))}
          {[-0.9, 0.8].map((x, i) => <group key={"h" + i} position={[x, -1.0, 0.1]} rotation={[0, 0, (i ? -0.5 : 0.5) + Math.sin(tw * 8 + i) * 0.2]}>
            <mesh geometry={geo.rrect(0.22, 0.9, 0.08, 0.05)} material={paper(i ? "#c0392b" : "#27ae60")} position={[0, -0.3, 0]} />
            <mesh geometry={geo.ellipse(0.14, 0.14, 0.05)} material={paper("#e8b98f")} position={[0, -0.8, 0.02]} />
          </group>)}
        </group>
      )}
      {chunks}
      {dust}
      <Gamer t={t} s={{ eyes: "crazy", mouth: "grin", gap: true, armL: 1.2, armR: 1.55, strip: true, spit: 1 }} />
      <Holders t={t} releaseR={1} />
      <SWAT x={1.2} z={-0.2} armL={2.6} armR={2.4} eyes="wide" />
      <Commander s={{ eyes: "wide", mouth: "o", open: 0.8, shades: 1, sweat: 1, armL: 2.0 + Math.sin(tw * 10) * 0.1, armR: 2.0, tilt: -0.05 }} />
    </>
  );
}

// ======================= ОВЕРЛЕИ =======================
const ZoomOverlay: React.FC<{ t: number }> = ({ t }) => {
  const z = ZM(), lt = t - z.start;
  if (lt < 0.45 || lt > 1.45) return null;
  const k = prog(lt, 0.45, 1.35);
  const a = Math.sin(Math.min(1, k) * Math.PI);
  const tq = Math.floor(lt * 15);
  const lines = Array.from({ length: 28 }, (_, i) => {
    const ang = (i / 28) * 360 + hash(i + tq) * 8;
    return <div key={i} style={{ position: "absolute", left: 540, top: 960, width: 1400, height: 6 + hash(i * 3) * 10, background: "#000", opacity: 0.55, transformOrigin: "0 50%", transform: `rotate(${ang}deg) translateX(${380 + hash(i + tq * 7) * 160}px)` }} />;
  });
  return (
    <AbsoluteFill style={{ pointerEvents: "none", opacity: a, overflow: "hidden" }}>
      <AbsoluteFill style={{ background: "radial-gradient(circle at 50% 50%, rgba(0,0,0,0) 30%, rgba(150,0,0,0.55) 75%)" }} />
      {lines}
    </AbsoluteFill>
  );
};
const CrackFlash: React.FC<{ t: number }> = ({ t }) => {
  const z = ZM(), lt = t - z.start - 1.35;
  if (lt < 0 || lt > 0.25) return null;
  return <AbsoluteFill style={{ background: "#fff", opacity: (1 - lt / 0.25) * 0.8, pointerEvents: "none" }} />;
};

const Title: React.FC<{ t: number }> = ({ t }) => {
  const c = TT(), lt = t - c.start;
  const k1 = easeOutBack(prog(lt, 0.15, 0.55)), k2 = easeOutBack(prog(lt, 0.45, 0.85));
  const dots = Math.min(3, Math.floor(prog(lt, 0.9, 1.8) * 4));
  const wob = (Math.floor(lt * 6) % 2 ? 1 : -1) * 0.6;
  const fadeIn = clamp01(lt / 0.15);
  const badge = easeOutBack(prog(lt, 1.2, 1.6));
  return (
    <AbsoluteFill style={{ background: "#0b0a0c", justifyContent: "center", alignItems: "center", opacity: fadeIn }}>
      {/* фактура бумаги */}
      <AbsoluteFill style={{ opacity: 0.16, backgroundImage: "repeating-linear-gradient(17deg, rgba(255,255,255,0.08) 0 2px, transparent 2px 7px), repeating-linear-gradient(-63deg, rgba(255,255,255,0.05) 0 1px, transparent 1px 11px)" }} />
      <AbsoluteFill style={{ background: "radial-gradient(circle at 50% 45%, rgba(255,255,255,0.07), rgba(0,0,0,0.6) 75%)" }} />
      <div style={{ position: "absolute", top: 700, width: "100%", textAlign: "center", transform: `rotate(${-3 + wob}deg)` }}>
        <div style={{ fontFamily: FONT, fontWeight: 900, fontSize: 112, color: "#fff", letterSpacing: 0, transform: `scale(${k1})`, textShadow: "8px 8px 0 #b71c1c" }}>ПРОДОЛЖЕНИЕ</div>
        <div style={{ fontFamily: FONT, fontWeight: 900, fontSize: 92, color: "#fff", marginTop: 6, transform: `scale(${k2})`, textShadow: "7px 7px 0 #b71c1c" }}>
          во 2-й части<span>{".".repeat(dots)}</span><span style={{ opacity: 0 }}>{".".repeat(3 - dots)}</span>
        </div>
      </div>
      <div style={{ position: "absolute", top: 1100, transform: `scale(${badge}) rotate(2deg)`, background: "#f7e9c9", padding: "14px 30px 18px", border: "6px solid #f7e9c9", boxShadow: "8px 8px 0 rgba(183,28,28,0.9)" }}>
        <div style={{ fontFamily: FONT, fontWeight: 900, fontSize: 54, color: "#111" }}>ЧАСТЬ 2: «{part("p2").title}»</div>
      </div>
    </AbsoluteFill>
  );
};

// ======================= СЦЕНЫ =======================
const EPS = 0;
export const SCENES: SceneDef[] = [
  { id: "p1_int_grab", from: GR().start, to: C2().start - 0.1, bg: SKY, render3d: shotGrab },
  { id: "p1_int_cmd2", from: C2().start - 0.1, to: SP().start, bg: SKY, render3d: shotCmd2 },
  { id: "p1_int_spit", from: SP().start, to: G1().start - 0.1 + EPS, bg: SKY, render3d: shotSpit },
  { id: "p1_int_gamer1", from: G1().start - 0.1, to: ZM().start, bg: SKY, render3d: shotGamer1 },
  { id: "p1_int_zoom", from: ZM().start, to: TT().start, bg: SKY, render3d: shotZoom, overlay: (t) => <><ZoomOverlay t={t} /><CrackFlash t={t} /></> },
  { id: "p1_int_title", from: TT().start, to: part(P).duration + 1, bg: "#000", render3d: () => null, overlay: (t) => <Title t={t} />, hideSubs: () => true },
];
