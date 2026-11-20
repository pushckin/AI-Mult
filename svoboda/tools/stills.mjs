// Быстрые still'ы: один bundle, много кадров. node tools/stills.mjs <outdir> <f1> <f2> ...  (cwd любой)
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';
const here = path.dirname(fileURLToPath(import.meta.url));
const video = path.join(here, '..', 'video');
const req = createRequire(path.join(video, 'package.json'));
const { bundle } = req('@remotion/bundler');
const { renderStill, selectComposition } = req('@remotion/renderer');
const outDir = path.resolve(process.argv[2]);
const frames = process.argv.slice(3).map(Number);
fs.mkdirSync(outDir, { recursive: true });
const serveUrl = await bundle({ entryPoint: path.join(video, 'src/index.ts'), publicDir: path.join(video, 'public') });
const browserExecutable = process.env.BROWSER || '/usr/bin/google-chrome';
const opts = { chromiumOptions: { gl: 'angle' }, browserExecutable: fs.existsSync(browserExecutable) ? browserExecutable : undefined };
const comp = await selectComposition({ serveUrl, id: 'Scene1', ...opts });
for (const f of frames) {
  await renderStill({ composition: comp, serveUrl, frame: f, output: path.join(outDir, `f${String(f).padStart(3, '0')}.png`), ...opts });
}
console.log('done', frames.length);
