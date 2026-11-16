import React from "react";
import { Html5Audio, staticFile } from "remotion";
import timing from "./timing.json";
import { Scene2 } from "./Scene2";

export const Scene2WithAudio: React.FC = () => (
  <>
    <Scene2 />
    <Html5Audio src={staticFile(timing.master)} />
  </>
);
