import React from "react";
import { Composition, Still } from "remotion";
import { Artyom, Katya } from "../characters";
import type { CharacterProps, Emotion, ArmPose } from "../characters";

const EMOS: Emotion[] = ["neutral", "smile", "teary", "worried", "panic", "rage", "dead"];
const POSES: ArmPose[] = ["rest", "table", "holdHand", "underTable", "typing", "pointing", "handsOnHead", "slap"];

type Who = "artyom" | "katya";
const Ch: React.FC<{ who: Who } & CharacterProps> = ({ who, ...p }) =>
  who === "artyom" ? <Artyom {...p} /> : <Katya {...p} />;

const label: React.CSSProperties = { color: "#fff", font: "bold 22px Arial", textAlign: "center" };

const Sheet: React.FC<{ who: Who; view: "front" | "side"; facing?: "left" | "right"; mode: "emo" | "pose" | "mouth"; frame?: number }> = ({ who, view, facing, mode, frame = 0 }) => {
  const items: { name: string; p: Partial<CharacterProps> }[] =
    mode === "emo"
      ? EMOS.map((e, i) => ({
          name: e,
          p: { emotion: e, mouth: i % 2 ? 0.7 : 0.25, twitch: e === "rage" || e === "worried" ? 1 : 0, sweat: e === "panic" || e === "worried" ? 1 : 0, tear: e === "teary" ? 1 : 0, look: { x: 0, y: 0 } },
        }))
      : mode === "pose"
        ? POSES.map((a, i) => ({ name: a, p: { emotion: "neutral" as Emotion, mouth: 0, armL: a, armR: POSES[(i + 3) % 8] } }))
        : [0, 0.15, 0.3, 0.5, 0.7, 0.9, 1, 0.05].map((m, i) => ({ name: "m" + m, p: { emotion: (i < 4 ? "neutral" : i < 6 ? "smile" : "panic") as Emotion, mouth: m } }));
  const cw = 400, ch = 560;
  return (
    <div style={{ width: 1600, height: 1250, background: "#5e3a27", display: "flex", flexWrap: "wrap" }}>
      {items.map((it, i) => (
        <div key={i} style={{ width: cw, height: ch + 40, position: "relative" }}>
          <div style={{ width: cw, height: ch, transform: "scale(0.4)", transformOrigin: "0 0" }}>
            <Ch who={who} frame={frame + 7} view={view} facing={facing ?? (i % 2 ? "left" : "right")} mouth={0} emotion="neutral" upperBodyOnly={mode === "pose"} {...it.p} />
          </div>
          <div style={label}>{it.name}</div>
        </div>
      ))}
    </div>
  );
};

const Big: React.FC<{ who: Who } & Partial<CharacterProps>> = ({ who, ...p }) => (
  <div style={{ width: 1000, height: 1400, background: "#5e3a27" }}>
    <Ch who={who} frame={5} view="front" mouth={0.4} emotion="neutral" {...p} />
  </div>
);

export const PreviewRoot: React.FC = () => (
  <>
    {(["artyom", "katya"] as Who[]).map((w) =>
      (["front", "side"] as const).map((v) => (
        <Still key={w + v} id={`${w}-${v}`} component={Sheet as React.FC<any>} width={1600} height={1250} defaultProps={{ who: w, view: v, mode: "emo" }} />
      )),
    )}
    {(["artyom", "katya"] as Who[]).map((w) =>
      (["front", "side"] as const).map((v) => (
        <Still key={w + v + "p"} id={`${w}-${v}-pose`} component={Sheet as React.FC<any>} width={1600} height={1250} defaultProps={{ who: w, view: v, mode: "pose" }} />
      )),
    )}
    {(["artyom", "katya"] as Who[]).map((w) => (
      <Still key={w + "m"} id={`${w}-mouth`} component={Sheet as React.FC<any>} width={1600} height={1250} defaultProps={{ who: w, view: "front", mode: "mouth" }} />
    ))}
    <Still id="big" component={Big as React.FC<any>} width={1000} height={1400} defaultProps={{ who: "artyom" }} />
    <Composition id="anim" component={Big as React.FC<any>} width={1000} height={1400} fps={24} durationInFrames={240} defaultProps={{ who: "artyom" }} />
  </>
);
