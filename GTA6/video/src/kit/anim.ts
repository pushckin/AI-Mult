// Хелперы анимации и таймлайна. Всё — от времени t (сек) из useCurrentFrame, без useFrame.
import { TIMELINE, FPS, PartTimeline } from "../data/timeline";

export type PartId = "p1" | "p2";
export const part = (id: PartId): PartTimeline => TIMELINE[id];

export const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
export const lerp = (a: number, b: number, k: number) => a + (b - a) * k;
export const easeInOut = (x: number) => { x = clamp01(x); return x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2; };
export const easeOut = (x: number) => 1 - Math.pow(1 - clamp01(x), 3);
export const easeIn = (x: number) => Math.pow(clamp01(x), 3);
export const easeOutBack = (x: number) => { x = clamp01(x); const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2); };
/** 0..1 прогресс t между a и b */
export const prog = (t: number, a: number, b: number) => clamp01((t - a) / Math.max(1e-6, b - a));
/** «на двойках»: квантует время для дёрганой cutout-анимации (12 поз/сек) */
export const twos = (t: number, fps = 12) => Math.floor(t * fps) / fps;
/** детерминированный шум */
export const hash = (n: number) => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };
export const noise1 = (x: number) => { const i = Math.floor(x), f = x - i; const u = f * f * (3 - 2 * f); return lerp(hash(i), hash(i + 1), u) * 2 - 1; };
/** тряска камеры: amp затухает от времени удара */
export const shake = (t: number, at: number, amp: number, dur = 0.6, freq = 28) => {
  const k = prog(t, at, at + dur);
  if (t < at || k >= 1) return [0, 0] as const;
  const a = amp * (1 - k) * (1 - k);
  return [noise1(t * freq) * a, noise1(t * freq + 77) * a] as const;
};

export function cue(pid: PartId, id: string) {
  const c = TIMELINE[pid].cues[id];
  if (!c) throw new Error("нет cue " + id);
  return c;
}
/** открытость рта (0..1) говорящего персонажа в момент t: по огибающей реплики(ий) */
export function mouthFor(pid: PartId, ids: string[], t: number): number {
  for (const id of ids) {
    const c = TIMELINE[pid].cues[id];
    if (!c || t < c.start || t > c.end) continue;
    const env = TIMELINE[pid].env[id];
    if (!env) return 0;
    const f = Math.floor(twos(t - c.start, 15) * FPS);
    return env[Math.min(env.length - 1, Math.max(0, f))] ?? 0;
  }
  return 0;
}
/** говорит ли сейчас кто-то из ids */
export function speaking(pid: PartId, ids: string[], t: number) {
  return ids.some((id) => { const c = TIMELINE[pid].cues[id]; return c && t >= c.start && t <= c.end; });
}
export { FPS };
