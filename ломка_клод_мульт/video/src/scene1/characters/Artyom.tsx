import React from "react";
import { C, CharacterCfg, CharacterProps, CharacterShell, Rig, edge } from "./shared";

const HOOD_DARK = "#4a505b";
const HOODIE_LIGHT = "#7b8290";

const stubble = (cx: number, cy: number, seed: number) => {
  const dots: React.ReactNode[] = [];
  for (let i = 0; i < 46; i++) {
    const a = Math.sin(i * 12.9898 + seed) * 43758.5453;
    const b = Math.sin(i * 78.233 + seed) * 12345.678;
    const u = a - Math.floor(a), v = b - Math.floor(b);
    const ang = Math.PI * (0.12 + 0.76 * u);
    const rr = 128 + v * 60;
    const x = cx + Math.cos(ang) * rr * 1.05 * (u > 0.5 ? 1 : 1);
    const y = cy + Math.sin(ang) * rr * 0.72 + 6;
    dots.push(<ellipse key={i} cx={x} cy={y} rx={4} ry={2.5} fill={C.artyomHair} opacity={0.45} transform={`rotate(${(u - 0.5) * 80} ${x} ${y})`} />);
  }
  return <g>{dots}</g>;
};

const cfg: CharacterCfg = {
  seed: 3,
  skin: C.skin,
  skinShade: C.skinShade,
  sleeve: C.artyomHoodie,
  sleeveDark: HOOD_DARK,
  browColor: C.artyomHair,
  browThick: 36,
  lashes: false,
  lipColor: C.ink,
  lipWidth: 6,
  eyeR: 62,
  pupilR: 0.3,
  headR: 238,
  tweaks: {
    neutral: { bi: 6, bo: -2, bl: -4, lid: 0.12, mc: -0.12, mw: 52 }, // нелепо-серьёзное
  },
  headBehind: () => null,
  hairBack: () => null,
  body: (r: Rig, view) => {
    const side = view === "side";
    const cx = side ? 460 : 500;
    if (!side) {
      return (
        <g>
          {/* торс */}
          <path d="M 250 790 Q 248 690 360 676 L 640 676 Q 752 690 750 790 L 785 1340 Q 786 1390 740 1392 L 260 1392 Q 214 1390 215 1340 Z" fill={C.artyomHoodie} {...edge} strokeWidth={4} />
          {/* складки */}
          <path d="M 330 900 q 40 40 20 110 M 670 900 q -40 40 -20 110" stroke={HOOD_DARK} strokeWidth={6} fill="none" strokeLinecap="round" opacity={0.6} />
          {/* шея */}
          <rect x={430} y={600} width={140} height={110} fill={C.skinShade} {...edge} />
          {/* капюшон */}
          <path d="M 318 700 Q 330 840 500 860 Q 670 840 682 700" fill="none" stroke={C.inkSoft} strokeWidth={70} strokeLinecap="round" />
          <path d="M 318 700 Q 330 840 500 860 Q 670 840 682 700" fill="none" stroke={HOOD_DARK} strokeWidth={62} strokeLinecap="round" />
          <path d="M 340 706 Q 360 810 500 826 Q 640 810 660 706" fill="none" stroke={HOODIE_LIGHT} strokeWidth={8} strokeLinecap="round" opacity={0.6} />
          {/* тень от головы на шее */}
          <ellipse cx={500} cy={680} rx={120} ry={30} fill={C.ink} opacity={0.22} />
          {/* шнурки */}
          <path d="M 455 850 q -6 60 -2 110" stroke={C.white} strokeWidth={9} fill="none" strokeLinecap="round" />
          <path d="M 545 850 q 6 70 2 130" stroke={C.white} strokeWidth={9} fill="none" strokeLinecap="round" />
          <circle cx={452} cy={968} r={10} fill={C.white} {...edge} />
          <circle cx={547} cy={988} r={10} fill={C.white} {...edge} />
          {/* карман-кенгуру */}
          <path d="M 330 1140 L 670 1140 L 722 1300 L 278 1300 Z" fill={HOOD_DARK} opacity={0.55} {...edge} />
          {/* ботинки */}
          <ellipse cx={400} cy={1392} rx={80} ry={26} fill={C.ink} />
          <ellipse cx={600} cy={1392} rx={80} ry={26} fill={C.ink} />
        </g>
      );
    }
    // профиль, лицом вправо
    return (
      <g>
        <path d={`M ${cx - 195} 800 Q ${cx - 215} 690 ${cx - 90} 676 L ${cx + 110} 676 Q ${cx + 200} 700 ${cx + 190} 800 L ${cx + 205} 1340 Q ${cx + 205} 1392 ${cx + 150} 1392 L ${cx - 185} 1392 Q ${cx - 240} 1390 ${cx - 235} 1340 Z`} fill={C.artyomHoodie} {...edge} strokeWidth={4} />
        <path d={`M ${cx - 195} 800 Q ${cx - 215} 690 ${cx - 90} 676 L ${cx - 60} 676 L ${cx - 60} 1392 L ${cx - 185} 1392 Q ${cx - 240} 1390 ${cx - 235} 1340 Z`} fill={HOOD_DARK} opacity={0.25} />
        <rect x={cx - 52} y={600} width={118} height={110} fill={C.skinShade} {...edge} />
        {/* капюшон сзади и спереди */}
        <path d={`M ${cx - 180} 710 Q ${cx - 150} 840 ${cx - 20} 850 Q ${cx + 90} 840 ${cx + 110} 720`} fill="none" stroke={C.inkSoft} strokeWidth={66} strokeLinecap="round" />
        <path d={`M ${cx - 180} 710 Q ${cx - 150} 840 ${cx - 20} 850 Q ${cx + 90} 840 ${cx + 110} 720`} fill="none" stroke={HOOD_DARK} strokeWidth={58} strokeLinecap="round" />
        <ellipse cx={cx} cy={685} rx={110} ry={28} fill={C.ink} opacity={0.22} />
        <path d={`M ${cx + 60} 850 q 4 60 0 110`} stroke={C.white} strokeWidth={9} fill="none" strokeLinecap="round" />
        <circle cx={cx + 60} cy={968} r={10} fill={C.white} {...edge} />
        <path d={`M ${cx + 10} 1140 L ${cx + 190} 1150 L ${cx + 200} 1300 L ${cx - 100} 1300 Z`} fill={HOOD_DARK} opacity={0.5} {...edge} />
        <ellipse cx={cx + 20} cy={1392} rx={120} ry={26} fill={C.ink} />
      </g>
    );
  },
  hairFront: (_r: Rig, view) => {
    if (view === "front") {
      return (
        <g>
          {/* общий массив растрёпанных волос */}
          <path
            d="M 262 372 C 232 280 250 190 318 150 L 300 96 L 366 128 L 392 66 L 446 118 L 492 52 L 538 116 L 596 70 L 612 130 L 676 98 L 676 154 L 744 150 L 722 210 C 764 262 770 330 742 376
               L 724 318 L 698 262 L 664 300 L 632 238 L 590 280 L 556 232 L 520 262
               C 512 296 486 340 432 346 C 446 316 438 290 408 268 L 368 300 L 346 252 L 306 308 Z"
            fill={C.artyomHair}
            stroke={C.inkSoft}
            strokeWidth={4}
            strokeLinejoin="round"
          />
          {/* чуб-завиток */}
          <path d="M 430 346 C 470 350 520 318 524 278" stroke="#4a3426" strokeWidth={8} fill="none" strokeLinecap="round" opacity={0.7} />
          <path d="M 330 190 q 30 -40 80 -50 M 520 140 q 40 -20 90 -10 M 620 200 q 40 20 70 70" stroke="#4a3426" strokeWidth={8} fill="none" strokeLinecap="round" opacity={0.6} />
          {/* тень от чуба на лбу */}
          <path d="M 330 300 L 346 258 L 368 304 L 408 272 Q 440 292 432 350 Z" fill={C.ink} opacity={0} />
        </g>
      );
    }
    return (
      <g>
        <path
          d="M 240 400 C 214 300 232 200 300 152 L 292 100 L 354 130 L 384 70 L 440 120 L 488 58 L 530 118 L 590 76 L 604 134 L 664 112 L 668 168 L 716 182 L 696 232 L 640 252 L 600 300 L 560 252 L 520 268 C 510 300 480 330 430 330 C 440 300 430 280 400 262 L 370 300 L 340 256 L 310 330 L 290 440 L 270 470 Z"
          fill={C.artyomHair}
          stroke={C.inkSoft}
          strokeWidth={4}
          strokeLinejoin="round"
        />
        <path d="M 330 190 q 30 -40 80 -50 M 500 150 q 40 -20 90 -10" stroke="#4a3426" strokeWidth={8} fill="none" strokeLinecap="round" opacity={0.6} />
      </g>
    );
  },
  faceDecor: (r: Rig, view) => {
    const hc = view === "front" ? { x: 500, y: 390 } : { x: 470, y: 390 };
    const opacity = 0.9 - r.ev.pallor * 0.3;
    return (
      <g opacity={opacity}>
        {view === "front" ? (
          <g clipPath={undefined}>{stubble(hc.x, hc.y + 60, 2)}</g>
        ) : (
          <g>{stubble(hc.x + 60, hc.y + 60, 5)}</g>
        )}
      </g>
    );
  },
};

export const Artyom: React.FC<CharacterProps> = (props) => <CharacterShell p={props} cfg={cfg} />;
