import React from "react";
import { Html5Audio, staticFile } from "remotion";
import timing from "./timing.json";
import { Scene4 } from "./Scene4";

export const Scene4WithAudio: React.FC = () => (
  <>
    <Scene4 />
    <Html5Audio src={staticFile(timing.master)} />
  </>
);
