import React, { useMemo } from "react";
import * as THREE from "three";
import { ThreeCanvas } from "@remotion/three";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { AssetsProvider, useAssets, normalizeManifest } from "./engine/assets";
import { AudioLayers, AudioAvail } from "./engine/audio";
import { CAM_Z, DepthGroup, FOV, SceneCamera, addShake, impactShake, sampleCamera } from "./engine/camera";
import { PaperPuppet } from "./engine/PaperPuppet";
import { Sprite } from "./engine/Sprite";
import { clamp, easeOut, eyeTick, hash, hold, holdKeys, jerkWalk, jitter, mix, remap, track2 } from "./engine/motion";
import { Pose, pose } from "./engine/types";
import * as S from "./data/scene1";

export type Scene1Props = {
  manifest: unknown;
  audio: AudioAvail;
};

// ---------- Позы Грега ----------
const BASE = (extra: Partial<Pose> = {}) => pose({ x: 0, y: 0, ...extra });

export const gregPose = (frame: number): Pose => {
  const f = hold(frame);
  const base = BASE({ scale: S.GREG_SCALE, seed: 3 });
  if (frame < S.HIT_FRAME) {
    // рваная ходьба: корпус смещается на двойках, ноги - жёсткие шарниры
    const x = S.gregWalkX(f);
    return mix(base, { x, y: S.GROUND }, jerkWalk(frame), eyeTick(frame, 5, 34));
  }
  if (frame < S.LAND_FRAME) {
    // позы-холды: положение и поза держатся, каждые 4 кадра внутри позы - жёсткая перестановка конечностей (alt)
    const k = holdKeys(frame, S.FLIGHT_KEYS) ?? S.FLIGHT_KEYS[0];
    const { f: kf, alt, ...patch } = k;
    const odd = Math.floor((frame - kf) / 4) % 2 === 1;
    const fp = S.flightPos(frame);
    return mix(base, { x: fp.x + (odd ? 4 : 0), y: fp.cy + (odd ? 6 : 0) - S.CENTER_Y_PX * S.GREG_SCALE }, { ...patch, ...(odd && alt ? alt : {}) });
  }
  const k = holdKeys(frame, S.GREG_GROUND_KEYS) ?? S.GREG_GROUND_KEYS[0];
  const { f: _f, ...patch } = k;
  void _f;
  let p = mix(base, { x: S.LAND_X }, patch);
  if (frame >= S.LAND_FRAME + 12 && frame < S.RISE_FROM + 4) {
    // лежит не статично: мелкая дрожь на двойках (голова, рука, ноги, корпус)
    const j = (seed: number, amp: number) => jitter(frame, seed, 2) * amp;
    p = mix(p, { head: j(1, 3), armL: j(2, 5), legL: j(3, 4), legR: j(4, 4), rot: j(5, 1.2), y: j(6, 2) });
  }
  if (frame >= S.GREG_TICK.from) p = mix(p, eyeTick(frame, S.GREG_TICK.seed, S.GREG_TICK.every));
  if (frame >= S.GREG_LINE.from && frame < S.GREG_LINE.to) {
    const k0 = frame - S.GREG_LINE.from;
    const e = Math.max(S.VOICE_ENV[hold(k0)] ?? 0, S.VOICE_ENV[hold(k0) + 1] ?? 0);
    // рот по слогам: 3 спрайта (закрыт / «о» / широкий «а»)
    p = mix(p, { mouth: e > 0.5 ? "a" : e > 0.12 ? "o" : "closed", head: e > 0.5 ? 3 : e > 0.25 ? -1.5 : 0, headDy: e > 0.5 ? -3 : 0 });
  }
  if (frame >= 604) {
    // шепчет, глядя в небо: тело не статично, жёсткие покачивания каждые 6 кадров
    const w = S.WHISPER_SWAY[Math.floor((frame - 604) / 6) % S.WHISPER_SWAY.length];
    p = mix(p, { torso: w[0], head: w[1], armL: w[2], headDx: w[3] });
  }
  return p;
};

// ---------- Суперкар ----------
interface CarSt {
  on: boolean;
  x: number;
  y: number;
  flip: boolean;
  fast: boolean;
  front: boolean;
  smoke: boolean;
}
const carState = (frame: number): CarSt => {
  const f = hold(frame);
  const seg = S.CAR_SEGS.find((s) => f >= s.from && f <= s.to);
  if (!seg) return { on: false, x: 0, y: 0, flip: false, fast: false, front: false, smoke: false };
  const x = remap(f, seg.keys);
  const dx = Math.abs(remap(f + 2, seg.keys) - x);
  const fast = dx > 60;
  return { on: true, x, y: seg.y, flip: seg.flip, fast, front: seg.y < S.GROUND - 60, smoke: dx > 36 || (f > 186 && f < 296 && dx > 3) };
};

const bikeXY = (f: number): [number, number] => {
  const [x, y] = track2(f, S.BIKE_KEYS);
  const hf = hold(f);
  return [x + (Math.floor(hf / 6) % 2 ? 4 : -4), y + (hf % 8 < 4 ? 6 : -6)];
};

// ---------- Простые плоские примитивы ----------
const Disc: React.FC<{ x: number; y: number; r: number; color: string; opacity?: number; order?: number }> = ({ x, y, r, color, opacity = 1, order = 480 }) => (
  <mesh position={[x, y, 0]} scale={[r * 2, r * 2, 1]} renderOrder={order}>
    <circleGeometry args={[0.5, 28]} />
    <meshBasicMaterial color={color} transparent opacity={opacity} depthTest={false} depthWrite={false} toneMapped={false} />
  </mesh>
);
const Bar: React.FC<{ x: number; y: number; w: number; h: number; color: string; opacity?: number; order?: number }> = ({ x, y, w, h, color, opacity = 1, order = 480 }) => (
  <mesh position={[x, y, 0]} scale={[w, h, 1]} renderOrder={order}>
    <planeGeometry args={[1, 1]} />
    <meshBasicMaterial color={color} transparent opacity={opacity} depthTest={false} depthWrite={false} toneMapped={false} />
  </mesh>
);

// ---------- Билборд ----------
const billboardH = (a?: { texW: number; texH: number }) => (a ? (S.BILLBOARD.w * a.texH) / a.texW : (S.BILLBOARD.w * 640) / 1000);
const useBillboardTex = (screen: [number, number, number, number]) => {
  return useMemo(() => {
    void screen;
    const W = 1280;
    const H = 720;
    const draw = (kind: "a" | "g1" | "g2" | "b" | "flash") => {
      const c = document.createElement("canvas");
      c.width = W;
      c.height = H;
      const g = c.getContext("2d")!;
      g.fillStyle = kind === "flash" ? "#fff" : "#07070b";
      g.fillRect(0, 0, W, H);
      if (kind === "flash") {
        const t = new THREE.CanvasTexture(c);
        t.colorSpace = THREE.SRGBColorSpace;
        return t;
      }
      const time = kind === "b" ? S.BILLBOARD.time1 : S.BILLBOARD.time0;
      g.textAlign = "center";
      g.font = "bold 340px 'Courier New', monospace";
      g.fillStyle = kind === "b" ? "#ff3b30" : "#ff8a1c";
      g.fillText(time, W / 2, 380);
      g.font = "bold 120px 'Arial Black', sans-serif";
      g.fillStyle = "#ffe9b0";
      g.fillText(S.BILLBOARD.date, W / 2, 580);
      g.fillStyle = "#ff3b30";
      g.fillRect(70, 70, 16, 16);
      if (kind === "g1" || kind === "g2") {
        const src = g.getImageData(0, 0, W, H);
        g.fillStyle = "#07070b";
        g.fillRect(0, 0, W, H);
        let y = 0;
        let i = 0;
        while (y < H) {
          const hh = 30 + ((i * 53 + (kind === "g1" ? 7 : 31)) % 90);
          const dx = ((i * 97 + (kind === "g1" ? 13 : 59)) % 160) - 80;
          g.putImageData(src, dx, 0, 0, y, W, hh);
          y += hh;
          i++;
        }
        g.fillStyle = "rgba(39,229,255,0.5)";
        g.fillRect(0, 120 + (kind === "g1" ? 0 : 200), W, 26);
      }
      const t = new THREE.CanvasTexture(c);
      t.colorSpace = THREE.SRGBColorSpace;
      return t;
    };
    return { a: draw("a"), g1: draw("g1"), g2: draw("g2"), b: draw("b"), flash: draw("flash") };
  }, [screen]);
};

const BillboardScreen: React.FC<{ frame: number }> = ({ frame }) => {
  const assets = useAssets();
  const B = S.BILLBOARD;
  const a = assets.get(B.asset);
  const bh = billboardH(a);
  let sc: [number, number, number, number] = [0.052, 0.081, 0.896, 0.603];
  if (a?.screen) sc = [a.screen[0] / a.texW, a.screen[1] / a.texH, a.screen[2] / a.texW, a.screen[3] / a.texH];
  const tex = useBillboardTex(sc);
  let which: keyof typeof tex = "a";
  if (frame >= B.flipAt) which = "b";
  else if (frame >= B.glitchFrom) which = Math.floor(hold(frame) / 2) % 2 ? "g1" : "g2";
  const cx = B.x - B.w / 2 + (sc[0] + sc[2] / 2) * B.w;
  const cy = B.y + bh / 2 - (sc[1] + sc[3] / 2) * bh;
  return (
    <mesh position={[cx, cy, 0]} scale={[sc[2] * B.w, sc[3] * bh, 1]} renderOrder={-790}>
      <planeGeometry args={[1, 1]} />
      <meshBasicMaterial map={tex[which]} transparent depthTest={false} depthWrite={false} toneMapped={false} />
    </mesh>
  );
};

// ---------- Актёры ----------
const AlienDriver: React.FC<{ shk: number; front: boolean }> = ({ shk, front }) => {
  const assets = useAssets();
  if (assets.isReal("alien_driver")) {
    return <Sprite assetKey="alien_driver" h={S.ALIEN_H} x={S.ALIEN_AT[0]} y={S.ALIEN_AT[1] + shk} order={front ? 460 : 230} seed={9} />;
  }
  const ap = pose({ x: S.ALIEN_AT[0], y: S.ALIEN_AT[1] - 90 + shk, scale: 1, armL: 75, armR: 70, seed: 9 });
  return <PaperPuppet char="alien" pose={ap} order={200} />;
};

const Car: React.FC<{ frame: number }> = ({ frame }) => {
  const f = hold(frame);
  if (f >= S.VANISH_FRAME) return null;
  const st = carState(frame);
  if (!st.on) return null;
  const dir = st.flip ? -1 : 1;
  const odd = Math.floor(f / 2) % 2;
  const braking = f > 236 && f < 290;
  const wob = st.fast ? (odd ? 4 : 0) : 0;
  const rot = st.fast ? (odd ? -1.2 : 0.8) : braking ? (odd ? -2.4 : -1) : 0;
  const shk = st.fast ? (odd ? 3 : -2) : 0;
  return (
    <group position={[st.x, st.y + wob, 0]} rotation={[0, 0, (rot * Math.PI) / 180]} scale={[dir, 1, 1]}>
      <Sprite assetKey="car" w={S.CAR_W} order={st.front ? 450 : 220} seed={4} />
      <AlienDriver shk={shk} front={st.front} />
    </group>
  );
};

/** Дымок из-под колёс (непрозрачные плоские круги) и линии скорости */
const CarFx: React.FC<{ frame: number }> = ({ frame }) => {
  const f = hold(frame);
  if (f >= S.VANISH_FRAME) return null;
  const out: React.ReactNode[] = [];
  for (let i = 0; i < 5; i++) {
    const k = f - 2 * i;
    const st = carState(k);
    if (!st.on || !st.smoke) continue;
    const dir = st.flip ? -1 : 1;
    out.push(
      <Sprite key={`p${i}`} assetKey="fx_puff" w={60 + i * 12} x={st.x - dir * (400 + i * 20)} y={st.y + 20 + i * 7} order={st.front ? 445 : 215} />,
    );
  }
  const now = carState(f);
  if (now.on && now.fast) {
    const dir = now.flip ? -1 : 1;
    for (let i = 0; i < 2; i++) {
      out.push(<Bar key={`s${i}`} x={now.x - dir * (560 + i * 80)} y={now.y + 70 + i * 50} w={420 - i * 40} h={8} color="#f4f0ff" order={now.front ? 449 : 219} />);
    }
  }
  return <>{out}</>;
};

const Bike: React.FC<{ frame: number }> = ({ frame }) => {
  const f = hold(frame);
  if (f >= S.VANISH_FRAME) return null;
  const [x, y] = bikeXY(f);
  const [x2] = bikeXY(f + 2);
  const tilt = clamp((x2 - x) / 40, -1, 1) * -6 + (Math.floor(f / 2) % 2 ? 1.5 : -1.5);
  return <Sprite assetKey="bike" w={S.BIKE_W} x={x} y={y} rotation={tilt} order={250} seed={6} />;
};

const BK = S.BIKE_W / 660;
/** Ракеты: 2 позы пламени, покачивание, шлейф непрозрачных кругов; взрыв-звезда, обломки, дым кругами */
const Rockets: React.FC<{ frame: number }> = ({ frame }) => {
  const f = hold(frame);
  const out: React.ReactNode[] = [];
  S.ROCKETS.forEach((R, i) => {
    const d = f - R.f;
    if (d < 0 || d > S.ROCKET_DUR + 16) return;
    const [bx, by] = bikeXY(R.f);
    const sx = bx + 160 * BK;
    const sy = by - 82 * BK;
    const { tx, ty } = R;
    const ang = (Math.atan2(ty - sy, tx - sx) * 180) / Math.PI;
    if (d <= S.ROCKET_DUR) {
      const at = (t: number) => [sx + (tx - sx) * t, sy + (ty - sy) * t] as const;
      const t = d / S.ROCKET_DUR;
      const [x, y] = at(t);
      const alt = Math.floor(d / 2) % 2;
      for (let j = 1; j <= 4; j++) {
        const [px, py] = at(Math.max(0, t - 0.085 * j));
        out.push(<Sprite key={`t${i}_${j}`} assetKey="fx_puff_white" w={44 + j * 16} x={px - 70} y={py + 4 + j * 3} order={299 - j} />);
      }
      out.push(
        <group key={`r${i}`} position={[x, y, 0]} rotation={[0, 0, ((ang + (alt ? 5 : -5)) * Math.PI) / 180]}>
          <Sprite assetKey={alt ? "prop_rocket_b" : "rocket"} w={S.ROCKET_W} order={300} />
        </group>,
      );
      return;
    }
    const k = d - S.ROCKET_DUR; // кадров после взрыва
    const key = (n: string) => `${n}${i}`;
    if (k < 8) out.push(<Sprite key={key("b")} assetKey="fx_boom" w={260 + Math.min(k, 6) * 32} x={tx} y={ty + 40} rotation={i * 40 + k * 9} order={305} />);
    if (k < 10) out.push(<Sprite key={key("x")} assetKey="fx_debris" w={340 + k * 20} x={tx + k * 12} y={ty + 60 + k * 9} rotation={k * 6} order={304} />);
    if (k >= 2 && k < 16) {
      const a = k - 2;
      [-1, 0, 1].forEach((jx) => out.push(<Sprite key={`${key("s")}_${jx}`} assetKey="fx_puff_dark" w={90 + a * 7} x={tx + jx * 46 + a * 4} y={ty + 70 + a * 16 + Math.abs(jx) * 14} order={303} />));
    }
  });
  return <>{out}</>;
};

/** Горящие урны (2 фазы пламени) и столбы дыма кругами - второй план */
const Trashfires: React.FC<{ frame: number }> = ({ frame }) => {
  if (frame >= S.VANISH_FRAME) return null;
  const f = hold(frame);
  const out: React.ReactNode[] = [];
  S.TRASHFIRES.forEach(([from, x], i) => {
    if (f < from) return;
    out.push(<Sprite key={`f${i}`} assetKey={Math.floor(f / 2) % 2 ? "fx_trashfire_b" : "fx_trashfire"} h={240} x={x} y={S.GROUND - 28} order={210} />);
    for (let j = 0; j < 3; j++) {
      const a = (Math.floor(f / 2) + j * 2 + i * 3) % 6; // возраст клуба 0..5, потом он «схлопывается» в начало
      out.push(<Sprite key={`s${i}_${j}`} assetKey="fx_puff_dark" w={46 + a * 11} x={x + 20 + a * 7 + (a % 2 ? 6 : -6)} y={S.GROUND + 140 + a * 24} order={205} />);
    }
  });
  return <>{out}</>;
};

/** Летящий по ветру мусор: бумажки кувыркаются на двойках (второй план) */
const Trash: React.FC<{ frame: number }> = ({ frame }) => {
  if (frame >= S.VANISH_FRAME) return null;
  const f = hold(frame);
  const bob = [0, 14, 22, 14, 0, -14, -22, -14];
  return (
    <>
      {S.TRASH.map((T, i) => {
        const x = ((T.ph + T.v * f) % 2800) - 1400 + S.CX;
        const y = T.y + bob[(Math.floor(f / 2) + i * 3) % 8];
        const rot = (Math.floor(f / 2) * 38 + i * 50) % 360;
        return <Sprite key={i} assetKey={T.a} w={T.w} x={x} y={y} rotation={rot} order={T.front ? 455 : 262} />;
      })}
    </>
  );
};

const Tooth: React.FC<{ frame: number }> = ({ frame }) => {
  const T = S.GREG_SPIT;
  if (frame < T.f) return null;
  const f = hold(frame);
  const t = clamp((f - T.f) / T.life);
  const x = T.from[0] + (T.to[0] - T.from[0]) * t;
  let y = T.from[1] + (T.to[1] - T.from[1]) * t + T.arc * 4 * t * (1 - t);
  // подпрыгивает на асфальте
  const after = f - (T.f + T.life);
  if (after >= 0 && after < 6) y += [0, 18, 0, 8, 0, 0][after] ?? 0;
  // вылетает маленьким изо рта и «вырастает» (ближе к камере)
  const sc = t < 1 ? 0.3 + 0.7 * t : 1;
  return <Sprite assetKey="fx_tooth" w={S.TOOTH_W} x={x} y={y} rotation={t < 1 ? t * 720 : 25} scale={sc} order={460} />;
};

/** Эффекты: 3 кадра плоской звезды-импакта + обломки; пыль шлёпа кругами; хруст плеча */
const ImpactFx: React.FC<{ frame: number }> = ({ frame }) => {
  const out: React.ReactNode[] = [];
  const H = S.HIT_FRAME;
  const hx = S.HIT_X - 25;
  const hy = S.GROUND + 70;
  if (frame >= H && frame < H + 3) {
    const k = frame - H;
    out.push(<Sprite key="st" assetKey={`fx_impact${k + 1}`} w={[520, 620, 470][k]} x={hx} y={hy} rotation={[0, 14, -10][k]} order={600} />);
  }
  if (frame >= H + 2 && frame < S.FLIGHT_FROM) {
    const k = frame - H - 2;
    out.push(<Sprite key="db" assetKey="fx_debris" w={420} x={hx + 20 + k * 24} y={hy + 20 + k * 12} scale={0.7 + k * 0.08} rotation={k * 8} order={402} />);
  }
  const L = S.LAND_FRAME;
  if (frame >= L && frame < L + 14) {
    const k = hold(frame) - L;
    [-1, 1].forEach((s) => out.push(<Sprite key={`ld${s}`} assetKey="fx_puff" w={60 + k * 4} x={S.LAND_X - 50 + s * (190 + k * 12)} y={S.GROUND + 22 + k * 4} order={470} />));
    if (k < 4) out.push(<Sprite key="lb" assetKey="fx_boom" w={220 + k * 30} x={S.LAND_X - 40} y={S.GROUND + 40} order={471} />);
  }
  const P = S.SHOULDER_FRAME;
  if (frame >= P && frame < P + 6) {
    out.push(<Sprite key="pop" assetKey="fx_boom" w={190 + (frame - P) * 30} x={S.LAND_X - 22 - 100} y={S.GROUND + 215} rotation={(frame - P) * 20} order={470} />);
  }
  return <>{out}</>;
};

// ---------- Слои фона ----------
const Layer: React.FC<{ def: S.LayerDef }> = ({ def }) => {
  const assets = useAssets();
  const a = assets.get(def.asset);
  if (!a) return null;
  const depth = CAM_Z * (1 / def.parallax - 1);
  const w = a.texW * def.k;
  return (
    <DepthGroup depth={depth}>
      <Sprite assetKey={def.asset} scale={def.k} y={def.dy ?? 0} center order={def.order} />
      {def.tiles && (
        <>
          <Sprite assetKey={def.asset} scale={def.k} x={-w} y={def.dy ?? 0} flipX center order={def.order} />
          <Sprite assetKey={def.asset} scale={def.k} x={w} y={def.dy ?? 0} flipX center order={def.order} />
        </>
      )}
    </DepthGroup>
  );
};

const GroundFill: React.FC = () => (
  <mesh position={[0, -540 - 700, 0]} scale={[12000, 1400, 1]} renderOrder={-701}>
    <planeGeometry args={[1, 1]} />
    <meshBasicMaterial color={S.GROUND_FILL} transparent depthTest={false} depthWrite={false} toneMapped={false} />
  </mesh>
);

// ---------- Мир ----------
const World: React.FC = () => {
  const frame = useCurrentFrame();
  const camBase = sampleCamera(frame, S.CAMERA);
  const im = S.IMPACTS.map((i) => impactShake(frame, i.f, i.amp, i.dur, i.f)).map((c) => ({ x: c.x, y: c.y }));
  const cam = addShake(camBase, ...im);
  const cold = frame >= S.COLD.from ? { color: S.COLD.color, opacity: S.COLD.opacity } : undefined;

  const B = S.BILLBOARD;
  return (
    <>
      <SceneCamera state={cam} flash={cold} grain={false} />
      <GroundFill />
      {S.LAYERS.map((L) => (
        <Layer key={L.id} def={L} />
      ))}
      <DepthGroup depth={B.depth}>
        <Sprite assetKey={frame >= B.flipAt ? B.assetZero : B.asset} w={B.w} x={B.x} y={B.y} center order={-795} />
        <BillboardScreen frame={frame} />
      </DepthGroup>
      <Trashfires frame={frame} />
      <Trash frame={frame} />
      <Bike frame={frame} />
      <Rockets frame={frame} />
      <CarFx frame={frame} />
      <Car frame={frame} />
      <PaperPuppet char="greg" pose={gregPose(frame)} order={400} />
      <Tooth frame={frame} />
      <ImpactFx frame={frame} />
    </>
  );
};

export const Scene1: React.FC<Scene1Props> = ({ manifest, audio }) => {
  const m = useMemo(() => normalizeManifest(manifest), [manifest]);
  return (
    <AbsoluteFill style={{ backgroundColor: "#0b0b26" }}>
      <AssetsProvider manifest={m}>
        <ThreeCanvas width={S.WIDTH} height={S.HEIGHT} flat camera={{ fov: FOV, position: [0, 0, CAM_Z], near: 10, far: 400000 }}>
          <World />
        </ThreeCanvas>
      </AssetsProvider>
      <AudioLayers cues={S.AUDIO_CUES} avail={audio} total={S.DURATION} />
    </AbsoluteFill>
  );
};

void easeOut;
void hash;
