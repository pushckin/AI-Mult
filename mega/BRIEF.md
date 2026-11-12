# Общий бриф для всех исполнителей

Проект: `/home/user/AI-Mult/mega` — вертикальный (1080×1920, 30 к/с) юмористический мультфильм «Отряд Мега», ~123 с, 5 сцен.
Обязательно прочитать: `design/DESIGN.md`, `SCRIPT.md`, `script-timing.json`, кадры `design/ref/*.jpg` (стиль прошлого ролика пользователя).
Скилл монтажа: `/root/.claude/skills/synced/e1946234-1795-444f-8c42-a9848a296060_44bf262e-db10-43f8-83b5-2b872f493e9a/obsion-montazh`
(прочитать `core/02-zakony.md`, `motion/moushn-skill-polnyy.md` §1 и §3а, `core/13-shortsy-vertikal.md`, `core/15-personazh-yumor-memy-vstavki.md`; по звуку `core/05-zvuk-muzyka.md`).

Технический контракт страницы:
- `<div id="root" data-duration="СЕК">` ровно 1080×1920, внутри `#camera > #float > #shake > сцена`.
- GSAP 3.12.5 лежит ЛОКАЛЬНО: `kit/vendor/gsap.min.js` (не CDN). Шрифты локально в `kit/vendor/fonts/` (woff2, @font-face).
- Вся анимация в одном `gsap.timeline({paused:true})`, `window.__timelines = { main: tl }`. `tl.seek(t)` на любую секунду даёт верный кадр. Никаких setTimeout/rAF/CSS-анимаций/Math.random без зерна.
- Только `gsap.set` до таймлайна и `tl.to` внутри. Никаких линейных изингов для движения, никаких телепортов.
- Звук эффектов: `window.__sound = (ctx, t0) => {...}`, все узлы из переданного ctx. Голоса НЕ в странице — их накладывает сборщик.
- Рендер: `node tools/render-v.cjs out.mp4 scenes/sN.html` (вертикальный вариант step-render).
- Проверка глазами обязательна: отрендерить, собрать лист кадров, посмотреть его (Read картинки) и исправить то, что видно.
- Playwright и Chromium уже установлены глобально (`require('playwright')` работает из любой папки; НЕ запускать playwright install). ffmpeg есть.
- Не трогать чужие файлы: у каждого исполнителя свои (указаны в задании). Не делать git commit/push.
- Язык текста на экране и в комментариях — русский.
