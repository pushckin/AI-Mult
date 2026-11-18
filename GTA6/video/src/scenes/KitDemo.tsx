// Демонстрация кита: линейка персонажей (для проверки стиля). Не используется в финале.
import React from "react";
import { Character } from "../kit/Character";
import { Cam, PaperLights, Sheet, Crowd, crowdGrid } from "../kit/Stage";
import { mouthFor } from "../kit/anim";

const crowd = crowdGrid(160, -6, 6, -9, -3, 3);
export const KitDemo: React.FC<{ t: number }> = ({ t }) => {
  const m = 0.3 + 0.5 * Math.abs(Math.sin(t * 9));
  return (
    <>
      <Cam pos={[0, 2.2, 11]} look={[0, 1.2, 0]} fov={42} />
      <PaperLights />
      <Sheet w={40} h={30} color="#9cc6e8" position={[0, 8, -12]} />
      <Sheet w={40} h={30} color="#e9e4d6" position={[0, 0, -2]} rotation={[-Math.PI / 2, 0, 0]} />
      <Crowd members={crowd} t={t} />
      <Character position={[-1.6, 0, 1]} outfit="suit" hat="combover" hairColor="#8a8a8a" tie="#b71c1c" eyes="wide" mouth="scream" mouthOpen={m} sweat={1} armL={2.2} armR={2.0} />
      <Character position={[-0.5, 0, 1]} outfit="uniform" hat="militaryCap" medals mustache hairColor="#3b2a1a" eyes="angry" mouth="talk" mouthOpen={m} armR={1.2} />
      <Character position={[0.6, 0, 1]} outfit="flannel" hat="strawHat" eyes="sad" mouth="frown" tears={1} />
      <Character position={[1.7, 0, 1]} outfit="hoodie" hat="messyHair" ears missingEar blood={0.8} eyes="crazy" mouth="grin" />
      <Character position={[-1.1, 0, 2.2]} scale={0.9} outfit="tactical" hat="balaclava" hatColor="#111" eyes="angry" />
      <Character position={[0.0, 0, 2.2]} scale={0.9} outfit="camo" hat="helmet" hatColor="#4b5320" glasses="shades" mouth="scream" mouthOpen={0.9} />
      <Character position={[1.1, 0, 2.2]} scale={0.9} outfit="cardigan" hat="baldGray" hairColor="#ddd" glasses="round" eyes="wide" mouth="o" beard={false} />
    </>
  );
};

// Запасная сцена на всю длину части (показывается там, где ещё нет готовых сцен)
import type { SceneDef } from "./types";
import { part, PartId } from "../kit/anim";
export const DEMO = (pid: PartId): SceneDef[] => [{ id: "demo_" + pid, from: 0, to: part(pid).duration + 1, bg: "#9cc6e8", render3d: (t) => <KitDemo t={t} /> }];
