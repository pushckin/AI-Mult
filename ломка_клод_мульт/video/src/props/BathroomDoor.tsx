import React from "react";
import { clamp, easeOut, INK, rnd } from "./util";

export type BathroomDoorProps = {
  frame: number;
  view?: "front" | "side";
  /** до него дверь распахнута, на нём — влетает в проём (SLAM_FRAMES кадров) */
  slamFrame?: number;
  /** щеколда отходит, дверь приоткрывается (LATCH_FRAMES) */
  latchFrame?: number;
  waterOn?: boolean;
};
export const DOOR_SLAM_FRAMES = 5;
export const DOOR_LATCH_FRAMES = 12;

type P = [number, number];
const bilP = (q: P[], u: number, v: number): P => {
  const [tl, tr, br, bl] = q;
  const tx = tl[0] + (tr[0] - tl[0]) * u, ty = tl[1] + (tr[1] - tl[1]) * u;
  const bx = bl[0] + (br[0] - bl[0]) * u, by = bl[1] + (br[1] - bl[1]) * u;
  return [tx + (bx - tx) * v, ty + (by - ty) * v];
};
const poly = (pts: P[]) => pts.map((p) => `${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" ");

export const BathroomDoor: React.FC<BathroomDoorProps> = ({ frame, view = "front", slamFrame, latchFrame, waterOn = false }) => {
  const side = view === "side";
  // открытость 0..1
  let open = 0;
  if (slamFrame !== undefined) {
    if (frame < slamFrame) open = 0.85;
    else {
      const u = clamp((frame - slamFrame) / DOOR_SLAM_FRAMES);
      open = 0.85 * (1 - u * u * u);
    }
  }
  if (latchFrame !== undefined && frame >= latchFrame) {
    open = 0.2 * easeOut((frame - latchFrame - 3) / DOOR_LATCH_FRAMES);
  }
  const sinceSlam = slamFrame !== undefined ? frame - slamFrame : -1;
  const shake = sinceSlam >= DOOR_SLAM_FRAMES - 1 && sinceSlam < 20 ? Math.sin(sinceSlam * 2.6) * 14 * (1 - (sinceSlam - 4) / 16) : 0;
  const hookOn = slamFrame !== undefined ? frame >= slamFrame + DOOR_SLAM_FRAMES && !(latchFrame !== undefined && frame >= latchFrame) : latchFrame === undefined ? true : frame < latchFrame;
  const hookT = latchFrame !== undefined ? clamp((frame - latchFrame) / 4) : 0;

  const closed: P[] = side
    ? [[380, 330], [900, 520], [900, 1330], [380, 1530]]
    : [[250, 200], [830, 200], [830, 1600], [250, 1600]];
  const a = open * 1.3;
  const G = side ? 40 : 70;
  const k = Math.cos(a);
  const sn = Math.sin(a);
  const [tl, tr, br, bl] = closed;
  const q: P[] = [
    tl,
    [tl[0] + (tr[0] - tl[0]) * k, tl[1] + (tr[1] - tl[1]) * k - G * sn],
    [bl[0] + (br[0] - bl[0]) * k, bl[1] + (br[1] - bl[1]) * k + G * sn],
    bl,
  ];
  const floorY = side ? 1530 : 1620;
  // дверной проём (внутренность)
  const frameQ: P[] = [
    [tl[0] - 14, tl[1] - 14], [tr[0] + 14, tr[1] - 14], [br[0] + 14, br[1] + 8], [bl[0] - 14, bl[1] + 8],
  ];
  const glow = waterOn || open > 0.05;

  // штукатурка
  const plaster = [];
  if (sinceSlam >= 0 && sinceSlam < 40) {
    for (let i = 0; i < 28; i++) {
      const x = tl[0] + (tr[0] - tl[0]) * rnd(i) + (rnd(i + 5) - 0.5) * 120;
      const tt = sinceSlam - rnd(i + 11) * 4;
      if (tt < 0) continue;
      const y = tl[1] - 20 + tt * tt * 1.3 + rnd(i + 17) * 40;
      plaster.push(<rect key={i} x={x} y={y} width={6 + rnd(i + 3) * 14} height={5 + rnd(i + 9) * 10} fill={i % 3 ? "#e9dfcf" : "#bfb29d"} stroke={INK} strokeWidth={1.2} opacity={1 - tt / 36} transform={`rotate(${tt * 12 * (rnd(i + 6) - 0.5)} ${x} ${y})`} />);
    }
  }
  // трещина над дверью
  const crack = sinceSlam >= 0 ? (
    <path d={`M ${tl[0] + 40} ${tl[1] - 14} l 30 -40 l -16 -30 l 40 -50 M ${tr[0] - 60} ${tr[1] - 14} l -20 -50 l 24 -36`} stroke={INK} strokeWidth={5} fill="none" strokeLinejoin="round" opacity={0.7} />
  ) : null;

  const handle = bilP(q, 0.87, 0.52);
  const hookP = bilP(q, 0.72, 0.4);
  const eyeP: P = [hookP[0] + 70 * (side ? 0.8 : 1) * Math.max(0.2, k), hookP[1]];
  const wallStripes = Array.from({ length: 14 }, (_, i) => i);

  // вода
  const wf = frame;
  const waterStart = slamFrame ?? 0;
  const puddle = waterOn ? easeOut((frame - waterStart) / 140) : 0;
  const gapX0 = bl[0] + 40;
  const gapX1 = br[0] - 40;
  const dash = (wf * 9) % 60;

  return (
    <svg width={1080} height={1920} viewBox="0 0 1080 1920" style={{ position: "absolute", left: 0, top: 0 }}>
      <defs>
        <linearGradient id="bd-wall" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#c9b78d" />
          <stop offset="1" stopColor="#9c8660" />
        </linearGradient>
        <linearGradient id="bd-floor" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#4a3326" />
          <stop offset="1" stopColor="#2a1c14" />
        </linearGradient>
        <radialGradient id="bd-glow" cx="0.5" cy="0" r="1">
          <stop offset="0" stopColor="#fff2b0" stopOpacity={0.95} />
          <stop offset="1" stopColor="#ffd36a" stopOpacity={0} />
        </radialGradient>
        <linearGradient id="bd-in" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#223244" />
          <stop offset="1" stopColor="#5c8fa8" />
        </linearGradient>
      </defs>
      <g transform={`translate(${shake.toFixed(1)} 0)`}>
        <rect width={1080} height={1920} fill="url(#bd-wall)" />
        {wallStripes.map((i) => (
          <g key={i}>
            <rect x={i * 90 - 10} y={0} width={36} height={floorY} fill="#a98f5f" opacity={0.45} />
            {Array.from({ length: 10 }, (_, j) => (
              <circle key={j} cx={i * 90 + 52} cy={80 + j * 170 + (i % 2) * 85} r={9} fill="#7c8f5a" opacity={0.55} />
            ))}
          </g>
        ))}
        {side && (
          <g stroke={INK} strokeWidth={4} opacity={0.5}>
            <path d="M 0 120 L 380 330 M 0 1700 L 380 1530" />
          </g>
        )}
        {/* пол */}
        <rect x={0} y={floorY} width={1080} height={1920 - floorY} fill="url(#bd-floor)" />
        <rect x={0} y={floorY} width={1080} height={26} fill="#6b4a33" stroke={INK} strokeWidth={4} />
        {Array.from({ length: 9 }, (_, i) => (
          <path key={i} d={`M ${i * 135} ${floorY + 26} L ${540 + (i - 4) * 300} 1920`} stroke={INK} strokeWidth={3} opacity={0.45} />
        ))}
        {/* проём и интерьер */}
        <polygon points={poly(frameQ)} fill="#e8ddc4" stroke={INK} strokeWidth={6} strokeLinejoin="round" />
        <polygon points={poly(closed)} fill="url(#bd-in)" stroke={INK} strokeWidth={4} />
        {open > 0.02 && <polygon points={poly(closed)} fill="#ffe9a0" opacity={clamp(open * 3) * 0.5} />}
        {/* свет и вода под дверью */}
        {glow && (
          <ellipse cx={(bl[0] + br[0]) / 2} cy={floorY + 30} rx={330} ry={70} fill="url(#bd-glow)" opacity={0.75} />
        )}
        {/* дверь */}
        <g style={{ filter: "drop-shadow(8px 8px 10px rgba(0,0,0,.4))" }}>
          <polygon points={poly(q)} fill="#c9a46a" stroke={INK} strokeWidth={6} strokeLinejoin="round" />
          {[[0.12, 0.07, 0.88, 0.42], [0.12, 0.52, 0.88, 0.93]].map((r, i) => (
            <polygon key={i} points={poly([bilP(q, r[0], r[1]), bilP(q, r[2], r[1]), bilP(q, r[2], r[3]), bilP(q, r[0], r[3])])} fill="#b78e55" stroke={INK} strokeWidth={3} strokeLinejoin="round" />
          ))}
          {/* табличка WC */}
          <g>
            <polygon points={poly([bilP(q, 0.34, 0.14), bilP(q, 0.66, 0.14), bilP(q, 0.66, 0.24), bilP(q, 0.34, 0.24)])} fill="#f3ead2" stroke={INK} strokeWidth={3} />
          </g>
          {/* ручка */}
          <circle cx={handle[0]} cy={handle[1]} r={30} fill="#d9d4c8" stroke={INK} strokeWidth={5} />
          <circle cx={handle[0] - 7} cy={handle[1] - 7} r={9} fill="#fff" opacity={0.8} />
          {/* щеколда-крючок (на двери) */}
          <g>
            <rect x={hookP[0] - 34} y={hookP[1] - 14} width={36} height={28} rx={6} fill="#8f98a3" stroke={INK} strokeWidth={4} />
            <g transform={`rotate(${-hookT * 80} ${hookP[0]} ${hookP[1]})`}>
              <path d={hookOn || hookT > 0 ? `M ${hookP[0]} ${hookP[1]} L ${eyeP[0] - 4} ${hookP[1]} L ${eyeP[0] - 4} ${hookP[1] + 26}` : `M ${hookP[0]} ${hookP[1]} L ${hookP[0] - 4} ${hookP[1] + 70}`} stroke={INK} strokeWidth={14} fill="none" strokeLinecap="round" strokeLinejoin="round" />
              <path d={hookOn || hookT > 0 ? `M ${hookP[0]} ${hookP[1]} L ${eyeP[0] - 4} ${hookP[1]} L ${eyeP[0] - 4} ${hookP[1] + 26}` : `M ${hookP[0]} ${hookP[1]} L ${hookP[0] - 4} ${hookP[1] + 70}`} stroke="#c4cbd4" strokeWidth={7} fill="none" strokeLinecap="round" strokeLinejoin="round" />
            </g>
            {/* ушко на косяке */}
            <rect x={eyeP[0] - 4} y={hookP[1] + 12} width={22} height={30} rx={5} fill="#8f98a3" stroke={INK} strokeWidth={4} />
          </g>
          {/* щель снизу: свет */}
          <rect x={bl[0]} y={bl[1] - 2} width={Math.max(10, br[0] - bl[0])} height={16} fill="#fff2b0" opacity={glow ? 1 : 0.85} />
        </g>
        {/* вода */}
        {waterOn && (
          <g>
            <ellipse cx={(gapX0 + gapX1) / 2} cy={floorY + 60 + 90 * puddle} rx={60 + 360 * puddle} ry={20 + 100 * puddle} fill="#5aa9d6" stroke={INK} strokeWidth={4} opacity={0.85} />
            <ellipse cx={(gapX0 + gapX1) / 2 - 60} cy={floorY + 50 + 80 * puddle} rx={30 + 150 * puddle} ry={8 + 30 * puddle} fill="#a8dcf4" opacity={0.7} />
            {[0, 1, 2, 3].map((i) => {
              const x = gapX0 + (gapX1 - gapX0) * (0.2 + 0.2 * i);
              return (
                <path key={i} d={`M ${x} ${floorY - 2} q ${Math.sin(wf * 0.2 + i) * 12} 40 ${(i - 1.5) * 18} 90`} stroke="#5aa9d6" strokeWidth={14} fill="none" strokeLinecap="round" strokeDasharray="40 20" strokeDashoffset={-dash} />
              );
            })}
          </g>
        )}
        {crack}
        {plaster}
      </g>
    </svg>
  );
};
