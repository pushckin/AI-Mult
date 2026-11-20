// Контактный лист: node tools/sheet3d.mjs out.png cols scale in1.png in2.png ...
import sharp from '/home/user/AI-Mult/svoboda/tools/node_modules/sharp/lib/index.js';
const [out, colsS, scaleS, ...ins] = process.argv.slice(2);
const cols = +colsS, sc = +scaleS;
const W = Math.round(1920 * sc), H = Math.round(1080 * sc);
const rows = Math.ceil(ins.length / cols);
const comp = [];
for (let i = 0; i < ins.length; i++) {
  const b = await sharp(ins[i]).resize(W, H).toBuffer();
  comp.push({ input: b, left: (i % cols) * W, top: Math.floor(i / cols) * H });
}
await sharp({ create: { width: W * cols, height: H * rows, channels: 3, background: '#000' } }).composite(comp).png().toFile(out);
