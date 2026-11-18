// Звуки сцены p2_finale (Обратный отсчёт + Финал). Формат: { cue, at, sfx, gain, from?: 'end', len? }
// Визуальные привязки: тики таймера — p2_space +0/+1/+2, p2_eng end-3.7, p2_go +0, СТАРТ p2_go +1.0;
// стрелка пробивает прибор — p2_eng end-1.6; неон p2_flash +0; БАБАХ p2_flash +1.3; страна гаснет p2_flash +2.9.
export default [
  // --- космос: гудящая страна, отсчёт 5-4-3, монтаж ---
  { cue: 'p2_space', at: 0, sfx: 'transformer_hum', gain: 0.55, len: 4.0 },
  { cue: 'p2_space', at: 0, sfx: 'countdown_beep', gain: 0.7 },
  { cue: 'p2_space', at: 1.0, sfx: 'countdown_beep', gain: 0.7 },
  { cue: 'p2_space', at: 1.45, sfx: 'whoosh', gain: 0.35 },
  { cue: 'p2_space', at: 2.0, sfx: 'countdown_beep', gain: 0.7 },
  { cue: 'p2_space', at: 2.25, sfx: 'sheep_baa', gain: 0.4 },
  { cue: 'p2_space', at: 3.0, sfx: 'whoosh', gain: 0.3 },
  // --- бункер ---
  { cue: 'p2_eng', at: -0.2, sfx: 'alarm', gain: 0.3 },
  { cue: 'p2_eng', at: 0, sfx: 'transformer_hum', gain: 0.3, len: 4.0 },
  { cue: 'p2_eng', at: 4.0, sfx: 'transformer_hum', gain: 0.35, len: 4.0 },
  { cue: 'p2_eng', at: -3.7, from: 'end', sfx: 'countdown_beep', gain: 0.6 },
  { cue: 'p2_eng', at: -2.8, from: 'end', sfx: 'gauge_overload', gain: 0.8 },
  { cue: 'p2_eng', at: -1.6, from: 'end', sfx: 'electric_zap', gain: 0.5 },
  // --- 00:00:01 … СТАРТ! ---
  { cue: 'p2_go', at: 0, sfx: 'countdown_beep', gain: 0.8 },
  { cue: 'p2_go', at: 0.48, sfx: 'whoosh', gain: 0.3 },
  { cue: 'p2_go', at: 1.0, sfx: 'countdown_final', gain: 0.85 },
  { cue: 'p2_go', at: 1.1, sfx: 'crowd_roar_swell', gain: 0.45, len: 1.3 },
  // --- неон → БАБАХ → темнота ---
  { cue: 'p2_flash', at: 0, sfx: 'start_chime', gain: 0.9 },
  { cue: 'p2_flash', at: 1.3, sfx: 'explosion_big', gain: 1.0 },
  { cue: 'p2_flash', at: 1.3, sfx: 'rumble_low', gain: 0.6 },
  { cue: 'p2_flash', at: 2.85, sfx: 'power_blackout', gain: 0.75 },
  // --- тишина: сверчки и треск проводов ---
  { cue: 'p2_silence', at: 0.1, sfx: 'crickets', gain: 0.55, len: 5.0 },
  { cue: 'p2_silence', at: 0.2, sfx: 'fire_crackle', gain: 0.3, len: 4.0 },
  // --- телефон ---
  { cue: 'p2_phone', at: 0.3, sfx: 'phone_ding', gain: 0.8 },
  { cue: 'p2_phone', at: 1.35, sfx: 'phone_ding', gain: 0.45 },
  { cue: 'p2_phone', at: 2.5, sfx: 'crickets', gain: 0.3, len: 5.0 },
  // --- крик всей страны ---
  { cue: 'p2_gamer3', at: 0.2, from: 'end', sfx: 'whoosh', gain: 0.4 },
  { cue: 'p2_scream', at: -0.3, sfx: 'crowd_roar_swell', gain: 0.6 },
  { cue: 'p2_scream', at: 0, sfx: 'rumble_low', gain: 0.9 },
  // --- КОНЕЦ ---
  { cue: 'p2_end', at: 0.05, sfx: 'sting_dramatic', gain: 0.55 },
  { cue: 'p2_end', at: 1.2, sfx: 'crickets', gain: 0.25, len: 2.5 },
];
