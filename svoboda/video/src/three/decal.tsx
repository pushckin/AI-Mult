// Накладки, лежащие на поверхности (единичной) сферы: «глаза», рот, шрам, брови. Родитель масштабируется в эллипсоид головы.
import React, { useMemo } from "react";
import * as THREE from "three";
import { decalMat, STYLE } from "./toon";

/** общий подъём накладок над сферой: хорды сферы не должны пробивать накладку */
const LIFT = 0.012;

/** Касательная плоскость в точке (lon,lat): u - восток, v - север. Возвращает базис (x=east, y=dir, z=-north). */
export const basisAt = (lonDeg: number, latDeg: number) => {
  const lon = (lonDeg * Math.PI) / 180;
  const lat = (latDeg * Math.PI) / 180;
  const dir = new THREE.Vector3(Math.cos(lat) * Math.sin(lon), Math.sin(lat), Math.cos(lat) * Math.cos(lon));
  const east = new THREE.Vector3().crossVectors(new THREE.Vector3(0, 1, 0), dir).normalize();
  const north = new THREE.Vector3().crossVectors(dir, east).normalize();
  const m = new THREE.Matrix4().makeBasis(east, dir, north.clone().negate());
  return new THREE.Quaternion().setFromRotationMatrix(m);
};
const expMap = (u: number, v: number): [number, number, number] => {
  const th = Math.hypot(u, v);
  if (th < 1e-6) return [0, 1, 0];
  const s = Math.sin(th) / th;
  return [u * s, Math.cos(th), -v * s];
};

const capCache = new Map<string, THREE.BufferGeometry>();
/** Эллиптическая «шапка» на сфере: полуоси (rx, ry) в радианах */
export const capGeo = (rx: number, ry: number) => {
  const key = `${rx.toFixed(3)}_${ry.toFixed(3)}`;
  let g = capCache.get(key);
  if (g) return g;
  const R = 6;
  const S = 40;
  const pos: number[] = [0, 1, 0];
  for (let i = 1; i <= R; i++) {
    const rho = i / R;
    for (let j = 0; j < S; j++) {
      const a = (j / S) * Math.PI * 2;
      pos.push(...expMap(rho * rx * Math.cos(a), rho * ry * Math.sin(a)));
    }
  }
  const idx: number[] = [];
  for (let j = 0; j < S; j++) idx.push(0, 1 + ((j + 1) % S), 1 + j);
  for (let i = 1; i < R; i++) {
    for (let j = 0; j < S; j++) {
      const a = 1 + (i - 1) * S + j;
      const b = 1 + (i - 1) * S + ((j + 1) % S);
      const c = 1 + i * S + j;
      const d = 1 + i * S + ((j + 1) % S);
      idx.push(a, b, c, b, d, c);
    }
  }
  g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  capCache.set(key, g);
  return g;
};

export interface DecalProps {
  lon: number;
  lat: number;
  rx: number;
  ry?: number;
  rot?: number; // град вокруг нормали
  color: string;
  lift?: number;
  ring?: number; // радианы: чёрная окантовка вокруг
  ringColor?: string;
  visible?: boolean;
  mo?: number; // раскрытие рта 0..1 (если задано и >= 0: полуоси шапки масштабируются - рот открывается непрерывно); -1/undefined - без изменений
  children?: React.ReactNode;
}
export const Decal: React.FC<DecalProps> = ({ lon, lat, rx: rx0, ry: ry0, rot = 0, color, lift = 1.004, ring = 0, ringColor = "#0c0a10", visible = true, mo = -1, children }) => {
  const q = useMemo(() => basisAt(lon, lat), [lon, lat]);
  const m = mo >= 0 ? Math.round(Math.min(1, mo) * 20) / 20 : -1; // 21 уровень раскрытия: геометрия шапок кэшируется
  const rx = m < 0 ? rx0 : rx0 * (0.55 + 0.45 * m);
  const ry = (ry0 ?? rx0) * (m < 0 ? 1 : 0.14 + 0.86 * m);
  const g = capGeo(rx, ry);
  const rg = STYLE.v5 ? ring * 1.6 : ring;
  const gr = ring > 0 ? capGeo(rx + rg, ry + rg) : null;
  return (
    <group quaternion={q} visible={visible}>
      <group rotation={[0, (rot * Math.PI) / 180, 0]}>
        {gr && <mesh geometry={gr} material={decalMat(ringColor)} scale={lift + LIFT - 0.0025} />}
        <mesh geometry={g} material={decalMat(color)} scale={lift + LIFT} />
        {children}
      </group>
    </group>
  );
};

export interface LineProps {
  lon: number;
  lat: number;
  pts: Array<[number, number]>; // (u,v) в радианах
  w?: number; // радиус трубки в единицах единичной сферы
  color: string;
  rot?: number;
  lift?: number;
  visible?: boolean;
}
export const Line: React.FC<LineProps> = ({ lon, lat, pts, w = 0.03, color, rot = 0, lift = 1.006, visible = true }) => {
  const q = useMemo(() => basisAt(lon, lat), [lon, lat]);
  const geo = useMemo(() => {
    const v = pts.map(([u, vv]) => new THREE.Vector3(...expMap(u, vv)));
    const curve = pts.length > 2 ? new THREE.CatmullRomCurve3(v, false, "catmullrom", 0.4) : new THREE.LineCurve3(v[0], v[1]);
    return new THREE.TubeGeometry(curve, 14, STYLE.v5 ? w * 1.35 : w, 6, false);
  }, [pts, w]);
  return (
    <group quaternion={q} visible={visible}>
      <group rotation={[0, (rot * Math.PI) / 180, 0]}>
        <mesh geometry={geo} material={decalMat(color)} scale={lift + LIFT} />
      </group>
    </group>
  );
};
