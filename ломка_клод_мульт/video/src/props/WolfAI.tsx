import React from "react";
import { clamp, easeOut, INK } from "./util";

export const WOLF_DEFAULT_TEXT =
  "Брат, запомни: лев не извиняется перед овцой за то, что съел ее мать. Скажи ей: “Либо ты выходишь и моешь пол, либо дверью ошиблась, принцесса”. Ауф";

export type WolfAIProps = {
  frame: number;
  startFrame: number;
  text?: string;
  errorFrame?: number;
};
/** печать: WOLF_CPF символов за кадр; окно ошибки появляется за ERROR_POP кадров */
export const WOLF_CPF = 1.1;
export const WOLF_ERROR_POP = 8;

const FONT = "Comic Sans MS, Comic Neue, Chalkboard SE, Arial Black, sans-serif";
const HFONT = "Arial Black, Impact, sans-serif";

const WOLF = [
  "..kk........kk..",
  ".kggk......kggk.",
  ".kgggkkkkkkgggk.",
  ".kggggggggggggk.",
  "kggggggggggggggk",
  "kgkkkkkggkkkkkgk",
  "kgkwkkkggkkwkkgk",
  "kggggggggggggggk",
  ".kgggggwwgggggk.",
  "..kggwwkkwwggk..",
  "..kgggwwwwgggk..",
  "rrrkgggkkgggkrrr",
  "rrrrrkkwwkkrrrrr",
  "rrrrrrrrrrrrrrrr",
  "rrdrrrrrrrrrrdrr",
  "rrdrrrrrrrrrrdrr",
];
const WC: Record<string, string> = { g: "#8f949c", k: "#1a1a1a", w: "#e8e8e8", r: "#6b3a1e", d: "#3a1e0c" };

const wrap = (text: string, max: number): string[] => {
  const words = text.split(" ");
  const out: string[] = [];
  let cur = "";
  for (const w of words) {
    if (!cur) cur = w;
    else if ((cur + " " + w).length <= max) cur += " " + w;
    else {
      out.push(cur);
      cur = w;
    }
  }
  if (cur) out.push(cur);
  return out;
};

const Btn: React.FC<{ x: number; y: number; w: number; h: number; label: string; fs?: number }> = ({ x, y, w, h, label, fs = 50 }) => (
  <g>
    <rect x={x} y={y} width={w} height={h} rx={14} fill="url(#wolf-btn)" stroke="#003c74" strokeWidth={4} />
    <text x={x + w / 2} y={y + h / 2 + fs * 0.35} textAnchor="middle" fontFamily={FONT} fontWeight={700} fontSize={fs} fill="#111">{label}</text>
  </g>
);

const Win: React.FC<{ x: number; y: number; w: number; h: number; title: string; red?: boolean; children?: React.ReactNode }> = ({ x, y, w, h, title, red, children }) => (
  <g>
    <rect x={x + 10} y={y + 12} width={w} height={h} fill="rgba(0,0,0,.4)" />
    <rect x={x} y={y} width={w} height={h} fill="#ece9d8" stroke="#0a246a" strokeWidth={6} />
    <rect x={x} y={y} width={w} height={78} fill={red ? "url(#wolf-titR)" : "url(#wolf-tit)"} />
    <text x={x + 20} y={y + 54} fontFamily={HFONT} fontSize={42} fill="#fff" stroke="#000" strokeWidth={0.5}>{title}</text>
    <rect x={x + w - 70} y={y + 14} width={52} height={50} rx={8} fill="#d8452c" stroke="#fff" strokeWidth={3} />
    <text x={x + w - 44} y={y + 52} textAnchor="middle" fontFamily={HFONT} fontSize={38} fill="#fff">X</text>
    {children}
  </g>
);

export const WolfAI: React.FC<WolfAIProps> = ({ frame, startFrame, text = WOLF_DEFAULT_TEXT, errorFrame }) => {
  const t = frame - startFrame;
  const n = Math.max(0, Math.floor(t * WOLF_CPF));
  const shown = text.slice(0, n);
  const lines = wrap(text, 21);
  const shownLines = wrap(shown, 21);
  // сохранить разбиение полного текста: берём префикс по символам
  let acc = 0;
  const outLines: string[] = [];
  for (const l of lines) {
    const take = Math.max(0, Math.min(l.length, n - acc));
    outLines.push(l.slice(0, take));
    acc += l.length + 1;
  }
  void shownLines;
  const cursorOn = Math.floor(frame / 8) % 2 === 0;
  const lastIdx = Math.max(0, outLines.findIndex((l, i) => l.length < lines[i].length || i === lines.length - 1));
  const e = errorFrame !== undefined ? frame - errorFrame : -1;
  const pop = e >= 0 ? easeOut(e / WOLF_ERROR_POP) : 0;
  const blink = Math.floor(frame / 5) % 2 === 0;
  const marqueeX = 1080 - ((frame * 9) % 1900);
  const appear = clamp(t / 6);

  return (
    <svg width={1080} height={1920} viewBox="0 0 1080 1920" style={{ position: "absolute", left: 0, top: 0 }}>
      <defs>
        <linearGradient id="wolf-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#3a6ed8" />
          <stop offset="0.55" stopColor="#8fc0f4" />
          <stop offset="0.56" stopColor="#4fa83a" />
          <stop offset="1" stopColor="#2f7a22" />
        </linearGradient>
        <linearGradient id="wolf-tit" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#0a246a" />
          <stop offset="1" stopColor="#3a81e0" />
        </linearGradient>
        <linearGradient id="wolf-titR" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#7a0a0a" />
          <stop offset="1" stopColor="#e03a3a" />
        </linearGradient>
        <linearGradient id="wolf-btn" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="1" stopColor="#c9c6b4" />
        </linearGradient>
      </defs>
      <rect width={1080} height={1920} fill="url(#wolf-sky)" />
      {/* панель задач */}
      <rect x={0} y={1810} width={1080} height={110} fill="#245edb" />
      <rect x={0} y={1810} width={260} height={110} rx={10} fill="#3c9a2c" />
      <text x={130} y={1884} textAnchor="middle" fontFamily={HFONT} fontStyle="italic" fontSize={54} fill="#fff">пуск</text>
      <text x={1050} y={1884} textAnchor="end" fontFamily={HFONT} fontSize={50} fill="#fff">13:37</text>
      <g opacity={appear}>
        <Win x={40} y={110} w={1000} h={1560} title="ИИ-Помощник Олег 1.0">
          {/* баннер */}
          <rect x={70} y={210} width={940} height={96} fill="#ffe14a" stroke="#d00" strokeWidth={5} />
          <clipPath id="wolf-clip"><rect x={70} y={210} width={940} height={96} /></clipPath>
          <g clipPath="url(#wolf-clip)">
            <text x={marqueeX} y={282} fontFamily={HFONT} fontSize={62} fill={blink ? "#d00" : "#00a" }>★ УНИКАЛЬНЫЙ ПОМОЩНИК!!! СКАЧАЙ БЕСПЛАТНО!!! ★ ЖМИ СЮДА ★</text>
          </g>
          {/* аватар */}
          <rect x={70} y={330} width={260} height={260} fill="#9fe0ff" stroke="#003c74" strokeWidth={5} />
          <g transform={`translate(80 ${340 + Math.round(Math.sin(frame * 0.3) * 3)})`}>
            {WOLF.map((row, y) => row.split("").map((c, x) => (c === "." ? null : <rect key={`${x}-${y}`} x={x * 15} y={y * 15} width={15} height={15} fill={WC[c]} />)))}
          </g>
          <text x={350} y={420} fontFamily={FONT} fontWeight={700} fontSize={54} fill="#0a246a">Олег</text>
          <text x={350} y={490} fontFamily={FONT} fontSize={50} fill="#d00">в сети ● 18+</text>
          <Btn x={350} y={520} w={300} h={72} label="Ауф!" fs={50} />
          {/* поле ответа */}
          <rect x={70} y={620} width={940} height={800} fill="#fff" stroke="#7f9db9" strokeWidth={5} />
          {outLines.map((l, i) => (
            <text key={i} x={92} y={690 + i * 70} fontFamily={FONT} fontWeight={700} fontSize={54} fill="#111">
              {l}
              {i === lastIdx && cursorOn && n < text.length + 3 ? "▌" : ""}
            </text>
          ))}
          <Btn x={80} y={1470} w={440} h={100} label="Ок, брат" />
          <Btn x={560} y={1470} w={440} h={100} label="Ещё совет" />
        </Win>
      </g>
      {/* ошибка 502 */}
      {e >= 0 && (
        <g transform={`translate(540 ${960 + 40 * (1 - pop)}) scale(${0.6 + 0.4 * pop}) translate(-540 -960)`} opacity={clamp(pop * 2)}>
          <rect width={1080} height={1920} fill="#000" opacity={0.35} />
          <Win x={90} y={330} w={900} h={1200} title="Ошибка 502" red>
            <circle cx={230} cy={560} r={80} fill="#d8201c" stroke="#fff" strokeWidth={8} />
            <text x={230} y={590} textAnchor="middle" fontFamily={HFONT} fontSize={100} fill="#fff">X</text>
            <text x={350} y={540} fontFamily={FONT} fontWeight={700} fontSize={84} fill="#c00">Ошибка 502.</text>
            {wrap("Посмотрите рекламу казино, чтобы разблокировать сочувствие", 24).map((l, i) => (
              <text key={i} x={130} y={700 + i * 68} fontFamily={FONT} fontWeight={700} fontSize={56} fill="#111">{l}</text>
            ))}
            {/* баннер казино */}
            <g>
              <rect x={130} y={940} width={820} height={300} fill={blink ? "#ffdc2a" : "#ff2a8a"} stroke="#000" strokeWidth={6} />
              <rect x={150} y={960} width={780} height={260} fill="none" stroke={blink ? "#d00" : "#fff"} strokeWidth={6} strokeDasharray="22 14" />
              <text x={540} y={1080} textAnchor="middle" fontFamily={HFONT} fontSize={96} fill={blink ? "#d00" : "#fff"} stroke="#000" strokeWidth={3}>КАЗИНО 777</text>
              <text x={540} y={1170} textAnchor="middle" fontFamily={HFONT} fontSize={60} fill="#111">ВЫИГРАЙ ЖИЗНЬ!</text>
            </g>
            <Btn x={130} y={1290} w={820} h={100} label="Смотреть рекламу" />
          </Win>
        </g>
      )}
      <rect x={0} y={0} width={1080} height={1920} fill="none" stroke={INK} strokeWidth={0} />
    </svg>
  );
};
