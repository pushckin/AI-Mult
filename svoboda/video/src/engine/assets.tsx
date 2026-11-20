import React, { createContext, useContext, useEffect, useState } from "react";
import * as THREE from "three";
import { staticFile, useDelayRender } from "remotion";
import type { AssetEntry, AssetMap, LoadedAsset } from "./types";
import { buildStubBgs, buildStubs, drawStubTexture } from "./stubs";

/**
 * Манифест public/img/manifest.json. Читается ТОЛЕРАНТНО: принимается плоский объект
 * { "greg_head": { file, w, h, pivot:[x,y] } }, либо вложенный
 * { characters: { greg: { parts: { head: {...} } } } } (ключ = greg_head), либо
 * { assets|sprites|images|parts: {...} }. Запись = любой объект со строкой file|path|src.
 * Ключ также регистрируется по имени файла без расширения.
 */
const SKIP = new Set(["characters", "parts", "assets", "sprites", "images", "props", "backgrounds", "bg", "layers"]);

const toPair = (v: unknown): [number, number] | undefined => {
  if (Array.isArray(v) && v.length >= 2) return [Number(v[0]), Number(v[1])];
  if (v && typeof v === "object") {
    const o = v as Record<string, unknown>;
    if (o.x !== undefined && o.y !== undefined) return [Number(o.x), Number(o.y)];
  }
  return undefined;
};

export const normalizeManifest = (raw: unknown): AssetMap => {
  const out: AssetMap = {};
  const walk = (node: unknown, path: string[]) => {
    if (!node || typeof node !== "object") return;
    const o = node as Record<string, unknown>;
    const file = [o.file, o.path, o.src, o.filename].find((v) => typeof v === "string") as string | undefined;
    if (file && path.length) {
      const key = path.filter((p) => !SKIP.has(p)).join("_") || path[path.length - 1];
      const entry: AssetEntry = {
        key,
        file: file.replace(/^\/?(public\/)?(img\/)?/, ""),
        w: Number(o.w ?? o.width) || undefined,
        h: Number(o.h ?? o.height) || undefined,
        pivot: toPair(o.pivot ?? o.joint ?? o.origin),
        attach: toPair(o.attach),
        screen: Array.isArray(o.screen) ? (o.screen.map(Number) as [number, number, number, number]) : undefined,
      };
      out[key] = entry;
      const base = entry.file.replace(/\.[a-z0-9]+$/i, "").split("/").pop()!;
      if (!out[base]) out[base] = { ...entry, key: base };
      return;
    }
    for (const [k, v] of Object.entries(o)) walk(v, [...path, k]);
  };
  walk(raw, []);
  return out;
};

export const fetchManifest = async (): Promise<AssetMap> => {
  try {
    const res = await fetch(staticFile("img/manifest.json"));
    if (!res.ok || (res.headers.get("content-type") || "").includes("text/html")) return {};
    return normalizeManifest(await res.json());
  } catch {
    return {};
  }
};

export interface AssetsApi {
  get: (key: string) => LoadedAsset | undefined;
  has: (key: string) => boolean;
  /** true, если ключ загружен из настоящего PNG */
  isReal: (key: string) => boolean;
}

const Ctx = createContext<AssetsApi | null>(null);
export const useAssets = (): AssetsApi => {
  const v = useContext(Ctx);
  if (!v) throw new Error("AssetsProvider missing");
  return v;
};

const loadTexture = (url: string) =>
  new Promise<THREE.Texture | null>((resolve) => {
    new THREE.TextureLoader().load(
      url,
      (t) => {
        t.colorSpace = THREE.SRGBColorSpace;
        t.anisotropy = 4;
        resolve(t);
      },
      undefined,
      () => resolve(null),
    );
  });

export const AssetsProvider: React.FC<{ manifest: AssetMap; children: React.ReactNode }> = ({ manifest, children }) => {
  const { delayRender, continueRender } = useDelayRender();
  const [api, setApi] = useState<AssetsApi | null>(null);
  const [handle] = useState(() => delayRender("assets"));

  useEffect(() => {
    let dead = false;
    (async () => {
      const stubs = buildStubs();
      const bgs = buildStubBgs();
      const map = new Map<string, LoadedAsset>();
      const real = new Set<string>();

      // 1) заглушки
      for (const [key, s] of Object.entries(stubs)) {
        map.set(key, { key, texture: drawStubTexture(s.w, s.h, s.draw), texW: s.w, texH: s.h, pivot: s.pivot, isStub: true });
      }
      for (const [key, s] of Object.entries(bgs)) {
        map.set(key, { key, texture: drawStubTexture(s.w, s.h, s.draw), texW: s.w, texH: s.h, pivot: [s.w / 2, s.h / 2], isStub: true });
      }
      // 2) настоящие PNG поверх (если файл есть и загрузился)
      await Promise.all(
        Object.values(manifest).map(async (e) => {
          const tex = await loadTexture(staticFile(`img/${e.file}`));
          if (!tex) return;
          const img = tex.image as { width: number; height: number };
          const texW = e.w ?? img.width;
          const texH = e.h ?? img.height;
          let pivot: [number, number] = e.pivot ?? [texW / 2, texH / 2];
          // нормированный pivot (0..1) -> px
          if (pivot[0] <= 1 && pivot[1] <= 1 && texW > 4) pivot = [pivot[0] * texW, pivot[1] * texH];
          map.set(e.key, { key: e.key, texture: tex, texW: img.width, texH: img.height, pivot: [pivot[0] * (img.width / texW), pivot[1] * (img.height / texH)], attach: e.attach, screen: e.screen, isStub: false });
          real.add(e.key);
        }),
      );
      if (dead) return;
      setApi({ get: (k) => map.get(k), has: (k) => map.has(k), isReal: (k) => real.has(k) });
      continueRender(handle);
    })();
    return () => {
      dead = true;
    };
  }, [manifest, delayRender, continueRender, handle]);

  if (!api) return null;
  return <Ctx.Provider value={api}>{children}</Ctx.Provider>;
};
