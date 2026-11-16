import React from "react";
import { clamp, easeOut, INK, rnd } from "./util";

export type WineSplashProps = { frame: number; startFrame: number };
/** дуга: 0..FLY; брызги/пар: FLY..FLY+STEAM */
export const WINE_FLY = 12;
export const WINE_STEAM = 44;

export const WineSplash: React.FC<WineSplashProps> = ({ frame, startFrame }) => {
  const t = frame - startFrame;
  if (t < 0 || t > WINE_FLY + WINE_STEAM + 6) return null;
  const tx = 300;
  const ty = 330;
  const sx = -40;
  const sy = 60;
  const arc = (u: number) => ({
    x: sx + (tx - sx) * u,
    y: sy + (ty - sy) * u - Math.sin(u * Math.PI) * 140,
  });
  const fly = clamp(t / WINE_FLY);
  const parts: React.ReactNode[] = [];
  // тело струи
  const head = arc(fly);
  const tailU = clamp((t - 6) / WINE_FLY);
  const N = 14;
  let d = "";
  for (let i = 0; i <= N; i++) {
    const u = tailU + (fly - tailU) * (i / N);
    const p = arc(u);
    d += `${i ? "L" : "M"} ${p.x.toFixed(1)} ${p.y.toFixed(1)} `;
  }
  if (t < WINE_FLY + 6) {
    parts.push(<path key="s" d={d} stroke="#8e1b3c" strokeWidth={46} strokeLinecap="round" fill="none" />);
    parts.push(<path key="s2" d={d} stroke="#c23a63" strokeWidth={16} strokeLinecap="round" fill="none" transform="translate(-8 -8)" />);
    parts.push(<circle key="h" cx={head.x} cy={head.y} r={34} fill="#8e1b3c" />);
  }
  for (let i = 0; i < 18; i++) {
    const u = clamp(fly - rnd(i) * 0.4);
    const p = arc(u);
    if (u <= 0) continue;
    parts.push(<circle key={`d${i}`} cx={p.x + (rnd(i + 8) - 0.5) * 90} cy={p.y + (rnd(i + 20) - 0.5) * 70} r={5 + rnd(i + 33) * 11} fill="#8e1b3c" />);
  }
  // пар
  const st = t - WINE_FLY;
  const steam = [];
  if (st >= 0) {
    for (let i = 0; i < 12; i++) {
      const age = clamp((st - rnd(i) * 10) / 34);
      if (age <= 0 || age >= 1) continue;
      const x = tx + (rnd(i + 5) - 0.5) * 240 + Math.sin(st * 0.2 + i) * 18;
      const y = ty - 10 - age * 320;
      const r = 36 + age * 70 + rnd(i + 2) * 20;
      steam.push(<circle key={i} cx={x} cy={y} r={r} fill="#f4f6f8" stroke="rgba(18,12,10,.35)" strokeWidth={3} opacity={Math.sin(age * Math.PI) * 0.88} />);
    }
    // красные капли разлёта
    for (let i = 0; i < 12; i++) {
      const a = -Math.PI * (0.1 + 0.8 * rnd(i + 40));
      const v = 60 + rnd(i + 70) * 140;
      const u = easeOut(st / 18);
      steam.push(<circle key={`b${i}`} cx={tx + Math.cos(a) * v * u} cy={ty + Math.sin(a) * v * u + 140 * u * u * 0.3} r={7 * (1 - u * 0.6)} fill="#8e1b3c" opacity={1 - clamp(st / 24)} />);
    }
    steam.push(
      <path key="ring" d={`M ${tx - 120} ${ty} Q ${tx} ${ty - 70} ${tx + 120} ${ty}`} stroke={INK} strokeWidth={0} fill="none" />,
    );
  }
  return (
    <svg width={600} height={500} viewBox="0 0 600 500" style={{ overflow: "visible", position: "absolute", left: 0, top: 0 }}>
      {parts}
      {steam}
    </svg>
  );
};
