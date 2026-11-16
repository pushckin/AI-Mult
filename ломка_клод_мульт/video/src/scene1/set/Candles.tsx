import React from "react";

const WAX = "#f4ead2";
const WAX_SHADE = "#d9ccaa";
const FLAME = "#ffb43a";

const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));

export type CandlesProps = {
  frame: number;
  x?: number;
  y?: number;
  scale?: number;
  /** 0..1 — стекающий воск */
  melt?: number;
  /** кадр, когда капля воска отрывается от свечи и падает (падение ≈12 кадров) */
  dropFrame?: number;
  /** без собственного свечения (если свет рисует Kitchen) */
  noGlow?: boolean;
};

export const CANDLE_FALL_FRAMES = 12;

/** Мерцание пламени 0..1-ish, детерминировано от frame. */
export const flicker = (frame: number, ph = 0) =>
  0.5 * Math.sin(frame * 0.9 + ph) +
  0.3 * Math.sin(frame * 2.1 + ph * 2.3 + 1) +
  0.2 * Math.sin(frame * 0.37 + ph * 0.7 + 4);

const Flame: React.FC<{ frame: number; ph: number }> = ({ frame, ph }) => {
  const f = flicker(frame, ph);
  const sx = 1 + 0.07 * f;
  const sy = 1 + 0.14 * f;
  const rot = 5 * Math.sin(frame * 0.5 + ph) + 2 * f;
  return (
    <g transform={`rotate(${rot.toFixed(2)}) scale(${sx.toFixed(3)} ${sy.toFixed(3)})`}>
      <path d="M0 -62 C 16 -34 20 -12 0 2 C -20 -12 -16 -34 0 -62Z" fill={FLAME} />
      <path d="M0 -44 C 10 -26 12 -10 0 1 C -12 -10 -10 -26 0 -44Z" fill="#ffd96a" />
      <path d="M0 -26 C 5 -16 6 -6 0 0 C -6 -6 -5 -16 0 -26Z" fill="#fff6d6" />
      <path d="M-5 -2 C -6 4 6 4 5 -2 C 3 -5 -3 -5 -5 -2Z" fill="#6aa8ff" opacity={0.6} />
    </g>
  );
};

type OneProps = {
  frame: number;
  cx: number;
  h: number;
  ph: number;
  melt: number;
  drop?: number;
};

const STICK_H = 70;

const OneCandle: React.FC<OneProps> = ({ frame, cx, h, ph, melt, drop }) => {
  const w = 40;
  const hh = h * (1 - 0.12 * melt);
  const top = -STICK_H - hh;
  const dripLens = [26, 52, 38];
  const dripX = [-12, 4, 14];

  // --- капля воска ---
  let dropEls: React.ReactNode = null;
  if (drop !== undefined) {
    const slideStart = drop - 52;
    const slideEnd = drop - 14;
    const t = clamp((frame - slideStart) / (slideEnd - slideStart));
    const te = Math.pow(t, 1.6);
    const edgeX = w / 2 - 6; // жёлоб на правой стороне
    const yTop = top + 8;
    const yBot = -STICK_H - 2;
    const beadY = yTop + (yBot - yTop) * te;
    const trailOn = frame >= slideStart;
    const sliding = frame >= slideStart && frame < drop - 14;
    const hang = frame >= drop - 14 && frame < drop;
    const falling = frame >= drop && frame < drop + CANDLE_FALL_FRAMES;
    const landT = frame - (drop + CANDLE_FALL_FRAMES);
    const trailEnd = frame >= drop - 14 ? yBot : beadY;
    const fallY0 = -STICK_H + 10;
    const groundY = 10;
    dropEls = (
      <g>
        {trailOn && (
          <rect
            x={edgeX - 4}
            y={yTop - 2}
            width={11}
            height={Math.max(0, trailEnd - yTop + 2)}
            rx={4.5}
            fill="#fffaf0"
            stroke={"#b39f66"}
            strokeWidth={1}
          />
        )}
        {sliding && (
          <ellipse cx={edgeX} cy={beadY} rx={9.5 + 2 * te} ry={12 + 4 * te} fill="#fffdf5" stroke={"#b39f66"} strokeWidth={1} />
        )}
        {hang && (
          <g>
            {(() => {
              const k = (frame - (drop - 14)) / 14;
              const stretch = 6 + 18 * k * k;
              return (
                <path
                  d={`M ${edgeX - 6} ${yBot - 6} C ${edgeX - 9} ${yBot + stretch} ${edgeX + 9} ${yBot + stretch} ${edgeX + 6} ${yBot - 6}Z`}
                  fill="#fffdf5"
                  stroke={"#b39f66"}
                  strokeWidth={1}
                />
              );
            })()}
          </g>
        )}
        {falling && (() => {
          const s = (frame - drop) / CANDLE_FALL_FRAMES;
          const y = fallY0 + (groundY - fallY0) * s * s;
          const stretch = 1 + 1.1 * s;
          return (
            <ellipse
              cx={edgeX}
              cy={y}
              rx={10 / Math.sqrt(stretch)}
              ry={12 * stretch}
              fill="#fffdf5"
              stroke={"#b39f66"}
              strokeWidth={1}
            />
          );
        })()}
        {landT >= 0 && (() => {
          const g = clamp(landT / 8);
          const parts = [-1, -0.6, -0.25, 0.25, 0.6, 1, 0.1];
          return (
            <g>
              <ellipse
                cx={edgeX}
                cy={groundY + 2}
                rx={5 + 28 * (1 - Math.pow(1 - g, 3))}
                ry={3 + 8 * (1 - Math.pow(1 - g, 3))}
                fill="#fffdf5"
                stroke={"#b39f66"}
                strokeWidth={1}
              />
              <ellipse cx={edgeX + 26} cy={groundY + 4} rx={3 * g} ry={1.6 * g} fill="#fffdf5" />
              {landT < 22 &&
                parts.map((d, i) => {
                  const tt = landT / 22;
                  const vx = d * 30;
                  const vy = -26 - (i % 3) * 8;
                  const px = edgeX + vx * tt;
                  const py = groundY + vy * tt + 40 * tt * tt;
                  return (
                    <circle key={i} cx={px} cy={py} r={Math.max(0.5, (4.6 - (i % 3) * 0.9) * (1 - tt * 0.5))} fill="#fffdf5" opacity={1 - tt * tt} />
                  );
                })}
              {landT < 18 && (
                <ellipse cx={edgeX} cy={groundY - 4} rx={10 + landT * 1.6} ry={3 + landT * 0.5} fill="none" stroke="#fffdf5" strokeWidth={1.5} opacity={1 - landT / 18} />
              )}
            </g>
          );
        })()}
      </g>
    );
  }

  return (
    <g transform={`translate(${cx} 0)`}>
      {/* подсвечник */}
      <g>
        <path d={`M -34 2 L 34 2 L 28 -8 L -28 -8Z`} fill="#c8963e" stroke="#7a5a1c" strokeWidth={1.5} />
        <path d={`M -7 -8 L 7 -8 L 5 -44 L -5 -44Z`} fill="#d6a64a" stroke="#7a5a1c" strokeWidth={1.5} />
        <ellipse cx={0} cy={-30} rx={13} ry={6} fill="#e3b862" stroke="#7a5a1c" strokeWidth={1.2} />
        <path d={`M -26 -${STICK_H - 10} L 26 -${STICK_H - 10} L 22 -${STICK_H - 44} L -22 -${STICK_H - 44}Z`} fill="#d6a64a" stroke="#7a5a1c" strokeWidth={1.5} transform="translate(0 0)" />
        <path d={`M -28 -${STICK_H} L 28 -${STICK_H} L 22 -${STICK_H - 14} L -22 -${STICK_H - 14}Z`} fill="#e3b862" stroke="#7a5a1c" strokeWidth={1.5} />
      </g>
      {/* тело свечи */}
      <path
        d={`M ${-w / 2} ${-STICK_H} L ${-w / 2 + 1} ${top + 4} L ${-w / 2 + 3} ${top} L ${w / 2 - 2} ${top - 1} L ${w / 2} ${top + 5} L ${w / 2 - 1} ${-STICK_H}Z`}
        fill={WAX}
        stroke={WAX_SHADE}
        strokeWidth={1.5}
      />
      <path d={`M ${w / 2 - 12} ${-STICK_H} L ${w / 2 - 12} ${top + 6} L ${w / 2 - 1} ${top + 5} L ${w / 2 - 1} ${-STICK_H}Z`} fill={WAX_SHADE} opacity={0.7} />
      <ellipse cx={0} cy={top + 3} rx={w / 2 - 2} ry={6} fill="#fff6dd" stroke={WAX_SHADE} strokeWidth={1} />
      {melt > 0.02 && (
        <ellipse cx={0} cy={top + 4} rx={(w / 2 - 6) * (0.5 + 0.5 * melt)} ry={3 + 2 * melt} fill="#e9d9b0" />
      )}
      {/* потёки */}
      {dripLens.map((l, i) => {
        const len = l * clamp(melt * 1.3 - i * 0.12);
        if (len < 2) return null;
        return (
          <rect key={i} x={dripX[i] - 4} y={top + 3} width={8} height={len} rx={4} fill="#fff6dd" stroke={WAX_SHADE} strokeWidth={0.8} />
        );
      })}
      {dropEls}
      {/* фитиль */}
      <path d={`M 0 ${top + 2} Q 2 ${top - 8} -1 ${top - 12}`} stroke="#2a1a12" strokeWidth={2.5} fill="none" />
      <g transform={`translate(0 ${top - 10})`}>
        <Flame frame={frame} ph={ph} />
      </g>
    </g>
  );
};

/** Пара свечей в локальных координатах: (0,0) — точка на столе по центру между подсвечниками. */
export const CandlesGroup: React.FC<{
  frame: number;
  melt?: number;
  dropFrame?: number;
}> = ({ frame, melt = 0, dropFrame }) => (
  <g style={{ filter: "drop-shadow(1px 2px 0 rgba(0,0,0,.35))" }}>
    <OneCandle frame={frame} cx={-48} h={190} ph={0.4} melt={melt} drop={dropFrame} />
    <OneCandle frame={frame} cx={52} h={140} ph={2.1} melt={melt * 0.8} />
  </g>
);

/** Мягкое свечение вокруг пламени. Координаты — как у CandlesGroup. */
export const CandleGlow: React.FC<{ frame: number; scale?: number }> = ({ frame, scale = 1 }) => {
  const f1 = flicker(frame, 0.4);
  const f2 = flicker(frame, 2.1);
  const fl = (f1 + f2) / 2;
  const topA = -STICK_H - 190 * 1 - 10;
  const topB = -STICK_H - 140 - 10;
  const flames = [
    { x: -48, y: topA },
    { x: 52, y: topB },
  ];
  return (
    <g style={{ mixBlendMode: "screen" }}>
      {flames.map((p, i) => (
        <g key={i}>
          <circle cx={p.x} cy={p.y - 20} r={(260 + 18 * fl) * scale} fill="url(#set-glowBig)" opacity={0.55 + 0.08 * fl} />
          <circle cx={p.x} cy={p.y - 20} r={(110 + 8 * fl) * scale} fill="url(#set-glowSmall)" opacity={0.85 + 0.1 * fl} />
        </g>
      ))}
    </g>
  );
};

export const GlowDefs: React.FC = () => (
  <defs>
    <radialGradient id="set-glowBig">
      <stop offset="0" stopColor="#ffb43a" stopOpacity={0.55} />
      <stop offset="0.45" stopColor="#ff8a2a" stopOpacity={0.22} />
      <stop offset="1" stopColor="#ff6a1a" stopOpacity={0} />
    </radialGradient>
    <radialGradient id="set-glowSmall">
      <stop offset="0" stopColor="#fff0b0" stopOpacity={0.9} />
      <stop offset="0.5" stopColor="#ffc24a" stopOpacity={0.35} />
      <stop offset="1" stopColor="#ffb43a" stopOpacity={0} />
    </radialGradient>
  </defs>
);

/** Самостоятельные свечи: svg той же системы координат, что Kitchen (viewBox -108 -192 1296 2304). */
export const Candles: React.FC<CandlesProps> = ({ frame, x = 540, y = 1085, scale = 1, melt = 0, dropFrame, noGlow }) => (
  <svg
    width={1296}
    height={2304}
    viewBox="-108 -192 1296 2304"
    style={{ position: "absolute", left: -108, top: -192, overflow: "visible", pointerEvents: "none" }}
  >
    <GlowDefs />
    <g transform={`translate(${x} ${y}) scale(${scale})`}>
      {!noGlow && <CandleGlow frame={frame} />}
      <CandlesGroup frame={frame} melt={melt} dropFrame={dropFrame} />
    </g>
  </svg>
);
