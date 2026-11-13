# STAGE — каркас сцены (`window.Stage`)

Кадр 1080×1920, 30 к/с. Мир в пикселях. **Земля (ноги персонажей): `Stage.GROUND = 1200`.** Дефолтная камера смотрит в точку (540, 960).
Безопасные зоны: y<230 и y>1560 — только фон; лица и действие y 300…1250; правые 150 px ниже y=1000 без важного. Субтитры — y 1330…1520, плашка — y≈260.

## Страница (см. `kit/template.html`, копируй в `scenes/sN.html`)
Скрипты по порядку: `vendor/gsap.min.js, lines.js, rig.js, sfx.js, stage.js`; css `vendor/fonts.css, stage.css`. Разметка: `#root[data-duration] > #camera > #float > #shake > #world`, рядом `#overlay`.
Запрещено: setTimeout, requestAnimationFrame, CSS-анимации, Math.random (есть `Stage.rng(seed)`), линейные изинги для движения. Старт — `gsap.set`, в таймлайне только `tl.to/tl.set`. Своё покадровое: `Stage.onUpdate((t,g)=>…)` (t — время сцены, g — общее).
Звук: `window.__sound=(ctx,t0)=>{…}` (через SFX). Кнопка «▶ Старт» скрыта при webdriver.

## Слои мира (`Stage.layers.*`, в координатах мира)
`sky` (глубина 0, прибит к экрану) · `far` (.2) · `far2` (.5, у поля/зоны) · `mid` (1, реквизит и декор) · `actors` (1, персонажи) · `fx` (1, эффекты) · `fg` (1.3, размытый передний план).
`Stage.addLayer(имя, глубина, 'мид'|перед_каким)`. Персонажа: `Stage.layers.actors.appendChild(rig.el)`.

## Ядро
- `Stage.init({scene:N, duration?, partStart?})` → `{tl, T, dur}`. `T=TIMING[N]`. Парение `#float`, виньетка, зерно, пыль — автоматом.
- `Stage.camSet({x,y,scale,rot})` — мгновенно. `Stage.cam(tl,t,{x,y,scale,rot},dur=1.2,ease='power2.inOut')` — (x,y) точка мира в центре кадра, scale>1 крупнее. Возвращает конец. `Stage.fitRect(l,t,w,h,pad)` → объект камеры, вписывающий прямоугольник.
- `Stage.shake(tl,t,amp=10,dur=.35)`, `Stage.punch(tl,t,amt=.035)`, `Stage.flash(tl,t,{peak,dur})`.
- `Stage.blackout(tl,t,dur=.06)` / `Stage.blackoutOff(tl,t,dur=.5)`.
- `Stage.captions(tl, T.lines, {maxLine:21})` — субтитры с меткой-именем (ustav, chaika, ladoshka, hohotun, gvozd), длинные реплики делятся по времени.
- `Stage.tag(tl,t,'БАЗА',dur=2.5,{y,color})` — жёлтая плашка. `Stage.title(tl,t,'ТЕКСТ',{sub,dur,y=560,color,size})`.
- `c=Stage.counter(tl,t,{label,value,x,y,digits,max,color}); c.set(tl,t2,n); c.hide(tl,t3)`.
- `Stage.addFx(t0,t1,draw(tt,T),hide)` — свой процедурный эффект.

## Эффекты (детерминированные; слой по умолчанию `fx`, o.layer — имя или узел)
`Stage.dust(tl,t,x,y,{n,size,spread})` · `Stage.debris(tl,t,x,y,{n,power,floor})` · `Stage.dirtHit(tl,t,x,y)` · `Stage.sparks(tl,t,x,y,{n,ang:[a0,a1]})` · `Stage.tracer(tl,t,x1,y1,x2,y2,{dur=.14,len,hit})` · `Stage.confetti(tl,t,x,y,{n,w})` · `Stage.paperFly(tl,t,{x,y},{x,y},{dur,arc,keep})` · `Stage.stampMark(tl,t,x,y,{text,color,size,rot})` · `Stage.smoke(tl,t0,t1,x,y,{n,size,rise,life,color,alpha,drift})` · `Stage.explosion(tl,t,x,y,{size=1,shake:0})` (сам трясёт камеру, вспышка ≤22 %) · `Stage.burst(tl,t,x,y,{n,colors,size:[a,b],speed:[a,b],ang:[a0,a1],g,drag,life:[a,b],shape:'c',sc0,sc1,border,floor})`.

## Фоны (все возвращают объект с координатами; вызывать один раз после init)
- `Stage.bg.bunker()` → `{door, seats:[260,430,600,770], floor:1200, mapX, mapY, lampX}`. Мир ≈ один экран (карта x100…620 y360…830, лампа x540, дверь справа x900…1050 y640…1200). Ящики-сиденья: верх y=1088.
- `Stage.bg.heliCabin()` → `{scroll(tl,t0,t1,speed=600), altitude(tl,t,h0..1,dur=2), vibe(tl,t,v,dur), floor:1200, benchX:[700,1020], benchY:1085, seatX:165}`. Кресло пилота x80…260, пульт с табличкой x300…560, окна x110…450 и x610…950 (y440…690). Винт сверху сам.
- `Stage.bg.field({width:3400})` → `{width, floor, zoneSmokeX:880}`. Камера ходи x 540…2800.
- `Stage.bg.zone({width:2600})` → `{width, floor, door, shedX, hillX:420, craters:[1130,1700,2150]}`. Мешки x540…900 и x1250…1700, руины x880…1070, сарай x≈1900…2500, дверь сарая x≈2210 (w190,h400).
- Двери: `door.open(tl,t,{dur=.9})`, `door.slam(tl,t,{shake})`; свойства `x,y,w,h,cx`. Своя: `Stage.door({x,y,w,h,kind:'steel'|'wood',layer})`.

## Реквизит `Stage.prop.NAME({x,y,s,rot,flip,layer})` → SVG-узел (точка (0,0) = x,y)
Двигать: `tl.to(el,{x,y,rotation})`. `crate{w,h}` · `daisy{big}` · `butterfly` (машет сама) · `bowl` (миска с ложкой, низ по центру) · `form{signed}` (бланк «ПОГИБ ГЕРОЙСКИ. Причина: ____», центр) · `card` (+`el.stamp(tl,t,0|1|2)`) · `notebook` · `pointer` (от руки вправо, 520 px) · `banknote` · `terminal` (зелёный экран) · `hammer` · `shell` (носом вверх) · `wire{d:700}` → `{back,front,set(v),to(tl,v,t)}`: задняя дуга в `mid`, передняя в `fx`; · `mortar` (+`el.fire(tl,t)`) · `heli` (снаружи, низ=земля; `el.rotor(tl,t0,t1)`).

## Пример сцены (~40 строк)
```html
<script>
const { tl, T } = Stage.init({ scene: 1 });
const bg = Stage.bg.bunker();
Stage.camSet({ x: 540, y: 960, scale: 1 });
const ustav = Rig.create('ustav', { x: 330, y: Stage.GROUND, scale: 1, facing: 1 });
Stage.layers.actors.appendChild(ustav.el);
const bowl = Stage.prop.bowl({ x: 600, y: 1090, s: 1, layer: 'actors' });
Stage.tag(tl, .3, 'БАЗА', 2);
Stage.cam(tl, 0.3, { x: 420, y: 900, scale: 1.25 }, 2.5, 'sine.inOut');
Stage.paperFly(tl, T.beats.forms.t, { x: 330, y: 800 }, { x: 600, y: 900 });
Stage.captions(tl, T.lines);
bg.door.open(tl, T.beats.door.t); Stage.explosion(tl, 31, 1500, 1200, { size: .8 });
Stage.blackout(tl, T.beats.out.t, .8);
window.__sound = (ctx, t0) => { /* SFX.… */ };
</script>
```
## Инструменты
`node tools/render-v.cjs out/sN.mp4 scenes/sN.html` (env FPS, FROM/TO, SCALE=.5, JOBS, T=2.5,7 — стоп-кадры) · `python3 tools/sheet-v.py v.mp4 лист.jpg --step 0.5 --from 0 --to 10 --cols 8 --height 480` · `bash tools/assemble.sh out/s1.mp4 … s5.mp4` → `out/mega-full.mp4`.
