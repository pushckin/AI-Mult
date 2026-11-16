import React from "react";
import { CandleGlow, CandlesGroup, GlowDefs, flicker } from "./Candles";

export type KitchenView = "wide" | "table" | "backWall";

export type KitchenProps = {
  frame: number;
  view: KitchenView;
  /** -1..1 */
  parallax?: { x: number; y: number };
  /** рисовать свечи внутри Kitchen (по умолчанию да) */
  candles?: boolean;
  melt?: number;
  dropFrame?: number;
};

/** Координаты в мировом пространстве 1080x1920 для расстановки персонажей/камеры. */
export const KITCHEN_LAYOUT = {
  wide: {
    candles: { x: 540, y: 1085 },
    tableTopY: 1050, // верхняя кромка столешницы (скатерть)
    tableX: [150, 930],
    plates: [{ x: 300, y: 1080 }, { x: 780, y: 1080 }],
    glasses: [{ x: 410, y: 1075 }, { x: 670, y: 1075 }],
    window: { x: 330, y: 170, w: 420, h: 490 },
    pot: { x: 995, y: 880 },
  },
  table: {
    candles: { x: 540, y: 1200 },
    tableTopY: 1000,
    tableX: [130, 950],
    plates: [{ x: 290, y: 1250 }, { x: 790, y: 1250 }],
    glasses: [{ x: 370, y: 1160 }, { x: 710, y: 1160 }],
    window: { x: 330, y: 150, w: 420, h: 490 },
    pot: { x: 995, y: 860 },
  },
  backWall: {
    candles: { x: 540, y: 1215 },
    tableTopY: 1190,
    tableX: [-108, 1188],
    plates: [],
    glasses: [],
    window: { x: 270, y: 150, w: 540, h: 630 },
    pot: { x: 0, y: 0 },
  },
} as const;

const C = {
  bg: "#1b1210",
  wall: "#8a5a3c",
  wallDark: "#5e3a27",
  floor: "#3b2a22",
  table: "#a9713f",
  tableDark: "#7a4c27",
  ink: "#120c0a",
  cloth: "#b8432f",
  clothLite: "#cf6a4a",
  clothDark: "#8e2f22",
};

const SH: React.CSSProperties = { filter: "drop-shadow(1px 2px 0 rgba(0,0,0,.35))" };
const SH_BIG: React.CSSProperties = { filter: "drop-shadow(3px 6px 0 rgba(0,0,0,.30))" };

const hash = (n: number) => {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
};
const jit = (seed: number, i: number, a: number) => (hash(seed * 13.7 + i * 3.1) - 0.5) * 2 * a;

/** «Вырезанный ножницами» многоугольник-прямоугольник с лёгкой неровностью. */
function cut(x: number, y: number, w: number, h: number, seed: number, a = 2.5, step = 70) {
  const pts: [number, number][] = [];
  let i = 0;
  const nx = Math.max(1, Math.round(w / step));
  const ny = Math.max(1, Math.round(h / step));
  for (let k = 0; k < nx; k++) pts.push([x + (w * k) / nx + jit(seed, i++, a), y + jit(seed, i++, a)]);
  for (let k = 0; k < ny; k++) pts.push([x + w + jit(seed, i++, a), y + (h * k) / ny + jit(seed, i++, a)]);
  for (let k = 0; k < nx; k++) pts.push([x + w - (w * k) / nx + jit(seed, i++, a), y + h + jit(seed, i++, a)]);
  for (let k = 0; k < ny; k++) pts.push([x + jit(seed, i++, a), y + h - (h * k) / ny + jit(seed, i++, a)]);
  return "M" + pts.map((p) => `${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join("L") + "Z";
}

const Cut: React.FC<{
  x: number; y: number; w: number; h: number; seed: number; fill: string;
  stroke?: string; a?: number; step?: number; sw?: number;
}> = ({ x, y, w, h, seed, fill, stroke = "rgba(18,12,10,0.55)", a = 2.5, step = 70, sw = 1.6 }) => (
  <path d={cut(x, y, w, h, seed, a, step)} fill={fill} stroke={stroke} strokeWidth={sw} strokeLinejoin="round" />
);

// ---------------------------------------------------------------- окно с городом
const City: React.FC<{ frame: number; x: number; y: number; w: number; h: number; px: number; py: number }> = ({ frame, x, y, w, h, px, py }) => {
  const far: React.ReactNode[] = [];
  const near: React.ReactNode[] = [];
  const lights: React.ReactNode[] = [];
  let cx = x - 40;
  let i = 0;
  while (cx < x + w + 40) {
    const bw = 40 + hash(i * 3.3) * 50;
    const bh = 90 + hash(i * 7.7) * 190;
    far.push(<rect key={`f${i}`} x={cx} y={y + h - bh - 40} width={bw} height={bh + 60} fill="#2a2450" />);
    for (let wy = y + h - bh - 28; wy < y + h - 40; wy += 18) {
      for (let wx = cx + 6; wx < cx + bw - 8; wx += 14) {
        const id = i * 100 + wx * 0.37 + wy * 0.11;
        if (hash(id) > 0.62) {
          const tw = 0.75 + 0.25 * Math.sin(frame * 0.06 + id);
          lights.push(<rect key={`l${id}`} x={wx} y={wy} width={6} height={8} fill="#ffd36a" opacity={tw * (hash(id + 5) > 0.5 ? 1 : 0.6)} />);
        }
      }
    }
    cx += bw + 4 + hash(i) * 8;
    i++;
  }
  cx = x - 60;
  i = 0;
  while (cx < x + w + 60) {
    const bw = 70 + hash(i * 1.9 + 50) * 70;
    const bh = 70 + hash(i * 5.1 + 20) * 120;
    near.push(<rect key={`n${i}`} x={cx} y={y + h - bh} width={bw} height={bh + 20} fill="#161233" />);
    for (let wy = y + h - bh + 14; wy < y + h - 14; wy += 24) {
      for (let wx = cx + 10; wx < cx + bw - 12; wx += 20) {
        const id = 1000 + i * 100 + wx * 0.41 + wy * 0.13;
        if (hash(id) > 0.7) {
          const tw = 0.8 + 0.2 * Math.sin(frame * 0.045 + id * 2);
          near.push(<rect key={`nl${id}`} x={wx} y={wy} width={9} height={12} fill={hash(id + 2) > 0.8 ? "#ff9a5a" : "#ffe08a"} opacity={tw} />);
        }
      }
    }
    cx += bw + 6;
    i++;
  }
  const stars = Array.from({ length: 26 }, (_, k) => (
    <circle key={k} cx={x + hash(k * 2.1) * w} cy={y + hash(k * 4.3 + 9) * h * 0.45} r={1.2 + hash(k) * 1.3} fill="#fff" opacity={0.5 + 0.4 * Math.sin(frame * 0.08 + k * 3)} />
  ));
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} fill="url(#set-sky)" />
      <g transform={`translate(${px * 0.3} ${py * 0.3})`}>{stars}</g>
      <circle cx={x + w * 0.72} cy={y + h * 0.2} r={34} fill="#fff4cf" />
      <circle cx={x + w * 0.72 + 12} cy={y + h * 0.2 - 8} r={30} fill="#1d1946" opacity={0.55} />
      <g transform={`translate(${px} ${py})`}>{far}{lights}</g>
      <g transform={`translate(${px * 2.2} ${py * 1.6})`}>{near}</g>
    </g>
  );
};

const WindowBlock: React.FC<{ frame: number; x: number; y: number; w: number; h: number; px: number; py: number }> = ({ frame, x, y, w, h, px, py }) => {
  const fr = 22;
  return (
    <g>
      <clipPath id="set-winclip"><rect x={x} y={y} width={w} height={h} /></clipPath>
      <rect x={x - 26} y={y - 26} width={w + 52} height={h + 52} fill="#f1e6cf" stroke="rgba(18,12,10,.55)" strokeWidth={2} style={SH_BIG} />
      <g clipPath="url(#set-winclip)">
        <City frame={frame} x={x} y={y} w={w} h={h} px={px} py={py} />
        <path d={`M ${x + w * 0.1} ${y + h} L ${x + w * 0.5} ${y} L ${x + w * 0.62} ${y} L ${x + w * 0.22} ${y + h}Z`} fill="#fff" opacity={0.05} />
        <path d={`M ${x + w * 0.5} ${y + h} L ${x + w * 0.85} ${y} L ${x + w * 0.9} ${y} L ${x + w * 0.56} ${y + h}Z`} fill="#fff" opacity={0.04} />
      </g>
      <rect x={x + w / 2 - fr / 2} y={y} width={fr} height={h} fill="#f1e6cf" stroke="rgba(18,12,10,.4)" strokeWidth={1.5} />
      <rect x={x} y={y + h * 0.44} width={w} height={fr} fill="#f1e6cf" stroke="rgba(18,12,10,.4)" strokeWidth={1.5} />
      <rect x={x - 40} y={y + h + 20} width={w + 80} height={26} rx={3} fill={C.tableDark} stroke="rgba(18,12,10,.55)" strokeWidth={2} style={SH} />
      {/* занавески */}
      <path d={`M ${x - 40} ${y - 40} L ${x + w * 0.2} ${y - 40} Q ${x + w * 0.1} ${y + h * 0.5} ${x + w * 0.26} ${y + h + 10} L ${x - 40} ${y + h + 10}Z`} fill="#c97b3a" stroke="rgba(18,12,10,.5)" strokeWidth={1.6} style={SH} />
      <path d={`M ${x + w + 40} ${y - 40} L ${x + w * 0.8} ${y - 40} Q ${x + w * 0.9} ${y + h * 0.5} ${x + w * 0.74} ${y + h + 10} L ${x + w + 40} ${y + h + 10}Z`} fill="#c97b3a" stroke="rgba(18,12,10,.5)" strokeWidth={1.6} style={SH} />
      <path d={`M ${x - 10} ${y - 30} Q ${x + 14} ${y + h * 0.45} ${x + 30} ${y + h}`} stroke="#9c5a24" strokeWidth={3} fill="none" opacity={0.6} />
      <path d={`M ${x + w + 10} ${y - 30} Q ${x + w - 14} ${y + h * 0.45} ${x + w - 30} ${y + h}`} stroke="#9c5a24" strokeWidth={3} fill="none" opacity={0.6} />
      <rect x={x - 50} y={y - 52} width={w + 100} height={14} rx={7} fill="#4a2f1e" style={SH} />
      {/* кактус на подоконнике */}
      <g transform={`translate(${x + w - 70} ${y + h + 20})`} style={SH}>
        <path d="M -18 0 L 18 0 L 13 -30 L -13 -30Z" fill="#c4572f" stroke="rgba(18,12,10,.5)" strokeWidth={1.5} />
        <path d="M -9 -30 C -14 -70 -4 -80 0 -80 C 8 -80 12 -66 9 -30Z" fill="#4f8a4a" stroke="rgba(18,12,10,.5)" strokeWidth={1.5} />
        <path d="M 9 -48 C 24 -50 24 -68 20 -70 C 14 -66 14 -56 9 -54Z" fill="#4f8a4a" stroke="rgba(18,12,10,.5)" strokeWidth={1.2} />
        <circle cx={0} cy={-82} r={4} fill="#ff7aa8" />
      </g>
      {frame < 0 && <g />}
    </g>
  );
};

// ---------------------------------------------------------------- холодильник
const Magnet: React.FC<{ x: number; y: number; w: number; h: number; fill: string; text: string; rot: number; fs?: number; color?: string }> = ({ x, y, w, h, fill, text, rot, fs = 15, color = "#fff" }) => (
  <g transform={`rotate(${rot} ${x + w / 2} ${y + h / 2})`} style={SH}>
    <rect x={x} y={y} width={w} height={h} rx={9} fill={fill} stroke="rgba(18,12,10,.5)" strokeWidth={1.4} />
    <text x={x + w / 2} y={y + h / 2 + fs * 0.35} textAnchor="middle" fontFamily="Arial Black, Impact, sans-serif" fontSize={fs} fill={color}>{text}</text>
  </g>
);

const Fridge: React.FC = () => (
  <g>
    <g style={SH_BIG}>
      <Cut x={-140} y={290} w={400} h={970} seed={11} fill="#d9d2c2" a={2.2} />
    </g>
    <Cut x={-140} y={290} w={400} h={350} seed={12} fill="#e4ddcc" a={1.8} />
    <rect x={-140} y={640} width={400} height={10} fill="#9a927f" />
    <rect x={218} y={380} width={14} height={190} rx={7} fill="#8f8776" stroke="rgba(18,12,10,.5)" strokeWidth={1.5} />
    <rect x={218} y={690} width={14} height={300} rx={7} fill="#8f8776" stroke="rgba(18,12,10,.5)" strokeWidth={1.5} />
    <path d="M -140 310 L 250 310" stroke="#fff" strokeWidth={4} opacity={0.35} />
    {/* календарик */}
    <g transform="translate(40 30) rotate(-2 80 800)" style={SH}>
      <rect x={20} y={700} width={140} height={150} fill="#fffaf0" stroke="rgba(18,12,10,.45)" strokeWidth={1.5} />
      <rect x={20} y={700} width={140} height={28} fill="#d6332a" />
      <text x={90} y={721} textAnchor="middle" fontFamily="Arial Black, Impact, sans-serif" fontSize={16} fill="#fff">ПЯТНИЦА 13</text>
      {Array.from({ length: 20 }, (_, k) => (
        <rect key={k} x={28 + (k % 5) * 26} y={738 + Math.floor(k / 5) * 26} width={20} height={18} fill="#e8e0cc" />
      ))}
      <circle cx={28 + 3 * 26 + 10} cy={738 + 2 * 26 + 9} r={14} fill="none" stroke="#d6332a" strokeWidth={3} />
      <text x={90} y={842} textAnchor="middle" fontFamily="Arial Black, Impact, sans-serif" fontSize={9} fill="#d6332a">МАМА ПРИЕЗЖАЕТ</text>
    </g>
    <Magnet x={24} y={668} w={160} h={46} fill="#e8742a" text="Спасибо, Claude" rot={-3} fs={15} />
    <Magnet x={30} y={980} w={60} h={60} fill="#3b82f6" text="AI" rot={6} fs={24} />
    <g transform="rotate(3 150 910)" style={SH}>
      <rect x={30} y={880} width={150} height={78} fill="#ffe66d" stroke="rgba(18,12,10,.4)" strokeWidth={1.2} />
      <text x={105} y={908} textAnchor="middle" fontFamily="Arial Black, Impact, sans-serif" fontSize={14} fill="#333">НЕ ЗАБЫТЬ:</text>
      <text x={105} y={930} textAnchor="middle" fontFamily="Arial Black, Impact, sans-serif" fontSize={13} fill="#c1272d">ПРОМПТ ЗА 200$</text>
      <text x={105} y={948} textAnchor="middle" fontFamily="Arial Black, Impact, sans-serif" fontSize={11} fill="#555">и купить мышьяк (шутка)</text>
    </g>
    <circle cx={150} cy={1010} r={26} fill="#f5c24a" stroke="rgba(18,12,10,.5)" strokeWidth={1.5} style={SH} />
    <circle cx={141} cy={1004} r={3.5} fill="#2a1a12" /><circle cx={159} cy={1004} r={3.5} fill="#2a1a12" />
    <path d="M 140 1018 Q 150 1028 160 1018" stroke="#2a1a12" strokeWidth={2.5} fill="none" />
    <Magnet x={30} y={420} w={100} h={44} fill="#7bbf5a" text="ПИЦЦА" rot={-5} fs={16} />
  </g>
);

// ---------------------------------------------------------------- плита, сушилка, полка
const Pot: React.FC<{ x: number; y: number; frame: number }> = ({ x, y, frame }) => (
  <g transform={`translate(${x} ${y})`} style={SH}>
    <rect x={-78} y={-82} width={156} height={84} rx={6} fill="#7d8591" stroke="rgba(18,12,10,.55)" strokeWidth={2} />
    <rect x={-78} y={-82} width={156} height={14} rx={4} fill="#9aa2ad" />
    <rect x={-96} y={-62} width={20} height={10} rx={5} fill="#3b3f46" />
    <rect x={76} y={-62} width={20} height={10} rx={5} fill="#3b3f46" />
    <path d="M -82 -82 Q 0 -122 82 -82Z" fill="#a3abb6" stroke="rgba(18,12,10,.55)" strokeWidth={2} />
    <circle cx={0} cy={-112} r={8} fill="#3b3f46" />
    <path d="M -50 -40 L 40 -40" stroke="#fff" strokeWidth={5} opacity={0.18} strokeLinecap="round" />
    <text x={0} y={-20} textAnchor="middle" fontFamily="Arial Black, Impact, sans-serif" fontSize={13} fill="#3b3f46" opacity={0.7}>БОРЩ?</text>
    <path d={`M -10 -124 q ${6 + 3 * Math.sin(frame * 0.1)} -16 0 -30`} stroke="#fff" strokeWidth={3} fill="none" opacity={0.12} />
  </g>
);

const Stove: React.FC<{ frame: number }> = ({ frame }) => (
  <g>
    {/* вытяжка */}
    <g style={SH_BIG}>
      <path d="M 880 610 L 1130 610 L 1188 520 L 1188 460 L 960 460 L 920 560Z" fill="#8f98a3" stroke="rgba(18,12,10,.55)" strokeWidth={2} />
    </g>
    <path d="M 880 610 L 1188 610" stroke="#c4cbd4" strokeWidth={4} />
    <rect x={1000} y={620} width={80} height={6} fill="#ffd36a" opacity={0.5} />
    {/* тумба и плита */}
    <g style={SH_BIG}>
      <Cut x={860} y={900} w={340} h={360} seed={21} fill="#aab1ba" a={2} />
    </g>
    <Cut x={880} y={990} w={300} h={220} seed={22} fill="#2b2a2e" a={1.5} />
    <rect x={900} y={1010} width={260} height={150} fill="#4a4a52" opacity={0.9} />
    <path d="M 910 1020 L 1050 1020 L 930 1150Z" fill="#fff" opacity={0.07} />
    <rect x={880} y={1020} width={300} height={10} rx={5} fill="#c4cbd4" />
    {[920, 990, 1060, 1130].map((kx, i) => (
      <g key={i}>
        <circle cx={kx} cy={945} r={15} fill="#2b2a2e" stroke="#ccc" strokeWidth={2} />
        <path d={`M ${kx} 945 L ${kx + 7} 936`} stroke="#fff" strokeWidth={3} />
      </g>
    ))}
    <rect x={850} y={880} width={350} height={26} rx={4} fill="#e9edf1" stroke="rgba(18,12,10,.55)" strokeWidth={2} />
    <ellipse cx={920} cy={880} rx={44} ry={7} fill="#2b2a2e" />
    <ellipse cx={995} cy={880} rx={54} ry={8} fill="#2b2a2e" />
    <Pot x={995} y={880} frame={frame} />
  </g>
);

const DishRack: React.FC = () => (
  <g style={SH}>
    <rect x={620} y={900} width={230} height={12} fill="#6c7480" />
    <Cut x={600} y={912} w={260} h={350} seed={31} fill="#7a4c27" a={2} />
    <rect x={620} y={940} width={100} height={300} fill="#6a4122" opacity={0.6} />
    <rect x={740} y={940} width={100} height={300} fill="#6a4122" opacity={0.6} />
    <circle cx={700} cy={1010} r={7} fill="#d6a64a" /><circle cx={760} cy={1010} r={7} fill="#d6a64a" />
    {/* сушилка */}
    <g transform="translate(0 0)">
      <path d="M 640 900 L 640 860 L 840 860 L 840 900" fill="none" stroke="#c4cbd4" strokeWidth={4} />
      {[0, 1, 2, 3, 4].map((k) => (
        <ellipse key={k} cx={662 + k * 36} cy={826} rx={8} ry={38} fill={k % 2 ? "#f4f0e6" : "#e7e1d2"} stroke="rgba(18,12,10,.45)" strokeWidth={1.4} />
      ))}
      {[0, 1, 2, 3].map((k) => (
        <path key={k} d={`M ${652 + k * 36} 860 L ${652 + k * 36} 896`} stroke="#c4cbd4" strokeWidth={3} />
      ))}
      <rect x={640} y={850} width={200} height={10} fill="#c4cbd4" />
      <path d="M 845 880 l 20 -10 l 0 -22 l -26 0 l 4 32z" fill="#3b82f6" stroke="rgba(18,12,10,.5)" strokeWidth={1.4} />
    </g>
  </g>
);

const Shelf: React.FC = () => (
  <g>
    <g style={SH}>
      <Cut x={740} y={396} w={450} h={18} seed={41} fill="#7a4c27" a={1.5} />
      <path d="M 770 414 l 0 24 l 30 -24z M 1150 414 l 0 24 l -30 -24z" fill="#5e3a27" />
      {/* банки */}
      {[0, 1, 2].map((k) => (
        <g key={k}>
          <rect x={780 + k * 48} y={340} width={38} height={56} rx={5} fill={["#d9a03a", "#c4572f", "#7bbf5a"][k]} opacity={0.9} stroke="rgba(18,12,10,.5)" strokeWidth={1.4} />
          <rect x={778 + k * 48} y={332} width={42} height={12} rx={3} fill="#f4ead2" stroke="rgba(18,12,10,.5)" strokeWidth={1.2} />
        </g>
      ))}
      {/* книга */}
      <rect x={950} y={352} width={34} height={44} fill="#2f6a8a" stroke="rgba(18,12,10,.5)" strokeWidth={1.4} />
      <rect x={986} y={346} width={30} height={50} fill="#a8431f" stroke="rgba(18,12,10,.5)" strokeWidth={1.4} />
      <text x={1001} y={372} fontSize={8} textAnchor="middle" fontFamily="Arial Black, Impact, sans-serif" fill="#f4ead2" transform="rotate(-90 1001 372)">БОРЩ</text>
      {/* кружка */}
      <path d="M 1050 396 L 1056 346 L 1094 346 L 1100 396Z" fill="#f4ead2" stroke="rgba(18,12,10,.5)" strokeWidth={1.4} />
      <path d="M 1098 358 q 22 4 0 28" stroke="#f4ead2" strokeWidth={6} fill="none" />
      <text x={1075} y={376} textAnchor="middle" fontSize={10} fontFamily="Arial Black, Impact, sans-serif" fill="#a8431f">#1 BF</text>
      {/* растение */}
      <path d="M 1130 396 L 1176 396 L 1170 356 L 1136 356Z" fill="#c4572f" stroke="rgba(18,12,10,.5)" strokeWidth={1.4} />
      <path d="M 1153 356 C 1130 320 1130 300 1148 296 C 1150 316 1156 330 1153 356Z M 1153 356 C 1176 320 1182 306 1166 296 C 1160 316 1156 336 1153 356Z" fill="#4f8a4a" stroke="rgba(18,12,10,.5)" strokeWidth={1.2} />
    </g>
  </g>
);

// ---------------------------------------------------------------- стол
const Plate: React.FC<{ x: number; y: number; s?: number }> = ({ x, y, s = 1 }) => (
  <g transform={`translate(${x} ${y}) scale(${s})`} style={SH}>
    <ellipse cx={0} cy={4} rx={108} ry={26} fill="rgba(0,0,0,.25)" />
    <ellipse cx={0} cy={0} rx={104} ry={25} fill="#f6f1e6" stroke="rgba(18,12,10,.45)" strokeWidth={1.6} />
    <ellipse cx={0} cy={0} rx={72} ry={16} fill="#ece4d2" />
    <path d="M -34 -3 Q -10 -14 12 -4 Q 30 -10 36 0 Q 14 8 -12 5 Q -26 6 -34 -3Z" fill="#d9772a" />
    <circle cx={-6} cy={-5} r={5} fill="#7bbf5a" />
    <circle cx={14} cy={-2} r={3.6} fill="#a8431f" />
  </g>
);

const Glass: React.FC<{ x: number; y: number; s?: number }> = ({ x, y, s = 1 }) => (
  <g transform={`translate(${x} ${y}) scale(${s})`} style={SH}>
    <ellipse cx={0} cy={2} rx={34} ry={8} fill="rgba(0,0,0,.25)" />
    <ellipse cx={0} cy={0} rx={32} ry={7} fill="#e9f3f8" opacity={0.85} stroke="rgba(18,12,10,.4)" strokeWidth={1.2} />
    <rect x={-3} y={-60} width={6} height={60} fill="#e9f3f8" opacity={0.9} stroke="rgba(18,12,10,.35)" strokeWidth={1} />
    <path d="M -34 -72 C -34 -130 34 -130 34 -72 C 34 -56 -34 -56 -34 -72Z" fill="#e9f3f8" opacity={0.78} stroke="rgba(18,12,10,.45)" strokeWidth={1.4} />
    <path d="M -33 -80 C -33 -76 33 -76 33 -80 C 34 -104 -34 -104 -33 -80Z" fill="#8e1b3c" />
    <ellipse cx={0} cy={-90} rx={31} ry={5} fill="#a8264a" />
    <path d="M -22 -112 Q -28 -90 -22 -72" stroke="#fff" strokeWidth={4} fill="none" opacity={0.7} strokeLinecap="round" />
  </g>
);

const Bottle: React.FC<{ x: number; y: number; s?: number }> = ({ x, y, s = 1 }) => (
  <g transform={`translate(${x} ${y}) scale(${s})`} style={SH}>
    <ellipse cx={0} cy={2} rx={42} ry={9} fill="rgba(0,0,0,.28)" />
    <path d="M -34 0 L -34 -130 C -34 -160 -10 -170 -9 -200 L -9 -236 L 9 -236 L 9 -200 C 10 -170 34 -160 34 -130 L 34 0Z" fill="#2b4a33" stroke="rgba(18,12,10,.55)" strokeWidth={1.6} />
    <rect x={-9} y={-246} width={18} height={14} rx={3} fill="#a8264a" />
    <rect x={-34} y={-110} width={68} height={62} fill="#f4ead2" />
    <text x={0} y={-83} textAnchor="middle" fontSize={11} fontFamily="Arial Black, Impact, sans-serif" fill="#7a1f3d">ХАТА</text>
    <text x={0} y={-67} textAnchor="middle" fontSize={9} fontFamily="Arial Black, Impact, sans-serif" fill="#7a1f3d">2019</text>
    <path d="M -24 -120 Q -28 -80 -24 -20" stroke="#fff" strokeWidth={4} fill="none" opacity={0.3} strokeLinecap="round" />
  </g>
);

function scallopPath(x0: number, x1: number, yTop: number, yBot: number, n: number, r: number, wobble: number) {
  const dx = (x1 - x0) / n;
  let d = `M ${x0} ${yTop} L ${x1} ${yTop} L ${x1 + wobble} ${yBot}`;
  for (let i = 0; i < n; i++) {
    const a = x1 + wobble - dx * i;
    d += ` Q ${a - dx / 2} ${yBot + r + jit(7, i, 6)} ${a - dx} ${yBot}`;
  }
  return d + "Z";
}

const Table: React.FC<{ view: "wide" | "table" }> = ({ view }) => {
  const wide = view === "wide";
  return (
    <g>
      {/* тень на полу */}
      <ellipse cx={540} cy={wide ? 1480 : 1840} rx={wide ? 640 : 760} ry={wide ? 150 : 170} fill="#6b2a2a" opacity={0.55} />
      <ellipse cx={540} cy={wide ? 1420 : 1790} rx={wide ? 520 : 700} ry={wide ? 50 : 70} fill="rgba(0,0,0,.45)" />
      {wide ? (
        <g>
          <g style={SH_BIG}>
            <path d={scallopPath(140, 940, 1100, 1370, 16, 26, 0)} fill={C.cloth} stroke="rgba(18,12,10,.55)" strokeWidth={2} />
          </g>
          {[200, 310, 430, 560, 690, 810, 900].map((fx, i) => (
            <path key={i} d={`M ${fx} 1105 Q ${fx + (i % 2 ? 14 : -14)} 1240 ${fx + (i % 2 ? 6 : -6)} 1372`} stroke={C.clothDark} strokeWidth={14 + (i % 3) * 6} opacity={0.35} fill="none" strokeLinecap="round" />
          ))}
          <path d="M 140 1100 L 940 1100 L 940 1118 L 140 1118Z" fill={C.clothDark} opacity={0.55} />
          <path d="M 120 1050 L 960 1050 L 940 1104 L 140 1104Z" fill={C.cloth} stroke="rgba(18,12,10,.55)" strokeWidth={2} />
          <path d="M 120 1050 L 960 1050 L 952 1060 L 128 1060Z" fill={C.clothLite} opacity={0.6} />
          <rect x={140} y={1064} width={800} height={14} fill="url(#set-check)" opacity={0.55} />
          <rect x={140} y={1076} width={800} height={26} fill="url(#set-check)" opacity={0.55} />
        </g>
      ) : (
        <g>
          <g style={SH_BIG}>
            <path d={scallopPath(-60, 1140, 1380, 1730, 18, 34, 0)} fill={C.cloth} stroke="rgba(18,12,10,.55)" strokeWidth={2} />
          </g>
          {[40, 190, 340, 500, 640, 790, 940, 1060].map((fx, i) => (
            <path key={i} d={`M ${fx} 1385 Q ${fx + (i % 2 ? 18 : -18)} 1560 ${fx + (i % 2 ? 8 : -8)} 1735`} stroke={C.clothDark} strokeWidth={18 + (i % 3) * 8} opacity={0.35} fill="none" strokeLinecap="round" />
          ))}
          <path d="M 130 1000 L 950 1000 L 1140 1380 L -60 1380Z" fill={C.cloth} stroke="rgba(18,12,10,.55)" strokeWidth={2} />
          <path d="M 130 1000 L 950 1000 L 1140 1380 L -60 1380Z" fill="url(#set-check)" opacity={0.55} />
          <path d="M 130 1000 L 950 1000 L 975 1048 L 105 1048Z" fill="#000" opacity={0.18} />
          <path d="M -60 1380 L 1140 1380 L 1140 1398 L -60 1398Z" fill={C.clothDark} opacity={0.6} />
        </g>
      )}
    </g>
  );
};

// ---------------------------------------------------------------- гирлянда
const Garland: React.FC<{ frame: number }> = ({ frame }) => {
  const bulbs = Array.from({ length: 12 }, (_, i) => {
    const t = i / 11;
    const x = -60 + t * 1200;
    return { x, y: 100 + 60 * (1 - Math.pow(2 * t - 1, 2)), i };
  });
  return (
    <g>
      <path d={`M -60 100 Q 540 220 1140 100`} stroke="#2a1a12" strokeWidth={3} fill="none" />
      {bulbs.map((b) => {
        const glow = 0.65 + 0.35 * Math.sin(frame * 0.07 + b.i * 1.7);
        return (
          <g key={b.i} transform={`translate(${b.x} ${b.y})`}>
            <circle r={26} fill="url(#set-glowSmall)" opacity={0.55 * glow} style={{ mixBlendMode: "screen" }} />
            <ellipse cx={0} cy={8} rx={6} ry={9} fill={["#ffd36a", "#ff9a5a", "#fff0b0"][b.i % 3]} opacity={0.6 + 0.4 * glow} stroke="rgba(18,12,10,.4)" strokeWidth={1} />
          </g>
        );
      })}
    </g>
  );
};

// ---------------------------------------------------------------- главный компонент
export const Kitchen: React.FC<KitchenProps> = ({ frame, view, parallax = { x: 0, y: 0 }, candles = true, melt = 0, dropFrame }) => {
  const L = KITCHEN_LAYOUT[view];
  const P = (d: number) => `translate(${(parallax.x * d * 40).toFixed(2)} ${(parallax.y * d * 26).toFixed(2)})`;
  const win = L.window;
  const full = view !== "backWall";
  const wallShift = view === "table" ? "translate(0 -40)" : "";
  const fl = (flicker(frame, 0.4) + flicker(frame, 2.1)) / 2;
  const cx = L.candles.x;
  const cy = L.candles.y;
  const cs = view === "table" ? 1.3 : 1;

  return (
    <svg
      width={1296}
      height={2304}
      viewBox="-108 -192 1296 2304"
      style={{ position: "absolute", left: -108, top: -192, overflow: "hidden", background: C.bg }}
    >
      <defs>
        <linearGradient id="set-wallG" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#6e4630" />
          <stop offset="0.5" stopColor="#8a5a3c" />
          <stop offset="1" stopColor="#7a4d33" />
        </linearGradient>
        <linearGradient id="set-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#0b1130" />
          <stop offset="0.6" stopColor="#2b2358" />
          <stop offset="1" stopColor="#7a3b52" />
        </linearGradient>
        <linearGradient id="set-floorG" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#4a352a" />
          <stop offset="1" stopColor="#2a1c16" />
        </linearGradient>
        <pattern id="set-wallpaper" width={90} height={90} patternUnits="userSpaceOnUse">
          <circle cx={22} cy={22} r={5} fill="#a8734f" opacity={0.55} />
          <circle cx={67} cy={67} r={5} fill="#a8734f" opacity={0.55} />
          <path d="M 45 8 l 4 8 l -8 0z M 0 52 l 4 8 l -8 0z" fill="#6e4630" opacity={0.35} />
        </pattern>
        <pattern id="set-check" width={44} height={44} patternUnits="userSpaceOnUse">
          <rect width={22} height={22} fill={C.clothLite} />
          <rect x={22} y={22} width={22} height={22} fill={C.clothLite} />
        </pattern>
        <pattern id="set-tiles" width={34} height={34} patternUnits="userSpaceOnUse">
          <rect width={34} height={34} fill="#e9dcc0" />
          <rect width={34} height={34} fill="none" stroke="#b8a584" strokeWidth={2} />
        </pattern>
        <radialGradient id="set-vig" cx="0.5" cy="0.5" r="0.75">
          <stop offset="0.45" stopColor="#0c0605" stopOpacity={0} />
          <stop offset="1" stopColor="#0c0605" stopOpacity={0.78} />
        </radialGradient>
        <radialGradient id="set-dim" gradientUnits="userSpaceOnUse" cx={540} cy={900} r={1000}>
          <stop offset="0" stopColor="#1b0f0a" stopOpacity={0} />
          <stop offset="0.5" stopColor="#1b0f0a" stopOpacity={0.3} />
          <stop offset="1" stopColor="#1b0f0a" stopOpacity={0.55} />
        </radialGradient>
        <GlowDefs />
      </defs>

      {/* стена */}
      <g transform={P(0.1)}>
        <rect x={-300} y={-300} width={1700} height={1700} fill="url(#set-wallG)" />
        <rect x={-300} y={-300} width={1700} height={1700} fill="url(#set-wallpaper)" opacity={0.7} />
        <rect x={-300} y={0} width={1700} height={26} fill="#4a2f1e" opacity={0.45} />
        {full && (
          <g transform={wallShift}>
            <path d={cut(700, 740, 520, 190, 5, 1.5, 80)} fill="url(#set-tiles)" opacity={0.9} stroke="rgba(18,12,10,.4)" strokeWidth={1.5} />
          </g>
        )}
      </g>

      {/* окно */}
      <g transform={`${P(0.1)} ${wallShift}`}>
        <WindowBlock frame={frame} x={win.x} y={win.y} w={win.w} h={win.h} px={parallax.x * 6} py={parallax.y * 4} />
      </g>

      {/* гирлянда */}
      <g transform={P(0.15)}>
        <Garland frame={frame} />
      </g>

      {full && (
        <g transform={`${P(0.35)} ${wallShift}`}>
          <Shelf />
        </g>
      )}

      {/* пол */}
      <g transform={P(0.5)}>
        <rect x={-300} y={view === "table" ? 1330 : 1240} width={1700} height={900} fill="url(#set-floorG)" />
        <rect x={-300} y={view === "table" ? 1330 : 1240} width={1700} height={26} fill={C.wallDark} stroke="rgba(18,12,10,.5)" strokeWidth={2} />
        {Array.from({ length: 14 }, (_, i) => (
          <path key={i} d={`M ${-300 + i * 140} ${view === "table" ? 1356 : 1266} L ${-420 + i * 190} 2200`} stroke="#1f1410" strokeWidth={3} opacity={0.5} />
        ))}
      </g>

      {full && (
        <g transform={`${P(0.45)} ${wallShift}`}>
          <Fridge />
          <DishRack />
          <Stove frame={frame} />
        </g>
      )}

      {/* backWall: комод со скатертью-дорожкой */}
      {view === "backWall" && (
        <g transform={P(0.8)}>
          <g style={SH_BIG}>
            <Cut x={-200} y={1190} w={1600} h={900} seed={61} fill={C.tableDark} a={2} step={200} />
          </g>
          <rect x={-200} y={1190} width={1600} height={30} fill={C.table} />
          <path d={scallopPath(260, 820, 1200, 1280, 8, 22, 0)} fill={C.cloth} stroke="rgba(18,12,10,.55)" strokeWidth={2} />
          <rect x={260} y={1190} width={560} height={14} fill={C.clothLite} />
        </g>
      )}

      {/* стол + посуда + свечи */}
      <g transform={view === "backWall" ? P(0.8) : P(0.8)}>
        {full && <Table view={view as "wide" | "table"} />}
        {view === "wide" && (
          <g>
            <Bottle x={880} y={1080} />
            <Plate x={300} y={1080} />
            <Plate x={780} y={1080} />
            <Glass x={410} y={1075} />
            <Glass x={670} y={1075} />
            <g transform="translate(615 1090)" style={SH}><rect x={0} y={-30} width={22} height={30} fill="#f4ead2" stroke="rgba(18,12,10,.4)" strokeWidth={1.2} /><rect x={2} y={-34} width={18} height={6} fill="#aaa" /></g>
          </g>
        )}
        {view === "table" && (
          <g>
            <Bottle x={880} y={1130} s={1.2} />
            <Plate x={290} y={1250} s={1.35} />
            <Plate x={790} y={1250} s={1.35} />
            <Glass x={370} y={1160} s={1.2} />
            <Glass x={710} y={1160} s={1.2} />
          </g>
        )}
        <g transform={`translate(${cx} ${cy}) scale(${cs})`}>
          <CandleGlow frame={frame} scale={1} />
        </g>
        {candles && (
          <g transform={`translate(${cx} ${cy}) scale(${cs})`}>
            <CandlesGroup frame={frame} melt={melt} dropFrame={dropFrame} />
          </g>
        )}
      </g>

      {/* свет и виньетка */}
      <g transform={P(0.8)}>
        <rect x={-300} y={-300} width={1700} height={2500} fill="url(#set-dim)" />
        <ellipse cx={cx} cy={cy - 220 * cs} rx={620 + 20 * fl} ry={560 + 15 * fl} fill="url(#set-glowBig)" opacity={0.5 + 0.06 * fl} style={{ mixBlendMode: "screen" }} />
      </g>
      <rect x={-108} y={-192} width={1296} height={2304} fill="url(#set-vig)" />
    </svg>
  );
};
