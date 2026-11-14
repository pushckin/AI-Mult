import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dstAudio = path.join(__dirname, 'video', 'public', 'audio');
const tlOut = path.join(__dirname, 'video', 'src', 'data', 'scene1Timeline.ts');

fs.mkdirSync(dstAudio, { recursive: true });
fs.copyFileSync(path.join(__dirname, 'audio', 'master.wav'), path.join(dstAudio, 'master.wav'));
fs.copyFileSync(path.join(__dirname, 'audio', 's1_master.wav'), path.join(dstAudio, 's1_master.wav'));

const b = fs.readFileSync(path.join(__dirname, 'audio', 'master.wav'));
const sr = 44100;

function sliceWav(t0, t1, outName) {
  const s0 = Math.max(0, Math.floor(t0 * sr));
  const s1 = Math.min((b.length - 44) / 2, Math.ceil(t1 * sr));
  const pcm = b.subarray(44 + s0 * 2, 44 + s1 * 2);
  const h = Buffer.alloc(44);
  h.write('RIFF', 0);
  h.writeUInt32LE(36 + pcm.length, 4);
  h.write('WAVE', 8);
  h.write('fmt ', 12);
  h.writeUInt32LE(16, 16);
  h.writeUInt16LE(1, 20);
  h.writeUInt16LE(1, 22);
  h.writeUInt32LE(sr, 24);
  h.writeUInt32LE(sr * 2, 28);
  h.writeUInt16LE(2, 32);
  h.writeUInt16LE(16, 34);
  h.write('data', 36);
  h.writeUInt32LE(pcm.length, 40);
  fs.writeFileSync(path.join(dstAudio, outName), Buffer.concat([h, pcm]));
}

sliceWav(30.01, 76.8, 's2_master.wav');
sliceWav(76.8, 139.49, 's3_master.wav');
sliceWav(139.49, 166.72, 's4_master.wav');

const tl = JSON.parse(fs.readFileSync(path.join(__dirname, 'timeline.json'), 'utf8'));

const ts = `// Auto-generated from sudny-den/timeline.json (All 4 Scenes)
export const FPS = 24;
export const WIDTH = 1080;
export const HEIGHT = 1920;

export const DURATION_IN_FRAMES = 721;
export const S2_START = 30.01;
export const S2_DURATION_IN_FRAMES = 1123;
export const S3_START = 76.8;
export const S3_DURATION_IN_FRAMES = 1505;
export const S4_START = 139.49;
export const S4_DURATION_IN_FRAMES = 653;
export const TOTAL_DURATION_IN_FRAMES = 4002;

export const SCENES = ${JSON.stringify(tl.scenes, null, 2)} as const;

export const CUES = ${JSON.stringify(tl.cues, null, 2)} as const;

export interface TimelineLine {
  start: number;
  end: number;
  duration: number;
  who: string;
  text: string;
  env: number[];
}

export const LINES: Record<string, TimelineLine> = ${JSON.stringify(tl.lines, null, 2)};

export function getMouthOpen(lineId: string, t: number): number {
  const l = LINES[lineId];
  if (!l || t < l.start || t > l.end) return 0;
  const idx = Math.max(0, Math.min(l.env.length - 1, Math.floor((t - l.start) * FPS)));
  return l.env[idx] ?? 0;
}

export function getActiveLine(t: number): { id: string; line: TimelineLine; progress: number } | null {
  for (const [id, line] of Object.entries(LINES)) {
    if (t >= line.start - 0.05 && t <= line.end + 0.18) {
      const progress = Math.max(0, Math.min(1, (t - line.start) / Math.max(0.1, line.duration)));
      return { id, line, progress };
    }
  }
  return null;
}
`;

fs.writeFileSync(tlOut, ts, 'utf8');
console.log('Synced video/public/audio/*.wav and video/src/data/scene1Timeline.ts');
