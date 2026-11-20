// СЦЕНА 2 «Освобождение»: та же ночная улица (холодная палитра после исчезновения), кадры 07-12.
import React, { useLayoutEffect, useMemo } from "react";
import * as THREE from "three";
import { ThreeCanvas } from "@remotion/three";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { useThree } from "@react-three/fiber";
import { AudioAvail, AudioLayers } from "./engine/audio";
import type { VoiceInfo } from "./engine/wav";
import * as S from "./data/scene2";
import { FOV, Part, rbox, rcyl, sphereGeo, LIGHT_DIR } from "./three/toon";
import { Person } from "./three/Person";
import { Cast } from "./three/Cast";
import { Street, PAL_COLD, Bin } from "./three/Env";
import { Flame, SmokeColumn, GroundDust, Chunk } from "./three/Fx";
import { frameAt, BIN, BUSH, Frame } from "./three/anim2";
import { hash, hold } from "./three/util";

export type Scene2Props = { audio: AudioAvail; voices: Array<VoiceInfo | null> };

const CameraRig: React.FC<{ f: Frame }> = ({ f }) => {
  const { camera } = useThree();
  useLayoutEffect(() => {
    camera.position.set(f.cam.x, f.cam.y, f.cam.z);
    camera.lookAt(f.cam.tx, f.cam.ty, 0);
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
  [-0.55, 0.9, 0.4, 0.42, "#2f9e4a"], [-0.1, 1.1, 0.46, 0.2, "#3bb35a"], [0.4, 1.0, 0.42, 0.3, "#2f9e4a"], [0.7, 0.8, 0.34, 0.1, "#3bb35a"], [0.05, 0.75, 0.42, -0.25, "#34a853"], [-0.4, 0.68, 0.34, -0.2, "#3bb35a"],
  [-0.75, 0.72, 0.3, 0.05, "#34a853"], [0.2, 0.95, 0.36, -0.3, "#2f9e4a"], [0.55, 0.62, 0.3, 0.32, "#34a853"], [-0.2, 0.6, 0.32, 0.34, "#2f9e4a"], [0.0, 1.28, 0.28, 0.0, "#3bb35a"],
];
const Bush: React.FC<{ shake: number; frame: number }> = ({ shake, frame }) => {
  const n = Math.floor(frame / 2);
  const ox = shake ? (hash(n, 3) * 2 - 1) * shake : 0;
  const oy = shake ? (hash(n, 8) * 2 - 1) * shake * 0.8 : 0;
  return (
    <group position={[BUSH.x, 0, BUSH.z]}>
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
  const kh = hold(k, 2);
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
  return (
    <>
      <color attach="background" args={[PAL_COLD.sky]} />
      <CameraRig f={f} />
      <group position={[f.bgx, 0, 0]}>
        <Street pal={PAL_COLD} lampOn time={frame} calm simple signs={[3]} signLift={0.32} />
      </group>
      {f.bin !== null && <BurnBin frame={frame} x={f.bin} />}
      <Bush shake={f.bushShake} frame={frame} />
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
  // направленный свет справа-сверху (двухступенчатая тень чётко меняется при развороте тел и голов)
  LIGHT_DIR.set(0.62, 0.7, 0.36).normalize();
  const tl = useMemo(() => S.buildTimeline(voices.map((v) => v?.dur ?? null)), [voices]);
  const cues = useMemo(() => S.buildCues(tl), [tl]);
  return (
    <AbsoluteFill style={{ backgroundColor: "#0e2a66" }}>
      <ThreeCanvas width={S.WIDTH} height={S.HEIGHT} flat camera={{ fov: FOV, position: [5.4, 1.9, 4.9], near: 0.5, far: 400 }}>
        <World tl={tl} voices={voices} />
      </ThreeCanvas>
      <AudioLayers cues={cues} avail={audio} total={tl.total} />
    </AbsoluteFill>
  );
};
void rcyl;
