// Звуки сцены p1_bunker. Формат: { cue: 'p1_pm1', at: 0.5, sfx: 'mug_crash', gain: 0.7, from?: 'end', len?: сек }
// Смещения внутри длинных реплик — доли от текущей длительности (куски субтитров), пересчитывать при сильной переозвучке.
export default [
  // открытие: гул бункера, счётчик, кружка
  { cue: 'p1_open', at: -0.1, sfx: 'rumble_low', gain: 0.45 },
  { cue: 'p1_open', at: 0.25, sfx: 'counter_spin', gain: 0.75 },
  { cue: 'p1_open', at: 1.65, sfx: 'whoosh', gain: 0.35 },
  { cue: 'p1_open', at: 2.25, sfx: 'mug_crash', gain: 0.85 },
  // министр обороны: океан под докладом, «Боинг», паром, матрасы
  { cue: 'p1_def1', at: 0.0, sfx: 'ocean', gain: 0.35 },
  { cue: 'p1_def1', at: 2.0, sfx: 'jet_crash', gain: 0.75 },
  { cue: 'p1_def1', at: 5.4, sfx: 'splash', gain: 0.6 },
  { cue: 'p1_def1', at: 6.2, sfx: 'splash', gain: 0.5 },
  { cue: 'p1_def1', at: 6.0, sfx: 'ocean', gain: 0.35 },
  { cue: 'p1_def1', at: 7.8, sfx: 'splash', gain: 0.4 },
  // дверь и сельхозминистр
  { cue: 'p1_agri_in', at: 0.1, sfx: 'door_burst', gain: 0.9 },
  { cue: 'p1_agri1', at: 1.6, sfx: 'sheep_baa', gain: 0.6 },
  { cue: 'p1_agri1', at: 1.8, sfx: 'crowd_murmur', gain: 0.25, len: 3.6 },
  { cue: 'p1_agri1', at: 4.0, sfx: 'comedic_boing', gain: 0.45 },
  { cue: 'p1_agri1', at: 6.3, sfx: 'sheep_crowd', gain: 0.7 },
  { cue: 'p1_agri1', at: 6.5, sfx: 'whoosh', gain: 0.4 },
  { cue: 'p1_agri1', at: 7.0, sfx: 'whoosh', gain: 0.35 },
  // ПМ: зловещий рокот, удар по столу, тревога
  { cue: 'p1_pm2', at: -0.2, sfx: 'rumble_low', gain: 0.6 },
  { cue: 'p1_pm2', at: 2.2, sfx: 'sting_dramatic', gain: 0.5 },
  { cue: 'p1_pm2', at: 6.24, sfx: 'punch', gain: 0.85 },
  { cue: 'p1_pm2', at: 6.27, sfx: 'alarm', gain: 0.6 },
  { cue: 'p1_pm2', at: 8.6, sfx: 'alarm', gain: 0.45, len: 1.2 },
];
