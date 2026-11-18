// 2D-оверлеи поверх 3D: субтитры, титры частей, затемнения, вспышки.
import React from "react";
import { AbsoluteFill } from "remotion";
import { part, PartId, prog, easeOutBack, clamp01 } from "./anim";
import { FONT } from "./paper";

const NAMES: Record<string, string> = {
  pm: "Премьер-министр", defense: "Министр обороны", agri: "Министр сельского хозяйства", commander: "Командир",
  gamer: "Геймер", anchor: "Диктор", grandpa: "Дед", gamer2: "Геймер", engineer: "Инженер", crowd: "Толпа",
};

export function censorText(s: string, censored: boolean) {
  return s.replace(/\{([^}]*)\}/g, (_, w: string) => (censored ? w[0] + "*".repeat(Math.max(2, w.length - 1)) : w));
}

export const Subtitles: React.FC<{ pid: PartId; t: number; censored: boolean; hide?: boolean }> = ({ pid, t, censored, hide }) => {
  if (hide) return null;
  const s = part(pid).subs.find((x) => t >= x.start && t < x.end + 0.08);
  if (!s) return null;
  const k = prog(t, s.start, s.start + 0.12);
  const crowd = s.who === "crowd";
  return (
    <AbsoluteFill style={{ justifyContent: "flex-start", alignItems: "center", top: 1235, pointerEvents: "none" }}>
      <div style={{ transform: `scale(${0.85 + 0.15 * easeOutBack(k)})`, maxWidth: 940, textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
        <div style={{ fontFamily: FONT, fontWeight: 800, fontSize: 30, letterSpacing: 2, color: "#ffe14d", textTransform: "uppercase", WebkitTextStroke: "7px #000", paintOrder: "stroke fill" }}>{NAMES[s.who] ?? ""}</div>
        <div style={{ fontFamily: FONT, fontWeight: 900, fontSize: crowd ? 78 : 58, lineHeight: 1.08, color: crowd ? "#ff4d4d" : "#ffffff", WebkitTextStroke: "12px #000", paintOrder: "stroke fill", textShadow: "0 6px 0 rgba(0,0,0,0.35)" }}>
          {censorText(s.text, censored)}
        </div>
      </div>
    </AbsoluteFill>
  );
};

/** Шапка части в первые секунды: «ВТОРЖЕНИЕ В НОВУЮ ЗЕЛАНДИЮ · ЧАСТЬ 1» */
export const PartBadge: React.FC<{ pid: PartId; t: number; until?: number }> = ({ pid, t, until = 3.2 }) => {
  const k = easeOutBack(prog(t, 0.1, 0.5));
  const out = clamp01((until - t) / 0.35);
  if (t > until) return null;
  return (
    <AbsoluteFill style={{ alignItems: "center", top: 170, pointerEvents: "none", opacity: out }}>
      <div style={{ transform: `scale(${k}) rotate(-2deg)`, background: "#f7e9c9", padding: "18px 34px 22px", border: "6px solid #1b1b1b", boxShadow: "10px 10px 0 rgba(0,0,0,0.45)", textAlign: "center" }}>
        <div style={{ fontFamily: FONT, fontWeight: 900, fontSize: 40, color: "#b71c1c", letterSpacing: 1 }}>ВТОРЖЕНИЕ В НОВУЮ ЗЕЛАНДИЮ</div>
        <div style={{ fontFamily: FONT, fontWeight: 900, fontSize: 64, color: "#111", lineHeight: 1.05 }}>ЧАСТЬ {pid === "p1" ? 1 : 2}: «{part(pid).title}»</div>
      </div>
    </AbsoluteFill>
  );
};

export const Fade: React.FC<{ opacity: number; color?: string }> = ({ opacity, color = "#000" }) =>
  opacity <= 0 ? null : <AbsoluteFill style={{ background: color, opacity: clamp01(opacity), pointerEvents: "none" }} />;
