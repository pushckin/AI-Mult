// FALLBACK-генератор: те же ассеты, но программно (SVG -> PNG RGBA) в стиле South Park (грубая плоская вырезная бумага).
// Правила: только плоские непрозрачные заливки, жирный чёрный контур, никаких градиентов/прозрачности/шума/свечений.
// Запуск: node make_svg_assets.mjs [имя ...]
import sharp from 'sharp';
import path from 'node:path';
import { IMG, upsertManifest } from './lib.mjs';
import { META } from './assets_meta.mjs';

const INK = '#111111';
let SW = 6; // толщина контура текущего ассета (задаётся в render по STROKES)
const STROKES = {
  greg_head_closed: 10, greg_head_open: 10, greg_torso: 10, greg_arm_left: 10, greg_arm_right_coffee: 10, greg_leg_left: 10, greg_leg_right: 10,
  prop_supercar: 6, prop_alien_driver: 6, prop_oppressor: 6, prop_rocket: 6, prop_billboard: 8, prop_billboard_0000: 8, prop_dust: 7,
  fx_boom: 7, fx_smoke: 7, fx_trashfire: 6, fx_debris: 6, fx_trail: 6, fx_tooth: 10, fx_flash: 0,
  bg_sky: 0, bg_far: 5, bg_mid: 6, bg_fore: 6,
};
let seed = 7;
const rnd = () => { seed |= 0; seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const ri = (a, b) => Math.floor(a + rnd() * (b - a + 1));
const pick = (arr) => arr[ri(0, arr.length - 1)];

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
const LINE = (d, color, w) => P(d, 'none', `stroke="${color}" stroke-width="${w}" fill="none"`);
const T = (x, y, s, fill, size, extra = '') =>
  `<text x="${x}" y="${y}" font-family="Inter" font-weight="900" font-size="${size}" text-anchor="middle" fill="${fill}" stroke="none" ${extra}>${s}</text>`;
// конечность-«сосиска»: контурная обводка + заливка
const limb = (d, w, fill) => LINE(d, INK, w + 2 * SW) + LINE(d, fill, w);

// ================= ГРЕГ =================
const SKIN = '#F6CFA6';
const HAIR = '#6B4524';
function head(open) {
  let s = '';
  const clip = '<clipPath id="hc"><ellipse cx="180" cy="174" rx="164" ry="156"/></clipPath>' +
    '<clipPath id="el"><ellipse cx="138" cy="166" rx="38" ry="44"/></clipPath>';
  s += E(30, 198, 22, 28, SKIN) + E(330, 198, 22, 28, SKIN); // уши
  s += E(180, 174, 164, 156, SKIN); // голова-блин
  s += `<g clip-path="url(#hc)" stroke="none"><ellipse cx="10" cy="122" rx="54" ry="62" fill="${HAIR}"/><ellipse cx="350" cy="122" rx="54" ry="62" fill="${HAIR}"/></g>`;
  s += E(180, 174, 164, 156, 'none'); // контур поверх клипа
  s += LINE('M138 56 Q164 30 192 52', HAIR, 9) + LINE('M188 48 Q210 26 232 50', HAIR, 9); // две пряди на лысине
  // глаза-кружки: левый (на экране) с опущенным веком (тик), правый вытаращен
  s += E(138, 166, 38, 44, '#fff') + E(226, 164, 40, 48, '#fff');
  s += `<g clip-path="url(#el)" stroke="none"><rect x="90" y="110" width="100" height="58" fill="${SKIN}"/></g>`;
  s += LINE('M98 168 L178 168', INK, 9);
  s += C(152, 184, 10, INK, NOSTROKE) + C(214, 168, 10, INK, NOSTROKE);
  // брови
  s += LINE('M92 112 L150 126', '#4a2d17', 13) + LINE('M214 100 L276 80', '#4a2d17', 13);
  // тик: чёрточки у левого глаза
  s += LINE('M86 150 L64 140 M84 190 L62 196', INK, 7);
  // шрам через щёку: грубая красная полоса
  s += LINE('M236 244 L312 270', INK, 24) + LINE('M236 244 L312 270', '#D8283C', 11);
  s += LINE('M254 238 L262 256 M278 246 L286 264', INK, 6);
  // рот
  if (!open) {
    s += LINE('M112 272 Q160 290 214 262', INK, 11);
  } else {
    s += P('M112 246 Q170 234 228 250 Q230 314 170 316 Q110 314 112 246 Z', '#2b0a10');
    s += R(128, 248, 38, 22, '#fff', 0, NOSTROKE) + R(188, 248, 34, 22, '#fff', 0, NOSTROKE); // зубы, выбитый - в зазоре
    s += E(170, 298, 36, 13, '#E0607A', NOSTROKE);
  }
  return wrap(360, 340, s, clip);
}

function torso() {
  let s = '';
  s += R(40, 270, 160, 48, '#6B5B45', 4); // низ брюк (под ремнём)
  s += P('M44 24 L196 24 L226 276 L14 276 Z', '#E4D2A6'); // рубашка-трапеция
  s += R(14, 258, 212, 34, '#1d1d1d', 0); // ремень
  s += R(104, 262, 32, 26, '#E8C13A', 3);
  s += P('M92 18 L120 78 L148 18 Z', SKIN); // вырез
  s += P('M62 18 L120 84 L90 18 Z', '#FBF3DA') + P('M178 18 L120 84 L150 18 Z', '#FBF3DA'); // воротник
  s += P('M116 82 L146 92 L140 112 L112 102 Z', '#C8232C'); // кривой узел
  s += P('M124 108 L152 112 L172 214 L150 244 L126 214 Z', '#C8232C'); // галстук
  return wrap(240, 320, s);
}

function arm(coffee) {
  const W = coffee ? 140 : 100;
  const cx = W / 2;
  let s = '';
  s += R(cx - 28, 20, 56, 86, '#E4D2A6', 14); // короткий толстый рукав
  if (coffee) {
    // стаканчик, ладонь-варежка перед ним
    s += P(`M${cx - 38} 122 L${cx + 38} 122 L${cx + 28} 238 L${cx - 28} 238 Z`, '#FFFFFF');
    s += P(`M${cx - 34} 160 L${cx + 34} 160 L${cx + 30} 206 L${cx - 30} 206 Z`, '#A8683C');
    s += R(cx - 44, 108, 88, 20, '#2a2a2a', 6);
    s += C(cx, 150, 32, SKIN) + C(cx + 28, 140, 13, SKIN);
  } else {
    s += C(cx, 150, 34, SKIN) + C(cx + 30, 140, 14, SKIN);
  }
  return wrap(W, coffee ? 290 : 260, s);
}

function leg(side) {
  const dir = side === 'left' ? -1 : 1;
  const cx = 55;
  let s = '';
  s += R(cx - 33, 0, 66, 160, '#6B5B45', 6); // толстая нога-обрубок
  // ботинок: толстый чёрный блин с носком наружу
  s += P(`M${cx - 38} 150 L${cx + 38} 150 L${cx + 38} 200 Q${cx + 38 + 6 * dir} 238 ${cx + 62 * dir} 238 L${cx - 62 * dir} 238 Q${cx - 38 - 6 * dir} 238 ${cx - 38} 200 Z`, '#1d1d1d');
  return wrap(110, 252, s);
}

// ================= РЕКВИЗИТ =================
// Объединение кругов с единым внешним контуром (облака, дым, пыль)
const blob = (cs, fill) =>
  cs.map(([x, y, r]) => C(x, y, r + SW / 2, INK, NOSTROKE)).join('') + cs.map(([x, y, r]) => C(x, y, r, fill, NOSTROKE)).join('');

// ---- Суперкар: 840x300, земля y=270 (pivot 0.5, 0.9), едет вправо. Кабина открытая: водитель - отдельный спрайт.
const CAR_W = 840, CAR_H = 300;
const DRV = { x: 340, y: 20, w: 200, h: 170 }; // окно водителя в координатах машины; низ-центр = (440,190)

function carInterior() {
  return R(298, 96, 58, 66, '#3b4558', 14); // спинка сиденья
}
const BODY = 'M20 244 L14 172 Q16 146 46 140 L120 134 Q190 108 262 116 L306 150 L556 150 L600 148 Q660 118 724 140 Q800 168 826 206 Q832 232 812 244 Z';
function carFront() {
  let s = '';
  const defs = `<clipPath id="bodyclip"><path d="${BODY}"/></clipPath>`;
  s += P(BODY, '#C4CCD6');
  s += `<g clip-path="url(#bodyclip)" stroke="none">`;
  s += R(0, 198, 840, 60, '#8D9BAE', 0, NOSTROKE); // нижняя серая полоса
  s += P('M0 90 L840 90 L840 150 L0 146 Z', '#F6F8FA', NOSTROKE); // верхний белый блик (капот/багажник)
  s += P('M376 156 L430 156 L398 236 L344 236 Z', '#F6F8FA', NOSTROKE); // блик на двери
  s += `</g>`;
  s += P(BODY, 'none');
  s += R(468, 168, 42, 12, '#3b4558', 5); // ручка двери
  s += P('M226 150 L290 150 L296 190 L232 190 Z', '#3b4558'); // воздухозаборник
  // спойлер
  s += R(32, 110, 14, 38, '#222') + P('M6 96 L126 90 L128 114 L6 120 Z', '#222');
  // фары
  s += P('M776 164 L824 202 L808 212 L766 182 Z', '#FFE35A') + R(12, 150, 16, 24, '#E0312F', 3);
  // колёса: чёрная шина, серый диск
  for (const x of [190, 650]) {
    s += C(x, 218, 52, '#1d1d1d');
    s += C(x, 218, 30, '#D5DBE2') + C(x, 218, 10, '#6e7a8c', NOSTROKE);
  }
  // лобовое стекло
  s += P('M604 150 L566 94 L586 92 L630 148 Z', '#A9D2F0');
  return { s, defs };
}
function supercar() {
  const f = carFront();
  return wrap(CAR_W, CAR_H, carInterior() + f.s, f.defs);
}
// фигура: голый телесный типчик, голова-кружок (маска пришельца), руки-варежки на руле
function driverFigure() {
  let s = '';
  s += limb('M430 140 L476 146 L504 138', 26, '#E7B58B'); // дальняя рука
  s += R(396, 100, 84, 90, SKIN, 22); // торс-блок
  s += `<ellipse cx="516" cy="140" rx="10" ry="30" transform="rotate(20 516 140)" fill="none" stroke="${INK}" stroke-width="18"/>`;
  s += `<ellipse cx="516" cy="140" rx="10" ry="30" transform="rotate(20 516 140)" fill="none" stroke="#4a5266" stroke-width="9"/>`;
  s += limb('M452 122 L484 138 L506 134', 28, SKIN) + C(508, 134, 17, SKIN);
  // голова-блин, маска: серо-зелёная, огромные чёрные глаза
  s += E(436, 68, 44, 44, '#B7CFC4');
  s += E(418, 66, 15, 22, '#0d1013', NOSTROKE) + E(456, 66, 15, 22, '#0d1013', NOSTROKE);
  s += C(414, 58, 5, '#fff', NOSTROKE) + C(452, 58, 5, '#fff', NOSTROKE);
  s += LINE('M424 96 Q436 102 448 96', INK, 5);
  return s;
}
function alienDriver() {
  const f = carFront();
  return wrap(DRV.w, DRV.h, carInterior() + driverFigure() + f.s, f.defs, `${DRV.x} ${DRV.y} ${DRV.w} ${DRV.h}`);
}

// ---- Oppressor Mk II: 660x380 (pivot центр), летит вправо, байк: два больших колеса, руль, ракеты, огонь
function oppressor() {
  let b = '';
  // дальнее крыло (тёмно-красное)
  b += P('M300 170 L250 60 L200 70 L256 186 Z', '#7D161F');
  // колёса
  for (const [x, y, r] of [[170, 280, 70], [470, 290, 62]]) {
    b += C(x, y, r, '#1d1d1d') + C(x, y, r * 0.5, '#C9D0DA') + C(x, y, r * 0.18, '#4a5266', NOSTROKE);
  }
  // вилка и руль
  b += P('M436 158 L468 152 L490 286 L460 292 Z', '#9AA3B2');
  b += LINE('M440 156 L424 94', INK, 24) + LINE('M440 156 L424 94', '#4a5266', 12);
  b += R(392, 80, 70, 20, '#222', 8);
  b += P('M458 112 L506 82 L532 88 L482 128 Z', '#9ED0F2'); // стекло
  b += P('M470 196 L494 190 L498 216 L474 220 Z', '#FFE35A'); // фара
  // подвес и две толстые ракеты
  b += R(262, 236, 130, 16, '#8a93a4', 5);
  for (const y of [256, 280]) {
    b += P(`M270 ${y} L376 ${y} L376 ${y + 20} L270 ${y + 20} Z`, '#F4F6F8');
    b += P(`M376 ${y} Q414 ${y + 10} 376 ${y + 20} Z`, '#E0312F');
    b += P(`M270 ${y} L250 ${y - 4} L260 ${y + 10} L250 ${y + 24} L270 ${y + 20} Z`, '#E0312F');
  }
  // корпус
  b += P('M110 190 L150 150 L290 138 Q352 138 384 160 L448 172 Q486 180 486 198 L446 216 L300 228 L150 238 L110 226 Z', '#2F3646');
  b += R(112, 202, 370, 14, '#C8232C', 0, NOSTROKE);
  b += P('M196 142 Q236 118 306 128 L310 148 L198 154 Z', '#1b1b1b'); // сиденье
  // огонь из сопел: плоские зубчатые языки, 2 цвета
  b += P('M44 164 L-70 138 L-34 172 L-96 196 L-30 206 L-72 244 L44 226 Z', '#FF8A1F');
  b += P('M44 178 L-20 164 L-2 188 L-40 204 L4 210 L-10 228 L44 220 Z', '#FFD43A', NOSTROKE);
  b += R(40, 158, 84, 36, '#4B5468', 8) + R(40, 202, 84, 36, '#4B5468', 8);
  // ближнее крыло (красное), стреловидное
  b += P('M350 178 L290 164 L150 60 L116 82 L220 196 Z', '#C8232C');
  b += P('M286 160 L152 70 L132 84 L236 176 Z', '#F2878D', NOSTROKE); // плоский блик
  return wrap(660, 380, `<g transform="translate(110 0)">${b}</g>`);
}

function rocket() {
  let s = '';
  s += P('M60 36 L4 20 L24 36 L2 54 L60 46 Z', '#FF9A1F'); // пламя
  s += P('M78 12 L124 34 L78 34 Z', '#8E1E26') + P('M78 60 L124 38 L78 38 Z', '#8E1E26'); // стабилизаторы
  s += P('M56 20 L170 20 Q216 20 238 40 Q216 60 170 60 L56 60 Z', '#F4F6F8');
  s += P('M170 20 Q216 20 238 40 Q216 60 170 60 Z', '#E0312F');
  s += R(104, 20, 18, 40, '#E0312F', 0);
  return wrap(240, 72, s);
}

function billboard(dead) {
  let s = '';
  // опоры, поперечина-раскос и башмаки
  s += R(150, 450, 44, 190, '#4a506a') + R(806, 450, 44, 190, '#4a506a');
  s += P('M172 470 L828 620 M828 470 L172 620', 'none', `stroke="${INK}" stroke-width="22" fill="none"`) + P('M172 470 L828 620 M828 470 L172 620', 'none', 'stroke="#4a506a" stroke-width="10" fill="none"');
  s += R(106, 612, 132, 22, '#2d313f') + R(762, 612, 132, 22, '#2d313f');
  // подсветка-прожекторы сверху (4 штуки) со штангами
  const lens = dead ? '#E0312F' : '#FFE35A';
  for (const x of [200, 400, 600, 800]) {
    s += R(x - 5, 16, 10, 20, '#2d313f', 0) + R(x - 30, 2, 60, 20, '#2d313f', 5) + R(x - 20, 14, 40, 8, lens, 2, 'stroke="none"');
  }
  // мостик под рамой
  s += R(52, 458, 896, 18, '#2d313f', 4);
  s += R(30, 30, 940, 430, '#59607c', 12); // рама
  s += R(52, 52, 896, 386, dead ? '#050505' : '#0b0d14', 4); // экран
  if (dead) s += R(70, 70, 860, 350, 'none', 6, `stroke="#E0312F" stroke-width="8" fill="none"`); // красный контур горит, цифры рисует код
  return wrap(1000, 640, s);
}

function dust() {
  const cs = [[160, 150, 60], [100, 160, 48], [220, 160, 48], [70, 190, 34], [250, 192, 36], [130, 110, 46], [195, 110, 46], [160, 80, 34], [160, 196, 46], [105, 196, 36], [215, 198, 36]];
  return wrap(320, 260, blob(cs, '#E6DCC4') + C(110, 168, 26, '#D2C6A8', NOSTROKE) + C(200, 128, 22, '#D2C6A8', NOSTROKE));
}

// ================= FX: плоские непрозрачные вырезанные формы =================
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
  s += P(star(130, 130, 9, 122, 68, -0.2), '#E8402A');
  s += P(star(130, 130, 8, 92, 52, 0.3), '#FF9D1C');
  s += C(130, 130, 40, '#FFE45C');
  return wrap(260, 260, s);
}
function fxFlash() {
  // грубая белая зубчатая звезда без контура + жёлтая серединка
  return wrap(512, 512, P(star(256, 256, 10, 252, 96, 0.1), '#FFFFFF', NOSTROKE) + P(star(256, 256, 10, 130, 62, 0.4), '#FFF1A8', NOSTROKE));
}
function fxSmoke() {
  const a = [[100, 170, 62], [180, 140, 76], [250, 175, 58], [150, 90, 52], [215, 80, 44]];
  return wrap(340, 260, blob(a, '#5B5B6A') + C(120, 150, 22, '#777788', NOSTROKE) + C(190, 118, 26, '#777788', NOSTROKE));
}
function fxTrashFire() {
  let s = '';
  s += P('M54 150 Q30 110 52 70 Q56 100 74 96 Q70 50 96 14 Q102 56 120 74 Q134 52 130 36 Q166 80 150 150 Z', '#FF8A1F');
  s += P('M76 150 Q64 120 84 96 Q90 118 102 112 Q104 90 114 78 Q138 110 124 150 Z', '#FFD43A');
  s += P('M40 156 L160 156 L148 286 L52 286 Z', '#5E6B66');
  s += R(30, 146, 140, 20, '#7C8A84', 6);
  s += R(52, 200, 96, 18, '#46514d', 0, NOSTROKE);
  return wrap(200, 300, s);
}
function fxDebris() {
  let s = '';
  s += P('M30 120 L90 96 L128 130 L96 176 L40 170 Z', '#9A9AA6');
  s += P('M168 60 L238 48 L252 92 L186 104 Z', '#C0532F');
  s += P('M270 150 L384 118 L392 142 L282 178 Z', '#7A8396');
  s += P('M150 190 L204 176 L218 212 L162 224 Z', '#9A9AA6');
  s += P('M300 40 L344 18 L354 66 Z', '#9DC7EA');
  s += P('M56 34 L84 16 L98 52 L70 64 Z', '#9DC7EA');
  s += P('M226 164 Q250 126 292 142 L278 158 Q258 148 244 174 Z', '#1d1d1d');
  s += P('M340 190 L374 172 L386 206 L352 218 Z', '#C0532F');
  return wrap(420, 240, s);
}
function fxTrail() {
  const cs = [[500, 65, 12], [455, 66, 18], [405, 62, 26], [345, 68, 34], [275, 60, 42], [200, 70, 50], [120, 62, 56], [60, 68, 48]];
  return wrap(540, 130, blob(cs, '#E6E6EE'));
}
function fxTooth() {
  // крупный белый зуб с корнями, во весь холст
  let s = '';
  s += P('M16 40 Q10 10 40 12 Q60 20 80 12 Q110 10 104 40 Q104 72 96 100 Q92 142 80 142 Q70 142 66 112 Q60 100 54 112 Q50 142 40 142 Q28 142 24 100 Q16 72 16 40 Z', '#FFFFFF');
  s += P('M34 36 Q34 26 46 26', 'none', 'stroke="#D9DEE6" stroke-width="8" fill="none"');
  return wrap(120, 150, s);
}

// ================= ФОН: грубые плоские блоки =================
const W_SKY = 2000, W_FAR = 2100, W_MID = 2300, W_FORE = 2500, H = 1080;

function sky() {
  let s = R(0, 0, W_SKY, H, '#1D2566', 0, NOSTROKE);
  // луна: плоский диск + 3 кратера
  s += C(1380, 170, 80, '#F4E8A0', NOSTROKE) + C(1355, 150, 16, '#E0D388', NOSTROKE) + C(1408, 196, 12, '#E0D388', NOSTROKE) + C(1396, 140, 9, '#E0D388', NOSTROKE);
  // крупные плоские звёзды-кружки
  for (const [x, y, r] of [[120, 90, 11], [300, 220, 8], [520, 70, 12], [720, 180, 8], [880, 60, 11], [1060, 200, 8], [1180, 90, 12], [1620, 80, 9], [1740, 230, 12], [1880, 130, 9], [1920, 330, 8], [200, 430, 9], [980, 400, 8], [1280, 340, 9], [420, 330, 8], [1560, 400, 8]])
    s += C(x, y, r, '#FFF0A0', NOSTROKE);
  return wrap(W_SKY, H, s);
}

function far() {
  let s = '';
  const base = 790;
  let x = -20;
  const cols = ['#2C3680', '#343F90', '#27306F'];
  while (x < W_FAR) {
    const w = ri(130, 210), h = ri(260, 520), top = base - h;
    s += R(x, top, w, base - top + 300, pick(cols));
    if (rnd() < 0.6) s += R(x + ri(24, w - 70), top + ri(30, h - 100), 40, 54, '#4A5CAA', 0, NOSTROKE);
    x += w - 2;
  }
  s += P('M1500 790 L1500 250 L1548 250 L1560 110 L1572 250 L1620 250 L1620 790 Z', '#3B46A0');
  s += R(1528, 320, 40, 54, '#4A5CAA', 0, NOSTROKE);
  return wrap(W_FAR, H, s);
}

function palm(x, base, h, lean) {
  let s = '';
  const tx = x + lean, ty = base - h;
  s += P(`M${x - 16} ${base} L${tx - 9} ${ty} L${tx + 9} ${ty} L${x + 16} ${base} Z`, '#8A5A2E');
  const L = h * 0.36;
  // листья-треугольники + круг в центре
  for (const [deg, col] of [[-170, '#2F9A45'], [-130, '#237A37'], [-90, '#2F9A45'], [-50, '#237A37'], [-10, '#2F9A45']]) {
    const a = (deg * Math.PI) / 180;
    const ex = tx + Math.cos(a) * L, ey = ty + Math.sin(a) * L + 50;
    const nx = Math.cos(a + Math.PI / 2) * L * 0.34, ny = Math.sin(a + Math.PI / 2) * L * 0.34;
    s += P(`M${tx + nx} ${ty + ny} L${ex} ${ey} L${tx - nx} ${ty - ny} Z`, col);
  }
  s += C(tx, ty, h * 0.06, '#2F9A45');
  return s;
}

// большая вывеска: цветная плашка с жирным контуром и крупным текстом
function signPlate(cx, cy, text, plate, ink, size, maxW) {
  const w = Math.min(maxW, text.length * size * 0.76 + 56);
  const h = size * 1.45;
  return R(cx - w / 2, cy - h / 2, w, h, plate, 10) + T(cx, cy + size * 0.35, text, ink, size);
}

function building(x, top, w, color, o = {}) {
  const base = 770;
  let s = R(x, top, w, base - top, color);
  s += R(x - 8, top - 16, w + 16, 26, o.trim || '#14142a'); // карниз
  // витрина: тёмно-синее стекло с плоскими светлыми бликами
  const gx = x + 20, gw = w - 40;
  s += R(gx, 585, gw, 165, o.glass || '#1F3470');
  s += P(`M${gx + 30} 585 L${gx + 90} 585 L${gx + 40} 750 L${gx + 10} 750 Z`, '#34569E', NOSTROKE);
  s += R(x + w - 92, 605, 58, 145, '#14142a'); // дверь
  // тент: 4 крупные полосы
  const aw = o.awning || ['#D3302B', '#F4EEE0'];
  const n = 4, sw = (w - 16) / n;
  for (let i = 0; i < n; i++) s += P(`M${x + 8 + i * sw} 538 L${x + 8 + (i + 1) * sw} 538 L${x + 12 + (i + 1) * sw} 585 L${x + 4 + i * sw} 585 Z`, aw[i % 2]);
  if (o.sign) s += signPlate(x + w / 2, 458, o.sign.t, o.sign.p, o.sign.c, o.sign.s || 60, w - 24);
  return s;
}

function mid() {
  let s = '';
  s += building(40, 380, 340, '#5A3E7A', { sign: { t: 'LIQUOR', p: '#B03A8A', c: '#fff', s: 58 }, awning: ['#B03A8A', '#F4EEE0'] });
  s += building(420, 330, 340, '#2F5D6B', { sign: { t: 'PIZZA', p: '#D3302B', c: '#fff', s: 66 }, awning: ['#D3302B', '#F4EEE0'] });
  s += building(800, 300, 340, '#3E4B7A', { sign: { t: 'MOTEL', p: '#E8B923', c: '#1b1b1b', s: 62 }, awning: ['#3FA9C8', '#F4EEE0'] });
  // кофейня
  s += building(1180, 360, 420, '#7FB08E', { trim: '#1d3a2a', awning: ['#2E8A4A', '#F4FFF4'], sign: { t: 'COFFEE', p: '#2E8A4A', c: '#fff', s: 72 } });
  s += building(1640, 370, 320, '#7A3B4B', { sign: { t: 'TATTOO', p: '#E07B1F', c: '#1b1b1b', s: 58 }, awning: ['#E8B923', '#222'] });
  s += building(1990, 410, 310, '#4B3E7A', { sign: { t: 'BAR', p: '#6A4FB5', c: '#fff', s: 70 }, awning: ['#6A4FB5', '#F4EEE0'] });
  for (const [x, h, l] of [[400, 530, 24], [780, 500, -22], [1160, 520, 20], [1620, 510, -24], [1975, 500, 22]]) s += palm(x, 770, h, l);
  return wrap(W_MID, H, s);
}

function fore() {
  let s = '';
  const sw0 = 770, sw1 = 930, rd0 = 965;
  s += R(-10, sw0, W_FORE + 20, sw1 - sw0, '#8A8FA8'); // тротуар
  for (let x = 100; x < W_FORE; x += 260) s += R(x, sw0 + 6, 8, sw1 - sw0 - 12, '#6E7390', 0, NOSTROKE); // крупные швы плит
  s += R(-10, sw1, W_FORE + 20, rd0 - sw1, '#C8C4B8'); // бордюр
  s += R(-10, rd0, W_FORE + 20, H - rd0 + 10, '#2A2A36'); // асфальт
  for (let x = 40; x < W_FORE; x += 300) s += R(x, 1026, 160, 20, '#E8C230', 3, NOSTROKE); // разметка
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
  prop_supercar: supercar, prop_alien_driver: alienDriver, prop_oppressor: oppressor, prop_rocket: rocket,
  prop_billboard: () => billboard(false), prop_billboard_0000: () => billboard(true), prop_dust: dust,
  fx_boom: fxBoom, fx_flash: fxFlash, fx_smoke: fxSmoke, fx_trashfire: fxTrashFire, fx_debris: fxDebris, fx_trail: fxTrail, fx_tooth: fxTooth,
};

const only = process.argv.slice(2);
const names = Object.keys(ALL).filter((n) => !only.length || only.includes(n));

async function render(name) {
  SW = STROKES[name] ?? 6;
  const svg = ALL[name]();
  const file = path.join(IMG, name + '.png');
  await sharp(Buffer.from(svg), { density: 72 }).png().toFile(file);
  const m = await sharp(file).metadata();
  const meta = META[name];
  const entry = { file: name + '.png', width: m.width, height: m.height, pivot: meta.pivot, group: meta.group, note: meta.note, source: 'svg-fallback' };
  if (meta.z !== undefined) { entry.z = meta.z; entry.parallax = meta.parallax; }
  if (meta.facing) entry.facing = meta.facing;
  if (name === 'greg_torso') entry.joints = { neck: [120, 28], shoulder_left: [30, 62], shoulder_right: [210, 62], hip_left: [80, 296], hip_right: [160, 296] };
  if (name.startsWith('prop_billboard')) { entry.screen = { x: 52, y: 52, w: 896, h: 386, fx: 0.052, fy: 0.081, fw: 0.896, fh: 0.603 }; }
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
  const out = f('greg_ref');
  await sharp({ create: { width: 400, height: 920, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } }).composite(comp).png().toFile(out);
  const m = await sharp(out).metadata();
  upsertManifest('greg_ref', { file: 'greg_ref.png', width: m.width, height: m.height, pivot: META.greg_ref.pivot, group: 'ref', note: META.greg_ref.note, source: 'svg-fallback' });
}
