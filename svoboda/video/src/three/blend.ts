// Сглаживание во времени для сцен 2-4 (60 fps): поза/кадр = взвешенное усреднение «ступенчатой» (рваной) анимации по окну вокруг текущего момента.
// Анимация по-прежнему описана ключевыми позами/битами (биты держатся 0.3-0.7 с), но на экране переход между ними - непрерывный (ease in-out ~0.16 с)
// с лёгким follow-through (перелёт ~6% на углах). Между планами и при жёстких склейках камеры окно обрезается: жёсткие склейки остаются жёсткими.
import React from "react";
import { FPS } from "../data/fps";
import { clamp } from "./util";

/** h - полуширина окна (с): переход между позами длится 2h = 0.18 с; over - доля перелёта на углах; dt - шаг выборки (с) */
export const SMOOTH = { h: 0.09, over: 0.12, dt: 1 / 120 };

/** Поля, которые не смешиваем (форма рта, видимость, флаги, тики эффектов): берётся значение в текущий момент */
const DISCRETE = new Set([
  "mouth", "eyeL", "eyeR", "hl", "hr", "tear", "sir", "pl", "acc", "sw", "mo", "ps", "mst", "sp", "tg", "gun", "cb",
  "k", "leaves", "hole", "lights", "crack", "dent", "charred", "win", "cig", "beer", "crowbar", "stub", "frame", "seed",
]);
/** Углы шарниров (градусы): на них добавляется follow-through; ry/rz - ещё и по кратчайшей дуге */
const ANGLE = new Set([
  "rx", "ry", "rz", "tl", "ty", "tz", "hx", "hy", "hz", "alx", "alz", "ale", "arx", "arz", "are", "llx", "llz", "llk", "lrx", "lrz", "lrk",
  "atl", "atr", "toe", "cup", "my", "py", "hp", "gp", "gw",
]);


interface Kernel { us: number[]; wt: number[]; wo: number[]; ci: number }
const kernels = new Map<string, Kernel>();
const kernel = (h: number, over: number, dt: number): Kernel => {
  const key = `${h}_${over}_${dt}`;
  let k = kernels.get(key);
  if (k) return k;
  const jp = Math.round(h / dt);
  const jn = Math.round((3 * h) / dt);
  const us: number[] = [];
  for (let j = -jn; j <= jp; j++) us.push(j * dt);
  const tri = (u: number, hw: number) => Math.max(0, 1 - Math.abs(u) / hw);
  const norm = (a: number[]) => {
    const s = a.reduce((x, y) => x + y, 0) || 1;
    return a.map((v) => v / s);
  };
  const t1 = norm(us.map((u) => tri(u, h)));
  const t2 = norm(us.map((u) => tri(u + h, 2 * h)));
  const wo = t1.map((v, i) => (1 + over) * v - over * t2[i]);
  k = { us, wt: t1, wo, ci: jn };
  kernels.set(key, k);
  return k;
};

type Any = any; // eslint-disable-line @typescript-eslint/no-explicit-any

// ---------- «живой холд»: едва заметное непрерывное покачивание поз (≈1°, периоды 1.6-2.9 с), чтобы в паузах между битами кадры не были одинаковыми ----------
const IDLE: ReadonlyArray<readonly [string, number, number]> = [
  ["tl", 0.9, 1.7], ["hx", 1.0, 2.3], ["hy", 1.2, 1.9], ["hz", 0.6, 2.9], ["alx", 1.4, 2.1], ["arx", 1.4, 2.7], ["ale", 1.6, 1.6], ["are", 1.6, 2.2],
];
let IDLE_T = 0;
const strHash = (str: string) => {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) h = Math.imul(h ^ str.charCodeAt(i), 16777619);
  return (h >>> 0) / 4294967296;
};
const idleOf = (out: Record<string, Any>, who: string) => {
  for (const [f, amp, per] of IDLE) {
    if (typeof out[f] === "number") out[f] += amp * Math.sin((2 * Math.PI * IDLE_T) / per + strHash(who + f) * 2 * Math.PI);
  }
};
const isPlain = (v: Any): boolean => !!v && typeof v === "object" && Object.getPrototypeOf(v) === Object.prototype;

const blendAny = (vals: Any[], ci: number, K: Kernel, key: string, who = ""): Any => {
  const c = vals[ci];
  if (typeof c === "number") {
    if (DISCRETE.has(key)) return c;
    const w = ANGLE.has(key) ? K.wo : K.wt;
    let s = 0;
    if (key === "ry" || key === "rz") {
      for (let j = 0; j < vals.length; j++) {
        if (w[j] === 0) continue;
        const v = typeof vals[j] === "number" ? vals[j] : c;
        const d = v - c;
        s += w[j] * (d - 360 * Math.round(d / 360));
      }
      return c + s;
    }
    for (let j = 0; j < vals.length; j++) {
      if (w[j] === 0) continue;
      s += w[j] * (typeof vals[j] === "number" ? vals[j] : c);
    }
    return s;
  }
  if (Array.isArray(c)) {
    const same = vals.map((v) => (Array.isArray(v) && v.length === c.length ? v : null));
    return c.map((_: Any, i: number) => blendAny(same.map((a) => (a ? a[i] : c[i])), ci, K, key, who));
  }
  if (React.isValidElement(c)) {
    const el = c as React.ReactElement<Record<string, Any>>;
    const props = blendAny(
      vals.map((v) => (React.isValidElement(v) && v.type === el.type && v.key === el.key ? (v as React.ReactElement<Record<string, Any>>).props : el.props)),
      ci,
      K,
      "",
      typeof el.props.kind === "string" ? el.props.kind : who,
    );
    const { children, ...rest } = props as Record<string, Any>;
    const cfg: Record<string, Any> = el.key !== null ? { ...rest, key: el.key } : rest;
    if (children === undefined) return React.createElement(el.type as React.ElementType, cfg);
    return Array.isArray(children) ? React.createElement(el.type as React.ElementType, cfg, ...children) : React.createElement(el.type as React.ElementType, cfg, children);
  }
  if (isPlain(c)) {
    const objs = vals.map((v) => (isPlain(v) && (c.kind === undefined || v.kind === c.kind) ? v : null));
    const out: Record<string, Any> = {};
    const w = typeof c.kind === "string" ? c.kind : who;
    for (const k of Object.keys(c)) out[k] = blendAny(objs.map((o) => (o && k in o ? o[k] : c[k])), ci, K, k, w);
    if (w && typeof out.scale === "number" && typeof out.tl === "number" && typeof out.hx === "number" && typeof out.alx === "number") idleOf(out, w);
    return out;
  }
  return c;
};

export interface SmoothOpts { h?: number; over?: number; dt?: number }
/**
 * Непрерывный кадр: sample(f) считает «рваный» кадр в момент f (кадры композиции, дробные допустимы). [lo, hi) - границы плана (за них не смотрим).
 * segOf - номер «отрезка без склеек» (жёсткая склейка камеры/плана меняет номер): окно не заходит за склейку, а заменяется последней выборкой до неё.
 */
export const smoothFrame = <T,>(sample: (f: number) => T, frame: number, lo: number, hi: number, segOf: (v: T) => unknown, o: SmoothOpts = {}): T => {
  const { h = SMOOTH.h, over = SMOOTH.over, dt = SMOOTH.dt } = o;
  const K = kernel(h, over, dt);
  const center = sample(frame);
  const vals: T[] = new Array(K.us.length);
  vals[K.ci] = center;
  const seg0 = segOf(center);
  IDLE_T = frame / FPS;
  for (const side of [1, -1]) {
    let last = center;
    let dead = false;
    for (let j = 1; ; j++) {
      const idx = K.ci + side * j;
      if (idx < 0 || idx >= K.us.length) break;
      const f = frame + K.us[idx] * FPS;
      if (!dead && f >= lo && f < hi) {
        const v = sample(f);
        if (segOf(v) !== seg0) dead = true;
        else last = v;
      } else dead = true;
      vals[idx] = last;
    }
  }
  return blendAny(vals, K.ci, K, "") as T;
};

// ---------- рот: непрерывное раскрытие по огибающей wav ----------
/** огибающая (0..1, уже сглажена ~50 мс при разборе wav) -> раскрытие рта 0..1 */
export const openness = (e: number) => Math.pow(clamp((e - 0.1) / 0.55), 0.85);
/**
 * Раскрытие рта в момент k (кадры от начала реплики, дробные), vLen - длина реплики в кадрах. Вне реплики 0.
 * Без wav (env нет) - условные слоги ~5.5 Гц.
 */
export const mouthLevel = (env: number[] | undefined, k: number, vLen: number): number => {
  if (k < 0 || k >= vLen) return 0;
  if (!env) return 0.25 + 0.75 * Math.max(0, Math.sin(((k / FPS) * 2 * Math.PI * 5.5) % (2 * Math.PI)));
  const i = Math.floor(k);
  const fr = k - i;
  const a = env[i] ?? 0;
  const b = env[i + 1] ?? 0;
  return openness(a + (b - a) * fr);
};
/** рот считается открытым, если раскрытие выше порога (ниже - рисуется закрытая линия) */
export const MO_ON = 0.05;
