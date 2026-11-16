import React from "react";
import { Html5Audio, staticFile } from "remotion";
import timing from "./timing.json";
import { Scene1 } from "./Scene1";

export const Scene1WithAudio: React.FC = () => (
  <>
    <Scene1 />
    <Html5Audio src={staticFile(timing.master)} />
  </>
);
