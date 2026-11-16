import React from "react";
import { Still } from "remotion";
import { Artyom, Katya } from "../characters";
import type { CharacterProps } from "../characters";

type Who = "artyom" | "katya";
type Item = { name: string; who?: Who; p: Partial<CharacterProps> };

const Ch: React.FC<{ who: Who } & CharacterProps> = ({ who, ...p }) =>
  who === "artyom" ? <Artyom {...p} /> : <Katya {...p} />;

const Sheet: React.FC<{ who: Who; items: Item[]; frame?: number; cols?: number }> = ({ who, items, frame = 9, cols = 4 }) => {
  const sc = 0.4;
  const cw = 1000 * sc, ch = 1400 * sc;
  const rows = Math.ceil(items.length / cols);
  return (
    <div style={{ width: cols * cw, height: rows * (ch + 36), background: "#5e3a27", display: "flex", flexWrap: "wrap" }}>
      {items.map((it, i) => (
        <div key={i} style={{ width: cw, height: ch + 36, position: "relative" }}>
          <div style={{ width: cw, height: ch, transform: `scale(${sc})`, transformOrigin: "0 0" }}>
            <Ch who={it.who ?? who} frame={frame} view="front" mouth={0.3} emotion="neutral" facing="right" {...it.p} />
          </div>
          <div style={{ color: "#fff", font: "bold 22px Arial", textAlign: "center" }}>{it.name}</div>
        </div>
      ))}
    </div>
  );
};

const katya: Item[] = [
  { name: "robe front", p: { outfit: "robe", upperBodyOnly: false } },
  { name: "robe side", p: { outfit: "robe", view: "side" } },
  { name: "robe+mascara+cry", p: { outfit: "robe", mascara: 1, cry: 1, emotion: "teary", armL: "handsOnHead", armR: "handsOnHead" } },
  { name: "cry side", p: { outfit: "robe", view: "side", mascara: 1, cry: 1, emotion: "teary" } },
  { name: "furious", p: { emotion: "furious", mouth: 0.5 } },
  { name: "furious side", p: { emotion: "furious", view: "side", mouth: 0.5 } },
  { name: "dress mascara", p: { mascara: 0.8, emotion: "teary", tear: 1 } },
  { name: "walk+lean", p: { walk: 1, lean: 0.8, view: "side" } },
];
const artyom: Item[] = [
  { name: "soot", p: { soot: 1 } },
  { name: "gasp", p: { emotion: "gasp", mouth: 0.2, soot: 0.6 } },
  { name: "gasp side", p: { emotion: "gasp", view: "side", mouth: 0.2 } },
  { name: "smoke cough", p: { smoke: 1, soot: 0.8 }},
  { name: "holdPhone", p: { armR: "holdPhone", light: "#8fd8ff" } },
  { name: "holdPhone side", p: { armR: "holdPhone", view: "side" } },
  { name: "throw", p: { armR: "throw", emotion: "rage" } },
  { name: "throw side", p: { armR: "throw", view: "side", emotion: "rage" } },
  { name: "grab", p: { armL: "grab", armR: "grab", emotion: "rage" } },
  { name: "grab side", p: { armR: "grab", view: "side", emotion: "rage" } },
  { name: "drink", p: { armR: "drinkBottle" } },
  { name: "drink side", p: { armR: "drinkBottle", view: "side" } },
  { name: "crouch", p: { crouch: 1, emotion: "worried" } },
  { name: "crouch side", p: { crouch: 1, view: "side", soot: 0.5 } },
  { name: "walk", p: { walk: 1.2, view: "side" } },
  { name: "lean -1/+1", p: { lean: 1, view: "side" } },
];

export const Chars2Root: React.FC = () => (
  <>
    <Still id="katya2" component={Sheet as React.FC<any>} width={1600} height={2 * 596} defaultProps={{ who: "katya", items: katya }} />
    <Still id="artyom2" component={Sheet as React.FC<any>} width={1600} height={4 * 596} defaultProps={{ who: "artyom", items: artyom }} />
  </>
);
