// Сцена p1/bunker — врезки: окно министра обороны, пляж с «Боингом», паром, матрасы, сарай с овцами.
import React from "react";
import { Character, CharacterProps, Piece } from "../../kit/Character";
import { CAST } from "../../kit/cast";
import { CanvasPlane, Sheet, Puff, Crowd, CrowdMember } from "../../kit/Stage";
import { geo, paper, glow, rng, FONT } from "../../kit/paper";
import { prog, twos, easeOut, easeIn, easeInOut, clamp01, lerp, hash, noise1 } from "../../kit/anim";
import { drawConcrete, Gear, Pad } from "./bunker_set";

// ---------- небо/облака/вода ----------
function drawSky(top: string, bottom: string) {
  return (g: CanvasRenderingContext2D, W: number, H: number) => {
    const gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, top); gr.addColorStop(1, bottom);
    g.fillStyle = gr; g.fillRect(0, 0, W, H);
  };
}
export const Cloud: React.FC<{ position: [number, number, number]; s?: number }> = ({ position, s = 1 }) => (
  <group position={position} scale={s}>
    {[[0, 0, 0.6, 0.4], [0.6, -0.08, 0.45, 0.3], [-0.6, -0.1, 0.5, 0.3], [0.25, 0.25, 0.4, 0.3]].map(([x, y, rx, ry], i) => (
      <Piece key={i} g={geo.ellipse(rx, ry, 0.03)} c="#fbfbf4" p={[x, y, i * 0.01]} />
    ))}
  </group>
);

/** полоса волн: бумажная лента с волнистым верхом */
export const WaveStrip: React.FC<{ y: number; z: number; color: string; t: number; amp?: number; speed?: number; w?: number; seed?: number }> = ({ y, z, color, t, amp = 0.12, speed = 0.4, w = 40, seed = 0 }) => {
  const pts: [number, number][] = [];
  const N = 48, wl = 1.4;
  for (let i = 0; i <= N; i++) { const x = -w / 2 + (i / N) * w; pts.push([x, Math.sin((x / wl) * Math.PI * 2 + seed) * amp]); }
  pts.push([w / 2, -6]); pts.push([-w / 2, -6]);
  const dx = (twos(t) * speed) % wl;
  return <Piece g={geo.poly(`wave_${w}_${amp}_${seed}`, pts, 0, 0.03)} c={color} p={[dx, y, z]} />;
};

// ---------- окно бункера снаружи (министр обороны с биноклем) ----------
export const Binoculars: React.FC<{ glint?: number }> = ({ glint = 0 }) => (
  <group>
    {[-1, 1].map((s) => (
      <group key={s} position={[s * 0.15, 0, 0]}>
        <Piece g={geo.rrect(0.22, 0.3, 0.07, 0.08)} c="#1c1c1c" />
        <Piece g={geo.ellipse(0.085, 0.085, 0.09)} c="#4a6a8a" m={glow(glint > 0 ? "#cfe9ff" : "#3e5f80")} p={[0, -0.02, 0.01]} />
      </group>
    ))}
    <Piece g={geo.rrect(0.12, 0.08, 0.02, 0.07)} c="#333" />
  </group>
);

export const WindowSet: React.FC<{ t: number; mouth: number; scared: number; lower: number }> = ({ t, mouth, scared, lower }) => {
  // проём в стене: x -0.95..0.95, y 1.0..2.15 (стена в z=0, министр за ней)
  const head = 1.405;
  const bin = lower; // 0 — бинокль у глаз, 1 — опущен
  return (
    <group>
      <ambientLight intensity={1.45} />
      <directionalLight position={[-4, 6, 8]} intensity={1.6} color="#fff3dc" />
      <hemisphereLight args={["#cfe8ff", "#8a7f70", 0.6]} />
      {/* интерьер за спиной */}
      <Sheet w={6} h={4} color="#2a312c" position={[0, 1.6, -1.6]} />
      <pointLight position={[0, 1.6, 0.8]} intensity={3} distance={4} color="#fff2d0" />
      {/* бункер стоит у самого океана: песок и прибой перед стеной */}
      <Sheet w={30} h={10} color="#e3cc8c" rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 4]} />
      <WaveStrip y={0.12} z={1.6} color="#bfe4f2" t={t} amp={0.05} w={30} seed={1} speed={0.6} />
      <WaveStrip y={0.05} z={2.0} color="#3d98d6" t={t} amp={0.08} w={30} seed={2} speed={-0.5} />
      <WaveStrip y={-0.05} z={2.3} color="#2a73b0" t={t} amp={0.1} w={30} seed={3} speed={0.7} />
      <Character {...CAST.defense} position={[0, 0, -0.55]} eyes={scared > 0.5 ? "wide" : "normal"} mouth="talk" mouthOpen={mouth} sweat={scared}
        armL={lerp(2.75, 0.4, bin)} armR={lerp(2.75, 0.4, bin)} brow={scared > 0.5 ? 1 : 0.2}
        front={bin < 0.5 ? <group position={[0, 1.33, 0.2]}><Binoculars glint={Math.floor(t * 6) % 5 === 0 ? 1 : 0} /></group> : undefined}
        handR={bin >= 0.5 ? <group position={[0.02, -0.1, 0.05]} rotation={[0, 0, 0.3]}><Binoculars /></group> : undefined} />
      {/* стена с проёмом */}
      {[
        [0, 0.5, 8, 1.0],     // низ
        [0, 2.95, 8, 1.6],    // верх
        [-2.48, 1.575, 3.06, 1.15], // лево
        [2.48, 1.575, 3.06, 1.15],  // право
      ].map(([x, y, w, h], i) => (
        <CanvasPlane key={i} texKey={"facade" + i} w={w} h={h} px={512} glowing={false} draw={drawConcrete(20 + i)} position={[x, y, 0]} />
      ))}
      {/* откосы проёма */}
      <mesh position={[0, 1.0, -0.15]} material={paper("#4c524d")}><boxGeometry args={[1.9, 0.04, 0.3]} /></mesh>
      <mesh position={[0, 2.15, -0.15]} material={paper("#3a3f3b")}><boxGeometry args={[1.9, 0.04, 0.3]} /></mesh>
      {/* мешки с песком */}
      {[-1.6, -0.9, -0.2, 0.5, 1.2, 1.9, -1.25, -0.55, 0.15, 0.85, 1.55].map((x, i) => (
        <Piece key={i} g={geo.rrect(0.72, 0.32, 0.14, 0.2)} c={i % 2 ? "#b39b6a" : "#a38b5a"} p={[x, i < 7 ? 0.16 : 0.45, 0.2 + (i < 7 ? 0.1 : 0)]} r={(hash(i) - 0.5) * 0.15} />
      ))}
      {/* табличка */}
      <CanvasPlane texKey="facadeSign" w={1.2} h={0.32} glowing={false} draw={(g, W, H) => {
        g.fillStyle = "#e0b22a"; g.fillRect(0, 0, W, H); g.fillStyle = "#1b1b1b"; g.fillRect(6, 6, W - 12, H - 12);
        g.fillStyle = "#e0b22a"; g.fillRect(12, 12, W - 24, H - 24);
        g.font = `900 ${Math.floor(H * 0.45)}px ${FONT}`; g.fillStyle = "#1b1b1b"; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText("БУНКЕР №1", W / 2, H / 2 + 2);
      }} position={[0, 2.45, 0.02]} />
      {/* чайка */}
      <group position={[lerp(-2.5, 2.5, (t * 0.35) % 1), 2.75 + Math.sin(t * 3) * 0.05, 0.6]} rotation={[0, 0, Math.sin(twos(t) * 20) * 0.25]}>
        <Piece g={geo.poly("gull", [[-0.25, 0.06], [-0.12, 0.0], [0, -0.04], [0.12, 0.0], [0.25, 0.06], [0.12, 0.03], [0, 0.0], [-0.12, 0.03]], 0, 0.02)} c="#f7f7f2" />
      </group>
    </group>
  );
};

// ---------- «Боинг» (вымышленная авиакомпания) ----------
function drawFuselage(g: CanvasRenderingContext2D, W: number, H: number) {
  g.clearRect(0, 0, W, H);
  g.fillStyle = "#f4f4ef"; g.beginPath(); g.roundRect(0, 0, W, H, H * 0.48); g.fill();
  g.fillStyle = "#1f5fa8"; g.fillRect(H * 0.3, H * 0.62, W - H * 0.6, H * 0.12);
  g.fillStyle = "#e0b22a"; g.fillRect(H * 0.3, H * 0.75, W - H * 0.6, H * 0.05);
  g.fillStyle = "#2b3b4f";
  for (let x = H * 0.9; x < W - H * 0.8; x += H * 0.22) { g.beginPath(); g.roundRect(x, H * 0.33, H * 0.11, H * 0.16, H * 0.04); g.fill(); }
  g.fillStyle = "#1b1b1b"; g.beginPath(); g.roundRect(H * 0.15, H * 0.28, H * 0.42, H * 0.2, H * 0.06); g.fill(); // кабина
  g.font = `900 ${Math.floor(H * 0.2)}px ${FONT}`; g.fillStyle = "#1f5fa8"; g.textAlign = "center"; g.textBaseline = "middle";
  g.fillText("GAMER  AIR", W * 0.52, H * 0.2);
  g.strokeStyle = "rgba(0,0,0,0.25)"; g.lineWidth = 3;
  g.beginPath(); g.roundRect(H * 1.6, H * 0.2, H * 0.28, H * 0.58, H * 0.05); g.stroke(); // дверь
}
export const Airliner: React.FC<{ scrape?: boolean; t: number }> = ({ t }) => (
  <group>
    {/* хвост */}
    <Piece g={geo.poly("tail", [[0, 0], [1.0, 0], [1.25, 1.35], [0.85, 1.35]], 0.06, 0.06)} c="#1f5fa8" p={[2.15, 0.35, -0.05]} />
    <Piece g={geo.poly("stab", [[0, 0], [0.9, 0.05], [0.95, 0.18], [0.1, 0.16]], 0.04, 0.05)} c="#c9d2dc" p={[2.4, 0.42, 0.12]} />
    <CanvasPlane texKey="fuselage" w={6} h={1.0} px={1200} transparent glowing={false} draw={drawFuselage} position={[0, 0.45, 0.0]} />
    {/* крыло и двигатель (скребёт по песку) */}
    <Piece g={geo.poly("wing", [[-0.9, 0], [0.9, 0], [1.6, -0.25], [0.2, -0.3]], 0.04, 0.05)} c="#b9c3cd" p={[-0.1, 0.25, 0.15]} />
    <Piece g={geo.rrect(0.9, 0.36, 0.17, 0.12)} c="#8e99a6" p={[0.35, 0.08, 0.25]} r={Math.sin(twos(t) * 30) * 0.03} />
    <Piece g={geo.ellipse(0.13, 0.15, 0.13)} c="#2b2b2b" p={[-0.08, 0.08, 0.26]} />
  </group>
);

export const Palm: React.FC<{ position: [number, number, number]; s?: number; t: number; lean?: number }> = ({ position, s = 1, t, lean = 0.1 }) => (
  <group position={position} scale={s}>
    <Piece g={geo.poly("trunk", [[-0.1, 0], [0.1, 0], [0.32, 2.4], [0.2, 2.45]], 0.03, 0.05)} c="#8a5a2b" r={-lean} />
    <group position={[0.27 - lean * 2.4, 2.45, 0.03]} rotation={[0, 0, noise1(twos(t) + position[0]) * 0.08]}>
      {[0, 1, 2, 3, 4].map((i) => (
        <Piece key={i} g={geo.poly("frond", [[0, 0], [0.5, 0.18], [1.1, 0.0], [0.5, 0.05]], 0.03, 0.04)} c={i % 2 ? "#2e8b3a" : "#3fa64a"} r={-0.4 + i * 0.85 + (i > 2 ? 0.6 : 0)} p={[0, 0, i * 0.01]} />
      ))}
    </group>
  </group>
);

/** пляж: самолёт скользит на брюхе. k — прогресс 0..1 по планy */
export const BeachSet: React.FC<{ t: number; t0: number; t1: number; S?: number }> = ({ t, t0, t1, S = 0.72 }) => {
  const dur = t1 - t0;
  const k = prog(t, t0, t1);
  const touch = 0.18; // доля времени до касания
  // траектория: снижение с наклоном, удар, скольжение с замедлением
  let x: number, y: number, rot: number;
  if (k < touch) { const q = k / touch; x = lerp(9, 4.2, q); y = lerp(2.6, 0, easeIn(q)); rot = lerp(0.12, 0.04, q); }
  else { const q = (k - touch) / (1 - touch); x = lerp(4.2, -1.4, easeOut(q)); y = Math.abs(Math.sin(q * 18)) * 0.08 * (1 - q); rot = noise1(t * 14) * 0.03 * (1 - q) + 0.02; }
  const sliding = k >= touch;
  const speed = sliding ? (1 - (k - touch) / (1 - touch)) : 1;
  const r = rng(Math.floor(t * 15));
  const sparks: React.ReactNode[] = [];
  if (sliding && speed > 0.08) for (let i = 0; i < 10; i++) {
    const sx = x + (0.9 + r() * 1.6) * S, sy = 0.05 + r() * 0.5 * speed * S;
    sparks.push(<Piece key={i} g={geo.poly("spark", [[0, 0], [0.22, 0.03], [0.0, 0.05]], 0, 0.01)} c="#ffd23f" m={glow(i % 3 ? "#ffd23f" : "#ff8a2a")} p={[sx, sy, 0.5]} r={0.3 + r() * 0.6} s={[S * 1.4, S * 1.4, 1]} />);
  }
  const puffs: React.ReactNode[] = [];
  if (sliding) for (let i = 0; i < 7; i++) {
    const age = ((twos(t) - t0) * 1.2 + i * 0.17) % 1.2;
    const px = x + (2.4 + i * 0.75 + age * 0.5) * S;
    puffs.push(<Puff key={i} position={[px, (0.25 + age * 0.6) * S, 0.35 - i * 0.05]} scale={(0.4 + age * 0.9) * (0.4 + speed * 0.7) * S} color={i % 2 ? "#e9d8a6" : "#d8c48c"} />);
  }
  // бегущие с пляжа отдыхающие (толпа инстансами — уже с консолями!)
  const fleeing: CrowdMember[] = [0, 1, 2, 3, 4, 5].map((i) => ({ x: -2.2 - i * 0.55 - (t - t0) * (1.3 + hash(i) * 0.5), z: 1.0 + hash(i + 4) * 1.4, s: 0.55, variant: 5 + i * 9, phase: i }));
  return (
    <group>
      <ambientLight intensity={1.2} />
      <directionalLight position={[3, 8, 6]} intensity={1.5} color="#fff6e0" />
      <hemisphereLight args={["#d9f0ff", "#bfa36a", 0.5]} />
      <CanvasPlane texKey="skyBeach" w={60} h={22} glowing={false} draw={drawSky("#6fb7e8", "#cfeaf7")} position={[0, 8, -14]} />
      <Cloud position={[-3, 6.5, -12]} s={1.6} />
      <Cloud position={[4, 8.2, -12]} s={1.2} />
      {/* море на горизонте */}
      <WaveStrip y={0.2} z={-9} color="#2f80c2" t={t} amp={0.05} w={60} />
      <WaveStrip y={0.0} z={-7} color="#3d98d6" t={t} amp={0.07} w={60} seed={1} speed={-0.5} />
      <WaveStrip y={-0.15} z={-5} color="#bfe4f2" t={t} amp={0.06} w={60} seed={2} speed={0.7} />
      {/* песок */}
      <Sheet w={60} h={20} color="#e6cf8f" rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.0, 4]} />
      {/* борозда за самолётом */}
      {sliding && <mesh position={[(x + 4.2) / 2 + 0.6, 0.012, 0.2]} rotation={[-Math.PI / 2, 0, 0]} material={paper("#a8884a")}><planeGeometry args={[Math.max(0.01, 4.2 - x + 1.0), 0.45]} /></mesh>}
      <Palm position={[-3.2, 0, -2.5]} t={t} s={1.1} lean={0.15} />
      <Palm position={[3.6, 0, -3.5]} t={t} s={1.3} lean={-0.12} />
      <Palm position={[-1.0, 0, -4.5]} t={t} s={0.9} />
      {/* зонтик и полотенце */}
      <group position={[-1.9, 0, 1.4]}>
        <mesh position={[0, 0.6, 0]} material={paper("#eee")}><cylinderGeometry args={[0.025, 0.025, 1.2, 6]} /></mesh>
        <Piece g={geo.arc(0.8, 0.35, 0, Math.PI, 0.04)} c="#e53935" p={[0, 1.2, 0]} />
        <Piece g={geo.arc(0.4, 0.35, 0, Math.PI, 0.045)} c="#fff" p={[0, 1.2, 0.01]} />
      </group>
      <Crowd members={fleeing} t={t} bounce={0.12} />
      <group position={[x, y, 0]} rotation={[0, 0, rot]} scale={S}>
        <Airliner t={t} />
      </group>
      {sparks}
      {puffs}
      {void dur}
    </group>
  );
};

// ---------- паром ----------
function drawFerry(g: CanvasRenderingContext2D, W: number, H: number) {
  g.clearRect(0, 0, W, H);
  g.fillStyle = "#c62828"; g.beginPath(); g.moveTo(0, H * 0.55); g.lineTo(W, H * 0.55); g.lineTo(W * 0.9, H); g.lineTo(W * 0.06, H); g.closePath(); g.fill();
  g.fillStyle = "#f4f4ef"; g.fillRect(W * 0.0, H * 0.48, W, H * 0.1);
  g.fillStyle = "#f4f4ef"; g.fillRect(W * 0.12, H * 0.2, W * 0.7, H * 0.3);
  g.fillStyle = "#2b3b4f"; for (let x = W * 0.15; x < W * 0.78; x += W * 0.05) g.fillRect(x, H * 0.27, W * 0.03, H * 0.08);
  g.fillStyle = "#f4f4ef"; g.fillRect(W * 0.3, H * 0.05, W * 0.3, H * 0.16);
  g.fillStyle = "#1f5fa8"; g.fillRect(W * 0.5, 0, W * 0.07, H * 0.12);
  g.font = `900 ${Math.floor(H * 0.11)}px ${FONT}`; g.fillStyle = "#fff"; g.textAlign = "center"; g.textBaseline = "middle";
  g.fillText("ПАРОМ «ПОСЛЕДНИЙ ШАНС»", W * 0.5, H * 0.73);
  g.fillStyle = "#ffd23f"; g.font = `900 ${Math.floor(H * 0.07)}px ${FONT}`; g.fillText("ВМЕСТИМОСТЬ: 300 ЧЕЛ.", W * 0.5, H * 0.88);
}
export const FerrySet: React.FC<{ t: number; t0: number; t1: number }> = ({ t, t0, t1 }) => {
  const k = prog(t, t0, t1);
  const sink = 0.35 + easeIn(k) * 0.6 + k * 0.3;
  const tilt = -(0.2 + k * 0.3) + Math.sin(twos(t) * 6) * 0.015; // корма (слева) уходит под воду
  // люди на пароме: плотная куча
  const r = rng(17);
  const deck: CrowdMember[] = [];
  for (let row = 0; row < 7; row++) for (let i = 0; i < 16 - row * 2; i++) {
    deck.push({ x: -2.6 + row * 0.18 + i * 0.34 + (r() - 0.5) * 0.1, y: 0.95 + row * 0.24, z: 0.12 + (r() - 0.5) * 0.06 + row * 0.01, s: 0.42, variant: Math.floor(r() * 64), phase: r() * 9 });
  }
  // падающие в воду
  const fall: CrowdMember[] = [];
  for (let i = 0; i < 9; i++) {
    const per = 0.9, off = hash(i) * per;
    const age = ((t - t0) + off) % per;
    const side = i % 2 ? 1 : -1;
    const x0 = side > 0 ? 1.4 + hash(i + 1) * 1.2 : -1.0;
    fall.push({ x: x0 + side * age * (1.0 + hash(i + 2)), y: (side > 0 ? 1.9 : 0.8) + 2.6 * age - 7 * age * age, z: 0.4 + hash(i + 7) * 0.5, s: 0.42, variant: (i * 13) % 64, rot: age * 8 * side, phase: i });
  }
  return (
    <group>
      <ambientLight intensity={1.15} />
      <directionalLight position={[-3, 7, 6]} intensity={1.4} color="#fff2dc" />
      <CanvasPlane texKey="skyFerry" w={60} h={22} glowing={false} draw={drawSky("#5d9fd0", "#bfe0f0")} position={[0, 8, -14]} />
      <Cloud position={[2.5, 5.5, -12]} s={1.4} />
      <WaveStrip y={-0.2} z={-6} color="#2f80c2" t={t} amp={0.08} w={60} />
      <group position={[0, -sink, 0]} rotation={[0, 0, tilt]}>
        <CanvasPlane texKey="ferry" w={6} h={2.0} px={900} transparent glowing={false} draw={drawFerry} position={[0, 0.4, 0]} />
        <Crowd members={deck} t={t} bounce={0.05} />
      </group>
      <Crowd members={fall.filter((m) => (m.y ?? 0) > -0.3)} t={t} bounce={0} />
      {/* всплески */}
      {[0, 1, 2, 3].map((i) => {
        const age = ((t - t0) * 1.3 + i * 0.27) % 1;
        return <group key={i} position={[(i % 2 ? 1 : -1) * (2.2 + i * 0.4), -0.1, 0.9]} scale={[0.5 + age, (1 - age) * 1.2 + 0.01, 1]}>
          {[-2, -1, 0, 1, 2].map((q) => <Piece key={q} g={geo.poly("spl", [[-0.05, 0], [0.05, 0], [0, 0.5]], 0.02, 0.02)} c="#e8f6ff" p={[q * 0.12, 0, 0]} r={-q * 0.3} />)}
        </group>;
      })}
      <WaveStrip y={-0.05} z={1.2} color="#3d98d6" t={t} amp={0.12} w={60} seed={1} speed={-0.6} />
      {/* барахтающиеся в воде с консолями */}
      <Crowd members={Array.from({ length: 14 }, (_, i) => ({ x: (hash(i + 30) - 0.5) * 6, y: -0.75 + Math.sin(t * 3 + i) * 0.05, z: 1.4 + hash(i + 40) * 1.6, s: 0.5, variant: (i * 7) % 64, phase: i }))} t={t} bounce={0.04} />
      <WaveStrip y={-0.55} z={1.9} color="#348ccc" t={t} amp={0.12} w={60} seed={3} speed={0.5} />
      <Crowd members={Array.from({ length: 10 }, (_, i) => ({ x: (hash(i + 60) - 0.5) * 5, y: -1.25 + Math.sin(t * 3 + i) * 0.05, z: 3.2 + hash(i + 70) * 1.2, s: 0.55, variant: (i * 11) % 64, phase: i }))} t={t} bounce={0.04} />
      <WaveStrip y={-1.05} z={3.4} color="#2a73b0" t={t} amp={0.14} w={60} seed={2} speed={0.8} />
      <WaveStrip y={-1.6} z={4.6} color="#1f5f99" t={t} amp={0.16} w={60} seed={5} speed={-0.7} />
      {/* спасательный круг */}
      <group position={[1.0, -1.15 + Math.sin(t * 3) * 0.04, 3.5]}>
        <mesh material={paper("#ff6f00")}><torusGeometry args={[0.2, 0.07, 8, 20]} /></mesh>
      </group>
    </group>
  );
};

// ---------- надувные матрасы ----------
const MAT_COLORS = ["#ff5fa2", "#ffd23f", "#4fc3f7", "#7cdc5c", "#ff8a3d", "#b388ff"];
export const Swimmer: React.FC<{ position: [number, number, number]; t: number; i: number; s?: number; hero?: boolean }> = ({ position, t, i, s = 1, hero }) => {
  const tq = twos(t);
  const paddle = Math.sin(tq * 9 + i) * 0.6;
  const bob = Math.sin(t * 2.4 + i) * 0.05;
  const looks: Partial<CharacterProps>[] = [
    { outfit: "hoodie", color: "#6b6f78", hat: "messyHair", hairColor: "#3a2414" },
    { outfit: "tshirt", color: "#27ae60", hat: "cap", hatColor: "#c62828" },
    { outfit: "tshirt", color: "#8e44ad", hat: "beanie", hatColor: "#f39c12" },
    { outfit: "hoodie", color: "#2c3e50", hat: "headset", hairColor: "#111" },
  ];
  const lk = looks[i % looks.length];
  return (
    <group position={[position[0], position[1] + bob, position[2]]} scale={s} rotation={[0, 0, Math.sin(t * 2 + i) * 0.05]}>
      {/* матрас */}
      <Piece g={geo.rrect(2.1, 0.26, 0.12, 0.3)} c={MAT_COLORS[i % MAT_COLORS.length]} p={[0, 0.1, 0]} />
      {[-0.6, -0.2, 0.2, 0.6].map((x) => <Piece key={x} g={geo.rrect(0.04, 0.2, 0.02, 0.31)} c="#ffffff" p={[x, 0.1, 0.005]} />)}
      {/* консоль, примотанная к матрасу */}
      <group position={[0.55, 0.62, -0.05]} rotation={[0, 0, -0.1]}><Gear kind={i} s={0.55} /></group>
      {/* лежит на животе и гребёт */}
      <group position={[-0.15, 0.3, 0.17]} rotation={[0, 0, Math.PI / 2 - 0.18]}>
        <Character {...lk} adult eyes={hero ? "crazy" : "wide"} mouth={hero ? "grin" : "scream"} mouthOpen={0.6} sweat={hero ? 1 : 0}
          armL={1.4 + paddle} armR={1.4 - paddle} legs="stand" shadow={false} />
      </group>
    </group>
  );
};

export const MattressSet: React.FC<{ t: number; t0: number }> = ({ t, t0 }) => {
  const dt = t - t0;
  const far: React.ReactNode[] = [];
  for (let i = 0; i < 14; i++) {
    const z = -9 - hash(i) * 5, x = (hash(i + 5) - 0.5) * (8 + -z * 1.4) - dt * 0.25;
    far.push(
      <group key={i} position={[x, -0.05, z]}>
        <Piece g={geo.rrect(1.2, 0.16, 0.08, 0.1)} c={MAT_COLORS[i % 6]} p={[0, 0.06, 0]} />
        <Piece g={geo.ellipse(0.16, 0.15, 0.05)} c="#f0caa3" p={[-0.45, 0.25, 0.02]} />
        <Piece g={geo.rrect(0.3, 0.36, 0.03, 0.05)} c={i % 2 ? "#f4f4f4" : "#1b1b1b"} p={[0.25, 0.3, -0.01]} />
      </group>,
    );
  }
  return (
    <group>
      <ambientLight intensity={1.2} />
      <directionalLight position={[3, 7, 6]} intensity={1.4} color="#fff2dc" />
      <hemisphereLight args={["#d9f0ff", "#2a73b0", 0.4]} />
      <CanvasPlane texKey="skyMat" w={70} h={24} glowing={false} draw={drawSky("#79bde9", "#e3f3fa")} position={[0, 8, -20]} />
      {/* берег Новой Зеландии вдали */}
      <Piece g={geo.poly("coast", [[-12, 0], [-6, 1.4], [-3, 1.1], [0, 2.0], [4, 1.3], [12, 0.6], [12, -1], [-12, -1]], 0.3, 0.05)} c="#4f9a48" p={[2, 0, -17]} />
      <CanvasPlane texKey="coastSign2" w={6} h={1.1} glowing={false} draw={(g, W, H) => {
        g.fillStyle = "#f7e9c9"; g.fillRect(0, 0, W, H); g.strokeStyle = "#1b1b1b"; g.lineWidth = 8; g.strokeRect(4, 4, W - 8, H - 8); g.font = `900 ${Math.floor(H * 0.42)}px ${FONT}`; g.fillStyle = "#1b1b1b"; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText("НОВАЯ ЗЕЛАНДИЯ →", W / 2, H / 2 + 2);
      }} position={[0, 3.3, -16.8]} />
      <WaveStrip y={0.0} z={-14} color="#2f80c2" t={t} amp={0.06} w={70} />
      {far}
      <WaveStrip y={-0.05} z={-2.2} color="#3d98d6" t={t} amp={0.1} w={50} seed={2} speed={0.5} />
      <Swimmer position={[-1.1 - dt * 0.1, -0.05, -6.0]} t={t} i={1} s={0.9} />
      <WaveStrip y={-0.08} z={-4.6} color="#3a92d2" t={t} amp={0.1} w={50} seed={6} speed={-0.4} />
      <Swimmer position={[1.25 - dt * 0.1, -0.05, -3.0]} t={t} i={2} s={0.85} />
      <WaveStrip y={-0.1} z={-1.6} color="#348ccc" t={t} amp={0.12} w={50} seed={3} speed={-0.6} />
      <Swimmer position={[-0.2 - dt * 0.12, -0.05, 0.4]} t={t} i={0} s={0.8} hero />
      <WaveStrip y={-0.12} z={1.3} color="#2a73b0" t={t} amp={0.14} w={50} seed={4} speed={0.8} />
    </group>
  );
};

// ---------- овца ----------
export const Sheep: React.FC<{ position: [number, number, number]; t: number; s?: number; flip?: boolean; eyes?: "wide" | "normal" | "sad"; baa?: number; rot?: number }> = ({ position, t, s = 1, flip, eyes = "normal", baa = 0, rot = 0 }) => {
  const legSw = Math.sin(twos(t) * 14) * 0.0;
  return (
    <group position={position} scale={[flip ? -s : s, s, s]} rotation={[0, 0, rot]}>
      {[-0.28, -0.12, 0.14, 0.3].map((x, i) => <Piece key={i} g={geo.rrect(0.09, 0.32, 0.03, 0.04)} c="#2b2b2b" p={[x, 0.16, -0.02]} r={i % 2 ? legSw : -legSw} />)}
      {[[0, 0.55, 0.42, 0.28], [-0.3, 0.6, 0.2, 0.2], [0.3, 0.62, 0.2, 0.2], [-0.15, 0.78, 0.2, 0.17], [0.15, 0.8, 0.22, 0.17], [0.0, 0.4, 0.3, 0.15], [-0.38, 0.45, 0.14, 0.14]].map(([x, y, rx, ry], i) => (
        <Piece key={i} g={geo.ellipse(rx, ry, 0.05)} c={i % 2 ? "#f6f3ea" : "#ffffff"} p={[x, y, i * 0.008]} />
      ))}
      <group position={[0.48, 0.7, 0.08]}>
        <Piece g={geo.ellipse(0.17, 0.22, 0.05)} c="#2b2b2b" />
        <Piece g={geo.ellipse(0.12, 0.05, 0.04)} c="#2b2b2b" p={[0.14, 0.12, -0.01]} r={-0.4} />
        <Piece g={geo.ellipse(0.12, 0.05, 0.04)} c="#2b2b2b" p={[-0.15, 0.12, -0.01]} r={0.4} />
        {[-0.07, 0.07].map((x, i) => (
          <group key={i} position={[x, 0.05, 0.03]}>
            <Piece g={geo.ellipse(eyes === "wide" ? 0.065 : 0.055, eyes === "wide" ? 0.075 : 0.06, 0.02)} c="#fff" />
            <Piece g={geo.ellipse(0.02, 0.02, 0.025)} c="#111" p={[0.01, eyes === "sad" ? -0.02 : 0, 0.01]} />
          </group>
        ))}
        {baa > 0 ? <Piece g={geo.ellipse(0.05, 0.03 + baa * 0.05, 0.02)} c="#7a1a1a" p={[0, -0.12, 0.03]} /> : <Piece g={geo.rrect(0.08, 0.015, 0.005, 0.02)} c="#111" p={[0, -0.12, 0.03]} />}
        <Piece g={geo.ellipse(0.13, 0.08, 0.05)} c="#ffffff" p={[0, 0.2, 0.02]} />
      </group>
    </group>
  );
};

// ---------- сарай ----------
function drawPlanks(base: string, seed: number, sign?: string, signY = 0.06) {
  return (g: CanvasRenderingContext2D, W: number, H: number) => {
    const r = rng(seed);
    const n = 12;
    for (let i = 0; i < n; i++) {
      const c = 0.85 + r() * 0.2;
      g.fillStyle = base; g.fillRect((i * W) / n, 0, W / n, H);
      g.fillStyle = `rgba(0,0,0,${0.08 + r() * 0.12})`; g.fillRect((i * W) / n, 0, W / n, H);
      g.fillStyle = "rgba(0,0,0,0.35)"; g.fillRect((i * W) / n, 0, 4, H);
      g.fillStyle = "rgba(255,255,255,0.06)"; g.fillRect((i * W) / n + 6, 0, 3, H * c);
      for (let k = 0; k < 2; k++) { g.fillStyle = "rgba(40,20,10,0.5)"; g.beginPath(); g.arc((i + 0.5) * (W / n), r() * H, 5, 0, 7); g.fill(); }
    }
    if (sign) {
      g.fillStyle = "#f7e9c9"; g.fillRect(W * 0.3, H * signY, W * 0.4, H * 0.1);
      g.font = `900 ${Math.floor(H * 0.055)}px ${FONT}`; g.fillStyle = "#1b1b1b"; g.textAlign = "center"; g.textBaseline = "middle";
      g.fillText(sign, W / 2, H * (signY + 0.055));
    }
  };
}
export const MEN_LOOKS: Partial<CharacterProps>[] = [
  { outfit: "hoodie", color: "#6b6f78", color2: "#283a5e", hat: "messyHair", hairColor: "#3a2414", stubble: true },
  { outfit: "tshirt", color: "#c0392b", color2: "#2c3e66", hat: "cap", hatColor: "#111", stubble: true },
  { outfit: "tshirt", color: "#16a085", color2: "#34495e", hat: "beanie", hatColor: "#8e44ad" },
  { outfit: "hoodie", color: "#2c3e50", color2: "#1e272e", hat: "headset", hairColor: "#111", stubble: true },
  { outfit: "tshirt", color: "#f39c12", color2: "#3c3c3c", hat: "curly", hairColor: "#111" },
  { outfit: "hoodie", color: "#8e44ad", color2: "#2c3e50", hat: "slickHair", hairColor: "#6b4226", stubble: true },
  { outfit: "tshirt", color: "#7f8c8d", color2: "#2c3e66", hat: "messyHair", hairColor: "#c9a227" },
];
export const Man: React.FC<{ i: number; position: [number, number, number]; t: number; s?: number; extra?: Partial<CharacterProps> }> = ({ i, position, t, s = 1, extra }) => {
  const tq = twos(t);
  const lk = MEN_LOOKS[i % MEN_LOOKS.length];
  return (
    <Character {...lk} adult scale={s} position={position} sweat={1} eyes={i % 3 === 0 ? "crazy" : i % 3 === 1 ? "wide" : "squint"} mouth={i % 2 ? "grin" : "talk"} mouthOpen={0.4 + 0.4 * Math.abs(Math.sin(tq * 7 + i))}
      armL={0.3 + Math.abs(Math.sin(tq * 5 + i)) * 0.4} armR={0.3 + Math.abs(Math.cos(tq * 5 + i)) * 0.4}
      back={<group position={[0, 0.05, 0]}><Gear kind={i} s={0.8} /></group>} {...extra} />
  );
};

export const BarnInterior: React.FC<{ t: number; men: number; sheep?: boolean; lying?: boolean; board?: boolean; sign?: boolean }> = ({ t, men, sheep = true, lying, board = true, sign = false }) => {
  // ряды мужиков за овцой, каждый на своей глубине (без взаимопроникновения)
  const rows: [number, number[]][] = [[0.1, [-1.55, 1.0]], [-0.55, [-1.05, 0.05, 1.1]], [-1.15, [-1.6, -0.5, 0.55, 1.6]], [-1.75, [-1.05, 0.05, 1.1]], [-2.35, [-1.6, -0.5, 0.55, 1.6]]];
  const spots: [number, number, number][] = [];
  rows.forEach(([z, xs], ri) => xs.forEach((x, j) => spots.push([x, 0, z - j * 0.035 - ri * 0.01])));
  return (
    <group>
      <ambientLight intensity={1.05} color="#ffe9c4" />
      <directionalLight position={[2, 6, 6]} intensity={1.2} color="#ffe2b0" />
      <pointLight position={[0, 3, 1]} intensity={3} distance={8} color="#ffcf80" />
      <CanvasPlane texKey={sign ? "barnBackSign" : "barnBack"} w={10} h={5} px={1024} glowing={false} draw={drawPlanks("#8b3a24", 4, sign ? "СТОЙЛО №3 · ОВЦЫ" : undefined, 0.4)} position={[0, 2.5, -3.6]} />
      <CanvasPlane texKey="barnL" w={10} h={5} px={1024} glowing={false} draw={drawPlanks("#7a3220", 5)} position={[-3.6, 2.5, 0]} rotation={[0, Math.PI / 2, 0]} />
      <CanvasPlane texKey="barnR" w={10} h={5} px={1024} glowing={false} draw={drawPlanks("#7a3220", 6)} position={[3.6, 2.5, 0]} rotation={[0, -Math.PI / 2, 0]} />
      <Sheet w={10} h={12} color="#d9b65a" rotation={[-Math.PI / 2, 0, 0]} />
      {/* соломинки */}
      {Array.from({ length: 40 }, (_, i) => <Piece key={i} g={geo.rrect(0.22, 0.02, 0.01, 0.01)} c={i % 2 ? "#f0d27a" : "#b8923a"} p={[(hash(i) - 0.5) * 6, 0.01, (hash(i + 50) - 0.5) * 6]} r={hash(i + 9) * 3} />)}
      {/* перегородки стойл */}
      {[-2.4, 2.4].map((x, i) => <group key={i} position={[x, 0, -1.5]}>
        <Piece g={geo.rrect(0.14, 1.3, 0.02, 0.1)} c="#5a3b26" p={[0, 0.65, 0]} />
        <Piece g={geo.rrect(1.3, 0.12, 0.02, 0.1)} c="#6b4630" p={[i ? 0.6 : -0.6, 1.0, 0]} />
        <Piece g={geo.rrect(1.3, 0.12, 0.02, 0.1)} c="#6b4630" p={[i ? 0.6 : -0.6, 0.5, 0]} />
      </group>)}
      {/* тюки сена */}
      <Piece g={geo.rrect(1.1, 0.6, 0.06, 0.6)} c="#e3bf55" p={[-2.6, 0.3, -2.9]} />
      <Piece g={geo.rrect(1.1, 0.6, 0.06, 0.6)} c="#d8b24a" p={[-2.3, 0.9, -3.0]} />
      {/* табличка-грамота на стене */}
      {board && <CanvasPlane texKey="barnRatio" w={1.5} h={0.8} glowing={false} draw={(g, W, H) => {
        g.fillStyle = "#1f2a24"; g.fillRect(0, 0, W, H); g.strokeStyle = "#8a6a3a"; g.lineWidth = 14; g.strokeRect(0, 0, W, H);
        g.font = `900 ${Math.floor(H * 0.3)}px ${FONT}`; g.fillStyle = "#f4f4f4"; g.textAlign = "center"; g.textBaseline = "middle";
        g.fillText("1 ОВЦА = 15", W / 2, H * 0.36); g.font = `800 ${Math.floor(H * 0.17)}px ${FONT}`; g.fillText("ПОТНЫХ МУЖИКОВ", W / 2, H * 0.72);
      }} position={[0.3, 2.65, -3.55]} />}
      {/* лампа */}
      <group position={[0, 3.3, -0.6]} rotation={[0, 0, Math.sin(t * 1.8) * 0.12]}>
        <mesh position={[0, 0.4, 0]} material={paper("#111")}><boxGeometry args={[0.02, 0.8, 0.02]} /></mesh>
        <Piece g={geo.arc(0.3, 0.2, 0, Math.PI, 0.05)} c="#333" />
        <Piece g={geo.ellipse(0.08, 0.07, 0.04)} c="#fff" m={glow("#fff1b0")} p={[0, -0.03, 0.03]} />
      </group>
      {lying && <>
        <pointLight position={[0, 1.2, 2]} intensity={4} distance={6} color="#7fd0ff" />
        {[-1.6, 0, 1.6].map((x, i) => <group key={i} position={[x, 0, 1.3]}>
          <Piece g={geo.rrect(0.9, 0.5, 0.05, 0.5)} c="#d8b24a" p={[0, 0.25, 0]} />
          <group position={[0, 0.85, 0]} rotation={[0, Math.PI, 0]}><Gear kind={2} s={0.9} /></group>
          <mesh position={[0, 0.85, 0.03]} rotation={[0, Math.PI, 0]} material={glow(i % 2 ? "#7fd0ff" : "#ff7fd8", 0.9)}><planeGeometry args={[0.75, 0.42]} /></mesh>
        </group>)}
      </>}
      {sheep && <Sheep position={[-0.35, 0, 0.35]} t={t} s={1.1} eyes="wide" />}
      {spots.slice(0, men).map((p, i) => (
        <Man key={i} i={i} t={t} position={p} extra={lying ? { legs: "sit", position: [p[0], 0.0, p[2]], eyes: "tiny", mouth: i % 2 ? "grin" : "o", armL: 1.1, armR: 1.1, handR: <group position={[-0.05, 0.05, 0.1]}><Pad /></group> } : undefined} />
      ))}
    </group>
  );
};

/** сарай снаружи: из ворот вылетают овцы, внутрь ломятся мужики */
export const BarnExterior: React.FC<{ t: number; t0: number }> = ({ t, t0 }) => {
  const dt = t - t0;
  const flying: React.ReactNode[] = [];
  for (let i = 0; i < 7; i++) {
    const per = 1.4, off = i * 0.2;
    const age = dt - off;
    if (age < 0 || age > per) continue;
    const dir = i % 2 ? 1 : -1;
    const x = dir * (0.2 + age * (1.1 + (i % 3) * 0.3)), y = 1.0 + 6.0 * age - 4.9 * age * age, z = 0.3 + age * 1.0;
    flying.push(<Sheep key={i} position={[x, Math.max(-0.2, y), z]} t={t} s={0.75} flip={dir < 0} eyes="wide" baa={1} rot={age * 6 * dir} />);
  }
  const queue: [number, number, number][] = [[-1.35, 0, 0.55], [1.4, 0, 0.65]];
  return (
    <group>
      <ambientLight intensity={1.15} />
      <directionalLight position={[3, 8, 6]} intensity={1.4} color="#fff3dc" />
      <hemisphereLight args={["#d9f0ff", "#7a9a4a", 0.5]} />
      <CanvasPlane texKey="skyFarm" w={50} h={20} glowing={false} draw={drawSky("#78b8e6", "#d9eef7")} position={[0, 7, -12]} />
      <Piece g={geo.poly("hills", [[-14, 0], [-8, 2.2], [-3, 1.4], [2, 2.8], [8, 1.6], [14, 2.4], [14, -1], [-14, -1]], 0.4, 0.05)} c="#6fb05a" p={[0, 0, -10]} />
      <Sheet w={40} h={20} color="#7cbc5a" rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 2]} />
      {/* сарай */}
      <group position={[0, 0, -1.2]}>
        <CanvasPlane texKey="barnFront" w={5.2} h={3.4} px={768} glowing={false} draw={drawPlanks("#a8402a", 8)} position={[0, 1.7, 0]} />
        <Piece g={geo.poly("roof", [[-3.0, 0], [3.0, 0], [0, 1.7]], 0.05, 0.08)} c="#5b2a1a" p={[0, 3.3, 0.02]} />
        <Piece g={geo.poly("roofIn", [[-2.4, 0], [2.4, 0], [0, 1.3]], 0.05, 0.08)} c="#a8402a" p={[0, 3.35, 0.05]} />
        <CanvasPlane texKey="barnFarm" w={1.1} h={0.45} glowing={false} draw={(g, W, H) => {
          g.fillStyle = "#f4f4ef"; g.fillRect(0, 0, W, H); g.font = `900 ${Math.floor(H * 0.55)}px ${FONT}`; g.fillStyle = "#5b2a1a"; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText("ФЕРМА", W / 2, H / 2 + 2);
        }} position={[0, 3.95, 0.12]} />
        <Piece g={geo.rrect(2.2, 2.4, 0.02, 0.02)} c="#1a0f0a" p={[0, 1.2, 0.03]} />
        {/* распахнутые створки */}
        {[-1, 1].map((sd) => <group key={sd} position={[sd * 1.1, 0, 0.05]} rotation={[0, sd * -1.1, 0]}>
          <Piece g={geo.rrect(1.1, 2.4, 0.02, 0.06)} c="#c9563a" p={[sd * 0.55, 1.2, 0]} />
          <Piece g={geo.rrect(1.0, 0.12, 0.0, 0.07)} c="#f4f4ef" p={[sd * 0.55, 1.2, 0]} r={sd * 1.1} />
        </group>)}
        <CanvasPlane texKey="barnSign2" w={1.6} h={0.36} glowing={false} draw={(g, W, H) => {
          g.fillStyle = "#f7e9c9"; g.fillRect(0, 0, W, H); g.font = `900 ${Math.floor(H * 0.55)}px ${FONT}`; g.fillStyle = "#b71c1c"; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText("ЗАНЯТО", W / 2, H / 2 + 2);
        }} position={[0, 2.65, 0.1]} />
      </group>
      {queue.map((p, i) => <Man key={i} i={i + 2} t={t} position={[p[0], 0, p[2] - 0.8]} s={0.95} extra={{ armL: i % 2 ? 1.5 : 0.4, armR: i % 2 ? 0.4 : 1.6, bodyTilt: i % 2 ? 0.08 : -0.08 }} />)}
      {flying}
    </group>
  );
};

export { easeInOut, clamp01 };
