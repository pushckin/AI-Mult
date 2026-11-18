// Подготовка материалов для критика: node tools/review.mjs <p1|p2> <имя> <cueОт> <cueДо|end>
// Пишет review/<имя>/sheetN.png (кадр каждую секунду, по 20 на лист) и timing.txt
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const [pid, name, fromCue, toCue] = process.argv.slice(2);
const s = fs.readFileSync(path.join(root, 'video/src/data/timeline.ts'), 'utf8');
const T = JSON.parse(s.match(/TIMELINE[^=]*= (.*);\n/)[1])[pid];
const a = fromCue === 'start' ? 0 : T.cues[fromCue].start, b = toCue === 'end' ? T.duration : T.cues[toCue].start;
const dir = path.join(root, 'review', name); fs.rmSync(dir, { recursive: true, force: true }); fs.mkdirSync(dir, { recursive: true });
const times = []; for (let t = a + 0.4; t < b; t += 1) times.push(+t.toFixed(2));
let txt = `Таймкоды реплик (сек от начала части ${pid === 'p1' ? 1 : 2}), фрагмент ${a.toFixed(1)}–${b.toFixed(1)} с\n`;
for (const x of T.subs) if (x.end > a && x.start < b) txt += `${x.start.toFixed(1)}–${x.end.toFixed(1)}  [${x.who}] ${x.text.replace(/[{}]/g, '')}\n`;
txt += '\nКонтактные листы (кадр каждую секунду, слева направо, сверху вниз):\n';
for (let i = 0; i < times.length; i += 20) {
  const chunk = times.slice(i, i + 20), f = `sheet${i / 20 + 1}.png`;
  execFileSync('node', [path.join(root, 'tools/stills.mjs'), pid === 'p1' ? 'Part1' : 'Part2', chunk.join(','), path.join(dir, f), '--cols=5', '--scale=0.3'], { stdio: 'ignore' });
  txt += `${f}: ${chunk[0]} … ${chunk[chunk.length - 1]} с\n`;
}
fs.writeFileSync(path.join(dir, 'timing.txt'), txt);
console.log(txt);
