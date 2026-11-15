import React from "react";
import { AbsoluteFill, Easing, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { CUES, FPS, SUBS, Who } from "../data/timeline";

const WHO_LABELS: Record<Who, { label: string; color: string }> = {
  coder: { label: "КОДЕР", color: "#6366f1" },
  claude: { label: "CLAUDE AI ✨", color: "#d97706" },
  boss: { label: "НАДСМОТРЩИК", color: "#dc2626" },
  w418: { label: "ТОКЕН #418", color: "#0ea5e9" },
};

const T_FLY_START = CUES.b_fly.start; // 12.05
const T_CABLE_START = 14.90;
const T_INDIA_1_START = Number(((CUES.b_fly.end + CUES.c_boss1.start) / 2).toFixed(2)); // 17.75
const T_CODER_2_START = Number((CUES.c_boss2.end + 0.2).toFixed(2)); // 41.78
const T_INDIA_2_START = Number((CUES.d_coder3.end + 0.3).toFixed(2)); // 48.54
const T_CODER_3_START = Number((CUES.f_claude2.start - 0.4).toFixed(2)); // 52.40
const T_INDIA_3_START = Number(((CUES.f_coder4.end + CUES.g_boss3.start) / 2).toFixed(2)); // 60.89
const T_FINAL_PUNCH = CUES.g_end.start; // 66.41

export const ShortsOverlays: React.FC<{ timeOffsetSec?: number }> = ({ timeOffsetSec = 0 }) => {
  const frame = useCurrentFrame();
  const videoConfig = useVideoConfig();
  const fps = videoConfig.fps || FPS;
  const t = timeOffsetSec + frame / fps;

  // 1. Верхняя плашка локации
  let topTitle = "🏠 КОМНАТА РАЗРАБА • КАЛИФОРНИЯ?";
  let topColor = "#a5b4fc";
  let topRot = "-0.9deg";

  if (t >= T_FLY_START && t < T_CABLE_START) {
    topTitle = "☁️ ANTHROPIC DATA CENTER • ПЕРЕАДРЕСАЦИЯ";
    topColor = "#fde047";
    topRot = "0.8deg";
  } else if (t >= T_CABLE_START && t < T_INDIA_1_START) {
    topTitle = "🌊 КАБЕЛЬ США ➔ ИНДИЯ";
    topColor = "#38bdf8";
    topRot = "-0.8deg";
  } else if (t >= T_INDIA_1_START && t < T_CODER_2_START) {
    topTitle = "[INDIA] МУМБАИ • SERVER RACK INDIA-4";
    topColor = "#fb923c";
    topRot = "0.7deg";
  } else if (t >= T_CODER_2_START && t < T_INDIA_2_START) {
    topTitle = "🏠 КОМНАТА РАЗРАБА • ОТВЕТ ПРИШЁЛ";
    topColor = "#6ee7b7";
    topRot = "-0.8deg";
  } else if (t >= T_INDIA_2_START && t < T_CODER_3_START) {
    topTitle = "🚨 ПЕРЕГРУЗКА RUST • МУМБАИ";
    topColor = "#ef4444";
    topRot = "1.0deg";
  } else if (t >= T_CODER_3_START && t < T_INDIA_3_START) {
    topTitle = "⛔ CLAUDE • ЛИМИТ ИСЧЕРПАН";
    topColor = "#fb7185";
    topRot = "-0.8deg";
  } else if (t >= T_INDIA_3_START) {
    topTitle = "[INDIA] МУМБАИ • ДОЗАВОЗ СМЕНЫ";
    topColor = "#fbbf24";
    topRot = "0.7deg";
  }

  // 2. Счётчик токенов (правый верхний угол: top: 225, right: 48)
  const isLimitBroken = t >= 51.40;
  let tokenDisplay = "0";
  let tokenValueColor = "#4ade80";
  let tokenBoxBg = "#18181b";
  let tokenBorderColor = "#09090b";

  if (t >= 11.8 && t < 12.8) {
    const val = Math.round(
      interpolate(t, [11.8, 12.8], [0, 4000], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
        easing: Easing.out(Easing.cubic),
      })
    );
    tokenDisplay = val.toLocaleString("en-US");
    tokenValueColor = "#facc15";
  } else if (t >= 12.8 && t < 48.2) {
    tokenDisplay = "4,000";
    tokenValueColor = "#facc15";
  } else if (t >= 48.2 && t < 51.2) {
    const val = Math.round(
      interpolate(t, [48.2, 51.2], [4000, 120000], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
        easing: Easing.in(Easing.quad),
      })
    );
    tokenDisplay = val.toLocaleString("en-US");
    tokenValueColor = val > 50000 ? "#ef4444" : "#fb923c";
  } else if (t >= 51.2 && t < 51.40) {
    tokenDisplay = "120,000";
    tokenValueColor = "#ef4444";
  } else if (isLimitBroken) {
    tokenDisplay = "0 / LIMIT!";
    const blinkOn = Math.floor((t - 51.40) * 5) % 2 === 0;
    tokenValueColor = blinkOn ? "#ffffff" : "#ef4444";
    tokenBoxBg = blinkOn ? "#dc2626" : "#270909";
    tokenBorderColor = blinkOn ? "#fecaca" : "#ef4444";
  }

  const tokenScale =
    t >= 11.8 && t < 12.8
      ? interpolate(t, [11.8, 12.0, 12.8], [1, 1.07, 1], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        })
      : t >= 48.2 && t < 51.4
        ? interpolate(t, [48.2, 51.2], [1, 1.09], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          })
        : isLimitBroken
          ? interpolate(t, [51.4, 51.65], [1.14, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
              easing: Easing.out(Easing.back(1.6)),
            })
          : 1;

  // Тревожная красная пульсация по краям в Сцене E (перегрузка Rust)
  const isOverload = t >= T_INDIA_2_START && t < T_CODER_3_START;
  const overloadPulse = isOverload ? 0.5 + 0.5 * Math.sin((t - T_INDIA_2_START) * 14) : 0;

  // 3. Всплывающие карточки интерфейса Claude
  const showClaudeReplyCard = t >= 42.0 && t < 44.3;
  const replyProgressIn = interpolate(t, [42.0, 42.24], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.back(1.5)),
  });
  const replyOpacity =
    t < 44.05
      ? interpolate(t, [42.0, 42.15], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })
      : interpolate(t, [44.05, 44.3], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  const showClaudeErrorCard = t >= 52.6 && t < 56.5;
  const errorScaleIn = interpolate(t, [52.6, 52.84], [0.82, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.back(1.5)),
  });
  const errorOpacity =
    t < 56.25
      ? interpolate(t, [52.6, 52.74], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })
      : interpolate(t, [56.25, 56.5], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const errorShakeX =
    t >= 52.6 && t < 53.05 ? Math.sin((t - 52.6) * 65) * (1 - (t - 52.6) / 0.45) * 9 : 0;

  // 4. Финальный баннер-панч (t >= 66.41)
  const showFinalBanner = t >= T_FINAL_PUNCH;
  const finalBackdropAlpha = showFinalBanner
    ? interpolate(t, [T_FINAL_PUNCH, T_FINAL_PUNCH + 0.3], [0, 0.78], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
      })
    : 0;
  const finalZoom = showFinalBanner
    ? interpolate(t, [T_FINAL_PUNCH, T_FINAL_PUNCH + 0.42], [0.72, 1.0], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
        easing: Easing.out(Easing.back(1.5)),
      })
    : 1;
  const finalOpacity = showFinalBanner
    ? interpolate(t, [T_FINAL_PUNCH, T_FINAL_PUNCH + 0.18], [0, 1], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
      })
    : 0;
  const punchFootnoteScale = showFinalBanner
    ? interpolate(t, [T_FINAL_PUNCH + 0.24, T_FINAL_PUNCH + 0.56], [0.65, 1.0], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
        easing: Easing.out(Easing.back(1.6)),
      })
    : 1;
  const punchFootnoteOpacity = showFinalBanner
    ? interpolate(t, [T_FINAL_PUNCH + 0.24, T_FINAL_PUNCH + 0.38], [0, 1], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
      })
    : 0;

  // 5. Активная реплика субтитров
  const active = SUBS.find((item) => t >= item.start && t < item.end);
  const progress = active ? (t - active.start) / Math.max(0.01, active.end - active.start) : 0;

  return (
    <AbsoluteFill style={{ pointerEvents: "none", fontFamily: '"Arial Black", "Montserrat", sans-serif' }}>
      {/* Soft Cinematic Vignette */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "radial-gradient(circle at 50% 48%, rgba(0,0,0,0) 54%, rgba(0,0,0,0.45) 100%)",
        }}
      />

      {/* Red Alert Vignette during Rust Overload */}
      {isOverload && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: `radial-gradient(circle at 50% 50%, rgba(220,38,38,0) 52%, rgba(220,38,38,${(
              0.16 +
              0.24 * overloadPulse
            ).toFixed(3)}) 100%)`,
          }}
        />
      )}

      {/* Top Location Pill */}
      <div
        style={{
          position: "absolute",
          top: 118,
          left: "50%",
          transform: `translateX(-50%) rotate(${topRot})`,
          backgroundColor: "#18181b",
          border: "5px solid #09090b",
          boxShadow: "0 8px 0 rgba(0,0,0,0.65)",
          borderRadius: 14,
          padding: "12px 24px",
          color: topColor,
          fontSize: 27,
          letterSpacing: 0.8,
          whiteSpace: "nowrap",
          maxWidth: 980,
        }}
      >
        {topTitle}
      </div>

      {/* Token Counter HUD (top-right) */}
      <div
        style={{
          position: "absolute",
          top: 225,
          right: 48,
          transform: `scale(${tokenScale})`,
          transformOrigin: "top right",
          backgroundColor: tokenBoxBg,
          border: `5px solid ${tokenBorderColor}`,
          borderRadius: 14,
          padding: "10px 20px",
          boxShadow: isLimitBroken
            ? "0 6px 0 rgba(0,0,0,0.75), 0 0 24px rgba(239,68,68,0.5)"
            : "0 6px 0 rgba(0,0,0,0.65)",
          textAlign: "center",
          minWidth: 280,
        }}
      >
        <div
          style={{
            color: isLimitBroken ? "#fecaca" : "#94a3b8",
            fontSize: 17,
            letterSpacing: 0.6,
            marginBottom: 2,
          }}
        >
          ТОКЕНЫ (1 = 1 ИНДУС)
        </div>
        <div
          style={{
            color: tokenValueColor,
            fontSize: 38,
            lineHeight: 1.08,
            fontVariantNumeric: "tabular-nums",
            textShadow: "0 3px 0 rgba(0,0,0,0.7)",
          }}
        >
          {tokenDisplay}
        </div>
      </div>

      {/* Scene D: Warm Claude Notification Card */}
      {showClaudeReplyCard && (
        <div
          style={{
            position: "absolute",
            top: 350,
            left: "50%",
            transform: `translateX(-50%) translateY(${(1 - replyProgressIn) * -18}px) scale(${
              0.86 + 0.14 * replyProgressIn
            })`,
            opacity: replyOpacity,
            width: 880,
            backgroundColor: "#fdf6ec",
            border: "5px solid #09090b",
            borderRadius: 20,
            boxShadow: "0 10px 0 rgba(0,0,0,0.65), 0 18px 34px rgba(217,119,6,0.28)",
            padding: "16px 26px",
            display: "flex",
            alignItems: "center",
            gap: 18,
          }}
        >
          <div
            style={{
              width: 60,
              height: 60,
              borderRadius: 14,
              backgroundColor: "#d97706",
              border: "4px solid #09090b",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#fffbeb",
              fontSize: 30,
              flexShrink: 0,
            }}
          >
            ✨
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <div
              style={{
                color: "#b45309",
                fontSize: 18,
                letterSpacing: 1,
                fontFamily: "Arial, sans-serif",
                fontWeight: 900,
              }}
            >
              ANTHROPIC CLAUDE • НОВОЕ СООБЩЕНИЕ
            </div>
            <div style={{ color: "#1c1917", fontSize: 31, lineHeight: 1.18 }}>
              ✨ CLAUDE: «Конечно, с радостью помогу!»
            </div>
          </div>
        </div>
      )}

      {/* Scene F: Red Claude Limit Error Card */}
      {showClaudeErrorCard && (
        <div
          style={{
            position: "absolute",
            top: 350,
            left: "50%",
            transform: `translateX(calc(-50% + ${errorShakeX}px)) scale(${errorScaleIn})`,
            opacity: errorOpacity,
            width: 890,
            backgroundColor: "#450a0a",
            border: "5px solid #ef4444",
            outline: "4px solid #09090b",
            borderRadius: 20,
            boxShadow: "0 10px 0 rgba(0,0,0,0.72), 0 0 38px rgba(239,68,68,0.5)",
            padding: "16px 26px",
            display: "flex",
            alignItems: "center",
            gap: 18,
          }}
        >
          <div
            style={{
              width: 60,
              height: 60,
              borderRadius: 14,
              backgroundColor: "#dc2626",
              border: "4px solid #09090b",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#ffffff",
              fontSize: 30,
              flexShrink: 0,
            }}
          >
            ⚠️
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <div
              style={{
                color: "#fca5a5",
                fontSize: 18,
                letterSpacing: 1,
                fontFamily: "Arial, sans-serif",
                fontWeight: 900,
              }}
            >
              CLAUDE USAGE LIMIT EXCEEDED
            </div>
            <div style={{ color: "#ffffff", fontSize: 31, lineHeight: 1.18 }}>
              ⚠️ You&apos;ve reached your 5-hour usage limit.
            </div>
          </div>
        </div>
      )}

      {/* Karaoke Subtitles (bottom: 205) */}
      {active && (
        <div
          style={{
            position: "absolute",
            bottom: 205,
            left: "50%",
            transform: "translateX(-50%)",
            width: 920,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 12,
          }}
        >
          <div
            style={{
              backgroundColor: WHO_LABELS[active.who]?.color ?? "#f59e0b",
              color: "#ffffff",
              border: "4px solid #09090b",
              borderRadius: 10,
              padding: "4px 20px",
              fontSize: 26,
              textShadow: "0 2px 0 #09090b",
              boxShadow: "0 5px 0 rgba(0,0,0,0.6)",
            }}
          >
            {WHO_LABELS[active.who]?.label ?? active.who.toUpperCase()}
          </div>

          <div
            style={{
              backgroundColor: "rgba(15, 23, 42, 0.88)",
              border: "5px solid #09090b",
              borderRadius: 20,
              padding: "18px 28px",
              boxShadow: "0 10px 0 rgba(0,0,0,0.65)",
              textAlign: "center",
              lineHeight: 1.25,
            }}
          >
            {(() => {
              const words = active.text.split(/\s+/).filter(Boolean);
              const activeIdx = Math.min(words.length - 1, Math.floor(progress * words.length * 1.05));
              return words.map((word, idx) => (
                <span
                  key={idx}
                  style={{
                    color: idx <= activeIdx ? "#facc15" : "#ffffff",
                    fontSize: 40,
                    textShadow: "0 4px 0 #09090b",
                    marginRight: idx < words.length - 1 ? 10 : 0,
                    display: "inline-block",
                  }}
                >
                  {word}
                </span>
              ));
            })()}
          </div>
        </div>
      )}

      {/* Final Punch Banner (t >= 66.41) */}
      {showFinalBanner && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            backgroundColor: `rgba(9, 9, 11, ${finalBackdropAlpha})`,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "0 48px",
          }}
        >
          <div
            style={{
              width: "100%",
              maxWidth: 940,
              backgroundColor: "rgba(15, 23, 42, 0.95)",
              border: "6px solid #facc15",
              outline: "6px solid #09090b",
              borderRadius: 28,
              padding: "46px 32px",
              textAlign: "center",
              transform: `scale(${finalZoom})`,
              opacity: finalOpacity,
              boxShadow: "0 16px 0 rgba(0,0,0,0.8), 0 0 80px rgba(250, 204, 21, 0.28)",
            }}
          >
            <div
              style={{
                display: "inline-block",
                backgroundColor: "#facc15",
                color: "#09090b",
                border: "5px solid #09090b",
                borderRadius: 16,
                padding: "10px 30px",
                fontSize: 54,
                letterSpacing: 2,
                lineHeight: 1.05,
                boxShadow: "0 7px 0 #09090b",
              }}
            >
              1 TOKEN = 1 HUMAN
            </div>

            <div
              style={{
                color: "#ffffff",
                fontSize: 64,
                marginTop: 28,
                letterSpacing: 1.5,
                lineHeight: 1.1,
                textShadow: "0 6px 0 #09090b",
              }}
            >
              Powered by AI*
            </div>

            <div
              style={{
                color: "#ef4444",
                fontSize: 48,
                marginTop: 18,
                letterSpacing: 1.5,
                lineHeight: 1.1,
                textShadow: "0 5px 0 #09090b",
                transform: `scale(${punchFootnoteScale})`,
                opacity: punchFootnoteOpacity,
              }}
            >
              *Actually Indians
            </div>
          </div>
        </div>
      )}
    </AbsoluteFill>
  );
};
