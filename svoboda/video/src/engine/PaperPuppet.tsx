import React from "react";
import { useAssets } from "./assets";
import { Sprite } from "./Sprite";
import type { Pose } from "./types";
import { RIGS, Rig, RigPart } from "../data/rigs";

const D2R = Math.PI / 180;

/**
 * Бумажная кукла: жёсткие части, каждая вращается вокруг своего шарнира.
 * Только позиция/угол/вариант рта - никакой деформации. Реальные PNG берутся из manifest
 * (ключи `${char}_${part}`), при отсутствии - заглушки; сигнатура не меняется.
 */
export const PaperPuppet: React.FC<{ char: string; pose: Pose; order?: number }> = ({ char, pose, order = 0 }) => {
  const assets = useAssets();
  const rig: Rig = RIGS[char];
  if (!rig) return null;

  const byId = new Map(rig.parts.map((p) => [p.id, p]));
  const keyOf = (p: RigPart) => (p.kind === "mouth" ? `${char}_mouth_${pose.mouth}` : `${char}_${p.id}`);
  const attachOf = (p: RigPart): [number, number] => assets.get(`${char}_${p.id}`)?.attach ?? p.attach;
  const jointAngle = (p: RigPart) => (p.joint === "none" ? 0 : pose[p.joint]);

  const render = (parent: string | undefined): React.ReactNode =>
    rig.parts
      .filter((p) => p.parent === parent)
      .map((p) => {
        const key = keyOf(p);
        if (p.kind === "tick" && !pose.tick) return null;
        if (!assets.has(key)) return null;
        const pa = p.parent ? attachOf(byId.get(p.parent)!) : [0, 0];
        const at = attachOf(p);
        let ang = jointAngle(p);
        let dx = 0;
        let dy = 0;
        if (p.id === "head") {
          dx = pose.headDx;
          dy = pose.headDy;
        }
        if (p.id === "cup" && pose.cupUpright) {
          // компенсируем вращение родительской цепочки: тело + торс + рука
          ang = -(pose.rot + pose.torso + pose.armR);
        }
        // сумма «вперёд = +» для конечностей: в локальном (не отражённом) пространстве CCW+ у висящей вниз конечности уводит в +x
        return (
          <group key={p.id} position={[at[0] - pa[0] + dx, at[1] - pa[1] + dy, 0]} rotation={[0, 0, ang * D2R]}>
            <Sprite
              assetKey={key}
              h={p.h * 1}
              order={order + p.z}
              opacity={pose.opacity}
              dissolve={pose.dissolve}
              tint={pose.tint}
              seed={pose.seed + p.z}
            />
            {render(p.id)}
          </group>
        );
      });

  const [cx, cy] = rig.center;
  return (
    <group position={[pose.x, pose.y, 0]} scale={[(pose.flip ? -1 : 1) * pose.scale, pose.scale, 1]}>
      <group position={[cx, cy, 0]} rotation={[0, 0, pose.rot * D2R]}>
        <group position={[-cx, -cy, 0]}>{render(undefined)}</group>
      </group>
    </group>
  );
};
