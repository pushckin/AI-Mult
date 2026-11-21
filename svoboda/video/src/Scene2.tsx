// СЦЕНА 2 «Освобождение»: та же ночная улица (холодная палитра после исчезновения), кадры 07-12.
import React, { useLayoutEffect, useMemo } from "react";
import * as THREE from "three";
import { ThreeCanvas } from "@remotion/three";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { useThree } from "@react-three/fiber";
import { AudioAvail, AudioLayers } from "./engine/audio";
import type { VoiceInfo } from "./engine/wav";
import * as S from "./data/scene2";
import { FOV, Part, rbox, rcyl, sphereGeo, LIGHT_DIR, STYLE } from "./three/toon";
import { Person } from "./three/Person";
import { Cast } from "./three/Cast";
import { Street, PAL_COLD, Bin } from "./three/Env";
import { Flame, SmokeColumn, GroundDust, Chunk } from "./three/Fx";
import { frameAt, BIN, BUSH, Frame } from "./three/anim2";
import { hash } from "./three/util";

/** Постеризация кадра: каждый канал схлопывается в N плоских ступеней (никаких плавных градиентов, бликов, мягких переходов) */
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

export type Scene2Props = { audio: AudioAvail; voices: Array<VoiceInfo | null> };

const CameraRig: React.FC<{ f: Frame }> = ({ f }) => {
  const { camera } = useThree();
  useLayoutEffect(() => {
    camera.position.set(f.cam.x, f.cam.y, f.cam.z);
    camera.lookAt(f.cam.tx, f.cam.ty, f.cam.tz ?? 0);
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

/** Горящая урна: большая бочка, три языка плоского огня, столб дыма */
const BurnBin: React.FC<{ frame: number; x: number }> = ({ frame, x }) => (
  <>
    <group position={[x, 0, BIN.z]} scale={[1.9, 1.4, 1.4]}>
      <Bin x={0} z={0} color="#4d6a52" detail />
    </group>
    <Flame position={[x, 1.34, BIN.z + 0.05]} scale={0.58} frame={frame} />
    <Flame position={[x - 0.42, 1.34, BIN.z + 0.12]} scale={0.34} frame={frame + 3} />
    <Flame position={[x + 0.42, 1.34, BIN.z + 0.12]} scale={0.3} frame={frame + 5} />
  </>
);

/** Декоративные кусты в кадке */
const BUSH_BALLS: Array<[number, number, number, number, string]> = [
  [-0.6, 0.85, 0.46, 0.35, "#2fbf4e"], [0.0, 0.95, 0.5, 0.4, "#2fbf4e"], [0.6, 0.85, 0.46, 0.3, "#2fbf4e"], [-0.25, 0.72, 0.42, 0.75, "#2fbf4e"], [0.3, 0.7, 0.42, 0.7, "#2fbf4e"],
];
const Bush: React.FC<{ shake: number; frame: number; x: number }> = ({ shake, frame, x }) => {
  const n = Math.floor(frame / 6); // дрожит рывками раз в 0.2 с
  const ox = shake ? (hash(n, 3) * 2 - 1) * shake : 0;
  const oy = shake ? (hash(n, 8) * 2 - 1) * shake * 0.8 : 0;
  return (
    <group position={[x, 0, BUSH.z]}>
      <Part geo={rbox(1.9, 0.5, 0.8, 0.06)} color="#7a5a8a" px={3.4} position={[0, 0.25, 0]} />
      <Part geo={rbox(2.0, 0.08, 0.86, 0.03)} color="#5e426e" px={3} position={[0, 0.52, 0]} />
      <Part geo={rbox(1.98, 0.08, 0.84, 0.03)} color="#4d3560" px={2.6} position={[0, 0.04, 0]} />
      <group position={[ox, oy, 0]}>
        {BUSH_BALLS.map(([x, y, r, z, c], i) => (
          <Part key={i} geo={sphereGeo(16)} color={c} px={3.2} position={[x, y, z]} scale={r} />
        ))}
      </group>
    </group>
  );
};
const Leaves: React.FC<{ k: number }> = ({ k }) => {
  if (k < 0 || k > 18) return null;
  const kh = Math.floor(k / 2) * 2;
  return (
    <>
      {Array.from({ length: 7 }).map((_, i) => (
        <Chunk
          key={i}
          position={[BUSH.x + (hash(i, 2) - 0.5) * 1.8 + kh * 0.05 * (hash(i, 4) - 0.5) * 3, 1.2 + kh * 0.12 * (0.6 + hash(i, 6)) - kh * kh * 0.004, BUSH.z + 0.5]}
          rot={[kh * 0.3 + i, kh * 0.4, i]}
          s={0.1 + hash(i, 9) * 0.06}
          color={i % 2 ? "#2f9e4a" : "#3bb35a"}
        />
      ))}
    </>
  );
};

const World: React.FC<{ tl: S.Timeline; voices: Array<VoiceInfo | null> }> = ({ tl, voices }) => {
  const frame = useCurrentFrame();
  const sh = S.shotAt(tl, frame);
  const env = useMemo(() => voices.map((v) => v?.env), [voices]);
  const f = frameAt(frame, sh, tl.shots.length, { env });
  const tick = Math.floor(frame / 3) * 2; // огонь: смена формы пламени каждые 3 кадра
  return (
    <>
      <color attach="background" args={[PAL_COLD.sky]} />
      <CameraRig f={f} />
      <group position={[f.bgx, 0, 0]}>
        <Street pal={PAL_COLD} lampOn time={frame} calm simple flat signs={[3]} signLift={1.35} signY={f.signY} />
      </group>
      {f.bin !== null && <BurnBin frame={tick} x={f.bin} />}
      <Bush shake={f.bushShake} frame={frame} x={f.bushX ?? BUSH.x} />
      <Leaves k={f.leaves} />
      {f.dust.map((d, i) => (
        <GroundDust key={i} at={[d.x, 0, d.z]} k={d.k} r={1.1} />
      ))}
      {f.actors.map((a, i) =>
        a.kind === "greg" ? <Person key={a.kind + i} pose={a.pose} kind="greg" s2 /> : <Cast key={a.kind + i} pose={a.pose} kind={a.kind} />,
      )}
    </>
  );
};

export const Scene2: React.FC<Scene2Props> = ({ audio, voices }) => {
  STYLE.v5 = true; // яркие плоские цвета, 2-ступенчатый свет, контур 5.6 px
  // направленный свет справа-сверху (двухступенчатая тень чётко меняется при развороте тел и голов)
  LIGHT_DIR.set(0.62, 0.7, 0.36).normalize();
  const tl = useMemo(() => S.buildTimeline(voices.map((v) => v?.dur ?? null)), [voices]);
  const cues = useMemo(() => S.buildCues(tl), [tl]);
  return (
    <AbsoluteFill style={{ backgroundColor: "#0e2a66" }}>
      <Poster />
      <AbsoluteFill style={{ filter: "url(#poster)" }}>
        <ThreeCanvas width={S.WIDTH} height={S.HEIGHT} flat camera={{ fov: FOV, position: [5.4, 1.9, 4.9], near: 0.5, far: 400 }}>
          <World tl={tl} voices={voices} />
        </ThreeCanvas>
      </AbsoluteFill>
      <AudioLayers cues={cues} avail={audio} total={tl.total} />
    </AbsoluteFill>
  );
};
void rcyl;
