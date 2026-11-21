// Сцена 3: ржавый пикап, торговый автомат, светофор, зебра. Плоские формы в том же двухступенчатом стиле (Part = заливка + контур).
import React from "react";
import { Part, Flat, rbox, rcyl, sphereGeo, Shadow, planeGeo, circleGeo } from "./toon";
import { signTex } from "./Env";
import { D2R } from "./util";

// ---------- палитра пикапа ----------
const BODY = "#4d86b8"; // выцветший голубой
const BODY_D = "#3b6a96";
const GLASS = "#222a4c";
const GLASS_HI = "#5f70b0";
const RUST = "#d47a28";
const RUST_D = "#7a3d17";
const CHROME = "#9aa3b8";
const TIRE = "#1b1922";

/** Пятно ржавчины: два вложенных плоских эллипса (светлое + тёмное ядро) */
const Rust: React.FC<{ x: number; y: number; z: number; w: number; h: number; rot?: number; ry?: number }> = ({ x, y, z, w, h, rot = 0, ry = 0 }) => (
  <group position={[x, y, z]} rotation={[0, ry, rot]}>
    <Flat geo={circleGeo} color={RUST} scale={[w, h, 1]} />
    <Flat geo={circleGeo} color={RUST_D} position={[w * 0.12, -h * 0.08, 0.004]} scale={[w * 0.55, h * 0.5, 1]} />
  </group>
);

const Wheel: React.FC<{ x: number; z: number; spin?: number }> = ({ x, z, spin = 0 }) => {
  const out = Math.sign(z);
  return (
    <group position={[x, 0.8, z]}>
      <group rotation={[Math.PI / 2, 0, 0]}>
        <Part geo={rcyl(0.8, 0.8, 0.58, 0.16, 22)} color={TIRE} px={3.4} />
      </group>
      <group position={[0, 0, out * 0.3]} rotation={[0, 0, spin * D2R]}>
        <Flat geo={circleGeo} color="#c9bd9c" scale={0.46} />
        <Flat geo={circleGeo} color="#6a6150" position={[0, 0, out * 0.004]} scale={0.17} />
        {[0, 1, 2, 3, 4].map((i) => (
          <group key={i} rotation={[0, 0, (i * 72 * Math.PI) / 180]}>
            <Flat geo={circleGeo} color="#6a6150" position={[0, 0.3, out * 0.003]} scale={0.045} />
          </group>
        ))}
      </group>
    </group>
  );
};

/** Дверь: начало координат - петля на переднем ребре, панель уходит назад (-x). open - угол открытия (град). side: +1 ближняя к камере */
const Door: React.FC<{ len: number; open: number; rustAt: Array<[number, number, number, number]> }> = ({ len, open, rustAt }) => (
  <group rotation={[0, open * D2R, 0]}>
    <Part geo={rbox(len, 0.78, 0.12, 0.05)} color={BODY} px={3} position={[-len / 2, 1.7, 0]} />
    <Part geo={rbox(len - 0.14, 0.98, 0.1, 0.05)} color={GLASS} px={3} position={[-len / 2, 2.62, 0]} />
    <Flat geo={planeGeo} color={GLASS_HI} position={[-len / 2 + 0.22, 2.7, 0.056]} rotation={[0, 0, 0.5]} scale={[0.1, 0.7, 1]} />
    <Flat geo={planeGeo} color={GLASS_HI} position={[-len / 2 + 0.42, 2.7, 0.056]} rotation={[0, 0, 0.5]} scale={[0.05, 0.7, 1]} />
    <Part geo={rbox(0.22, 0.07, 0.07, 0.025)} color={CHROME} px={2.4} position={[-len + 0.28, 1.95, 0.08]} />
    {rustAt.map(([x, y, w, h], i) => (
      <Rust key={i} x={-len / 2 + x} y={y} z={0.064} w={w} h={h} rot={i * 0.7} />
    ))}
  </group>
);

export interface PickupProps {
  doorF?: number; // угол открытия передней двери (град)
  doorR?: number; // задней
  spin?: number;
  nose?: number; // нос вниз +, град
  lean?: number; // крен кузова (град)
  idle?: number; // 0..1 - тряска на холостом (кузов приподнят)
}
/** Ржавый лифтованный пикап (crew cab), нос в +x; камера видит левый (+z) борт. Длина ~6.9, ширина 2.4, крыша 3.3 */
export const Pickup: React.FC<PickupProps> = ({ doorF = 0, doorR = 0, spin = 0, nose = 0, lean = 0, idle = 0 }) => (
  <group>
    <Shadow position={[0, 0.03, 0.1]} w={3.9} d={1.55} />
    <group position={[0, idle * 0.03, 0]} rotation={[lean * D2R, 0, -nose * D2R]}>
      {/* рама и мосты */}
      <Part geo={rbox(6.4, 0.4, 1.9, 0.08)} color="#2a2630" px={3} position={[0, 1.0, 0]} />
      <Part geo={rbox(0.36, 0.3, 2.2, 0.08)} color="#2a2630" px={2.6} position={[2.3, 0.82, 0]} />
      <Part geo={rbox(0.36, 0.3, 2.2, 0.08)} color="#2a2630" px={2.6} position={[-2.2, 0.82, 0]} />
      {/* ниши колёс (чёрные арки на борту) */}
      {[2.3, -2.2].map((x) => (
        <Flat key={x} geo={circleGeo} color="#100e16" position={[x, 0.82, 1.215]} scale={1.0} />
      ))}
      {/* капот и нижняя часть кабины */}
      <Part geo={rbox(2.2, 0.8, 2.4, 0.12)} color={BODY} px={3.2} position={[2.35, 1.72, 0]} />
      <Part geo={rbox(2.9, 0.8, 2.4, 0.1)} color={BODY} px={3.2} position={[-0.1, 1.72, 0]} />
      <Part geo={rbox(1.5, 0.08, 1.7, 0.04)} color={BODY_D} px={2.4} position={[2.2, 2.14, 0]} />
      {/* салон за открытыми дверями */}
      <Part geo={rbox(2.5, 1.0, 2.1, 0.08)} color="#16141e" px={2.4} position={[-0.15, 2.62, 0]} />
      <Part geo={rbox(0.28, 0.9, 1.8, 0.1)} color="#6a4a32" px={2.4} position={[-1.1, 2.4, 0]} rotation={[0, 0, -0.18]} />
      <Part geo={rbox(0.28, 0.9, 1.8, 0.1)} color="#6a4a32" px={2.4} position={[0.55, 2.4, 0]} rotation={[0, 0, -0.18]} />
      {/* лобовое стекло и стойки */}
      <Part geo={rbox(0.12, 0.98, 2.1, 0.05)} color={GLASS} px={3} position={[1.25, 2.62, 0]} rotation={[0, 0, 0.32]} />
      {[1.25, -0.1, -1.45].map((x) =>
        [1, -1].map((s) => <Part key={`${x}${s}`} geo={rbox(0.15, 1.05, 0.15, 0.04)} color={BODY} px={2.6} position={[x - (x > 1 ? 0.1 : 0), 2.62, s * 1.07]} />),
      )}
      <Part geo={rbox(2.95, 0.15, 2.5, 0.07)} color={BODY} px={3.2} position={[-0.1, 3.2, 0]} />
      {/* лампы на крыше */}
      <Part geo={rbox(0.26, 0.2, 1.9, 0.05)} color="#2a2630" px={2.6} position={[0.9, 3.4, 0]} />
      {[-0.7, -0.23, 0.23, 0.7].map((z) => (
        <Flat key={z} geo={circleGeo} color="#fff4b0" position={[1.032, 3.4, z]} rotation={[0, Math.PI / 2, 0]} scale={0.1} />
      ))}
      {/* кузов (кузовная часть сзади): пол, борта, борт-откидной, передняя стенка */}
      <Part geo={rbox(1.9, 0.12, 2.3, 0.04)} color="#3a3340" px={2.6} position={[-2.4, 1.35, 0]} />
      {[1, -1].map((s) => (
        <Part key={s} geo={rbox(1.95, 0.72, 0.13, 0.05)} color={BODY} px={3.2} position={[-2.4, 1.78, s * 1.2]} />
      ))}
      <Part geo={rbox(0.14, 0.72, 2.5, 0.05)} color={BODY} px={3.2} position={[-3.35, 1.78, 0]} />
      <Part geo={rbox(0.14, 0.9, 2.5, 0.05)} color={BODY} px={3} position={[-1.5, 1.87, 0]} />
      {/* груз в кузове: запаска, канистра, мешок */}
      <group position={[-2.55, 1.85, 0.2]} rotation={[0, 0, 0]}>
        <group rotation={[Math.PI / 2, 0, 0]} position={[0.1, 0.1, 0.2]}>
          <Part geo={rcyl(0.42, 0.42, 0.28, 0.1, 18)} color={TIRE} px={3} />
        </group>
        <Part geo={rbox(0.4, 0.5, 0.3, 0.06)} color="#d63a2a" px={3} position={[-0.5, -0.04, -0.5]} rotation={[0, 0.3, 0]} />
        <Part geo={sphereGeo(14)} color="#c9b88a" px={3} position={[-0.3, -0.05, 0.6]} scale={[0.34, 0.26, 0.3]} />
      </group>
      {/* бампера */}
      <Part geo={rbox(0.4, 0.38, 2.5, 0.09)} color={CHROME} px={3.2} position={[3.55, 1.2, 0]} rotation={[0, 0.05, 0]} />
      <Part geo={rbox(0.4, 0.32, 2.5, 0.09)} color={CHROME} px={3} position={[-3.55, 1.22, 0]} />
      {/* решётка и фары */}
      <Part geo={rbox(0.1, 0.55, 1.7, 0.03)} color="#17151e" px={2.6} position={[3.46, 1.72, 0]} />
      {[0, 1, 2].map((i) => (
        <Flat key={i} geo={planeGeo} color={CHROME} position={[3.525, 1.55 + i * 0.16, 0]} rotation={[0, Math.PI / 2, 0]} scale={[1.55, 0.05, 1]} />
      ))}
      {[1, -1].map((s) => (
        <group key={s}>
          <Part geo={rbox(0.12, 0.34, 0.42, 0.06)} color="#2a2630" px={2.6} position={[3.44, 1.72, s * 1.0]} />
          <Flat geo={circleGeo} color="#fff6a8" position={[3.51, 1.72, s * 1.0]} rotation={[0, Math.PI / 2, 0]} scale={0.15} />
        </group>
      ))}
      {/* труба-«дымовая» за кабиной (ближний борт) */}
      <Part geo={rcyl(0.1, 0.1, 1.9, 0.03, 12)} color="#3a3340" px={2.8} position={[-1.65, 2.65, 1.08]} />
      <Part geo={rcyl(0.14, 0.12, 0.16, 0.03, 12)} color="#17151e" px={2.4} position={[-1.65, 3.62, 1.08]} />
      {/* зеркала */}
      <Part geo={rbox(0.14, 0.28, 0.3, 0.05)} color="#2a2630" px={2.6} position={[1.0, 2.55, 1.42]} />
      {/* двери (ближний борт) */}
      <group position={[1.28, 0, 1.2]}>
        <Door len={1.38} open={doorF} rustAt={[[0.5, 1.5, 0.22, 0.12], [0.9, 1.9, 0.12, 0.08]]} />
      </group>
      <group position={[-0.12, 0, 1.2]}>
        <Door len={1.28} open={doorR} rustAt={[[0.3, 1.55, 0.3, 0.14]]} />
      </group>
      {/* ржавчина: капот, крыло, крыша, борт кузова, бампер */}
      <group position={[2.1, 2.186, 0.3]} rotation={[-Math.PI / 2, 0, 0]}>
        <Rust x={0} y={0} z={0} w={0.55} h={0.3} rot={0.4} />
        <Rust x={-0.2} y={-0.55} z={0} w={0.3} h={0.18} rot={-0.3} />
      </group>
      <group position={[-0.1, 3.285, -0.4]} rotation={[-Math.PI / 2, 0, 0]}>
        <Rust x={0} y={0} z={0} w={0.6} h={0.35} rot={0.2} />
      </group>
      <Rust x={3.0} y={1.78} z={1.213} w={0.36} h={0.2} rot={-0.3} />
      <Rust x={-2.6} y={1.95} z={1.272} w={0.62} h={0.22} rot={0.15} />
      <Rust x={-2.1} y={1.6} z={1.272} w={0.3} h={0.14} rot={-0.4} />
      <Rust x={-3.5} y={1.2} z={1.256} w={0.5} h={0.12} rot={0} ry={0} />
      <Rust x={0.4} y={1.45} z={1.213} w={0.4} h={0.1} rot={0.2} />
      {/* номер */}
      <Flat geo={planeGeo} color="#f1ecd0" position={[-3.63, 1.2, 0]} rotation={[0, -Math.PI / 2, 0]} scale={[0.9, 0.38, 1]} />
      <Flat geo={planeGeo} color="#6a4a32" position={[-3.632, 1.2, 0]} rotation={[0, -Math.PI / 2, 0]} scale={[0.6, 0.12, 1]} />
    </group>
    {/* колёса вне подвески кузова (не клюют носом) */}
    <Wheel x={2.3} z={1.2} spin={spin} />
    <Wheel x={-2.2} z={1.2} spin={spin} />
    <Wheel x={2.3} z={-1.2} spin={spin} />
    <Wheel x={-2.2} z={-1.2} spin={spin} />
  </group>
);

// ---------- торговый автомат ----------
const SNACK_COLS = ["#ff4fa0", "#ffd23a", "#35d6c0", "#ff8a1c", "#8a5cff", "#7dff1a"];
/** Автомат: лицом к +z. shake - сдвиг/крен от ударов (рывком) */
export const VendingMachine: React.FC<{ shake?: number; tilt?: number }> = ({ shake = 0, tilt = 0 }) => (
  <group position={[shake, 0, 0]} rotation={[0, 0, tilt * D2R]}>
    <Shadow position={[0, 0.03, 0.15]} w={1.1} d={0.62} />
    <Part geo={rbox(1.7, 3.0, 1.1, 0.08)} color="#2f6fe0" px={3.4} position={[0, 1.5, 0]} />
    {/* верхняя вывеска */}
    <Part geo={rbox(1.62, 0.5, 0.1, 0.04)} color="#14102a" px={2.6} position={[0, 2.72, 0.56]} />
    <Flat geo={planeGeo} color="#ffe94a" position={[0, 2.72, 0.612]} scale={[1.5, 0.38, 1]} />
    <mesh geometry={planeGeo} position={[0, 2.72, 0.615]} scale={[1.5, 0.38, 1]}>
      <meshBasicMaterial map={signTex("SNACKS", "#d6203a", "#ffe94a")} toneMapped={false} />
    </mesh>
    {/* витрина */}
    <Part geo={rbox(1.08, 1.98, 0.1, 0.04)} color="#17142a" px={2.8} position={[-0.25, 1.62, 0.56]} />
    <Flat geo={planeGeo} color="#2a2f5a" position={[-0.25, 1.62, 0.612]} scale={[0.98, 1.88, 1]} />
    {[0, 1, 2, 3].map((r) => (
      <group key={r} position={[-0.25, 2.38 - r * 0.48, 0.62]}>
        <Flat geo={planeGeo} color="#5a5f94" position={[0, -0.2, 0]} scale={[0.98, 0.04, 1]} />
        {[0, 1, 2, 3].map((c) => {
          const empty = r >= 2 && (c + r) % 2 === 0 && !(r === 3 && c === 3);
          const last = r === 3 && c === 3;
          return empty ? null : <Flat key={c} geo={planeGeo} color={last ? "#ffe94a" : SNACK_COLS[(r * 4 + c) % SNACK_COLS.length]} position={[-0.36 + c * 0.24, 0, 0.002]} scale={[0.18, last ? 0.34 : 0.3, 1]} />;
        })}
      </group>
    ))}
    {/* блик на стекле */}
    <Flat geo={planeGeo} color="#4d5aa0" position={[-0.55, 1.9, 0.614]} rotation={[0, 0, 0.35]} scale={[0.06, 1.2, 1]} />
    {/* панель с кнопками и монетоприёмник */}
    <Part geo={rbox(0.4, 1.9, 0.1, 0.04)} color="#14102a" px={2.6} position={[0.63, 1.62, 0.56]} />
    {[0, 1, 2, 3].map((r) =>
      [0, 1, 2].map((c) => <Flat key={`${r}${c}`} geo={planeGeo} color={(r + c) % 2 ? "#fbfbf6" : "#ff4f4f"} position={[0.53 + c * 0.1, 2.3 - r * 0.2, 0.612]} scale={[0.07, 0.07, 1]} />),
    )}
    <Flat geo={planeGeo} color="#17142a" position={[0.63, 1.2, 0.612]} scale={[0.16, 0.34, 1]} />
    <Flat geo={planeGeo} color="#ffd23a" position={[0.63, 1.4, 0.614]} scale={[0.22, 0.05, 1]} />
    {/* лоток */}
    <Part geo={rbox(1.2, 0.34, 0.1, 0.05)} color="#17142a" px={2.8} position={[-0.25, 0.42, 0.56]} />
    <Flat geo={planeGeo} color="#0a0912" position={[-0.25, 0.42, 0.612]} scale={[1.05, 0.24, 1]} />
  </group>
);

// ---------- светофор и зебра ----------
export const TrafficLight: React.FC<{ x: number; z: number; red?: boolean }> = ({ x, z, red = true }) => (
  <group position={[x, 0, z]}>
    <Part geo={rcyl(0.1, 0.1, 4.6, 0.03, 12)} color="#3b3d52" px={3} position={[0, 2.3, 0]} />
    <Part geo={rbox(0.7, 1.8, 0.5, 0.1)} color="#1a1822" px={3.2} position={[0, 4.4, 0.05]} />
    {[0, 1, 2].map((i) => {
      const on = (i === 0 && red) || (i === 2 && !red);
      return <Flat key={i} geo={circleGeo} color={i === 0 ? (on ? "#ff3030" : "#4a1a22") : i === 1 ? "#4a3a14" : on ? "#30ff60" : "#144a28"} position={[0, 4.84 - i * 0.44, 0.31]} scale={0.17} />;
    })}
    <Shadow position={[0, 0.03, 0.05]} w={0.3} d={0.2} />
  </group>
);
export const Zebra: React.FC<{ x: number; z0?: number; z1?: number; n?: number }> = ({ x, z0 = 2.2, z1 = 6.2, n = 6 }) => (
  <>
    {Array.from({ length: n }).map((_, i) => (
      <Flat key={i} geo={planeGeo} color="#e8e8f2" position={[x + i * 1.05, -0.296, (z0 + z1) / 2]} rotation={[-Math.PI / 2, 0, 0]} scale={[0.55, z1 - z0, 1]} />
    ))}
  </>
);
