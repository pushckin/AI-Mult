import React from "react";
import { INK, FPS } from "./util";
import { Smoke } from "./Smoke";

export type TimersProps = { frame: number; startSeconds?: number };

/** 7-сегментные цифры */
const SEG: Record<string, number[]> = {
  "0": [1, 1, 1, 0, 1, 1, 1], "1": [0, 0, 1, 0, 0, 1, 0], "2": [1, 0, 1, 1, 1, 0, 1], "3": [1, 0, 1, 1, 0, 1, 1],
  "4": [0, 1, 1, 1, 0, 1, 0], "5": [1, 1, 0, 1, 0, 1, 1], "6": [1, 1, 0, 1, 1, 1, 1], "7": [1, 0, 1, 0, 0, 1, 0],
  "8": [1, 1, 1, 1, 1, 1, 1], "9": [1, 1, 1, 1, 0, 1, 1],
};
const Digit: React.FC<{ x: number; d: string }> = ({ x, d }) => {
  const on = SEG[d];
  const w = 60, h = 110, t = 14;
  const segs: [number, number, number, number][] = [
    [t, 0, w - 2 * t, t], [0, t, t, h / 2 - t], [w - t, t, t, h / 2 - t],
    [t, h / 2 - t / 2, w - 2 * t, t], [0, h / 2, t, h / 2 - t], [w - t, h / 2, t, h / 2 - t], [t, h - t, w - 2 * t, t],
  ];
  return (
    <g transform={`translate(${x} 0)`}>
      {segs.map((s, i) => (
        <rect key={i} x={s[0]} y={s[1]} width={s[2]} height={s[3]} rx={5} fill={on[i] ? "#ff2a1f" : "#3a0d0b"} style={on[i] ? { filter: "drop-shadow(0 0 8px #ff2a1f)" } : undefined} />
      ))}
    </g>
  );
};

const Timer: React.FC<{ frame: number; x: number; label: string; total: number; tilt: number }> = ({ frame, x, label, total, tilt }) => {
  const left = Math.max(0, total - Math.floor(frame / FPS));
  const h = Math.floor(left / 3600), m = Math.floor((left % 3600) / 60), s = left % 60;
  const str = `${h}${String(m).padStart(2, "0")}${String(s).padStart(2, "0")}`;
  const colon = Math.floor(frame / 12) % 2 === 0;
  return (
    <g transform={`translate(${x} 0) rotate(${tilt} 220 480)`} style={{ filter: "drop-shadow(0 10px 12px rgba(0,0,0,.45))" }}>
      <path d="M 60 560 L 380 560 L 400 610 L 40 610 Z" fill="#6a4a30" stroke={INK} strokeWidth={5} strokeLinejoin="round" />
      <rect x={0} y={250} width={440} height={310} rx={26} fill="#2b2a2e" stroke={INK} strokeWidth={6} />
      <rect x={24} y={274} width={392} height={190} rx={14} fill="#120606" stroke={INK} strokeWidth={4} />
      <g transform="translate(32 316)">
        <Digit x={0} d={str[0]} />
        <g opacity={colon ? 1 : 0.15}><circle cx={75} cy={34} r={7} fill="#ff2a1f" /><circle cx={75} cy={76} r={7} fill="#ff2a1f" /></g>
        <Digit x={92} d={str[1]} />
        <Digit x={160} d={str[2]} />
        <g opacity={colon ? 1 : 0.15}><circle cx={237} cy={34} r={7} fill="#ff2a1f" /><circle cx={237} cy={76} r={7} fill="#ff2a1f" /></g>
        <Digit x={254} d={str[3]} />
        <Digit x={322} d={str[4]} />
      </g>
      <text x={220} y={530} textAnchor="middle" fontFamily="Arial Black, Impact, sans-serif" fontSize={58} fill="#f3ead2" stroke={INK} strokeWidth={2}>{label}</text>
    </g>
  );
};

export const Timers: React.FC<TimersProps> = ({ frame, startSeconds = 4 * 3600 + 55 * 60 }) => (
  <div style={{ position: "absolute", left: 0, top: 0, width: 1080, height: 700 }}>
    <svg width={1080} height={700} viewBox="0 0 1080 700" style={{ position: "absolute", left: 0, top: 0 }}>
      <defs>
        <linearGradient id="tm-table" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#a9713f" />
          <stop offset="1" stopColor="#7a4c27" />
        </linearGradient>
      </defs>
      <rect y={560} width={1080} height={140} fill="url(#tm-table)" stroke={INK} strokeWidth={5} />
      <g transform="translate(0 -20)">
        <Timer frame={frame} x={70} label="АРТЁМ" total={startSeconds} tilt={-2} />
        <Timer frame={frame} x={570} label="КАТЯ" total={startSeconds} tilt={2} />
      </g>
    </svg>
    <Smoke frame={frame} density={0.55} width={1080} height={700} />
  </div>
);
