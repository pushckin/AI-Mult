// Сборка части 1 из сцен. Границы сцен — по cue (см. lines.mjs). Не править в сценах-исполнителях.
import { SceneDef } from "../types";
import { SCENES as BUNKER } from "./bunker";
import { SCENES as WALL } from "./wall";
import { SCENES as INTERROGATION } from "./interrogation";
import { DEMO } from "../KitDemo";
export const P1_SCENES: SceneDef[] = [...BUNKER, ...WALL, ...INTERROGATION, ...DEMO("p1")];
