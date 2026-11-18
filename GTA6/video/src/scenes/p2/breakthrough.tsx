// Сцена p2/breakthrough «Прорыв»: [0, p2_space.start)
import React from "react";
import { SceneDef } from "../types";
import { cue } from "../../kit/anim";
import { PartBadge } from "../../kit/Overlays";
import { WallShot, WaveShot, MapShot, MapHud, OPEN_CUT1, OPEN_CUT2 } from "./breakthrough_open";
import { FlatWide, StripClose, DedShot, GamerShot, ReactShot, FLAT_START, CLOSE_IN, DED_IN, G2_IN, REACT_IN } from "./breakthrough_flat";
import { NewsClose, NewsWide, CordInsert, NewsGlitch, NewsGraphics, GlitchFx, NEWS_START, NEWS_CUT1, CORD_IN, CORD_OUT, NEWS_END } from "./breakthrough_news";

const badgeUntil = () => cue("p2", "p2_news1").start + 0.5;
const Badge = (t: number) => <PartBadge pid="p2" t={t} until={badgeUntil()} />;
const END = () => cue("p2", "p2_space").start;

export const SCENES: SceneDef[] = [
  { id: "p2_bt_wall", from: 0, to: OPEN_CUT1(), bg: "#a9cbe6", render3d: (t) => <WallShot t={t} />, overlay: (t) => Badge(t) },
  { id: "p2_bt_wave", from: OPEN_CUT1(), to: OPEN_CUT2(), bg: "#a9cbe6", render3d: (t) => <WaveShot t={t} />, overlay: (t) => Badge(t) },
  { id: "p2_bt_map", from: OPEN_CUT2(), to: NEWS_START(), bg: "#3d7fb8", render3d: (t) => <MapShot t={t} />, overlay: (t) => <>{Badge(t)}<MapHud t={t} /></> },
  { id: "p2_bt_news1", from: NEWS_START(), to: NEWS_CUT1(), bg: "#16244a", render3d: (t) => <NewsClose t={t} />, overlay: (t, c) => <><NewsGraphics t={t} censored={c} />{Badge(t)}</> },
  { id: "p2_bt_news2", from: NEWS_CUT1(), to: CORD_IN(), bg: "#16244a", render3d: (t) => <NewsWide t={t} />, overlay: (t, c) => <NewsGraphics t={t} censored={c} /> },
  { id: "p2_bt_cord", from: CORD_IN(), to: CORD_OUT(), bg: "#16244a", render3d: (t) => <CordInsert t={t} /> },
  { id: "p2_bt_glitch", from: CORD_OUT(), to: NEWS_END(), bg: "#16244a", render3d: (t) => <NewsGlitch t={t} />, overlay: (t, c) => <><NewsGraphics t={t} censored={c} glitch={1} /><GlitchFx t={t} /></> },
  { id: "p2_bt_flat", from: FLAT_START(), to: CLOSE_IN(), bg: "#c9b46b", render3d: (t) => <FlatWide t={t} /> },
  { id: "p2_bt_strips", from: CLOSE_IN(), to: DED_IN(), bg: "#c9b46b", render3d: (t) => <StripClose t={t} /> },
  { id: "p2_bt_ded", from: DED_IN(), to: G2_IN(), bg: "#c9b46b", render3d: (t) => <DedShot t={t} /> },
  { id: "p2_bt_gamer2", from: G2_IN(), to: REACT_IN(), bg: "#c9b46b", render3d: (t) => <GamerShot t={t} /> },
  { id: "p2_bt_react", from: REACT_IN(), to: END(), bg: "#c9b46b", render3d: (t) => <ReactShot t={t} /> },
];
