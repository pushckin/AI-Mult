export const FONT = "Arial Black, Impact, sans-serif";
export const FPS = 24;
export const INK = "#120c0a";
export const rnd = (seed: number): number => {
  const s = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
};
export const clamp = (v: number, a = 0, b = 1): number => Math.min(b, Math.max(a, v));
export const easeOut = (t: number): number => 1 - Math.pow(1 - clamp(t), 3);
export const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;
export const SHADOW = "drop-shadow(0 6px 8px rgba(0,0,0,.35))";
