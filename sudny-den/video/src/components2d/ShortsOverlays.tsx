import React from "react";
import { AbsoluteFill, Easing, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { CUES, SCENES, getActiveLine } from "../data/scene1Timeline";

const WHO_LABELS: Record<string, { label: string; color: string }> = {
  boss: { label: "БОСС", color: "#ef4444" },
  worker: { label: "СОТРУДНИК", color: "#3b82f6" },
  guard1: { label: "ИНКАССАТОР", color: "#65a30d" },
  fire: { label: "ПОЖАРНЫЙ", color: "#dc2626" },
  ivanych: { label: "ИВАНЫЧ", color: "#ea580c" },
  petya: { label: "ПЕТЯ (СТАЖЁР)", color: "#eab308" },
  surgeon: { label: "ХИРУРГ", color: "#0ea5e9" },
  anest: { label: "АНЕСТЕЗИОЛОГ", color: "#14b8a6" },
  oleg: { label: "ОЛЕГ", color: "#f97316" },
};

export const ShortsOverlays: React.FC<{ timeOffsetSec?: number }> = ({ timeOffsetSec = 0 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = timeOffsetSec + frame / fps;

  const isScene1 = t < SCENES.s2.start;
  const isScene2 = t >= SCENES.s2.start && t < SCENES.s3.start;
  const isScene3 = t >= SCENES.s3.start && t < SCENES.s4.start;
  const isScene4 = t >= SCENES.s4.start;

  const notified = t >= CUES.s1_notify;
  const isCrashShot = isScene1 && t >= CUES.s1_crash_shot && t < CUES.s1_fire_shot;
  const isFireShot = isScene1 && t >= CUES.s1_fire_shot;

  let topTitle = `19 НОЯБРЯ • ${notified ? "08:01" : "08:00"} • РЕЛИЗ GTA VI`;
  let topColor = notified ? "#6ee7b7" : "#facc15";
  let topRot = "-0.9deg";

  if (isFireShot) {
    topTitle = "ВЫЗОВ 01 • ПОЖАР ПОДОЖДЁТ";
    topColor = "#fca5a5";
  } else if (isCrashShot) {
    topTitle = "ПЕРЕКРЁСТОК • ИНКАССАЦИЯ";
    topColor = "#fde047";
    topRot = "0.9deg";
  } else if (isScene2) {
    const isMenu = t >= CUES.s2_menu;
    topTitle = isMenu ? "ПУЛЬТ АЭС • ВАЙС-СИТИ ЖДЁТ" : "ПУЛЬТ АЭС • ДЕНЬ";
    topColor = isMenu ? "#f472b6" : "#f87171";
    topRot = "0.7deg";
  } else if (isScene3) {
    const blackedOut = t >= CUES.s3_blackout;
    topTitle = blackedOut ? "ОПЕРАЦИОННАЯ • АВАРИЙНЫЙ СВЕТ" : "ОПЕРАЦИОННАЯ • ПОЛДЕНЬ";
    topColor = blackedOut ? "#fb7185" : "#93c5fd";
    topRot = "-0.8deg";
  } else if (isScene4) {
    topTitle = "РУИНЫ ГОРОДА • ВЕЧЕР";
    topColor = "#fb923c";
    topRot = "0.8deg";
  }

  const showToast = isScene1 && notified && t < CUES.s1_boss + 1.25;
  const localFrame = frame + Math.round(timeOffsetSec * fps);
  const toastY = interpolate(localFrame, [CUES.s1_notify * fps, (CUES.s1_notify + 0.5) * fps], [-150, 235], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.back(1.6)),
  });

  // Scene 2 countdown: 45s -> 00s by CUES.s2_zero
  const s2Remaining = Math.max(
    0,
    Math.ceil(45 * (1 - Math.max(0, t - SCENES.s2.start) / Math.max(1, CUES.s2_zero - SCENES.s2.start)))
  );
  const s2Clock = `00:${String(s2Remaining).padStart(2, "0")}`;

  // Scene 2 whiteout at meltdown
  const s2WhiteAlpha =
    t >= CUES.s2_boom && t < SCENES.s3.start
      ? interpolate(t, [CUES.s2_boom, CUES.s2_boom + 1.25, SCENES.s3.start - 0.15, SCENES.s3.start], [0, 1, 1, 0], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        })
      : 0;

  // Scene 4 battery HUD
  const s4BattPct =
    t >= CUES.s4_poweroff
      ? 0
      : Math.max(
          1,
          Math.round(14 * (1 - Math.max(0, t - CUES.s4_oleg_shot) / Math.max(1, CUES.s4_poweroff - CUES.s4_oleg_shot)))
        );

  // Scene 4 Black screen & WASTED slam
  const isFinalBlack = t >= CUES.s4_black;
  const blackAlpha = isFinalBlack ? Math.min(1, (t - CUES.s4_black) / 0.35) : 0;
  const showWasted = t >= CUES.s4_wasted;
  const wastedScale = showWasted
    ? interpolate(t, [CUES.s4_wasted, CUES.s4_wasted + 0.35], [2.4, 1.0], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
        easing: Easing.out(Easing.back(1.5)),
      })
    : 1;

  const active = getActiveLine(t);

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

      {/* Top Location Tag */}
      {!isFinalBlack && (
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
            padding: "12px 28px",
            color: topColor,
            fontSize: 30,
            letterSpacing: 1,
            whiteSpace: "nowrap",
          }}
        >
          {topTitle}
        </div>
      )}

      {/* Steam / Rockstar Release Notification Banner */}
      {showToast && (
        <div
          style={{
            position: "absolute",
            top: toastY,
            left: "50%",
            transform: "translateX(-50%)",
            width: 720,
            backgroundColor: "#182028",
            border: "5px solid #09090b",
            borderRadius: 16,
            boxShadow: "0 12px 28px rgba(0,0,0,0.6)",
            padding: "14px 20px",
            display: "flex",
            alignItems: "center",
            gap: 18,
          }}
        >
          <div
            style={{
              width: 76,
              height: 76,
              borderRadius: 12,
              backgroundColor: "#4ade80",
              border: "4px solid #09090b",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#09090b",
              fontSize: 25,
              fontWeight: 900,
              flexShrink: 0,
            }}
          >
            GTA
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <div style={{ color: "#facc15", fontSize: 27, lineHeight: 1.1 }}>
              ЗАГРУЗКА GTA VI ДОСТУПНА!
            </div>
            <div style={{ color: "#e2e8f0", fontSize: 21, fontFamily: "Arial, sans-serif", fontWeight: 700 }}>
              Шейдеры: 99% • Нажмите ИГРАТЬ
            </div>
          </div>
        </div>
      )}

      {/* Money Counter HUD during Crossroads Crash */}
      {isCrashShot && (
        <div
          style={{
            position: "absolute",
            top: 230,
            right: 54,
            backgroundColor: "#18181b",
            border: "5px solid #09090b",
            borderRadius: 14,
            padding: "10px 22px",
            boxShadow: "0 6px 0 rgba(0,0,0,0.65)",
            textAlign: "center",
          }}
        >
          <div style={{ color: "#94a3b8", fontSize: 18 }}>КУПЮРЫ</div>
          <div style={{ color: "#4ade80", fontSize: 34, lineHeight: 1.1 }}>0 / 0</div>
        </div>
      )}

      {/* Scene 2 Reactor Countdown HUD */}
      {isScene2 && t < CUES.s2_boom + 0.5 && (
        <div
          style={{
            position: "absolute",
            top: 226,
            right: 54,
            backgroundColor: "#18181b",
            border: "5px solid #09090b",
            borderRadius: 14,
            padding: "10px 22px",
            boxShadow: "0 6px 0 rgba(0,0,0,0.65)",
            textAlign: "center",
          }}
        >
          <div style={{ color: "#fca5a5", fontSize: 18 }}>ВЗРЫВ ЧЕРЕЗ</div>
          <div style={{ color: "#ef4444", fontSize: 36, lineHeight: 1.1 }}>{s2Clock}</div>
        </div>
      )}

      {/* Scene 3 Rockstar Server Status HUD */}
      {isScene3 && t >= CUES.s3_blackout + 8 && (
        <div
          style={{
            position: "absolute",
            top: 226,
            right: 54,
            backgroundColor: "#18181b",
            border: "5px solid #09090b",
            borderRadius: 14,
            padding: "10px 22px",
            boxShadow: "0 6px 0 rgba(0,0,0,0.65)",
            textAlign: "center",
          }}
        >
          <div style={{ color: "#94a3b8", fontSize: 18 }}>СЕРВЕРА R*</div>
          <div style={{ color: "#ef4444", fontSize: 32, lineHeight: 1.1 }}>OFFLINE</div>
        </div>
      )}

      {/* Scene 4 Improvised Battery HUD */}
      {isScene4 && t >= CUES.s4_oleg_shot && !isFinalBlack && (
        <div
          style={{
            position: "absolute",
            top: 226,
            right: 54,
            backgroundColor: "#18181b",
            border: "5px solid #09090b",
            borderRadius: 14,
            padding: "10px 22px",
            boxShadow: "0 6px 0 rgba(0,0,0,0.65)",
            textAlign: "center",
          }}
        >
          <div style={{ color: "#94a3b8", fontSize: 18 }}>АККУМУЛЯТОР</div>
          <div style={{ color: s4BattPct === 0 ? "#ef4444" : "#facc15", fontSize: 36, lineHeight: 1.1 }}>
            {s4BattPct}%
          </div>
        </div>
      )}

      {/* Scene 2 Nuclear Whiteout Transition */}
      {s2WhiteAlpha > 0 && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            backgroundColor: `rgba(255, 255, 255, ${s2WhiteAlpha})`,
          }}
        />
      )}

      {/* Scene 4 Pitch-Black Screen + GTA WASTED Slam Banner */}
      {isFinalBlack && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            backgroundColor: `rgba(0, 0, 0, ${blackAlpha})`,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {showWasted && (
            <div
              style={{
                width: "100%",
                backgroundColor: "rgba(15, 23, 42, 0.92)",
                borderTop: "6px solid #dc2626",
                borderBottom: "6px solid #dc2626",
                padding: "46px 24px",
                textAlign: "center",
                transform: `scale(${wastedScale})`,
                boxShadow: "0 0 80px rgba(220, 38, 38, 0.55)",
              }}
            >
              <div
                style={{
                  color: "#ef4444",
                  fontSize: 108,
                  letterSpacing: 6,
                  lineHeight: 1.0,
                  textShadow: "0 8px 0 #450a0a",
                }}
              >
                WASTED
              </div>
              <div
                style={{
                  color: "#f8fafc",
                  fontSize: 44,
                  marginTop: 14,
                  letterSpacing: 4,
                  textShadow: "0 4px 0 #09090b",
                }}
              >
                ПОТРАЧЕНО
              </div>
            </div>
          )}
        </div>
      )}

      {/* Word-Highlighted YouTube Shorts Subtitles */}
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
              backgroundColor: WHO_LABELS[active.line.who]?.color ?? "#f59e0b",
              color: "#ffffff",
              border: "4px solid #09090b",
              borderRadius: 10,
              padding: "4px 20px",
              fontSize: 26,
              textShadow: "0 2px 0 #09090b",
              boxShadow: "0 5px 0 rgba(0,0,0,0.6)",
            }}
          >
            {WHO_LABELS[active.line.who]?.label ?? active.line.who.toUpperCase()}
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
              const words = active.line.text.split(" ");
              const activeIdx = Math.min(words.length - 1, Math.floor(active.progress * words.length * 1.05));
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
    </AbsoluteFill>
  );
};
