import React from "react";
import { clamp, easeOut, INK } from "./util";

export const KATYA_TEXT =
  "Клод, срочно напиши этому долбоёбу максимально мягко и красиво, что я уже полгода сплю с его лучшим другом Серёгой, забираю собаку и уезжаю в Питер, но так, чтобы он не вскрылся до пятницы, пока я не вывезу диван";

export type KatyaChatProps = {
  frame: number;
  startFrame: number;
  /** кадр появления красной плашки лимита (по умолчанию startFrame + TYPE + 20) */
  limitFrame?: number;
};
/** сообщение набирается KATYA_CPF символов/кадр; плашка лимита вылетает за LIMIT_IN кадров */
export const KATYA_CPF = 2.2;
export const KATYA_LIMIT_IN = 10;

const FONT = "Arial Black, Impact, sans-serif";
const FS = 50;
const LH = 64;
const MAXC = 29;

const wrap = (text: string): string[] => {
  const words = text.split(" ");
  const out: string[] = [];
  let cur = "";
  for (const w of words) {
    if (!cur) cur = w;
    else if ((cur + " " + w).length <= MAXC) cur += " " + w;
    else {
      out.push(cur);
      cur = w;
    }
  }
  if (cur) out.push(cur);
  return out;
};

export const KatyaChat: React.FC<KatyaChatProps> = ({ frame, startFrame, limitFrame }) => {
  const t = frame - startFrame;
  const typeFrames = Math.ceil(KATYA_TEXT.length / KATYA_CPF);
  const lf = limitFrame ?? startFrame + typeFrames + 20;
  const lines = wrap(KATYA_TEXT);
  const n = Math.max(0, Math.floor(t * KATYA_CPF));
  let acc = 0;
  const shown = lines.map((l) => {
    const take = Math.max(0, Math.min(l.length, n - acc));
    acc += l.length + 1;
    return l.slice(0, take);
  });
  const visibleCount = shown.filter((s) => s.length > 0).length;
  const bubbleH = Math.max(1, visibleCount) * LH + 70;
  const areaTop = 560;
  const areaH = 1180;
  const scroll = Math.max(0, bubbleH + 40 - areaH);
  const lu = clamp((frame - lf) / KATYA_LIMIT_IN);
  const pop = easeOut(lu);
  const glitch = frame >= lf && frame - lf < 8 ? (frame % 2 ? 1 : -1) * (12 - (frame - lf)) : 0;
  const appear = clamp(t / 6);
  const blink = Math.floor((frame - lf) / 12) % 2 === 0;

  return (
    <svg width={1080} height={1920} viewBox="0 0 1080 1920" style={{ position: "absolute", left: 0, top: 0 }} opacity={appear}>
      <rect width={1080} height={1920} fill="#17141a" />
      {/* шапка */}
      <rect width={1080} height={140} fill="#221c2a" />
      <circle cx={90} cy={72} r={34} fill="#e7845a" stroke={INK} strokeWidth={4} />
      <text x={150} y={92} fontFamily={FONT} fontSize={56} fill="#fff">Клод</text>
      <text x={1030} y={92} textAnchor="end" fontFamily={FONT} fontSize={50} fill="#9aa">9%</text>
      {/* сообщение Кати */}
      <clipPath id="kc-clip"><rect x={0} y={areaTop - 20} width={1080} height={areaH + 40} /></clipPath>
      <g clipPath="url(#kc-clip)">
        <g transform={`translate(0 ${-scroll * clamp((t - 30) / 80)})`}>
          {visibleCount > 0 && (
            <>
              <path d={`M 90 ${areaTop} L 1000 ${areaTop - 6} L 1010 ${areaTop + bubbleH - 20} L 80 ${areaTop + bubbleH}  Z`} fill="#3a3342" stroke={INK} strokeWidth={5} strokeLinejoin="round" />
              {shown.map((l, i) => (
                <text key={i} x={120} y={areaTop + 62 + i * LH} fontFamily={FONT} fontSize={FS} fill="#fff">{l}</text>
              ))}
            </>
          )}
        </g>
      </g>
      {/* красная плашка лимита */}
      {frame >= lf && (
        <g transform={`translate(${glitch} ${(1 - pop) * -420})`}>
          <path d="M 50 190 L 80 170 L 1000 176 L 1034 214 L 1022 470 L 990 500 L 70 492 L 46 460 Z" fill="#d8302a" stroke={INK} strokeWidth={6} strokeLinejoin="round" style={{ filter: "drop-shadow(0 8px 10px rgba(0,0,0,.5))" }} />
          <circle cx={130} cy={260} r={42} fill="#fff" stroke={INK} strokeWidth={5} />
          <text x={130} y={282} textAnchor="middle" fontFamily={FONT} fontSize={64} fill="#d8302a">!</text>
          <text x={200} y={262} fontFamily={FONT} fontSize={FS} fill="#fff">You've reached your</text>
          <text x={200} y={326} fontFamily={FONT} fontSize={FS} fill="#fff">usage limit.</text>
          <text x={80} y={420} fontFamily={FONT} fontSize={FS} fill={blink ? "#ffe9a0" : "#fff"}>try again in 4 hours 57 minutes</text>
        </g>
      )}
      {/* поле ввода */}
      <rect x={40} y={1780} width={1000} height={110} rx={55} fill="#2a2430" stroke={INK} strokeWidth={4} />
      <text x={90} y={1852} fontFamily={FONT} fontSize={50} fill="#7a7480">Лимит исчерпан…</text>
    </svg>
  );
};
