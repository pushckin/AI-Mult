import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createCanvas, loadImage } from '@napi-rs/canvas';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const srcDir = 'C:/Users/pushc/.gemini/antigravity/brain/dd85afaf-a39a-4a8f-83a3-1c1a0d4c748a/.system_generated/logs/media';
const outDir = path.join(__dirname, 'assets', 'refs');
fs.mkdirSync(outDir, { recursive: true });

const mapping = [
  ['step_236_media_0.jpg', 'ref_briefing.png'],
  ['step_237_media_0.jpg', 'ref_helicopter.png'],
  ['step_241_media_0.jpg', 'ref_field_walk.png'],
  ['step_242_media_0.jpg', 'ref_explosion.png'],
  ['step_243_media_0.jpg', 'ref_trench_zone.png'],
];

for (const [src, dst] of mapping) {
  const img = await loadImage(fs.readFileSync(path.join(srcDir, src)));
  // Crop out top YouTube header and bottom player controls/title
  const sx = 0;
  const sy = Math.round(img.height * 0.082);
  const sw = Math.round(img.width * 0.95);
  const sh = Math.round(img.height * 0.56);
  const c = createCanvas(sw, sh);
  const ctx = c.getContext('2d');
  ctx.drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh);
  const outPath = path.join(outDir, dst);
  fs.writeFileSync(outPath, c.toBuffer('image/png'));
  console.log('Cropped', src, '->', dst, `${ sw }x${ sh }`);
}
