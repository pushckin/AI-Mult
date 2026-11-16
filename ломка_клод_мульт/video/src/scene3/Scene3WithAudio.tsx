import React from "react";
import { Html5Audio, staticFile } from "remotion";
import timing from "./timing.json";
import { Scene3 } from "./Scene3";

export const Scene3WithAudio: React.FC = () => (
  <>
    <Scene3 />
    <Html5Audio src={staticFile(timing.master)} />
  </>
);
