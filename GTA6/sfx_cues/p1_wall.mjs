// Звуки сцены p1_wall. Формат: { cue: 'p1_pm1', at: 0.5, sfx: 'mug_crash', gain: 0.7, from?: 'end', len?: сек }
export default [
  // стена вырастает
  { cue: 'p1_wall', at: 0, sfx: 'ocean', gain: 0.35, len: 4.6 },
  { cue: 'p1_wall', at: 0, sfx: 'crowd_murmur', gain: 0.45, len: 4.6 },
  { cue: 'p1_wall', at: 0.3, sfx: 'wall_rise', gain: 0.95 },
  { cue: 'p1_wall', at: 0.5, sfx: 'rumble_low', gain: 0.6 },
  // командир в мегафон
  { cue: 'p1_cmd1', at: -0.35, sfx: 'megaphone_on', gain: 0.75 },
  { cue: 'p1_cmd1', at: 0, sfx: 'crowd_murmur', gain: 0.3 },
  { cue: 'p1_cmd1', at: -1.2, sfx: 'crowd_murmur', gain: 0.3, from: 'end', len: 1.3 },
  // огонь, падения, пирамида, катапульты, колючка
  { cue: 'p1_shoot', at: 0, sfx: 'gunfire', gain: 0.8 },
  { cue: 'p1_shoot', at: 0.9, sfx: 'gunfire_single', gain: 0.5 },
  { cue: 'p1_shoot', at: 1.5, sfx: 'gunfire', gain: 0.7 },
  { cue: 'p1_shoot', at: 1.2, sfx: 'stampede', gain: 0.45, len: 5.0 },
  { cue: 'p1_shoot', at: 1.55, sfx: 'body_thud', gain: 0.6 },
  { cue: 'p1_shoot', at: 1.85, sfx: 'body_thud', gain: 0.55 },
  { cue: 'p1_shoot', at: 2.2, sfx: 'body_thud', gain: 0.6 },
  { cue: 'p1_shoot', at: 2.55, sfx: 'body_thud', gain: 0.5 },
  { cue: 'p1_shoot', at: 2.3, sfx: 'catapult', gain: 0.6 },
  { cue: 'p1_shoot', at: 2.85, sfx: 'catapult', gain: 0.55 },
  { cue: 'p1_shoot', at: 3.0, sfx: 'gunfire', gain: 0.6 },
  { cue: 'p1_shoot', at: 3.1, sfx: 'catapult', gain: 0.6 },
  { cue: 'p1_shoot', at: 3.4, sfx: 'whoosh', gain: 0.6 },
  { cue: 'p1_shoot', at: 3.65, sfx: 'catapult', gain: 0.5 },
  { cue: 'p1_shoot', at: 4.0, sfx: 'comedic_boing', gain: 0.45 },
  { cue: 'p1_shoot', at: 4.65, sfx: 'electric_zap', gain: 0.75 },
  { cue: 'p1_shoot', at: 4.95, sfx: 'electric_zap', gain: 0.65 },
  { cue: 'p1_shoot', at: 5.2, sfx: 'electric_zap', gain: 0.7 },
  { cue: 'p1_shoot', at: 5.5, sfx: 'electric_zap', gain: 0.6 },
  { cue: 'p1_shoot', at: 4.7, sfx: 'gunfire', gain: 0.5 },
  // хор
  { cue: 'p1_chant', at: 0, sfx: 'crowd_roar_swell', gain: 0.45 },
  { cue: 'p1_chant', at: -5.3, sfx: 'crowd_roar_swell', gain: 0.5, from: 'end' },
];
