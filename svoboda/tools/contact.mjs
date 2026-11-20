// Контактные листы для визуальной проверки: node contact.mjs  -> tools/raw/sheet_*.png
import sharp from 'sharp';
import path from 'node:path';
import { IMG, RAW } from './lib.mjs';
const f = (n) => path.join(IMG, n + '.png');
const bgc = { r: 150, g: 150, b: 170, alpha: 1 };

// лист 1: фон в сборе (композит слоёв, кроп 1920, масштаб 0.5)
const layers = ['bg_sky', 'bg_far', 'bg_mid', 'bg_fore'];
const comp = [];
for (const l of layers) {
  const m = await sharp(f(l)).metadata();
  const left = Math.round((m.width - 1920) / 2);
  comp.push({ input: await sharp(f(l)).extract({ left, top: 0, width: 1920, height: 1080 }).toBuffer() });
}
const full = await sharp({ create: { width: 1920, height: 1080, channels: 4, background: bgc } }).composite(comp).png().toBuffer();
await sharp(full).resize(960, 540).toFile(path.join(RAW, 'sheet_bg.png'));

// лист 2: Грег + реквизит на сером
const items = [
  ['greg_ref', 0.5], ['greg_head_closed', 0.6], ['greg_head_open', 0.6], ['greg_torso', 0.7], ['greg_arm_left', 0.7], ['greg_arm_right_coffee', 0.7], ['greg_leg_left', 0.7], ['greg_leg_right', 0.7],
  ['prop_supercar', 0.6], ['prop_alien_driver', 0.8], ['prop_oppressor', 0.6], ['prop_rocket', 0.8], ['prop_billboard', 0.45], ['prop_dust', 0.7],
];
const W = 1400, Hh = 860;
const cs = []; let x = 10, y = 10, rowH = 0;
for (const [n, s] of items) {
  const b = await sharp(f(n)).resize({ width: Math.round((await sharp(f(n)).metadata()).width * s) }).png().toBuffer();
  const m = await sharp(b).metadata();
  if (x + m.width > W) { x = 10; y += rowH + 10; rowH = 0; }
  cs.push({ input: b, left: x, top: y }); x += m.width + 10; rowH = Math.max(rowH, m.height);
}
await sharp({ create: { width: W, height: Hh, channels: 4, background: bgc } }).composite(cs).png().toFile(path.join(RAW, 'sheet_chars.png'));
