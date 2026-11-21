// СЦЕНА 3 «Классовая борьба»: тот же перекрёсток у веганской кофейни, ночь, кадры 13-18. Стиль принятой сцены 2 (2-ступенчатые материалы, контур, постеризация).
import React, { useLayoutEffect, useMemo } from "react";
import * as THREE from "three";
import { ThreeCanvas } from "@remotion/three";
import { AbsoluteFill, Composition, staticFile, useCurrentFrame } from "remotion";
import { useThree } from "@react-three/fiber";
import { AudioAvail, AudioLayers, probeAudio } from "./engine/audio";
import { probeWav, VoiceInfo } from "./engine/wav";
import * as S from "./data/scene3";
import { FOV, LIGHT_DIR, STYLE } from "./three/toon";
import { Person } from "./three/Person";
import { Cast, PLACARD3 } from "./three/Cast";
import { Cast3, CandyBar } from "./three/Cast3";
import { Pickup, VendingMachine, TrafficLight, Zebra } from "./three/Vehicles3";
import { Street, PAL_COLD } from "./three/Env";
import { Puff, GroundDust, Star } from "./three/Fx";
import { frameAt3, Frame3, MACHINE, TRUCK_Z } from "./three/anim3";

/** Постеризация кадра: каждый канал схлопывается в N плоских ступеней */
const POSTER_LEVELS = 6;
const posterTable = Array.from({ length: POSTER_LEVELS }, (_, i) => (i / (POSTER_LEVELS - 1)).toFixed(4)).join(" ");
const Poster: React.FC = () => (
  <svg width="0" height="0" style={{ position: "absolute" }} aria-hidden>
    <defs>
      <filter id="poster" colorInterpolationFilters="sRGB" x="0" y="0" width="100%" height="100%">
        <feComponentTransfer>
          <feFuncR type="discrete" tableValues={posterTable} />
          <feFuncG type="discrete" tableValues={posterTable} />
          <feFuncB type="discrete" tableValues={posterTable} />
        </feComponentTransfer>
      </filter>
    </defs>
  </svg>
);

export type Scene3Props = { audio: AudioAvail; voices: Array<VoiceInfo | null>; names: string[] };

const CameraRig: React.FC<{ f: Frame3 }> = ({ f }) => {
  const { camera } = useThree();
  useLayoutEffect(() => {
    camera.position.set(f.cam.x, f.cam.y, f.cam.z);
    camera.up.set(0, 1, 0);
    camera.lookAt(f.cam.tx, f.cam.ty, f.cam.tz ?? 0);
    if (f.cam.roll) camera.rotateZ((f.cam.roll * Math.PI) / 180); // завал горизонта
    if (camera instanceof THREE.PerspectiveCamera) {
      camera.fov = FOV;
      camera.near = 0.5;
      camera.far = 400;
      camera.updateProjectionMatrix();
    }
    camera.updateMatrixWorld();
  });
  return null;
};

const World: React.FC<{ tl: S.Timeline; voices: Array<VoiceInfo | null> }> = ({ tl, voices }) => {
  const frame = useCurrentFrame();
  const sh = S.shotAt(tl, frame);
  const env = useMemo(() => voices.map((v) => v?.env), [voices]);
  const f = frameAt3(frame, sh, env);
  PLACARD3.hole = f.hole; // дыра от окурка в плакате Хлои (накладка на текстуре)
  const bgx = f.cam.x - 0.2 + f.bgOff;
  const t = f.truck;
  return (
    <>
      <color attach="background" args={[PAL_COLD.sky]} />
      <CameraRig f={f} />
      <group position={[bgx, 0, 0]}>
        <Street pal={PAL_COLD} lampOn time={frame} calm simple flat signs={[3]} signLift={1.35} signY={f.signY} />
      </group>
      <Zebra x={9.5} />
      <TrafficLight x={13.6} z={1.55} />
      <group position={[MACHINE.x, 0, MACHINE.z]}>
        <VendingMachine shake={f.machine?.shake ?? 0} tilt={f.machine?.tilt ?? 0} />
      </group>
      {t && (
        <group position={[t.x, -0.3, TRUCK_Z]} rotation={[0, (t.yaw * Math.PI) / 180, 0]}>
          <Pickup doorF={t.doorF} doorR={t.doorR} nose={t.nose} lean={t.lean} idle={t.idle} spin={t.spin} />
        </group>
      )}
      {f.dust.map((d, i) => (
        <GroundDust key={i} at={[d.x, -0.3, d.z]} k={d.k} r={1.1} />
      ))}
      {f.puffs.map((p, i) => (
        <Puff key={i} position={[p.x, p.y, p.z]} r={p.r} color={p.color} />
      ))}
      {f.bar && (
        <group position={[f.bar.x, f.bar.y, f.bar.z]} rotation={[0, 0, (f.bar.rot * Math.PI) / 180]} scale={1.5}>
          <CandyBar />
        </group>
      )}
      {f.star && <Star position={[f.star.x, f.star.y, f.star.z]} size={f.star.s} rot={f.star.rot} seed={3} n={7} />}
      {f.actors.map((a, i) =>
        a.kind === "greg" ? (
          <Person key={a.kind + i} pose={a.pose} kind="greg" s2 groundY={a.gy ?? 0} />
        ) : a.kind === "brenda" || a.kind === "stacey" ? (
          <Cast3 key={a.kind + i} pose={a.pose} kind={a.kind} x={a.x} groundY={a.gy ?? 0} />
        ) : (
          <Cast key={a.kind + i} pose={a.pose} kind={a.kind} groundY={a.gy ?? 0} />
        ),
      )}
    </>
  );
};

export const Scene3: React.FC<Scene3Props> = ({ audio, voices, names }) => {
  STYLE.v5 = true;
  LIGHT_DIR.set(0.62, 0.7, 0.36).normalize();
  const tl = useMemo(() => S.buildTimeline(voices.map((v) => v?.dur ?? null)), [voices]);
  const cues = useMemo(() => S.buildCues(tl, names), [tl, names]);
  return (
    <AbsoluteFill style={{ backgroundColor: "#0e2a66" }}>
      <Poster />
      <AbsoluteFill style={{ filter: "url(#poster)" }}>
        <ThreeCanvas width={S.WIDTH} height={S.HEIGHT} flat camera={{ fov: FOV, position: [1.8, 2.4, 13], near: 0.5, far: 400 }}>
          <World tl={tl} voices={voices} />
        </ThreeCanvas>
      </AbsoluteFill>
      <AudioLayers cues={cues} avail={audio} total={tl.total} />
    </AbsoluteFill>
  );
};

/** Регистрация композиции (подключается в Root.tsx одной строкой) */
export const Scene3Entry: React.FC = () => (
  <Composition
    id="Scene3"
    component={Scene3}
    durationInFrames={S.DEFAULT_TIMELINE.total}
    fps={S.FPS}
    width={S.WIDTH}
    height={S.HEIGHT}
    defaultProps={{ audio: {}, voices: S.VOICE_FILES.map(() => null), names: S.VOICE_FILES } satisfies Scene3Props}
    calculateMetadata={async () => {
      const names = await S.resolveVoiceNames();
      const voices = await Promise.all(names.map((n) => probeWav(staticFile(`audio/${n}.wav`), S.FPS)));
      const tl = S.buildTimeline(voices.map((v) => v?.dur ?? null));
      const audio = await probeAudio(S.buildCues(tl, names));
      return { durationInFrames: tl.total, props: { audio, voices, names } };
    }}
  />
);
