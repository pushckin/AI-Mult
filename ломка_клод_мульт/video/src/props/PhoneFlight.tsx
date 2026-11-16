import React from "react";
import { clamp, easeOut, INK, rnd } from "./util";

export type PhoneFlightProps = { frame: number; startFrame: number };
/** полёт 0..FLIGHT, удар на FLIGHT, падение до FLIGHT+FALL, трещины растут CRACK кадров */
export const PHONE_FLIGHT = 14;
export const PHONE_FALL = 20;
export const PHONE_CRACK = 10;

const START = { x: 150, y: 1180 };
const WALL = { x: 880, y: 700 };
const FLOOR = { x: 800, y: 1780 };
const PW = 260;
const PH = 520;

export const PhoneFlight: React.FC<PhoneFlightProps> = ({ frame, startFrame }) => {
  const t = frame - startFrame;
  if (t < 0) return null;
  const hit = t >= PHONE_FLIGHT;
  const th = t - PHONE_FLIGHT;
  let x: number, y: number, rot: number, sc: number;
  if (!hit) {
    const u = t / PHONE_FLIGHT;
    x = START.x + (WALL.x - START.x) * u;
    y = START.y + (WALL.y - START.y) * u - Math.sin(u * Math.PI) * 120;
    rot = -20 + u * 540;
    sc = 1 - 0.15 * u;
  } else {
    const u = clamp(th / PHONE_FALL);
    // падение: отскок от стены, затем вниз с отскоком от пола
    const g = u * u;
    x = WALL.x - 30 * Math.sin(u * 2.4) + (FLOOR.x - WALL.x) * easeOut(u);
    const bounce = u > 0.75 ? Math.abs(Math.sin((u - 0.75) * 4 * Math.PI)) * 40 * (1 - u) * 4 : 0;
    y = WALL.y + (FLOOR.y - WALL.y) * g - bounce;
    rot = 520 - 70 * easeOut(u);
    sc = 0.85;
  }
  const crack = hit ? clamp(th / PHONE_CRACK) : 0;
  const lines = [];
  const CN = 14;
  for (let i = 0; i < CN; i++) {
    const a = (i / CN) * Math.PI * 2 + rnd(i) * 0.3;
    const len = (60 + rnd(i + 9) * 230) * crack;
    const ox = -20, oy = -90;
    let d = `M ${ox} ${oy}`;
    let px = ox, py = oy;
    for (let s = 1; s <= 4; s++) {
      px += Math.cos(a + (rnd(i * 7 + s) - 0.5) * 0.7) * (len / 4);
      py += Math.sin(a + (rnd(i * 7 + s) - 0.5) * 0.7) * (len / 4);
      d += ` L ${px.toFixed(1)} ${py.toFixed(1)}`;
    }
    lines.push(<path key={i} d={d} stroke="#f4f8ff" strokeWidth={4} fill="none" strokeLinejoin="round" />);
  }
  for (let r = 1; r <= 3; r++) {
    const rr = r * 42 * crack;
    const pts = Array.from({ length: 9 }, (_, k) => {
      const a = (k / 9) * Math.PI * 2;
      const q = rr * (0.8 + rnd(k + r * 10) * 0.4);
      return `${(-20 + Math.cos(a) * q).toFixed(1)},${(-90 + Math.sin(a) * q).toFixed(1)}`;
    }).join(" ");
    lines.push(<polygon key={`r${r}`} points={pts} stroke="#f4f8ff" strokeWidth={3} fill="none" opacity={0.85} />);
  }
  const restDim = hit ? clamp(th / (PHONE_FALL + 6)) : 0;

  // осколки и пыль на стене
  const frag = [];
  if (hit && th < 40) {
    for (let i = 0; i < 22; i++) {
      const a = Math.PI + (rnd(i) - 0.3) * 2.6;
      const v = 80 + rnd(i + 5) * 260;
      const u = th / 40;
      const fx = WALL.x - 40 + Math.cos(a) * v * easeOut(u);
      const fy = WALL.y + Math.sin(a) * v * easeOut(u) * 0.6 + 700 * u * u * (0.4 + rnd(i + 3));
      frag.push(
        <polygon key={i} points="0,-9 11,7 -9,6" transform={`translate(${fx} ${fy}) rotate(${u * 600 * (rnd(i + 2) - 0.5)})`} fill={i % 3 ? "#cfe8ff" : "#2a2a30"} stroke={INK} strokeWidth={1.5} opacity={1 - u * u} />,
      );
    }
    for (let i = 0; i < 8; i++) {
      const u = th / 36;
      frag.push(<circle key={`p${i}`} cx={WALL.x - 50 - rnd(i) * 80 + Math.sin(th * 0.3 + i) * 10} cy={WALL.y - 20 + (rnd(i + 4) - 0.5) * 140 - u * 40} r={30 + u * 50} fill="#d9cdb6" opacity={(1 - u) * 0.65} stroke={INK} strokeWidth={0} />);
    }
    if (th < 5) {
      frag.push(<circle key="flash" cx={WALL.x} cy={WALL.y} r={60 + th * 40} fill="none" stroke="#fff3c0" strokeWidth={10 - th * 1.5} />);
    }
  }
  return (
    <svg width={1080} height={1920} viewBox="0 0 1080 1920" style={{ position: "absolute", left: 0, top: 0, pointerEvents: "none" }}>
      {/* вмятина в стене */}
      {hit && (
        <g opacity={Math.min(1, th / 3)}>
          <path d={`M ${WALL.x + 10} ${WALL.y} l -60 -70 l 20 50 l -70 -10 l 60 40 l -40 70 l 60 -40 l 20 60 l 10 -60 Z`} fill="#3b2a22" opacity={0.55} stroke={INK} strokeWidth={3} strokeLinejoin="round" />
        </g>
      )}
      <g transform={`translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${rot.toFixed(1)}) scale(${sc})`} style={{ filter: "drop-shadow(0 8px 10px rgba(0,0,0,.45))" }}>
        <rect x={-PW / 2} y={-PH / 2} width={PW} height={PH} rx={30} fill="#1e1c22" stroke={INK} strokeWidth={6} />
        <rect x={-PW / 2 + 12} y={-PH / 2 + 18} width={PW - 24} height={PH - 36} rx={18} fill={hit ? `rgb(${Math.round(60 - 40 * restDim)},${Math.round(130 - 100 * restDim)},${Math.round(210 - 160 * restDim)})` : "#4a8fe0"} />
        <rect x={-30} y={-PH / 2 + 10} width={60} height={8} rx={4} fill="#444" />
        {!hit && <rect x={-50} y={-120} width={100} height={20} rx={6} fill="#fff" opacity={0.7} />}
        <clipPath id="pf-scr"><rect x={-PW / 2 + 12} y={-PH / 2 + 18} width={PW - 24} height={PH - 36} rx={18} /></clipPath>
        <g clipPath="url(#pf-scr)">{lines}</g>
      </g>
      {frag}
    </svg>
  );
};
