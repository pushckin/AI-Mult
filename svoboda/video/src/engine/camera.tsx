import React, { useMemo } from "react";
import * as THREE from "three";
import { useThree } from "@react-three/fiber";
import { hash, hold, lerp, easeIn, easeInOut, easeOut } from "./motion";

export const FOV = 20; // узкая перспектива: почти «ортографика», но с честным параллаксом
export const VIEW_H = 1080;
export const VIEW_W = 1920;
export const CAM_Z = VIEW_H / 2 / Math.tan((FOV * Math.PI) / 360); // дистанция, при которой плоскость z=0 = 1080 px

export interface CamState {
  /** Центр кадра в авторских координатах плоскости z=0 */
  x: number;
  y: number;
  /** 1 = кадр 1920x1080. >1 = наезд (камера физически ближе - параллакс усиливается) */
  zoom: number;
  /** Крен, градусы */
  roll: number;
}

export type Ease = "linear" | "in" | "out" | "inout" | "cut";
export interface CamKey extends Partial<CamState> {
  f: number;
  /** Как идти К СЛЕДУЮЩЕМУ ключу. cut = держать и скакнуть (монтажная склейка) */
  ease?: Ease;
}
const EASES: Record<Exclude<Ease, "cut">, (t: number) => number> = { linear: (t) => t, in: easeIn, out: easeOut, inout: easeInOut };

const BASE: CamState = { x: 0, y: 0, zoom: 1, roll: 0 };

/** Сэмплирует ключи камеры. Недостающие поля наследуются от предыдущего ключа. */
export const sampleCamera = (frame: number, keys: CamKey[]): CamState => {
  let state = { ...BASE };
  const resolved: Array<CamKey & CamState> = keys.map((k) => {
    state = { ...state, ...Object.fromEntries(Object.entries(k).filter(([n, v]) => n !== "f" && n !== "ease" && v !== undefined)) } as CamState;
    return { ...k, ...state };
  });
  if (frame <= resolved[0].f) return pick(resolved[0]);
  for (let i = 1; i < resolved.length; i++) {
    const a = resolved[i - 1];
    const b = resolved[i];
    if (frame < b.f) {
      if (a.ease === "cut") return pick(a);
      const t = EASES[a.ease ?? "linear"]((frame - a.f) / (b.f - a.f));
      return { x: lerp(a.x, b.x, t), y: lerp(a.y, b.y, t), zoom: lerp(a.zoom, b.zoom, t), roll: lerp(a.roll, b.roll, t) };
    }
  }
  return pick(resolved[resolved.length - 1]);
};
const pick = (k: CamState): CamState => ({ x: k.x, y: k.y, zoom: k.zoom, roll: k.roll });

/** Ручная тряска (handheld) на двойках: рваная, не плавная. */
export const shake = (frame: number, amp: number, seed = 1, rollAmp = 0.25): Partial<CamState> => {
  const n = Math.floor(hold(frame) / 2);
  return { x: (hash(n, seed) * 2 - 1) * amp, y: (hash(n, seed + 7) * 2 - 1) * amp, roll: (hash(n, seed + 13) * 2 - 1) * rollAmp };
};
/** Затухающая тряска от удара. */
export const impactShake = (frame: number, hit: number, amp: number, dur = 18, seed = 3): Partial<CamState> => {
  const d = frame - hit;
  if (d < 0 || d > dur) return {};
  const k = Math.pow(1 - d / dur, 1.5);
  const s = shake(frame, amp * k, seed, amp * k * 0.05);
  return s;
};
/** Складывает смещения тряски с состоянием камеры. */
export const addShake = (s: CamState, ...sh: Array<Partial<CamState> | undefined>): CamState => {
  const out = { ...s };
  for (const p of sh) {
    if (!p) continue;
    out.x += p.x ?? 0;
    out.y += p.y ?? 0;
    out.roll += p.roll ?? 0;
    out.zoom += p.zoom ?? 0;
  }
  return out;
};

/** Масштаб слоя на глубине d (чтобы авторские размеры совпадали с экранными при покое). */
export const depthScale = (depth: number) => (CAM_Z + depth) / CAM_Z;
/** Центр камеры, при котором объект на глубине depth в авторской точке (x,y) оказывается в центре кадра. */
export const focusOn = (x: number, y: number, depth = 0): { x: number; y: number } => ({ x: x * depthScale(depth), y: y * depthScale(depth) });

/** Ставит камеру. Рисуем поверх: бумажное зерно и мигалки привязаны к камере. */
export const SceneCamera: React.FC<{ state: CamState; flash?: { color: string; opacity: number }; grain?: boolean }> = ({ state, flash, grain = true }) => {
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  const z = CAM_Z / state.zoom;
  camera.position.set(state.x, state.y, z);
  camera.rotation.set(0, 0, (state.roll * Math.PI) / 180);
  camera.near = 10;
  camera.far = 400000;
  camera.updateProjectionMatrix();

  const grainTex = useMemo(() => makeGrain(), []);
  // оверлей на расстоянии D от камеры, размером с кадр (+запас на крен)
  const D = 900;
  const vh = 2 * D * Math.tan((FOV * Math.PI) / 360) * 1.12;
  const vw = vh * (VIEW_W / VIEW_H);
  const rz = (state.roll * Math.PI) / 180;
  return (
    <group position={[state.x, state.y, z - D]} rotation={[0, 0, rz]}>
      {grain && (
        <mesh renderOrder={10000} scale={[vw, vh, 1]}>
          <planeGeometry args={[1, 1]} />
          <meshBasicMaterial map={grainTex} transparent depthTest={false} depthWrite={false} toneMapped={false} />
        </mesh>
      )}
      {flash && flash.opacity > 0 && (
        <mesh renderOrder={10001} scale={[vw, vh, 1]}>
          <planeGeometry args={[1, 1]} />
          <meshBasicMaterial color={flash.color} transparent opacity={flash.opacity} depthTest={false} depthWrite={false} toneMapped={false} />
        </mesh>
      )}
    </group>
  );
};

/** Процедурное «бумажное» зерно: мелкие пятна и волокна, низкая непрозрачность. */
const makeGrain = () => {
  const S = 1024;
  const c = document.createElement("canvas");
  c.width = S;
  c.height = S * (VIEW_H / VIEW_W);
  const g = c.getContext("2d")!;
  g.clearRect(0, 0, c.width, c.height);
  let seed = 12345;
  const r = () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
  };
  for (let i = 0; i < 9000; i++) {
    const light = r() > 0.5;
    g.fillStyle = light ? `rgba(255,248,230,${0.03 + r() * 0.06})` : `rgba(10,5,20,${0.03 + r() * 0.07})`;
    const s = 1 + r() * 2.2;
    g.fillRect(r() * c.width, r() * c.height, s, s);
  }
  g.lineWidth = 1;
  for (let i = 0; i < 900; i++) {
    g.strokeStyle = r() > 0.5 ? "rgba(255,245,225,0.05)" : "rgba(10,5,20,0.05)";
    const x = r() * c.width;
    const y = r() * c.height;
    g.beginPath();
    g.moveTo(x, y);
    g.lineTo(x + (r() - 0.5) * 26, y + (r() - 0.5) * 26);
    g.stroke();
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
};

/** DepthGroup: ставит детей на глубину, сохраняя авторские размеры (параллакс). */
export const DepthGroup: React.FC<{ depth: number; children: React.ReactNode }> = ({ depth, children }) => {
  const s = depthScale(depth);
  return (
    <group position={[0, 0, -depth]} scale={[s, s, 1]}>
      {children}
    </group>
  );
};
