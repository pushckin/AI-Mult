import React, { useEffect, useMemo } from "react";
import * as THREE from "three";
import { CameraRig, Character3D, CoderDesk3D } from "../components3d/Character3D";
import { makeSignTexture } from "../components3d/SignTexture";
import { CUES, mouthOf } from "../data/timeline";

type ScreenMode = "chat" | "code_drop" | "answer" | "rust" | "limit";

const clamp = (v: number, lo = 0, hi = 1) => Math.max(lo, Math.min(hi, v));
const lerp = (a: number, b: number, p: number) => a + (b - a) * clamp(p, 0, 1);
const seg = (t: number, a: number, b: number) => clamp((t - a) / Math.max(0.0001, b - a));
const ease = (p: number) => (p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2);
const easeIn = (p: number) => Math.pow(clamp(p), 2.2);

/** Deterministic ocean fiber-optic cable curve from USA data center exit (z=-15) to Mumbai shore (z=-73). */
function cablePoint(z: number): [number, number, number] {
  const u = clamp((-z - 15) / 58, 0, 1);
  const x = Math.sin(u * Math.PI * 2.5) * 1.45 * Math.sin(u * Math.PI);
  const arch = Math.sin(u * Math.PI);
  const y = lerp(-0.05, 0.05, u) - arch * 0.75 + Math.sin(u * Math.PI * 5) * 0.14 * arch;
  return [x, y, z];
}

// ============================================================================
// CODER ROOM ENVIRONMENT (Scenes A, D, F)
// ============================================================================

const NightCityWindow3D: React.FC<{
  position: [number, number, number];
  rotation?: [number, number, number];
}> = ({ position, rotation = [0, 0, 0] }) => {
  const buildings = useMemo(
    () => [
      { x: -0.62, w: 0.25, h: 0.76, color: "#0f172a" },
      { x: -0.32, w: 0.29, h: 1.02, color: "#111827" },
      { x: 0.02, w: 0.27, h: 0.86, color: "#0f172a" },
      { x: 0.34, w: 0.3, h: 1.08, color: "#1e1b4b" },
      { x: 0.62, w: 0.24, h: 0.7, color: "#0f172a" },
    ],
    [],
  );

  return (
    <group position={position} rotation={rotation}>
      {/* Night Sky Backdrop */}
      <mesh position={[0, 0, 0.01]}>
        <planeGeometry args={[1.68, 1.42]} />
        <meshBasicMaterial color="#050919" />
      </mesh>
      {/* Glowing Moon */}
      <mesh position={[-0.5, 0.46, 0.02]}>
        <circleGeometry args={[0.12, 20]} />
        <meshBasicMaterial color="#fef08a" />
      </mesh>
      {/* Deterministic Stars */}
      {[
        [-0.22, 0.54],
        [0.14, 0.5],
        [0.48, 0.56],
        [-0.64, 0.28],
        [0.62, 0.36],
      ].map(([sx, sy], i) => (
        <mesh key={i} position={[sx, sy, 0.02]}>
          <circleGeometry args={[0.018, 8]} />
          <meshBasicMaterial color="#e0f2fe" />
        </mesh>
      ))}
      {/* City Skyscrapers + Lit Windows */}
      {buildings.map((b, bi) => (
        <group key={bi} position={[b.x, -0.71 + b.h / 2, 0.03]}>
          <mesh>
            <planeGeometry args={[b.w, b.h]} />
            <meshBasicMaterial color={b.color} />
          </mesh>
          {[0, 1, 2, 3].map((row) =>
            [-0.06, 0.06].map((wx, wi) => {
              const lit = (bi + row * 2 + wi) % 3 !== 0;
              if (!lit) return null;
              return (
                <mesh
                  key={`${row}-${wi}`}
                  position={[wx, b.h / 2 - 0.15 - row * 0.16, 0.01]}
                >
                  <planeGeometry args={[0.058, 0.08]} />
                  <meshBasicMaterial color={(bi + row) % 2 === 0 ? "#fde047" : "#38bdf8"} />
                </mesh>
              );
            }),
          )}
        </group>
      ))}
      {/* Glass Glare */}
      <mesh position={[0, 0, 0.05]}>
        <planeGeometry args={[1.68, 1.42]} />
        <meshStandardMaterial color="#38bdf8" transparent opacity={0.08} roughness={0.15} />
      </mesh>
      {/* Window Outer Frame & Mullion */}
      <mesh position={[0, 0.75, 0.06]}>
        <boxGeometry args={[1.84, 0.1, 0.12]} />
        <meshStandardMaterial color="#1e293b" roughness={0.5} />
      </mesh>
      <mesh position={[0, -0.75, 0.06]}>
        <boxGeometry args={[1.9, 0.12, 0.18]} />
        <meshStandardMaterial color="#1e293b" roughness={0.5} />
      </mesh>
      <mesh position={[-0.87, 0, 0.06]}>
        <boxGeometry args={[0.1, 1.6, 0.12]} />
        <meshStandardMaterial color="#1e293b" roughness={0.5} />
      </mesh>
      <mesh position={[0.87, 0, 0.06]}>
        <boxGeometry args={[0.1, 1.6, 0.12]} />
        <meshStandardMaterial color="#1e293b" roughness={0.5} />
      </mesh>
      <mesh position={[0, 0, 0.06]}>
        <boxGeometry args={[0.06, 1.44, 0.08]} />
        <meshStandardMaterial color="#0f172a" roughness={0.5} />
      </mesh>
    </group>
  );
};

const CoderRoomScene3D: React.FC<{
  t: number;
  screenMode: ScreenMode;
  coderProps: {
    pose: "sit_chill" | "sit_type" | "panic";
    mood: "neutral" | "scream" | "smile" | "frown";
    eyes?: "normal" | "red" | "wide" | "dead";
    brow?: number;
    headTurn?: number;
    headTilt?: number;
    lookX?: number;
    lookY?: number;
    holdSmoothie?: boolean;
    mouthOpen: number;
  };
  cam: {
    pos: [number, number, number];
    lookAt: [number, number, number];
    fov: number;
    shake?: number;
  };
  portalFlash?: number;
}> = ({ t, screenMode, coderProps, cam, portalFlash = 0 }) => {
  const posterTex = useMemo(
    () => makeSignTexture(["AI = FUTURE"], "#090d1e", "#38bdf8", "#818cf8", 512, 192, 62),
    [],
  );

  useEffect(() => {
    return () => {
      posterTex.dispose();
    };
  }, [posterTex]);

  // Dynamic lighting driven by monitor screenMode
  const isLimit = screenMode === "limit";
  const redPulse = isLimit ? 0.5 + 0.5 * Math.sin(t * 10) : 0;

  let screenGlowColor = "#6366f1";
  let screenGlowIntensity = 2.2;
  let rgbPrimary = "#818cf8";
  let rgbAccent = "#22d3ee";

  if (screenMode === "code_drop") {
    screenGlowColor = "#38bdf8";
    screenGlowIntensity = 2.8;
    rgbPrimary = "#6366f1";
    rgbAccent = "#38bdf8";
  } else if (screenMode === "answer") {
    screenGlowColor = "#22c55e";
    screenGlowIntensity = 3.4;
    rgbPrimary = "#22c55e";
    rgbAccent = "#38bdf8";
  } else if (screenMode === "rust") {
    screenGlowColor = "#f97316";
    screenGlowIntensity = 3.6;
    rgbPrimary = "#f97316";
    rgbAccent = "#fb923c";
  } else if (screenMode === "limit") {
    screenGlowColor = "#ef4444";
    screenGlowIntensity = 3.2 + redPulse * 3.8;
    rgbPrimary = "#ef4444";
    rgbAccent = "#dc2626";
  }

  return (
    <>
      <color attach="background" args={[isLimit ? "#1a070b" : "#0b1020"]} />
      <CameraRig
        pos={cam.pos}
        lookAt={cam.lookAt}
        fov={cam.fov}
        shake={cam.shake ?? 0}
        t={t}
      />

      {/* Base Studio Lighting so coder silhouette & expressions read clearly */}
      <ambientLight
        intensity={isLimit ? 0.45 + redPulse * 0.2 : 0.72}
        color={isLimit ? "#fca5a5" : "#93c5fd"}
      />
      <directionalLight
        position={[-2.5, 4.2, 2.8]}
        intensity={isLimit ? 0.55 : 0.95}
        color={isLimit ? "#fecaca" : "#e0e7ff"}
        castShadow
      />
      <directionalLight position={[2.2, 3.0, 2.0]} intensity={0.4} color="#a5b4fc" />

      {/* Screen Glow Illuminating Coder & Desk */}
      <pointLight
        position={[0, 1.32, 0.2]}
        color={screenGlowColor}
        intensity={screenGlowIntensity}
        distance={6.5}
      />
      {/* Ambient Room Wash for Red Limit Alert or RGB Atmosphere */}
      <pointLight
        position={[-0.6, 2.15, 0.75]}
        color={isLimit ? "#ef4444" : rgbPrimary}
        intensity={isLimit ? 1.8 + redPulse * 2.8 : 0.85}
        distance={9}
      />
      <pointLight position={[1.8, 1.85, -1.2]} color={rgbAccent} intensity={1.2} distance={6.5} />

      {/* Floor & Stylish Rug */}
      <mesh position={[0, -0.02, 0.5]} receiveShadow>
        <boxGeometry args={[12, 0.04, 10]} />
        <meshStandardMaterial color="#0f172a" roughness={0.75} />
      </mesh>
      <mesh position={[0, 0.005, 0.28]} receiveShadow>
        <boxGeometry args={[2.6, 0.01, 2.3]} />
        <meshStandardMaterial color="#1e1b4b" roughness={0.85} />
      </mesh>
      <mesh position={[0, 0.008, 0.28]}>
        <boxGeometry args={[2.64, 0.006, 2.34]} />
        <meshStandardMaterial color={rgbPrimary} emissive={rgbPrimary} emissiveIntensity={0.45} />
      </mesh>

      {/* Walls (#0b1020 dark room, wide enough for -X camera angles) */}
      <mesh position={[0, 2.25, -1.65]} receiveShadow>
        <planeGeometry args={[12, 4.8]} />
        <meshStandardMaterial color="#0b1020" roughness={0.8} />
      </mesh>
      <mesh position={[-3.8, 2.25, 0.8]} rotation={[0, Math.PI / 2, 0]} receiveShadow>
        <planeGeometry args={[8, 4.8]} />
        <meshStandardMaterial color="#090e1c" roughness={0.85} />
      </mesh>
      <mesh position={[3.8, 2.25, 0.8]} rotation={[0, -Math.PI / 2, 0]} receiveShadow>
        <planeGeometry args={[8, 4.8]} />
        <meshStandardMaterial color="#0b1020" roughness={0.8} />
      </mesh>
      <mesh position={[0, 4.4, 0.8]} rotation={[Math.PI / 2, 0, 0]}>
        <planeGeometry args={[12, 8]} />
        <meshStandardMaterial color="#070a14" roughness={0.9} />
      </mesh>

      {/* Glowing RGB LED Strips on Back & Right Walls */}
      <mesh position={[0, 0.84, -1.61]}>
        <boxGeometry args={[7.4, 0.045, 0.03]} />
        <meshStandardMaterial color={rgbPrimary} emissive={rgbPrimary} emissiveIntensity={2.0} />
      </mesh>
      <mesh position={[3.76, 0.84, 0.1]} rotation={[0, -Math.PI / 2, 0]}>
        <boxGeometry args={[3.4, 0.045, 0.03]} />
        <meshStandardMaterial color={rgbAccent} emissive={rgbAccent} emissiveIntensity={1.9} />
      </mesh>
      {/* Geometric RGB Accent Bars on Back Wall */}
      {[-1.55, 1.85].map((rx, idx) => (
        <mesh key={idx} position={[rx, 1.95, -1.61]}>
          <boxGeometry args={[0.045, 1.75, 0.03]} />
          <meshStandardMaterial
            color={idx === 0 ? rgbAccent : rgbPrimary}
            emissive={idx === 0 ? rgbAccent : rgbPrimary}
            emissiveIntensity={2.1}
          />
        </mesh>
      ))}
      <mesh position={[0.15, 2.82, -1.61]}>
        <boxGeometry args={[3.44, 0.045, 0.03]} />
        <meshStandardMaterial color={rgbAccent} emissive={rgbAccent} emissiveIntensity={1.8} />
      </mesh>
      {/* Right Wall RGB Accent Strip above Window */}
      <mesh position={[3.76, 2.86, -0.95]} rotation={[0, -Math.PI / 2, 0]}>
        <boxGeometry args={[2.1, 0.045, 0.03]} />
        <meshStandardMaterial color={rgbPrimary} emissive={rgbPrimary} emissiveIntensity={2.0} />
      </mesh>

      {/* Night City Window on Right Wall (clearly visible behind coder from -X 3/4 view) */}
      <NightCityWindow3D position={[3.76, 1.92, -0.95]} rotation={[0, -Math.PI / 2, 0]} />

      {/* Poster "AI = FUTURE" on Back Wall (visible in both -X 3/4 and over-shoulder shots) */}
      <group position={[0.85, 2.08, -1.61]}>
        <mesh position={[0, 0, -0.015]}>
          <boxGeometry args={[1.22, 0.5, 0.03]} />
          <meshStandardMaterial color="#1e1b4b" emissive={rgbPrimary} emissiveIntensity={0.45} />
        </mesh>
        <mesh position={[0, 0, 0.01]}>
          <planeGeometry args={[1.14, 0.43]} />
          <meshBasicMaterial map={posterTex} />
        </mesh>
      </group>

      {/* Coder Desk & Monitor */}
      <CoderDesk3D position={[0, 0, 0]} screenMode={screenMode} t={t} />

      {/* Coder Character sitting at Desk */}
      <Character3D
        position={[0, 0, 0.58]}
        yaw={Math.PI}
        skinColor="#f5c99b"
        hair="headphones"
        hairColor="#1f2937"
        shirtColor="#6366f1"
        pantsColor="#1e293b"
        eyes={coderProps.eyes ?? "normal"}
        brow={coderProps.brow ?? 0}
        mood={coderProps.mood}
        mouthOpen={coderProps.mouthOpen}
        headTurn={coderProps.headTurn ?? 0}
        headTilt={coderProps.headTilt ?? 0}
        lookX={coderProps.lookX ?? 0}
        lookY={coderProps.lookY ?? 0}
        pose={coderProps.pose}
        holdSmoothie={coderProps.holdSmoothie ?? false}
        seated
        t={t}
        seed={1}
      />

      {/* Screen Dive Transition Glow at end of Scene A (aligned with CoderDesk3D screen at y=1.30, z=-0.19) */}
      {portalFlash > 0.01 && (
        <mesh position={[0, 1.3, -0.185]}>
          <planeGeometry args={[1.12, 0.5]} />
          <meshBasicMaterial color="#e0f2fe" transparent opacity={portalFlash} />
        </mesh>
      )}
    </>
  );
};

// ============================================================================
// SCENE B: CALIFORNIA -> EMPTY DATA CENTER -> OCEAN CABLE -> MUMBAI
// ============================================================================

const PalmTree3D: React.FC<{
  position: [number, number, number];
  lean?: number;
  scale?: number;
}> = ({ position, lean = 0.06, scale = 1 }) => {
  const segments = [0, 1, 2, 3, 4];
  const frondAngles = [0, 1.05, 2.1, 3.14, 4.19, 5.24];

  return (
    <group position={position} scale={scale}>
      {/* Segmented Cylindrical Trunk */}
      {segments.map((s) => (
        <mesh
          key={s}
          position={[s * lean * 0.45, 0.42 + s * 0.78, 0]}
          rotation={[0, 0, -lean * (0.6 + s * 0.25)]}
          castShadow
        >
          <cylinderGeometry args={[0.16 - s * 0.018, 0.2 - s * 0.018, 0.85, 10]} />
          <meshStandardMaterial color={s % 2 === 0 ? "#854d0e" : "#713f12"} roughness={0.85} />
        </mesh>
      ))}

      {/* Crown made of Green Spheres + Coconuts */}
      <group position={[segments.length * lean * 0.45, 4.15, 0]}>
        <mesh scale={[0.52, 0.4, 0.52]} castShadow>
          <sphereGeometry args={[1, 14, 12]} />
          <meshStandardMaterial color="#16a34a" roughness={0.7} />
        </mesh>
        {frondAngles.map((ang, idx) => (
          <group key={idx} rotation={[0, ang, 0]}>
            <mesh position={[0.72, 0.08, 0]} rotation={[0, 0, -0.22]} scale={[0.85, 0.2, 0.34]} castShadow>
              <sphereGeometry args={[1, 12, 10]} />
              <meshStandardMaterial color={idx % 2 === 0 ? "#22c55e" : "#15803d"} roughness={0.72} />
            </mesh>
            <mesh position={[1.38, -0.18, 0]} rotation={[0, 0, -0.55]} scale={[0.52, 0.14, 0.24]}>
              <sphereGeometry args={[1, 10, 8]} />
              <meshStandardMaterial color="#4ade80" roughness={0.75} />
            </mesh>
          </group>
        ))}
        {/* Coconuts */}
        {[0, 2.1, 4.2].map((ca, ci) => (
          <mesh key={ci} position={[Math.cos(ca) * 0.24, -0.22, Math.sin(ca) * 0.24]}>
            <sphereGeometry args={[0.14, 10, 8]} />
            <meshStandardMaterial color="#78350f" roughness={0.8} />
          </mesh>
        ))}
      </group>
    </group>
  );
};

const FlyoverScene3D: React.FC<{ t: number }> = ({ t }) => {
  const usaSignTex = useMemo(
    () =>
      makeSignTexture(
        ["ANTHROPIC", "DATA CENTER • USA"],
        "#081226",
        "#38bdf8",
        "#0ea5e9",
        768,
        256,
        50,
      ),
    [],
  );

  const redirectSignTex = useMemo(
    () =>
      makeSignTexture(
        ["ПЕРЕАДРЕСАЦИЯ", "➔ INDIA"],
        "#facc15",
        "#111827",
        "#dc2626",
        768,
        288,
        54,
      ),
    [],
  );

  const indiaSignTex = useMemo(
    () =>
      makeSignTexture(
        ["SERVER RACK", "INDIA-4"],
        "#fef3c7",
        "#1c1917",
        "#78350f",
        640,
        224,
        52,
      ),
    [],
  );

  // Dual glowing fiber-optic cable geometries (blue & orange) from USA router to Mumbai shore
  const { blueTubeGeo, orangeTubeGeo } = useMemo(() => {
    const bluePts: THREE.Vector3[] = [];
    const orangePts: THREE.Vector3[] = [];
    const steps = 80;
    for (let i = 0; i <= steps; i++) {
      const z = lerp(-15, -73, i / steps);
      const [cx, cy, cz] = cablePoint(z);
      const twist = (i / steps) * Math.PI * 10;
      bluePts.push(new THREE.Vector3(cx + Math.cos(twist) * 0.08, cy + Math.sin(twist) * 0.06, cz));
      orangePts.push(new THREE.Vector3(cx - Math.cos(twist) * 0.08, cy - Math.sin(twist) * 0.06, cz));
    }
    const blueCurve = new THREE.CatmullRomCurve3(bluePts);
    const orangeCurve = new THREE.CatmullRomCurve3(orangePts);
    return {
      blueTubeGeo: new THREE.TubeGeometry(blueCurve, 96, 0.055, 8, false),
      orangeTubeGeo: new THREE.TubeGeometry(orangeCurve, 96, 0.055, 8, false),
    };
  }, []);

  useEffect(() => {
    return () => {
      usaSignTex.dispose();
      redirectSignTex.dispose();
      indiaSignTex.dispose();
      blueTubeGeo.dispose();
      orangeTubeGeo.dispose();
    };
  }, [usaSignTex, redirectSignTex, indiaSignTex, blueTubeGeo, orangeTubeGeo]);

  // Camera Choreography for Scene B (12.05 .. 17.75)
  let camPos: [number, number, number] = [0.45, 3.2, 13.5];
  let camLook: [number, number, number] = [0, 2.55, -1.5];
  let camFov = 48;

  if (t < 13.35) {
    // Sunny California Exterior -> Swoop through glass sliding doors
    const p = ease(seg(t, 12.05, 13.35));
    camPos = [lerp(0.45, 0, p), lerp(3.2, 1.62, p), lerp(13.5, -2.8, p)];
    camLook = [0, lerp(2.55, 1.32, p), lerp(-1.5, -8.8, p)];
    camFov = lerp(48, 50, p);
  } else if (t < 14.35) {
    // Huge Empty Hall reveal -> Cheap stool, blinking router, giant redirect sign
    const p = ease(seg(t, 13.35, 14.35));
    camPos = [lerp(0, 0.25, p), lerp(1.62, 1.54, p), lerp(-2.8, -4.4, p)];
    camLook = [0, lerp(1.32, 1.15, p), lerp(-8.8, -9.2, p)];
    camFov = 50;
  } else if (t < 14.85) {
    // Dive down behind the router wire out over the ocean
    const p = easeIn(seg(t, 14.35, 14.85));
    camPos = [lerp(0.25, 0.45, p), lerp(1.54, 0.72, p), lerp(-4.4, -15.2, p)];
    camLook = [0, lerp(1.15, 0.15, p), lerp(-9.2, -21.0, p)];
    camFov = lerp(50, 56, p);
  } else if (t < 16.5) {
    // High-speed chase along glowing blue-orange fiber cable over dark ocean
    const p = seg(t, 14.85, 16.5);
    const zCam = lerp(-15.2, -67.0, p);
    const [cx, cy] = cablePoint(zCam);
    const [ax, ay] = cablePoint(zCam - 8.5);
    camPos = [cx + Math.sin(p * Math.PI) * 0.75, cy + 1.32, zCam];
    camLook = [ax, ay + 0.35, zCam - 8.5];
    camFov = 56;
  } else if (t < 17.25) {
    // Arrival on dusty Mumbai beach facing shabby building + crooked taped sign
    const p = ease(seg(t, 16.5, 17.25));
    const [cx, cy] = cablePoint(-67.0);
    camPos = [lerp(cx, 0.15, p), lerp(cy + 1.32, 1.6, p), lerp(-67.0, -75.0, p)];
    camLook = [0, lerp(0.5, 1.72, p), lerp(-76.0, -81.0, p)];
    camFov = lerp(56, 48, p);
  } else {
    // Slam straight through the open door of SERVER RACK INDIA-4
    const p = easeIn(seg(t, 17.25, 17.75));
    camPos = [lerp(0.15, 0, p), lerp(1.6, 1.35, p), lerp(-75.0, -83.8, p)];
    camLook = [0, 1.35, lerp(-81.0, -88.5, p)];
    camFov = lerp(48, 54, p);
  }

  // Sky color shifts cleanly with geographical leg
  let skyColor = "#38bdf8";
  if (t >= 14.65 && t < 16.4) {
    const p = ease(seg(t, 14.65, 15.1));
    skyColor = p < 0.5 ? "#0284c7" : "#082f49";
  } else if (t >= 16.4) {
    const p = ease(seg(t, 16.4, 16.85));
    skyColor = p < 0.5 ? "#57534e" : "#b48a5a";
  }

  const doorSlide = ease(seg(t, 12.55, 13.15)) * 1.25;
  const ledOn = Math.sin(t * 20) > 0;
  const packetIndices = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13];

  return (
    <>
      <color attach="background" args={[skyColor]} />
      <fog attach="fog" args={[skyColor, 24, 65]} />
      <CameraRig pos={camPos} lookAt={camLook} fov={camFov} shake={t >= 14.85 && t < 16.5 ? 0.35 : 0} t={t} />

      <ambientLight intensity={t >= 14.85 && t < 16.5 ? 0.78 : 0.95} color={t >= 16.5 ? "#fde68a" : "#e0f2fe"} />
      <directionalLight
        position={[10, 18, 12]}
        intensity={t >= 14.85 && t < 16.5 ? 1.15 : 1.75}
        color={t >= 16.5 ? "#fed7aa" : "#fffbeb"}
        castShadow
      />

      {/* ================================================================= */}
      {/* 1. SUNNY CALIFORNIA EXTERIOR & EMPTY DATA CENTER HALL             */}
      {/* ================================================================= */}
      <group>
        {/* Sunny California Lawn & Plaza */}
        <mesh position={[0, -0.15, 6]} receiveShadow>
          <boxGeometry args={[26, 0.3, 18]} />
          <meshStandardMaterial color="#86efac" roughness={0.9} />
        </mesh>
        <mesh position={[0, 0.01, 4.5]} receiveShadow>
          <boxGeometry args={[6.2, 0.04, 13]} />
          <meshStandardMaterial color="#e2e8f0" roughness={0.65} />
        </mesh>

        {/* California Palm Trees flanking walkway */}
        <PalmTree3D position={[-2.9, 0, 7.5]} lean={-0.08} scale={1.05} />
        <PalmTree3D position={[3.0, 0, 6.2]} lean={0.09} scale={1.12} />
        <PalmTree3D position={[-3.3, 0, 1.8]} lean={-0.05} scale={0.95} />
        <PalmTree3D position={[3.4, 0, 1.5]} lean={0.07} scale={0.98} />

        {/* Fluffy White California Clouds */}
        {[
          [-3.2, 9.5, -5],
          [2.8, 10.2, -7],
          [0.2, 11.0, -10],
        ].map(([cx, cy, cz], ci) => (
          <group key={ci} position={[cx + (t - 12) * 0.3, cy, cz]}>
            <mesh>
              <sphereGeometry args={[1.0, 12, 10]} />
              <meshStandardMaterial color="#ffffff" roughness={0.95} />
            </mesh>
            <mesh position={[0.85, -0.15, 0]}>
              <sphereGeometry args={[0.72, 12, 10]} />
              <meshStandardMaterial color="#ffffff" roughness={0.95} />
            </mesh>
            <mesh position={[-0.8, -0.18, 0]}>
              <sphereGeometry args={[0.68, 12, 10]} />
              <meshStandardMaterial color="#ffffff" roughness={0.95} />
            </mesh>
          </group>
        ))}

        {/* Glass Data Center Facade (z = -1.5) with Central Door Cutout */}
        <group position={[0, 0, -1.5]}>
          <mesh position={[-2.85, 3.2, 0]}>
            <boxGeometry args={[3.1, 6.4, 0.25]} />
            <meshStandardMaterial color="#7dd3fc" transparent opacity={0.38} metalness={0.25} roughness={0.15} />
          </mesh>
          <mesh position={[2.85, 3.2, 0]}>
            <boxGeometry args={[3.1, 6.4, 0.25]} />
            <meshStandardMaterial color="#7dd3fc" transparent opacity={0.38} metalness={0.25} roughness={0.15} />
          </mesh>
          <mesh position={[0, 4.6, 0]}>
            <boxGeometry args={[2.6, 3.6, 0.25]} />
            <meshStandardMaterial color="#38bdf8" transparent opacity={0.42} metalness={0.25} roughness={0.15} />
          </mesh>
          {[-4.35, -1.32, 1.32, 4.35].map((mx, mi) => (
            <mesh key={mi} position={[mx, 3.2, 0.05]}>
              <boxGeometry args={[0.14, 6.4, 0.3]} />
              <meshStandardMaterial color="#e2e8f0" metalness={0.75} roughness={0.25} />
            </mesh>
          ))}
          <mesh position={[0, 2.82, 0.06]}>
            <boxGeometry args={[8.8, 0.16, 0.32]} />
            <meshStandardMaterial color="#cbd5e1" metalness={0.8} roughness={0.2} />
          </mesh>
          <mesh position={[0, 6.4, 0.06]}>
            <boxGeometry args={[9.0, 0.24, 0.38]} />
            <meshStandardMaterial color="#94a3b8" metalness={0.8} roughness={0.25} />
          </mesh>

          {/* Animated Sliding Glass Doors */}
          <mesh position={[-0.65 - doorSlide, 1.4, 0.02]}>
            <boxGeometry args={[1.28, 2.75, 0.08]} />
            <meshStandardMaterial color="#bae6fd" transparent opacity={0.45} roughness={0.1} />
          </mesh>
          <mesh position={[0.65 + doorSlide, 1.4, 0.02]}>
            <boxGeometry args={[1.28, 2.75, 0.08]} />
            <meshStandardMaterial color="#bae6fd" transparent opacity={0.45} roughness={0.1} />
          </mesh>

          {/* Neon Sign: ANTHROPIC DATA CENTER • USA */}
          <group position={[0, 3.95, 0.22]}>
            <mesh position={[0, 0, -0.04]}>
              <boxGeometry args={[3.35, 1.24, 0.1]} />
              <meshStandardMaterial color="#0f172a" metalness={0.6} roughness={0.3} />
            </mesh>
            <mesh position={[0, 0, -0.01]}>
              <boxGeometry args={[3.42, 1.3, 0.04]} />
              <meshStandardMaterial color="#38bdf8" emissive="#0ea5e9" emissiveIntensity={2.2} />
            </mesh>
            <mesh position={[0, 0, 0.03]}>
              <planeGeometry args={[3.2, 1.1]} />
              <meshBasicMaterial map={usaSignTex} />
            </mesh>
          </group>
        </group>

        {/* Huge Empty Data Center Hall Interior (z: -1.5 .. -15.0) */}
        <group>
          <pointLight position={[0, 5.0, -8.0]} color="#ffffff" intensity={2.6} distance={20} />
          <mesh position={[0, -0.05, -8.25]} receiveShadow>
            <boxGeometry args={[11.2, 0.1, 13.5]} />
            <meshStandardMaterial color="#f1f5f9" roughness={0.35} />
          </mesh>
          <mesh position={[-5.5, 3.2, -8.25]}>
            <boxGeometry args={[0.2, 6.4, 13.5]} />
            <meshStandardMaterial color="#e2e8f0" roughness={0.5} />
          </mesh>
          <mesh position={[5.5, 3.2, -8.25]}>
            <boxGeometry args={[0.2, 6.4, 13.5]} />
            <meshStandardMaterial color="#e2e8f0" roughness={0.5} />
          </mesh>
          <mesh position={[0, 6.4, -8.25]}>
            <boxGeometry args={[11.2, 0.2, 13.5]} />
            <meshStandardMaterial color="#cbd5e1" roughness={0.5} />
          </mesh>
          {[-4.5, -8.5, -12.5].map((lz, li) => (
            <mesh key={li} position={[0, 6.26, lz]}>
              <boxGeometry args={[5.5, 0.06, 0.6]} />
              <meshBasicMaterial color="#ffffff" />
            </mesh>
          ))}
          <mesh position={[-3.4, 3.2, -15.0]}>
            <boxGeometry args={[4.4, 6.4, 0.25]} />
            <meshStandardMaterial color="#cbd5e1" roughness={0.5} />
          </mesh>
          <mesh position={[3.4, 3.2, -15.0]}>
            <boxGeometry args={[4.4, 6.4, 0.25]} />
            <meshStandardMaterial color="#cbd5e1" roughness={0.5} />
          </mesh>
          <mesh position={[0, 4.4, -15.0]}>
            <boxGeometry args={[2.6, 4.0, 0.25]} />
            <meshStandardMaterial color="#cbd5e1" roughness={0.5} />
          </mesh>

          {/* CENTERPIECE JOKE: One Cheap Stool + Tiny Blinking Router */}
          <group position={[0, 0, -8.5]}>
            <mesh position={[0, 0.56, 0]} castShadow>
              <cylinderGeometry args={[0.28, 0.28, 0.06, 18]} />
              <meshStandardMaterial color="#ca8a04" roughness={0.7} />
            </mesh>
            {[
              [-0.17, -0.17, 0.08, -0.08],
              [0.17, -0.17, 0.08, 0.08],
              [-0.17, 0.17, -0.08, -0.08],
              [0.17, 0.17, -0.08, 0.08],
            ].map(([lx, lz, rx, rz], li) => (
              <mesh key={li} position={[lx, 0.28, lz]} rotation={[rx, 0, rz]} castShadow>
                <cylinderGeometry args={[0.025, 0.02, 0.58, 8]} />
                <meshStandardMaterial color="#92400e" roughness={0.75} />
              </mesh>
            ))}

            {/* Tiny Consumer Wi-Fi Router */}
            <group position={[0, 0.63, 0]}>
              <mesh castShadow>
                <boxGeometry args={[0.36, 0.08, 0.24]} />
                <meshStandardMaterial color="#1e293b" roughness={0.35} />
              </mesh>
              <mesh position={[-0.13, 0.14, -0.08]} rotation={[0, 0, 0.12]}>
                <cylinderGeometry args={[0.01, 0.012, 0.24, 8]} />
                <meshStandardMaterial color="#0f172a" roughness={0.4} />
              </mesh>
              <mesh position={[0.13, 0.14, -0.08]} rotation={[0, 0, -0.12]}>
                <cylinderGeometry args={[0.01, 0.012, 0.24, 8]} />
                <meshStandardMaterial color="#0f172a" roughness={0.4} />
              </mesh>
              <mesh position={[0, 0.01, 0.126]}>
                <sphereGeometry args={[0.022, 10, 8]} />
                <meshStandardMaterial
                  color={ledOn ? "#22c55e" : "#14532d"}
                  emissive="#22c55e"
                  emissiveIntensity={ledOn ? 3.8 : 0.2}
                />
              </mesh>
            </group>

            {/* Cable running from Router out toward Ocean */}
            <mesh position={[0, 0.34, -0.25]} rotation={[0.9, 0, 0]}>
              <cylinderGeometry args={[0.032, 0.032, 0.72, 8]} />
              <meshStandardMaterial color="#38bdf8" emissive="#0ea5e9" emissiveIntensity={1.6} />
            </mesh>
            <mesh position={[0, 0.04, -3.5]} rotation={[Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[0.045, 0.045, 6.2, 8]} />
              <meshStandardMaterial color="#38bdf8" emissive="#0ea5e9" emissiveIntensity={1.6} />
            </mesh>
          </group>

          {/* GIANT REDIRECT SIGN WITH ARROW: ПЕРЕАДРЕСАЦИЯ ➔ INDIA */}
          <group position={[0, 1.85, -9.85]}>
            <mesh position={[-0.95, -0.95, -0.08]}>
              <cylinderGeometry args={[0.06, 0.06, 1.9, 10]} />
              <meshStandardMaterial color="#475569" metalness={0.7} roughness={0.3} />
            </mesh>
            <mesh position={[0.95, -0.95, -0.08]}>
              <cylinderGeometry args={[0.06, 0.06, 1.9, 10]} />
              <meshStandardMaterial color="#475569" metalness={0.7} roughness={0.3} />
            </mesh>
            <mesh position={[0, 0, -0.05]}>
              <boxGeometry args={[2.55, 1.02, 0.1]} />
              <meshStandardMaterial color="#dc2626" roughness={0.4} />
            </mesh>
            <mesh position={[0, 0, 0.02]}>
              <planeGeometry args={[2.42, 0.91]} />
              <meshBasicMaterial map={redirectSignTex} />
            </mesh>
          </group>
        </group>
      </group>

      {/* ================================================================= */}
      {/* 2. DARK BLUE OCEAN & GLOWING BLUE-ORANGE FIBER CABLE + PACKETS    */}
      {/* ================================================================= */}
      <group>
        <mesh position={[0, -2.2, -43]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[60, 62]} />
          <meshStandardMaterial color="#07223d" roughness={0.35} metalness={0.4} />
        </mesh>
        {Array.from({ length: 18 }, (_, i) => {
          const wz = -17 - i * 3.1;
          const shift = Math.sin(t * 3.2 + i * 1.1) * 0.6;
          return (
            <mesh key={i} position={[shift, -2.14, wz]} rotation={[-Math.PI / 2, 0, 0]}>
              <planeGeometry args={[18, 0.45]} />
              <meshStandardMaterial color="#0e4a7b" emissive="#0284c7" emissiveIntensity={0.25} />
            </mesh>
          );
        })}

        <mesh geometry={blueTubeGeo}>
          <meshStandardMaterial color="#38bdf8" emissive="#0ea5e9" emissiveIntensity={2.0} />
        </mesh>
        <mesh geometry={orangeTubeGeo}>
          <meshStandardMaterial color="#fb923c" emissive="#f97316" emissiveIntensity={2.0} />
        </mesh>

        {packetIndices.map((idx) => {
          const u = ((t - 14.8) * 0.72 + idx / packetIndices.length) % 1;
          const safeU = u < 0 ? u + 1 : u;
          const z = lerp(-15, -73, safeU);
          const [px, py, pz] = cablePoint(z);
          const isOrange = idx % 2 === 1;
          const col = isOrange ? "#fb923c" : "#38bdf8";
          const em = isOrange ? "#f97316" : "#0ea5e9";
          return (
            <group key={idx} position={[px, py + 0.04, pz]}>
              <mesh>
                <sphereGeometry args={[0.16, 12, 10]} />
                <meshStandardMaterial color={col} emissive={em} emissiveIntensity={3.2} />
              </mesh>
              <mesh>
                <sphereGeometry args={[0.28, 10, 8]} />
                <meshBasicMaterial color={col} transparent opacity={0.28} />
              </mesh>
            </group>
          );
        })}
      </group>

      {/* ================================================================= */}
      {/* 3. DUSTY MUMBAI SHORE & SHABBY "SERVER RACK INDIA-4" BUILDING     */}
      {/* ================================================================= */}
      <group>
        <mesh position={[0, -1.1, -71.5]} rotation={[0.35, 0, 0]} receiveShadow>
          <boxGeometry args={[28, 0.5, 7]} />
          <meshStandardMaterial color="#a8865c" roughness={0.95} />
        </mesh>
        <mesh position={[0, -0.15, -83.5]} receiveShadow>
          <boxGeometry args={[30, 0.3, 21]} />
          <meshStandardMaterial color="#9c7a52" roughness={0.95} />
        </mesh>

        <mesh position={[0, 0.08, -77.2]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.055, 0.055, 8.2, 8]} />
          <meshStandardMaterial color="#f97316" emissive="#ea580c" emissiveIntensity={1.5} />
        </mesh>

        {/* Shabby Mumbai Building (Front at z = -81.0, Open Door x: -0.9..+0.9, y: 0..2.45) */}
        <group position={[0, 0, -81.0]}>
          <mesh position={[-1.75, 2.2, -2.5]} castShadow receiveShadow>
            <boxGeometry args={[1.7, 4.4, 5.0]} />
            <meshStandardMaterial color="#92704e" roughness={0.92} />
          </mesh>
          <mesh position={[1.75, 2.2, -2.5]} castShadow receiveShadow>
            <boxGeometry args={[1.7, 4.4, 5.0]} />
            <meshStandardMaterial color="#92704e" roughness={0.92} />
          </mesh>
          <mesh position={[0, 3.425, -2.5]} castShadow receiveShadow>
            <boxGeometry args={[1.8, 1.95, 5.0]} />
            <meshStandardMaterial color="#876645" roughness={0.92} />
          </mesh>
          <mesh position={[-1.4, 1.1, 0.02]}>
            <boxGeometry args={[0.8, 1.4, 0.03]} />
            <meshStandardMaterial color="#6b5036" roughness={0.95} />
          </mesh>
          <mesh position={[1.5, 2.7, 0.02]}>
            <boxGeometry args={[0.9, 0.9, 0.03]} />
            <meshStandardMaterial color="#6b5036" roughness={0.95} />
          </mesh>
          <mesh position={[0, 2.52, 0.42]} rotation={[0.25, 0, -0.04]}>
            <boxGeometry args={[2.3, 0.08, 0.9]} />
            <meshStandardMaterial color="#7c2d12" roughness={0.85} metalness={0.3} />
          </mesh>
          <mesh position={[1.65, 1.65, 0.25]} rotation={[0, 0, 0.06]}>
            <boxGeometry args={[0.68, 0.46, 0.42]} />
            <meshStandardMaterial color="#94a3b8" roughness={0.8} />
          </mesh>
          <mesh position={[-1.55, 3.65, 0.15]} rotation={[0, 0, 0.28]}>
            <cylinderGeometry args={[0.02, 0.02, 1.8, 6]} />
            <meshStandardMaterial color="#09090b" roughness={0.7} />
          </mesh>
          <mesh position={[1.25, 3.8, 0.15]} rotation={[0, 0, -0.35]}>
            <cylinderGeometry args={[0.02, 0.02, 1.6, 6]} />
            <meshStandardMaterial color="#09090b" roughness={0.7} />
          </mesh>

          <mesh position={[0, 1.3, -5.0]}>
            <planeGeometry args={[2.2, 2.8]} />
            <meshBasicMaterial color="#1f140c" />
          </mesh>
          <pointLight position={[0, 2.1, -2.5]} color="#f59e0b" intensity={1.8} distance={7} />

          {/* Crooked Duct-Taped Sign: SERVER RACK INDIA-4 */}
          <group position={[0.04, 3.12, 0.08]} rotation={[0.03, 0, -0.1]}>
            <mesh position={[0, 0, -0.02]}>
              <boxGeometry args={[1.95, 0.72, 0.04]} />
              <meshStandardMaterial color="#78350f" roughness={0.85} />
            </mesh>
            <mesh position={[0, 0, 0.01]}>
              <planeGeometry args={[1.88, 0.65]} />
              <meshBasicMaterial map={indiaSignTex} />
            </mesh>
            <mesh position={[-0.82, 0.32, 0.025]} rotation={[0, 0, 0.65]}>
              <boxGeometry args={[0.42, 0.12, 0.02]} />
              <meshStandardMaterial color="#94a3b8" roughness={0.5} />
            </mesh>
            <mesh position={[0.84, 0.28, 0.025]} rotation={[0, 0, -0.58]}>
              <boxGeometry args={[0.42, 0.12, 0.02]} />
              <meshStandardMaterial color="#cbd5e1" roughness={0.5} />
            </mesh>
          </group>
        </group>
      </group>
    </>
  );
};

// ============================================================================
// MAIN ROUTER COMPONENT (Scenes A, B, D, F)
// ============================================================================

export const CoderAndFlyover3D: React.FC<{ t: number }> = ({ t }) => {
  // SCENE A (t < 12.05): Coder bragging -> drops 500 lines -> camera dives into monitor
  if (t < 12.05) {
    const isCodeDrop = t >= CUES.a_coder2.start; // 7.91
    const isZoomIn = t >= 11.4;

    // 0..1.0: sipping smoothie; 1.0..7.75: turned toward -X camera bragging; 7.75..12.05: typing code drop
    const sipDone = ease(seg(t, 0.7, 1.25));
    const turnToDesk = ease(seg(t, 7.65, 8.05));

    const holdSmoothie = t < 7.75;
    const pose: "sit_chill" | "sit_type" = t < 7.75 ? "sit_chill" : "sit_type";
    const mood: "smile" | "frown" = t < 7.75 ? "smile" : "frown";
    const brow = t < 7.75 ? 0.15 : -0.35;

    // Camera is at -X, so positive headTurn (+1.12) & positive lookX (+0.55) face directly toward lens
    const headTurn =
      t < 7.65
        ? lerp(0.2, 1.12, sipDone) + Math.sin(t * 2.1) * 0.07 * sipDone
        : lerp(1.12, 0, turnToDesk);
    const headTilt =
      t < 0.9 ? -0.14 * (1 - seg(t, 0.65, 0.9)) : t < 7.65 ? Math.sin(t * 2.8) * 0.05 : 0.08 * turnToDesk;
    const lookX = t < 7.65 ? lerp(0, 0.55, sipDone) : lerp(0.55, 0, turnToDesk);

    let camPos: [number, number, number] = [-2.68, 1.64, 1.72];
    let camLook: [number, number, number] = [0.04, 1.30, 0.20];
    let camFov = 52;

    if (t >= 7.55 && t < 8.15) {
      const p = ease(seg(t, 7.55, 8.15));
      camPos = [lerp(-2.68, -1.15, p), lerp(1.64, 1.58, p), lerp(1.72, 1.92, p)];
      camLook = [lerp(0.04, 0, p), lerp(1.30, 1.28, p), lerp(0.20, -0.05, p)];
      camFov = lerp(52, 48, p);
    } else if (t >= 8.15 && !isZoomIn) {
      const p = ease(seg(t, 8.15, 11.4));
      camPos = [lerp(-1.15, -0.68, p), lerp(1.58, 1.46, p), lerp(1.92, 1.18, p)];
      camLook = [0, 1.3, lerp(-0.05, -0.19, p)];
      camFov = 48;
    } else if (isZoomIn) {
      const p = easeIn(seg(t, 11.4, 12.05));
      // Arcs cleanly past the coder's left shoulder straight into CoderDesk3D's glowing screen (y=1.30, z=-0.19)
      camPos = [
        lerp(-0.68, 0, Math.pow(p, 1.35)) - Math.sin(p * Math.PI) * 0.18,
        lerp(1.46, 1.3, p),
        lerp(1.18, -0.06, p),
      ];
      camLook = [0, 1.3, -0.19];
      camFov = lerp(48, 56, p);
    }

    const portalFlash = isZoomIn ? easeIn(seg(t, 11.86, 12.05)) * 0.85 : 0;

    return (
      <CoderRoomScene3D
        t={t}
        screenMode={isCodeDrop ? "code_drop" : "chat"}
        coderProps={{
          pose,
          mood,
          brow,
          headTurn,
          headTilt,
          lookX,
          holdSmoothie,
          mouthOpen: mouthOf("coder", t),
        }}
        cam={{ pos: camPos, lookAt: camLook, fov: camFov }}
        portalFlash={portalFlash}
      />
    );
  }

  // SCENE B (12.05 <= t < 17.75): California -> Empty Data Center -> Ocean Cable -> Mumbai
  if (t < 17.75) {
    return <FlyoverScene3D t={t} />;
  }

  // SCENE D (41.78 <= t < 48.54): Claude's polite answer + Coder requests Rust rewrite
  if (t < 50.0) {
    const isRustPrompt = t >= CUES.d_coder3.start; // 44.38
    const shiftToType = ease(seg(t, 44.2, 44.65));

    const camP = ease(seg(t, 41.78, 48.24));
    const camPos: [number, number, number] = [
      lerp(-2.72, -2.52, camP),
      lerp(1.62, 1.56, camP),
      lerp(1.58, 1.48, camP),
    ];

    return (
      <CoderRoomScene3D
        t={t}
        screenMode={isRustPrompt ? "rust" : "answer"}
        coderProps={{
          pose: isRustPrompt ? "sit_type" : "sit_chill",
          mood: isRustPrompt ? "neutral" : "smile",
          brow: isRustPrompt ? 0.1 : 0.25,
          headTurn: lerp(0.95, 0.45, shiftToType) + (isRustPrompt ? 0 : Math.sin(t * 2.4) * 0.06),
          headTilt: isRustPrompt ? 0.06 : Math.sin(t * 3.0) * 0.05,
          lookX: lerp(0.45, 0.22, shiftToType),
          holdSmoothie: !isRustPrompt,
          mouthOpen: mouthOf("coder", t),
        }}
        cam={{ pos: camPos, lookAt: [0.05, 1.30, 0.22], fov: lerp(52, 50, camP) }}
      />
    );
  }

  // SCENE F (52.40 <= t < 60.89): Red usage limit error -> brief panic -> carefree smoothie chill
  const isCoderReply = t >= CUES.f_coder4.start; // 56.59
  const isPanic = t >= 56.59 && t < 58.3;
  const isChillAgain = t >= 58.3;

  const chillBlend = ease(seg(t, 58.3, 58.85));

  let pose: "sit_chill" | "panic" = "sit_chill";
  let mood: "smile" | "frown" = "frown";
  let eyes: "normal" | "wide" = "wide";
  let brow = -0.55;
  let headTurn = 0.45;
  let lookX = 0.2;
  let holdSmoothie = false;

  if (isPanic) {
    pose = "panic";
    mood = "frown";
    eyes = "wide";
    brow = -0.7;
    headTurn = 0.95 + Math.sin(t * 9) * 0.14;
    lookX = 0.4;
    holdSmoothie = false;
  } else if (isChillAgain) {
    pose = "sit_chill";
    mood = "smile";
    eyes = "normal";
    brow = 0.15;
    headTurn = lerp(0.95, 1.12, chillBlend) + Math.sin(t * 2.2) * 0.06;
    lookX = lerp(0.4, 0.55, chillBlend);
    holdSmoothie = true;
  }

  const baseCamP = ease(seg(t, 52.4, 56.5));
  let camPos: [number, number, number] = [
    lerp(-2.72, -2.52, baseCamP),
    lerp(1.62, 1.56, baseCamP),
    lerp(1.58, 1.48, baseCamP),
  ];
  let camLook: [number, number, number] = [0.05, 1.30, 0.22];
  let camFov = 52;
  let camShake = 0;

  if (isCoderReply) {
    const reactP = ease(seg(t, 56.59, 57.1));
    camPos = [lerp(-2.52, -2.75, reactP), lerp(1.56, 1.66, reactP), lerp(1.48, 1.66, reactP)];
    camLook = [0.04, lerp(1.30, 1.34, reactP), 0.22];
    camFov = lerp(52, 54, reactP);
    camShake = isPanic ? 0.55 : 0;
  }

  return (
    <CoderRoomScene3D
      t={t}
      screenMode="limit"
      coderProps={{
        pose,
        mood,
        eyes,
        brow,
        headTurn,
        headTilt: isChillAgain ? Math.sin(t * 2.5) * 0.05 : 0,
        lookX,
        holdSmoothie,
        mouthOpen: mouthOf("coder", t),
      }}
      cam={{ pos: camPos, lookAt: camLook, fov: camFov, shake: camShake }}
    />
  );
};
