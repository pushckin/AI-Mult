// Звуки сцены p2_breakthrough. Формат: { cue: 'p1_pm1', at: 0.5, sfx: 'mug_crash', gain: 0.7, from?: 'end', len?: сек }
// Тайминги совпадают с константами в video/src/scenes/p2/breakthrough_*.tsx (всё от начала cue).
export default [
  // --- p2_open: стена рушится, волна, карта ---
  { cue: 'p2_open', at: 0.0, sfx: 'rumble_low', gain: 0.8 },
  { cue: 'p2_open', at: 0.15, sfx: 'concrete_crack', gain: 0.6, len: 1.0 },
  { cue: 'p2_open', at: 0.75, sfx: 'wall_collapse', gain: 0.95 },
  { cue: 'p2_open', at: 0.9, sfx: 'crowd_roar_swell', gain: 0.6 },
  { cue: 'p2_open', at: 1.55, sfx: 'tank_crunch', gain: 0.8 },
  { cue: 'p2_open', at: 1.8, sfx: 'whoosh', gain: 0.5 },
  { cue: 'p2_open', at: 1.95, sfx: 'sheep_baa', gain: 0.6 },
  { cue: 'p2_open', at: 2.0, sfx: 'stampede', gain: 0.6, len: 3.0 },
  { cue: 'p2_open', at: 2.2, sfx: 'body_thud', gain: 0.5 },
  { cue: 'p2_open', at: 2.35, sfx: 'whoosh', gain: 0.45 },
  { cue: 'p2_open', at: 2.6, sfx: 'sheep_baa', gain: 0.55 },
  { cue: 'p2_open', at: 2.9, sfx: 'comedic_boing', gain: 0.35 },
  { cue: 'p2_open', at: 3.45, sfx: 'crowd_murmur', gain: 0.45, len: 1.8 },
  { cue: 'p2_open', at: 3.7, sfx: 'sheep_crowd', gain: 0.3 },
  // --- новости ---
  { cue: 'p2_news1', at: -0.15, sfx: 'news_jingle', gain: 0.55 },
  { cue: 'p2_news1', at: 3.2, sfx: 'glass_break', gain: 0.85 },   // ≈ 0.44 длительности news1 (см. CRASH_AT)
  { cue: 'p2_news1', at: 3.62, sfx: 'body_thud', gain: 0.7 },
  { cue: 'p2_cord', at: 0.0, sfx: 'cord_yank', gain: 0.9 },
  { cue: 'p2_cord', at: 0.6, sfx: 'tv_static', gain: 0.6 },
  { cue: 'p2_news2', at: 0.0, sfx: 'tv_static', gain: 0.25, len: 1.6 },
  { cue: 'p2_news2', at: -0.3, sfx: 'power_down', gain: 0.4, from: 'end' },
  // --- квартира ---
  { cue: 'p2_door', at: 0.3, sfx: 'door_kick', gain: 0.95 },
  { cue: 'p2_door', at: 0.55, sfx: 'stampede', gain: 0.45, len: 1.5 },
  { cue: 'p2_door', at: 1.25, sfx: 'power_down', gain: 0.75 },
  { cue: 'p2_door', at: 1.5, sfx: 'ventilator_stop', gain: 0.8 },
  { cue: 'p2_door', at: 2.17, sfx: 'plug_clack', gain: 0.9 },
  { cue: 'p2_door', at: 2.45, sfx: 'plug_clack', gain: 0.9 },
  { cue: 'p2_door', at: 2.69, sfx: 'plug_clack', gain: 0.7 },
  { cue: 'p2_door', at: 2.81, sfx: 'plug_clack', gain: 0.7 },
  { cue: 'p2_door', at: 2.93, sfx: 'plug_clack', gain: 0.7 },
  { cue: 'p2_door', at: 3.05, sfx: 'electric_zap', gain: 0.75 },
  { cue: 'p2_gamer2', at: 0.45, sfx: 'hdmi_click', gain: 0.9 },
  { cue: 'p2_gamer2', at: 0.5, sfx: 'start_chime', gain: 0.25, len: 1.2 },
];
