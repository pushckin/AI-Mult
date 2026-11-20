import React, { useMemo } from "react";
import * as THREE from "three";
import { useAssets } from "./assets";

const VERT = /* glsl */ `
varying vec2 vUv;
void main(){
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;

// Плоский «бумажный» шейдер: опциональный пиксельный распад (мозаика + выбывание блоков) и вспышка-tint.
const FRAG = /* glsl */ `
uniform sampler2D map;
uniform float opacity;
uniform float dissolve;
uniform vec2 grid;
uniform float seed;
uniform vec4 tint;
varying vec2 vUv;
float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7)) + seed) * 43758.5453); }
void main(){
  vec2 uv = vUv;
  if (dissolve > 0.001) {
    vec2 g = floor(uv * grid);
    uv = (g + 0.5) / grid;
    if (hash(g) < dissolve * 1.25 - 0.1) discard;
  }
  vec4 c = texture2D(map, uv);
  c.rgb = mix(c.rgb, tint.rgb, tint.a);
  gl_FragColor = vec4(c.rgb, c.a * opacity);
  if (gl_FragColor.a < 0.003) discard;
  #include <colorspace_fragment>
}`;

const geometry = new THREE.PlaneGeometry(1, 1);

export interface SpriteProps {
  assetKey: string;
  /** Размер в мировых px. Если задан только h - ширина по аспекту ассета (и наоборот). */
  w?: number;
  h?: number;
  /** Якорь: куда в мире встаёт pivot ассета (по умолчанию pivot в начале координат группы) */
  x?: number;
  y?: number;
  rotation?: number; // градусы
  order?: number;
  opacity?: number;
  dissolve?: number;
  tint?: [number, number, number, number];
  seed?: number;
  flipX?: boolean;
  scale?: number;
  /** Игнорировать pivot ассета: ставить центр картинки в (x,y) */
  center?: boolean;
}

export const useSpriteSize = (assetKey: string, w?: number, h?: number) => {
  const assets = useAssets();
  const a = assets.get(assetKey);
  if (!a) return null;
  let sw = w;
  let sh = h;
  if (sw === undefined && sh === undefined) {
    sw = a.texW;
    sh = a.texH;
  } else if (sw === undefined) sw = (sh! * a.texW) / a.texH;
  else if (sh === undefined) sh = (sw * a.texH) / a.texW;
  return { a, w: sw!, h: sh!, kx: sw! / a.texW, ky: sh! / a.texH };
};

export const Sprite: React.FC<SpriteProps> = ({ assetKey, w, h, x = 0, y = 0, rotation = 0, order = 0, opacity = 1, dissolve = 0, tint, seed = 1, flipX = false, scale = 1, center = false }) => {
  const sz = useSpriteSize(assetKey, w, h);
  const material = useMemo(() => {
    if (!sz) return null;
    return new THREE.ShaderMaterial({
      vertexShader: VERT,
      fragmentShader: FRAG,
      transparent: true,
      depthTest: false,
      depthWrite: false,
      side: THREE.DoubleSide,
      uniforms: {
        map: { value: sz.a.texture },
        opacity: { value: 1 },
        dissolve: { value: 0 },
        grid: { value: new THREE.Vector2(16, 16) },
        seed: { value: 1 },
        tint: { value: new THREE.Vector4(0, 0, 0, 0) },
      },
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sz?.a.texture]);
  if (!sz || !material) return null;
  const u = material.uniforms;
  u.opacity.value = opacity;
  u.dissolve.value = dissolve;
  // блок распада ~18 мировых px
  u.grid.value.set(Math.max(2, Math.round(sz.w / 18)), Math.max(2, Math.round(sz.h / 18)));
  u.seed.value = seed;
  (u.tint.value as THREE.Vector4).set(...(tint ?? [0, 0, 0, 0]));
  const [px, py] = center ? [sz.a.texW / 2, sz.a.texH / 2] : sz.a.pivot;
  // центр плоскости относительно pivot (в мировых px, y вверх)
  const cx = sz.w / 2 - px * sz.kx;
  const cy = -(sz.h / 2 - py * sz.ky);
  return (
    <group position={[x, y, 0]} rotation={[0, 0, (rotation * Math.PI) / 180]} scale={[flipX ? -scale : scale, scale, 1]}>
      <mesh geometry={geometry} position={[cx, cy, 0]} scale={[sz.w, sz.h, 1]} renderOrder={order} material={material} />
    </group>
  );
};
