// СЦЕНА 1 (v5): настоящая 3D-сцена. Всё из геометрии Three.js; анимация на двойках.
import React, { useLayoutEffect } from "react";
import * as THREE from "three";
import { ThreeCanvas } from "@remotion/three";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { useThree } from "@react-three/fiber";
import { AudioAvail, AudioLayers } from "./engine/audio";
import * as S from "./data/scene1";
import { FOV, Shadow, Flat, planeGeo } from "./three/toon";
import { Person, Palette, GREG_COL } from "./three/Person";
import { Street, Billboard, PAL_NIGHT, PAL_COLD } from "./three/Env";
import { SuperCar, Rocket, Bike } from "./three/Vehicles";
import { Explosion, Flame, Paper, Puff, SmokeColumn, Star, Tooth, DustRing, Chunk } from "./three/Fx";
import * as A from "./three/anim";
import { clamp, hold, remap, lerp, hash } from "./three/util";

export type Scene1Props = { audio: AudioAvail };

const D2R = Math.PI / 180;

// ---------- камера ----------
const CameraRig: React.FC = () => {
  const { camera } = useThree();
  const frame = useCurrentFrame();
  useLayoutEffect(() => {
    const c = A.cameraAt(frame);
    const sh = A.shakeAt(frame);
    camera.position.set(c.camX + sh.x, c.camY + sh.y, c.camZ);
    camera.lookAt(c.tgtX + sh.x * 0.5, c.tgtY + sh.y * 0.5, 0);
    if (camera instanceof THREE.PerspectiveCamera) {
      camera.fov = FOV;
      camera.near = 0.5;
      camera.far = 400;
      camera.updateProjectionMatrix();
    }
    camera.updateMatrixWorld();
  }, [camera, frame]);
  return null;
};

const EXTRA_COLS: Palette[] = [
  { ...GREG_COL, shirt: "#2f6fd1", collar: "#2f6fd1", cuff: "#2f6fd1", pants: "#3b3f58", hair: "#3a2a1a", tie: "#2f6fd1" },
  { ...GREG_COL, shirt: "#f08a24", collar: "#f08a24", cuff: "#f08a24", pants: "#4a4258", hair: "#caa24a", tie: "#f08a24" },
  { ...GREG_COL, shirt: "#3aa655", collar: "#3aa655", cuff: "#3aa655", pants: "#6a4a8a", hair: "#222222", tie: "#3aa655" },
];

// ---------- Грег ----------
const Greg: React.FC<{ frame: number }> = ({ frame }) => {
  const p = A.gregPose(frame);
  const lying = frame >= S.LAND_FRAME && frame < S.RISE_FROM + 30;
  const h = Math.max(0, p.y - 0.65);
  const k = Math.max(0.35, 1 - h * 0.18);
  // тень под Грегом присутствует всю сцену
  const sw = lying ? 1.45 : 0.58 * k;
  const sd = lying ? 0.5 : 0.32 * k;
  return (
    <>
      <Shadow position={[lying ? p.x + 0.1 : p.x, 0.03, p.z + 0.08]} w={sw} d={sd} />
      <Person pose={p} kind="greg" shadow={false} />
    </>
  );
};

// ---------- Машина ----------
const Car: React.FC<{ frame: number }> = ({ frame }) => {
  const st = A.carState(frame);
  if (!st.on) return null;
  const driver = A.alienPose(frame);
  const trail: React.ReactNode[] = [];
  const dir = Math.abs(st.yaw) > 100 ? -1 : 1;
  const zs = A.carZScale(st.z);
  if (st.fast || st.braking) {
    for (let i = 0; i < 5; i++) {
      const k = A.carState(frame - 2 * (i + 1));
      if (!k.on) continue;
      trail.push(<Puff key={i} position={[k.x - dir * (2.4 + i * 0.35), 0.35 + i * 0.12, k.z + (i % 2 ? 0.3 : -0.3)]} r={0.34 + i * 0.1} color="#d5d3e2" />);
    }
  }
  if (st.fast) {
    // шлейф: длинные плоские полосы скорости за машиной
    const w = hold(frame, 2) / 2;
    [[0.42, 3.6], [0.78, 4.8], [1.12, 3.0]].forEach(([y, len], i) => {
      const L = len + (w % 2 ? 0.7 : 0);
      trail.push(<Flat key={`s${i}`} geo={planeGeo} color="#eef0ff" position={[st.x - dir * (2.5 + L / 2 + (i === 1 ? 0.4 : 0)), y, st.z - 0.35 * zs]} scale={[L, 0.14, 1]} />);
    });
  }
  return (
    <>
      <Shadow position={[st.x, 0.03, st.z]} w={2.3 * A.CAR_SCALE} d={1.1 * zs} />
      <group position={[st.x, st.dy, st.z]} rotation={[0, st.yaw * D2R, 0]} scale={[A.CAR_SCALE, A.CAR_SCALE, A.CAR_SCALE * zs]}>
        <SuperCar spin={st.spin} driver={driver} wobble={st.pitch} />
      </group>
      {trail}
    </>
  );
};

// ---------- Байк и ракеты ----------
const BS = 1.6; // масштаб байка
const Bikes: React.FC<{ frame: number }> = ({ frame }) => {
  const b = A.bikeState(frame);
  const hidden = A.podHidden(frame);
  const rockets: React.ReactNode[] = [];
  const fx: React.ReactNode[] = [];
  A.FIRE_FRAMES.forEach((ff, i) => {
    const d = hold(frame) - ff;
    if (d < 0) return;
    const bs = A.bikeState(ff);
    const side = i % 2 === 0 ? 1 : -1;
    const ca = Math.cos(bs.yaw * D2R);
    const sa = Math.sin(bs.yaw * D2R);
    const lx = 0.9 * (BS / 1.1);
    const lz = side * 0.7 * (BS / 1.1);
    const sx = bs.x + lx * ca + lz * sa;
    const sy = bs.y + 0.62 * BS;
    const sz = bs.z - lx * sa + lz * ca;
    const [tx, ty, tz] = A.TARGETS[i];
    if (d <= A.ROCKET_DUR) {
      const t = d / A.ROCKET_DUR;
      const x = lerp(sx, tx, t), y = lerp(sy, ty, t), z = lerp(sz, tz, t);
      const dx = tx - sx, dy = ty - sy, dz = tz - sz;
      const yaw = Math.atan2(-dz, dx);
      const pitch = Math.atan2(dy, Math.hypot(dx, dz));
      const alt = Math.floor(d / 2) % 2;
      for (let j = 1; j <= 4; j++) {
        const tt = Math.max(0, t - 0.075 * j);
        fx.push(<Puff key={`t${i}_${j}`} position={[lerp(sx, tx, tt), lerp(sy, ty, tt), lerp(sz, tz, tt)]} r={0.14 + j * 0.06} color="#f1f0f6" px={2.6} />);
      }
      rockets.push(
        <group key={`r${i}`} position={[x, y, z]} rotation={[0, yaw, pitch + (alt ? 0.06 : -0.06)]}>
          <Rocket flame={alt ? 1 : 2} scale={1.5} />
        </group>,
      );
    } else {
      fx.push(<Explosion key={`e${i}`} at={[tx, ty, tz]} k={d - A.ROCKET_DUR} seed={i + 1} />);
    }
  });
  return (
    <>
      <group position={[b.x, b.y, b.z]} rotation={[0, b.yaw * D2R, 0]} scale={BS}>
        <group rotation={[0, 0, b.pitch * D2R]}>
          <group rotation={[b.roll * D2R, 0, 0]}>
            <Bike spin={hold(frame) * 25} flame={b.flame} rockets={hidden.map((h) => !h)} />
          </group>
        </group>
      </group>
      {rockets}
      {fx}
    </>
  );
};

// ---------- Горящие урны, мусор ----------
const BIN_FIRES = [{ f: 30, x: -4.4, z: -1.0 }, { f: 96, x: 0.6, z: -1.45 }];
const Fires: React.FC<{ frame: number }> = ({ frame }) => (
  <>
    {BIN_FIRES.map((b, i) =>
      frame >= b.f ? (
        <React.Fragment key={i}>
          <Flame position={[b.x, 0.98, b.z]} scale={0.75} frame={frame} />
          <SmokeColumn x={b.x + 0.1} y={1.3} z={b.z} frame={frame + i * 5} n={4} h={0.9} />
        </React.Fragment>
      ) : null,
    )}
  </>
);
const Papers: React.FC<{ frame: number }> = ({ frame }) => (
  <>
    {Array.from({ length: 5 }).map((_, i) => (
      <Paper key={i} frame={frame} seed={i + 1} y={0.6 + hash(i, 3) * 3} z={i % 3 === 0 ? 1.8 : -0.4 + (i % 2)} v={0.22 + hash(i, 5) * 0.22} x0={hash(i, 7) * 22} />
    ))}
  </>
);

// ---------- Удар, шлёп, зуб ----------
const ImpactFx: React.FC<{ frame: number }> = ({ frame }) => {
  const out: React.ReactNode[] = [];
  const H = S.HIT_FRAME;
  // контакт: небольшая звезда на стыке бампера и ног (2-3 кадра), не закрывает позу
  if (frame >= H && frame < S.FLIGHT_FROM) {
    const k = Math.floor((frame - H) / 2);
    out.push(<Star key="st" position={[A.HIT_X - 0.1 + k * 0.08, 1.0 + k * 0.1, A.GZ - 0.3]} size={[0.95, 1.15, 0.8][k]} rot={[0.1, 0.4, -0.2][k]} seed={20 + k} n={8} />);
  }
  if (frame >= H && frame < H + 14) {
    const k = hold(frame) - H;
    for (let i = 0; i < 5; i++) out.push(<Chunk key={`d${i}`} position={[A.HIT_X - 0.4 + (i - 2) * 0.22 + k * 0.07 * (i - 1), 0.3 + k * 0.08 * (1 + (i % 3)) - k * k * 0.004, A.GZ + 0.7]} rot={[k * 0.2 + i, k * 0.3, i]} s={0.1 + (i % 3) * 0.03} color={i % 2 ? "#6c5a52" : "#d9c9a8"} />);
  }
  // кофе из стаканчика: коричневые брызги тянутся за Грегом в полёте
  if (frame >= S.FLIGHT_FROM + 4 && frame < S.LAND_FRAME - 6) {
    const f4 = S.FLIGHT_FROM + Math.floor((frame - S.FLIGHT_FROM) / 4) * 4;
    for (let i = 1; i <= 5; i++) {
      const pf = A.flightPos(Math.max(S.FLIGHT_FROM, f4 - 4 * i));
      out.push(<Puff key={`cf${i}`} position={[pf.x + 0.12 * ((i % 2) * 2 - 1) - 0.2 * i * 0.15, pf.y + 0.15 + 0.12 * (i % 3), pf.z + 0.5]} r={0.2 - i * 0.025} color="#6b3f23" px={2.6} />);
    }
  }
  // шлёп: пыль двумя облаками в стороны + короткая звезда-удар
  if (frame >= S.LAND_FRAME && frame < S.LAND_FRAME + 16) out.push(<DustRing key="ld" at={[A.LIE_X - 0.1, 0, A.GZ - 0.3]} k={frame - S.LAND_FRAME} r={1.3} />);
  // плечо: маленькая вспышка у плеча (не у лица)
  if (frame >= S.SHOULDER_FRAME && frame < S.SHOULDER_FRAME + 4) out.push(<Star key="pop" position={[A.STAND_X + 0.55, 1.4, A.GZ - 0.25]} size={0.5} rot={(frame - S.SHOULDER_FRAME) * 0.5} seed={40} n={7} />);
  // зуб: вылетает изо рта по дуге и лежит на тротуаре в кадре
  if (frame >= S.SPIT_FRAME) {
    const f = hold(frame);
    const T = 22;
    const t = clamp((f - S.SPIT_FRAME) / T);
    const x = lerp(A.STAND_X + 0.1, A.STAND_X + 1.9, t);
    const y0 = 0.2;
    let y = lerp(1.75, y0, t * t * 0.55 + t * 0.45) + 1.1 * 4 * t * (1 - t);
    const after = f - (S.SPIT_FRAME + T);
    if (after >= 0 && after < 6) y += [0, 0.22, 0.1, 0.0, 0.05, 0][after] ?? 0;
    if (t >= 1) y = Math.max(y, y0);
    out.push(<Tooth key="tooth" position={[x, y, A.GZ + 0.45 - t * 0.1]} rot={t < 1 ? -t * 14 : 0.5} s={0.6 + 0.15 * t} />);
  }
  return <>{out}</>;
};

// ---------- мир ----------
const World: React.FC = () => {
  const frame = useCurrentFrame();
  const cold = frame > S.VANISH_FRAME + 1;
  const pal = cold ? PAL_COLD : PAL_NIGHT;
  let bb: "a" | "g1" | "g2" | "b" = "a";
  if (frame >= S.BILLBOARD_FLIP) bb = "b";
  else if (frame >= S.BILLBOARD_GLITCH) bb = Math.floor(hold(frame) / 2) % 2 ? "g1" : "g2";
  // два кадра пустоты на стыке исчезновения (один жёсткий стык)
  if (frame === S.VANISH_FRAME || frame === S.VANISH_FRAME + 1) {
    return (
      <>
        <color attach="background" args={["#d4ecff"]} />
        <CameraRig />
      </>
    );
  }
  return (
    <>
      <color attach="background" args={[pal.sky]} />
      <CameraRig />
      <Street pal={pal} lampOn={false} time={frame} />
      <Billboard state={bb} />
      {!cold && <Fires frame={frame} />}
      {!cold && <Papers frame={frame} />}
      {!cold && <Car frame={frame} />}
      {!cold && <Bikes frame={frame} />}
      {!cold &&
        A.EXTRAS.map((e, i) => {
          const p = A.extraPose(frame, e);
          return p ? <Person key={i} pose={p} kind="extra" colors={EXTRA_COLS[e.colorsKey]} /> : null;
        })}
      <Greg frame={frame} />
      <ImpactFx frame={frame} />
    </>
  );
};

export const Scene1: React.FC<Scene1Props> = ({ audio }) => (
  <AbsoluteFill style={{ backgroundColor: "#14143e" }}>
    <ThreeCanvas width={S.WIDTH} height={S.HEIGHT} flat camera={{ fov: FOV, position: [0.4, 1.45, 8.5], near: 0.5, far: 400 }}>
      <World />
    </ThreeCanvas>
    <AudioLayers cues={S.AUDIO_CUES} avail={audio} total={S.DURATION} />
  </AbsoluteFill>
);

void remap;
void Star;
void SmokeColumn;
