import React from "react";
import { interpolate } from "remotion";
import { mouthAt, prog, vowelAt } from "../scene1/CameraRig";
import type { Punch } from "../scene1/CameraRig";
import { Artyom, Katya } from "../scene1/characters";
import type { Emotion, CharacterProps } from "../scene1/characters";

export const FPS = 24;
export const fr = (s: number) => Math.round(s * FPS);
export { prog };

export type Line = { id: string; who: string; text: string; startSec: number; endSec: number; mouth: number[]; vowel?: number[] };
export const mkLines = (arr: unknown) => Object.fromEntries((arr as Line[]).map((l) => [l.id, l])) as Record<string, Line>;
export const mkCues = (arr: unknown) => Object.fromEntries((arr as { id: string; sec: number }[]).map((c) => [c.id, c.sec])) as Record<string, number>;

export type Seg<T> = [number, T][];
export const track = <T,>(segs: Seg<T>, t: number) => {
  let i = 0;
  for (let k = 0; k < segs.length; k++) if (t >= segs[k][0]) i = k;
  return { cur: segs[i][1], prev: i > 0 ? segs[i - 1][1] : undefined, since: Math.round(segs[i][0] * FPS) };
};

export const mouthFor = (lines: Line[], gf: number) => {
  const t = gf / FPS;
  for (const l of lines) if (t >= l.startSec && t <= l.endSec + 0.1) return mouthAt(l.mouth, t - l.startSec);
  return 0;
};
export const vowelFor = (lines: Line[], gf: number) => {
  const t = gf / FPS;
  for (const l of lines) if (t >= l.startSec && t <= l.endSec + 0.1) return vowelAt(l.vowel, t - l.startSec);
  return 0.5;
};

export type Place = { x: number; y: number; s: number };
/** центр головы (500,390) → (cx,cy) при масштабе s */
export const headAt = (cx: number, cy: number, s: number): Place => ({ x: cx - 500 * s, y: cy - 390 * s, s });
/** стоя в полный рост: центр тела xc, ступни на feetY */
export const feetAt = (xc: number, feetY: number, s: number): Place => ({ x: xc - 500 * s, y: feetY - 1170 * s, s });
export const CU_S = 1.5;
export const CU: Place = headAt(540, 800, CU_S);
export const FACE = { cx: 540, cy: 800 };

type CharProps = Partial<Omit<CharacterProps, "frame" | "view" | "mouth" | "emotion">> & {
  who: "a" | "k";
  gf: number;
  view: "front" | "side";
  emoTrack: Seg<Emotion>;
  lines: Line[];
  emo?: Emotion;
  flipX?: boolean;
};
export const Char: React.FC<Place & CharProps> = ({ who, gf, x, y, s, emoTrack, lines, emo, flipX, view, ...rest }) => {
  const e = track(emoTrack, gf / FPS);
  const C = who === "a" ? Artyom : Katya;
  return (
    <div style={{ position: "absolute", left: 0, top: 0, width: 1000, height: 1400, transform: `translate(${x}px,${y}px) scale(${flipX ? -s : s},${s})`, transformOrigin: "0 0" }}>
      <C frame={gf} view={view} mouth={mouthFor(lines, gf)} vowel={vowelFor(lines, gf)} emotion={emo ?? e.cur} prevEmotion={emo ? undefined : e.prev} emotionSince={e.since} {...(rest as object)} />
    </div>
  );
};

export function peaks(l: Line, a: number, b: number, mul = 1): Punch[] {
  const out: Punch[] = [];
  const n = l.mouth.length;
  const i0 = Math.floor(n * a), i1 = Math.floor(n * b);
  let last = -99;
  for (let i = Math.max(2, i0); i < i1; i++) {
    if (l.mouth[i] > 0.55 && l.mouth[i] - l.mouth[i - 2] > 0.28 && i - last > 5) {
      out.push({ f: i - i0 + Math.round((l.startSec + (l.endSec - l.startSec) * a) * FPS) - Math.round((l.startSec + (l.endSec - l.startSec) * a) * FPS) , amp: (14 + l.mouth[i] * 26) * mul, dir: out.length % 2 ? 1 : -1 });
      last = i;
    }
  }
  return out;
}
/** пики с абсолютным окном секунд, локальный кадр = от начала шота */
export function peaksAbs(l: Line, fromSec: number, toSec: number, shotFromSec: number, mul = 1): Punch[] {
  const out: Punch[] = [];
  let last = -99;
  const i0 = Math.max(2, Math.round((fromSec - l.startSec) * FPS));
  const i1 = Math.min(l.mouth.length, Math.round((toSec - l.startSec) * FPS));
  for (let i = i0; i < i1; i++) {
    if (l.mouth[i] > 0.55 && l.mouth[i] - l.mouth[i - 2] > 0.28 && i - last > 5) {
      const lf = Math.round((l.startSec - shotFromSec) * FPS) + i;
      out.push({ f: lf, amp: (14 + l.mouth[i] * 26) * mul, dir: out.length % 2 ? 1 : -1 });
      last = i;
    }
  }
  return out;
}

export const Grain: React.FC<{ gf: number; id?: string }> = ({ gf, id = "pg2" }) => {
  const seed = Math.floor(gf / 2) % 7;
  return (
    <svg width={1080} height={1920} style={{ position: "absolute", inset: 0, mixBlendMode: "multiply", opacity: 0.22, pointerEvents: "none" }}>
      <filter id={id} x="0" y="0" width="100%" height="100%">
        <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves={2} seed={seed} />
        <feColorMatrix type="matrix" values="0 0 0 0 0.55  0 0 0 0 0.45  0 0 0 0 0.38  0 0 0 0.9 0" />
      </filter>
      <rect width={1080} height={1920} filter={`url(#${id})`} />
    </svg>
  );
};

export const Vignette: React.FC<{ gf: number; strength?: number }> = ({ gf, strength = 0.62 }) => {
  const flick = 0.92 + Math.sin(gf * 0.9) * 0.02 + Math.sin(gf * 2.3) * 0.015;
  return (
    <div style={{ position: "absolute", inset: 0, background: `radial-gradient(ellipse at 50% 46%, rgba(0,0,0,0) 40%, rgba(10,4,2,${strength * flick}) 100%)`, pointerEvents: "none" }} />
  );
};

export const clampI = (v: number, a: number, b: number, o0: number, o1: number) =>
  interpolate(v, [a, b], [o0, o1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

/** экран мёртвого/разряженного телефона (вид от первого лица, 1080×1920) */
export const DeadPhone: React.FC<{ gf: number; text?: string }> = ({ gf, text = "0%" }) => {
  const blink = Math.floor(gf / 8) % 2 === 0;
  return (
    <div style={{ position: "absolute", inset: 0, background: "#050505", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 40 }}>
      <svg width={420} height={220} viewBox="0 0 420 220">
        <rect x={10} y={30} width={360} height={160} rx={26} fill="none" stroke={blink ? "#e11d2a" : "#6b1015"} strokeWidth={14} />
        <rect x={376} y={80} width={28} height={60} rx={8} fill={blink ? "#e11d2a" : "#6b1015"} />
        <rect x={32} y={52} width={22} height={116} rx={6} fill="#e11d2a" opacity={blink ? 1 : 0.4} />
      </svg>
      <div style={{ fontFamily: "Arial Black, Impact, sans-serif", fontSize: 120, color: "#e11d2a", opacity: 0.9 }}>{text}</div>
      <div style={{ fontFamily: "Arial Black, Impact, sans-serif", fontSize: 54, color: "#c9c2b8", textAlign: "center", width: 860, opacity: 0.85 }}>You've reached your usage limit</div>
    </div>
  );
};
