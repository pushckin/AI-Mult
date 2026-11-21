// Объёмные глаза (выпуклые шары на эллипсоиде головы) и общие функции «точка на голове». Всё вращается вместе с головой.
import React from "react";
import * as THREE from "three";
import { Part, Flat, sphereGeo, rbox, circleGeo } from "./toon";

export type HeadDim = { rx: number; ry: number; rz: number };
const D = Math.PI / 180;

/** Точка на эллипсоиде головы (lon, lat в градусах), сдвинутая по нормали на out */
export const headPt = (h: HeadDim, lonD: number, latD: number, out = 0): THREE.Vector3 => {
  const lon = lonD * D;
  const lat = latD * D;
  const p = new THREE.Vector3(h.rx * Math.cos(lat) * Math.sin(lon), h.ry * Math.sin(lat), h.rz * Math.cos(lat) * Math.cos(lon));
  const n = new THREE.Vector3(p.x / (h.rx * h.rx), p.y / (h.ry * h.ry), p.z / (h.rz * h.rz)).normalize();
  return p.addScaledVector(n, out);
};
export const headNormalQ = (h: HeadDim, lonD: number, latD: number) => {
  const p = headPt(h, lonD, latD);
  const n = new THREE.Vector3(p.x / (h.rx * h.rx), p.y / (h.ry * h.ry), p.z / (h.rz * h.rz)).normalize();
  return new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), n);
};

const lidGeo = new THREE.SphereGeometry(1, 22, 10, 0, Math.PI * 2, 0, Math.PI / 2);
const Z = new THREE.Vector3(0, 0, 1);

/**
 * Глаз-шар: белок с контуром, зрачок (плоский чёрный диск на шаре), веко кожи (st 2 - полуприкрыт сверху, 3 - закрыт), st 1 - выпучен.
 * lx, ly - взгляд (как у плоских глаз раньше: ±2.4 = край).
 */
export const Eye3: React.FC<{ h: HeadDim; side: 1 | -1; lon: number; lat: number; re: number; st: number; lx: number; ly: number; lid: string; pupil?: number }> = ({ h, side, lon, lat, re, st, lx, ly, lid, pupil = 0.36 }) => {
  const big = st === 1;
  const r = big ? re * 1.1 : re;
  const pos = headPt(h, side * lon, lat, -0.42 * r);
  const q = headNormalQ(h, side * lon, lat);
  const a = lx * 0.17;
  const b = ly * 0.17;
  // взгляд задан в системе головы (вперёд = +z головы), переводим в систему глаза: зрачок смотрит вперёд, а не по нормали к поверхности
  const dir = new THREE.Vector3(Math.sin(a) * Math.cos(b), Math.sin(b), Math.cos(a) * Math.cos(b)).applyQuaternion(q.clone().invert()).normalize();
  const pq = new THREE.Quaternion().setFromUnitVectors(Z, dir);
  const rp = r * (big ? pupil * 0.78 : pupil);
  return (
    <group position={pos.toArray() as [number, number, number]} quaternion={q}>
      <Part geo={sphereGeo(22)} color="#fbfbf6" px={3.2} scale={r} />
      {st !== 3 && <Part geo={sphereGeo(14)} color="#0c0a10" px={0} position={dir.clone().multiplyScalar(r * 0.97).toArray() as [number, number, number]} quaternion={pq as any} scale={[rp, rp, rp * 0.4]} />}
      {st === 2 && (
        <>
          <Part geo={lidGeo} color={lid} px={0} position={[0, -0.12 * r, 0]} scale={r * 1.1} />
          <Part geo={rbox(r * 2.0, r * 0.07, r * 0.07, r * 0.03)} color="#0c0a10" px={0} position={[0, -0.12 * r, r * 1.08]} />
        </>
      )}
      {st === 3 && (
        <>
          <Part geo={sphereGeo(18)} color={lid} px={0} scale={r * 1.07} />
          <Part geo={rbox(r * 1.9, r * 0.08, r * 0.08, r * 0.03)} color="#0c0a10" px={0} position={[0, -0.02 * r, r * 1.05]} />
        </>
      )}
    </group>
  );
};
void Flat;
void circleGeo;
