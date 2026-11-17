import React from "react";
import { maskProfanity } from "../../censor";
import { interpolate, spring, Easing } from "remotion";

export const DEFAULT_PHONE_TEXT =
  "Клод блядь срочно придумай вежливую отмазку почему ее жирная токсичная мамаша не должна переступать порог моей хаты иначе я выйду в окно";

export type PhoneScreenProps = {
  frame: number;
  startFrame: number;
  text?: string;
  sendFrame: number;
  x?: number;
  y?: number;
  scale?: number;
  rotate?: number;
};

const FONT = "Arial Black, Impact, sans-serif";
const C = {
  bg: "#1b1210",
  skin: "#f1c9a0",
  skinShade: "#d9a97c",
  table: "#a9713f",
  tableDark: "#7a4c27",
  ink: "#120c0a",
  spark: "#ff8a2a",
  sparkLight: "#ffc15a",
  screen: "#17141a",
  field: "#2a2430",
};
const FPS = 24;
const CPS = 28;
const MAX_LINE = 19;

const wrap = (text: string): string[] => {
  const words = text.split(" ");
  const lines: string[] = [];
  let cur = "";
  for (const w of words) {
    if (!cur) cur = w;
    else if ((cur + " " + w).length <= MAX_LINE) cur += " " + w;
    else {
      lines.push(cur);
      cur = w;
    }
  }
  if (cur) lines.push(cur);
  return lines;
};

const Spark: React.FC<{ r: number; rot?: number }> = ({ r, rot = 0 }) => (
  <g transform={`rotate(${rot})`}>
    {[0, 45, 90, 135].map((a) => (
      <rect
        key={a}
        x={-r * 0.16}
        y={-r}
        width={r * 0.32}
        height={r * 2}
        rx={r * 0.16}
        fill={a % 90 === 0 ? C.spark : C.sparkLight}
        transform={`rotate(${a})`}
      />
    ))}
    <circle r={r * 0.22} fill="#fff3d6" />
  </g>
);

export const PhoneScreen: React.FC<PhoneScreenProps> = ({
  frame,
  startFrame,
  text = DEFAULT_PHONE_TEXT,
  sendFrame,
  x = 0,
  y = 0,
  scale = 1,
  rotate = 0,
}) => {
  // hand tremor (deterministic)
  const tx = Math.sin(frame * 0.9) * 3 + Math.sin(frame * 2.3 + 1) * 1.5;
  const ty = Math.cos(frame * 1.1) * 3 + Math.sin(frame * 2.9) * 1.5;
  const tr = Math.sin(frame * 0.7) * 0.5 + Math.sin(frame * 1.9) * 0.25;

  const lines = wrap(maskProfanity(text));
  const typed = Math.max(0, Math.floor(((frame - startFrame) * CPS) / FPS));
  const totalChars = text.length;
  const shown = Math.min(typed, totalChars);
  const typing = frame >= startFrame && shown < totalChars;
  const sent = frame >= sendFrame;

  // distribute typed chars across wrapped lines (spaces consumed between lines)
  let remaining = shown;
  const shownLines = lines.map((ln, i) => {
    const take = Math.max(0, Math.min(ln.length, remaining));
    remaining -= ln.length + (i < lines.length - 1 ? 1 : 0);
    return ln.slice(0, take);
  });
  let cursorLine = 0;
  for (let i = 0; i < shownLines.length; i++) {
    if (shownLines[i].length > 0) cursorLine = i;
  }

  const FS = 58;
  const LH = 74;
  const cursorOn = Math.floor(frame / 6) % 2 === 0;
  const cursorVisible = !sent && frame >= startFrame - 6 && (typing || cursorOn);

  // mic pulse
  const listening = frame >= startFrame - 8 && !sent;
  const pulse = (k: number) => {
    const p = ((frame * 0.6 + k * 8) % 24) / 24;
    return { r: 60 + p * 80, o: (1 - p) * 0.55 };
  };
  const micScale = listening ? 1 + Math.sin(frame * 0.8) * 0.06 : 1;

  // send press
  const sp = frame - sendFrame;
  const press =
    sp < 0
      ? { sx: 1, sy: 1 }
      : sp < 3
      ? { sx: 1 + sp * 0.08, sy: 1 - sp * 0.15 }
      : (() => {
          const s = spring({ frame: sp - 3, fps: FPS, config: { damping: 7, stiffness: 220 } });
          return { sx: 1.24 - 0.24 * s, sy: 0.55 + 0.45 * s };
        })();
  const pressed = sp >= 0 && sp < 5;

  // flying bubble
  const fly = interpolate(sp, [0, 22], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.in(Easing.cubic),
  });
  const flyY = -fly * 1500;
  const flyS = 1 - fly * 0.55;
  const flyO = sp < 0 ? 0 : interpolate(sp, [14, 24], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const flyRot = fly * -8;

  const textTop = 770;
  const blockH = lines.length * LH + 60;

  // waveform
  const waveBars = Array.from({ length: 17 }, (_, i) => {
    const active = listening && (typing || frame < startFrame + 6);
    const h = active
      ? 14 + Math.abs(Math.sin(frame * 0.55 + i * 1.3) * Math.cos(frame * 0.31 + i * 0.7)) * 70
      : 8;
    return h;
  });

  const appear = interpolate(frame, [0, 8], [0, 1], { extrapolateRight: "clamp" });

  return (
    <svg
      width={1080}
      height={1920}
      viewBox="0 0 1080 1920"
      style={{ display: "block", transform: `translate(${x}px, ${y}px) scale(${scale}) rotate(${rotate}deg)`, opacity: appear }}
    >
      <defs>
        <linearGradient id="ps-dark" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#000" stopOpacity="0.85" />
          <stop offset="0.35" stopColor="#000" stopOpacity="0" />
        </linearGradient>
        <radialGradient id="ps-glow" cx="0.5" cy="0.55" r="0.6">
          <stop offset="0" stopColor="#ff9a40" stopOpacity="0.25" />
          <stop offset="1" stopColor="#ff9a40" stopOpacity="0" />
        </radialGradient>
        <clipPath id="ps-screen">
          <rect x="130" y="260" width="820" height="1480" rx="52" />
        </clipPath>
      </defs>
      <rect width="1080" height="1920" fill={C.bg} />
      <rect width="1080" height="1920" fill="url(#ps-glow)" />

      {/* knees / lap (dark cloth) */}
      <path d="M0 1700 Q300 1600 540 1650 Q800 1600 1080 1700 L1080 1920 L0 1920Z" fill="#2a1c17" />

      <g
        transform={`translate(${tx} ${ty}) rotate(${tr} 540 1000)`}
        style={{ filter: "drop-shadow(2px 4px 0 rgba(0,0,0,.45))" }}
      >
        {/* left hand mitten + fingers on edge */}
        <g>
          <path d="M-40 1250 C40 1180 90 1100 120 1000 L150 1040 C140 1140 130 1230 150 1330 C170 1480 120 1620 40 1700 L-40 1700Z" fill={C.skin} />
          <rect x="70" y="1010" width="100" height="70" rx="35" fill={C.skin} transform="rotate(-8 120 1040)" />
          <rect x="62" y="1100" width="108" height="72" rx="36" fill={C.skin} />
          <rect x="66" y="1190" width="104" height="70" rx="35" fill={C.skinShade} />
        </g>
        {/* phone body */}
        <rect x="100" y="230" width="880" height="1540" rx="80" fill="#0b0a0d" stroke="#3a3340" strokeWidth="6" />
        {/* right hand: palm behind + thumb over bottom-right */}
        <path d="M1120 1300 C1030 1260 990 1220 975 1120 L930 1130 C940 1260 960 1400 1010 1500 C1040 1560 1100 1600 1120 1620Z" fill={C.skin} />
        <rect x="900" y="1330" width="110" height="74" rx="37" fill={C.skin} transform="rotate(10 950 1360)" />
        <rect x="905" y="1430" width="110" height="74" rx="37" fill={C.skinShade} transform="rotate(10 950 1460)" />

        {/* screen */}
        <rect x="130" y="260" width="820" height="1480" rx="52" fill={C.screen} />
        <g clipPath="url(#ps-screen)">
          {/* header */}
          <rect x="130" y="260" width="820" height="150" fill="#221c27" />
          <g transform="translate(215 335)">
            <Spark r={36} rot={frame * 1.2} />
          </g>
          <text x="275" y="352" fontFamily={FONT} fontWeight={900} fontSize="46" fill="#fff">Ассистент</text>
          <circle cx="880" cy="335" r="12" fill="#5ee08a" />

          {/* sent bubble placeholder area / status */}
          <text x="540" y="560" textAnchor="middle" fontFamily={FONT} fontWeight={900} fontSize="40" fill="#6a5f73">
            {sent ? "Отправлено" : listening ? "Слушаю…" : "Нажми и говори"}
          </text>

          {/* input panel */}
          <rect x="160" y={textTop - 40} width="760" height={blockH + 40} rx="40" fill={C.field} />
          {!sent &&
            shownLines.map((ln, i) => (
              <text key={i} x="200" y={textTop + 30 + i * LH} fontFamily={FONT} fontWeight={900} fontSize={FS} fill="#fff">
                {ln}
                {cursorVisible && i === cursorLine ? (
                  <tspan fill={C.spark}>|</tspan>
                ) : null}
              </text>
            ))}
          {!sent && shown === 0 && (
            <text x="200" y={textTop + 30} fontFamily={FONT} fontWeight={900} fontSize={FS} fill="#5a5062">
              Скажи что-нибудь{cursorVisible ? "|" : ""}
            </text>
          )}

          {/* wave */}
          <g transform="translate(220 1560)">
            {waveBars.map((h, i) => (
              <rect key={i} x={i * 24} y={-h / 2} width="14" height={h} rx="7" fill={C.spark} />
            ))}
          </g>

          {/* mic */}
          <g transform="translate(250 1650)" />
        </g>

        {/* mic button (outside clip for pulses) */}
        <g transform="translate(250 1648)">
          {listening &&
            [0, 1, 2].map((k) => {
              const p = pulse(k);
              return <circle key={k} r={p.r * 0.7} fill="none" stroke={C.spark} strokeWidth="6" opacity={p.o} />;
            })}
          <g transform={`scale(${micScale})`}>
            <circle r="62" fill={listening ? C.spark : "#3a3340"} />
            <rect x="-14" y="-32" width="28" height="42" rx="14" fill="#fff" />
            <path d="M-26 -2 Q-26 24 0 24 Q26 24 26 -2" fill="none" stroke="#fff" strokeWidth="6" strokeLinecap="round" />
            <line x1="0" y1="24" x2="0" y2="40" stroke="#fff" strokeWidth="6" strokeLinecap="round" />
          </g>
        </g>

        {/* send button */}
        <g transform={`translate(810 1648) scale(${press.sx} ${press.sy})`}>
          <circle r="66" cy={pressed ? 4 : 0} fill={pressed ? "#d9691a" : C.spark} stroke={C.ink} strokeWidth="4" />
          <path d="M-26 -28 L34 0 L-26 28 L-16 4 Z" fill="#fff" />
        </g>

        {/* flying message bubble */}
        {sent && flyO > 0 && (
          <g
            opacity={flyO}
            transform={`translate(540 ${textTop + blockH / 2 + flyY}) rotate(${flyRot}) scale(${flyS}) translate(-540 ${-(textTop + blockH / 2)})`}
          >
            <rect x="160" y={textTop - 40} width="760" height={blockH + 40} rx="40" fill={C.spark} stroke={C.ink} strokeWidth="5" />
            {lines.map((ln, i) => (
              <text key={i} x="200" y={textTop + 30 + i * LH} fontFamily={FONT} fontWeight={900} fontSize={FS} fill={C.ink}>
                {ln}
              </text>
            ))}
          </g>
        )}
        {/* glass shine */}
        <path d="M130 260 H520 L130 900Z" fill="#fff" opacity="0.04" />
      </g>

      {/* under-the-table: tablecloth edge on top */}
      <g style={{ filter: "drop-shadow(0 8px 0 rgba(0,0,0,.45))" }}>
        <path
          d={`M0 0 H1080 V120 ${Array.from({ length: 9 }, (_, i) => `Q${1080 - i * 135 - 67} 190 ${1080 - (i + 1) * 135} 120`).join(" ")} Z`}
          fill="#c9483a"
        />
        <path d="M0 0 H1080 V60 H0Z" fill="#a9372c" />
        {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
          <circle key={i} cx={70 + i * 135} cy={95} r="14" fill="#f4ead2" opacity="0.8" />
        ))}
      </g>
      <rect x="0" y="0" width="1080" height="500" fill="url(#ps-dark)" />
      {/* table underside slats at far top */}
      <rect x="0" y="0" width="1080" height="14" fill={C.tableDark} />
    </svg>
  );
};
