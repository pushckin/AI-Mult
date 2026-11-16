import React from "react";
import { clamp, easeOut, INK, rnd } from "./util";

export type StoveFireProps = { frame: number; startFrame: number };

/** сыплются спагетти: startFrame..+PASTA_FALL; пламя: вспышка с +PASTA_FALL-6, полная сила за 18 кадров */
export const STOVE_PASTA_FALL = 22;
export const STOVE_FIRE_GROW = 18;

const CX = 300;
const BY = 360;

const flame = (h: number, w: number, x: number, ph: number, f: number, fill: string, stroke = false) => {
  const fl = 1 + 0.12 * Math.sin(f * 0.9 + ph) + 0.08 * Math.sin(f * 1.7 + ph * 2);
  const hh = h * fl;
  const sway = Math.sin(f * 0.5 + ph) * w * 0.35;
  return (
    <path
      d={`M ${x - w} ${BY} C ${x - w * 1.1} ${BY - hh * 0.4} ${x - w * 0.2 + sway} ${BY - hh * 0.6} ${x + sway} ${BY - hh} C ${x + w * 0.3 + sway} ${BY - hh * 0.6} ${x + w * 1.1} ${BY - hh * 0.4} ${x + w} ${BY} Z`}
      fill={fill}
      stroke={stroke ? INK : "none"}
      strokeWidth={5}
      strokeLinejoin="round"
    />
  );
};

export const StoveFire: React.FC<StoveFireProps> = ({ frame, startFrame }) => {
  const t = frame - startFrame;
  const fire = clamp((t - STOVE_PASTA_FALL + 6) / STOVE_FIRE_GROW);
  const g = easeOut(fire);
  const flash = t > STOVE_PASTA_FALL - 6 && t < STOVE_PASTA_FALL + 4 ? 1 - Math.abs(t - (STOVE_PASTA_FALL - 1)) / 5 : 0;

  const sticks = [];
  if (t >= 0) {
    for (let i = 0; i < 34; i++) {
      const delay = rnd(i + 3) * 10;
      const ft = clamp((t - delay) / 12);
      if (ft <= 0) continue;
      const x = CX - 130 + rnd(i + 20) * 260;
      const rot = -50 + rnd(i + 40) * 100 + ft * 90 * (rnd(i + 9) - 0.5);
      const yEnd = BY - 6 + (rnd(i + 60) - 0.5) * 12;
      const y = -60 + (yEnd + 60) * ft * ft;
      const burnt = clamp((t - STOVE_PASTA_FALL) / 24);
      const landed = ft >= 1;
      const yy = landed ? yEnd : y;
      const rr = landed ? rot * 0.35 + 90 * 0 : rot;
      const col = burnt > 0.5 && landed ? "#3a2a1c" : "#efd58a";
      sticks.push(
        <rect key={i} x={-3} y={-60} width={6} height={120} rx={3} fill={col} stroke={INK} strokeWidth={1.5}
          transform={`translate(${x} ${yy}) rotate(${landed ? 90 + rr * 0.4 : rr})`} />,
      );
    }
  }

  const sparks = [];
  if (fire > 0) {
    for (let i = 0; i < 14; i++) {
      const age = ((t * 1.3 + rnd(i) * 40) % 40) / 40;
      const x = CX + (rnd(i + 4) - 0.5) * 220 + Math.sin(t * 0.3 + i) * 20;
      const y = BY - 40 - age * 330 * g;
      sparks.push(<circle key={i} cx={x} cy={y} r={5 * (1 - age) + 1} fill={i % 2 ? "#ffc15a" : "#ff8a2a"} opacity={(1 - age) * g} />);
    }
  }

  return (
    <svg width={600} height={500} viewBox="0 0 600 500" style={{ overflow: "visible" }}>
      {/* столешница плиты */}
      <path d="M 20 330 L 580 330 L 600 470 L 0 470 Z" fill="#aab1ba" stroke={INK} strokeWidth={5} strokeLinejoin="round" />
      <path d="M 0 470 L 600 470 L 600 500 L 0 500 Z" fill="#7d848d" stroke={INK} strokeWidth={5} />
      {/* конфорка */}
      <ellipse cx={CX} cy={BY + 14} rx={190} ry={42} fill="#18161a" stroke={INK} strokeWidth={5} />
      <ellipse cx={CX} cy={BY + 12} rx={120} ry={26} fill="#2b2a2e" stroke="#555" strokeWidth={3} />
      <ellipse cx={CX} cy={BY + 10} rx={50} ry={12} fill="#0d0c0e" />
      {/* чёрное пятно после огня */}
      {t > STOVE_PASTA_FALL + 30 && <ellipse cx={CX} cy={BY + 14} rx={170} ry={36} fill="#000" opacity={clamp((t - STOVE_PASTA_FALL - 30) / 40) * 0.5} />}
      {/* решётка */}
      <g stroke={INK} strokeWidth={9} strokeLinecap="round" opacity={0.92}>
        <path d={`M ${CX - 200} ${BY + 6} L ${CX + 200} ${BY + 6}`} />
        <path d={`M ${CX - 130} ${BY - 30} L ${CX + 130} ${BY + 52}`} />
        <path d={`M ${CX + 130} ${BY - 30} L ${CX - 130} ${BY + 52}`} />
      </g>
      {/* пламя */}
      {fire > 0 && (
        <g style={{ filter: "drop-shadow(0 0 16px rgba(255,140,40,.8))" }}>
          {flame(380 * g, 170, CX, 0, t, "#e0521c", true)}
          {flame(300 * g, 110, CX - 90, 2, t, "#ff8a2a")}
          {flame(330 * g, 110, CX + 95, 4, t, "#ff8a2a")}
          {flame(240 * g, 90, CX, 1, t, "#ffc15a")}
          {flame(130 * g, 60, CX, 3, t, "#4aa8ff")}
          {flame(70 * g, 130, CX, 5, t, "#2a6bd6")}
        </g>
      )}
      {sticks}
      {sparks}
      {flash > 0 && <ellipse cx={CX} cy={BY - 40} rx={260} ry={150} fill="#fff3c0" opacity={flash * 0.75} />}
    </svg>
  );
};
