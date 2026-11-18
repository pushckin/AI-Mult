// Лист персонажей (для согласования внешности). Композиции Cast1/Cast2 — только для стоп-кадров.
import React from "react";
import { ThreeCanvas } from "@remotion/three";
import { AbsoluteFill, useVideoConfig } from "remotion";
import * as THREE from "three";
import { Character, CharacterProps } from "../kit/Character";
import { CAST } from "../kit/cast";
import { Cam, PaperLights, Sheet } from "../kit/Stage";
import { FONT } from "../kit/paper";

type Entry = { name: string; look: Partial<CharacterProps> };
const SHEETS: Record<string, Entry[]> = {
  Cast1: [
    { name: "Премьер-министр", look: { ...CAST.pm, eyes: "wide", mouth: "scream", mouthOpen: 0.8, sweat: 1, armL: 2.4, armR: 2.4 } },
    { name: "Министр обороны", look: { ...CAST.defense, eyes: "angry", mouth: "talk", mouthOpen: 0.5 } },
    { name: "Министр сельского хоз-ва", look: { ...CAST.agri, eyes: "sad", mouth: "wavy", tears: 1 } },
    { name: "Командир", look: { ...CAST.commander, mouth: "scream", mouthOpen: 0.9, armR: 1.4 } },
    { name: "Спецназ", look: { ...CAST.swat } },
    { name: "Геймер", look: { ...CAST.gamer, eyes: "crazy", mouth: "grin" } },
  ],
  Cast2: [
    { name: "Диктор", look: { ...CAST.anchor, mouth: "smile" } },
    { name: "Папа", look: { ...CAST.dad, eyes: "wide", mouth: "o" } },
    { name: "Мама", look: { ...CAST.mom, mouth: "frown", eyes: "angry" } },
    { name: "Сын", look: { ...CAST.kid, mouth: "o", eyes: "wide" } },
    { name: "Дед", look: { ...CAST.grandpa, eyes: "angry", mouth: "talk", mouthOpen: 0.6 } },
    { name: "Геймер с HDMI", look: { ...CAST.gamer2, mouth: "smile", eyes: "squint" } },
    { name: "Инженер", look: { ...CAST.engineer, eyes: "wide", mouth: "wavy", sweat: 1 } },
  ],
};

export const CastSheet: React.FC<{ sheet: "Cast1" | "Cast2" }> = ({ sheet }) => {
  const { width, height } = useVideoConfig();
  const list = SHEETS[sheet];
  const cols = 3, rows = Math.ceil(list.length / cols);
  const cell = (i: number) => ({ x: ((i % cols) - (cols - 1) / 2) * 1.55, y: (rows - 1 - Math.floor(i / cols)) * 2.35 - 0.2 });
  const camY = ((rows - 1) * 2.35) / 2 + 0.6;
  return (
    <AbsoluteFill style={{ background: "#cfe3f2" }}>
      <ThreeCanvas width={width} height={height} gl={{ antialias: true, toneMapping: THREE.NoToneMapping }} camera={{ position: [0, 2, 10], fov: 40 }}>
        <color attach="background" args={["#cfe3f2"]} />
        <Cam pos={[0, camY - 0.3, 13.2 + (rows - 2) * 5.2]} look={[0, camY - 0.3, 0]} fov={36} />
        <PaperLights />
        <Sheet w={30} h={30} color="#cfe3f2" position={[0, camY, -1]} />
        {list.map((e, i) => {
          const c = cell(i);
          return (
            <group key={i}>
              <Sheet w={1.4} h={0.06} color="#9b8f7a" position={[c.x, c.y - 0.02, -0.2]} />
              <Character {...e.look} position={[c.x, c.y, 0]} scale={(e.look.scale ?? 1) * 1.0} />
            </group>
          );
        })}
      </ThreeCanvas>
      <AbsoluteFill>
        <div style={{ position: "absolute", top: 60, width: "100%", textAlign: "center", fontFamily: FONT, fontWeight: 900, fontSize: 64, color: "#111" }}>ПЕРСОНАЖИ · {sheet === "Cast1" ? "ЧАСТЬ 1" : "ЧАСТЬ 2"}</div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
