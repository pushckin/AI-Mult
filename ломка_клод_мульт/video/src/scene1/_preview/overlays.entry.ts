import React from "react";
import { Composition, registerRoot, useCurrentFrame } from "remotion";
import { PhoneScreen, UsageLimit } from "../overlays";

const P: React.FC = () => {
  const f = useCurrentFrame();
  return React.createElement(PhoneScreen, { frame: f, startFrame: 10, sendFrame: 200 });
};
const U: React.FC = () => {
  const f = useCurrentFrame();
  return React.createElement(
    "div",
    { style: { width: 1080, height: 1920, background: "#17141a", position: "relative" } },
    React.createElement(PhoneScreen, { frame: 100, startFrame: 10, sendFrame: 200 }),
    React.createElement("div", { style: { position: "absolute", top: 500, left: 0 } }, React.createElement(UsageLimit, { frame: f, startFrame: 2 })),
    React.createElement("div", { style: { position: "absolute", top: 1320, left: 0 } }, React.createElement(UsageLimit, { frame: f, startFrame: 2, compact: true })),
  );
};
const Root: React.FC = () =>
  React.createElement(
    React.Fragment,
    null,
    React.createElement(Composition, { id: "P", component: P, durationInFrames: 300, fps: 24, width: 1080, height: 1920 }),
    React.createElement(Composition, { id: "U", component: U, durationInFrames: 60, fps: 24, width: 1080, height: 1920 }),
  );
registerRoot(Root);
