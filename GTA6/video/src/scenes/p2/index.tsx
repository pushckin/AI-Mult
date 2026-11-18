// Сборка части 2 из сцен. Границы сцен — по cue (см. lines.mjs).
import { SceneDef } from "../types";
import { SCENES as BREAKTHROUGH } from "./breakthrough";
import { SCENES as FINALE } from "./finale";
import { DEMO } from "../KitDemo";
export const P2_SCENES: SceneDef[] = [...BREAKTHROUGH, ...FINALE, ...DEMO("p2")];
