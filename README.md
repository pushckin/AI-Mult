# AI-Mult

Мультфильмы, собранные кодом (HTML + GSAP + WebAudio → MP4).

## mega/ — «Отряд Мега: потери в пределах нормы»
Вертикальный (1080×1920) юмористический короткометражный мультфильм, ~2 мин, 5 сцен.
Неофициальная фан-пародия по мотивам тактических шутеров; собственные персонажи.

- `mega/SCRIPT.md` — сценарий с таймингами
- `mega/design/DESIGN.md` — стиль картинки и звука
- `mega/voice/` — озвучка реплик (piper, русские голоса), `mega/tools/build_voice.py` — её генератор
- `mega/kit/` — общий набор: персонажи (`rig.js`), сцена и реквизит (`stage.js`), звук (`sfx.js`)
- `mega/scenes/` — страницы сцен
- `mega/tools/` — рендер и сборка

## sudny-den/ — «Судный день, версия 1.0» (релиз GTA 6, 19 ноября)
Вертикальный (1080×1920, 24 FPS, 02:46.72) 3D-мультфильм на Remotion + Three.js (`@remotion/three`), 4 сцены.

- `sudny-den/script/sudny_den_v1_script.txt` — сценарий
- `sudny-den/lines.mjs`, `sudny-den/tts_elevenlabs.mjs` — реплики и озвучка (ElevenLabs)
- `sudny-den/sfx.mjs`, `sudny-den/audio/voice/`, `sudny-den/audio/sfx/` — звуковые эффекты и дорожки голосов
- `sudny-den/mix.mjs`, `sudny-den/sync_audio.mjs` — сведение мастера (с цензурой по умолчанию и флагом `--uncensored` без цензуры) + синхронизация с Remotion
- `sudny-den/video/src/` — 3D-персонажи (`components3d/`), сцены (`scenes3d/`) и оверлеи (`components2d/`)

Быстрый старт сборки звука для Remotion:
```bash
cd sudny-den
npm install
node mix.mjs            # версия с запикиванием (или --uncensored без цензуры)
node sync_audio.mjs
cd video
npm install
npx remotion studio
```

## video/ — «Почему мы пьём чужое молоко?» (whiteboard, 1920×1080, 30 fps, 3:49)
Whiteboard-анимация в стиле «Научпок»: SVG + Rough.js, покадровый рендер Playwright → FFmpeg, озвучка Gemini TTS.

- `Claude_Moloko_Whiteboard_Prompt.txt` — сценарий и ТЗ; `voiceover.mp3`, `voiceover_timings.json` — озвучка и тайминги сцен
- `video/engine.js` (рисование маркером, облачка, губка-переход), `video/kit.js` (персонажи и реквизит), `video/scenes.js` (8 сцен)
- `video/render.mjs` (рендер кадров), `video/build.sh` (сборка `final_moloko.mp4`: `cd video && npm i && ./build.sh`)
- `final_moloko.mp4` — готовый ролик; `video/checks/` — контрольные кадры
