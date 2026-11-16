import React from "react";
import { interpolate, spring } from "remotion";

export type UsageLimitProps = {
  frame: number;
  startFrame: number;
  compact?: boolean;
  x?: number;
  y?: number;
  scale?: number;
  rotate?: number;
};

const FONT = "Arial Black, Impact, sans-serif";
const FPS = 24;
export const USAGE_LIMIT_TEXT = "You've reached your usage limit. Please try again in 4 hours 59 minutes";
export const USAGE_LIMIT_GLITCH_FRAMES = 10;

export const UsageLimit: React.FC<UsageLimitProps> = ({
  frame,
  startFrame,
  compact = false,
  x = 0,
  y = 0,
  scale = 1,
  rotate = 0,
}) => {
  const t = frame - startFrame;
  if (t < 0) return null;

  const s = spring({ frame: t, fps: FPS, config: { damping: 9, stiffness: 160, mass: 0.8 } });
  const glitch = t < USAGE_LIMIT_GLITCH_FRAMES;
  const g = glitch ? 1 - t / USAGE_LIMIT_GLITCH_FRAMES : 0;
  const zig = glitch ? (t % 2 === 0 ? 1 : -1) * (14 * g + 4) : 0;
  const jy = glitch ? Math.sin(t * 5.1) * 8 * g : Math.sin(t * 0.6) * 1.2;
  const rgb = glitch ? 10 * g + 4 : 0;
  const blink = Math.floor(t / 6) % 2 === 0;

  const W = 1080;
  const H = compact ? 600 : 900;
  const bw = compact ? 760 : 900; // plate width, margins >= 60
  const bh = compact ? 440 : 640;
  const fs = compact ? 46 : 62;
  const lines = ["You've reached", "your usage limit.", "Please try again in", "4 hours 59 minutes"];
  const lh = fs * 1.2;
  const iconR = compact ? 52 : 84;
  const cx = W / 2;
  const cy = H / 2;

  const plate = (fill: string, opacity: number, dx: number, withText: boolean) => (
    <g transform={`translate(${dx} 0)`} opacity={opacity}>
      <path
        d={`M${cx - bw / 2} ${cy - bh / 2 + 20} L${cx - bw / 2 + 30} ${cy - bh / 2} L${cx + bw / 2 - 20} ${cy - bh / 2 + 6} L${cx + bw / 2} ${cy - bh / 2 + 40} L${cx + bw / 2 - 12} ${cy + bh / 2 - 30} L${cx + bw / 2 - 40} ${cy + bh / 2} L${cx - bw / 2 + 24} ${cy + bh / 2 - 8} L${cx - bw / 2} ${cy + bh / 2 - 36} Z`}
        fill={fill}
        stroke={withText ? "#120c0a" : "none"}
        strokeWidth="6"
        strokeLinejoin="round"
      />
      {withText && (
        <>
          <rect x={cx - bw / 2 + 16} y={cy - bh / 2 + 16} width={bw - 32} height={bh - 36} rx="10" fill="none" stroke="#fff" strokeWidth="3" strokeDasharray="14 10" opacity="0.5" />
          {/* icon */}
          <g transform={`translate(${cx} ${cy - bh / 2 + iconR + (compact ? 26 : 44)})`} opacity={blink ? 1 : 0.25}>
            <path d={`M0 ${-iconR} L${iconR * 1.1} ${iconR * 0.8} L${-iconR * 1.1} ${iconR * 0.8} Z`} fill="#ffd23a" stroke="#120c0a" strokeWidth="5" strokeLinejoin="round" />
            <rect x={-iconR * 0.08} y={-iconR * 0.4} width={iconR * 0.16} height={iconR * 0.7} rx={iconR * 0.08} fill="#120c0a" />
            <circle cy={iconR * 0.5} r={iconR * 0.1} fill="#120c0a" />
          </g>
          {lines.map((ln, i) => (
            <text
              key={i}
              x={cx}
              y={cy - bh / 2 + iconR * 2 + (compact ? 70 : 120) + i * lh}
              textAnchor="middle"
              fontFamily={FONT} fontWeight={900}
              fontSize={fs}
              fill="#fff"
              stroke="#5a0a10"
              strokeWidth="2"
              paintOrder="stroke"
            >
              {ln}
            </text>
          ))}
        </>
      )}
    </g>
  );

  const flyY = interpolate(s, [0, 1], [-900, 0]);
  const sq = 1 + (1 - s) * 0.0;
  const op = interpolate(t, [0, 3], [0, 1], { extrapolateRight: "clamp" });

  return (
    <svg
      width={W}
      height={H}
      viewBox={`0 0 ${W} ${H}`}
      style={{ display: "block", overflow: "visible", transform: `translate(${x}px, ${y}px) scale(${scale}) rotate(${rotate}deg)` }}
    >
      <g
        opacity={op}
        transform={`translate(${zig} ${flyY + jy}) rotate(${(1 - s) * -6 + (glitch ? zig * 0.15 : 0)} ${cx} ${cy}) scale(${sq})`}
        style={{ filter: "drop-shadow(3px 6px 0 rgba(0,0,0,.45))" }}
      >
        {glitch && plate("#00e5ff", 0.7, -rgb, false)}
        {glitch && plate("#ff00aa", 0.7, rgb, false)}
        {plate("#e11d2a", 1, 0, true)}
      </g>
    </svg>
  );
};
