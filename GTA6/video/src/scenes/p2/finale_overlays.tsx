// 2D-оверлеи сцены p2/finale: таймер-HUD, «СТАРТ!», загрузочный экран, «БАБАХ!», экран телефона, финальная карточка.
import React from "react";
import { AbsoluteFill } from "remotion";
import { FONT } from "../../kit/paper";
import { prog, easeOutBack, easeOut, clamp01, hash } from "../../kit/anim";
import { timerText } from "./finale_world";

const ink = (w: number, c = "#000") => ({ WebkitTextStroke: `${w}px ${c}`, paintOrder: "stroke fill" as const });

/** Табло обратного отсчёта сверху кадра. tick — время с последней смены цифры (для «удара») */
export const TimerHUD: React.FC<{ sec: number; tick: number; small?: boolean; label?: string }> = ({ sec, tick, small, label = "ДО РЕЛИЗА GTA VI" }) => {
  const pop = 1 + 0.18 * (1 - easeOut(clamp01(tick / 0.25)));
  const sc = (small ? 0.72 : 1) * pop;
  return (
    <AbsoluteFill style={{ alignItems: "center", top: small ? 165 : 180, pointerEvents: "none" }}>
      <div style={{ transform: `scale(${sc}) rotate(-1.5deg)`, transformOrigin: "top center", background: "#f3e6c8", border: "6px solid #151515", boxShadow: "10px 10px 0 rgba(0,0,0,0.5)", padding: "12px 26px 18px", textAlign: "center" }}>
        <div style={{ fontFamily: FONT, fontWeight: 900, fontSize: 34, color: "#b71c1c", letterSpacing: 2 }}>{label}</div>
        <div style={{ marginTop: 6, background: "#0c0f17", border: "4px solid #333", padding: "2px 22px", fontFamily: FONT, fontWeight: 900, fontSize: 112, lineHeight: 1.1, color: sec <= 1 ? "#ff3b3b" : "#7ff3ff", letterSpacing: 4, textShadow: `0 0 18px ${sec <= 1 ? "#ff3b3b" : "#2fd8ff"}` }}>{timerText(sec)}</div>
      </div>
    </AbsoluteFill>
  );
};

/** «СТАРТ!» — штамп */
export const StartStamp: React.FC<{ k: number; t: number }> = ({ k, t }) => {
  if (k <= 0) return null;
  const s = 2.2 - 1.2 * easeOutBack(clamp01(k / 0.18));
  const jit = Math.floor(t * 12);
  return (
    <AbsoluteFill style={{ alignItems: "center", top: 330, pointerEvents: "none" }}>
      <div style={{ transform: `scale(${s}) rotate(${-6 + (hash(jit) - 0.5) * 3}deg)`, background: "#ffe14d", border: "10px solid #111", boxShadow: "14px 14px 0 rgba(0,0,0,0.55)", padding: "6px 46px 16px" }}>
        <div style={{ fontFamily: FONT, fontWeight: 900, fontSize: 210, lineHeight: 1, color: "#e8202a", ...ink(14, "#111") }}>СТАРТ!</div>
      </div>
    </AbsoluteFill>
  );
};

const Palm: React.FC<{ x: number; h: number; flip?: boolean }> = ({ x, h, flip }) => (
  <svg viewBox="0 0 200 400" style={{ position: "absolute", left: x, bottom: 520, width: h / 2, height: h, transform: flip ? "scaleX(-1)" : undefined }}>
    <path d="M100 400 C 104 300, 92 200, 112 110 L 122 112 C 106 200, 118 300, 114 400 Z" fill="#1a0526" />
    {[[-70, -10], [-40, -50], [10, -60], [60, -30], [80, 20], [-80, 30]].map(([dx, dy], i) => (
      <path key={i} d={`M117 110 Q ${117 + dx * 0.6} ${110 + dy - 30}, ${117 + dx * 1.3} ${110 + dy + 40} Q ${117 + dx * 0.5} ${110 + dy - 5}, 117 112 Z`} fill="#1a0526" />
    ))}
  </svg>
);

/** Загрузочный экран (неон-закат, пальмы, простой текст «GTA VI») */
export const LoadingScreen: React.FC<{ k: number; flash: number }> = ({ k, flash }) => (
  <AbsoluteFill style={{ overflow: "hidden", background: "linear-gradient(180deg, #1c0638 0%, #6a0f7a 28%, #ff2fa8 50%, #ff8a3d 64%, #2a0842 64.2%, #12032a 100%)" }}>
    {/* солнце в полоску */}
    <div style={{ position: "absolute", left: 190, top: 560, width: 700, height: 700, borderRadius: "50%", background: "linear-gradient(180deg, #ffe14d 0%, #ff8a3d 55%, #ff2fa8 100%)", clipPath: "inset(0 0 41% 0)" }} />
    {[0, 1, 2, 3, 4].map((i) => <div key={i} style={{ position: "absolute", left: 150, width: 780, top: 830 + i * 24, height: 8 + i * 3, background: "#ff3fae" }} />)}
    {/* неоновая сетка */}
    <svg viewBox="0 0 1080 690" style={{ position: "absolute", left: 0, top: 1230, width: 1080, height: 690 }}>
      {Array.from({ length: 13 }, (_, i) => <line key={"v" + i} x1={540} y1={0} x2={(i - 6) * 260 + 540} y2={690} stroke="#22e6ff" strokeWidth={4} opacity={0.8} />)}
      {Array.from({ length: 8 }, (_, i) => { const y = Math.pow((i + ((k * 3) % 1)) / 8, 2) * 690; return <line key={"h" + i} x1={0} y1={y} x2={1080} y2={y} stroke="#22e6ff" strokeWidth={4} opacity={0.8} />; })}
    </svg>
    <Palm x={-60} h={760} />
    <Palm x={760} h={680} flip />
    <Palm x={860} h={520} />
    <div style={{ position: "absolute", top: 270, width: "100%", textAlign: "center", fontFamily: FONT, fontWeight: 900, fontStyle: "italic", fontSize: 230, letterSpacing: 6, color: "#ffffff", textShadow: "0 0 30px #ff2fd0, 8px 8px 0 #22e6ff" }}>GTA VI</div>
    {/* полоса загрузки */}
    <div style={{ position: "absolute", left: 140, right: 140, top: 1560, height: 40, border: "5px solid #fff", borderRadius: 24, padding: 5 }}>
      <div style={{ width: `${8 + 92 * clamp01(k * 1.6)}%`, height: "100%", borderRadius: 16, background: "linear-gradient(90deg, #ff2fd0, #22e6ff)" }} />
    </div>
    <div style={{ position: "absolute", top: 1625, width: "100%", textAlign: "center", fontFamily: FONT, fontWeight: 800, fontSize: 44, color: "#fff", letterSpacing: 4 }}>ЗАГРУЗКА…</div>
    {flash > 0 && <AbsoluteFill style={{ background: "#fff", opacity: flash }} />}
  </AbsoluteFill>
);

/** Комикс-надпись взрыва */
export const BoomText: React.FC<{ k: number; t: number }> = ({ k, t }) => {
  if (k <= 0 || k >= 1) return null;
  const s = 0.3 + 1.0 * easeOutBack(clamp01(k / 0.25));
  const j = Math.floor(t * 12);
  const pts = Array.from({ length: 24 }, (_, i) => { const a = (i / 24) * Math.PI * 2; const r = i % 2 ? 36 : 50; return `${50 + Math.cos(a) * r}% ${50 + Math.sin(a) * r}%`; }).join(",");
  return (
    <AbsoluteFill style={{ alignItems: "center", top: 210, pointerEvents: "none", opacity: k > 0.8 ? (1 - k) / 0.2 : 1 }}>
      <div style={{ position: "relative", width: 900, height: 520, transform: `scale(${s}) rotate(${-8 + (hash(j) - 0.5) * 4}deg)` }}>
        <div style={{ position: "absolute", inset: 0, background: "#111", clipPath: `polygon(${pts})`, transform: "scale(1.04)" }} />
        <div style={{ position: "absolute", inset: 0, background: "#ffe14d", clipPath: `polygon(${pts})` }} />
        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: FONT, fontWeight: 900, fontSize: 170, color: "#e8202a", ...ink(14, "#111") }}>БАБАХ!!</div>
      </div>
    </AbsoluteFill>
  );
};

/** Экран телефона с сообщением. k — время от появления (с) */
export const PhoneScreen: React.FC<{ k: number; t: number }> = ({ k, t }) => {
  if (k <= 0) return null;
  const inK = easeOutBack(clamp01(k / 0.35));
  const bubble = easeOutBack(clamp01((k - 0.45) / 0.3));
  const shot = easeOutBack(clamp01((k - 1.5) / 0.3));
  const blink = Math.floor(t * 3) % 2 === 0;
  return (
    <AbsoluteFill style={{ alignItems: "center", top: 175, pointerEvents: "none" }}>
      <div style={{ transform: `translateY(${(1 - inK) * 900}px) rotate(-2deg)`, width: 800, height: 1290, background: "#0d0d10", borderRadius: 70, border: "8px solid #2b2b30", boxShadow: "16px 16px 0 rgba(0,0,0,0.6)", padding: 26, boxSizing: "border-box" }}>
        <div style={{ width: "100%", height: "100%", borderRadius: 48, background: "#dfe7ef", overflow: "hidden", position: "relative", fontFamily: FONT }}>
          {/* статус-бар */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "18px 34px", background: "#1f2a38", color: "#fff", fontWeight: 800, fontSize: 34 }}>
            <span>00:01</span>
            <span style={{ display: "flex", alignItems: "center", gap: 10, color: "#ff4d4d" }}>
              <span style={{ fontSize: 30 }}>нет сети ✕</span>
              <span style={{ display: "inline-flex", alignItems: "center" }}>
                <span style={{ width: 66, height: 32, border: "4px solid #fff", borderRadius: 7, padding: 3, boxSizing: "border-box", display: "inline-block" }}>
                  <span style={{ display: "block", width: 7, height: "100%", background: blink ? "#ff3b3b" : "transparent" }} />
                </span>
                <span style={{ width: 6, height: 14, background: "#fff", marginLeft: 2, display: "inline-block" }} />
              </span>
              <span>1%</span>
            </span>
          </div>
          {/* шапка чата */}
          <div style={{ display: "flex", alignItems: "center", gap: 20, padding: "20px 30px", background: "#2c3e57", color: "#fff" }}>
            <div style={{ width: 88, height: 88, borderRadius: "50%", background: "#f39c12", border: "4px solid #fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 50, fontWeight: 900 }}>С</div>
            <div>
              <div style={{ fontWeight: 900, fontSize: 46 }}>Серёга (дома)</div>
              <div style={{ fontWeight: 600, fontSize: 28, color: "#9fd3ff" }}>в сети · {"19 ноября"}</div>
            </div>
          </div>
          {/* сообщение */}
          <div style={{ padding: "34px 30px" }}>
            <div style={{ transform: `scale(${bubble})`, transformOrigin: "top left", background: "#fff", borderRadius: "36px 36px 36px 8px", padding: "26px 30px", boxShadow: "6px 6px 0 rgba(0,0,0,0.18)", maxWidth: 640 }}>
              <div style={{ fontWeight: 800, fontSize: 52, lineHeight: 1.18, color: "#111" }}>Здарова, лох! У нас уже 19 ноября наступило, я уже первую миссию прохожу, графон пушка!</div>
              <div style={{ textAlign: "right", fontSize: 26, color: "#888", marginTop: 8, fontWeight: 700 }}>00:01 ✓✓</div>
            </div>
            <div style={{ marginTop: 26, transform: `scale(${shot})`, transformOrigin: "top left", width: 560, height: 300, borderRadius: 28, overflow: "hidden", border: "6px solid #fff", boxShadow: "6px 6px 0 rgba(0,0,0,0.18)", position: "relative", background: "linear-gradient(180deg, #3a0a5e 0%, #ff2fa8 55%, #ff8a3d 70%, #20063a 70.5%)" }}>
              <div style={{ position: "absolute", left: 180, top: 70, width: 200, height: 200, borderRadius: "50%", background: "#ffd23d", clipPath: "inset(0 0 45% 0)" }} />
              <div style={{ position: "absolute", width: "100%", top: 18, textAlign: "center", fontWeight: 900, fontStyle: "italic", fontSize: 64, color: "#fff", textShadow: "4px 4px 0 #22e6ff" }}>GTA VI</div>
              <div style={{ position: "absolute", right: 14, bottom: 10, fontWeight: 800, fontSize: 26, color: "#fff" }}>▶ 4K · 60 FPS</div>
            </div>
          </div>
          {/* «батарея садится» — затемнение экрана */}
          <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, padding: "22px 30px", background: "#c9d3dd", color: "#7a8796", fontWeight: 700, fontSize: 34 }}>Сообщение…</div>
        </div>
      </div>
    </AbsoluteFill>
  );
};

/** Финальная карточка */
export const EndCard: React.FC<{ k: number }> = ({ k }) => {
  if (k <= 0) return null;
  const a = easeOutBack(clamp01(k / 0.4));
  const b = easeOutBack(clamp01((k - 0.45) / 0.35));
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", pointerEvents: "none", paddingBottom: 240 }}>
      <div style={{ transform: `scale(${a}) rotate(-3deg)`, background: "#f3e6c8", border: "8px solid #151515", boxShadow: "16px 16px 0 rgba(0,0,0,0.6)", padding: "24px 70px 30px", textAlign: "center" }}>
        <div style={{ fontFamily: FONT, fontWeight: 900, fontSize: 190, lineHeight: 1, color: "#c0161e", letterSpacing: 8 }}>КОНЕЦ</div>
      </div>
      <div style={{ marginTop: 60, transform: `scale(${b}) rotate(2deg)`, background: "#111", border: "6px solid #f3e6c8", padding: "18px 34px", textAlign: "center", boxShadow: "10px 10px 0 rgba(0,0,0,0.5)" }}>
        <div style={{ fontFamily: FONT, fontWeight: 900, fontSize: 58, color: "#ffe14d" }}>GTA VI — 19 ноября</div>
        <div style={{ fontFamily: FONT, fontWeight: 700, fontSize: 38, color: "#f3e6c8", marginTop: 6 }}>Новая Зеландия — когда дадут свет</div>
      </div>
    </AbsoluteFill>
  );
};
