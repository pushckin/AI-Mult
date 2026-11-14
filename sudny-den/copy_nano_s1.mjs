import fs from 'node:fs';
import path from 'node:path';

const srcDir = 'C:/Users/pushc/.gemini/antigravity/brain/dd85afaf-a39a-4a8f-83a3-1c1a0d4c748a';
const dstDir = 'C:/Users/pushc/.gemini/antigravity/scratch/sudny-den/assets/nano_s1';
fs.mkdirSync(dstDir, { recursive: true });

const pairs = [
  ['bg_s1_office_1794661280390.jpg', 'bg_s1_office.png'],
  ['bg_s1_street_chase_1794661298002.jpg', 'bg_s1_street_chase.png'],
  ['bg_s1_crossroads_1794661315598.jpg', 'bg_s1_crossroads.png'],
  ['bg_s1_fire_street_1794661332110.jpg', 'bg_s1_fire_street.png'],
  ['spr_van_1794661353076.jpg', 'spr_van.png'],
  ['spr_firetruck_1794661373701.jpg', 'spr_firetruck.png'],
];

for (const [s, d] of pairs) {
  fs.copyFileSync(path.join(srcDir, s), path.join(dstDir, d));
  console.log('Copied', s, '->', d);
}
