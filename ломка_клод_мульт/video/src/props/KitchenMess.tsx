import React from "react";
import { Kitchen, KITCHEN_LAYOUT } from "../scene1/set";
import type { KitchenView } from "../scene1/set";
import { rnd, INK } from "./util";
import { Smoke } from "./Smoke";

export type KitchenMessProps = {
  frame: number;
  view: KitchenView;
  smokeAmount?: number;
  ashOnTable?: boolean;
  parallax?: { x: number; y: number };
  /** свечи оплывают: 0..1 (по умолчанию 0.9 — почти догорели) */
  melt?: number;
  candles?: boolean;
};

export const KitchenMess: React.FC<KitchenMessProps> = ({
  frame,
  view,
  smokeAmount = 0,
  ashOnTable = true,
  parallax = { x: 0, y: 0 },
  melt = 0.9,
  candles = true,
}) => {
  const L = KITCHEN_LAYOUT[view];
  const px = parallax.x * 40 * 0.45;
  const py = parallax.y * 26 * 0.45;
  const wallShift = view === "table" ? -40 : 0;
  const tableX0 = L.tableX[0];
  const tableX1 = L.tableX[1];
  const topY = L.tableTopY;
  const ash = [];
  if (ashOnTable) {
    for (let i = 0; i < 46; i++) {
      const x = tableX0 + 30 + rnd(i) * (tableX1 - tableX0 - 60);
      const y = topY + 8 + rnd(i + 30) * 60;
      ash.push(<ellipse key={i} cx={x} cy={y} rx={4 + rnd(i + 7) * 14} ry={2 + rnd(i + 9) * 5} fill={i % 3 ? "#2a2626" : "#6b6464"} opacity={0.85} />);
    }
    ash.push(<path key="p" d={`M ${tableX0 + 300} ${topY + 40} q 40 -26 90 0 q -20 18 -90 0`} fill="#2a2626" stroke={INK} strokeWidth={2} opacity={0.8} />);
  }
  const glass = L.glasses[L.glasses.length - 1];
  const stove = view === "backWall" ? { x: 960, y: 700 } : { x: L.pot.x, y: L.pot.y };
  return (
    <>
      <Kitchen frame={frame} view={view} parallax={parallax} melt={melt} candles={candles} />
      <svg width={1296} height={2304} viewBox="-108 -192 1296 2304" style={{ position: "absolute", left: -108, top: -192, pointerEvents: "none" }}>
        <defs>
          <radialGradient id="km-burn" cx="0.5" cy="0.5" r="0.5">
            <stop offset="0" stopColor="#050303" stopOpacity={0.95} />
            <stop offset="0.6" stopColor="#1a100c" stopOpacity={0.6} />
            <stop offset="1" stopColor="#1a100c" stopOpacity={0} />
          </radialGradient>
          <linearGradient id="km-ceil" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#050303" stopOpacity={0.9} />
            <stop offset="1" stopColor="#050303" stopOpacity={0} />
          </linearGradient>
        </defs>
        <g transform={`translate(${px} ${py + wallShift})`}>
          {/* закопчённый потолок */}
          <rect x={-108} y={-192} width={1296} height={560} fill="url(#km-ceil)" />
          {/* подгоревшая стена над плитой */}
          <ellipse cx={stove.x - 20} cy={stove.y - 140} rx={300} ry={420} fill="url(#km-burn)" />
          <path d={`M ${stove.x - 140} ${stove.y - 280} q -30 -90 10 -170 q 20 80 60 150 q 30 -90 80 -120 q -10 90 20 140 Z`} fill="#0d0807" opacity={0.75} />
          {/* чёрное пятно на конфорке */}
          {view !== "backWall" && <ellipse cx={stove.x + 10} cy={stove.y + 120} rx={120} ry={22} fill="#000" opacity={0.7} />}
        </g>
        <g transform={`translate(${px * 1.5} ${py * 1.5})`}>
          {ash}
          {/* опрокинутый бокал */}
          {glass && (
            <g transform={`translate(${glass.x + 36} ${glass.y + 20}) rotate(80)`}>
              <ellipse cx={-20} cy={50} rx={120} ry={26} fill="#8e1b3c" opacity={0.85} transform="rotate(-80)" />
              <path d="M -34 -72 C -34 -130 34 -130 34 -72 C 34 -56 -34 -56 -34 -72Z" fill="#e9f3f8" opacity={0.8} stroke="rgba(18,12,10,.5)" strokeWidth={1.6} />
              <path d="M -33 -80 C -33 -78 33 -78 33 -80 C 34 -96 -34 -96 -33 -80Z" fill="#8e1b3c" opacity={0.9} />
              <rect x={-3} y={-60} width={6} height={60} fill="#e9f3f8" opacity={0.9} stroke="rgba(18,12,10,.35)" strokeWidth={1} />
              <ellipse cx={0} cy={0} rx={30} ry={6} fill="#e9f3f8" opacity={0.85} stroke="rgba(18,12,10,.4)" strokeWidth={1.2} />
            </g>
          )}
        </g>
      </svg>
      {smokeAmount > 0 && <Smoke frame={frame} density={smokeAmount} />}
    </>
  );
};
