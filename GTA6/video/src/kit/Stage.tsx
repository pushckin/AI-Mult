// Сценическая обвязка: камера, свет, задники, толпа, надписи-текстуры.
import React, { useLayoutEffect, useMemo } from "react";
import * as THREE from "three";
import { useThree } from "@react-three/fiber";
import { canvasTex, glow, paper, geo, FONT, rng } from "./paper";

/** Камера под управлением кадра: позиция, точка взгляда, fov, крен. */
export const Cam: React.FC<{ pos: [number, number, number]; look: [number, number, number]; fov?: number; roll?: number }> = ({ pos, look, fov = 40, roll = 0 }) => {
  const { camera } = useThree();
  useLayoutEffect(() => {
    const c = camera as THREE.PerspectiveCamera;
    c.position.set(pos[0], pos[1], pos[2]);
    c.up.set(Math.sin(roll), Math.cos(roll), 0);
    c.lookAt(look[0], look[1], look[2]);
    if (c.fov !== fov) { c.fov = fov; c.updateProjectionMatrix(); }
    c.near = 0.05; c.far = 500; c.updateProjectionMatrix();
  });
  return null;
};

/** Мягкий «студийный» свет для бумажного мира */
export const PaperLights: React.FC<{ intensity?: number; tint?: string; dir?: [number, number, number] }> = ({ intensity = 1, tint = "#ffffff", dir = [3, 6, 8] }) => (
  <>
    <ambientLight intensity={1.25 * intensity} color={tint} />
    <hemisphereLight args={["#ffffff", "#8a7f70", 0.55 * intensity]} />
    <directionalLight position={dir} intensity={1.35 * intensity} color={tint} />
  </>
);

/** Плоский бумажный лист (задник/пол/стена). Зерно масштабируется под размер листа. */
export const Sheet: React.FC<{ w: number; h: number; color: string; position?: [number, number, number]; rotation?: [number, number, number]; glowing?: boolean; opacity?: number }> = ({ w, h, color, position, rotation, glowing, opacity = 1 }) => {
  const g = useMemo(() => {
    const pg = new THREE.PlaneGeometry(w, h);
    const uv = pg.attributes.uv as THREE.BufferAttribute;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * w * 0.8, uv.getY(i) * h * 0.8);
    return pg;
  }, [w, h]);
  return <mesh position={position} rotation={rotation} geometry={g} material={glowing ? glow(color, opacity) : paper(color, { opacity })} />;
};

/** Плоскость с канвас-текстурой (табло, экраны, вывески, рисованные задники) */
export const CanvasPlane: React.FC<{ texKey: string; w: number; h: number; px?: number; draw: (g: CanvasRenderingContext2D, W: number, H: number) => void; position?: [number, number, number]; rotation?: [number, number, number]; glowing?: boolean; opacity?: number; transparent?: boolean }> = ({ texKey, w, h, px = 512, draw, position, rotation, glowing = true, opacity = 1, transparent = false }) => {
  const W = px, H = Math.max(2, Math.round((px * h) / w));
  const tex = canvasTex(texKey, W, H, draw);
  const mat = useMemo(() => glowing
    ? new THREE.MeshBasicMaterial({ map: tex, toneMapped: false, transparent: transparent || opacity < 1, opacity })
    : new THREE.MeshStandardMaterial({ map: tex, roughness: 0.95, transparent: transparent || opacity < 1, opacity }), [tex, glowing, opacity, transparent]);
  return (
    <mesh position={position} rotation={rotation} material={mat}>
      <planeGeometry args={[w, h]} />
    </mesh>
  );
};

/** Текстовая табличка (кэшируется по тексту) */
export function drawText(g: CanvasRenderingContext2D, W: number, H: number, text: string, opts: { bg?: string; fg?: string; size?: number; weight?: number; stroke?: string } = {}) {
  if (opts.bg) { g.fillStyle = opts.bg; g.fillRect(0, 0, W, H); } else g.clearRect(0, 0, W, H);
  const lines = text.split("\n");
  const size = opts.size ?? Math.floor(H / (lines.length * 1.25));
  g.font = `${opts.weight ?? 900} ${size}px ${FONT}`;
  g.textAlign = "center"; g.textBaseline = "middle";
  lines.forEach((ln, i) => {
    const y = H / 2 + (i - (lines.length - 1) / 2) * size * 1.15;
    if (opts.stroke) { g.lineWidth = size * 0.14; g.strokeStyle = opts.stroke; g.lineJoin = "round"; g.strokeText(ln, W / 2, y); }
    g.fillStyle = opts.fg ?? "#111"; g.fillText(ln, W / 2, y);
  });
}

// ---------- ТОЛПА: инстансы бумажных человечков с атласа ----------
const ATLAS_N = 8; // 8x8 вариантов
function drawCrowdAtlas(g: CanvasRenderingContext2D, W: number) {
  const cell = W / ATLAS_N;
  const r = rng(42);
  const skins = ["#f6d1a8", "#e8b98f", "#c68b59", "#8d5a3b", "#f3c9a0", "#d9a37a"];
  const shirts = ["#c0392b", "#2c3e50", "#27ae60", "#8e44ad", "#f39c12", "#16a085", "#7f8c8d", "#d35400", "#2980b9", "#34495e", "#6d4c41", "#1e272e"];
  const hairs = ["#2b1b10", "#4a2f1b", "#111", "#c9a227", "#7a4a24", "#555"];
  g.clearRect(0, 0, W, W);
  for (let i = 0; i < ATLAS_N * ATLAS_N; i++) {
    const cx = (i % ATLAS_N) * cell + cell / 2, cy = Math.floor(i / ATLAS_N) * cell;
    const u = cell / 100;
    const skin = skins[Math.floor(r() * skins.length)], shirt = shirts[Math.floor(r() * shirts.length)];
    // что примотано к спине: PS5 / Xbox / телевизор / системник
    const gear = Math.floor(r() * 5);
    g.save(); g.translate(cx, cy);
    if (gear === 0) { g.fillStyle = "#f2f2f2"; g.fillRect(-14 * u, 18 * u, 28 * u, 44 * u); g.fillStyle = "#111"; g.fillRect(-4 * u, 18 * u, 8 * u, 44 * u); }
    else if (gear === 1) { g.fillStyle = "#1b1b1b"; g.fillRect(-16 * u, 22 * u, 32 * u, 36 * u); g.fillStyle = "#3cb043"; g.beginPath(); g.arc(0, 30 * u, 3 * u, 0, 7); g.fill(); }
    else if (gear === 2) { g.fillStyle = "#222"; g.fillRect(-30 * u, 16 * u, 60 * u, 38 * u); g.fillStyle = "#3b4b6b"; g.fillRect(-27 * u, 19 * u, 54 * u, 32 * u); }
    else if (gear === 3) { g.fillStyle = "#2d2d2d"; g.fillRect(-18 * u, 14 * u, 36 * u, 50 * u); g.fillStyle = "#ff2fd0"; g.fillRect(-15 * u, 18 * u, 3 * u, 40 * u); g.fillStyle = "#00e5ff"; g.fillRect(12 * u, 18 * u, 3 * u, 40 * u); }
    // скотч
    g.fillStyle = "rgba(200,170,90,0.95)"; g.fillRect(-26 * u, 50 * u, 52 * u, 6 * u);
    // туловище
    g.fillStyle = shirt; g.beginPath(); g.moveTo(-26 * u, 98 * u); g.lineTo(26 * u, 98 * u); g.lineTo(21 * u, 58 * u); g.lineTo(-21 * u, 58 * u); g.closePath(); g.fill();
    // руки вверх (у части)
    if (r() < 0.55) {
      g.strokeStyle = shirt; g.lineWidth = 9 * u; g.lineCap = "round";
      const up = r() < 0.5;
      g.beginPath(); g.moveTo(-20 * u, 62 * u); g.lineTo(-34 * u, up ? 30 * u : 52 * u); g.stroke();
      g.beginPath(); g.moveTo(20 * u, 62 * u); g.lineTo(34 * u, up ? 30 * u : 52 * u); g.stroke();
      g.fillStyle = skin; g.beginPath(); g.arc(-34 * u, up ? 28 * u : 50 * u, 6 * u, 0, 7); g.arc(34 * u, up ? 28 * u : 50 * u, 6 * u, 0, 7); g.fill();
      if (r() < 0.35) { g.fillStyle = "#222"; g.fillRect(28 * u, (up ? 18 : 42) * u, 14 * u, 8 * u); } // геймпад
    }
    // голова
    g.fillStyle = skin; g.beginPath(); g.ellipse(0, 40 * u, 24 * u, 21 * u, 0, 0, 7); g.fill();
    // волосы / шапка
    const hc = hairs[Math.floor(r() * hairs.length)];
    const ht = Math.floor(r() * 4);
    g.fillStyle = ht === 3 ? shirts[Math.floor(r() * shirts.length)] : hc;
    g.beginPath(); g.ellipse(0, 34 * u, 24 * u, ht === 3 ? 17 * u : 13 * u, 0, Math.PI, 0); g.fill();
    // глаза — бешеные
    for (const s of [-1, 1]) {
      g.fillStyle = "#fbfbf6"; g.beginPath(); g.ellipse(s * 6.5 * u, 40 * u, 7 * u, 8 * u, 0, 0, 7); g.fill();
      g.fillStyle = "#111"; g.beginPath(); g.arc(s * 6.5 * u + (r() - 0.5) * 4 * u, 41 * u, 2 * u, 0, 7); g.fill();
    }
    // рот — орёт
    g.fillStyle = "#3a0b0b"; g.beginPath(); g.ellipse(0, 52 * u, 6 * u, 3 + r() * 5 * u, 0, 0, 7); g.fill();
    g.restore();
  }
}

export interface CrowdMember { x: number; z: number; s?: number; variant?: number; phase?: number; y?: number; rot?: number; hidden?: boolean }

/** Толпа из плоских человечков. members — позиции; t — время для подпрыгивания (на двойках). */
export const Crowd: React.FC<{ members: CrowdMember[]; t: number; bounce?: number; size?: number; tint?: string }> = ({ members, t, bounce = 0.06, size = 1.1, tint }) => {
  const tex = canvasTex("crowdAtlas", 1024, 1024, (g, W) => drawCrowdAtlas(g, W));
  const geometry = useMemo(() => {
    const g = new THREE.PlaneGeometry(size, size);
    g.translate(0, size / 2, 0);
    return g;
  }, [size]);
  const material = useMemo(() => {
    const m = new THREE.MeshStandardMaterial({ map: tex, transparent: false, alphaTest: 0.5, roughness: 1, side: THREE.DoubleSide, color: tint ? new THREE.Color(tint) : undefined });
    m.onBeforeCompile = (sh) => {
      sh.vertexShader = sh.vertexShader
        .replace("#include <common>", "#include <common>\nattribute float aVar;")
        .replace("#include <uv_vertex>", `#include <uv_vertex>\n  vMapUv = (uv + vec2(mod(aVar, ${ATLAS_N}.0), ${ATLAS_N - 1}.0 - floor(aVar / ${ATLAS_N}.0))) / ${ATLAS_N}.0;`);
    };
    return m;
  }, [tex, tint]);
  const mesh = useMemo(() => {
    const m = new THREE.InstancedMesh(geometry, material, Math.max(1, members.length));
    const vars = new Float32Array(Math.max(1, members.length));
    members.forEach((mb, i) => (vars[i] = mb.variant ?? Math.floor(((i * 7919) % 64))));
    geometry.setAttribute("aVar", new THREE.InstancedBufferAttribute(vars, 1));
    m.frustumCulled = false;
    return m;
  }, [geometry, material, members.length]);
  const tq = Math.floor(t * 12) / 12;
  const dummy = useMemo(() => new THREE.Object3D(), []);
  members.forEach((mb, i) => {
    const ph = mb.phase ?? i * 1.37;
    const b = Math.abs(Math.sin(tq * 9 + ph)) * bounce;
    dummy.position.set(mb.x, (mb.y ?? 0) + b, mb.z);
    dummy.rotation.set(0, 0, mb.rot ?? 0);
    const sc = mb.hidden ? 0.0001 : (mb.s ?? 1);
    dummy.scale.set(sc, sc, sc);
    dummy.updateMatrix();
    mesh.setMatrixAt(i, dummy.matrix);
  });
  mesh.instanceMatrix.needsUpdate = true;
  return <primitive object={mesh} />;
};

/** Генератор позиций толпы на прямоугольнике */
export function crowdGrid(n: number, x0: number, x1: number, z0: number, z1: number, seed = 1): CrowdMember[] {
  const r = rng(seed);
  const out: CrowdMember[] = [];
  for (let i = 0; i < n; i++) out.push({ x: x0 + r() * (x1 - x0), z: z0 + r() * (z1 - z0), s: 0.85 + r() * 0.3, variant: Math.floor(r() * 64), phase: r() * 10 });
  out.sort((a, b) => a.z - b.z);
  return out;
}

/** Облачко/дым из бумажных кругов */
export const Puff: React.FC<{ position: [number, number, number]; scale?: number; color?: string; opacity?: number }> = ({ position, scale = 1, color = "#d9d9d9", opacity = 1 }) => (
  <group position={position} scale={scale}>
    {[[0, 0, 0.5], [0.45, 0.1, 0.38], [-0.45, 0.05, 0.4], [0.15, 0.35, 0.36], [-0.2, 0.3, 0.32]].map(([x, y, r], i) => (
      <mesh key={i} position={[x, y, i * 0.01]} geometry={geo.ellipse(r, r * 0.9, 0.02)} material={paper(color, { opacity })} />
    ))}
  </group>
);
