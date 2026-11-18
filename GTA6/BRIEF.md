# GTA6 — «Вторжение в Новую Зеландию»: ТЗ для авторов сцен

Две части по ~1.5–2 мин, вертикаль 1080×1920, 30 fps, Remotion + Three.js (`@remotion/three`).
Сценарий: `GTA6/сценарий.txt`. Реплики, биты и их порядок: `GTA6/lines.mjs`. Референс стиля: `GTA6/img/style_reference.jpg`.

## Стиль
- Мультфильм в стилистике вырезанной цветной бумаги (cutout-анимация «как у взрослых сатирических мультсериалов»):
  плоские фигуры из картона с тонкой толщиной, стоящие в 3D-пространстве как диорама; камера ездит в 3D — параллакс.
- **Персонажи — только свои, оригинальные.** Никаких узнаваемых персонажей чужих мультсериалов, их одежды-«визиток»,
  логотипов, реальных политиков. Логотипы Rockstar/GTA не рисовать — допустим текст «GTA VI» обычным шрифтом.
- Палитра: насыщенные плоские цвета, без градиентов на персонажах. Небо/фоны — тоже бумага.
- Движение «дёрганое», как у cutout: позы персонажей меняются «на двойках» (`twos(t)` из `kit/anim.ts`), рты — по огибающей голоса.
  Камера при этом может двигаться плавно. Кинетика: резкие зумы, тряска камеры на ударах (`shake`).
- Юмор жёсткий, сатира. Насилие — мультяшное (крестики вместо глаз, разлетающиеся человечки, «кровь» — плоские красные кляксы), без натурализма.

## Обязательные правила Remotion
- Вся анимация только от времени `t` (секунды от начала ЧАСТИ), которое приходит в `render3d(t)`. `useFrame` запрещён, никаких `Math.random()` без сида
  (используйте `rng(seed)` / `hash(n)` / `noise1(x)` из кита), никаких таймеров.
- Тайминги — **только через cue**: `cue("p1", "p1_pm1").start / .end`. Реплики ещё будут переозвучены, длительности поменяются —
  абсолютные секунды в коде запрещены (кроме длительностей внутри бита, например «через 0.4 с после начала cue»).
- Рты: `mouthFor("p1", ["p1_pm1","p1_pm2"], t)` → 0..1 → проп `mouthOpen` у `Character` (`mouth="talk"` или `"scream"`).
- Внутри `<ThreeCanvas>` у `<Sequence>` должен быть `layout="none"` (лучше вообще обойтись без Sequence — сцены переключаются по t).
- Субтитры рисуются автоматически (низ кадра, ~y 1235–1450 px) — не ставьте важное действие в эту зону во время реплик.
  Верхние ~150 px и нижние ~350 px кадра перекрывает интерфейс TikTok/Shorts, справа ~120 px — кнопки.

## Кит (`video/src/kit/`) — НЕ редактировать (общий для всех); нужны доработки — пишите свой хелпер в своём файле и упомяните в отчёте
- `Character.tsx` — `<Character …/>`: outfit (suit/uniform/camo/hoodie/tshirt/dress/flannel/tactical/cardigan/overalls), color/color2, hat
  (combover, militaryCap, helmet, balaclava, messyHair, beanie, strawHat, hardHat, slickHair, baldGray, headset, cap, bun, curly, ponytail),
  eyes (normal/angry/sad/wide/crazy/closed/dead/squint/tiny), mouth (talk/closed/smile/frown/grin/scream/o/wavy/teethGrit), mouthOpen,
  lookX/lookY, brow, tears, sweat, blood, missingEar, ears, mustache, beard, stubble, glasses (round/shades/goggles), medals, tie,
  armL/armR (угол руки, 0 — вниз, ~1.6 — горизонтально в сторону, ~2.8 — вверх), handL/handR (ReactNode в кисти), bodyTilt, headTilt,
  squash, legs (stand/run/sit/none) + legPhase, back (что примотано к спине), front, scale, rotationY, position. Начало — между ступнями, рост ≈1.55, смотрит на +Z.
- `Stage.tsx` — `Cam` (камера: pos, look, fov, roll), `PaperLights`, `Sheet` (бумажный лист), `CanvasPlane` (плоскость с канвас-рисунком/текстом,
  кэш по texKey — **texKey должен меняться, если меняется рисунок**, например `"timer_"+секунда`), `drawText`, `Crowd` + `crowdGrid` (толпа инстансами,
  у всех примотаны консоли/телевизоры), `Puff` (дым/облачко).
- `paper.ts` — `paper(color)` матовый бумажный материал, `glow(color, opacity)` светящийся/непрозрачный по свету, `geo.rrect/ellipse/arc/poly`
  (экструдированные бумажные формы), `canvasTex`, `rng`, `FONT`.
- `anim.ts` — `cue`, `part`, `prog`, `easeInOut/easeOut/easeIn/easeOutBack`, `twos`, `shake`, `noise1`, `hash`, `mouthFor`, `speaking`, `lerp`, `clamp01`.
- `cast.ts` — `CAST`: единая внешность постоянных персонажей (pm, defense, agri, engineer, commander, swat, soldier, gamer, anchor, dad, mom, kid, grandpa, gamer2). **Обязательно** использовать для этих персонажей: `<Character {...CAST.pm} …/>`.
- `Overlays.tsx` — `Fade` (затемнение), `PartBadge` (плашка «ЧАСТЬ N» в начале части), `censorText`.
- Сцена — массив `SceneDef` (`video/src/scenes/types.ts`): `{ id, from, to, render3d(t), overlay?(t, censored), hideSubs?(t), bg? }`.
  Можно разбить свою сцену на несколько SceneDef (разные планы/локации) — каждый со своими from/to. В `overlay` можно рисовать 2D (HTML/CSS) поверх 3D:
  титры, вспышки, экраны телефона и т.п. Если на экране мат текстом — используйте `censorText(text, censored)`.

## Звук
- Готовые процедурные эффекты: `GTA6/audio/sfx/*.wav`, список с описаниями — `GTA6/audio/sfx/README.md` (может ещё дописываться).
- Расстановка: только в СВОЁМ файле `GTA6/sfx_cues/<сцена>.mjs` (`{ cue, at, sfx, gain, from?, len? }`). Пересобрать звук и таймлайн: `cd GTA6 && node mix.mjs`.
  Музыка и голоса подключаются автоматически.

## Проверка
- Кадры: `cd GTA6 && node tools/stills.mjs Part1 cue:p1_pm1+0.5,cue:p1_def1+2,5.0 out.png --cols=3 --scale=0.4`
  (время — секунды от начала части или `cue:ID±сдвиг` / `cueend:ID±сдвиг`). Смотрите результат через чтение PNG.
- Типы: `cd GTA6/video && npx tsc --noEmit -p .`
- Перед сдачей: проверьте каждые ~1–1.5 с своей сцены контактными листами, плюс все ключевые моменты (удары, переходы).
  Не держите один статичный план дольше ~4 с — для Shorts нужна динамика: смена планов, наезды, реакции.
- Полный рендер видео не запускайте (это сделает координатор). Git не трогать.
