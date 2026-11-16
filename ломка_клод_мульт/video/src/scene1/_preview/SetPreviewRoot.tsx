import React from "react";
import { AbsoluteFill, Composition, useCurrentFrame } from "remotion";
import { Kitchen } from "../set";
import type { KitchenView } from "../set";

const Wrap: React.FC<{ view: KitchenView; px: number; py: number; melt: number }> = ({ view, px, py, melt }) => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{ overflow: "hidden", background: "#000" }}>
      <Kitchen frame={frame} view={view} parallax={{ x: px, y: py }} melt={melt} dropFrame={60} />
    </AbsoluteFill>
  );
};

const mk = (id: string, p: { view: KitchenView; px: number; py: number; melt: number }) => (
  <Composition key={id} id={id} component={Wrap} durationInFrames={200} fps={24} width={1080} height={1920} defaultProps={p} />
);

export const PreviewRoot: React.FC = () => (
  <>
    {mk("Wide", { view: "wide", px: 0, py: 0, melt: 0.5 })}
    {mk("WideP", { view: "wide", px: 1, py: 0.5, melt: 0.5 })}
    {mk("Table", { view: "table", px: 0, py: 0, melt: 0.5 })}
    {mk("Back", { view: "backWall", px: 0, py: 0, melt: 0.5 })}
  </>
);
