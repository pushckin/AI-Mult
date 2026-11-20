// Контактный лист: node tools/sheet.mjs out.png cols thumbW dir f1 f2 ...
import sharp from 'sharp';
import path from 'node:path';
const [out, cols, tw, dir, ...fr] = process.argv.slice(2);
const C = +cols, W = +tw, H = Math.round(W * 9 / 16);
const rows = Math.ceil(fr.length / C);
const comp = [];
for (let i = 0; i < fr.length; i++) {
  const p = path.join(dir, `f${String(fr[i]).padStart(3, '0')}.png`);
  const b = await sharp(p).resize(W, H).png().toBuffer();
  const lab = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="80" height="26"><rect width="80" height="26" fill="#000"/><text x="6" y="19" font-size="18" fill="#ff0" font-family="monospace">${fr[i]}</text></svg>`);
  comp.push({ input: b, left: (i % C) * W, top: Math.floor(i / C) * H });
  comp.push({ input: lab, left: (i % C) * W, top: Math.floor(i / C) * H });
}
await sharp({ create: { width: C * W, height: rows * H, channels: 3, background: '#444' } }).composite(comp).png().toFile(out);
