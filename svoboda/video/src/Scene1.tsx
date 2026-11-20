import React, { useMemo } from "react";
import * as THREE from "three";
import { ThreeCanvas } from "@remotion/three";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { AssetsProvider, useAssets, normalizeManifest } from "./engine/assets";
import { AudioLayers, AudioAvail } from "./engine/audio";
import { CAM_Z, DepthGroup, FOV, SceneCamera, addShake, depthScale, impactShake, sampleCamera, shake } from "./engine/camera";
import { PaperPuppet } from "./engine/PaperPuppet";
import { Sprite } from "./engine/Sprite";
import { bounce, clamp, easeIn, eyeTick, hold, holdKeys, mix, range, ragdoll, remap, talk, track, track2, walk } from "./engine/motion";
import { Pose, pose } from "./engine/types";
import * as S from "./data/scene1";

export type Scene1Props = {
  /** сырой манифест из public/img/manifest.json (кладёт calculateMetadata) */
  manifest: unknown;
  /** найденные аудиофайлы */
  audio: AudioAvail;
};

// ---------- Позы актёров из данных ----------
const BASE = (extra: Partial<Pose> = {}) => pose({ x: 0, y: 0, ...extra });

export const gregPose = (frame: number): Pose => {
  const f = hold(frame);
  const segs = S.GREG;
  const seg = segs.find((s) => frame >= s.from && frame < s.to) ?? segs[segs.length - 1];
  const base = BASE({ scale: S.GREG_SCALE, seed: 3 });
  let p: Pose;
  if (seg.mode === "walk") {
    const x = remap(f, [[seg.from, seg.x0], [seg.to, seg.x1]]);
    p = mix(base, { x, y: S.GROUND }, walk(frame, { holdRightArm: true, period: 18 }), eyeTick(frame, 5, 34));
  } else if (seg.mode === "flight") {
    const g = remap(f, S.SLOWMO);
    const u = g / S.FLIGHT_GAME_FRAMES;
    const r = ragdoll(u, { from: seg.fromXY, to: seg.toXY, apex: seg.apex, spin: seg.spin }, frame);
    // мёртвое скучающее лицо: рот закрыт, тика нет
    p = mix(base, r, { mouth: "closed" });
  } else {
    const k = holdKeys(frame, seg.keys) ?? seg.keys[0];
    const { f: _f, ...patch } = k;
    void _f;
    p = mix(base, { x: seg.x }, patch);
    if (frame >= 560) p = mix(p, eyeTick(frame, 7, 30));
    if (frame >= S.GREG_LINE.from) p = mix(p, talk(frame, S.GREG_LINE.from, S.GREG_LINE.to, { syllable: 4, seed: 11, nod: 2 }));
    const b = bounce(frame, S.LAND_FRAME);
    if (frame >= S.LAND_FRAME && frame < S.LAND_FRAME + 12) p = mix(p, { y: b.dy });
  }
  return p;
};

const carX = (f: number) => remap(hold(f), S.TRACKS.car);
const bikeXY = (f: number): [number, number] => {
  const [x, y] = track2(f, S.TRACKS.bike);
  return [x, y + (hold(f) % 8 < 4 ? 5 : -5)]; // зависание рывками
};

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
        // сдвиг горизонтальных полос + цветовой разъезд
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
  if (frame >= B.flipAt + 2) which = "b";
  else if (frame >= B.flipAt) which = "flash";
  else if (frame >= B.glitchFrom) which = Math.floor(hold(frame) / 2) % 2 ? "g1" : "g2";
  // центр экрана в авторских px
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
/** Пришелец за рулём: настоящий спрайт (prop_alien_driver) или заглушка-кукла. Координаты - в системе машины. */
const AlienDriver: React.FC<{ dissolve: number; shk: number; front: boolean }> = ({ dissolve, shk, front }) => {
  const assets = useAssets();
  if (assets.isReal("alien_driver")) {
    return <Sprite assetKey="alien_driver" h={S.ALIEN_H} x={S.ALIEN_AT[0]} y={S.ALIEN_AT[1] + shk} order={front ? 460 : 230} dissolve={dissolve} seed={9} />;
  }
  const ap = pose({ x: S.ALIEN_AT[0], y: S.ALIEN_AT[1] - 90 + shk, scale: 1, armL: 75, armR: 70, dissolve, seed: 9 });
  return <PaperPuppet char="alien" pose={ap} order={200} />;
};

const Car: React.FC<{ frame: number }> = ({ frame }) => {
  const f = hold(frame);
  if (f >= S.VANISH.car.to) return null;
  const x = carX(f);
  const cy = remap(f, S.CAR_Y_TRACK);
  const front = cy < S.GROUND - 60; // едет по проезжей части: впереди Грега
  const fast = Math.abs(carX(f + 2) - x) > 30;
  const wob = fast ? (Math.floor(f / 2) % 2 ? 4 : 0) : 0;
  const rot = fast ? (Math.floor(f / 2) % 2 ? -1.2 : 0.8) : 0;
  const dis = easeIn(range(f, S.VANISH.car.from, S.VANISH.car.to));
  // кабина: пришелец сидит чуть позади центра
  const alienDis = easeIn(range(f, S.VANISH.alien.from, S.VANISH.alien.to));
  const alienGone = f >= S.VANISH.alien.to;
  const shk = fast ? (Math.floor(f / 2) % 2 ? 3 : -2) : 0;
  return (
    <>
      <group position={[x, cy + wob, 0]} rotation={[0, 0, (rot * Math.PI) / 180]}>
        <Sprite assetKey="car" w={S.CAR_W} order={front ? 450 : 220} dissolve={dis} seed={4} />
        {!alienGone && <AlienDriver dissolve={alienDis} shk={shk} front={front} />}
      </group>
    </>
  );
};

const Bike: React.FC<{ frame: number }> = ({ frame }) => {
  const f = hold(frame);
  if (f >= S.VANISH.bike.to) return null;
  const [x, y] = bikeXY(f);
  const [x2] = bikeXY(f + 2);
  const tilt = clamp((x2 - x) / 40, -1, 1) * -6;
  return <Sprite assetKey="bike" w={S.BIKE_W} x={x} y={y} rotation={tilt} order={250} dissolve={easeIn(range(f, S.VANISH.bike.from, S.VANISH.bike.to))} seed={6} />;
};

const Rockets: React.FC<{ frame: number }> = ({ frame }) => {
  const f = hold(frame);
  const R = S.ROCKET;
  const ang = (Math.atan2(R.vy, R.vx) * 180) / Math.PI;
  return (
    <>
      {S.ROCKET_LAUNCHES.map((L) => {
        const d = f - L;
        if (d < 0 || d > R.life + 6) return null;
        const [bx, by] = bikeXY(L);
        const sx = bx + 140;
        const sy = by - 20;
        if (d <= R.life) return <Sprite key={L} assetKey="rocket" w={S.ROCKET_W} x={sx + R.vx * d} y={sy + R.vy * d} rotation={ang} order={300} />;
        const k = (d - R.life) / 6;
        const ex = sx + R.vx * R.life;
        const ey = sy + R.vy * R.life;
        return <Sprite key={L} assetKey="fx_boom" w={260} x={ex} y={ey} scale={0.5 + k} opacity={1 - k * 0.4} order={300} />;
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
  const y = T.from[1] + (T.to[1] - T.from[1]) * t + 70 * 4 * t * (1 - t);
  return <Sprite assetKey="fx_tooth" w={18} x={x} y={y} rotation={t * 540} order={450} />;
};

const Dust: React.FC<{ frame: number }> = ({ frame }) => {
  const D = S.VANISH.dust;
  const f = hold(frame);
  if (f < D.from || f > D.to) return null;
  const k = (f - D.from) / (D.to - D.from);
  const x = carX(S.VANISH.alien.from) - 40;
  return <Sprite assetKey="fx_dust" w={300} x={x} y={S.CAR_Y + 250 + k * 30} scale={0.5 + k * 1.1} opacity={1 - k} order={500} />;
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

/** Асфальт под слоем ground: при отъезде камеры ниже края картинки (y<-540) */
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
  const cam = addShake(camBase, ...sh, ...im);

  const sirens = frame < S.SIREN.until;
  const flash = sirens ? { color: Math.floor(frame / S.SIREN.every) % 2 ? S.SIREN.a : S.SIREN.b, opacity: S.SIREN.opacity } : undefined;

  const B = S.BILLBOARD;
  return (
    <>
      <SceneCamera state={cam} flash={flash} />
      <GroundFill />
      {S.LAYERS.map((L) => (
        <Layer key={L.id} def={L} />
      ))}
      <DepthGroup depth={B.depth}>
        <Sprite assetKey={B.asset} w={B.w} x={B.x} y={B.y} center order={-795} />
        <BillboardScreen frame={frame} />
      </DepthGroup>
      <Bike frame={frame} />
      <Rockets frame={frame} />
      <Car frame={frame} />
      <PaperPuppet char="greg" pose={gregPose(frame)} order={400} />
      <Tooth frame={frame} />
      <Dust frame={frame} />
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

void track;
void depthScale;
