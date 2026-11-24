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

## gta6-pc/ — «Почему GTA 6 не вышла на ПК одновременно с консолями?» (whiteboard, 1920×1080, 30 fps, 3:53)
Whiteboard-анимация в стиле «Научпок» с чёрным юмором, на движке ролика про АЭС (SVG + Rough.js, Playwright → FFmpeg). 7 сцен рисовали субагенты по сценарию `gta6-pc/script/Claude_Gta6_Pc_Whiteboard_Prompt.txt`.

- Озвучка: один диктор, Gemini TTS (`gemini-3.8-flash-tts`, голос Algenib): `gta6-pc/tts_gemini.mjs` → `audio/voice/s1..s7.wav`, `voiceover.mp3`, тайминги `voiceover_timings.json` и `video/voice_timings.js`
- Музыка: Gemini Lyria RealTime (`gta6-pc/music_lyria_rt.mjs`) → `audio/music/bg.mp3`, приглушается под голос
- Звуковые эффекты: ElevenLabs (`gta6-pc/video/gen_sfx.py` → `video/sfx/`)
- Сцены: `gta6-pc/video/scenes/s1..s7.js`, общие персонажи `scenes/common.js`, тайминги слов диктора для синхронизации `scenes/cues_sN.txt`, правила для авторов сцен `video/SCENE_RULES.md`
- Сборка: `cd gta6-pc/video && npm i && ./build.sh && python3 mix.py` → `gta6-pc/final_gta6_pc_dark.mp4`
- Контрольные кадры: `gta6-pc/video/checks_final/`
