import React from "react";
import { Html5Audio, staticFile } from "remotion";
import timing from "./timing.json";
import { Scene5 } from "./Scene5";

export const Scene5WithAudio: React.FC = () => (
  <>
    <Scene5 />
    <Html5Audio src={staticFile(timing.master)} />
  </>
);
