// СЦЕНА 4 «Закон и порядок»: тот же перекрёсток, ночь, кадры 19-27. Вид как в сцене 2 (v7): плоские 2-ступенчатые материалы, толстый контур, постеризация кадра.
import React, { useLayoutEffect, useMemo } from "react";
import * as THREE from "three";
import { ThreeCanvas } from "@remotion/three";
import { AbsoluteFill, Composition, staticFile, useCurrentFrame } from "remotion";
import { useThree } from "@react-three/fiber";
import { AudioAvail, AudioLayers, probeAudio } from "./engine/audio";
import { probeWav, VoiceInfo } from "./engine/wav";
import * as S from "./data/scene4";
import { FOV, LIGHT_DIR, STYLE } from "./three/toon";
import { Street, PAL_NIGHT } from "./three/Env";
import { Cam, renderShot } from "./three/anim4";

/** Постеризация кадра: каждый канал схлопывается в N плоских ступеней */
const POSTER_LEVELS = 6;
const posterTable = Array.from({ length: POSTER_LEVELS }, (_, i) => (i / (POSTER_LEVELS - 1)).toFixed(4)).join(" ");
const Poster: React.FC = () => (
  <svg width="0" height="0" style={{ position: "absolute" }} aria-hidden>
    <defs>
      <filter id="poster4" colorInterpolationFilters="sRGB" x="0" y="0" width="100%" height="100%">
        <feComponentTransfer>
          <feFuncR type="discrete" tableValues={posterTable} />
          <feFuncG type="discrete" tableValues={posterTable} />
          <feFuncB type="discrete" tableValues={posterTable} />
        </feComponentTransfer>
      </filter>
    </defs>
  </svg>
);

export type Scene4Props = { audio: AudioAvail; voices: Array<VoiceInfo | null>; names: S.S4Audio };
const NO_NAMES: S.S4Audio = { avail: {}, voices: [null, null, null, null, null, null], sfx: {} };

const CameraRig: React.FC<{ cam: Cam }> = ({ cam }) => {
  const { camera } = useThree();
  useLayoutEffect(() => {
    camera.position.set(cam.x, cam.y, cam.z);
    camera.lookAt(cam.tx, cam.ty, cam.tz ?? 0);
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
  const out = renderShot(frame, sh, { env });
  return (
    <>
      <color attach="background" args={[out.street ? PAL_NIGHT.sky : "#f2a58a"]} />
      <CameraRig cam={out.cam} />
      {out.street && <Street pal={PAL_NIGHT} lampOn time={frame} calm simple flat signs={[3]} signLift={1.35} />}
      {out.node}
    </>
  );
};

/** Финальный титр: неоновый розовый с голубым контуром, плоский, без градиентов и свечения */
const Title: React.FC = () => {
  const font = "Impact, 'Arial Black', 'DejaVu Sans', sans-serif";
  const common = { fontFamily: font, fontWeight: 900 as const, fontStyle: "italic" as const, textAnchor: "middle" as const, lengthAdjust: "spacingAndGlyphs" as const };
  return (
    <svg width={S.WIDTH} height={S.HEIGHT} viewBox={`0 0 ${S.WIDTH} ${S.HEIGHT}`} style={{ position: "absolute", left: 0, top: 0 }}>
      <g transform="translate(960 0) skewX(-9)">
        {/* жёсткая сдвинутая тень (плоская), затем голубой контур, затем розовая заливка */}
        {[
          { t: "ДОБРО ПОЖАЛОВАТЬ", y: 470, size: 150, len: 1560 },
          { t: "В ВАЙС-СИТИ", y: 690, size: 210, len: 1220 },
        ].map((l, i) => (
          <g key={i}>
            <text x={14} y={l.y + 14} fontSize={l.size} textLength={l.len} fill="#0a5f8a" stroke="#0a5f8a" strokeWidth={26} strokeLinejoin="round" {...common}>
              {l.t}
            </text>
            <text x={0} y={l.y} fontSize={l.size} textLength={l.len} fill="#2de2ff" stroke="#2de2ff" strokeWidth={26} strokeLinejoin="round" {...common}>
              {l.t}
            </text>
            <text x={0} y={l.y} fontSize={l.size} textLength={l.len} fill="#ff2bb4" {...common}>
              {l.t}
            </text>
          </g>
        ))}
        <rect x={-640} y={770} width={1280} height={14} fill="#2de2ff" />
        <rect x={-520} y={800} width={1040} height={8} fill="#ff2bb4" />
      </g>
    </svg>
  );
};

export const Scene4: React.FC<Scene4Props> = ({ audio, voices, names }) => {
  STYLE.v5 = true;
  LIGHT_DIR.set(0.62, 0.7, 0.36).normalize();
  const frame = useCurrentFrame();
  const tl = useMemo(() => S.buildTimeline(voices.map((v) => v?.dur ?? null)), [voices]);
  const cues = useMemo(() => S.buildCues(tl, names), [tl, names]);
  const sh = S.shotAt(tl, frame);
  const isTitle = sh.id === "s27";
  const out = isTitle ? null : renderShot(frame, sh, { env: voices.map((v) => v?.env) });
  return (
    <AbsoluteFill style={{ backgroundColor: "#000" }}>
      <Poster />
      {!isTitle && (
        <AbsoluteFill style={{ filter: "url(#poster4)" }}>
          <ThreeCanvas width={S.WIDTH} height={S.HEIGHT} flat camera={{ fov: FOV, position: [0, 2, 10], near: 0.5, far: 400 }}>
            <World tl={tl} voices={voices} />
          </ThreeCanvas>
        </AbsoluteFill>
      )}
      {out?.flash && <AbsoluteFill style={{ backgroundColor: "#fff4cc" }} />}
      {isTitle && frame - sh.from >= 3 && <Title />}
      <AudioLayers cues={cues} avail={audio} total={tl.total} />
    </AbsoluteFill>
  );
};

/** Имена файлов реплик: из voice_s4_durations.json, иначе перебор вариантов */
const resolveVoices = async (): Promise<Array<string | null>> => {
  let keys: string[] = [];
  try {
    const res = await fetch(staticFile("audio/voice_s4_durations.json"));
    const ct = res.headers.get("content-type") || "";
    if (res.ok && !ct.includes("text/html")) keys = Object.keys(await res.json());
  } catch {
    /* нет json */
  }
  const out: Array<string | null> = [];
  for (let i = 0; i < S.VOICE_NN.length; i++) {
    const hit = keys.find((k) => k.startsWith(`voice_s4_${S.VOICE_NN[i]}_`));
    if (hit) {
      out.push(hit.replace(/\.(wav|mp3)$/i, ""));
      continue;
    }
    const avail = await probeAudio(S.VOICE_GUESS[i].map((base) => ({ base, from: 0 })));
    out.push(S.VOICE_GUESS[i].find((b) => avail[b]) ?? null);
  }
  return out;
};

export const Scene4Comp: React.FC = () => (
  <Composition
    id="Scene4"
    component={Scene4}
    durationInFrames={S.DEFAULT_TIMELINE.total}
    fps={S.FPS}
    width={S.WIDTH}
    height={S.HEIGHT}
    defaultProps={{ audio: {}, voices: [null, null, null, null, null, null], names: NO_NAMES } satisfies Scene4Props}
    calculateMetadata={async () => {
      const vnames = await resolveVoices();
      const voices = await Promise.all(vnames.map((n) => (n ? probeWav(staticFile(`audio/${n}.wav`), S.FPS) : Promise.resolve(null))));
      const roles = Object.keys(S.SFX_CANDS);
      const cands = Array.from(new Set(roles.flatMap((r) => S.SFX_CANDS[r])));
      const found = await probeAudio(cands.map((base) => ({ base, from: 0 })));
      const sfx: S.SfxNames = {};
      for (const r of roles) sfx[r] = S.SFX_CANDS[r].find((b) => found[b]) ?? null;
      const names: S.S4Audio = { avail: {}, voices: vnames.map((n, i) => (voices[i] ? n : null)), sfx };
      const tl = S.buildTimeline(voices.map((v) => v?.dur ?? null));
      const audio = await probeAudio(S.buildCues(tl, names));
      return { durationInFrames: tl.total, props: { audio, voices, names } };
    }}
  />
);
void PAL_NIGHT;
