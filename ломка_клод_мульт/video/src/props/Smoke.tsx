import React from "react";
import { clamp, easeOut, rnd } from "./util";

export type SmokeProps = {
  frame: number;
  /** 0..1 */
  density?: number;
  /** кадр начала */
  from?: number;
  width?: number;
  height?: number;
};

const N = 34;
const PERIOD = 96;

export const Smoke: React.FC<SmokeProps> = ({ frame, density = 1, from = 0, width = 1080, height = 1920 }) => {
  const t = frame - from;
  if (t < 0 || density <= 0) return null;
  const ramp = easeOut(t / 30);
  const d = clamp(density) * ramp;
  const k = height / 1920;
  const puffs = [];
  for (let i = 0; i < N; i++) {
    if (i / N > d) continue;
    const off = rnd(i + 1) * PERIOD;
    const age = ((t + off) % PERIOD) / PERIOD; // 0..1
    const x0 = rnd(i + 50) * width;
    const sway = Math.sin((t + off) * 0.04 + i) * 70;
    const x = x0 + sway + (x0 - width / 2) * age * 0.5;
    const y = (height * 1.02 - age * height * 1.15) ;
    const r = (110 + rnd(i + 90) * 120) * (0.6 + age * 1.5) * (0.5 + 0.5 * k + 0.2);
    const a = Math.sin(age * Math.PI) * 0.8 * (0.5 + d * 0.5);
    const tone = 28 + Math.floor(rnd(i + 7) * 55);
    const rot = rnd(i + 3) * 360 + t * (rnd(i + 5) - 0.5) * 1.5;
    puffs.push(
      <g key={i} transform={`translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${rot.toFixed(1)})`} opacity={a}>
        <circle r={r} fill={`rgb(${tone},${tone},${tone + 4})`} stroke="rgba(10,8,8,.55)" strokeWidth={4} />
        <circle cx={r * 0.55} cy={-r * 0.2} r={r * 0.6} fill={`rgb(${tone + 12},${tone + 12},${tone + 16})`} />
        <circle cx={-r * 0.5} cy={r * 0.25} r={r * 0.5} fill={`rgb(${tone - 8},${tone - 8},${tone - 6})`} />
      </g>,
    );
  }
  const haze = 0.62 * d;
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ position: "absolute", left: 0, top: 0, pointerEvents: "none" }}>
      <defs>
        <linearGradient id="smk-haze" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#0c0b0b" stopOpacity={haze} />
          <stop offset="0.7" stopColor="#1d1b1b" stopOpacity={haze * 0.55} />
          <stop offset="1" stopColor="#2a2727" stopOpacity={haze * 0.25} />
        </linearGradient>
      </defs>
      <rect width={width} height={height} fill="url(#smk-haze)" />
      {puffs}
    </svg>
  );
};
