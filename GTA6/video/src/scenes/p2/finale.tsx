// Часть 2, сцены 2–3: «Обратный отсчёт» + «Финал». Все тайминги — от cue.
import React from "react";
import { SceneDef } from "../types";
import { cue, part, prog, easeInOut, easeOut, easeIn, shake, mouthFor, clamp01, lerp, noise1, twos } from "../../kit/anim";
import { Cam } from "../../kit/Stage";
import { Fade } from "../../kit/Overlays";
import { SpaceNZ, Stars, EndBlink } from "./finale_world";
import { FacadeSet, BarnSet, BeachSet, BunkerSet, GamerRoom, BoomSet, SilenceSet, DarkRoom, DarkCity } from "./finale_sets";
import { ShoutText, TimerHUD, StartStamp, LoadingScreen, BoomText, PhoneScreen, EndCard } from "./finale_overlays";

const C = (id: string) => cue("p2", id);
const SP = C("p2_space"), ENG = C("p2_eng"), GO = C("p2_go"), FL = C("p2_flash"), SIL = C("p2_silence"), PH = C("p2_phone"), G3 = C("p2_gamer3"), SC = C("p2_scream"), END = C("p2_end");
const ENGD = ENG.end - ENG.start;
const TOTAL = part("p2").duration + 1;

// ---- ключевые моменты ----
const T_TICK4 = SP.start + 1, T_TICK3 = SP.start + 2;
const T_TICK2 = Math.max(ENG.start + ENGD * 0.35, ENG.end - 3.7); // от конца реплики — совпадает с бипом в sfx_cues
const T_TICK1 = GO.start, T_TICK0 = GO.start + 1.0;
const T_NEON_LOAD = FL.start + 0.6;     // космос-неон → загрузочный экран
const T_BOOM = FL.start + 1.3;          // взрыв (музыка глушится отсюда)
const T_DARKSPACE = FL.start + 2.3;     // вид из космоса: страна гаснет
const T_PHONE_UI = PH.start + 0.9;      // экран телефона на весь кадр
const T_G3_CU = G3.start + Math.min(1.1, (G3.end - G3.start) * 0.4);
const T_CITY = G3.end + 0.2;
const SCD = SC.end - SC.start;
const LONG_SCREAM = SCD > 3.5; // длинный крик — монтаж: город → квартира → окна → космос
const T_SC_SPACE = LONG_SCREAM ? SC.start + SCD * 0.62 : SC.start + Math.max(0.55, SCD * 0.5);
const T_SC_ROOM = LONG_SCREAM ? SC.start + SCD * 0.24 : T_SC_SPACE;
const T_SC_WIN = LONG_SCREAM ? SC.start + SCD * 0.43 : T_SC_SPACE;
const T_NEEDLE_BREAK = Math.max(ENG.start + ENGD * 0.74 + 0.3, ENG.end - 1.6); // треск стекла gauge_overload

function timerSec(t: number) {
  if (t < T_TICK4) return 5;
  if (t < T_TICK3) return 4;
  if (t < T_TICK2) return 3;
  if (t < T_TICK1) return 2;
  if (t < T_TICK0) return 1;
  return 0;
}
function tickAge(t: number) {
  const ticks = [SP.start, T_TICK4, T_TICK3, T_TICK2, T_TICK1, T_TICK0];
  let last = SP.start;
  for (const x of ticks) if (t >= x) last = x;
  return t - last;
}
/** сотые доли: «слоу-мо» — секунды 3 и 2 тянутся через всю реплику инженера, 1 — пролетает за секунду */
function timerCs(t: number): number | null {
  const tq = Math.floor(t * 12) / 12;
  let v: number;
  if (t < T_TICK3 || t >= T_TICK0) return null;
  if (t < T_TICK2) v = 0.99 * (1 - prog(tq, T_TICK3, T_TICK2));
  else if (t < T_TICK1) v = 0.99 * (1 - prog(tq, T_TICK2, T_TICK1));
  else v = 0.99 * (1 - prog(tq, T_TICK1, T_TICK0));
  return Math.round(v * 100);
}
const isSlow = (t: number) => t >= T_TICK3 + 0.3 && t < T_TICK1;
const hud = (t: number, small = false) => <TimerHUD sec={timerSec(t)} cs={timerCs(t)} slow={isSlow(t)} t={t} tick={tickAge(t)} small={small} />;

// ---- стрелка прибора ----
function needleAngle(t: number) {
  const u = prog(t, ENG.start, T_NEEDLE_BREAK);
  const jit = noise1(twos(t) * 40) * 0.06 * (0.3 + u);
  let a = 1.15 - 2.35 * easeIn(Math.pow(u, 0.7)) + jit;
  if (t > T_NEEDLE_BREAK) a = -1.35 - 0.12 * easeOut(prog(t, T_NEEDLE_BREAK, T_NEEDLE_BREAK + 0.3)) + jit * 0.5;
  return a;
}
const bunkerState = (t: number) => ({ t, needle: needleAngle(t), broke: t > T_NEEDLE_BREAK ? prog(t, T_NEEDLE_BREAK, T_NEEDLE_BREAK + 1.2) + 0.001 : 0, mouth: mouthFor("p2", ["p2_eng"], t), tsec: timerSec(t), tcs: timerCs(t) ?? 0 });

// ---- космос ----
const space = (t: number, opts: { z: number; lights: number; wave?: number; neon?: number; buzz?: number; rings?: number; burn?: number; shk?: [number, number]; look?: [number, number, number] }) => {
  const [sx, sy] = opts.shk ?? [0, 0];
  return (
    <>
      <Cam pos={[0.15 + sx, -0.1 + sy, opts.z]} look={opts.look ?? [0.05, -0.05, 0]} fov={40} />
      <ambientLight intensity={0.9} />
      <directionalLight position={[-6, 4, 8]} intensity={1.6} />
      <Stars />
      <SpaceNZ t={t} lights={opts.lights} wave={opts.wave} neon={opts.neon} buzz={opts.buzz} rings={opts.rings} burn={opts.burn} />
    </>
  );
};

export const SCENES: SceneDef[] = [
  // ===== p2_space: Новая Зеландия гудит из космоса =====
  {
    id: "fin_space", from: SP.start, to: SP.start + 1.5, bg: "#04060e",
    render3d: (t) => {
      const k = prog(t, SP.start, SP.start + 1.5);
      return space(t, { z: lerp(30, 7.6, easeInOut(k)), lights: 1, buzz: 1, look: [0, lerp(0, -0.25, k), 0] });
    },
    overlay: (t) => hud(t),
  },
  {
    id: "fin_windows", from: SP.start + 1.5, to: SP.start + 2.3, bg: "#0d1430",
    render3d: (t) => {
      const k = prog(t, SP.start + 1.5, SP.start + 2.3);
      return <>
        <Cam pos={[lerp(0.9, 0.4, k), lerp(2.0, 1.7, k), lerp(6.6, 5.2, easeOut(k))]} look={[0, 1.2, 0]} fov={40} />
        <FacadeSet t={t} sec={timerSec(t)} />
      </>;
    },

  },
  {
    id: "fin_barn", from: SP.start + 2.3, to: SP.start + 3.05, bg: "#0d1430",
    render3d: (t) => {
      const k = prog(t, SP.start + 2.3, SP.start + 3.05);
      return <>
        <Cam pos={[lerp(-0.6, -0.2, k), 1.5, lerp(7.4, 6.4, easeOut(k))]} look={[0, 1.15, 0]} fov={40} />
        <BarnSet t={t} sec={timerSec(t)} />
      </>;
    },

  },
  {
    id: "fin_beach", from: SP.start + 3.05, to: ENG.start, bg: "#0b1230",
    render3d: (t) => {
      const k = prog(t, SP.start + 3.05, ENG.start);
      return <>
        <Cam pos={[lerp(0.4, 0.1, k), 1.0, lerp(4.6, 3.9, easeOut(k))]} look={[-0.1, 0.8, -0.5]} fov={40} />
        <BeachSet t={t} sec={timerSec(t)} />
      </>;
    },

  },

  // ===== p2_eng: бункер =====
  {
    id: "fin_bunker_wide", from: ENG.start, to: ENG.start + ENGD * 0.3, bg: "#2a2c30",
    render3d: (t) => {
      const k = prog(t, ENG.start, ENG.start + ENGD * 0.3);
      return <>
        <Cam pos={[lerp(0.2, 0.3, k), 2.3, lerp(7.8, 7.2, k)]} look={[0.25, 1.05, 0]} fov={40} />
        <BunkerSet {...bunkerState(t)} />
      </>;
    },
  },
  {
    id: "fin_bunker_eng", from: ENG.start + ENGD * 0.3, to: ENG.start + ENGD * 0.52, bg: "#2a2c30",
    render3d: (t) => {
      const k = prog(t, ENG.start + ENGD * 0.3, ENG.start + ENGD * 0.52);
      return <>
        <Cam pos={[lerp(1.45, 1.3, k), 1.3, lerp(2.6, 2.2, k)]} look={[0.98, 1.25, -1.2]} fov={40} />
        <BunkerSet {...bunkerState(t)} />
      </>;
    },
    overlay: (t) => hud(t, true),
  },
  {
    id: "fin_bunker_table", from: ENG.start + ENGD * 0.52, to: ENG.start + ENGD * 0.74, bg: "#2a2c30",
    render3d: (t) => {
      const k = prog(t, ENG.start + ENGD * 0.52, ENG.start + ENGD * 0.74);
      return <>
        <Cam pos={[-0.3, 0.75, lerp(3.4, 2.9, k)]} look={[-0.3, 0.55, 0]} fov={40} />
        <BunkerSet {...bunkerState(t)} showEngineer={false} />
      </>;
    },
    overlay: (t) => hud(t, true),
  },
  {
    id: "fin_bunker_gauge", from: ENG.start + ENGD * 0.74, to: GO.start, bg: "#2a2c30",
    render3d: (t) => {
      const k = prog(t, ENG.start + ENGD * 0.74, GO.start);
      const [sx, sy] = shake(t, T_NEEDLE_BREAK, 0.08, 0.6);
      return <>
        <Cam pos={[0.65 + sx, 2.2 + sy, lerp(1.1, 0.7, easeOut(k))]} look={[0.65 + sx, 2.2 + sy, -1.85]} fov={40} />
        <BunkerSet {...bunkerState(t)} />
      </>;
    },
  },

  // ===== p2_go: 00:00:01 … 00:00:00 СТАРТ! =====
  {
    id: "fin_go_count", from: GO.start, to: T_TICK0, bg: "#0d1430",
    render3d: (t) => {
      const k = prog(t, GO.start, T_TICK0);
      if (k < 0.5) {
        return <>
          <Cam pos={[-1.55, 2.95, lerp(3.2, 2.5, k * 2)]} look={[-1.55, 2.85, 0]} fov={40} />
          <FacadeSet t={t} sec={1} />
        </>;
      }
      return <>
        <Cam pos={[0, 0.95, lerp(3.0, 2.3, (k - 0.5) * 2)]} look={[0, 0.95, -0.92]} fov={40} />
        <BarnSet t={t} sec={1} />
      </>;
    },
    overlay: (t) => hud(t),
  },
  {
    id: "fin_go_start", from: T_TICK0, to: FL.start, bg: "#2a3158",
    render3d: (t) => {
      const k = prog(t, T_TICK0, FL.start);
      const up = easeOut(prog(t, T_TICK0 + 0.12, T_TICK0 + 0.3));
      const [sx, sy] = shake(t, T_TICK0 + 0.15, 0.12, 0.5);
      return <>
        <Cam pos={[sx, 1.2 + sy, lerp(7.4, 6.8, k)]} look={[0, 0.95, 0]} fov={40} />
        <GamerRoom t={t} up={up} />
      </>;
    },
    overlay: (t) => <>
      {t < T_TICK0 + 0.15 && hud(t)}
      <StartStamp k={t - (T_TICK0 + 0.12)} t={t} />
    </>,
  },

  // ===== p2_flash: неон → БАБАХ → темнота =====
  {
    id: "fin_neon_space", from: FL.start, to: T_NEON_LOAD, bg: "#04060e",
    render3d: (t) => {
      const k = prog(t, FL.start, T_NEON_LOAD);
      return space(t, { z: lerp(9, 11, k), lights: 0.4, neon: 1, buzz: 0.6 });
    },
    overlay: (t) => <Fade opacity={1 - prog(t, FL.start, FL.start + 0.25)} color="#ffffff" />,
  },
  {
    id: "fin_loading", from: T_NEON_LOAD, to: T_BOOM, bg: "#1c0638",
    render3d: () => null,
    overlay: (t) => <LoadingScreen k={prog(t, T_NEON_LOAD, T_BOOM)} flash={1 - prog(t, T_NEON_LOAD, T_NEON_LOAD + 0.15)} />,
  },
  {
    id: "fin_boom", from: T_BOOM, to: T_DARKSPACE, bg: "#4a1a22",
    render3d: (t) => {
      const k = t - T_BOOM;
      const [sx, sy] = shake(t, T_BOOM, 0.35, 1.2);
      return <>
        <Cam pos={[sx, 1.6 + sy, lerp(6.0, 6.8, easeOut(k / 1.6))]} look={[0, 1.6, -3]} fov={40} roll={sx * 0.15} />
        <BoomSet t={t} k={k} tb={T_BOOM} />
      </>;
    },
    overlay: (t) => <>
      <Fade opacity={1 - prog(t, T_BOOM, T_BOOM + 0.2)} color="#ffffff" />
      <BoomText k={prog(t, T_BOOM + 0.05, T_BOOM + 1.2)} t={t} />
    </>,
  },
  {
    id: "fin_dark_space", from: T_DARKSPACE, to: SIL.start, bg: "#04060e",
    render3d: (t) => {
      const k = t - T_DARKSPACE;
      // 0.2 с горит → волна темноты с севера на юг (0.6 с, с миганием) → кромешная тьма
      const wave = prog(k, 0.2, 0.8);
      const flick = k > 0.2 && k < 0.8 && Math.floor(k * 15) % 3 === 0 ? 0.55 : 1;
      const [sx, sy] = shake(t, T_DARKSPACE + 0.2, 0.1, 0.6);
      return space(t, { z: lerp(8.0, 9.2, easeOut(prog(t, T_DARKSPACE, SIL.start))), lights: wave >= 1 ? 0 : flick, wave, burn: clamp01((k - 0.3) * 2) * 0.8, shk: [sx, sy] });
    },
  },

  // ===== p2_silence =====
  {
    id: "fin_silence", from: SIL.start, to: PH.start, bg: "#070b16",
    render3d: (t) => {
      const k = prog(t, SIL.start, PH.start);
      return <>
        <Cam pos={[lerp(0.6, 0.1, k), 1.0, lerp(5.8, 4.6, easeInOut(k))]} look={[-0.2, 0.9, -1.5]} fov={40} />
        <SilenceSet t={t} t0={SIL.start} />
      </>;
    },
    overlay: (t) => <Fade opacity={1 - prog(t, SIL.start, SIL.start + 0.5)} />,
    hideSubs: () => true,
  },

  // ===== p2_phone =====
  {
    id: "fin_phone", from: PH.start, to: G3.start, bg: "#05060a",
    render3d: (t) => {
      const k = prog(t, PH.start, G3.start);
      const phone = t > PH.start + 0.3 ? 1 : 0.75;
      return <>
        <Cam pos={[0.45, 1.1, lerp(4.2, 3.7, k)]} look={[0.4, 0.95, 0.5]} fov={40} />
        <DarkRoom t={t} phone={phone} scream={0} mouth={0} />
      </>;
    },
    overlay: (t) => <>
      {t > T_PHONE_UI && <Fade opacity={0.45} />}
      <PhoneScreen k={t - T_PHONE_UI} t={t} />
    </>,
    hideSubs: () => true,
  },

  // ===== p2_gamer3 =====
  {
    id: "fin_gamer3_wide", from: G3.start, to: T_G3_CU, bg: "#05060a",
    render3d: (t) => {
      const k = prog(t, G3.start, T_G3_CU);
      return <>
        <Cam pos={[lerp(-0.3, -0.15, k), 1.0, lerp(5.0, 4.6, k)]} look={[-0.35, 0.55, 0]} fov={40} />
        <DarkRoom t={t} phone={1} scream={0} mouth={mouthFor("p2", ["p2_gamer3"], t)} tvLook />
      </>;
    },
  },
  {
    id: "fin_gamer3_cu", from: T_G3_CU, to: T_CITY, bg: "#05060a",
    render3d: (t) => {
      const k = prog(t, T_G3_CU, G3.end);
      const m = mouthFor("p2", ["p2_gamer3"], t);
      const late = prog(t, T_G3_CU, G3.end) > 0.45;
      const [sx, sy] = late ? shake(t, T_G3_CU + (G3.end - T_G3_CU) * 0.45, 0.04, 0.8) : [0, 0];
      return <>
        <Cam pos={[0.35 + sx, 1.25 + sy, lerp(3.4, 2.8, easeInOut(k))]} look={[0.35 + sx, 1.05 + sy, 0.5]} fov={40} />
        <DarkRoom t={t} phone={1} scream={late ? 1 : 0} mouth={Math.max(m, late ? 0.5 : 0)} tvLook={!late} />
      </>;
    },
  },

  // ===== p2_scream: отъезд из окна в космос =====
  {
    id: "fin_scream_city", from: T_CITY, to: T_SC_ROOM, bg: "#04060e",
    render3d: (t) => {
      const k = easeIn(prog(t, T_CITY + 0.15, T_SC_ROOM));
      const [sx, sy] = t > SC.start ? shake(t, SC.start, 0.25, 2.0, 22) : [0, 0];
      return <>
        <Cam pos={[lerp(0.22, 0, k) + sx, lerp(3.5, 9, k) + sy, lerp(3.2, 26, k)]} look={[lerp(0.22, 0, k), lerp(3.6, 4.5, k), 0]} fov={40} roll={sx * 0.2} />
        <DarkCity t={t} />
      </>;
    },
  },
  {
    id: "fin_scream_room", from: T_SC_ROOM, to: T_SC_WIN, bg: "#0b0d18",
    render3d: (t) => {
      const k = prog(t, T_SC_ROOM, T_SC_WIN);
      const [sx, sy] = shake(t, T_SC_ROOM, 0.12, 3, 22);
      const [jx, jy] = [noise1(t * 30) * 0.03, noise1(t * 30 + 9) * 0.03];
      return <>
        <Cam pos={[sx + jx, 1.2 + sy + jy, lerp(6.4, 7.6, easeOut(k))]} look={[0, 0.95, 0]} fov={40} roll={jx} />
        <GamerRoom t={t} up={1} glowC="#6a7ab8" light={0.45} />
      </>;
    },
  },
  {
    id: "fin_scream_windows", from: T_SC_WIN, to: T_SC_SPACE, bg: "#0d1430",
    render3d: (t) => {
      const k = prog(t, T_SC_WIN, T_SC_SPACE);
      const [jx, jy] = [noise1(t * 30) * 0.04, noise1(t * 30 + 9) * 0.04];
      return <>
        <Cam pos={[lerp(0.3, 0, k) + jx, lerp(1.6, 3.0, k) + jy, lerp(6.0, 9.5, easeOut(k))]} look={[0, lerp(1.6, 2.4, k), 0]} fov={40} roll={jx} />
        <FacadeSet t={t} sec={0} dark />
      </>;
    },
    overlay: (t) => <ShoutText t={t} t0={T_SC_WIN} />,
  },
  {
    id: "fin_scream_space", from: T_SC_SPACE, to: END.start, bg: "#04060e",
    render3d: (t) => {
      const k = prog(t, T_SC_SPACE, END.start + 2.5);
      const [sx, sy] = shake(t, T_SC_SPACE, 0.5, 2.2, 22);
      return space(t, { z: lerp(7, 15, easeOut(k)), lights: 0, burn: 0.5, rings: (t - T_SC_SPACE) * 0.9, shk: [sx, sy] });
    },
  },
  // ===== p2_end =====
  {
    id: "fin_end", from: END.start, to: TOTAL, bg: "#04060e",
    render3d: (t) => {
      const k0 = prog(END.start, T_SC_SPACE, END.start + 2.5);
      const z0 = lerp(7, 15, easeOut(k0));
      const z = lerp(z0, z0 - 3.5, easeInOut(prog(t, END.start, TOTAL)));
      const [sx, sy] = shake(t, T_SC_SPACE, 0.5, 2.2, 22);
      return <>
        {space(t, { z, lights: 0, burn: 0.5, rings: (t - T_SC_SPACE) * 0.9, shk: [sx, sy] })}
        <EndBlink t={t} />
      </>;
    },
    overlay: (t) => <>
      <Fade opacity={0.35 * prog(t, END.start, END.start + 0.4)} />
      <EndCard k={t - END.start} />
    </>,
    hideSubs: () => true,
  },
];
