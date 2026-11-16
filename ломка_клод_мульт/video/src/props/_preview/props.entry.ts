import React from "react";
import { Composition, registerRoot, useCurrentFrame } from "remotion";
import * as P from "../index";

const h = React.createElement;
const bg = (c: string, ...kids: React.ReactNode[]) =>
  h("div", { style: { width: 1080, height: 1920, background: c, position: "relative", overflow: "hidden" } }, ...kids);
const mk = (id: string, Comp: React.FC<{ f: number }>, w = 1080, hgt = 1920, d = 200) =>
  h(Composition, {
    id, durationInFrames: d, fps: 24, width: w, height: hgt,
    component: (() => { const f = useCurrentFrame(); return h(Comp, { f }); }) as React.FC,
  });

const Root: React.FC = () =>
  h(
    React.Fragment,
    null,
    mk("Smoke", ({ f }) => bg("#8a5a3c", h(P.Smoke, { frame: f, density: Math.min(1, f / 120) }))),
    mk("Stove", ({ f }) => bg("#5e3a27", h("div", { style: { position: "absolute", left: 240, top: 800 } }, h(P.StoveFire, { frame: f, startFrame: 10 }), h(P.WineSplash, { frame: f, startFrame: 80 })))),
    mk("Door", ({ f }) => h(P.BathroomDoor, { frame: f, slamFrame: 30, latchFrame: 150, waterOn: f > 40 })),
    mk("DoorSide", ({ f }) => h(P.BathroomDoor, { frame: f, view: "side", slamFrame: 30, waterOn: true })),
    mk("Wolf", ({ f }) => h(P.WolfAI, { frame: f, startFrame: 5, errorFrame: 170 })),
    mk("Flight", ({ f }) => bg("#8a5a3c", h(P.PhoneFlight, { frame: f, startFrame: 10 })), 1080, 1920, 90),
    mk("LockF", ({ f }) => h(P.LockScreen, { frame: f, startFrame: 0, mode: "faceid" })),
    mk("LockP", ({ f }) => bg("#222", h(P.LockScreen, { frame: f, startFrame: 0, mode: "passcode" })), 1080, 1920, 220),
    mk("Chat", ({ f }) => h(P.KatyaChat, { frame: f, startFrame: 5 })),
    mk("Timers", ({ f }) => bg("#2a1c14", h(P.Timers, { frame: f })), 1080, 700),
    mk("Mess", ({ f }) => h("div", { style: { width: 1080, height: 1920, position: "relative", overflow: "hidden" } }, h(P.KitchenMess, { frame: f, view: "table", smokeAmount: 0.6 }))),
    mk("MessW", ({ f }) => h("div", { style: { width: 1080, height: 1920, position: "relative", overflow: "hidden" } }, h(P.KitchenMess, { frame: f, view: "wide", smokeAmount: 0.3 }))),
  );
registerRoot(Root);
