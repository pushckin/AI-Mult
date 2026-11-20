// FALLBACK-генератор: те же ассеты, но программно (SVG -> PNG RGBA) в стиле South Park (плоская вырезная бумага).
// Нужен, пока у ключа Gemini нет квоты на image-модели. Те же имена/манифест, что у gen_assets.mjs.
// Запуск: node make_svg_assets.mjs [имя ...]
import sharp from 'sharp';
import path from 'node:path';
import { IMG, upsertManifest } from './lib.mjs';
import { META } from './assets_meta.mjs';

const INK = '#1b1b1b';
const SW = 3;
let seed = 7;
const rnd = () => { seed |= 0; seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const ri = (a, b) => Math.floor(a + rnd() * (b - a + 1));
const pick = (arr) => arr[ri(0, arr.length - 1)];

// Плоская заливка, один тонкий тёмный контур, никаких фильтров/шума/градиентов.
const wrap = (w, h, body, defs = '', view = null) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="${view || `0 0 ${w} ${h}`}">
  <defs>${defs}</defs>
  <g stroke="${INK}" stroke-width="${SW}" stroke-linejoin="round" stroke-linecap="round">${body}</g></svg>`;

const fa = (fill, extra) => (extra.includes('fill="') ? '' : `fill="${fill}"`);
const P = (d, fill, extra = '') => `<path d="${d}" ${fa(fill, extra)} ${extra}/>`;
const R = (x, y, w, h, fill, rx = 0, extra = '') => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}" ${fa(fill, extra)} ${extra}/>`;
const C = (x, y, r, fill, extra = '') => `<circle cx="${x}" cy="${y}" r="${r}" ${fa(fill, extra)} ${extra}/>`;
const E = (x, y, rx, ry, fill, extra = '') => `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" ${fa(fill, extra)} ${extra}/>`;
const NOSTROKE = 'stroke="none"';
const T = (x, y, s, fill, size, extra = '') =>
  `<text x="${x}" y="${y}" font-family="Inter" font-weight="800" font-size="${size}" text-anchor="middle" fill="${fill}" ${extra.includes('stroke="') ? '' : 'stroke="none"'} ${extra}>${s}</text>`;

// ================= ГРЕГ =================
const SKIN = '#F2C59B';
function head(open) {
  let s = '';
  s += R(152, 290, 56, 50, SKIN); // шея
  s += E(30, 195, 22, 30, SKIN) + E(330, 195, 22, 30, SKIN); // уши
  s += E(180, 180, 152, 140, SKIN); // голова
  // остатки волос по бокам, лысина сверху
  s += P('M40 130 Q38 90 70 70 Q60 100 66 135 Z', '#5a3d27');
  s += P('M320 130 Q322 90 290 70 Q300 100 294 135 Z', '#5a3d27');
  s += P('M150 55 Q170 35 190 55', 'none', 'stroke="#5a3d27" stroke-width="4" fill="none"'); // одинокая прядь
  s += P('M175 52 Q185 28 205 48', 'none', 'stroke="#5a3d27" stroke-width="4" fill="none"');
  // брови: нервные, одна выше
  s += P('M92 120 L152 134', 'none', 'stroke="#3b2a1c" stroke-width="9" fill="none"');
  s += P('M208 124 L268 108', 'none', 'stroke="#3b2a1c" stroke-width="9" fill="none"');
  // глаза: правый (на экране) нормальный бесстрастный, левый - с тиком (прищур)
  s += E(228, 175, 34, 38, '#fff') + C(220, 178, 6, INK, NOSTROKE);
  s += E(132, 178, 34, 38, '#fff') + C(140, 181, 6, INK, NOSTROKE);
  s += P('M92 150 L172 150 L172 176 Q132 160 92 178 Z', SKIN, 'stroke="none"'); // верхнее веко тика, опущено
  s += P('M96 176 Q132 160 168 176', 'none', 'stroke="' + INK + '" stroke-width="4" fill="none"');
  s += P('M82 196 L68 204 M84 208 L72 220 M180 194 L190 206', 'none', 'stroke="' + INK + '" stroke-width="3" fill="none"'); // чёрточки тика
  // шрам через щёку (диагональ), со стежками
  s += P('M222 215 L300 268', 'none', 'stroke="#B3475A" stroke-width="9" fill="none"');
  s += P('M222 215 L300 268', 'none', 'stroke="#d98aa0" stroke-width="3" fill="none"');
  for (const [x, y] of [[236, 223], [254, 235], [272, 247], [288, 258]]) s += P(`M${x - 5} ${y + 8} L${x + 5} ${y - 8}`, 'none', 'stroke="#fff" stroke-width="3" fill="none"');
  // рот
  if (!open) {
    s += P('M142 262 Q178 252 214 266', 'none', 'stroke="' + INK + '" stroke-width="5" fill="none"');
  } else {
    s += P('M128 248 Q180 244 230 250 Q226 306 180 308 Q134 306 128 248 Z', '#4a1219');
    s += P('M134 250 L224 252 L222 266 L136 264 Z', '#fff', 'stroke="none"'); // верхние зубы
    s += P('M170 252 L186 252 L186 266 L170 266 Z', '#4a1219', 'stroke="none"'); // выбитый зуб
    s += E(180, 296, 28, 12, '#C8404E', 'stroke="none"');
  }
  return wrap(360, 340, s);
}

function torso() {
  let s = '';
  s += R(80, 292, 80, 26, '#6B5B45'); // верх брюк
  s += P('M44 32 Q120 6 196 32 L220 272 L20 272 Z', '#E4D2A6'); // рубашка
  s += P('M20 258 L220 258 L220 290 L20 290 Z', '#6B5B45'); // брюки (пояс-зона)
  s += R(20, 266, 200, 14, '#1d1d1d', 0); // ремень
  s += R(108, 264, 24, 18, '#C9B04A');
  s += P('M92 20 L120 74 L148 20 Z', SKIN); // вырез шеи
  s += P('M70 18 L120 78 L96 22 Z', '#F4EBCF') + P('M170 18 L120 78 L144 22 Z', '#F4EBCF'); // воротник
  // карман с ручкой
  s += R(150, 120, 44, 52, '#D8C493') + R(160, 104, 6, 30, '#2b4aa8', 2);
  // кривой галстук
  s += P('M122 80 L148 94 L142 110 L116 98 Z', '#B8262B'); // узел, перекошен
  s += P('M128 108 L152 112 L170 220 L148 246 L124 218 Z', '#B8262B');
  s += P('M134 130 L158 136', 'none', 'stroke="#7e1519" stroke-width="3" fill="none"');
  // короткие рукава (культи у плеч)
  s += P('M18 60 Q4 70 6 112 L52 112 L48 44 Z', '#E4D2A6') + P('M222 60 Q236 70 234 112 L188 112 L192 44 Z', '#E4D2A6');
  return wrap(240, 320, s);
}

function arm(coffee) {
  const W = coffee ? 140 : 100;
  const cx = W / 2;
  let s = '';
  s += R(cx - 30, 28, 60, 70, '#E4D2A6', 18); // рукав
  s += R(cx - 17, 90, 34, 118, SKIN, 14); // предплечье
  if (coffee) {
    // стаканчик
    s += P(`M${cx - 31} 188 L${cx + 31} 188 L${cx + 23} 272 L${cx - 23} 272 Z`, '#F5F5F0');
    s += P(`M${cx - 28} 214 L${cx + 28} 214 L${cx + 24} 252 L${cx - 24} 252 Z`, '#B5835A');
    s += R(cx - 35, 178, 70, 14, '#2a2a2a', 5);
    s += P(`M${cx - 4} 168 L${cx + 4} 168 L${cx + 4} 178 L${cx - 4} 178 Z`, '#2a2a2a');
    s += C(cx, 226, 24, SKIN); // ладонь поверх
    s += R(cx - 20, 238, 40, 10, SKIN, 5, NOSTROKE);
  } else {
    s += C(cx, 226, 25, SKIN);
  }
  return wrap(W, coffee ? 290 : 260, s);
}

function leg(side) {
  const dir = side === 'left' ? -1 : 1;
  const cx = 50;
  let s = '';
  s += P(`M${cx - 28} 0 L${cx + 28} 0 L${cx + 24} 196 L${cx - 24} 196 Z`, '#6B5B45');
  s += P(`M${cx} 20 L${cx} 190`, 'none', 'stroke="#524634" stroke-width="3" fill="none"');
  s += R(cx - 26, 188, 52, 34, '#1d1d1d', 4, 'stroke="none"');
  s += R(dir < 0 ? cx - 50 : cx - 26, 206, 76, 40, '#1d1d1d', 18);
  s += R(cx - 22, 190, 44, 20, '#1d1d1d', 3, 'stroke="none"');
  return wrap(110, 252, s);
}

// ================= РЕКВИЗИТ =================
// Объединение кругов с единым внешним контуром (облака, дым, пыль): сначала тёмные круги r+SW/2, потом заливка r.
const blob = (cs, fill) =>
  cs.map(([x, y, r]) => C(x, y, r + SW / 2, INK, NOSTROKE)).join('') + cs.map(([x, y, r]) => C(x, y, r, fill, NOSTROKE)).join('');

// ---- Суперкар: 840x300, земля y=270 (pivot 0.5, 0.9), едет вправо. Кабина открытая: водитель - отдельный спрайт.
// Спрайт водителя = тот же SVG (интерьер + фигура + передняя часть кузова) в окне viewBox, поэтому стыкуется с машиной пиксель в пиксель.
const CAR_W = 840, CAR_H = 300, CAR_GROUND = 270;
const DRV = { x: 340, y: 20, w: 200, h: 170 }; // окно водителя в координатах машины; низ-центр = (440,190) = pivot машины + (20, 80)

function carInterior() {
  let s = '';
  s += R(300, 100, 52, 60, '#2B3340', 12); // спинка сиденья
  s += R(306, 86, 38, 22, '#3a4456', 8); // подголовник
  return s;
}
const BODY = 'M20 244 L14 170 Q16 146 46 140 L120 134 Q190 108 262 116 L306 150 L556 150 L600 148 Q660 118 724 140 Q800 168 826 206 Q832 232 812 244 Z';
function carFront() {
  let s = '';
  const defs = `<clipPath id="bodyclip"><path d="${BODY}"/></clipPath>`;
  s += P(BODY, '#B9C5D1');
  s += `<g clip-path="url(#bodyclip)" stroke="none">`;
  s += R(0, 196, 840, 60, '#8FA0B4', 0, NOSTROKE); // нижняя тёмная полоса хрома
  s += R(0, 176, 840, 18, '#5E7FA8', 0, NOSTROKE); // отражённый «горизонт»
  s += P('M0 100 L840 100 L840 152 L0 148 Z', '#F4F8FB', NOSTROKE); // верхний блик
  s += P('M380 160 L424 160 L396 232 L352 232 Z', '#F4F8FB', NOSTROKE); // блик-полоса на двери
  s += P('M440 160 L462 160 L434 232 L412 232 Z', '#F4F8FB', NOSTROKE);
  s += `</g>`;
  s += P(BODY, 'none');
  // дверь, ручка, воздухозаборник
  s += P('M330 156 L322 234 M330 156 L556 156', 'none', 'fill="none" stroke-width="2.5"');
  s += R(470, 168, 38, 7, '#4a5568', 3);
  s += P('M226 150 L290 150 L296 190 L232 190 Z', '#3a4456');
  // спойлер
  s += R(34, 112, 10, 34, '#222', 0) + P('M6 100 L124 92 L126 110 L6 118 Z', '#222');
  // фары
  s += P('M778 164 L824 202 L810 210 L768 180 Z', '#FFE35A') + R(14, 150, 14, 22, '#E0312F', 3);
  // колёса
  for (const x of [190, 650]) {
    s += C(x, 218, 52, '#1d1d1d');
    s += C(x, 218, 34, '#E7ECF1') + C(x, 218, 14, '#9AA7B6');
    for (let a = 0; a < 5; a++) { const r = (a * 72 * Math.PI) / 180; s += P(`M${x} 218 L${x + Math.cos(r) * 33} ${218 + Math.sin(r) * 33}`, 'none', 'stroke="#9AA7B6" stroke-width="6" fill="none"'); }
  }
  // лобовое стекло (спереди фигуры)
  s += P('M604 150 L566 96 L582 94 L626 148 Z', '#9DC7EA');
  s += P('M572 102 L580 100 L596 124 L588 126 Z', '#fff', NOSTROKE);
  // блик-звезда
  s += P('M700 142 L705 152 L716 156 L705 160 L700 170 L695 160 L684 156 L695 152 Z', '#fff', NOSTROKE);
  return { s, defs };
}
function supercar() {
  const f = carFront();
  return wrap(CAR_W, CAR_H, carInterior() + f.s, f.defs);
}
// фигура: телесный силуэт без деталей, маска пришельца, руки на руле (координаты машины)
function driverFigure() {
  let s = '';
  s += P('M440 126 L486 144 L508 140', 'none', `stroke="${INK}" stroke-width="22" fill="none"`) + P('M440 126 L486 144 L508 140', 'none', 'stroke="#E6B48A" stroke-width="16" fill="none"'); // дальняя рука
  s += R(424, 94, 22, 20, SKIN, 6); // шея
  s += P('M386 170 Q378 120 404 108 Q436 98 458 114 Q470 134 464 170 Z', SKIN); // торс
  // руль (кольцо)
  s += `<ellipse cx="516" cy="140" rx="8" ry="27" transform="rotate(22 516 140)" fill="none" stroke="${INK}" stroke-width="13"/>`;
  s += `<ellipse cx="516" cy="140" rx="8" ry="27" transform="rotate(22 516 140)" fill="none" stroke="#454c5c" stroke-width="7" stroke-linecap="butt"/>`;
  // ближняя рука
  s += P('M448 122 L486 134 L510 132', 'none', `stroke="${INK}" stroke-width="22" fill="none"`) + P('M448 122 L486 134 L510 132', 'none', `stroke="${SKIN}" stroke-width="16" fill="none"`);
  s += C(510, 134, 10, SKIN) + C(506, 146, 9, '#E6B48A');
  // голова-маска (яйцо) + огромные чёрные глаза
  s += P('M436 26 C472 26 480 56 466 80 C458 96 446 102 436 102 C426 102 414 96 406 80 C392 56 400 26 436 26 Z', '#B7C9C2');
  s += P('M406 56 Q424 56 434 74 Q414 78 406 64 Z', '#101418') + P('M466 56 Q448 56 438 74 Q458 78 466 64 Z', '#101418');
  s += P('M412 62 L418 60 M460 62 L454 60', 'none', 'stroke="#fff" stroke-width="3" fill="none"');
  s += P('M428 90 Q436 94 444 90', 'none', `stroke="${INK}" stroke-width="2.5" fill="none"`);
  return s;
}
function alienDriver() {
  const f = carFront();
  return wrap(DRV.w, DRV.h, carInterior() + driverFigure() + f.s, f.defs, `${DRV.x} ${DRV.y} ${DRV.w} ${DRV.h}`);
}

// ---- Oppressor Mk II: 640x380, летит вправо, виден как БАЙК: два больших колеса, вилка, высокий руль, сиденье, хвостовое крыло, ракеты, огонь
function oppressor() {
  let b = '';
  // дальнее крыло-плавник (тёмное)
  b += P('M300 170 L250 66 L206 72 L256 186 Z', '#7D161F');
  // колёса
  for (const [x, y, r] of [[170, 280, 70], [470, 290, 62]]) {
    b += C(x, y, r, '#1d1d1d') + C(x, y, r * 0.52, '#B4BCC9') + C(x, y, r * 0.2, '#3d4558');
    for (let a = 0; a < 5; a++) { const q = (a * 72 * Math.PI) / 180; b += P(`M${x} ${y} L${x + Math.cos(q) * r * 0.5} ${y + Math.sin(q) * r * 0.5}`, 'none', 'stroke="#6f7a8c" stroke-width="5" fill="none"'); }
  }
  // вилка и высокий руль
  b += P('M440 160 L468 154 L488 284 L462 290 Z', '#9AA3B2');
  b += P('M436 158 L420 100 L436 96 L456 154 Z', '#3d4558');
  b += R(396, 86, 62, 14, '#222', 6) + R(450, 82, 16, 22, '#222', 5);
  b += P('M458 112 L500 86 L526 90 L480 128 Z', '#8FC8F0'); // стекло
  b += P('M470 196 L492 190 L496 214 L474 218 Z', '#FFE35A'); // фара
  // ракетный подвес и две ракеты между колёсами
  b += R(262, 236, 130, 14, '#8a93a4', 5);
  for (const y of [254, 276]) {
    b += P(`M270 ${y} L372 ${y} L372 ${y + 18} L270 ${y + 18} Z`, '#ECEFF2');
    b += P(`M372 ${y} Q410 ${y + 9} 372 ${y + 18} Z`, '#E0312F');
    b += P(`M270 ${y} L252 ${y - 4} L262 ${y + 9} L252 ${y + 22} L270 ${y + 18} Z`, '#E0312F');
    b += P(`M252 ${y + 9} L230 ${y + 5} L238 ${y + 9} L230 ${y + 14} Z`, '#FF9A1F');
  }
  // корпус: бак + блок двигателя
  b += P('M110 190 L150 150 L290 138 Q352 138 384 160 L448 172 Q486 180 486 198 L446 216 L300 228 L150 238 L110 226 Z', '#2F3646');
  b += P('M154 156 L290 146 Q340 146 366 162 L300 160 L160 168 Z', '#6B778F', NOSTROKE);
  b += R(112, 202, 370, 12, '#C8232C', 0, 'stroke="none"');
  // сиденье
  b += P('M196 142 Q236 120 306 130 L310 148 L198 154 Z', '#1b1b1b');
  // сопла и пламя
  b += P('M44 168 L-96 140 L-40 176 L-116 204 L-34 212 L-84 248 L44 224 Z', '#FF8A1F');
  b += P('M44 176 L-34 160 L-6 186 L-52 204 L2 210 L-16 230 L44 220 Z', '#FFC42E');
  b += P('M44 184 L2 180 L12 198 L-8 206 L44 212 Z', '#FFF2A0', NOSTROKE);
  b += R(40, 158, 84, 36, '#4B5468', 8) + R(40, 202, 84, 36, '#4B5468', 8);
  b += E(44, 176, 8, 16, '#FF7A1A') + E(44, 220, 8, 16, '#FF7A1A');
  // ближнее крыло (красное), стреловидное назад-вверх
  b += P('M350 178 L290 164 L150 64 L120 82 L220 196 Z', '#B3202A');
  b += P('M300 172 L146 74', 'none', 'stroke="#E8626A" stroke-width="7" fill="none"');
  return wrap(660, 380, `<g transform="translate(110 0)">${b}</g>`);
}

function rocket() {
  let s = '';
  s += P('M60 36 L2 22 L26 36 L0 52 L60 44 Z', '#FF9A1F') + P('M60 37 L22 35 L60 43 Z', '#FFE35A', NOSTROKE);
  s += P('M78 14 L120 34 L78 34 Z', '#8E1E26') + P('M78 58 L120 38 L78 38 Z', '#8E1E26');
  s += P('M56 22 L170 22 Q214 22 236 40 Q214 58 170 58 L56 58 Z', '#ECEFF2');
  s += P('M170 22 Q214 22 236 40 Q214 58 170 58 Z', '#E0312F');
  s += R(110, 22, 12, 36, '#E0312F', 0) + R(130, 22, 6, 36, '#222', 0);
  return wrap(240, 72, s);
}

function billboard() {
  let s = '';
  s += R(150, 450, 44, 190, '#4a4f5c') + R(806, 450, 44, 190, '#4a4f5c');
  s += R(110, 600, 124, 14, '#33373f') + R(766, 600, 124, 14, '#33373f');
  s += R(30, 30, 940, 430, '#3b404c', 10); // рама
  s += R(52, 52, 896, 386, '#0b0d12', 4); // экран (пустой)
  return wrap(1000, 640, s);
}

function dust() {
  const cs = [[160, 150, 60], [100, 160, 48], [220, 160, 48], [70, 190, 34], [250, 192, 36], [130, 110, 46], [195, 110, 46], [160, 80, 34], [160, 196, 46], [105, 196, 36], [215, 198, 36]];
  return wrap(320, 260, blob(cs, '#E3DAC8'));
}

// ================= FX (плоские, для хаоса и исчезновения) =================
function star(cx, cy, n, rOut, rIn, rot = 0) {
  let d = '';
  for (let i = 0; i < n * 2; i++) {
    const a = rot + (i * Math.PI) / n, r = i % 2 ? rIn : rOut;
    d += (i ? 'L' : 'M') + (cx + Math.cos(a) * r).toFixed(1) + ' ' + (cy + Math.sin(a) * r).toFixed(1) + ' ';
  }
  return d + 'Z';
}
function fxBoom() {
  let s = '';
  s += P(star(130, 130, 9, 124, 74, -0.2), '#E8402A');
  s += P(star(130, 130, 8, 94, 56, 0.3), '#FF9D1C');
  s += C(130, 130, 42, '#FFE45C');
  return wrap(260, 260, s);
}
function fxFlash() {
  // белая «звезда»: 12 тонких лучей (длинные/короткие), без контура
  let d = '';
  const N = 12, cx = 256, cy = 256;
  for (let i = 0; i < N; i++) {
    const a = (i * 2 * Math.PI) / N - Math.PI / 2, b = a + Math.PI / N;
    const r = i % 2 ? 150 : 250;
    d += `${i ? 'L' : 'M'}${(cx + Math.cos(a) * r).toFixed(1)} ${(cy + Math.sin(a) * r).toFixed(1)} L${(cx + Math.cos(b) * 26).toFixed(1)} ${(cy + Math.sin(b) * 26).toFixed(1)} `;
  }
  d += 'Z';
  return wrap(512, 512, P(d, '#FFFFFF', NOSTROKE) + C(256, 256, 62, '#FFFFFF', NOSTROKE) + C(256, 256, 38, '#FFF6C8', NOSTROKE));
}
function fxSmoke() {
  const a = [[100, 170, 62], [180, 140, 76], [250, 175, 58], [150, 90, 52], [215, 80, 44]];
  return wrap(340, 260, blob(a, '#5B5B6A') + C(120, 150, 22, '#74748A', NOSTROKE) + C(190, 118, 26, '#74748A', NOSTROKE));
}
function fxTrashFire() {
  let s = '';
  // пламя
  s += P('M54 150 Q30 110 52 70 Q56 100 74 96 Q70 50 96 14 Q102 56 120 74 Q134 52 130 36 Q166 80 150 150 Z', '#FF8A1F');
  s += P('M76 150 Q64 120 84 96 Q90 118 102 112 Q104 90 114 78 Q138 110 124 150 Z', '#FFC42E');
  s += P('M94 150 Q88 134 100 122 Q112 134 108 150 Z', '#FFF2A0', NOSTROKE);
  // урна
  s += P('M40 156 L160 156 L148 286 L52 286 Z', '#5E6B66');
  s += R(30, 146, 140, 18, '#7C8A84', 6);
  s += P('M82 170 L84 272 M118 170 L116 272', 'none', 'stroke="#3f4a46" stroke-width="3" fill="none"');
  return wrap(200, 300, s);
}
function fxDebris() {
  let s = '';
  s += P('M30 120 L90 96 L128 130 L96 176 L40 170 Z', '#9A9AA6'); // бетон
  s += P('M168 60 L238 48 L252 92 L186 104 Z', '#C0532F'); // кирпич
  s += P('M270 150 L384 118 L392 140 L282 176 Z', '#7A8396'); // обломок металла
  s += P('M150 190 L200 176 L214 210 L162 222 Z', '#9A9AA6');
  s += P('M300 40 L340 20 L350 64 Z', '#9DC7EA'); // стекло
  s += P('M60 36 L84 20 L96 52 L70 62 Z', '#9DC7EA');
  s += P('M230 160 Q252 128 288 142 L276 156 Q256 146 244 170 Z', '#1d1d1d'); // дуга покрышки
  s += P('M340 190 L372 174 L382 204 L350 214 Z', '#C0532F');
  return wrap(420, 240, s);
}
function fxTrail() {
  // след ракеты: цепочка кругов, крепится правым концом к хвосту ракеты
  const cs = [[500, 65, 12], [455, 66, 18], [405, 62, 26], [345, 68, 34], [275, 60, 42], [200, 70, 50], [120, 62, 56], [60, 68, 48]];
  return wrap(540, 130, blob(cs, '#E4E4EC'));
}
function fxTooth() {
  let s = '';
  s += P('M8 22 Q6 6 24 8 Q42 6 40 22 Q40 40 34 56 Q31 60 28 48 Q24 42 20 48 Q17 60 14 56 Q8 40 8 22 Z', '#FFFBE8');
  s += C(24, 56, 4, '#C8404E', 'stroke="none"');
  return wrap(48, 64, s);
}

// ================= ФОН: плоские слои, один контур, без шума и градиентов =================
const W_SKY = 2000, W_FAR = 2100, W_MID = 2300, W_FORE = 2500, H = 1080;

function sky() {
  let s = '';
  const bands = [[0, '#0F0E33'], [300, '#1C1650'], [520, '#2E1E6A'], [680, '#5A2A86'], [780, '#A93A8C']];
  bands.forEach(([y, c], i) => {
    const y2 = i + 1 < bands.length ? bands[i + 1][0] : H;
    s += R(0, y, W_SKY, y2 - y + 2, c, 0, NOSTROKE);
  });
  // два плоских облака
  s += blob([[380, 330, 40], [440, 310, 54], [510, 332, 38]], '#2B2266') + blob([[1500, 430, 36], [1560, 412, 50], [1630, 432, 36]], '#3B2C80');
  // луна (плоский диск)
  s += C(1380, 170, 76, '#F6EDA8');
  // несколько простых звёзд
  for (const [x, y, r] of [[120, 90, 4], [300, 200, 3], [520, 70, 4], [700, 160, 3], [860, 60, 4], [1040, 180, 3], [1180, 80, 4], [1560, 90, 3], [1700, 210, 4], [1860, 120, 3], [1900, 300, 3], [200, 420, 3], [980, 380, 3], [1260, 330, 3]])
    s += C(x, y, r, '#FFF6C8', NOSTROKE);
  return wrap(W_SKY, H, s);
}

function far() {
  let s = '';
  const base = 790;
  let x = -20;
  const cols = ['#262260', '#2E2970', '#211D55'];
  while (x < W_FAR) {
    const w = ri(110, 190), h = ri(240, 520), top = base - h;
    s += R(x, top, w, base - top + 300, pick(cols));
    for (let k = 0; k < ri(1, 3); k++) s += R(x + ri(14, w - 50), top + ri(24, h - 80), 26, 34, '#F1D56A', 2, NOSTROKE);
    x += w - 2;
  }
  // высотка со шпилем
  s += P('M1500 790 L1500 250 L1548 250 L1560 120 L1572 250 L1620 250 L1620 790 Z', '#332D75');
  s += R(1522, 300, 28, 36, '#F1D56A', 2, NOSTROKE) + R(1572, 380, 28, 36, '#F1D56A', 2, NOSTROKE);
  return wrap(W_FAR, H, s);
}

function palm(x, base, h, lean) {
  let s = '';
  const tx = x + lean, ty = base - h;
  s += P(`M${x - 12} ${base} L${tx - 6} ${ty} L${tx + 6} ${ty} L${x + 12} ${base} Z`, '#7A4F2B');
  const L = h * 0.34;
  for (const [deg, col] of [[-165, '#2F9A45'], [-125, '#1F7034'], [-90, '#2F9A45'], [-55, '#1F7034'], [-15, '#2F9A45']]) {
    const a = (deg * Math.PI) / 180;
    const ex = tx + Math.cos(a) * L, ey = ty + Math.sin(a) * L + 20;
    const nx = Math.cos(a - Math.PI / 2) * L * 0.2, ny = Math.sin(a - Math.PI / 2) * L * 0.2;
    s += P(`M${tx} ${ty} Q${(tx + ex) / 2 + nx} ${(ty + ey) / 2 + ny} ${ex} ${ey} Q${(tx + ex) / 2 - nx} ${(ty + ey) / 2 - ny + 14} ${tx} ${ty} Z`, col);
  }
  return s;
}

function neonSign(cx, cy, text, col, size = 44) {
  const w = text.length * size * 0.72 + 40;
  return R(cx - w / 2, cy - size * 0.95, w, size * 1.5, '#12101f', 10) + T(cx, cy + size * 0.2, text, col, size);
}

function building(x, top, w, color, o = {}) {
  const base = 770;
  let s = R(x, top, w, base - top, color);
  s += R(x - 8, top - 14, w + 16, 22, o.trim || '#1b1b2a');
  // витрина + дверь
  s += R(x + 18, 575, w - 36, 175, o.glass || '#FFD36B');
  s += R(x + w - 86, 600, 56, 150, '#2A1F3D');
  s += P(`M${x + 18 + (w - 36) / 2 - 20} 575 L${x + 18 + (w - 36) / 2 - 20} 750`, 'none', 'stroke="#c2923f" stroke-width="3" fill="none"');
  // тент: крупные полосы
  const aw = o.awning || ['#FF4FB8', '#FFF1F6'];
  const n = 8, sw = (w - 16) / n;
  for (let i = 0; i < n; i++) s += P(`M${x + 8 + i * sw} 536 L${x + 8 + (i + 1) * sw} 536 L${x + 12 + (i + 1) * sw} 580 L${x + 4 + i * sw} 580 Z`, aw[i % 2]);
  if (o.sign) s += neonSign(x + w / 2, 475, o.sign.t, o.sign.c, o.sign.s || 44);
  if (o.sign2) s += neonSign(x + w / 2, 410, o.sign2.t, o.sign2.c, o.sign2.s || 30);
  return s;
}

function mid() {
  let s = '';
  s += building(40, 400, 340, '#5A3E7A', { sign: { t: 'LIQUOR', c: '#FF4FB8', s: 46 } });
  s += building(420, 330, 340, '#2F5D6B', { sign: { t: 'PIZZA', c: '#3FE0E8', s: 50 }, awning: ['#E0312F', '#fff'] });
  s += building(800, 300, 340, '#3E4B7A', { sign: { t: 'MOTEL', c: '#FFE35A', s: 46 }, sign2: { t: 'VACANCY', c: '#FF3355', s: 24 }, awning: ['#3FE0E8', '#fff'] });
  // кофейня
  const cx = 1180, cw = 420;
  s += building(cx, 430, cw, '#CFE8D0', { trim: '#2c4a38', glass: '#FFE7A0', awning: ['#2F9A45', '#F4FFF4'], sign: { t: 'VEGAN COFFEE', c: '#7CFF9B', s: 34 } });
  // вывеска-чашка на крыше
  s += R(cx + cw / 2 - 40, 346, 80, 70, '#FFF', 8) + P(`M${cx + cw / 2 - 30} 362 L${cx + cw / 2 + 20} 362 L${cx + cw / 2 + 12} 404 L${cx + cw / 2 - 22} 404 Z`, '#8A5A3A') + P(`M${cx + cw / 2 + 20} 370 q22 4 0 22`, 'none', 'stroke="#1b1b1b" stroke-width="4" fill="none"');
  s += building(1640, 380, 320, '#7A3B4B', { sign: { t: 'TATTOO', c: '#FF9A1F', s: 46 }, awning: ['#FFE35A', '#222'] });
  s += building(1990, 420, 310, '#4B3E7A', { sign: { t: 'BAR', c: '#B07CFF', s: 54 } });
  for (const [x, h, l] of [[400, 380, 24], [780, 360, -22], [1160, 340, 20], [1620, 370, -24], [1975, 350, 22]]) s += palm(x, 770, h, l);
  return wrap(W_MID, H, s);
}

function fore() {
  let s = '';
  const sw0 = 770, sw1 = 930, rd0 = 965;
  s += R(-10, sw0, W_FORE + 20, sw1 - sw0, '#8D8B98'); // тротуар
  s += R(-10, sw1, W_FORE + 20, rd0 - sw1, '#C9C5BD'); // бордюр
  s += R(-10, rd0, W_FORE + 20, H - rd0 + 10, '#34343F'); // асфальт
  for (let x = 40; x < W_FORE; x += 300) s += R(x, 1030, 150, 14, '#F2C230', 2, NOSTROKE); // разметка: плоские плашки
  return wrap(W_FORE, H, s);
}

// ================= сборка =================
const GREG_PARTS = {
  greg_head_closed: () => head(false), greg_head_open: () => head(true), greg_torso: torso,
  greg_arm_left: () => arm(false), greg_arm_right_coffee: () => arm(true),
  greg_leg_left: () => leg('left'), greg_leg_right: () => leg('right'),
};
const ALL = {
  bg_sky: sky, bg_far: far, bg_mid: mid, bg_fore: fore,
  ...GREG_PARTS,
  prop_supercar: supercar, prop_alien_driver: alienDriver, prop_oppressor: oppressor, prop_rocket: rocket, prop_billboard: billboard, prop_dust: dust,
  fx_boom: fxBoom, fx_flash: fxFlash, fx_smoke: fxSmoke, fx_trashfire: fxTrashFire, fx_debris: fxDebris, fx_trail: fxTrail, fx_tooth: fxTooth,
};

const only = process.argv.slice(2);
const names = Object.keys(ALL).filter((n) => !only.length || only.includes(n));

async function render(name) {
  const svg = ALL[name]();
  const file = path.join(IMG, name + '.png');
  await sharp(Buffer.from(svg), { density: 72 }).png().toFile(file);
  const m = await sharp(file).metadata();
  const meta = META[name];
  const entry = { file: name + '.png', width: m.width, height: m.height, pivot: meta.pivot, group: meta.group, note: meta.note, source: 'svg-fallback' };
  if (meta.z !== undefined) { entry.z = meta.z; entry.parallax = meta.parallax; }
  if (meta.facing) entry.facing = meta.facing;
  if (name === 'greg_torso') entry.joints = { neck: [120, 28], shoulder_left: [30, 62], shoulder_right: [210, 62], hip_left: [80, 296], hip_right: [160, 296] };
  if (name === 'prop_billboard') { entry.screen = { x: 52, y: 52, w: 896, h: 386, fx: 0.052, fy: 0.081, fw: 0.896, fh: 0.603 }; }
  upsertManifest(name, entry);
  console.log('ok', name, m.width + 'x' + m.height);
}

for (const n of names) await render(n);

// цельный образ-референс Грега (сборка из частей) - только когда рендерим всё/Грега
if (!only.length || only.some((n) => n.startsWith('greg_'))) {
  const f = (n) => path.join(IMG, n + '.png');
  const comp = [
    { input: f('greg_arm_left'), left: 50, top: 394 },
    { input: f('greg_arm_right_coffee'), left: 210, top: 393 },
    { input: f('greg_leg_left'), left: 95, top: 646 },
    { input: f('greg_leg_right'), left: 175, top: 646 },
    { input: f('greg_torso'), left: 70, top: 360 },
    { input: f('greg_head_closed'), left: 10, top: 58 },
  ];
  // порядок: руки/ноги за торсом
  const out = f('greg_ref');
  await sharp({ create: { width: 400, height: 920, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } }).composite(comp).png().toFile(out);
  const m = await sharp(out).metadata();
  upsertManifest('greg_ref', { file: 'greg_ref.png', width: m.width, height: m.height, pivot: META.greg_ref.pivot, group: 'ref', note: META.greg_ref.note, source: 'svg-fallback' });
}
