import React, { useMemo } from "react";
import * as THREE from "three";
import { ThreeCanvas } from "@remotion/three";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { AssetsProvider, useAssets, normalizeManifest } from "./engine/assets";
import { AudioLayers, AudioAvail } from "./engine/audio";
import { CAM_Z, DepthGroup, FOV, SceneCamera, addShake, impactShake, sampleCamera, shake } from "./engine/camera";
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
    const { f: kf, x, cy, alt, ...patch } = k;
    const odd = Math.floor((frame - kf) / 4) % 2 === 1;
    const { x: ax = 0, cy: acy = 0, ...apatch } = (odd && alt ? alt : {}) as Partial<Pose> & { cy?: number };
    return mix(base, { x: x + ax, y: cy + acy - S.CENTER_Y_PX * S.GREG_SCALE }, { ...patch, ...apatch });
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
    const open = e > 0.1;
    p = mix(p, { mouth: open ? "a" : "closed", head: e > 0.5 ? 3 : e > 0.25 ? -1.5 : 0, headDy: e > 0.5 ? -3 : 0 });
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
  return { on: true, x, y: seg.y, flip: seg.flip, fast, front: seg.y < S.GROUND - 60, smoke: dx > 36 || (f > 200 && f < 292 && dx > 3) };
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
  const braking = f > 236 && f < 296 && f < 290;
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

/** Дымок из-под колёс и линии скорости */
const CarFx: React.FC<{ frame: number }> = ({ frame }) => {
  const f = hold(frame);
  if (f >= S.VANISH_FRAME) return null;
  const out: React.ReactNode[] = [];
  for (let i = 0; i < 5; i++) {
    const k = f - 2 * i;
    const st = carState(k);
    if (!st.on || !st.smoke) continue;
    const age = 2 * i;
    const dir = st.flip ? -1 : 1;
    out.push(
      <Sprite key={`p${i}`} assetKey="fx_dust" w={260} x={st.x - dir * 380} y={st.y + 40 + age * 4} scale={0.35 + 0.05 * age} opacity={0.75 * (1 - age / 11)} order={st.front ? 445 : 215} />,
    );
  }
  const now = carState(f);
  if (now.on && now.fast) {
    const dir = now.flip ? -1 : 1;
    for (let i = 0; i < 2; i++) {
      out.push(<Bar key={`s${i}`} x={now.x - dir * (520 + i * 70)} y={now.y + 50 + i * 40} w={420 - i * 40} h={6} color="#f4f0ff" opacity={0.5} order={now.front ? 449 : 219} />);
    }
  }
  return <>{out}</>;
};

const Bike: React.FC<{ frame: number }> = ({ frame }) => {
  const f = hold(frame);
  if (f >= S.VANISH_FRAME) return null;
  const [x, y] = bikeXY(f);
  const [x2] = bikeXY(f + 2);
  const tilt = clamp((x2 - x) / 40, -1, 1) * -6;
  return <Sprite assetKey="bike" w={S.BIKE_W} x={x} y={y} rotation={tilt} order={250} seed={6} />;
};

/** Ракеты: по одной за такт, круто вниз, хвост короткий; один взрыв за раз, дым недолгий */
const Rockets: React.FC<{ frame: number }> = ({ frame }) => {
  const f = hold(frame);
  const out: React.ReactNode[] = [];
  S.ROCKETS.forEach((R, i) => {
    const d = f - R.f;
    if (d < 0 || d > S.ROCKET_DUR + 14) return;
    const [bx, by] = bikeXY(R.f);
    const sx = bx + 200;
    const sy = by - 30;
    const tx = sx + R.dx;
    const ty = R.ty;
    const ang = (Math.atan2(ty - sy, tx - sx) * 180) / Math.PI;
    if (d <= S.ROCKET_DUR) {
      const t = d / S.ROCKET_DUR;
      const x = sx + (tx - sx) * t;
      const y = sy + (ty - sy) * t;
      out.push(
        <group key={`r${i}`} position={[x, y, 0]} rotation={[0, 0, (ang * Math.PI) / 180]}>
          <Sprite assetKey="fx_trail" w={Math.min(190, 80 + d * 25)} x={-90} opacity={0.85} order={299} />
          <Sprite assetKey="rocket" w={S.ROCKET_W} order={300} />
        </group>,
      );
      return;
    }
    const k = d - S.ROCKET_DUR; // кадров после взрыва
    const key = (n: string) => `${n}${i}`;
    if (k <= 6) {
      const g = k / 6;
      out.push(<Sprite key={key("b")} assetKey="fx_boom" w={300} x={tx} y={ty} scale={0.7 + g * 0.8} rotation={i * 40} opacity={1 - g * 0.5} order={305} />);
      out.push(<Sprite key={key("x")} assetKey="fx_debris" w={340} x={tx} y={ty + k * 8} scale={0.5 + g * 0.7} opacity={1 - g} order={304} />);
    }
    if (k > 2 && k <= 12) {
      const a = k - 2;
      out.push(<Sprite key={key("s")} assetKey="fx_smoke" w={260} x={tx + 12} y={ty + 40 + a * 5} scale={0.5 + a * 0.035} opacity={0.7 * (1 - a / 11)} order={303} />);
    }
  });
  return <>{out}</>;
};

/** Горящие урны на тротуаре; пламя - лёгкое дрожание масштаба, цвет стабилен */
const Trashfires: React.FC<{ frame: number }> = ({ frame }) => {
  if (frame >= S.VANISH_FRAME) return null;
  const f = hold(frame);
  return (
    <>
      {S.TRASHFIRES.map(([from, x], i) => {
        if (f < from) return null;
        const j = Math.floor(f / 2) % 2 ? 1.04 : 0.97;
        return <Sprite key={i} assetKey="fx_trashfire" h={230} x={x} y={S.GROUND - 28} scale={j} order={210} />;
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
  if (after >= 0 && after < 6) y += [0, 18, 0, 8, 0, 0][Math.floor(after / 1)] ?? 0;
  const pop = t >= 1 && after < 4 ? 1.35 : 1;
  return <Sprite assetKey="fx_tooth" w={S.TOOTH_W} x={x} y={y} rotation={t < 1 ? t * 540 : 25} scale={pop} order={460} />;
};

/** Эффекты удара: белая звезда-вспышка, взрывная звезда, обломки; пыль шлёпа; хруст плеча */
const ImpactFx: React.FC<{ frame: number }> = ({ frame }) => {
  const out: React.ReactNode[] = [];
  const H = S.HIT_FRAME;
  const hx = S.HIT_X - 25;
  const hy = S.GROUND + 60;
  if (frame >= H && frame < H + 10) {
    const k = frame - H;
    // вспышка-звезда только 2 кадра; взрывная звезда и обломки держатся на крупном плане
    if (k < 2) out.push(<Sprite key="fl" assetKey="fx_flash" w={760} x={hx} y={hy} scale={1 + k * 0.1} opacity={1 - k * 0.45} order={600} />);
    out.push(<Sprite key="bm" assetKey="fx_boom" w={380} x={hx} y={hy} scale={0.9 + Math.min(k, 6) * 0.06} rotation={k * 5} order={401} />);
    out.push(<Sprite key="db" assetKey="fx_debris" w={520} x={hx + k * 14} y={hy + 30 + k * 6} scale={0.8 + k * 0.1} opacity={Math.max(0, 1 - k * 0.1)} order={402} />);
  }
  const L = S.LAND_FRAME;
  if (frame >= L && frame < L + 18) {
    const k = frame - L;
    [-1, 1].forEach((s) => out.push(<Sprite key={`ld${s}`} assetKey="fx_dust" w={300} x={S.LAND_X + 20 + s * (90 + k * 9)} y={S.GROUND + 10 + k * 3} scale={0.5 + k * 0.05} opacity={Math.max(0, 1 - k / 18)} order={470} />));
    if (k < 3) out.push(<Sprite key="lb" assetKey="fx_boom" w={260} x={S.LAND_X + 10} y={S.GROUND + 40} scale={0.8 + k * 0.2} order={471} />);
  }
  const P = S.SHOULDER_FRAME;
  if (frame >= P && frame < P + 6) {
    // «хруст» плеча: крупная звезда у левого плеча (на экране - у дальнего от камеры плеча Грега)
    out.push(<Sprite key="pop" assetKey="fx_boom" w={230} x={S.LAND_X - 22 - 100} y={S.GROUND + 215} scale={0.8 + (frame - P) * 0.2} rotation={(frame - P) * 20} opacity={1 - (frame - P) * 0.12} order={470} />);
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
      <Sprite assetKey={def.asset} scale={def.k} center order={def.order} />
      {def.tiles && (
        <>
          <Sprite assetKey={def.asset} scale={def.k} x={-w} flipX center order={def.order} />
          <Sprite assetKey={def.asset} scale={def.k} x={w} flipX center order={def.order} />
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
  const sh = S.HANDHELD.filter((h) => frame >= h.from && frame < h.to).map((h) => shake(frame, h.amp, h.seed, h.roll));
  const im = S.IMPACTS.map((i) => impactShake(frame, i.f, i.amp, i.dur, i.f));
  const hd = frame - S.HIT_FRAME;
  const punch = hd >= 0 && hd < S.HIT_PUNCH.dur ? { zoom: S.HIT_PUNCH.zoom * (1 - hd / S.HIT_PUNCH.dur) } : undefined;
  const sd = frame - S.SHOULDER_FRAME;
  const sPunch = sd >= 0 && sd < S.SHOULDER_PUNCH.dur ? { zoom: S.SHOULDER_PUNCH.zoom * (1 - sd / S.SHOULDER_PUNCH.dur) } : undefined;
  const cam = addShake(camBase, ...sh, ...im, punch, sPunch);

  const fo = S.FLASH[frame];
  const flash = fo ? { color: "#ffffff", opacity: fo } : undefined;

  const B = S.BILLBOARD;
  return (
    <>
      <SceneCamera state={cam} flash={flash} />
      <GroundFill />
      {S.LAYERS.map((L) => (
        <Layer key={L.id} def={L} />
      ))}
      <DepthGroup depth={B.depth}>
        <Sprite assetKey={frame >= B.flipAt ? B.assetZero : B.asset} w={B.w} x={B.x} y={B.y} center order={-795} />
        <BillboardScreen frame={frame} />
      </DepthGroup>
      <Trashfires frame={frame} />
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
