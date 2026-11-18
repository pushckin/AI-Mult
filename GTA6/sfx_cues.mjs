// Расстановка звуковых эффектов: собирается из sfx_cues/<сцена>.mjs (у каждой сцены свой файл).
// Формат записи: { cue: 'p1_pm1', at: 0.5, sfx: 'mug_crash', gain: 0.7, from?: 'end', len?: сек }
// cue — id реплики/бита из lines.mjs, at — сдвиг от начала cue (или от конца при from: 'end').
import bunker from './sfx_cues/p1_bunker.mjs';
import wall from './sfx_cues/p1_wall.mjs';
import interrogation from './sfx_cues/p1_interrogation.mjs';
import breakthrough from './sfx_cues/p2_breakthrough.mjs';
import finale from './sfx_cues/p2_finale.mjs';
export const SFX_CUES = { p1: [...bunker, ...wall, ...interrogation], p2: [...breakthrough, ...finale] };
