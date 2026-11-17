import React from "react";
import { Easing, interpolate } from "remotion";

/**
 * Виртуальная камера для «бумажного» мира 1080×1920.
 * Ключи камеры: центр кадра (cx, cy) в координатах мира, zoom (1 = весь холст), rot (градусы, голландский угол).
 * Между ключами — плавный easing; поверх — ручная дрожь (handheld) и удары-пунши.
 */
export type CamEase = "inOut" | "out" | "in" | "linear" | "snap" | "hold";

export type CamKey = {
  /** локальный кадр шота */
  f: number;
  cx: number;
  cy: number;
  zoom: number;
  rot?: number;
  /** easing от ПРЕДЫДУЩЕГО ключа к этому */
  ease?: CamEase;
};

export type Punch = { f: number; amp: number; dir?: number };

const easeFn = (e: CamEase | undefined) => {
  switch (e) {
    case "out":
      return Easing.out(Easing.cubic);
    case "in":
      return Easing.in(Easing.cubic);
    case "linear":
      return (t: number) => t;
    case "snap":
      return Easing.out(Easing.back(1.8));
    case "hold":
      return () => 0;
    case "inOut":
    default:
      return Easing.bezier(0.45, 0.05, 0.25, 1);
  }
};

export const sampleCamera = (keys: CamKey[], f: number) => {
  if (f <= keys[0].f) {
    const k = keys[0];
    return { cx: k.cx, cy: k.cy, zoom: k.zoom, rot: k.rot ?? 0 };
  }
  for (let i = 1; i < keys.length; i++) {
    if (f <= keys[i].f || i === keys.length - 1) {
      const a = keys[i - 1];
      const b = keys[i];
      const t = b.f === a.f ? 1 : Math.min(1, Math.max(0, (f - a.f) / (b.f - a.f)));
      const e = easeFn(b.ease)(t);
      const lerp = (p: number, q: number) => p + (q - p) * e;
      // zoom интерполируем в логарифмическом пространстве — наезд ощущается равномерным
      const zoom = Math.exp(lerp(Math.log(a.zoom), Math.log(b.zoom)));
      return {
        cx: lerp(a.cx, b.cx),
        cy: lerp(a.cy, b.cy),
        zoom,
        rot: lerp(a.rot ?? 0, b.rot ?? 0),
      };
    }
  }
  const k = keys[keys.length - 1];
  return { cx: k.cx, cy: k.cy, zoom: k.zoom, rot: k.rot ?? 0 };
};

export const Camera: React.FC<{
  keys: CamKey[];
  frame: number;
  /** сила ручной дрожи, px при zoom=1 (0 — штатив) */
  handheld?: number;
  punches?: Punch[];
  seed?: number;
  children: React.ReactNode;
}> = ({ keys, frame, handheld = 3, punches = [], seed = 0, children }) => {
  const c = sampleCamera(keys, frame);
  const s = seed * 17.3;
  // Ручная дрожь: сумма несоизмеримых синусов — «дыхание оператора»
  const hx =
    Math.sin(frame * 0.11 + s) * 1.0 +
    Math.sin(frame * 0.27 + s * 2) * 0.5 +
    Math.sin(frame * 0.53 + s * 3) * 0.2;
  const hy =
    Math.cos(frame * 0.09 + s * 1.3) * 1.0 +
    Math.sin(frame * 0.31 + s) * 0.45 +
    Math.cos(frame * 0.61 + s) * 0.2;
  const hr = Math.sin(frame * 0.07 + s) * 0.18 + Math.sin(frame * 0.23 + s) * 0.08;

  let px = 0;
  let py = 0;
  let pr = 0;
  let pz = 0;
  for (const p of punches) {
    const dt = frame - p.f;
    if (dt < 0 || dt > 14) continue;
    const decay = Math.exp(-dt * 0.32);
    const osc = Math.cos(dt * 1.9);
    const dir = p.dir ?? 1;
    px += Math.sin(p.f * 12.9898) * p.amp * decay * osc;
    py += Math.cos(p.f * 78.233) * p.amp * decay * osc;
    pr += dir * p.amp * 0.012 * decay * osc;
    pz += p.amp * 0.0016 * decay * Math.max(0, osc);
  }

  const zoom = c.zoom * (1 + pz);
  const tx = c.cx + (hx * handheld + px) / zoom;
  const ty = c.cy + (hy * handheld + py) / zoom;
  const rot = c.rot + hr * (handheld / 3) + pr;

  return (
    <div
      style={{
        position: "absolute",
        left: 0,
        top: 0,
        width: 1080,
        height: 1920,
        overflow: "hidden",
      }}
    >
      <div
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          width: 1080,
          height: 1920,
          transformOrigin: "540px 960px",
          transform: `translate(0px,0px) scale(${zoom}) rotate(${rot}deg) translate(${540 - tx}px, ${960 - ty}px)`,
        }}
      >
        {children}
      </div>
    </div>
  );
};

/** нормализованный прогресс внутри окна кадров */
export const prog = (f: number, a: number, b: number) =>
  interpolate(f, [a, b], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

/** значение огибающей рта (24 значения/с) в момент t (сек) */
export const mouthAt = (env: number[] | undefined, tSec: number, gain = 1.0) => {
  if (!env || env.length === 0 || tSec < 0) return 0;
  const i = tSec * 24;
  const i0 = Math.floor(i);
  if (i0 >= env.length - 1) return 0;
  const v = env[i0] + (env[i0 + 1] - env[i0]) * (i - i0);
  return Math.min(1, v * gain);
};

/** ширина рта по гласным (0 = «о/у», 1 = «и/э»); по умолчанию нейтральная */
export const vowelAt = (env: number[] | undefined, tSec: number) => {
  if (!env || env.length < 2 || tSec < 0) return 0.5;
  const i = tSec * 24;
  const i0 = Math.min(env.length - 2, Math.floor(i));
  return env[i0] + (env[i0 + 1] - env[i0]) * Math.min(1, i - i0);
};
