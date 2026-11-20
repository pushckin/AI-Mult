// FALLBACK-генератор: те же ассеты, но программно (SVG -> PNG RGBA) в стиле South Park (плоская вырезная бумага).
// Нужен, пока у ключа Gemini нет квоты на image-модели. Те же имена/манифест, что у gen_assets.mjs.
// Запуск: node make_svg_assets.mjs [имя ...]
import sharp from 'sharp';
import path from 'node:path';
import { IMG, upsertManifest, paperTexture } from './lib.mjs';
import { META } from './assets_meta.mjs';

const INK = '#1b1b1b';
const SW = 3;
let seed = 7;
const rnd = () => { seed |= 0; seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const ri = (a, b) => Math.floor(a + rnd() * (b - a + 1));
const pick = (arr) => arr[ri(0, arr.length - 1)];

const wrap = (w, h, body, rough = 3) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <defs><filter id="rough" x="-3%" y="-3%" width="106%" height="106%">
    <feTurbulence type="fractalNoise" baseFrequency="0.03" numOctaves="2" seed="3" result="n"/>
    <feDisplacementMap in="SourceGraphic" in2="n" scale="${rough}" xChannelSelector="R" yChannelSelector="G"/></filter></defs>
  <g filter="url(#rough)" stroke="${INK}" stroke-width="${SW}" stroke-linejoin="round" stroke-linecap="round">${body}</g></svg>`;

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
  // складки
  s += P('M60 190 L80 232 M180 200 L168 240 M100 150 L88 178', 'none', 'stroke="#b9a678" stroke-width="3" fill="none"');
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
function supercar() {
  let s = '';
  // корпус: низкий клин, хром (плоские блики)
  s += P('M22 168 L26 126 Q44 106 130 100 L300 94 Q350 46 450 40 L536 42 Q600 84 706 104 Q776 112 788 144 L790 172 L22 172 Z', '#CBD3DB');
  s += P('M30 130 Q50 112 132 106 L300 100 Q352 56 450 48 L520 50 L470 56 Q380 64 322 108 L130 114 Q60 120 38 140 Z', '#F4F8FB', NOSTROKE); // верхний блик
  s += P('M22 150 L788 150 L790 172 L22 172 Z', '#8DA0B6', NOSTROKE); // нижняя тёмная полоса
  s += P('M60 138 L700 126 L760 134 L760 142 L60 150 Z', '#6E85A6', NOSTROKE); // синий отражённый горизонт
  s += P('M22 168 L26 126 Q44 106 130 100 L300 94 Q350 46 450 40 L536 42 Q600 84 706 104 Q776 112 788 144 L790 172 L22 172 Z', 'none');
  // кабина
  s += P('M326 98 Q362 58 452 54 L528 56 Q572 82 626 100 L326 100 Z', '#2B3B57');
  s += P('M372 94 Q392 68 440 62 L470 62 L420 96 Z', '#7FA0C8', NOSTROKE);
  s += P('M470 62 L500 62 L470 96 L440 96 Z', '#7FA0C8', NOSTROKE, );
  s += P('M326 98 Q362 58 452 54 L528 56 Q572 82 626 100 L326 100 Z', 'none');
  // дверь, ручка, воздухозаборник
  s += P('M330 102 L330 160 M330 102 L600 108', 'none', 'stroke="' + INK + '" stroke-width="2.5" fill="none"');
  s += R(420, 118, 36, 6, '#555e6b', 3);
  s += P('M214 120 L280 116 L282 146 L218 150 Z', '#3a4452');
  // спойлер
  s += R(14, 92, 26, 8, '#222') + R(24, 98, 6, 28, '#222', 0);
  // фары
  s += P('M742 118 L786 134 L780 146 L736 140 Z', '#FFE35A') + R(24, 132, 14, 18, '#E0312F', 3);
  // колёса
  for (const x of [198, 622]) {
    s += C(x, 168, 44, '#1d1d1d');
    s += C(x, 168, 28, '#D8DEE5') + C(x, 168, 9, '#8B97A5');
    for (let a = 0; a < 5; a++) { const r = (a * 72 * Math.PI) / 180; s += P(`M${x} 168 L${x + Math.cos(r) * 27} ${168 + Math.sin(r) * 27}`, 'none', 'stroke="#8B97A5" stroke-width="4" fill="none"'); }
  }
  // искры/блеск
  s += P('M470 70 L476 82 L488 86 L476 90 L470 102 L464 90 L452 86 L464 82 Z', '#fff', 'stroke="none"');
  return wrap(810, 240, s);
}

function alienDriver() {
  let s = '';
  // руки вперёд (вправо) к рулю
  s += P('M96 150 Q150 132 196 150 L196 176 Q150 164 100 184 Z', SKIN);
  s += C(200, 164, 15, SKIN);
  s += C(204, 168, 26, 'none', 'stroke="#5a3a22" stroke-width="7" fill="none"');
  // торс (гладкий силуэт)
  s += P('M40 250 Q34 160 80 134 Q130 126 150 160 L150 250 Z', SKIN);
  // голова-маска пришельца
  s += E(92, 78, 62, 70, '#AEBDC4');
  s += P('M44 60 Q70 54 90 78 Q70 98 46 86 Q36 72 44 60 Z', '#101418');
  s += P('M140 60 Q114 54 94 78 Q114 98 138 86 Q148 72 140 60 Z', '#101418');
  s += P('M60 66 L68 62', 'none', 'stroke="#fff" stroke-width="4" fill="none"') + P('M122 66 L130 62', 'none', 'stroke="#fff" stroke-width="4" fill="none"');
  s += P('M80 120 Q92 126 104 120', 'none', 'stroke="' + INK + '" stroke-width="3" fill="none"');
  s += R(76, 138, 32, 14, SKIN, 5, NOSTROKE);
  return wrap(240, 262, s);
}

function oppressor() {
  let s = '';
  // пламя сопла (слева)
  s += P('M40 130 L-0 120 L22 136 L-4 150 L40 150 Z', '#FF9A1F') + P('M40 134 L14 132 L40 146 Z', '#FFE35A', NOSTROKE);
  // крылья (дальнее)
  s += P('M250 96 L360 40 L430 40 L330 110 Z', '#8E1E26');
  // основной корпус
  s += P('M44 118 L70 100 L230 92 L380 108 L520 138 L548 150 L520 162 L380 164 L230 160 L60 156 L40 140 Z', '#2E3442');
  s += P('M100 108 L230 100 L360 114 L300 120 L110 118 Z', '#566074', NOSTROKE);
  // два двигателя (сопла)
  s += R(36, 104, 62, 56, '#3d4558', 10) + E(40, 132, 14, 26, '#FF7A1A') + E(42, 132, 7, 14, '#FFE35A', NOSTROKE);
  s += R(70, 98, 120, 16, '#8E1E26', 5);
  // сиденье и руль
  s += P('M220 96 Q250 70 300 84 L316 100 L224 102 Z', '#1b1b1b');
  s += P('M356 104 L384 70 L404 72', 'none', 'stroke="' + INK + '" stroke-width="7" fill="none"');
  // переднее крыло-канард и ракетная подвеска
  s += P('M380 150 L470 118 L500 124 L440 164 Z', '#8E1E26');
  s += R(240, 168, 150, 22, '#9aa3b2', 10) + C(246, 179, 4, INK, NOSTROKE) + C(386, 179, 4, INK, NOSTROKE);
  s += P('M392 170 L440 179 L392 188 Z', '#E0312F');
  // ближнее крыло
  s += P('M200 150 L300 214 L380 214 L330 158 Z', '#A8262E');
  s += P('M214 156 L296 206', 'none', 'stroke="#d95a60" stroke-width="3" fill="none"');
  // ветровой дефлектор
  s += P('M380 104 Q420 92 440 118 L388 124 Z', '#7FB4E6');
  return wrap(570, 230, s);
}

function rocket() {
  let s = '';
  s += P('M60 36 L2 24 L26 36 L0 50 L60 44 Z', '#FF9A1F') + P('M60 37 L22 35 L60 43 Z', '#FFE35A', NOSTROKE);
  s += P('M78 14 L120 34 L78 34 Z', '#8E1E26') + P('M78 58 L120 38 L78 38 Z', '#8E1E26');
  s += P('M56 22 L170 22 Q214 22 236 40 Q214 58 170 58 L56 58 Z', '#ECEFF2');
  s += P('M170 22 Q214 22 236 40 Q214 58 170 58 Z', '#E0312F');
  s += R(110, 22, 12, 36, '#E0312F', 0) + R(130, 22, 6, 36, '#222', 0);
  s += P('M62 28 L168 28', 'none', 'stroke="#fff" stroke-width="4" fill="none"');
  return wrap(240, 72, s, 2);
}

function billboard() {
  let s = '';
  s += R(150, 450, 44, 190, '#4a4f5c') + R(806, 450, 44, 190, '#4a4f5c');
  s += R(110, 600, 124, 14, '#33373f') + R(766, 600, 124, 14, '#33373f');
  s += R(30, 30, 940, 430, '#3b404c', 10); // рама
  s += R(40, 462, 920, 22, '#2c3038');
  s += R(52, 52, 896, 386, '#0b0d12', 4); // экран (пустой)
  s += R(64, 64, 872, 362, 'none', 0, 'stroke="#1c2230" stroke-width="3"');
  for (let i = 0; i < 12; i++) { const x = 90 + i * 76; s += R(x, 36, 26, 10, '#FFE9A0', 3, 'stroke="none"') + R(x + 2, 484, 20, 8, '#FFE9A0', 3, 'stroke="none"'); }
  s += R(484, 440, 32, 12, '#2c3038');
  return wrap(1000, 640, s);
}

function dust() {
  const cs = [[160, 150, 60], [100, 160, 48], [220, 160, 48], [70, 190, 34], [250, 192, 36], [130, 110, 46], [195, 110, 46], [160, 80, 34], [160, 196, 46], [105, 196, 36], [215, 198, 36]];
  let s = '';
  for (const [x, y, r] of cs) s += C(x, y, r, '#D9CFBE');
  for (const [x, y, r] of cs) s += C(x, y, r - 1.5, '#E9E1D1', NOSTROKE);
  s += P('M110 120 Q150 100 190 118', 'none', 'stroke="#fff" stroke-width="5" fill="none" opacity="0.7"');
  s += P('M120 168 Q150 160 176 170', 'none', 'stroke="#C4B9A6" stroke-width="4" fill="none"');
  return wrap(320, 260, s);
}

// ================= ФОН =================
const W_SKY = 2000, W_FAR = 2100, W_MID = 2300, W_FORE = 2500, H = 1080;

function sky() {
  let s = '';
  const bands = [[0, '#0B0A24'], [210, '#16113A'], [390, '#271957'], [540, '#43237A'], [660, '#7A2E8E'], [750, '#C23C8C'], [830, '#E8588F']];
  bands.forEach(([y, c], i) => {
    const y2 = i + 1 < bands.length ? bands[i + 1][0] : H;
    let d = `M0 ${y} `;
    for (let x = 0; x <= W_SKY; x += 80) d += `L${x} ${y + (i ? ri(-7, 7) : 0)} `;
    d += `L${W_SKY} ${y2 + 14} L0 ${y2 + 14} Z`;
    s += P(d, c, 'stroke="none"');
  });
  // неоновые «прожекторы» (плоские треугольники)
  s += P('M300 800 L220 0 L520 0 Z', '#3FE0E8', 'stroke="none" opacity="0.16"');
  s += P('M1500 800 L1400 0 L1720 0 Z', '#FF4FB8', 'stroke="none" opacity="0.18"');
  s += P('M900 800 L1040 100 L1180 100 Z', '#7CFF9B', 'stroke="none" opacity="0.10"');
  // тучи
  for (const [x, y, w] of [[260, 300, 260], [900, 230, 320], [1500, 400, 280], [1800, 260, 200]]) {
    s += P(`M${x} ${y} q${w * 0.1} -50 ${w * 0.3} -30 q${w * 0.2} -60 ${w * 0.4} 0 q${w * 0.28} -20 ${w * 0.3} 30 Z`, '#2E1F66', 'stroke="#1b1236" stroke-width="3"');
  }
  // луна
  s += C(1380, 160, 72, '#F6EDA8', 'stroke="#d9cf7a" stroke-width="3"') + C(1410, 144, 62, '#16113A', 'stroke="none"');
  // звёзды
  for (let i = 0; i < 110; i++) {
    const x = ri(10, W_SKY - 10), y = ri(10, 600), r = pick([2, 2, 3, 4]);
    s += rnd() < 0.35
      ? P(`M${x} ${y - r * 2} L${x + r * 0.7} ${y - r * 0.7} L${x + r * 2} ${y} L${x + r * 0.7} ${y + r * 0.7} L${x} ${y + r * 2} L${x - r * 0.7} ${y + r * 0.7} L${x - r * 2} ${y} L${x - r * 0.7} ${y - r * 0.7} Z`, '#FFF6B0', 'stroke="none"')
      : C(x, y, r, pick(['#FFFFFF', '#FFF6B0', '#BFE9FF']), 'stroke="none"');
  }
  // дымовые следы ракет (плоские белые полосы)
  s += P('M1020 220 Q1150 190 1300 260', 'none', 'stroke="#d6c8ee" stroke-width="10" fill="none" opacity="0.5"');
  return wrap(W_SKY, H, s, 0);
}

function windowsGrid(x, y, w, h, colsGap = 26) {
  let s = '';
  for (let wy = y; wy < y + h - 40; wy += 50)
    for (let wx = x + 12; wx < x + w - 30; wx += colsGap + 20) {
      const lit = rnd() < 0.32;
      s += R(wx, wy, 20, 28, lit ? pick(['#FFD968', '#FFD968', '#7EE8F2', '#FF8FC8']) : '#15133A', 2, 'stroke="none"');
    }
  return s;
}

function far() {
  let s = '';
  const base = 790;
  let x = -20;
  const cols = ['#1E1B4A', '#262157', '#2F2866', '#211D52'];
  while (x < W_FAR) {
    const w = ri(80, 160), h = ri(220, 520), top = base - h, c = pick(cols);
    s += R(x, top, w, base - top + 300, c, 0, 'stroke-width="2.5"');
    s += windowsGrid(x, top + 20, w, h - 20);
    if (rnd() < 0.35) s += R(x + w / 2 - 3, top - 50, 6, 50, '#1b1236') + C(x + w / 2, top - 52, 6, '#FF3355', NOSTROKE);
    if (rnd() < 0.25) s += R(x + 10, top + h * 0.3, 10, 80, pick(['#FF4FB8', '#3FE0E8']), 3, 'stroke="none"');
    x += w - 4;
  }
  // высотка с шпилем
  s += P('M1500 790 L1500 250 L1548 250 L1560 120 L1572 250 L1620 250 L1620 790 Z', '#2F2866', 'stroke-width="2.5"');
  s += windowsGrid(1500, 270, 120, 500);
  s += C(1560, 110, 7, '#FF3355', NOSTROKE);
  return wrap(W_FAR, H, s, 2);
}

function palm(x, base, h, lean) {
  let s = '';
  const w0 = 24, w1 = 12, tx = x + lean, ty = base - h;
  s += P(`M${x - w0 / 2} ${base} Q${x + lean * 0.2 - 4} ${base - h * 0.5} ${tx - w1 / 2} ${ty} L${tx + w1 / 2} ${ty} Q${x + lean * 0.2 + 8} ${base - h * 0.5} ${x + w0 / 2} ${base} Z`, '#7A4F2B');
  for (let k = 1; k < 9; k++) {
    const t = k / 9, px = x + lean * t * t, py = base - h * t, ww = (w0 - (w0 - w1) * t) / 2;
    s += P(`M${px - ww} ${py} L${px + ww} ${py - 4}`, 'none', 'stroke="#4c2f17" stroke-width="2.5" fill="none"');
  }
  const L = h * 0.36;
  for (const [deg, col] of [[-170, '#1F7034'], [-140, '#2F9A45'], [-110, '#1F7034'], [-80, '#2F9A45'], [-50, '#1F7034'], [-20, '#2F9A45'], [10, '#1F7034'], [165, '#2F9A45'], [-90, '#2F9A45']]) {
    const a = (deg * Math.PI) / 180;
    const ex = tx + Math.cos(a) * L, ey = ty + Math.sin(a) * L + L * 0.28 * Math.abs(Math.cos(a));
    const nx = Math.cos(a - Math.PI / 2) * L * 0.16, ny = Math.sin(a - Math.PI / 2) * L * 0.16;
    s += P(`M${tx} ${ty} Q${tx + Math.cos(a) * L * 0.55 + nx} ${ty + Math.sin(a) * L * 0.55 + ny} ${ex} ${ey} Q${tx + Math.cos(a) * L * 0.55 - nx} ${ty + Math.sin(a) * L * 0.55 - ny + 10} ${tx} ${ty} Z`, col);
  }
  s += C(tx - 7, ty + 10, 7, '#5b3a1e') + C(tx + 8, ty + 12, 7, '#5b3a1e');
  return s;
}

function lamp(x, base) {
  return R(x - 5, base - 300, 10, 300, '#3d4150') + P(`M${x - 5} ${base - 300} Q${x + 40} ${base - 330} ${x + 70} ${base - 300}`, 'none', 'stroke="#3d4150" stroke-width="9" fill="none"')
    + R(x + 52, base - 304, 40, 14, '#3d4150', 5) + P(`M${x + 54} ${base - 290} L${x + 90} ${base - 290} L${x + 120} ${base - 150} L${x + 24} ${base - 150} Z`, '#FFE9A0', 'stroke="none" opacity="0.14"');
}

function neonSign(cx, cy, text, col, size = 44) {
  const w = text.length * size * 0.72 + 40;
  return R(cx - w / 2, cy - size * 0.95, w, size * 1.5, '#12101f', 10)
    + T(cx, cy + size * 0.2, text, col, size, `stroke="${col}" stroke-width="10" stroke-opacity="0.28"`)
    + T(cx, cy + size * 0.2, text, '#fff', size, `stroke="${col}" stroke-width="2"`);
}

function building(x, top, w, color, o = {}) {
  const base = 770;
  let s = R(x, top, w, base - top, color, 0, 'stroke-width="3"');
  s += R(x - 8, top - 14, w + 16, 22, o.trim || '#1b1b2a', 0);
  s += windowsGrid(x + 6, top + 36, w - 12, 520 - top, 24);
  // витрина
  s += R(x + 18, 575, w - 36, 175, o.glass || '#FFCF6E', 4);
  for (let gx = x + 18 + 60; gx < x + w - 18; gx += 70) s += P(`M${gx} 575 L${gx} 750`, 'none', 'stroke="#c2923f" stroke-width="3" fill="none"');
  s += P(`M${x + 30} 700 L${x + w - 30} 700`, 'none', 'stroke="#c2923f" stroke-width="3" fill="none"');
  for (let gx = x + 40; gx < x + w - 60; gx += 80) s += R(gx, 664, 34, 36, pick(['#E0312F', '#3A7BD5', '#7BC144']), 2) + R(gx + 8, 622, 20, 42, '#7a5230', 6);
  s += R(x + w - 80, 600, 52, 150, '#241830', 3);
  // тент
  const aw = o.awning || ['#FF4FB8', '#FFF1F6'];
  for (let i = 0, ax = x + 8; ax < x + w - 8; i++, ax += 36) s += P(`M${ax} 536 L${Math.min(ax + 36, x + w - 8)} 536 L${Math.min(ax + 40, x + w - 4)} 580 L${ax - 4} 580 Z`, aw[i % 2], 'stroke-width="2.5"');
  if (o.sign) s += neonSign(x + w / 2, 475, o.sign.t, o.sign.c, o.sign.s || 44);
  if (o.sign2) s += neonSign(x + w / 2, 410, o.sign2.t, o.sign2.c, o.sign2.s || 30);
  return s;
}

function mid() {
  let s = '';
  s += building(40, 400, 340, '#5A3E7A', { sign: { t: 'LIQUOR', c: '#FF4FB8', s: 46 } });
  s += building(420, 330, 340, '#2F5D6B', { sign: { t: 'PIZZA', c: '#3FE0E8', s: 50 }, awning: ['#E0312F', '#fff'] });
  // чистая стена под билборд (без витрины-неона сверху): здание повыше
  s += building(800, 300, 340, '#3E4B7A', { sign: { t: 'MOTEL', c: '#FFE35A', s: 46 }, sign2: { t: 'VACANCY', c: '#FF3355', s: 24 }, awning: ['#3FE0E8', '#fff'] });
  // кофейня
  const cx = 1180, cw = 420;
  s += building(cx, 430, cw, '#CFE8D0', { trim: '#2c4a38', glass: '#FFE7A0', awning: ['#2F9A45', '#F4FFF4'], sign: { t: 'VEGAN COFFEE', c: '#7CFF9B', s: 34 } });
  // вывеска-чашка на крыше
  s += R(cx + cw / 2 - 40, 346, 80, 70, '#FFF', 8) + P(`M${cx + cw / 2 - 30} 362 L${cx + cw / 2 + 20} 362 L${cx + cw / 2 + 12} 404 L${cx + cw / 2 - 22} 404 Z`, '#8A5A3A') + P(`M${cx + cw / 2 + 20} 370 q22 4 0 22`, 'none', 'stroke="#1b1b1b" stroke-width="4" fill="none"');
  s += building(1640, 380, 320, '#7A3B4B', { sign: { t: 'TATTOO', c: '#FF9A1F', s: 46 }, awning: ['#FFE35A', '#222'] });
  s += building(1990, 420, 310, '#4B3E7A', { sign: { t: 'BAR', c: '#B07CFF', s: 54 } });
  // пальмы и фонари
  for (const [x, h, l] of [[400, 380, 24], [780, 360, -22], [1160, 340, 20], [1620, 370, -24], [1975, 350, 22]]) s += palm(x, 770, h, l);
    return wrap(W_MID, H, s, 2);
}

function fore() {
  let s = '';
  const sw0 = 770, sw1 = 930, rd0 = 965;
  s += R(-10, sw0, W_FORE + 20, sw1 - sw0, '#8D8B98', 0, 'stroke="none"');
  s += R(-10, sw0, W_FORE + 20, 22, '#6F6D7C', 0, 'stroke="none"'); // тень у стен
  s += P(`M-10 ${sw0} L${W_FORE + 10} ${sw0}`, 'none', 'stroke="' + INK + '" stroke-width="3" fill="none"');
  for (let x = 0; x < W_FORE; x += 170) s += P(`M${x} ${sw0} L${x} ${sw1}`, 'none', 'stroke="#6F6D7C" stroke-width="3" fill="none"');
  s += P(`M-10 850 L${W_FORE + 10} 850`, 'none', 'stroke="#6F6D7C" stroke-width="3" fill="none"');
  for (let i = 0; i < 16; i++) { const x = ri(0, W_FORE), y = ri(790, 920); s += P(`M${x} ${y} l${ri(10, 24)} ${ri(-6, 6)} l${ri(6, 18)} ${ri(4, 14)}`, 'none', 'stroke="#5b5967" stroke-width="2.5" fill="none"'); }
  // бордюр
  s += R(-10, sw1, W_FORE + 20, rd0 - sw1, '#C9C5BD', 0, 'stroke-width="3"');
  s += R(-10, sw1, W_FORE + 20, 10, '#E4E0D7', 0, 'stroke="none"');
  // асфальт
  s += R(-10, rd0, W_FORE + 20, H - rd0 + 10, '#363641', 0, 'stroke="none"');
  for (let x = 40; x < W_FORE; x += 300) s += R(x, 1030, 150, 14, '#F2C230', 2, 'stroke-width="2"');
  s += E(700, 1010, 64, 12, '#25252e') + E(700, 1006, 44, 7, '#4a4a56', 'stroke="none"');
  // лужи
  for (const [x, y, rx] of [[420, 880, 120], [1480, 905, 150], [2150, 870, 90]]) s += E(x, y, rx, 14, '#5F7FA3', 'stroke-width="2.5"') + P(`M${x - rx * 0.5} ${y - 3} L${x - rx * 0.1} ${y - 3}`, 'none', 'stroke="#BFD8F2" stroke-width="3" fill="none"');
  // решётка ливнёвки
  s += R(960, 931, 110, 22, '#1c1c24') + [0, 1, 2, 3, 4, 5].map((i) => R(968 + i * 17, 934, 8, 16, '#4a4a56', 0, 'stroke="none"')).join('');
  // мусор: стаканчик и бумажка
  s += P('M1700 912 l30 -8 l8 26 l-30 4 Z', '#F5F5F0') + P('M300 920 l36 -10 l10 22 l-36 6 Z', '#E8E0B0');
  return wrap(W_FORE, H, s, 2);
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
};

const only = process.argv.slice(2);
const names = Object.keys(ALL).filter((n) => !only.length || only.includes(n));

async function render(name) {
  const svg = ALL[name]();
  const file = path.join(IMG, name + '.png');
  await sharp(Buffer.from(svg), { density: 72 }).png().toFile(file);
  await paperTexture(file, name.startsWith('bg_') ? 0.09 : 0.03);
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
