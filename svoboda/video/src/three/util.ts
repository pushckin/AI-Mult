// Мелкие помощники анимации "на двойках".
export const hold = (frame: number, step = 2) => Math.floor(frame / step) * step;
export const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const hash = (n: number, seed = 1) => {
  const s = Math.sin(n * 127.1 + seed * 311.7) * 43758.5453;
  return s - Math.floor(s);
};
/** -1..1 шум, меняется раз в `step` кадров */
export const jitter = (frame: number, seed = 1, step = 2) => hash(Math.floor(frame / step), seed) * 2 - 1;
export const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);
export const easeIn = (t: number) => t * t;
export const easeInOut = (t: number) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
/** Кусочно-линейная интерполяция по ключам [кадр, значение] */
export const remap = (f: number, keys: ReadonlyArray<readonly [number, number]>) => {
  if (f <= keys[0][0]) return keys[0][1];
  for (let i = 1; i < keys.length; i++) {
    if (f <= keys[i][0]) {
      const [f0, v0] = keys[i - 1];
      const [f1, v1] = keys[i];
      return f1 === f0 ? v1 : lerp(v0, v1, (f - f0) / (f1 - f0));
    }
  }
  return keys[keys.length - 1][1];
};
/** Ключ, действующий на кадре f (держится до следующего) */
export const holdKeys = <T extends { f: number }>(f: number, keys: ReadonlyArray<T>): T | undefined => {
  let r: T | undefined;
  for (const k of keys) if (k.f <= f) r = k;
  return r;
};
export const D2R = Math.PI / 180;
