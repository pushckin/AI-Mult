import React from "react";
import { clamp, easeOut, INK } from "./util";

export type LockScreenProps = {
  frame: number;
  startFrame: number;
  mode?: "faceid" | "passcode";
  tries?: string[];
  /** кадры, на которых попытка не удалась (faceid: тряска; passcode: оценка i-й попытки) */
  failFrames?: number[];
  successFrame?: number;
};
export const LOCK_DEFAULT_TRIES = ["0614", "1412", "0000"];
/** passcode: цифра нажимается каждые DIGIT_GAP кадров; тряска/сброс FAIL_FRAMES; разблокировка UNLOCK_FRAMES */
export const LOCK_DIGIT_GAP = 7;
export const LOCK_FAIL_FRAMES = 14;
export const LOCK_UNLOCK_FRAMES = 14;
export const LOCK_TRY_SPAN = 54;

const FONT = "Arial Black, Impact, sans-serif";

export const LockScreen: React.FC<LockScreenProps> = ({
  frame,
  startFrame,
  mode = "passcode",
  tries = LOCK_DEFAULT_TRIES,
  failFrames,
  successFrame,
}) => {
  const t = frame - startFrame;
  const appear = clamp(t / 6);
  const bg = (
    <>
      <defs>
        <linearGradient id="lk-bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#2b2358" />
          <stop offset="0.6" stopColor="#7a3b52" />
          <stop offset="1" stopColor="#e0825a" />
        </linearGradient>
      </defs>
      <rect width={1080} height={1920} fill="url(#lk-bg)" />
    </>
  );
  const clock = (
    <g>
      <text x={540} y={250} textAnchor="middle" fontFamily={FONT} fontSize={72} fill="#fff" opacity={0.9}>вторник, 16 ноября</text>
      <text x={540} y={430} textAnchor="middle" fontFamily={FONT} fontSize={190} fill="#fff" stroke={INK} strokeWidth={4} paintOrder="stroke">21:07</text>
    </g>
  );

  if (mode === "faceid") {
    const fails = failFrames ?? [startFrame + 40, startFrame + 120];
    const lastFail = fails.filter((f) => f <= frame).pop();
    const since = lastFail !== undefined ? frame - lastFail : -1;
    const ok = successFrame !== undefined && frame >= successFrame;
    const failing = since >= 0 && since < 40 && !ok;
    const scanU = ((frame - startFrame) % 34) / 34;
    const shake = failing && since < LOCK_FAIL_FRAMES ? Math.sin(since * 2.4) * 30 * (1 - since / LOCK_FAIL_FRAMES) : 0;
    const col = ok ? "#42d17a" : failing ? "#ff4a4a" : "#fff";
    const cx = 540, cy = 1000, s = 260;
    const bracket = (sx: number, sy: number) => (
      <path d={`M ${cx + sx * s} ${cy + sy * (s - 90)} L ${cx + sx * s} ${cy + sy * s} L ${cx + sx * (s - 90)} ${cy + sy * s}`} stroke={col} strokeWidth={14} fill="none" strokeLinecap="round" strokeLinejoin="round" />
    );
    return (
      <svg width={1080} height={1920} viewBox="0 0 1080 1920" style={{ position: "absolute", left: 0, top: 0 }} opacity={appear}>
        {bg}
        {clock}
        <g transform={`translate(${shake.toFixed(1)} 0)`}>
          {bracket(-1, -1)}{bracket(1, -1)}{bracket(-1, 1)}{bracket(1, 1)}
          {/* лицо-иконка */}
          <circle cx={cx - 80} cy={cy - 40} r={14} fill={col} />
          <circle cx={cx + 80} cy={cy - 40} r={14} fill={col} />
          <path d={`M ${cx} ${cy - 20} l -20 70 l 30 0`} stroke={col} strokeWidth={10} fill="none" strokeLinecap="round" strokeLinejoin="round" />
          <path d={failing ? `M ${cx - 70} ${cy + 140} Q ${cx} ${cy + 90} ${cx + 70} ${cy + 140}` : `M ${cx - 70} ${cy + 110} Q ${cx} ${cy + 170} ${cx + 70} ${cy + 110}`} stroke={col} strokeWidth={10} fill="none" strokeLinecap="round" />
          {!failing && !ok && <rect x={cx - s + 20} y={cy - s + 20 + scanU * (2 * s - 40)} width={2 * s - 40} height={10} rx={5} fill="#7ae0ff" opacity={0.9} />}
          {failing && (
            <g stroke="#ff4a4a" strokeWidth={22} strokeLinecap="round" style={{ filter: "drop-shadow(0 4px 6px rgba(0,0,0,.5))" }}>
              <path d={`M ${cx - 90} ${cy - 90} L ${cx + 90} ${cy + 90} M ${cx + 90} ${cy - 90} L ${cx - 90} ${cy + 90}`} />
            </g>
          )}
          {ok && <path d={`M ${cx - 90} ${cy} L ${cx - 25} ${cy + 70} L ${cx + 100} ${cy - 80}`} stroke="#42d17a" strokeWidth={26} fill="none" strokeLinecap="round" strokeLinejoin="round" />}
        </g>
        <text x={540} y={1440} textAnchor="middle" fontFamily={FONT} fontSize={66} fill={failing ? "#ffd0d0" : "#fff"} stroke={INK} strokeWidth={3} paintOrder="stroke">
          {ok ? "Разблокировано" : failing ? "Не удалось распознать" : "Face ID…"}
        </text>
        <text x={540} y={1560} textAnchor="middle" fontFamily={FONT} fontSize={52} fill="#fff" opacity={failing ? 1 : 0}>Введите код-пароль</text>
      </svg>
    );
  }

  // passcode
  const n = tries.length;
  const ends = tries.map((_, i) => {
    if (i < n - 1) return failFrames?.[i] ?? startFrame + 40 + i * LOCK_TRY_SPAN;
    return successFrame ?? startFrame + 40 + i * LOCK_TRY_SPAN;
  });
  let cur = 0;
  for (let i = 0; i < n; i++) if (frame >= ends[i] - 4 * LOCK_DIGIT_GAP - 2) cur = i;
  const end = ends[cur];
  const typeStart = end - 4 * LOCK_DIGIT_GAP;
  const typed = clamp(Math.floor((frame - typeStart) / LOCK_DIGIT_GAP) + 1, 0, 4);
  const isLast = cur === n - 1;
  const since = frame - end;
  const evaluated = since >= 0;
  const wrong = evaluated && !isLast;
  const right = evaluated && isLast;
  const shown = wrong && since >= LOCK_FAIL_FRAMES ? 0 : typed;
  const shake = wrong && since < LOCK_FAIL_FRAMES ? Math.sin(since * 2.6) * 34 * (1 - since / LOCK_FAIL_FRAMES) : 0;
  const lastDigitIdx = typed - 1;
  const pressedKey = frame >= typeStart && !evaluated && lastDigitIdx >= 0 && (frame - typeStart) % LOCK_DIGIT_GAP < 4 ? tries[cur][lastDigitIdx] : null;
  const unlockU = right ? clamp((since - 8) / LOCK_UNLOCK_FRAMES) : 0;
  const dotCol = right ? "#42d17a" : wrong && since < LOCK_FAIL_FRAMES ? "#ff4a4a" : "#fff";
  const keys = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", ""];
  return (
    <svg width={1080} height={1920} viewBox="0 0 1080 1920" style={{ position: "absolute", left: 0, top: 0 }} opacity={appear * (1 - easeOut(unlockU))}>
      <g transform={`translate(0 ${-unlockU * 300})`}>
        {bg}
        <text x={540} y={230} textAnchor="middle" fontFamily={FONT} fontSize={66} fill="#fff" stroke={INK} strokeWidth={3} paintOrder="stroke">
          {right ? "Разблокировано" : wrong && since < 40 ? "Неверный код" : "Введите код-пароль"}
        </text>
        <g transform={`translate(${shake.toFixed(1)} 0)`}>
          {[0, 1, 2, 3].map((i) => (
            <circle key={i} cx={540 + (i - 1.5) * 110} cy={350} r={30} fill={i < shown ? dotCol : "none"} stroke={dotCol} strokeWidth={7} />
          ))}
        </g>
        {right && <path d="M 440 470 L 520 540 L 660 400" stroke="#42d17a" strokeWidth={28} fill="none" strokeLinecap="round" strokeLinejoin="round" style={{ filter: "drop-shadow(0 4px 6px rgba(0,0,0,.45))" }} />}
        {keys.map((k, i) => {
          if (!k) return null;
          const cx = 540 + ((i % 3) - 1) * 270;
          const cy = 760 + Math.floor(i / 3) * 255;
          const pressed = pressedKey === k;
          return (
            <g key={i}>
              <circle cx={cx} cy={cy} r={110} fill={pressed ? "#ffffff" : "rgba(255,255,255,.22)"} stroke={INK} strokeWidth={5} />
              <text x={cx} y={cy + 36} textAnchor="middle" fontFamily={FONT} fontSize={100} fill={pressed ? INK : "#fff"}>{k}</text>
            </g>
          );
        })}
      </g>
    </svg>
  );
};
