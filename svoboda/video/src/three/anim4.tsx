// Сцена 4 «Закон и порядок» (30 fps): планы 19-26 как функции ВРЕМЕНИ (секунды). Рваная кукольная анимация: поза обновляется раз в 4 кадра, рот - раз в 2 кадра.
// Каждый план возвращает камеру и готовый набор 3D-объектов; склейки между планами и внутри планов - только жёсткие.
import React from "react";
import * as THREE from "three";
import { PP, PPatch, mixP, Person } from "./Person";
import { Cast, CastKind } from "./Cast";
import { PP4, mix4, Doll4, BUILD4, armGeom4, GUN, Kind4 } from "./Cast4";
import { PatrolCar, Pickup, Dumpster, Vending, GlassesProp, Grenade, HandOut, PatrolProps } from "./Vehicles4";
import { WantedStar, Muzzle, Blast, Shards, Tink, Spit, GunSmoke, ImpactLines } from "./Fx4";
import { Flame, SmokeColumn, GroundDust, Puff, Chunk } from "./Fx";
import { Part, Flat, planeGeo, circleGeo, sphereGeo, flatMat, rbox, INK } from "./toon";
import { armIK, fromTorso } from "./ik";
import { clamp, lerp, easeOut, hash, D2R } from "./util";
import { ShotT, STEP, FPS, mouthFromEnv, K } from "../data/scene4";

export interface Cam { x: number; y: number; z: number; tx: number; ty: number; tz?: number }
export interface Out { cam: Cam; street: boolean; node: React.ReactNode; flash?: boolean }
export interface Voices { env: Array<number[] | undefined> }
type V3 = [number, number, number];

// ---------- мир ----------
const CS = 1.05; // масштаб патрульной машины
const ROAD_Y = -0.3;
const CAR = { x: -2.9, z: 3.05 };
const DUMP = { x: 3.2, z: 3.6 };
const SCL = { greg: 1.45, tony: 1.5, marcus: 1.35, chloe: 1.3, jackson: 1.55, stacey: 1.2, brenda: 1.55, swat: 1.5 };
type AKind = keyof typeof SCL;
const q2 = (v: number) => Math.round(v * 50) / 50;

let RAW = 0; // кадр плана, округлённый на MSTEP вниз (для рта)
const mouthOf = (sh: ShotT, env: number[] | undefined): number => {
  const k = RAW - sh.vFrom;
  if (sh.vLen === 0 || k < 0 || k >= sh.vLen) return 0;
  return mouthFromEnv(env, k, sh.vLen);
};

type Beat<T> = readonly [number, T];
const beatAt = <T,>(T0: number, list: ReadonlyArray<Beat<T>>, off = 0): { p: T; i: number; k: number } => {
  let tot = 0;
  for (const [d] of list) tot += d;
  let t = (((T0 + off) % tot) + tot) % tot;
  for (let i = 0; i < list.length; i++) {
    const [d, p] = list[i];
    if (t < d - 1e-6) return { p, i, k: t };
    t -= d;
  }
  return { p: list[0][1], i: 0, k: 0 };
};
type K4 = Partial<PP4> & { t: number };
const seg = <P,>(keys: Array<P & { t: number }>, T: number): Partial<P> => {
  let out: Partial<P> = {};
  for (const { t: kt, ...patch } of keys) if (kt <= T + 1e-6) out = { ...out, ...(patch as unknown as Partial<P>) };
  return out;
};

const base = (kind: "greg" | "tony" | "marcus" | "chloe", o: PPatch = {}): PP =>
  mixP({ scale: SCL[kind], y: 0.43 * SCL[kind], eyeL: 0, eyeR: 0, alz: 8, arz: 8, llz: 4, lrz: 4, ...o });
const base4 = (kind: Kind4, o: Partial<PP4> = {}): PP4 =>
  mix4({ scale: SCL[kind], y: 0.43 * SCL[kind], eyeL: 0, eyeR: 0, alz: 8, arz: 8, llz: 4, lrz: 4, ...o });

/** Рендер персонажа (на дороге ниже на 0.3) */
const A = (kind: AKind, pose: PP | PP4, key?: string): React.ReactNode => {
  const gy = pose.z > 2.1 ? ROAD_Y : 0;
  const p = gy ? { ...pose, y: pose.y + gy } : pose;
  const k = key ?? kind;
  if (kind === "greg") return <Person key={k} pose={p} kind="greg" s2 groundY={gy} />;
  if (kind === "tony" || kind === "marcus" || kind === "chloe") return <Cast key={k} pose={p} kind={kind as CastKind} groundY={gy} />;
  return <Doll4 key={k} pose={p as PP4} kind={kind} groundY={gy} />;
};

/** Патрульная машина: x,z - центр; ry=π нос влево; pitch - клевок носом (град); roll - переворот (град) */
const car = (key: string, o: { x: number; y?: number; z: number; ry?: number; pitch?: number; roll?: number; yaw2?: number } & PatrolProps): React.ReactNode => {
  const { x, y = 0, z, ry = Math.PI, pitch = 0, roll = 0, yaw2 = 0, ...pp } = o;
  return (
    <group key={key} position={[x, ROAD_Y + y, z]} rotation={[0, ry + yaw2, 0]} scale={CS}>
      <group rotation={[roll * D2R, 0, -pitch * D2R]}>
        <PatrolCar {...pp} />
      </group>
    </group>
  );
};
const yawTo = (c: Cam, x: number, z: number) => Math.atan2(c.x - x, c.z - z);
const wp = (p: PP, local: V3): V3 => {
  const w = fromTorso(p, local);
  return p.z > 2.1 ? [w[0], w[1] + ROAD_Y, w[2]] : w; // персонажи на дороге ниже на 0.3
};

// ---------- общие позы ----------
const GREG_IDLE: Array<Beat<PPatch>> = [
  [0.533, { ry: -18, hy: -30, hx: 2, eyeL: 2, eyeR: 2, mouth: 4, brow: -1, arx: 34, are: 84, alx: 12, ale: 20, lx: 1.2 }],
  [0.667, { ry: -30, hy: -12, hx: -6, eyeL: 2, eyeR: 2, mouth: 4, brow: -0.5, arx: 40, are: 90, alx: 24, ale: 40 }],
  [0.4, { ry: -10, hy: -36, hx: 4, eyeL: 0, eyeR: 0, mouth: 0, brow: -1, arx: 30, are: 80, alx: 14, ale: 24, lx: 1.4 }],
];
const gregIdle = (T: number, o: PPatch = {}): PP => base("greg", { x: 0.4, z: 1.2, ...beatAt(T, GREG_IDLE).p, ...o });
const TONY_IDLE: Array<Beat<PPatch>> = [
  [0.667, { ry: -40, hy: -26, hx: 2, alx: 30, ale: 70, arx: 30, are: 70, hl: 2, hr: 2, brow: -0.5 }],
  [0.533, { ry: -24, hy: 12, hx: -4, alx: 60, ale: 100, arx: 60, are: 100, hl: 2, hr: 2, brow: 0.5 }],
  [0.4, { ry: -34, hy: -40, hx: 4, alx: 24, ale: 50, arx: 24, are: 50, hl: 2, hr: 2, brow: -1 }],
];
const tonyIdle = (T: number, o: PPatch = {}): PP => base("tony", { x: 2.0, z: 1.0, tl: 2, ...beatAt(T, TONY_IDLE, 0.2).p, ...o });
const MARCUS_IDLE: Array<Beat<PPatch>> = [
  [0.533, { ry: -30, hy: -20, tl: 8, hx: 8, alx: 55, alz: 14, ale: 105, arx: 55, arz: 14, are: 105 }],
  [0.4, { ry: -22, hy: 10, tl: 4, hx: 0, alx: 24, alz: 12, ale: 50, arx: 24, arz: 12, are: 50 }],
  [0.667, { ry: -34, hy: -28, tl: 10, hx: 12, alx: 158, alz: 20, ale: 130, arx: 158, arz: 20, are: 130 }],
];
const marcusIdle = (T: number, o: PPatch = {}): PP => base("marcus", { x: 3.5, z: 1.0, brow: 1, ...beatAt(T, MARCUS_IDLE, 0.3).p, ...o });

const CHLOE_IDLE: Array<Beat<PPatch>> = [
  [0.533, { hy: 14, hx: -4, brow: 1, eyeL: 1, eyeR: 1, mouth: 4, arx: 6, are: 20, alx: 10, ale: 30 }],
  [0.4, { hy: 6, hx: 6, brow: 1, eyeL: 1, eyeR: 1, mouth: 0, arx: 14, are: 34, alx: 4, ale: 22 }],
  [0.667, { hy: 20, hx: -8, brow: 1, eyeL: 0, eyeR: 0, mouth: 4, arx: 4, are: 14, alx: 16, ale: 36 }],
];
const chloeAt = (T: number, o: PPatch = {}): PP => base("chloe", { x: -0.7, z: 4.8, ry: -86, tl: 2, llz: 10, lrz: 10, hr: 2, hl: 0, ...beatAt(T, CHLOE_IDLE).p, ...o });

const STACEY_IDLE: Array<Beat<Partial<PP4>>> = [
  [0.4, { arx: 20, are: 70, hp: 0, tl: 8, hx: 6, brow: -1, alx: 10, alz: 24, ale: 50 }],
  [0.267, { arx: 70, are: 80, hp: -40, tl: 4, hx: 2, brow: -1, alx: 14, alz: 20, ale: 60 }],
  [0.4, { arx: 40, are: 90, hp: 20, tl: 10, hx: 8, brow: -1, alx: 8, alz: 28, ale: 44 }],
  [0.533, { arx: 24, are: 60, hp: 0, tl: 6, hx: 4, brow: -1, alx: 12, alz: 22, ale: 54 }],
];
const staceyAt = (T: number, o: Partial<PP4> = {}): PP4 => base4("stacey", { x: -2.4, z: 4.9, ry: 72, cb: 1, hl: 2, hr: 2, mouth: 5, llz: 10, lrz: 10, ...beatAt(T, STACEY_IDLE).p, ...o });
const BRENDA_IDLE: Array<Beat<Partial<PP4>>> = [
  [0.667, { ry: 40, hy: 10, alx: 40, ale: 100, arx: 40, are: 100, tl: 4, brow: -0.6 }],
  [0.533, { ry: 28, hy: 22, alx: 30, ale: 90, arx: 54, are: 110, tl: 6, brow: -1 }],
  [0.4, { ry: 50, hy: -6, alx: 46, ale: 108, arx: 36, are: 94, tl: 2, brow: -0.6 }],
];
const brendaAt = (T: number, o: Partial<PP4> = {}): PP4 => base4("brenda", { x: -6.6, z: 4.4, alz: 16, arz: 16, hl: 2, hr: 2, ...beatAt(T, BRENDA_IDLE, 0.3).p, ...o });

/** Фон с персонажами на тротуаре: список ключей, кого пропустить */
const bgCast = (T: number, skip: string[] = [], jTrem = 0): React.ReactNode[] => {
  const out: React.ReactNode[] = [];
  if (!skip.includes("greg")) out.push(A("greg", gregIdle(T)));
  if (!skip.includes("tony")) out.push(A("tony", tonyIdle(T)));
  if (!skip.includes("marcus")) out.push(A("marcus", marcusIdle(T)));
  if (!skip.includes("chloe")) out.push(A("chloe", chloeAt(T)));
  if (!skip.includes("stacey")) out.push(A("stacey", staceyAt(T)));
  if (!skip.includes("brenda")) out.push(A("brenda", brendaAt(T)));
  void jTrem;
  return out;
};

const Statics: React.FC<{ lid?: number; ajar?: boolean; dump?: boolean; vend?: boolean }> = ({ lid = 100, ajar, dump = true, vend = true }) => (
  <>
    {vend && (
      <group position={[-8.0, 0, -1.3]}>
        <Vending />
      </group>
    )}
    {dump && (
      <group position={[DUMP.x, ROAD_Y, DUMP.z]}>
        <Dumpster lid={lid} ajar={ajar} />
      </group>
    )}
  </>
);

// ---------- Джексон: хват дробовика (IK обеих рук по точкам на оружии) ----------
const GJ = armGeom4(BUILD4.jackson.arm);
const gunHold = (p: PP4): PP4 => {
  const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(-p.gp * D2R, p.gw * D2R, 0, "YXZ"));
  const o = new THREE.Vector3(p.gx, p.gy, p.gz);
  const at = (v: V3): V3 => {
    const w = new THREE.Vector3(...v).applyQuaternion(q).add(o);
    return [q2(w.x), q2(w.y), q2(w.z)];
  };
  const r = armIK(GJ, -1, at(GUN.grip), 20);
  const l = armIK(GJ, 1, at([0, -0.07, 0.3 - 0.2 * p.rk]), 20);
  return { ...p, gun: 1, arx: r.swing, arz: r.abd, are: r.elbow, alx: l.swing, alz: l.abd, ale: l.elbow, hl: 2, hr: 2 };
};
const muzzleW = (p: PP4): V3 => {
  const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(-p.gp * D2R, p.gw * D2R, 0, "YXZ"));
  const w = new THREE.Vector3(...GUN.muzzle).applyQuaternion(q).add(new THREE.Vector3(p.gx, p.gy, p.gz));
  return wp(p, [w.x, w.y, w.z]);
};

// =====================================================================================
// ЭКП: глаза Джексона (плоские формы на фоне кожи). pupil - радиус зрачка, lid - подъём века, mst - дёргается ус, pulse - сердцебиение
// =====================================================================================
const SKIN = "#f2a58a";
const E: React.FC<{ x: number; y: number; z: number; rx: number; ry: number; color: string; rot?: number; px?: number }> = ({ x, y, z, rx, ry, color, rot = 0, px = 4 }) => (
  <Part flat geo={sphereGeo(28)} color={color} px={px} position={[x, y, z]} rotation={[0, 0, rot]} scale={[rx, ry, 0.03]} />
);
const Ecu: React.FC<{ pupil: number; lid: number; mst: number; vein: number; pulse: number; drool: number; talk: number }> = ({ pupil, lid, mst, vein, pulse, drool, talk }) => {
  const eyes = ([1, -1] as const).map((s) => {
    const cx = s * 1.6;
    const cy = 0.55;
    return (
      <group key={s}>
        <E x={cx} y={cy - 0.85} z={0.03} rx={1.3} ry={0.3} color="#d97a78" px={3} />
        <E x={cx} y={cy} z={0.06} rx={1.3} ry={0.8} color="#f8eee6" />
        {Array.from({ length: vein }).map((_, i) => {
          const a = (i / vein) * Math.PI * 2 + 0.4 + (s > 0 ? 0 : 0.6);
          const r1 = 0.72 + 0.1 * hash(i, 3);
          return (
            <Flat key={i} geo={planeGeo} color="#d8283a" position={[cx + Math.cos(a) * r1 * 0.92, cy + Math.sin(a) * r1 * 0.5, 0.1]} rotation={[0, 0, a + (hash(i, 8) - 0.5) * 0.3]} scale={[0.5 + 0.2 * hash(i, 5), 0.045, 1]} />
          );
        })}
        <E x={cx - s * 0.05} y={cy - 0.02} z={0.14} rx={0.56} ry={0.56} color="#8fa4b6" px={3.4} />
        <E x={cx - s * 0.05} y={cy - 0.02} z={0.2} rx={pupil} ry={pupil} color="#0c0a10" px={0} />
        <E x={cx - s * 0.05 + 0.17} y={cy + 0.16} z={0.26} rx={0.075} ry={0.075} color="#ffffff" px={0} />
        {/* верхнее веко и тяжёлая бровь */}
        <E x={cx} y={cy + 0.98 + lid} z={0.32} rx={1.46} ry={0.78} color={SKIN} px={5} rot={s * -0.08} />
        <E x={cx} y={cy + 1.5 + lid * 0.6} z={0.4} rx={1.6} ry={0.24} color="#4a2a18" px={4} rot={s * 0.3} />
      </group>
    );
  });
  const dy = mst ? 0.05 : 0;
  return (
    <group scale={1 + pulse * 0.018}>
      <Flat geo={planeGeo} color={SKIN} position={[0, 0, -1]} scale={[40, 24, 1]} />
      {eyes}
      {/* нос */}
      <E x={0} y={-0.35} z={0.04} rx={0.8} ry={1.0} color="#e68d78" px={4} />
      <E x={-0.27} y={-1.0} z={0.2} rx={0.17} ry={0.1} color="#5a2a24" px={0} />
      <E x={0.27} y={-1.0} z={0.2} rx={0.17} ry={0.1} color="#5a2a24" px={0} />
      {/* усы подковой, дёргаются */}
      <group position={[0, -1.3 + dy + talk * 0.03, 0.45]} rotation={[0, 0, mst ? 0.06 : 0]}>
        <E x={0} y={0} z={0} rx={1.9} ry={0.44} color="#4a2a18" px={4.4} />
        <E x={-1.7} y={-0.28} z={0.02} rx={0.55} ry={0.32} color="#4a2a18" px={4} rot={-0.5} />
        <E x={1.7} y={-0.28} z={0.02} rx={0.55} ry={0.32} color="#4a2a18" px={4} rot={0.5} />
      </group>
      {/* слюна в уголке рта */}
      <group position={[1.15, -1.75, 0.5]}>
        <E x={0} y={0} z={0} rx={0.15} ry={0.14 + drool * 0.12} color="#f4fbff" px={3.6} />
        <E x={0} y={-0.12 - drool * 0.22} z={0.02} rx={0.1} ry={0.1} color="#f4fbff" px={3.6} />
      </group>
      {/* тулья фуражки сверху + капли пота */}
      <Part flat geo={rbox(14, 0.9, 0.1, 0.05)} color="#121228" px={4} position={[0, 2.45, 0.5]} />
      <E x={-3.4} y={1.5} z={0.3} rx={0.11} ry={0.2} color="#bfeaff" px={3} />
      <E x={3.7} y={1.1} z={0.3} rx={0.1} ry={0.18} color="#bfeaff" px={3} />
    </group>
  );
};

// =====================================================================================
// ПЛАН 19: патрулька выкатывается справа, останавливается; Джексон тяжело вываливается, руки трясутся, гладит дробовик
// =====================================================================================
const J19 = { x: -3.9, z: 5.4 };
const jackson19 = (T: number): PP4 | null => {
  if (T < K.s19.out) return null;
  const t = T - K.s19.out;
  let o: Partial<PP4>;
  if (t < 0.4) o = { x: J19.x - 0.1, z: J19.z - 0.2, ry: 55, tl: 30, hx: 14, hy: -22, y: 0.43 * SCL.jackson - 0.22, llx: 55, llk: 40, lrx: -10, gp: -40, gx: 0.1, gy: 0.5, gz: 0.5, eyeL: 1, eyeR: 1, ps: 1 };
  else if (t < 0.8) o = { x: J19.x - 0.05, z: J19.z - 0.1, ry: 68, tl: -14, hx: -6, hy: -10, y: 0.43 * SCL.jackson + 0.08, gp: -20, gx: 0.15, gy: 0.6, gz: 0.5, eyeL: 1, eyeR: 1, ps: 1, llk: 8, lrk: 8 };
  else {
    const b = beatAt(t - 0.8, [
      [0.4, { hy: -34, hx: -2, gp: 18, rk: 0.0, mst: 1, dy: 0.01 }],
      [0.267, { hy: 22, hx: 2, gp: 22, rk: 0.6, mst: 0, dy: 0.03 }],
      [0.4, { hy: -8, hx: -6, gp: 14, rk: 0.0, mst: 1, dy: 0.0 }],
      [0.267, { hy: 38, hx: 0, gp: 20, rk: 0.7, mst: 0, dy: 0.03 }],
    ] as ReadonlyArray<Beat<Partial<PP4> & { dy: number }>>).p;
    const { dy, ...rest } = b;
    o = { x: J19.x, z: J19.z, ry: 62, tl: -12, y: 0.43 * SCL.jackson + 0.08 + dy, gx: 0.2, gy: 0.68, gz: 0.52, eyeL: 1, eyeR: 1, ps: 1, sp: 1, brow: -1, llk: 6, lrk: 6, ...rest };
  }
  const trem = Math.floor(T * FPS) % 4 < 2 ? 1 : -1;
  const p = base4("jackson", { ...o, gun: 1, gp: (o.gp ?? 0) + trem * 2.5, gw: trem * 2 });
  return gunHold(p);
};
const shot19 = (T: number, T2: number): Out => {
  const stop = K.s19.stop;
  const cx = lerp(10.5, CAR.x, easeOut(clamp(T2 / stop)));
  const pitch = T2 >= stop - 0.2 && T2 < stop + 0.07 ? 3.5 : T2 >= stop + 0.07 && T2 < stop + 0.27 ? -2 : 0;
  const door = T2 < K.s19.door ? 0 : T2 < K.s19.door + 0.13 ? 30 : 68;
  const camX = lerp(0.6, -2.4, easeOut(clamp(T2 / (stop + 0.8))));
  const jk = jackson19(T);
  const dust = T2 >= stop - 0.05 ? Math.round((T2 - stop + 0.05) * 24) : -1;
  return {
    cam: { x: camX, y: 3.5, z: 11.6, tx: camX, ty: 1.7, tz: 3 },
    street: true,
    node: (
      <>
        <Statics />
        {bgCast(T)}
        {car("car", { x: cx, z: CAR.z, pitch, door, spin: -cx * 90 })}
        <group position={[0, ROAD_Y, 0]}>
          <GroundDust at={[CAR.x + 2.2, 0, CAR.z + 1.5]} k={dust} r={1.1} />
        </group>
        {jk && A("jackson", jk)}
      </>
    ),
  };
};

// =====================================================================================
// ПЛАНЫ 20 и 22a: экстремально крупный план глаз
// =====================================================================================
const shot20 = (T: number, sh: ShotT, v: Voices): Out => {
  const talk = mouthOf(sh, v.env[0]) > 0 ? 1 : 0;
  // длинный шёпот: жёсткие склейки между ракурсами (оба глаза, правый глаз, усы со слюной, левый глаз, ещё ближе)
  const CUTS: Array<[number, Cam]> = [
    [0, { x: 0, y: 0, z: 6.6, tx: 0, ty: 0, tz: 0 }],
    [0.2, { x: 0, y: 0, z: 6.2, tx: 0, ty: 0, tz: 0 }],
    [1.25, { x: 1.6, y: 0.55, z: 3.8, tx: 1.6, ty: 0.55, tz: 0 }],
    [2.3, { x: 0, y: -0.9, z: 4.6, tx: 0, ty: -0.9, tz: 0 }],
    [3.2, { x: 0, y: 0, z: 5.6, tx: 0, ty: 0, tz: 0 }],
    [4.1, { x: -1.6, y: 0.55, z: 3.8, tx: -1.6, ty: 0.55, tz: 0 }],
    [5.05, { x: 0, y: -0.6, z: 5.2, tx: 0, ty: -0.6, tz: 0 }],
    [5.6, { x: 0, y: 0.4, z: 4.2, tx: 0, ty: 0.4, tz: 0 }],
    [6.9, { x: 0, y: 0.5, z: 3.4, tx: 0, ty: 0.5, tz: 0 }],
  ];
  let cam: Cam = CUTS[0][1];
  for (const [t, c] of CUTS) if (T >= t) cam = c;
  const beat = Math.floor((T * FPS) / 18) % 2; // сердцебиение: пульс формы
  return {
    cam,
    street: false,
    node: <Ecu pupil={0.21} lid={0} mst={Math.floor(T * FPS) % 8 < 4 ? 1 : 0} vein={9} pulse={beat} drool={clamp((T - 0.3) / 2.5)} talk={talk} />,
  };
};
const shot22a = (T: number): Out => {
  const pupil = T < 0.13 ? 0.2 : T < 0.27 ? 0.13 : T < 0.4 ? 0.08 : 0.045;
  return {
    cam: { x: 0, y: 0, z: T < 0.27 ? 5.6 : 5.0, tx: 0, ty: 0, tz: 0 },
    street: false,
    node: <Ecu pupil={pupil} lid={0.32} mst={Math.floor(T * FPS) % 8 < 4 ? 1 : 0} vein={14} pulse={Math.floor(T * FPS / 8) % 2} drool={1} talk={0} />,
  };
};

// =====================================================================================
// ПЛАН 21: Хлоя пятится от Стейси, чихает, локтем касается заднего крыла: «тук»
// =====================================================================================
const chloe21 = (T: number): PP => {
  const ks: Array<PPatch & { t: number }> = [
    { t: 0, x: -1.0, z: 4.95, llx: 24, lrx: -20, llk: 6, lrk: 30, hy: 12, hx: -2, mouth: 4, eyeL: 1, eyeR: 1, brow: 1, alx: 12, ale: 30, arx: 8, are: 24 },
    { t: 0.267, x: -0.88, z: 4.9, llx: -20, lrx: 24, llk: 30, lrk: 6, y: 0.43 * SCL.chloe + 0.03 },
    { t: 0.533, x: -0.78, z: 4.85, llx: 24, lrx: -20, llk: 6, lrk: 30, y: 0.43 * SCL.chloe },
    // вдох: голова назад, глаза прищурены
    { t: 0.667, x: -0.72, z: 4.82, llx: 0, lrx: 0, llk: 0, lrk: 0, hx: -22, tl: -6, mouth: 1, eyeL: 2, eyeR: 2, brow: 1, alx: 40, ale: 60 },
    { t: 0.8, hx: -28, tl: -8, mouth: 1, eyeL: 2, eyeR: 2 },
    // ЧИХ: корпус вперёд, глаза зажмурены
    { t: 0.933, hx: 30, tl: 16, mouth: 2, eyeL: 3, eyeR: 3, brow: -0.4, alx: 10, ale: 40 },
    // шаг назад, локоть (сторона к машине) уходит назад - «тук»
    { t: 1.067, x: -0.6, z: 4.62, hx: 14, tl: 10, mouth: 0, eyeL: 1, eyeR: 1, brow: 1, arx: -40, arz: 52, are: 70 },
    { t: 1.333, hx: 4, tl: 4, mouth: 1 },
  ];
  return chloeAt(T, { ...seg(ks, T) });
};
const shot21 = (T: number, T2: number, f2: number): Out => {
  const cam: Cam = { x: -1.1, y: 2.7, z: 12.4, tx: -1.5, ty: 1.9, tz: 4.8 };
  const sp = staceyAt(T, { x: -3.5 + clamp(T / 1.0) * 0.5, z: 4.9 });
  const touch = T >= K.s21.tuk;
  const k = Math.round((T2 - K.s21.tuk) * 24);
  const shake = touch && k < 4 ? 0.04 : 0;
  return {
    cam,
    street: true,
    node: (
      <>
        <Statics />
        {bgCast(T, ["chloe", "stacey"])}
        {A("stacey", sp)}
        {A("chloe", chloe21(T))}
        {car("car", { x: CAR.x + shake, z: CAR.z, spin: 0 })}
        <Tink position={[-0.4, 1.4, 4.3]} k={k} yaw={yawTo(cam, -0.4, 4.3)} size={1.3} />
        {T >= K.s21.sneeze + 0.1 && T < K.s21.sneeze + 0.4 && (
          <>
            {[0, 1, 2].map((i) => (
              <mesh key={i} geometry={sphereGeo(8)} material={flatMat(i % 2 ? "#e8f6ff" : "#bfeaff")} position={[-1.4 - i * 0.18, 2.3 - i * 0.07, 5.1]} scale={0.06 + i * 0.01} />
            ))}
          </>
        )}
      </>
    ),
  };
};

// =====================================================================================
// ПЛАН 22b: склейка на Хлою: над головой вспыхивает 1 звезда
// =====================================================================================
const shot22b = (T: number, T2: number): Out => {
  const cam: Cam = { x: -1.3, y: 2.3, z: 9.2, tx: -1.1, ty: 2.1, tz: 4.8 };
  const k = Math.round(T2 * 24);
  const cp = chloeAt(T, { x: -0.6, z: 4.62, hx: -4, hy: 6, eyeL: 1, eyeR: 1, mouth: T < 0.3 ? 1 : 0, brow: 1, alx: 40, alz: 40, ale: 50, arx: 40, arz: 40, are: 50, tl: -2, ry: -80 });
  return {
    cam,
    street: true,
    node: (
      <>
        <Statics />
        {bgCast(T, ["chloe", "stacey"])}
        {A("stacey", staceyAt(T, { x: -2.3, z: 4.9, hx: 0 }))}
        {A("chloe", cp)}
        {car("car", { x: CAR.x, z: CAR.z })}
        <WantedStar position={[-0.6, 3.55, 4.62]} size={0.5} k={k} yaw={yawTo(cam, -0.6, 4.62)} />
      </>
    ),
  };
};

// =====================================================================================
// ПЛАН 23a: Джексон ревёт, передёргивает затвор, стреляет в упор. Хлоя напротив.
// =====================================================================================
const J23 = { x: -2.2, z: 5.1 };
const C23 = { x: 0.3, z: 5.1 };
const bangT = (sh: ShotT) => (sh.vFrom + sh.vLen) / FPS + 0.05;
const shot23a = (T: number, T2: number, sh: ShotT, v: Voices): Out => {
  const tb = bangT(sh);
  const bang = T2 >= tb;
  const kb = Math.round((T2 - tb) * 30);
  const racks = [0.12, 0.27, 0.4];
  const rk = T < racks[0] ? 0 : T < racks[1] ? 1 : T < racks[2] ? 0.35 : 0;
  const talking = mouthOf(sh, v.env[1]);
  const kick = bang && kb < 6;
  let jp = base4("jackson", {
    x: J23.x, z: J23.z, ry: 90, tl: kick ? -18 : -4, hx: kick ? 8 : -2, hy: kick ? 0 : 4 * (Math.floor(T * 7) % 2 ? 1 : -1), eyeL: 1, eyeR: 1, ps: 1, brow: -1, sp: 1, mst: Math.floor(T * FPS) % 4 < 2 ? 1 : 0,
    mouth: talking ? (talking === 2 ? 5 : 2) : bang ? 2 : 0, gun: 1, gx: 0.2, gy: 0.74, gz: 0.52, gp: kick ? 14 : 2, gw: 0, rk: bang ? (kb < 4 ? 0.2 : 0) : rk, y: 0.43 * SCL.jackson + 0.06,
    llk: 8, lrk: 8, llx: 10, lrx: -10,
  });
  jp = gunHold(jp);
  const cp = bang
    ? chloeAt(T, { x: C23.x + (kb < 2 ? 0.1 : 0.5), z: C23.z, ry: -90, tl: -24, hx: -20, eyeL: 3, eyeR: 3, mouth: 2, alx: 80, alz: 60, ale: 20, arx: 70, arz: 60, are: 20, y: 0.43 * SCL.chloe + 0.1 })
    : chloeAt(T, { x: C23.x, z: C23.z, ry: -90, eyeL: 1, eyeR: 1, brow: 1, mouth: Math.floor(T * 5) % 2 ? 1 : 4, alx: 60, alz: 30, ale: 70, arx: 56, arz: 30, are: 80 });
  const wide: Cam = { x: -0.9, y: 2.0, z: 11.6, tx: -0.9, ty: 1.9, tz: 5.0 };
  const closeCam: Cam = { x: -1.2, y: 1.1, z: 8.6, tx: -2.2, ty: 2.4, tz: 5.1 };
  const useClose = T2 >= 1.2 && T2 < tb - 0.1;
  const cam = useClose ? closeCam : wide;
  const mz = muzzleW(jp);
  return {
    cam,
    street: true,
    flash: bang && kb === 0,
    node: (
      <>
        <Statics />
        {car("car", { x: CAR.x, z: CAR.z, lights: T2 > 0.4 ? ((Math.floor(T2 * 7.5) % 2 ? 1 : 2) as 1 | 2) : 0, door: 68 })}
        {A("chloe", cp)}
        {A("jackson", jp)}
        {bang && <Muzzle position={[mz[0] + 0.5, mz[1], mz[2]]} rotZ={0} yaw={yawTo(cam, mz[0], mz[2])} size={1.1} k={Math.floor(kb / 2)} />}
        {bang && <GunSmoke at={[mz[0] + 0.5, mz[1], mz[2]]} k={kb} />}
      </>
    ),
  };
};

// =====================================================================================
// ПЛАН 23b: Хлоя кувырком летит в бак; крышка захлопывается
// =====================================================================================
const shot23b = (T: number, T2: number, sh: ShotT, v: Voices): Out => {
  const dur = (sh.vFrom + sh.vLen) / FPS;
  const land = dur - 0.3;
  const u = clamp(T / land);
  const x0 = C23.x + 0.5;
  const px = lerp(x0, DUMP.x, u);
  const pz = lerp(C23.z, DUMP.z, u);
  const py = 0.9 + 1.5 * 4 * u * (1 - u) + (1 - u) * 0.2 + u * 0.4;
  const tumble = -360 * 2 * easeOut(u);
  const mouth = mouthOf(sh, v.env[2]);
  const inside = T >= land;
  const cp = base("chloe", {
    x: px, z: pz, y: inside ? 0.6 : py, ry: -90, rx: inside ? -400 : tumble, rz: 12, eyeL: 1, eyeR: 1, brow: 1, mouth,
    alx: 150 + (Math.floor(T * FPS) % 8 < 4 ? 20 : -10), alz: 50, ale: 20, arx: 120, arz: 60, are: 30, llx: 40, lrx: -20, llk: 50, lrk: 80, llz: 30, lrz: 30, hr: 2, hl: 0,
  });
  const slamT = dur - 0.15;
  const lid = T2 < slamT ? 100 : T2 < slamT + 0.07 ? 55 : 0;
  const sk = T2 >= slamT && T2 < slamT + 0.27 ? (Math.floor(T2 * 30) % 4 < 2 ? 0.05 : -0.05) : 0;
  const cam: Cam = T >= 1.6 && T < land - 0.4 ? { x: px - 0.6, y: py + 0.5, z: 9.0, tx: px, ty: py, tz: 4.2 } : { x: 0.9, y: 3.0, z: 13.6, tx: 0.9, ty: 2.5, tz: 4.0 };
  return {
    cam,
    street: true,
    node: (
      <>
        <group position={[sk, 0, 0]}>
          <Statics lid={lid} />
        </group>
        {car("car", { x: CAR.x, z: CAR.z, lights: Math.floor(T2 * 7.5) % 2 ? 1 : 2, door: 68 })}
        {A("jackson", gunHold(base4("jackson", { x: J23.x, z: J23.z, ry: 90, tl: -6, hx: -4, eyeL: 1, eyeR: 1, ps: 1, mouth: 2, brow: -1, sp: 1, gun: 1, gx: 0.2, gy: 0.74, gz: 0.52, gp: 4, y: 0.43 * SCL.jackson + 0.06 })))}
        {A("chloe", cp)}
        {T2 >= slamT && <ImpactLines at={[DUMP.x, 1.6, DUMP.z + 0.9]} k={Math.round((T2 - slamT) * 24)} r={0.9} yaw={yawTo(cam, DUMP.x, DUMP.z)} />}
      </>
    ),
  };
};

// =====================================================================================
// ПЛАН 24a: Стейси швыряет монтировку в лобовое; над ней и Брендой - 2 звезды
// =====================================================================================
const ST24 = { x: -8.2, z: 3.7 };
const BR24 = { x: -10.0, z: 3.4 };
const shot24a = (T: number, T2: number, sh: ShotT, v: Voices): Out => {
  const vEnd = (sh.vFrom + sh.vLen) / FPS;
  const tR = vEnd - 0.4;
  const tI = vEnd;
  const released = T2 >= tR;
  const mouth = mouthOf(sh, v.env[3]);
  let st: Partial<PP4>;
  if (T < tR - 0.27) st = { arx: 60, arz: 18, are: 70, hp: 10, tl: 6, hx: 4 };
  else if (T < tR) st = { arx: -70, arz: 14, are: 80, hp: 70, tl: -14, hx: -6 };
  else if (T < tR + 0.27) st = { arx: 120, arz: 10, are: 10, hp: 0, tl: 20, hx: 12, cb: 0 };
  else st = { arx: 80, arz: 14, are: 30, hp: 0, tl: 12, hx: 8, cb: 0 };
  const sp = base4("stacey", { x: ST24.x, z: ST24.z, ry: 90, cb: 1, hl: 2, hr: 2, brow: -1, eyeL: 1, eyeR: 1, mouth: mouth ? (mouth === 2 ? 5 : 3) : released ? 5 : 4, alx: 14, alz: 24, ale: 50, llx: 14, lrx: -14, llz: 12, lrz: 12, ...st });
  const br = brendaAt(T, { x: BR24.x, z: BR24.z, ry: 80, brow: -1 });
  // монтировка в полёте: от руки до лобового стекла
  const hand = wp(sp, [-0.5, 0.75, 0.5]);
  const target: V3 = [CAR.x - 1.5, 1.55, CAR.z + 0.6];
  const fl = clamp((T2 - tR) / (tI - tR));
  const cbPos: V3 = [lerp(hand[0], target[0], fl), lerp(hand[1], target[1], fl) + Math.sin(fl * Math.PI) * 0.6, lerp(hand[2], target[2], fl)];
  const hit = T2 >= tI;
  const kh = Math.round((T2 - tI) * 30);
  const cam: Cam = { x: -6.4, y: 2.2, z: 11.4, tx: -6.2, ty: 1.9, tz: 3.4 };
  const starK = Math.round((T2 - tI - 0.2) * 24);
  return {
    cam,
    street: true,
    node: (
      <>
        <Statics />
        <group position={[-12.2, ROAD_Y, 3.2]}>
          <Pickup />
        </group>
        {car("car", { x: CAR.x, z: CAR.z, crack: hit ? 2 : 0, lights: hit ? ((Math.floor(T2 * 7.5) % 2 ? 1 : 2) as 1 | 2) : 0, door: 68 })}
        {A("brenda", br)}
        {A("stacey", sp)}
        {released && !hit && (
          <group position={cbPos} rotation={[0, 0, Math.floor(T2 * 30 / 2) * 1.2]}>
            <Part geo={rbox(0.06, 0.9, 0.06, 0.02)} color="#d8353b" px={3} />
          </group>
        )}
        {hit && <Shards at={[CAR.x - 1.3, 1.5, CAR.z + 0.7]} k={kh} dir={-1} />}
        {hit && <ImpactLines at={[CAR.x - 1.3, 1.5, CAR.z + 1.0]} k={kh} r={0.6} yaw={yawTo(cam, CAR.x, CAR.z)} />}
        <WantedStar position={[ST24.x, 3.85, ST24.z]} size={0.5} k={starK} yaw={yawTo(cam, ST24.x, ST24.z)} />
        <WantedStar position={[BR24.x, 3.95, BR24.z]} size={0.5} k={starK - 2} yaw={yawTo(cam, BR24.x, BR24.z)} />
      </>
    ),
  };
};

// =====================================================================================
// ПЛАН 24b: из-за кадра вылетают 3 патрульки и таранят пикап
// =====================================================================================
const shot24b = (T: number, T2: number): Out => {
  const hits = [0.3, 0.55, 0.8];
  const lanes = [3.1, 4.9, 1.9];
  const hitX = [-16.4, -16.6, -15.4];
  const nh = hits.filter((h) => T2 >= h).length;
  const pushed = nh * 1.0;
  const px = -12.2 + pushed;
  const pry = nh * 0.14;
  const cars = hits.map((h, i) => {
    const x = T2 < h ? hitX[i] - (h - T2) * 45 : hitX[i] + (i + 1) * 0.35 * Math.min(1, (T2 - h) * 6);
    return car(`c${i}`, { x, z: lanes[i], ry: 0, yaw2: i === 1 ? 0.28 : i === 2 ? -0.22 : 0, lights: Math.floor(T2 * 7.5 + i) % 2 ? 1 : 2, pitch: T2 >= h && T2 < h + 0.13 ? 3 : 0, spin: x * 90 });
  });
  const kIdx = hits.findIndex((h, i) => T2 >= h && T2 < h + 0.5 && true);
  const cam: Cam = { x: -10.5, y: 2.6, z: 13.2, tx: -11.5, ty: 1.4, tz: 3.2 };
  const st = base4("stacey", { x: ST24.x + 1.3 + nh * 0.2, z: 5.0, y: 0.43 * SCL.stacey + (T2 > 0.35 ? 0.5 : 0), ry: 60, rz: T2 > 0.35 ? -20 : 0, hl: 2, hr: 2, brow: -1, eyeL: 1, eyeR: 1, mouth: 2, alx: 150, alz: 50, ale: 20, arx: 140, arz: 50, are: 20, llx: 40, lrx: 10, llk: 50, lrk: 20 });
  const br = brendaAt(T, { x: BR24.x + 0.6 + nh * 0.2, z: 5.4, y: 0.43 * SCL.brenda + (T2 > 0.6 ? 0.4 : 0), ry: 70, brow: -1, mouth: 2 });
  return {
    cam,
    street: true,
    node: (
      <>
        <Statics />
        <group position={[px, ROAD_Y, 3.2]} rotation={[0, pry, 0]}>
          <Pickup dent={nh} />
        </group>
        {cars}
        {A("stacey", st)}
        {A("brenda", br)}
        {hits.map((h, i) => (
          <React.Fragment key={i}>
            <ImpactLines at={[-14.5 + i * 0.4, 1.4, lanes[i] + 1]} k={Math.round((T2 - h) * 24)} r={1.1} yaw={yawTo(cam, -14.5, lanes[i])} />
            {T2 >= h && T2 < h + 1.0 && <Blast at={[-14.2 + i * 0.5, 1.2, lanes[i] + 0.8]} k={Math.round((T2 - h) * 30)} seed={i + 2} big={0.3} />}
          </React.Fragment>
        ))}
        <Puff position={[px - 1, 2.2, 3.6]} r={0.5 + nh * 0.12} color={nh ? "#8f8ea8" : "#cfd0dc"} />
      </>
    ),
  };
  void kIdx;
};

// =====================================================================================
// ПЛАН 25a: Тони прыгает в патрульку, давит газ и сбивает Маркуса (наклонился за очками)
// =====================================================================================
const MK = { x: -10.2, z: 3.4 };
const T25 = { hit: 1.35 };
const shot25a = (T: number, T2: number): Out => {
  // Тони: бег справа 0-0.53, прыжок 0.53-0.73, дальше внутри
  let tony: React.ReactNode = null;
  if (T < 0.73) {
    const run = T < 0.53;
    const ph = Math.floor(T / 0.133) % 2;
    const x = run ? lerp(0.6, -3.0, T / 0.53) : lerp(-3.0, -3.7, (T - 0.53) / 0.2);
    tony = A(
      "tony",
      base("tony", {
        x, z: run ? 5.2 : 4.6, y: run ? 0.43 * SCL.tony + (ph ? 0.1 : 0) : 0.43 * SCL.tony + 0.8 + (T < 0.6 ? 0.3 : 0), ry: -90, tl: 16, hy: 20, hx: 8, eyeL: 1, eyeR: 1, mouth: 2, brow: 1,
        llx: run ? (ph ? 50 : -40) : 70, lrx: run ? (ph ? -40 : 50) : 30, llk: run ? (ph ? 6 : 70) : 90, lrk: run ? 70 : 40, alx: run ? (ph ? -50 : 50) : 140, arx: run ? (ph ? 50 : -50) : 140, ale: 70, are: 70, hl: 2, hr: 2,
      }),
    );
  }
  const door = T2 < 0.8 ? 68 : T2 < 0.93 ? 30 : 0;
  const go = Math.max(0, T2 - 0.8);
  const hitT = T25.hit;
  const x0 = CAR.x;
  let cx = x0 - 7.5 * go * go;
  const maxX = MK.x + 3.3; // нос машины упирается в Маркуса
  const hit = T2 >= hitT;
  if (cx < maxX - 3.25 + 0.0 && hit) cx = Math.max(cx, -7.3);
  cx = Math.max(cx, -7.4);
  if (hit) cx = -7.4 - (T2 - hitT) * 0.5;
  const pitch = hit && T2 < hitT + 0.2 ? 4 : go > 0 && !hit ? -2 : 0;
  // Маркус: до удара наклонён за очками; после - летит кувырком влево-вверх
  const mk = (() => {
    if (!hit) {
      const ph = Math.floor(T / 0.4) % 2;
      return base("marcus", { x: MK.x, z: MK.z, ry: 95, tl: 74, hx: 10, hy: 20, alx: 150 + ph * 8, alz: 14, ale: 6, arx: 150, arz: 14, are: 6, hl: 0, hr: 0, brow: 1, mouth: 0, acc: 1, llk: 6, lrk: 6, llx: 14, lrx: -6 });
    }
    const t = T2 - hitT;
    return base("marcus", {
      x: MK.x - t * 11, z: MK.z, y: 0.43 * SCL.marcus + 0.4 + t * 7 - t * t * 5, ry: 90, rx: 0, rz: -t * 600, tl: 10, hx: 0, hy: 0, eyeL: 1, eyeR: 1, mouth: 2, brow: 1, acc: 1,
      alx: 150, alz: 60, ale: 20, arx: 140, arz: 60, are: 20, llx: 60, lrx: -40, llk: 40, lrk: 70, llz: 40, lrz: 40,
    });
  })();
  const cam: Cam = { x: -6.2, y: 2.3, z: 12.0, tx: -6.2, ty: 1.5, tz: 3.4 };
  const kh = Math.round((T2 - hitT) * 30);
  return {
    cam,
    street: true,
    node: (
      <>
        <Statics />
        {car("car", { x: cx, z: CAR.z, door, pitch, lights: Math.floor(T2 * 7.5) % 2 ? 1 : 2, crack: 2, spin: -cx * 120 })}
        {tony}
        {A("marcus", mk)}
        {hit && T2 < hitT + 0.5 ? null : (
          <group position={[MK.x - 0.3, ROAD_Y + 0.02, MK.z + 0.5]} rotation={[0, 0.5, 0]}>
            <GlassesProp />
          </group>
        )}
        {hit && T2 >= hitT + 0.5 && (
          <group position={[MK.x - 0.8, ROAD_Y + 0.03, MK.z + 0.6]} rotation={[0, 0.3, 0]}>
            <GlassesProp />
          </group>
        )}
        {hit && <ImpactLines at={[MK.x + 0.3, 1.3, MK.z + 1.6]} k={kh} r={1.0} yaw={yawTo(cam, MK.x, MK.z)} color="#fff6c8" />}
        {hit && kh < 14 && <Tink position={[MK.x + 0.2, 1.8, MK.z + 1.5]} k={Math.floor(kh / 2)} yaw={yawTo(cam, MK.x, MK.z)} size={2.0} />}
        <group position={[0, ROAD_Y, 0]}>
          <GroundDust at={[cx + 3, 0, CAR.z + 1.5]} k={go > 0 ? Math.round(go * 24) % 15 : -1} r={1.0} />
        </group>
      </>
    ),
  };
};

// =====================================================================================
// ПЛАН 25b: Тони высовывается из окна, орёт; граната спецназа подрывает тачку
// =====================================================================================
const CAR25 = { x: -7.5, z: CAR.z };
const shot25b = (T: number, T2: number, sh: ShotT, v: Voices): Out => {
  const vEnd = (sh.vFrom + sh.vLen) / FPS;
  const tg = vEnd + 0.0; // граната прилетает
  const tb = tg + 0.17; // взрыв
  const boom = T2 >= tb;
  const kb = Math.round((T2 - tb) * 30);
  const mouth = mouthOf(sh, v.env[4]);
  const gT = clamp((T2 - (tg - 0.5)) / 0.67);
  const cam: Cam = { x: -7.0, y: 3.0, z: 12.0, tx: -7.4, ty: 2.1, tz: 3.6 };
  // Тони внутри, высунулся по грудь: корпус наклонён к окну
  const beat = Math.floor(T / 0.267) % 2;
  const tony = base("tony", {
    x: CAR25.x - 0.35, z: CAR25.z + 0.8, scale: 1.1, y: 1.4 + 0.1, ry: 8, tl: 38 + beat * 6, hx: -8, hy: beat ? 14 : -10, hz: beat ? 6 : -6, eyeL: 1, eyeR: 1, brow: 1, mouth: mouth ? (mouth === 2 ? 2 : 1) : 0, tear: beat ? 1 : 2,
    alx: 150, alz: 40, ale: 30, arx: 90 + beat * 30, arz: 50, are: 40, llx: 80, lrx: 80, llk: 90, lrk: 90, hl: 2, hr: 2,
  });
  const gx = lerp(-1.8, CAR25.x - 0.4, easeOut(gT));
  const gy = 2.3 + Math.sin(gT * Math.PI) * 1.4 - gT * 0.4;
  const carFly = boom ? { y: Math.min(3.2, kb * 0.28) - Math.max(0, kb - 12) * 0.2, roll: 15 + kb * 14, pitch: kb * 0.6, x: CAR25.x - kb * 0.14 } : { y: 0, roll: 0, pitch: 0, x: CAR25.x };
  const tonyFly = boom ? base("tony", { x: CAR25.x - 2 - kb * 0.5, z: CAR25.z + 1.0, y: 2.0 + kb * 0.3 - kb * kb * 0.012, ry: -60, rz: kb * 40, scale: 1.1, eyeL: 1, eyeR: 1, mouth: 2, alx: 150, alz: 60, arx: 150, arz: 60, ale: 10, are: 10, llx: 50, lrx: -30, llk: 50, lrk: 60 }) : null;
  return {
    cam,
    street: true,
    flash: boom && kb < 2,
    node: (
      <>
        <Statics />
        <group position={[-9.6, ROAD_Y + 0.02, 4.2]}>
          <GlassesProp />
        </group>
        {car("car", { x: carFly.x, y: carFly.y, z: CAR25.z, door: 0, win: 1, roll: carFly.roll, pitch: carFly.pitch, crack: 2, charred: boom && kb > 4, lights: boom ? 0 : (Math.floor(T2 * 7.5) % 2 ? 1 : 2) })}
        {!boom && A("tony", tony)}
        {tonyFly && kb < 28 && A("tony", tonyFly, "tonyfly")}
        {!boom && gT > 0 && (
          <group position={[gx, gy, CAR25.z + 1.6]} rotation={[0, 0, gT * 8]} scale={1.4}>
            <Grenade />
          </group>
        )}
        {boom && <Blast at={[CAR25.x, 1.8, CAR25.z + 1.6]} k={kb} seed={4} big={0.9} yaw={yawTo(cam, CAR25.x, CAR25.z)} />}
        {boom && (
          <group position={[0, ROAD_Y, 0]}>
            <GroundDust at={[CAR25.x - 1, 0, CAR25.z + 2]} k={kb - 4} r={1.6} />
          </group>
        )}
      </>
    ),
  };
};

// =====================================================================================
// ПЛАН 26: Ад позади, Грег (передний план) делает глоток, морщится, плюёт, смотрит в камеру: реплика
// =====================================================================================
const GREG26 = { x: 2.0, z: 4.2 };
const shot26 = (T: number, T2: number, sh: ShotT, v: Voices): Out => {
  const talking = mouthOf(sh, v.env[5]);
  const speakingNow = RAW >= sh.vFrom && RAW < sh.vFrom + sh.vLen;
  // Грег: 0-0.4 стаканчик ко рту, 0.4-0.8 глоток, 0.8-1.2 морщится, 1.2-1.6 плюёт, 1.6-2.1 смотрит в камеру, дальше - реплика с отвращением
  const ks: Array<PPatch & { t: number }> = [
    { t: 0, ry: -8, hy: -6, hx: 2, arx: 100, are: 100, alx: 8, ale: 20, eyeL: 2, eyeR: 2, mouth: 0, brow: -0.4, lx: 0, ly: 0 },
    { t: 0.267, arx: 150, are: 122, hx: -4, cup: 10 },
    { t: 0.533, hx: -16, arx: 154, are: 120, cup: 40, eyeL: 3, eyeR: 3 },
    { t: 0.8, hx: 6, arx: 150, are: 118, cup: 0, mouth: 0, eyeL: 3, eyeR: 3, brow: -1 },
    { t: 0.933, hx: 12, hy: -4, mouth: 6, eyeL: 3, eyeR: 3, brow: -1, tl: 6, arx: 110, are: 100 },
    { t: 1.2, hx: 28, tl: 16, mouth: 2, eyeL: 3, eyeR: 3, arx: 70, are: 80, hy: 6 },
    { t: 1.467, hx: 10, tl: 8, mouth: 4, eyeL: 2, eyeR: 2, brow: -1, arx: 60, are: 90 },
    { t: 1.733, hx: 0, hy: 0, ry: 0, tl: 0, mouth: 4, eyeL: 2, eyeR: 2, arx: 38, are: 84, brow: -1 },
  ];
  let gp = base("greg", { x: GREG26.x, z: GREG26.z, scale: 1.55, y: 0.43 * 1.55, alz: 10, ...seg(ks, T) });
  if (speakingNow) {
    const bt = beatAt(T - sh.vFrom / FPS, [
      [0.4, { hy: 8, hx: -6, hz: 4, ale: 30, alx: 26 }],
      [0.533, { hy: -6, hx: 4, hz: -4, arx: 60, are: 90 }],
      [0.4, { hy: 4, hx: -10, hz: 0, alx: 40, ale: 60 }],
    ] as ReadonlyArray<Beat<PPatch>>).p;
    gp = { ...gp, ...bt, mouth: talking ? (talking === 2 ? 6 : 3) : 0, brow: -1 };
  }
  gp = { ...gp, y: gp.y };
  const spitK = Math.round((T2 - 1.2) * 30);
  const dolly = lerp(12.8, 9.8, clamp(T2 / (sh.len / FPS)));
  const cam: Cam = { x: 1.0, y: 3.0, z: dolly, tx: 1.1, ty: 2.0, tz: 4.0 };
  const tick = Math.floor(T2 * 10);
  const fl = Math.floor(T2 * 15);
  const jk = gunHold(base4("jackson", { x: -3.4, z: 1.4, ry: 20, tl: -14, hx: -12, hy: 10 * (Math.floor(T * 5) % 2 ? 1 : -1), eyeL: 1, eyeR: 1, ps: 1, mouth: 2, brow: -1, sp: 1, gun: 1, gx: 0.2, gy: 0.75, gz: 0.4, gp: 70, y: 0.43 * SCL.jackson + 0.05, mst: tick % 2 }));
  const sw = base4("swat", { x: -0.9, z: 1.3, ry: -70, rx: -8, tl: -10, hx: -20, hy: 10, y: 0.43 * SCL.swat + 0.5, eyeL: 1, eyeR: 1, mouth: 2, tg: 1, llx: -20, lrx: 10, llk: 30, lrk: 10, alx: 80, alz: 40, ale: 30, arx: 80, arz: 40, are: 30, hl: 2, hr: 2 });
  const br = base4("brenda", { x: 0.7, z: 1.3, ry: -90, tl: 10, hx: 4, brow: -1, mouth: 5, hl: 2, hr: 2, alx: 100 + (tick % 2 ? 6 : -6), alz: 10, ale: 6, arx: 100 + (tick % 2 ? -6 : 6), arz: 10, are: 6, llz: 14, lrz: 14, llx: 12, lrx: -8, llk: 10, lrk: 10 });
  return {
    cam,
    street: true,
    node: (
      <>
        {/* задник: перевёрнутая горящая патрулька, горящий пикап, бак с рукой Хлои, потасовка, сирены */}
        <Statics lid={0} dump={false} vend={false} />
        {car("flip", { x: -4.4, y: 1.0, z: 1.8, roll: 180, charred: true, crack: 2, pitch: 6, ry: 0.5 })}
        <Flame position={[-4.0, 1.6, 2.6]} scale={1.3} frame={fl} />
        <Flame position={[-5.4, 1.4, 2.6]} scale={0.9} frame={fl + 3} />
        <Flame position={[-2.8, 1.0, 2.6]} scale={0.7} frame={fl + 5} />
        <SmokeColumn x={-4.6} y={2.4} z={1.0} frame={T2 * 30} n={7} dark h={4.2} />
        <group position={[-9.0, ROAD_Y, 1.6]} rotation={[0, 0.6, 0]}>
          <Pickup dent={3} />
        </group>
        <Flame position={[-9.0, 1.9, 2.8]} scale={1.4} frame={fl + 2} />
        <Flame position={[-10.4, 1.6, 2.8]} scale={0.9} frame={fl + 6} />
        <SmokeColumn x={-9.4} y={2.6} z={0.8} frame={T2 * 30 + 6} n={7} dark h={4.6} />
        {car("siren", { x: 6.4, z: 0.8, ry: -0.4, lights: Math.floor(T2 * 7.5) % 2 ? 1 : 2 })}
        <group position={[5.0, ROAD_Y, 1.4]}>
          <Dumpster lid={14} ajar />
        </group>
        <group position={[5.4, ROAD_Y + 1.5, 1.4]} rotation={[0, 0, -0.18 + (tick % 2 ? 0.05 : -0.05)]}>
          <HandOut />
          <Flame position={[0, 2.5, 0.1]} scale={0.55} frame={fl} />
        </group>
        {A("jackson", jk)}
        {A("swat", sw)}
        {A("brenda", br)}
        <SmokeColumn x={3.6} y={1.0} z={0.6} frame={T2 * 30 + 3} n={5} dark={false} h={2.6} />
        {A("greg", gp)}
        <Spit from={wp(gp, [0.0, 0.95, 0.6])} groundY={ROAD_Y} k={spitK} />
      </>
    ),
  };
};

// =====================================================================================
export const renderShot = (frame: number, sh: ShotT, v: Voices): Out => {
  const fr = frame - sh.from;
  const f = Math.floor(fr / STEP) * STEP;
  const f2 = Math.floor(fr / 2) * 2;
  RAW = f2;
  const T = f / FPS;
  const T2 = f2 / FPS;
  switch (sh.id) {
    case "s19": return shot19(T, T2);
    case "s20": return shot20(T, sh, v);
    case "s21": return shot21(T, T2, f2);
    case "s22a": return shot22a(T);
    case "s22b": return shot22b(T, T2);
    case "s23a": return shot23a(T, T2, sh, v);
    case "s23b": return shot23b(T, T2, sh, v);
    case "s24a": return shot24a(T, T2, sh, v);
    case "s24b": return shot24b(T, T2);
    case "s25a": return shot25a(T, T2);
    case "s25b": return shot25b(T, T2, sh, v);
    case "s26": return shot26(T, T2, sh, v);
    default: return { cam: { x: 0, y: 0, z: 6, tx: 0, ty: 0 }, street: false, node: null };
  }
};
void Chunk;
void circleGeo;
void INK;
void Shards;
void Muzzle;
