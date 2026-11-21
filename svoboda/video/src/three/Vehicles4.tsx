// Сцена 4: патрульная машина LSPD, пикап, мусорный бак, автомат, очки, граната, рука из бака. Плоские 2-ступенчатые материалы + контур, как в Cast.
import React from "react";
import * as THREE from "three";
import { Part, Flat, rbox, rcyl, sphereGeo, Shadow, planeGeo, circleGeo, extrude } from "./toon";
import { textTex } from "./Cast4";
import { D2R } from "./util";

const FONT = "'Arial Black','Impact','DejaVu Sans',sans-serif";
const lspdTex = () =>
  textTex("lspd_door", 256, 128, (g) => {
    g.fillStyle = "#f4f4f8";
    g.fillRect(0, 0, 256, 128);
    g.fillStyle = "#1b3fb8";
    g.textAlign = "center";
    g.textBaseline = "middle";
    g.font = `900 92px ${FONT}`;
    g.fillText("LSPD", 128, 68);
  });
const policeTex = () =>
  textTex("police_trunk", 256, 64, (g) => {
    g.fillStyle = "#f4f4f8";
    g.fillRect(0, 0, 256, 64);
    g.fillStyle = "#1b3fb8";
    g.textAlign = "center";
    g.textBaseline = "middle";
    g.font = `900 46px ${FONT}`;
    g.fillText("POLICE", 128, 34);
  });

const torusCache = new Map<string, THREE.TorusGeometry>();
const torus = (r: number, t: number) => {
  const k = `${r}_${t}`;
  if (!torusCache.has(k)) torusCache.set(k, new THREE.TorusGeometry(r, t, 8, 24));
  return torusCache.get(k)!;
};

// ---------- патрульная машина (нос по +x, борта по ±z) ----------
export interface PatrolProps {
  lights?: 0 | 1 | 2; // 0 выкл, 1 красный горит, 2 синий горит
  door?: number; // угол открытия двери водителя (борт -z), град
  crack?: number; // лобовое: 0 целое, 1 звезда-трещина, 2 вылетело
  charred?: boolean; // обгоревшая
  spin?: number;
  win?: 0 | 1; // 1 - стекло водителя опущено
}
const Wheel: React.FC<{ x: number; z: number; spin: number; dark: boolean }> = ({ x, z, spin, dark }) => (
  <group position={[x, 0.44, z]}>
    <group rotation={[Math.PI / 2, 0, 0]}>
      <Part geo={rcyl(0.44, 0.44, 0.3, 0.1)} color={dark ? "#1c1c22" : "#2a2a33"} px={3.4} />
    </group>
    {[1, -1].map((s) => (
      <group key={s} position={[0, 0, s * 0.153]} rotation={[0, 0, (spin * s * Math.PI) / 180]}>
        <Flat geo={circleGeo} color={dark ? "#5a5a66" : "#c9cfdc"} scale={0.26} double />
        <Flat geo={planeGeo} color="#4a5368" position={[0, 0, 0.004 * s]} scale={[0.06, 0.4, 1]} double />
        <Flat geo={planeGeo} color="#4a5368" position={[0, 0, 0.004 * s]} scale={[0.4, 0.06, 1]} double />
      </group>
    ))}
  </group>
);
export const PatrolCar: React.FC<PatrolProps> = ({ lights = 0, door = 0, crack = 0, charred = false, spin = 0, win = 0 }) => {
  const BODY = charred ? "#2c2c34" : "#2d3566";
  const WHITE = charred ? "#4b4b55" : "#f2f2f8";
  const GLASS = charred ? "#1d1d26" : "#9fd8f5";
  const DARK = "#1a1a24";
  const red = lights === 1 ? "#ff2b2b" : "#8a1620";
  const blue = lights === 2 ? "#2d7bff" : "#16318a";
  return (
    <group>
      <Shadow position={[0, 0.03, 0]} w={2.7} d={1.2} />
      {/* нижний кузов */}
      <Part geo={rbox(5.0, 0.62, 2.0, 0.2)} color={BODY} position={[0, 0.74, 0]} />
      {/* капот и багажник */}
      <Part geo={rbox(1.7, 0.14, 1.9, 0.07)} color={BODY} px={3.2} position={[1.5, 1.1, 0]} rotation={[0, 0, -0.05]} />
      <Part geo={rbox(1.2, 0.14, 1.9, 0.07)} color={BODY} px={3.2} position={[-1.95, 1.1, 0]} rotation={[0, 0, 0.04]} />
      {/* бамперы, кенгурятник */}
      <Part geo={rbox(0.26, 0.28, 2.05, 0.09)} color="#4a4f66" px={3} position={[2.5, 0.5, 0]} />
      <Part geo={rbox(0.26, 0.28, 2.05, 0.09)} color="#4a4f66" px={3} position={[-2.5, 0.5, 0]} />
      <Part geo={rbox(0.12, 0.46, 1.5, 0.04)} color={DARK} px={2.6} position={[2.66, 0.78, 0]} />
      {/* салон: белая крыша, тёмный салон, стойки, стёкла (win=1: стекло водителя опущено, борт -z) */}
      <Part geo={rbox(2.3, 0.1, 1.76, 0.07)} color={WHITE} px={3.2} position={[-0.25, 1.88, 0]} />
      <Part geo={rbox(2.3, 0.52, 1.78, 0.14)} color={win ? "#1d1f30" : BODY} px={3} position={[-0.25, 1.55, 0]} />
      {[1, -1].map((s) => (
        <group key={s}>
          {[0.95, -0.4, -1.4].map((px, i) => (
            <Part key={i} geo={rbox(0.14, 0.56, 0.12, 0.04)} color={BODY} px={2.6} position={[px, 1.55, s * 0.9]} />
          ))}
          {!(win && s < 0) && <Flat geo={planeGeo} color={GLASS} position={[0.3, 1.56, s * 0.9]} rotation={[0, s > 0 ? 0 : Math.PI, 0]} scale={[1.2, 0.4, 1]} double />}
          {!(win && s < 0) && <Flat geo={planeGeo} color={GLASS} position={[-0.9, 1.56, s * 0.9]} rotation={[0, s > 0 ? 0 : Math.PI, 0]} scale={[0.9, 0.4, 1]} double />}
        </group>
      ))}
      {/* лобовое и заднее */}
      <group position={[0.98, 1.5, 0]} rotation={[0, 0, -0.62]}>
        {crack < 2 && <Part geo={rbox(0.07, 0.62, 1.64, 0.03)} color={GLASS} px={3} />}
        {crack === 1 &&
          [0, 1, 2, 3, 4, 5].map((i) => (
            <Flat key={i} geo={planeGeo} color="#ffffff" position={[0.05, 0.05, 0.1]} rotation={[0, Math.PI / 2, (i * Math.PI) / 3 + 0.3]} scale={[0.04, 0.55 + (i % 2) * 0.25, 1]} double />
          ))}
        {crack === 2 &&
          [0, 1, 2, 3, 4, 5, 6].map((i) => (
            <Flat key={i} geo={planeGeo} color="#e8f6ff" position={[0.04, -0.28, -0.7 + i * 0.23]} rotation={[0, Math.PI / 2, i % 2 ? 0.3 : -0.3]} scale={[0.1, 0.26, 1]} double />
          ))}
      </group>
      <Part geo={rbox(0.07, 0.5, 1.6, 0.03)} color={GLASS} px={3} position={[-1.5, 1.52, 0]} rotation={[0, 0, 0.6]} />
      {/* двери: белые, задняя и передняя; передняя водителя (борт -z) открывается */}
      {[1, -1].map((s) => (
        <group key={s}>
          <Part geo={rbox(1.1, 0.6, 0.05, 0.05)} color={WHITE} px={2.8} position={[-0.95, 0.76, s * 1.012]} />
          {s > 0 && <Part geo={rbox(1.1, 0.6, 0.05, 0.05)} color={WHITE} px={2.8} position={[0.4, 0.76, 1.012]} />}
          <Flat geo={planeGeo} color={DARK} position={[-0.38, 0.76, s * 1.04]} rotation={[0, s > 0 ? 0 : Math.PI, 0]} scale={[0.03, 0.56, 1]} />
          <Flat geo={planeGeo} color="#6a6f88" position={[-0.65, 0.98, s * 1.045]} rotation={[0, s > 0 ? 0 : Math.PI, 0]} scale={[0.16, 0.04, 1]} />
        </group>
      ))}
      {/* надпись LSPD на дверях и звезда */}
      {[1, -1].map((s) => (
        <mesh key={s} geometry={planeGeo} position={[-0.95, 0.76, s * 1.045]} rotation={[0, s > 0 ? 0 : Math.PI, 0]} scale={[0.95, 0.4, 1]}>
          <meshBasicMaterial map={lspdTex()} toneMapped={false} />
        </mesh>
      ))}
      {door < 3 && (
        <>
          <Part geo={rbox(1.1, 0.6, 0.05, 0.05)} color={WHITE} px={2.8} position={[0.4, 0.76, -1.012]} />
          <mesh geometry={planeGeo} position={[0.4, 0.76, -1.045]} rotation={[0, Math.PI, 0]} scale={[0.95, 0.4, 1]}>
            <meshBasicMaterial map={lspdTex()} toneMapped={false} />
          </mesh>
        </>
      )}
      {door >= 3 && (
        <>
          {/* проём: тёмный салон и сиденье */}
          <Flat geo={planeGeo} color="#14131c" position={[0.4, 0.86, -0.96]} rotation={[0, Math.PI, 0]} scale={[1.05, 0.7, 1]} />
          <Part geo={rbox(0.5, 0.18, 0.7, 0.05)} color="#2a2a38" px={2.4} position={[0.1, 0.78, -0.55]} />
          <group position={[0.95, 0, -1.012]} rotation={[0, -door * D2R, 0]}>
            <Part geo={rbox(1.1, 0.6, 0.05, 0.05)} color={WHITE} px={2.8} position={[-0.55, 0.76, 0]} />
            <Flat geo={planeGeo} color={GLASS} position={[-0.55, 1.28, 0.0]} scale={[0.9, 0.4, 1]} double />
            <mesh geometry={planeGeo} position={[-0.55, 0.76, -0.034]} rotation={[0, Math.PI, 0]} scale={[0.95, 0.4, 1]}>
              <meshBasicMaterial map={lspdTex()} toneMapped={false} />
            </mesh>
          </group>
        </>
      )}
      <mesh geometry={planeGeo} position={[-2.53, 0.92, 0]} rotation={[0, -Math.PI / 2, 0]} scale={[1.3, 0.33, 1]}>
        <meshBasicMaterial map={policeTex()} toneMapped={false} />
      </mesh>
      {/* мигалка */}
      <Part geo={rbox(0.55, 0.08, 1.4, 0.03)} color={DARK} px={2.6} position={[-0.25, 1.98, 0]} />
      <Part geo={rbox(0.46, 0.2, 0.64, 0.06)} color={red} px={2.8} position={[-0.25, 2.1, 0.34]} />
      <Part geo={rbox(0.46, 0.2, 0.64, 0.06)} color={blue} px={2.8} position={[-0.25, 2.1, -0.34]} />
      {/* фары, стопы, решётка, зеркала */}
      {[1, -1].map((s) => (
        <group key={s}>
          <Flat geo={circleGeo} color={charred ? "#3a3a44" : "#fff6b8"} position={[2.502, 0.86, s * 0.7]} rotation={[0, Math.PI / 2, 0]} scale={[0.2, 0.12, 1]} double />
          <Flat geo={planeGeo} color={charred ? "#3a2a2a" : "#e0273a"} position={[-2.504, 0.86, s * 0.7]} rotation={[0, -Math.PI / 2, 0]} scale={[0.4, 0.14, 1]} double />
          <Part geo={rbox(0.2, 0.14, 0.12, 0.04)} color={DARK} px={2.4} position={[0.9, 1.28, s * 1.0]} />
        </group>
      ))}
      <Flat geo={planeGeo} color="#14131c" position={[2.504, 0.7, 0]} rotation={[0, Math.PI / 2, 0]} scale={[1.2, 0.18, 1]} double />
      <Wheel x={1.55} z={1.0} spin={spin} dark={charred} />
      <Wheel x={1.55} z={-1.0} spin={-spin} dark={charred} />
      <Wheel x={-1.6} z={1.0} spin={spin} dark={charred} />
      <Wheel x={-1.6} z={-1.0} spin={-spin} dark={charred} />
    </group>
  );
};

// ---------- пикап (нос по +x) ----------
export const Pickup: React.FC<{ dent?: number; spin?: number }> = ({ dent = 0, spin = 0 }) => {
  const BODY = "#e0652d";
  const RUST = "#a84a22";
  return (
    <group>
      <Shadow position={[0, 0.03, 0]} w={2.8} d={1.2} />
      <Part geo={rbox(5.2, 0.55, 2.0, 0.18)} color={BODY} position={[0, 0.82, 0]} />
      {/* кабина */}
      <Part geo={rbox(1.9, 0.78, 1.9, 0.2)} color={BODY} position={[0.95, 1.5, 0]} />
      <Part geo={rbox(0.07, 0.62, 1.6, 0.03)} color="#9fd8f5" px={3} position={[1.78, 1.5, 0]} rotation={[0, 0, -0.35]} />
      <Part geo={rbox(0.07, 0.5, 1.6, 0.03)} color="#9fd8f5" px={3} position={[0.12, 1.52, 0]} rotation={[0, 0, 0.3]} />
      {[1, -1].map((s) => (
        <group key={s}>
          <Flat geo={planeGeo} color="#9fd8f5" position={[0.95, 1.55, s * 0.96]} rotation={[0, s > 0 ? 0 : Math.PI, 0]} scale={[1.2, 0.46, 1]} double />
          <Flat geo={planeGeo} color={RUST} position={[0.2, 0.8, s * 1.015]} rotation={[0, s > 0 ? 0 : Math.PI, 0]} scale={[0.5, 0.2, 1]} />
          <Flat geo={circleGeo} color="#fff6b8" position={[2.62, 0.95, s * 0.65]} rotation={[0, Math.PI / 2, 0]} scale={[0.17, 0.17, 1]} double />
        </group>
      ))}
      {/* кузов-ящик */}
      <Part geo={rbox(2.3, 0.12, 1.9, 0.05)} color="#3a3d4c" px={3} position={[-1.35, 1.12, 0]} />
      {[1, -1].map((s) => (
        <Part key={s} geo={rbox(2.3, 0.5, 0.1, 0.04)} color={BODY} px={3.2} position={[-1.35, 1.4, s * 0.95]} />
      ))}
      <Part geo={rbox(0.1, 0.5, 1.9, 0.04)} color={BODY} px={3.2} position={[-2.45, 1.4, 0]} />
      <Part geo={rbox(0.1, 0.5, 1.9, 0.04)} color={RUST} px={3.2} position={[-0.2, 1.4, 0]} />
      {/* бампер, решётка */}
      <Part geo={rbox(0.26, 0.3, 2.05, 0.09)} color="#c9cfdc" px={3} position={[2.65, 0.6, 0]} />
      <Flat geo={planeGeo} color="#14131c" position={[2.62, 0.95, 0]} rotation={[0, Math.PI / 2, 0]} scale={[0.9, 0.22, 1]} double />
      {/* вмятина - таран: смятый перед */}
      {dent > 0 && <Part geo={rbox(0.4, 0.7, 1.6, 0.12)} color={RUST} px={3} position={[2.35 - dent * 0.2, 0.8, 0.2]} rotation={[0, 0.2, 0.15]} />}
      {[
        [1.7, 1.05],
        [1.7, -1.05],
        [-1.7, 1.05],
        [-1.7, -1.05],
      ].map(([x, z], i) => (
        <group key={i} position={[x, 0.5, z]}>
          <group rotation={[Math.PI / 2, 0, 0]}>
            <Part geo={rcyl(0.5, 0.5, 0.36, 0.12)} color="#2a2a33" px={3.4} />
          </group>
          <group position={[0, 0, Math.sign(z) * 0.185]} rotation={[0, 0, (spin * Math.sign(z) * Math.PI) / 180]}>
            <Flat geo={circleGeo} color="#c9cfdc" scale={0.28} double />
            <Flat geo={planeGeo} color="#4a5368" position={[0, 0, 0.004]} scale={[0.07, 0.44, 1]} double />
            <Flat geo={planeGeo} color="#4a5368" position={[0, 0, 0.004]} scale={[0.44, 0.07, 1]} double />
          </group>
        </group>
      ))}
    </group>
  );
};

// ---------- мусорный бак (контейнер): крышка на шарнире сзади ----------
export const Dumpster: React.FC<{ lid?: number; ajar?: boolean }> = ({ lid = 100, ajar }) => (
  <group>
    <Shadow position={[0, 0.03, 0]} w={1.4} d={0.9} />
    <Part geo={rbox(2.4, 1.3, 1.3, 0.1)} color="#2f8a52" position={[0, 0.85, 0]} />
    <Part geo={rbox(2.5, 0.14, 1.4, 0.05)} color="#1f5a36" px={3} position={[0, 1.48, 0]} />
    <Flat geo={planeGeo} color="#14181c" position={[0, 1.56, 0.0]} rotation={[-Math.PI / 2, 0, 0]} scale={[2.2, 1.1, 1]} />
    {/* рёбра и колёса */}
    {[-0.8, 0, 0.8].map((x) => (
      <Part key={x} geo={rbox(0.12, 1.1, 0.04, 0.02)} color="#1f5a36" px={2.4} position={[x, 0.82, 0.66]} />
    ))}
    {[-1, 1].map((s) => (
      <group key={s}>
        <Part geo={rcyl(0.14, 0.14, 0.12, 0.03, 14)} color="#1a1a22" px={2.6} position={[s * 0.95, 0.16, 0.45]} rotation={[0, 0, Math.PI / 2]} />
        <Part geo={rcyl(0.14, 0.14, 0.12, 0.03, 14)} color="#1a1a22" px={2.6} position={[s * 0.95, 0.16, -0.45]} rotation={[0, 0, Math.PI / 2]} />
      </group>
    ))}
    <mesh geometry={planeGeo} position={[0, 0.95, 0.665]} scale={[1.2, 0.35, 1]}>
      <meshBasicMaterial map={textTex("dump_txt", 256, 80, (g) => {
        g.fillStyle = "#2f8a52";
        g.fillRect(0, 0, 256, 80);
        g.fillStyle = "#e8ffe8";
        g.textAlign = "center";
        g.textBaseline = "middle";
        g.font = `900 58px ${FONT}`;
        g.fillText("LS WASTE", 128, 42);
      })} toneMapped={false} />
    </mesh>
    {/* крышка: шарнир сзади (z = -0.66), поворот вокруг x */}
    <group position={[0, 1.58, -0.7]} rotation={[-lid * D2R, 0, 0]}>
      <Part geo={rbox(2.5, 0.1, 1.46, 0.04)} color="#1f5a36" px={3.2} position={[0, 0.04, 0.73]} />
      <Part geo={rbox(0.8, 0.08, 0.12, 0.03)} color="#14181c" px={2.4} position={[0, 0.12, 1.3]} />
    </group>
    {/* мусор сверху */}
    {!ajar && lid > 20 && (
      <>
        <Part geo={sphereGeo(10)} color="#1a1a22" px={2.4} position={[-0.6, 1.62, 0.1]} scale={[0.34, 0.26, 0.3]} />
        <Part geo={sphereGeo(10)} color="#e8e0b8" px={2.4} position={[0.5, 1.64, -0.1]} scale={[0.28, 0.22, 0.26]} />
      </>
    )}
  </group>
);

// ---------- автомат с газировкой ----------
export const Vending: React.FC = () => (
  <group>
    <Shadow position={[0, 0.03, 0.1]} w={0.8} d={0.5} />
    <Part geo={rbox(1.3, 2.5, 1.0, 0.1)} color="#d6283a" position={[0, 1.25, 0]} />
    <Part geo={rbox(1.36, 0.22, 1.06, 0.06)} color="#a31a2a" px={3} position={[0, 2.5, 0]} />
    <Flat geo={planeGeo} color="#bfe8ff" position={[-0.14, 1.55, 0.505]} scale={[0.82, 1.3, 1]} />
    {[0, 1, 2].map((r) =>
      [0, 1, 2].map((c) => (
        <Flat key={`${r}${c}`} geo={planeGeo} color={["#ff8a1c", "#2fbf4e", "#7a3cff", "#ffd23a"][(r * 3 + c) % 4]} position={[-0.38 + c * 0.24, 1.98 - r * 0.38, 0.51]} scale={[0.14, 0.26, 1]} />
      ))
    )}
    <Flat geo={planeGeo} color="#1a1a24" position={[0.45, 1.5, 0.505]} scale={[0.26, 0.8, 1]} />
    <Flat geo={planeGeo} color="#ffd23a" position={[0.45, 1.75, 0.51]} scale={[0.14, 0.08, 1]} />
    <Flat geo={planeGeo} color="#1a1a24" position={[0, 0.42, 0.505]} scale={[0.8, 0.3, 1]} />
  </group>
);

// ---------- мелочи ----------
/** Очки-авиаторы на земле (Маркуса) */
export const GlassesProp: React.FC<{ crack?: boolean }> = ({ crack = true }) => (
  <group scale={1.3}>
    {[1, -1].map((s) => (
      <group key={s} position={[s * 0.14, 0.04, 0]}>
        <Part geo={sphereGeo(14)} color="#e8b820" px={3} scale={[0.13, 0.03, 0.115]} />
        <Part geo={sphereGeo(14)} color="#2a2350" px={0} position={[0, 0.02, 0]} scale={[0.1, 0.03, 0.09]} />
        {crack && s === -1 && <Flat geo={planeGeo} color="#ffffff" position={[0, 0.056, 0]} rotation={[-Math.PI / 2, 0, 0.8]} scale={[0.16, 0.012, 1]} />}
      </group>
    ))}
    <Part geo={rbox(0.12, 0.02, 0.025, 0.008)} color="#e8b820" px={2} position={[0, 0.06, 0]} />
    <Part geo={rbox(0.025, 0.02, 0.26, 0.008)} color="#e8b820" px={2} position={[0.3, 0.05, -0.1]} rotation={[0, 0.4, 0]} />
    <Part geo={rbox(0.025, 0.02, 0.26, 0.008)} color="#e8b820" px={2} position={[-0.3, 0.05, -0.1]} rotation={[0, -0.4, 0]} />
  </group>
);
/** Граната спецназа */
export const Grenade: React.FC = () => (
  <group>
    <Part geo={sphereGeo(14)} color="#4a6a3a" px={3.2} scale={[0.22, 0.26, 0.22]} />
    <Part geo={rbox(0.1, 0.1, 0.1, 0.03)} color="#1a1a22" px={2.4} position={[0, 0.27, 0]} />
    <Part geo={torus(0.08, 0.016)} color="#c9cfdc" px={2} position={[0.1, 0.34, 0]} />
  </group>
);
/** Рука Хлои торчит из бака: рукав худи, кулак, горящий плакат (пламя рисуется снаружи) */
export const HandOut: React.FC = () => (
  <group>
    <Part geo={rcyl(0.17, 0.2, 0.9, 0.05)} color="#28d8f2" position={[0, 0.4, 0]} />
    <Part geo={rcyl(0.22, 0.22, 0.12, 0.03)} color="#12a3c0" px={2.6} position={[0, 0.86, 0]} />
    <Part geo={rbox(0.27, 0.3, 0.24, 0.1)} color="#f6d4c6" px={3} position={[0, 1.08, 0]} />
    <Part geo={rcyl(0.04, 0.04, 0.9, 0.01, 10)} color="#9a6a3a" px={2.8} position={[0, 1.4, 0]} />
    <Part geo={rbox(0.9, 0.62, 0.06, 0.02)} color="#2a2018" px={3.2} position={[0, 2.0, 0]} />
  </group>
);
void extrude;
