import React from "react";
import { C, CharacterCfg, CharacterProps, CharacterShell, Rig, edge } from "./shared";

const HAIR_LIGHT = "#c85a2a";
const DRESS_DARK = "#531229";

const cfg: CharacterCfg = {
  seed: 11,
  skin: C.skin,
  skinShade: C.skinShade,
  sleeve: C.katyaDress,
  sleeveDark: DRESS_DARK,
  browColor: "#6b2c14",
  browThick: 17,
  lashes: true,
  lipColor: "#b8203f",
  lipWidth: 8,
  eyeR: 64,
  pupilR: 0.3,
  headR: 236,
  tweaks: {
    // «загадочная» полуулыбка
    neutral: { bi: -4, bo: -4, bl: -6, arch: 0.7, lid: 0.2, lidA: 4, mc: 0.38, skew: 0.55, mw: 60 },
  },
  headBehind: () => null,
  hairBack: (_r: Rig, view) =>
    view === "front" ? (
      <g>
        <path
          d="M 244 400 C 214 250 300 120 500 118 C 700 120 786 250 756 400 L 770 640 C 772 700 740 726 690 716 L 676 720 L 324 720 L 310 716 C 260 726 228 700 230 640 Z"
          fill={C.katyaHair}
          stroke={C.inkSoft}
          strokeWidth={4}
          strokeLinejoin="round"
        />
        <path d="M 262 560 q 6 80 30 130 M 738 560 q -6 80 -30 130" stroke={HAIR_LIGHT} strokeWidth={9} fill="none" strokeLinecap="round" opacity={0.7} />
      </g>
    ) : (
      <g>
        <path
          d="M 236 410 C 210 250 300 120 460 118 C 600 120 660 220 650 330 L 640 650 L 520 690 C 440 726 300 724 266 700 C 230 660 226 520 236 410 Z"
          fill={C.katyaHair}
          stroke={C.inkSoft}
          strokeWidth={4}
          strokeLinejoin="round"
        />
        <path d="M 270 520 q 4 80 40 130" stroke={HAIR_LIGHT} strokeWidth={9} fill="none" strokeLinecap="round" opacity={0.7} />
      </g>
    ),
  body: (r: Rig, view) => {
    const side = view === "side";
    const cx = side ? 460 : 500;
    if (!side) {
      return (
        <g>
          <path d="M 262 800 Q 258 690 372 676 L 628 676 Q 742 690 738 800 L 790 1350 Q 792 1394 744 1394 L 256 1394 Q 208 1394 210 1350 Z" fill={C.katyaDress} {...edge} strokeWidth={4} />
          <path d="M 300 920 q 20 130 -10 380 M 700 920 q -20 130 10 380" stroke={DRESS_DARK} strokeWidth={8} fill="none" strokeLinecap="round" opacity={0.5} />
          {/* шея */}
          <rect x={440} y={600} width={120} height={120} fill={C.skinShade} {...edge} />
          {/* вырез-V */}
          <path d="M 392 678 L 608 678 L 500 850 Z" fill={C.skin} stroke={C.inkSoft} strokeWidth={4} strokeLinejoin="round" />
          <path d="M 392 678 L 500 850 L 608 678" fill="none" stroke={DRESS_DARK} strokeWidth={14} strokeLinejoin="round" strokeLinecap="round" />
          {/* ожерелье */}
          <path d="M 440 700 Q 500 770 560 700" fill="none" stroke={C.gold} strokeWidth={6} strokeLinecap="round" />
          <circle cx={500} cy={742} r={11} fill={C.gold} {...edge} />
          <ellipse cx={500} cy={684} rx={116} ry={26} fill={C.ink} opacity={0.2} />
          {/* пояс */}
          <rect x={246} y={1060} width={508} height={34} fill={DRESS_DARK} opacity={0.7} />
          <ellipse cx={410} cy={1394} rx={70} ry={22} fill={C.ink} />
          <ellipse cx={590} cy={1394} rx={70} ry={22} fill={C.ink} />
        </g>
      );
    }
    return (
      <g>
        <path d={`M ${cx - 190} 800 Q ${cx - 210} 690 ${cx - 90} 676 L ${cx + 100} 676 Q ${cx + 190} 700 ${cx + 180} 800 L ${cx + 220} 1350 Q ${cx + 220} 1394 ${cx + 170} 1394 L ${cx - 200} 1394 Q ${cx - 250} 1394 ${cx - 245} 1350 Z`} fill={C.katyaDress} {...edge} strokeWidth={4} />
        <rect x={cx - 50} y={600} width={110} height={120} fill={C.skinShade} {...edge} />
        <path d={`M ${cx - 60} 678 L ${cx + 100} 690 L ${cx + 80} 800 Z`} fill={C.skin} stroke={C.inkSoft} strokeWidth={4} strokeLinejoin="round" />
        <path d={`M ${cx - 60} 678 L ${cx + 80} 800 L ${cx + 100} 690`} fill="none" stroke={DRESS_DARK} strokeWidth={12} strokeLinejoin="round" strokeLinecap="round" />
        <ellipse cx={cx} cy={685} rx={110} ry={26} fill={C.ink} opacity={0.2} />
        <rect x={cx - 230} y={1060} width={440} height={32} fill={DRESS_DARK} opacity={0.7} />
        <ellipse cx={cx + 20} cy={1394} rx={110} ry={22} fill={C.ink} />
      </g>
    );
  },
  earDecor: (_r: Rig, _view) => (
    <g>
      <line x1={266} y1={462} x2={266} y2={500} stroke={C.gold} strokeWidth={4} />
      <line x1={734} y1={462} x2={734} y2={500} stroke={C.gold} strokeWidth={4} />
      <circle cx={266} cy={466} r={12} fill={C.gold} {...edge} />
      <circle cx={734} cy={466} r={12} fill={C.gold} {...edge} />
      <path d="M 266 496 l 14 22 l -14 22 l -14 -22 Z" fill={C.gold} {...edge} />
      <path d="M 734 496 l 14 22 l -14 22 l -14 -22 Z" fill={C.gold} {...edge} />
    </g>
  ),
  hairFront: (_r: Rig, view) => {
    if (view === "front") {
      return (
        <g>
          {/* чёлка-косая + боковые пряди */}
          <path
            d="M 250 470 C 226 270 300 130 500 124 C 700 130 774 270 750 470 L 744 560 C 720 560 706 520 702 470 C 696 400 690 360 668 310
               C 600 340 500 330 420 270 C 380 330 330 380 304 410 C 300 470 292 540 266 560 L 250 470 Z"
            fill={C.katyaHair}
            stroke={C.inkSoft}
            strokeWidth={4}
            strokeLinejoin="round"
          />
          <path d="M 330 200 q 90 -50 200 -30 M 540 180 q 80 30 120 100" stroke={HAIR_LIGHT} strokeWidth={9} fill="none" strokeLinecap="round" opacity={0.7} />
          <path d="M 420 272 C 480 330 600 346 668 312" stroke={C.ink} strokeWidth={0} fill="none" />
        </g>
      );
    }
    return (
      <g>
        <path
          d="M 240 450 C 214 270 300 130 470 124 C 610 130 690 230 690 320 C 640 310 600 290 560 262 C 520 310 470 340 420 350 C 380 380 340 420 330 480 L 300 560 L 240 450 Z"
          fill={C.katyaHair}
          stroke={C.inkSoft}
          strokeWidth={4}
          strokeLinejoin="round"
        />
        <path d="M 330 200 q 90 -50 200 -30" stroke={HAIR_LIGHT} strokeWidth={9} fill="none" strokeLinecap="round" opacity={0.7} />
      </g>
    );
  },
  faceDecor: (_r: Rig, view) =>
    view === "front" ? (
      <g>
        {[266, 734].map((x) => (
          <g key={x}>
            <line x1={x} y1={470} x2={x} y2={520} stroke={C.gold} strokeWidth={4} />
            <circle cx={x} cy={474} r={13} fill={C.gold} {...edge} />
            <path d={`M ${x} 510 l 17 28 l -17 28 l -17 -28 Z`} fill={C.gold} {...edge} />
          </g>
        ))}
      </g>
    ) : (
      <g>
        <line x1={410} y1={470} x2={410} y2={520} stroke={C.gold} strokeWidth={4} />
        <circle cx={410} cy={474} r={13} fill={C.gold} {...edge} />
        <path d="M 410 510 l 17 28 l -17 28 l -17 -28 Z" fill={C.gold} {...edge} />
      </g>
    ),
};

/* ---------------- халат + полотенце-тюрбан (outfit="robe") ---------------- */
const ROBE = "#f1ece2";
const ROBE_DARK = "#cfc6b4";
const TOWEL = "#5fb7bd";
const TOWEL_DARK = "#3f8f97";

const terry = (x0: number, x1: number, y0: number, y1: number, n: number) => {
  const out: React.ReactNode[] = [];
  for (let i = 0; i < n; i++) {
    const a = Math.sin(i * 12.9898) * 43758.5453, b = Math.sin(i * 78.233) * 12345.678;
    const u = a - Math.floor(a), v = b - Math.floor(b);
    const x = x0 + u * (x1 - x0), y = y0 + v * (y1 - y0);
    out.push(<path key={i} d={`M ${x} ${y} q 8 -10 16 0`} stroke={ROBE_DARK} strokeWidth={4} fill="none" strokeLinecap="round" opacity={0.7} />);
  }
  return out;
};

const robeBody = (_r: Rig, view: "front" | "side") => {
  if (view === "front") {
    return (
      <g>
        <path d="M 250 800 Q 246 690 372 676 L 628 676 Q 754 690 750 800 L 800 1350 Q 802 1394 754 1394 L 246 1394 Q 198 1394 200 1350 Z" fill={ROBE} {...edge} strokeWidth={4} />
        <path d="M 300 920 q 20 130 -10 380 M 700 920 q -20 130 10 380" stroke={ROBE_DARK} strokeWidth={8} fill="none" strokeLinecap="round" opacity={0.8} />
        {terry(290, 700, 900, 1360, 26)}
        <rect x={440} y={600} width={120} height={120} fill={C.skinShade} {...edge} />
        <path d="M 392 678 L 608 678 L 500 900 Z" fill={C.skin} stroke={C.inkSoft} strokeWidth={4} strokeLinejoin="round" />
        <ellipse cx={500} cy={690} rx={96} ry={22} fill={C.ink} opacity={0.18} />
        {/* шалевый воротник */}
        <path d="M 392 672 L 530 1062" stroke={C.inkSoft} strokeWidth={58} strokeLinecap="round" fill="none" />
        <path d="M 608 672 L 470 1062" stroke={C.inkSoft} strokeWidth={58} strokeLinecap="round" fill="none" />
        <path d="M 392 672 L 530 1062" stroke="#fffaf0" strokeWidth={52} strokeLinecap="round" fill="none" />
        <path d="M 608 672 L 470 1062" stroke="#fffaf0" strokeWidth={52} strokeLinecap="round" fill="none" />
        <path d="M 404 700 L 520 1020 M 596 700 L 480 1020" stroke={ROBE_DARK} strokeWidth={6} fill="none" strokeLinecap="round" />
        {/* пояс */}
        <rect x={224} y={1050} width={552} height={40} fill={ROBE_DARK} {...edge} />
        <ellipse cx={500} cy={1072} rx={42} ry={34} fill={ROBE_DARK} {...edge} />
        <path d="M 480 1086 q -30 80 -50 130 M 520 1086 q 20 90 36 134" stroke={C.inkSoft} strokeWidth={30} strokeLinecap="round" fill="none" />
        <path d="M 480 1086 q -30 80 -50 130 M 520 1086 q 20 90 36 134" stroke={ROBE_DARK} strokeWidth={24} strokeLinecap="round" fill="none" />
        {/* карманы */}
        <path d="M 270 1160 h 110 v 110 h -110 Z M 620 1160 h 110 v 110 h -110 Z" fill="none" stroke={ROBE_DARK} strokeWidth={6} />
        <ellipse cx={410} cy={1394} rx={70} ry={22} fill={C.ink} />
        <ellipse cx={590} cy={1394} rx={70} ry={22} fill={C.ink} />
      </g>
    );
  }
  const cx = 460;
  return (
    <g>
      <path d={`M ${cx - 200} 800 Q ${cx - 220} 690 ${cx - 90} 676 L ${cx + 100} 676 Q ${cx + 200} 700 ${cx + 190} 800 L ${cx + 230} 1350 Q ${cx + 230} 1394 ${cx + 180} 1394 L ${cx - 210} 1394 Q ${cx - 260} 1394 ${cx - 255} 1350 Z`} fill={ROBE} {...edge} strokeWidth={4} />
      {terry(cx - 200, cx + 170, 900, 1360, 20)}
      <rect x={cx - 50} y={600} width={110} height={120} fill={C.skinShade} {...edge} />
      <path d={`M ${cx - 60} 678 L ${cx + 100} 690 L ${cx + 80} 820 Z`} fill={C.skin} stroke={C.inkSoft} strokeWidth={4} strokeLinejoin="round" />
      <path d={`M ${cx - 60} 676 L ${cx + 100} 1062`} stroke={C.inkSoft} strokeWidth={56} strokeLinecap="round" fill="none" />
      <path d={`M ${cx - 60} 676 L ${cx + 100} 1062`} stroke="#fffaf0" strokeWidth={50} strokeLinecap="round" fill="none" />
      <ellipse cx={cx} cy={685} rx={110} ry={26} fill={C.ink} opacity={0.18} />
      <rect x={cx - 240} y={1050} width={460} height={40} fill={ROBE_DARK} {...edge} />
      <ellipse cx={cx + 100} cy={1072} rx={34} ry={30} fill={ROBE_DARK} {...edge} />
      <ellipse cx={cx + 20} cy={1394} rx={110} ry={22} fill={C.ink} />
    </g>
  );
};

const towel = (view: "front" | "side") => {
  const o = view === "front" ? 0 : -30;
  const wrap = (d: string, i: number) => <path key={i} d={d} stroke={TOWEL_DARK} strokeWidth={9} fill="none" strokeLinecap="round" opacity={0.8} />;
  return (
    <g>
      <path
        d={`M ${250 + o} 410 C ${226 + o} 250 ${290 + o} 110 ${500 + o} 100 C ${700 + o} 110 ${770 + o} 250 ${748 + o} 410 C ${700 + o} 330 ${600 + o} 276 ${500 + o} 274 C ${400 + o} 276 ${300 + o} 330 ${250 + o} 410 Z`}
        fill={TOWEL} stroke={C.inkSoft} strokeWidth={4} strokeLinejoin="round"
      />
      {/* навитый ком сверху */}
      <path d={`M ${300 + o} 170 C ${290 + o} 40 ${420 + o} -20 ${540 + o} -10 C ${690 + o} 0 ${730 + o} 100 ${700 + o} 180 C ${620 + o} 130 ${400 + o} 130 ${300 + o} 170 Z`} fill={TOWEL} stroke={C.inkSoft} strokeWidth={4} strokeLinejoin="round" />
      {[
        `M ${280 + o} 330 C ${360 + o} 230 ${560 + o} 200 ${730 + o} 330`,
        `M ${270 + o} 270 C ${380 + o} 170 ${580 + o} 150 ${740 + o} 270`,
        `M ${340 + o} 110 C ${420 + o} 60 ${560 + o} 50 ${650 + o} 120`,
        `M ${330 + o} 60 C ${400 + o} 10 ${520 + o} 0 ${620 + o} 50`,
      ].map(wrap)}
      <path d={`M ${300 + o} 150 C ${400 + o} 110 ${600 + o} 110 ${700 + o} 160`} stroke={TOWEL_DARK} strokeWidth={9} fill="none" strokeLinecap="round" opacity={0.8} />
    </g>
  );
};

const robeCfg: CharacterCfg = {
  ...cfg,
  sleeve: ROBE,
  sleeveDark: ROBE_DARK,
  hairBack: () => null,
  body: robeBody,
  hairFront: (_r: Rig, view) => towel(view),
};

export const Katya: React.FC<CharacterProps> = (props) => (
  <CharacterShell p={props} cfg={props.outfit === "robe" ? robeCfg : cfg} />
);
