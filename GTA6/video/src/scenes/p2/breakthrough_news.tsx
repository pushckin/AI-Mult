// p2/breakthrough — биты p2_news1 / p2_cord / p2_news2: студия новостей, мужик с плазмой влетает в окно и выдёргивает шнур камеры.
import React from "react";
import { AbsoluteFill } from "remotion";
import { Character } from "../../kit/Character";
import { CAST } from "../../kit/cast";
import { Cam, PaperLights, Sheet, CanvasPlane, drawText } from "../../kit/Stage";
import { geo, paper, glow, rng, FONT } from "../../kit/paper";
import { cue, prog, easeOut, easeIn, easeInOut, easeOutBack, shake, twos, hash, lerp, clamp01, mouthFor, FPS } from "../../kit/anim";
import { Plasma, BackGear, Shards, Sparks, StudioCam, Cable } from "./breakthrough_props";
import { censorText } from "../../kit/Overlays";

type V3 = [number, number, number];
const N = () => cue("p2", "p2_news1").start;
const C = () => cue("p2", "p2_cord").start;
const N2 = () => cue("p2", "p2_news2");
const D = () => C() - N();
export const NEWS_START = () => N() - 0.05;
export const CRASH_AT = () => N() + Math.min(3.2, D() * 0.44); // мужик влетает в окно (sfx glass_break: news1+3.2)
export const NEWS_CUT1 = () => CRASH_AT() - 0.5;     // крупный → общий
export const CORD_IN = () => C() - 0.45;             // врезка: шнур
export const CORD_OUT = () => C() + 0.6;            // назад в эфир, глюки
export const NEWS_END = () => N2().end;

// ---------- задник: ночной город в огне за окном ----------
function drawCity(g: CanvasRenderingContext2D, W: number, H: number) {
  const bands = ["#3a1f3d", "#5b2a43", "#8a3a3f", "#c25a35", "#e98a3a"];
  bands.forEach((c, i) => { g.fillStyle = c; g.fillRect(0, (H * i) / bands.length * 0.75, W, H); });
  const r = rng(31);
  // дым
  g.fillStyle = "rgba(40,30,40,0.55)";
  for (let i = 0; i < 9; i++) { g.beginPath(); g.ellipse(r() * W, H * (0.15 + r() * 0.3), W * 0.12, H * 0.07, 0, 0, 7); g.fill(); }
  // дома
  let x = 0;
  while (x < W) {
    const w = W * (0.07 + r() * 0.09), h = H * (0.25 + r() * 0.45);
    g.fillStyle = r() < 0.5 ? "#1f1a2a" : "#2a2236";
    g.fillRect(x, H - h, w, h);
    for (let wy = H - h + 10; wy < H - 14; wy += 18) for (let wx = x + 6; wx < x + w - 8; wx += 14) if (r() < 0.45) { g.fillStyle = r() < 0.75 ? "#ffd36b" : "#7fe7ff"; g.fillRect(wx, wy, 7, 9); }
    x += w + 2;
  }
  // пожары
  for (let i = 0; i < 4; i++) {
    const fx = W * (0.1 + r() * 0.8), fy = H * (0.55 + r() * 0.15);
    g.fillStyle = "#ff7a1a"; g.beginPath(); g.moveTo(fx - 26, fy + 20); g.lineTo(fx, fy - 40); g.lineTo(fx + 26, fy + 20); g.fill();
    g.fillStyle = "#ffd23f"; g.beginPath(); g.moveTo(fx - 12, fy + 20); g.lineTo(fx, fy - 14); g.lineTo(fx + 12, fy + 20); g.fill();
  }
  // толпа силуэтами с телевизорами
  for (let i = 0; i < 60; i++) {
    const cx = r() * W, cy = H - 6 - r() * 12;
    g.fillStyle = "#120e18";
    g.beginPath(); g.arc(cx, cy - 22, 8, 0, 7); g.fill(); g.fillRect(cx - 9, cy - 14, 18, 22);
    if (r() < 0.5) { g.fillStyle = "#0c0a10"; g.fillRect(cx - 14, cy - 40, 28, 18); g.fillStyle = "#4a6aa0"; g.fillRect(cx - 11, cy - 37, 22, 12); }
  }
}

const Studio: React.FC<{ t: number; broken: boolean }> = ({ t, broken }) => (
  <>
    <PaperLights intensity={1.0} />
    {/* задняя стена */}
    <Sheet w={14} h={8} color="#16244a" position={[0, 3, -3.05]} />
    <CanvasPlane texKey="bt_city" w={5.2} h={3.0} px={900} position={[0, 2.25, -3.5]} draw={drawCity} />
    {/* рама окна */}
    {[[-2.0, 2.25, 0.16, 2.7], [2.0, 2.25, 0.16, 2.7], [0, 0.9, 4.16, 0.16], [0, 3.6, 4.16, 0.16], [0, 2.25, 0.08, 2.7], [0, 2.25, 4.0, 0.06]].map(([x, y, w, h], i) => (
      <mesh key={i} position={[x, y, -3.0]} geometry={geo.rrect(w, h, 0.02, 0.05)} material={paper("#0d1530")} />
    ))}
    {!broken ? (
      <>
        <mesh position={[0, 2.25, -3.02]} material={glow("#cfe8ff", 0.1)}><planeGeometry args={[4, 2.7]} /></mesh>
        {[-1.2, 0.7].map((x, i) => <mesh key={i} position={[x, 2.4, -3.01]} rotation={[0, 0, -0.6]} material={glow("#ffffff", 0.16)}><planeGeometry args={[0.12, 2.0]} /></mesh>)}
      </>
    ) : (
      // рваные края стекла левой половины
      <>
        <mesh position={[1.0, 2.25, -3.02]} material={glow("#cfe8ff", 0.1)}><planeGeometry args={[2, 2.7]} /></mesh>
        {[[-1.85, 3.3, 0.6], [-1.9, 1.3, 0.4], [-0.3, 3.4, 0.5], [-0.2, 1.1, 0.35], [-1.1, 3.5, 0.3]].map(([x, y, s], i) => (
          <mesh key={i} position={[x, y, -3.01]} rotation={[0, 0, i * 1.7]} geometry={geo.poly("gl" + (i % 3), [[0, 0], [1, 0.1], [0.2, 0.9]], 0, 0.01)} scale={[s, s, 1]} material={glow("#dff1ff", 0.45)} />
        ))}
      </>
    )}
    {/* студийные прожекторы и боковые панели */}
    {[-3.2, 3.2].map((x, i) => <mesh key={i} position={[x, 2.2, -3.0]} geometry={geo.rrect(1.6, 4.4, 0.05, 0.05)} material={paper("#1d3366")} />)}
    {[-3.2, 3.2].map((x, i) => <mesh key={"s" + i} position={[x, 2.9, -2.95]} geometry={geo.rrect(1.2, 0.5, 0.05, 0.03)} material={glow("#c62828")} />)}
    {[-3.2, 3.2].map((x, i) => <CanvasPlane key={"t" + i} texKey="bt_live_sign" w={1.1} h={0.42} px={256} position={[x, 2.9, -2.9]} draw={(g, W, H) => drawText(g, W, H, "ЭФИР", { fg: "#fff", size: 60 })} transparent />)}
    {/* пол */}
    <Sheet w={14} h={10} color="#24305a" position={[0, 0, 1]} rotation={[-Math.PI / 2, 0, 0]} />
  </>
);

const Desk: React.FC = () => (
  <group position={[0.3, 0, 0.35]}>
    <mesh position={[0, 0.45, 0]} material={paper("#33529a")}><boxGeometry args={[2.2, 0.9, 0.8]} /></mesh>
    <mesh position={[0, 0.91, 0]} material={paper("#d8dee9")}><boxGeometry args={[2.3, 0.04, 0.9]} /></mesh>
    {[0.2, 0.62].map((y, i) => <mesh key={i} position={[0, y, 0.41]} material={paper(i ? "#c62828" : "#25407a")}><planeGeometry args={[2.2, i ? 0.06 : 0.04]} /></mesh>)}
    {/* бумаги и кружка */}
    <mesh position={[0.75, 0.97, 0.15]} geometry={geo.rrect(0.16, 0.14, 0.03, 0.12)} material={paper("#e8e8e8")} />
  </group>
);

const Papers: React.FC = () => <mesh position={[0.05, 0.1, 0.05]} rotation={[0, 0, 0.1]} geometry={geo.rrect(0.32, 0.42, 0.01, 0.01)} material={paper("#fbfbf6")} />;

/** Диктор за столом */
const Anchor: React.FC<{ t: number; stand?: number; look?: number; yell?: boolean }> = ({ t, stand = 0, look = 0, yell }) => {
  const tq = twos(t);
  const m = mouthFor("p2", ["p2_news1", "p2_news2"], t);
  const g = Math.sin(tq * 3.1) > 0.3;
  return (
    <Character {...CAST.anchor} position={[0.3, 0.12 + stand * 0.3, -0.2]} legs="none" mouth={yell ? "scream" : "talk"} mouthOpen={m}
      eyes={yell ? "angry" : "normal"} lookX={look} lookY={yell ? 0 : look ? 0 : -0.1} sweat={yell ? 1 : 0}
      armL={yell ? 1.75 + Math.sin(tq * 20) * 0.1 : g ? 0.75 : 0.55} armR={yell ? 0.3 : 0.55}
      handL={yell ? undefined : <Papers />} handR={yell ? undefined : <Papers />}
      headTilt={yell ? -0.12 : Math.sin(tq * 2.3) * 0.05} bodyTilt={yell ? 0.05 : 0} />
  );
};

/** Украденная плазма, которую мужик держит перед собой */
function drawLoot(g: CanvasRenderingContext2D, W: number, H: number) {
  g.fillStyle = "#6fa8ff"; g.fillRect(0, 0, W, H);
  g.fillStyle = "#9cc4ff"; g.beginPath(); g.moveTo(W * 0.1, H); g.lineTo(W * 0.45, 0); g.lineTo(W * 0.6, 0); g.lineTo(W * 0.25, H); g.fill();
  g.fillStyle = "#e53935"; g.beginPath(); g.arc(W * 0.78, H * 0.3, H * 0.24, 0, 7); g.fill();
  g.fillStyle = "#fff"; g.font = `900 ${H * 0.2}px ${FONT}`; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText("-70%", W * 0.78, H * 0.31);
  g.fillStyle = "#111"; g.font = `900 ${H * 0.16}px ${FONT}`; g.fillText("4K  85\"", W * 0.35, H * 0.78);
}
const LootTv: React.FC<{ oneHand?: boolean }> = ({ oneHand }) => (
  <group position={[oneHand ? -0.3 : 0, 0.5, 0.28]} rotation={[0, 0, oneHand ? 0.12 : 0]}>
    <mesh geometry={geo.rrect(1.4, 0.86, 0.04, 0.06)} material={paper("#1a1a1a")} />
    <CanvasPlane texKey="bt_loot" w={1.3} h={0.76} px={400} position={[0, 0, 0.05]} draw={drawLoot} />
    {(oneHand ? [-1] : [-1, 1]).map((s) => <mesh key={s} position={[s * 0.72, -0.05, 0.08]} geometry={geo.ellipse(0.1, 0.1, 0.04)} material={paper("#eab48c")} />)}
  </group>
);

/** Мужик с плазмой */
const PlasmaGuy: React.FC<{ t: number; pose: "fly" | "walk" | "stare" | "yank"; arm?: number; legPhase?: number }> = ({ t, pose, arm = 0.2, legPhase = 0 }) => (
  <Character outfit="tshirt" color="#2f9e57" color2="#3b3f5c" hat="curly" hairColor="#2a1a12" adult stubble sweat={1} skin="#eab48c"
    eyes={pose === "fly" ? "crazy" : pose === "stare" ? "squint" : "crazy"} mouth={pose === "fly" ? "scream" : "grin"} mouthOpen={1}
    lookX={pose === "stare" ? 0 : 0.3} legs={pose === "walk" || pose === "fly" ? "run" : "stand"} legPhase={legPhase}
    armL={0.35} armR={arm}
    front={<LootTv oneHand={pose === "yank" || pose === "stare"} />}
    back={<BackGear kind={1} />} />
);

// ============ N1: крупный план диктора ============
export const NewsClose: React.FC<{ t: number }> = ({ t }) => {
  const k = prog(t, NEWS_START(), NEWS_CUT1());
  return (
    <>
      <Cam pos={[0.3, 1.8, lerp(5.6, 4.9, easeInOut(k))]} look={[0.3, 1.18, 0]} fov={34} />
      <Studio t={t} broken={false} />
      <Desk />
      <Anchor t={t} />
    </>
  );
};

// ============ N2: общий — мужик влетает в окно ============
export const NewsWide: React.FC<{ t: number }> = ({ t }) => {
  const ca = CRASH_AT();
  const tq = twos(t);
  const k = prog(t, NEWS_CUT1(), CORD_IN());
  const [sx, sy] = shake(t, ca, 0.07, 0.5);
  const [sx2, sy2] = shake(t, ca + 0.42, 0.06, 0.4);
  // траектория мужика
  let guy: React.ReactNode = null;
  const landDesk = ca + 0.42, slideOff = ca + 0.75, up = ca + 1.15;
  const walk0 = up + 0.25, walk1 = CORD_IN() - 0.7;
  if (t >= ca - 0.25) {
    if (t < landDesk) {
      const u = prog(t, ca - 0.25, landDesk);
      const p: V3 = [lerp(-1.0, -0.55, u), lerp(2.6, 1.2, u) + Math.sin(u * Math.PI) * 0.7, lerp(-4.2, 0.1, u)];
      guy = <group position={p} rotation={[0, 0, -u * 2.2]}><group position={[0, -0.9, 0]}><PlasmaGuy t={t} pose="fly" arm={2.6} legPhase={tq * 20} /></group></group>;
    } else if (t < slideOff) {
      const u = prog(t, landDesk, slideOff);
      guy = <group position={[lerp(-0.55, -0.7, u), 1.0 + 0.25 * (1 - u), lerp(0.1, 0.9, u)]} rotation={[0, 0, -1.45 + u * 0.2]}><group position={[0, -0.6, 0]}><PlasmaGuy t={t} pose="fly" arm={2.4} /></group></group>;
    } else if (t < up) {
      const u = easeOutBack(prog(t, slideOff + 0.15, up));
      guy = <group position={[-0.7, 0, 1.1]} rotation={[0, 0, lerp(-1.3, 0, u)]}><PlasmaGuy t={t} pose="walk" arm={0.6} /></group>;
    } else {
      const u = easeInOut(prog(t, walk0, walk1));
      const walking = t > walk0 && t < walk1;
      guy = <group position={[lerp(-0.7, -0.45, u), walking ? Math.abs(Math.sin(tq * 9)) * 0.05 : 0, lerp(1.1, 2.3, u)]}><PlasmaGuy t={t} pose={t > walk1 ? "stare" : "walk"} arm={t > walk1 ? 0.15 : 0.4} legPhase={walking ? tq * 14 : 0} /></group>;
    }
  }
  const anchorLook = t > ca + 0.1 && t < ca + 0.9 ? -0.9 : 0;
  return (
    <>
      <Cam pos={[0.05 + sx + sx2 + lerp(0, -0.1, k), 1.85 + sy + sy2, lerp(6.7, 6.2, k)]} look={[-0.05, 1.0, -0.5]} fov={40} />
      <Studio t={t} broken={t >= ca} />
      <Shards t={t} t0={ca} origin={[-0.9, 2.3, -2.95]} n={26} dir={[0.2, 0.4, 2.6]} />
      <Desk />
      <Anchor t={t} look={anchorLook} />
      {guy}
      {t >= landDesk && t < landDesk + 0.8 && [0, 1, 2].map((i) => {
        const u = t - landDesk;
        return <mesh key={i} position={[-0.4 + i * 0.25 + u * (i - 1) * 1.2, 1.2 + u * 2.2 - u * u * 5, 0.4 + u * 0.8]} rotation={[0, 0, u * 8 * (i - 1)]} geometry={geo.rrect(0.3, 0.4, 0.01, 0.01)} material={paper("#fbfbf6")} />;
      })}
    </>
  );
};

// ============ врезка: мужик выдёргивает шнур из камеры ============
export const CordInsert: React.FC<{ t: number }> = ({ t }) => {
  const c = C();
  const tq = twos(t);
  const yank = easeOut(prog(t, c, c + 0.14));
  const [sx, sy] = shake(t, c, 0.06, 0.4);
  const plugHome: V3 = [-0.68, 1.0, 0.1];
  const handP: V3 = [lerp(-0.68, -0.89, yank), lerp(1.0, 1.36, yank), 0.15];
  return (
    <>
      <Cam pos={[-1.0 + sx, 1.6 + sy, lerp(5.4, 5.0, prog(t, CORD_IN(), CORD_OUT()))]} look={[-1.0, 1.05, 0]} fov={40} />
      <PaperLights intensity={0.95} />
      <Sheet w={12} h={7} color="#16244a" position={[0, 3, -2]} />
      {[-2.2, -0.6, 1.0, 2.6].map((x, i) => <mesh key={i} position={[x, 3.1, -1.95]} material={glow("#fff5c8", 0.9)}><circleGeometry args={[0.16, 18]} /></mesh>)}
      <Sheet w={12} h={8} color="#24305a" position={[0, 0, 1]} rotation={[-Math.PI / 2, 0, 0]} />
      <group position={[-0.03, -0.45, 0]} scale={0.75}><StudioCam tally={t < c + 0.05} /></group>
      {/* кабель от камеры к руке/полу */}
      <Cable pts={t < c ? [plugHome, [-0.6, 0.6, 0.2], [-0.4, 0.08, 0.3], [-2.4, 0.05, 0.4]] : [handP, [lerp(-0.6, -0.7, yank), 0.8, 0.3], [-0.5, 0.1, 0.35], [-2.4, 0.05, 0.4]]} r={0.035} color="#111" />
      <mesh position={t < c ? plugHome : handP} geometry={geo.rrect(0.16, 0.12, 0.03, 0.08)} material={paper("#333")} />
      <Sparks t={t} t0={c} origin={[-0.68, 1.0, 0.2]} n={16} dur={0.5} />
      <group position={[-1.35, 0, -0.3]}>
        <PlasmaGuy t={t} pose={t < c ? "stare" : "yank"} arm={lerp(1.35, 2.5, yank)} />
      </group>
    </>
  );
};

// ============ N3: эфир после рывка — глюки, диктор орёт ============
export const NewsGlitch: React.FC<{ t: number }> = ({ t }) => {
  const f = Math.floor(t * FPS);
  const jx = (hash(f * 3.1) - 0.5) * 0.12, jy = (hash(f * 7.7) - 0.5) * 0.06;
  return (
    <>
      <Cam pos={[0.2 + jx, 1.75 + jy, 4.6]} look={[0.3, 1.3, 0]} fov={36} roll={0.13 + (hash(f) - 0.5) * 0.03} />
      <Studio t={t} broken />
      <Desk />
      <Anchor t={t} stand={1} yell look={-0.9} />
    </>
  );
};

// ======================= 2D-оверлеи =======================
const TICKER = "ЦЕНЫ НА ТРОЙНИКИ ВЫРОСЛИ НА 4000%  •  В ОКЛЕНДЕ ВЫНЕСЛИ ВСЕ РОУТЕРЫ  •  ОВЦЫ ЭВАКУИРОВАНЫ В АВСТРАЛИЮ  •  БАНКИ И ЮВЕЛИРНЫЕ НЕ ТРОНУТЫ  •  ";
export const NewsGraphics: React.FC<{ t: number; glitch?: number; censored: boolean }> = ({ t, glitch = 0, censored }) => {
  const n = N();
  const lt = easeOutBack(prog(t, n + 0.2, n + 0.55));
  const headline = t < CRASH_AT() + 0.2 ? "АРМИЯ ПАЛА" : t < NEWS_END() - 2.5 ? "ПРИШЕЛЬЦЫ ИЩУТ РОЗЕТКИ" : "ТЕХНИЧЕСКИЕ НЕПОЛАДКИ";
  const scroll = ((t - n) * 220) % 1900;
  const f = Math.floor(t * FPS);
  const gx = glitch ? (hash(f * 1.3) - 0.5) * 60 * glitch : 0;
  const liveOn = t > n + 0.55;
  return (
    <AbsoluteFill style={{ pointerEvents: "none", fontFamily: FONT }}>
      {liveOn && (
        <div style={{ position: "absolute", left: 50, top: 190, display: "flex", alignItems: "center", gap: 12, background: "#c62828", padding: "10px 20px", border: "4px solid #111", transform: `translateX(${gx}px)` }}>
          <div style={{ width: 22, height: 22, borderRadius: 11, background: Math.floor(t * 2) % 2 ? "#fff" : "#ffb3b3" }} />
          <div style={{ fontWeight: 900, fontSize: 38, color: "#fff" }}>ПРЯМОЙ ЭФИР</div>
        </div>
      )}
      {liveOn && <div style={{ position: "absolute", right: 150, top: 192, fontWeight: 900, fontSize: 44, color: "rgba(255,255,255,0.85)", WebkitTextStroke: "3px rgba(0,0,0,0.5)", paintOrder: "stroke fill", transform: `translateX(${-gx}px)` }}>НЗ-24</div>}
      <div style={{ position: "absolute", left: 30, right: 30, top: 950, transform: `translateX(${(1 - lt) * -1100 + gx}px)` }}>
        <div style={{ display: "inline-block", background: "#c62828", color: "#fff", fontWeight: 900, fontSize: 46, padding: "6px 22px", border: "5px solid #111", borderBottom: "none" }}>ЭКСТРЕННЫЙ ВЫПУСК</div>
        <div style={{ background: "#f7f3e8", color: "#111", fontWeight: 900, fontSize: 52, padding: "8px 22px", border: "5px solid #111", whiteSpace: "nowrap", overflow: "hidden" }}>{headline}</div>
      </div>
      <div style={{ position: "absolute", left: 0, right: 0, top: 1112, height: 56, background: "#111", overflow: "hidden", display: "flex", alignItems: "center", opacity: lt }}>
        <div style={{ position: "absolute", left: 1080 - scroll, whiteSpace: "nowrap", fontWeight: 800, fontSize: 36, color: "#ffe14d" }}>{TICKER + TICKER}</div>
        <div style={{ position: "relative", background: "#ffe14d", color: "#111", fontWeight: 900, fontSize: 34, padding: "8px 16px", height: "100%", display: "flex", alignItems: "center" }}>СРОЧНО</div>
      </div>
    </AbsoluteFill>
  );
};

/** Помехи: шум, цветные полосы, срыв строк, «выключение» кинескопа */
export const GlitchFx: React.FC<{ t: number }> = ({ t }) => {
  const f = Math.floor(t * FPS);
  const t0 = CORD_OUT(), n2 = N2();
  const heavy = t < n2.start ? 1 : Math.max(0, 0.35 + 0.4 * (hash(f * 2.3) > 0.7 ? 1 : 0));
  const off = prog(t, NEWS_END() - 0.32, NEWS_END() - 0.02);
  const r = rng(f + 5);
  const bands = Array.from({ length: 6 }, () => ({ y: r() * 1920, h: 20 + r() * 120, x: (r() - 0.5) * 140, c: ["#ff00aa", "#00e5ff", "#ffe600", "#00ff66"][Math.floor(r() * 4)] }));
  const bars = ["#c0c0c0", "#c0c000", "#00c0c0", "#00c000", "#c000c0", "#c00000", "#0000c0"];
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      {t < n2.start && hash(f * 5.5) > 0.45 && (
        <div style={{ position: "absolute", inset: 0, display: "flex", opacity: 0.85 }}>{bars.map((c) => <div key={c} style={{ flex: 1, background: c }} />)}</div>
      )}
      <svg width="1080" height="1920" style={{ position: "absolute", inset: 0, opacity: 0.25 + 0.6 * heavy }}>
        <filter id={"bt_noise"}><feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves={2} seed={f % 97} /><feColorMatrix type="saturate" values="0" /></filter>
        <rect width="1080" height="1920" filter="url(#bt_noise)" />
      </svg>
      {bands.map((b, i) => <div key={i} style={{ position: "absolute", left: b.x, top: b.y, width: 1080, height: b.h, background: b.c, opacity: 0.55, mixBlendMode: "difference" }} />)}
      <div style={{ position: "absolute", inset: 0, background: "repeating-linear-gradient(0deg, rgba(0,0,0,0.25) 0 3px, transparent 3px 7px)" }} />
      {t > t0 && t < n2.start + 0.05 && <div style={{ position: "absolute", left: 0, right: 0, top: 820, textAlign: "center", fontFamily: FONT, fontWeight: 900, fontSize: 70, color: "#fff", WebkitTextStroke: "10px #000", paintOrder: "stroke fill" }}>НЕТ СИГНАЛА</div>}
      {off > 0 && (
        <AbsoluteFill style={{ background: "#000" }}>
          <div style={{ position: "absolute", left: 540 - 540 * (1 - off * 0.9), width: 1080 * (1 - off * 0.9), top: 960 - 8 * (1 - off), height: 16 * (1 - off) + 4, background: "#fff", boxShadow: "0 0 40px #bfe9ff" }} />
        </AbsoluteFill>
      )}
    </AbsoluteFill>
  );
};
