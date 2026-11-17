import React from "react";
import { interpolate } from "remotion";
import { Artyom, Katya } from "../scene1/characters";
import type { Emotion, ArmPose } from "../scene1/characters";
import { mouthAt, vowelAt } from "../scene1/CameraRig";
import type { Punch } from "../scene1/CameraRig";

export const FPS = 24;
export const fr = (s: number) => Math.round(s * FPS);

export type Line = { id: string; who: string; text: string; startSec: number; endSec: number; mouth: number[]; vowel?: number[] };
export type Seg<T> = [number, T][];
export const track = <T,>(segs: Seg<T>, t: number) => {
  let i = 0;
  for (let k = 0; k < segs.length; k++) if (t >= segs[k][0]) i = k;
  return { cur: segs[i][1], prev: i > 0 ? segs[i - 1][1] : undefined, since: Math.round(segs[i][0] * FPS) };
};

export type Place = { x: number; y: number; s: number };
export type CharProps = Place & {
  who: "a" | "k";
  gf: number;
  view: "front" | "side";
  facing?: "left" | "right";
  upperBodyOnly?: boolean;
  look?: { x: number; y: number };
  armL?: ArmPose;
  armR?: ArmPose;
  twitch?: number;
  sweat?: number;
  tear?: number;
  emo?: Emotion;
  soot?: number;
  smoke?: number;
  walk?: number;
  lean?: number;
  crouch?: number;
  light?: string;
  outfit?: "dress" | "robe";
  mascara?: number;
  cry?: number;
  rotate?: number;
};

/** персонаж в мире; эмоции — треки, рот — по репликам */
export const makeChar = (emoA: Seg<Emotion>, emoK: Seg<Emotion>, linesA: Line[], linesK: Line[]) => {
  const mouthFor = (who: "a" | "k", gf: number) => {
    const t = gf / FPS;
    for (const l of who === "a" ? linesA : linesK) if (t >= l.startSec && t <= l.endSec + 0.1) return mouthAt(l.mouth, t - l.startSec);
    return 0;
  };
  const vowelFor = (who: "a" | "k", gf: number) => {
    const t = gf / FPS;
    for (const l of who === "a" ? linesA : linesK) if (t >= l.startSec && t <= l.endSec + 0.1) return vowelAt(l.vowel, t - l.startSec);
    return 0.5;
  };
  const Char: React.FC<CharProps> = ({ who, gf, x, y, s, emo, ...rest }) => {
    const e = track(who === "a" ? emoA : emoK, gf / FPS);
    const C = (who === "a" ? Artyom : Katya) as React.FC<any>;
    return (
      <div style={{ position: "absolute", left: 0, top: 0, width: 1000, height: 1400, transform: `translate(${x}px,${y}px) scale(${s})`, transformOrigin: "0 0" }}>
        <C
          frame={gf}
          mouth={mouthFor(who, gf)} vowel={vowelFor(who, gf)}
          emotion={emo ?? e.cur}
          prevEmotion={emo ? undefined : e.prev}
          emotionSince={e.since}
          {...(rest as object)}
        />
      </div>
    );
  };
  return Char;
};

export const lookAround = (t: number) => ({ x: Math.sin(t * 1.3) * 0.25, y: Math.max(0, Math.sin(t * 2.3 + 1)) * 0.9 - 0.1 });

/** пики громкости реплики → удары камеры */
export function peaks(l: Line, a: number, b: number): Punch[] {
  const out: Punch[] = [];
  const n = l.mouth.length;
  const i0 = Math.floor(n * a), i1 = Math.floor(n * b);
  let last = -99;
  for (let i = Math.max(1, i0); i < i1; i++) {
    if (l.mouth[i] > 0.55 && l.mouth[i] - l.mouth[i - 2 < 0 ? 0 : i - 2] > 0.28 && i - last > 5) {
      out.push({ f: i - i0, amp: 14 + l.mouth[i] * 26, dir: out.length % 2 ? 1 : -1 });
      last = i;
    }
  }
  return out;
}

export const Grain: React.FC<{ gf: number }> = ({ gf }) => {
  const seed = Math.floor(gf / 2) % 7;
  return (
    <svg width={1080} height={1920} style={{ position: "absolute", inset: 0, mixBlendMode: "multiply", opacity: 0.22, pointerEvents: "none" }}>
      <filter id="paperGrain" x="0" y="0" width="100%" height="100%">
        <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves={2} seed={seed} />
        <feColorMatrix type="matrix" values="0 0 0 0 0.55  0 0 0 0 0.45  0 0 0 0 0.38  0 0 0 0.9 0" />
      </filter>
      <rect width={1080} height={1920} filter="url(#paperGrain)" />
    </svg>
  );
};

export const Vignette: React.FC<{ gf: number; strength?: number }> = ({ gf, strength = 0.62 }) => {
  const flick = 0.92 + Math.sin(gf * 0.9) * 0.02 + Math.sin(gf * 2.3) * 0.015;
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        background: `radial-gradient(ellipse at 50% 46%, rgba(0,0,0,0) 36%, rgba(10,4,2,${Math.min(1, strength * flick)}) 100%)`,
        pointerEvents: "none",
      }}
    />
  );
};

export const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
export const lerpClamp = (t: number, a: number, b: number, x: number, y: number) =>
  interpolate(t, [a, b], [x, y], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
