# sudny-den — Контекст проекта для агентов

Мультфильм **«Судный день, версия 1.0»** (к релизу GTA 6 — 19 ноября): 4-сценный вертикальный 3D-ролик (`1080×1920`, `24 FPS`, `4002` кадра, `02:46.72`) на Remotion + Three.js (`@remotion/three`).

## Ключевые правила и конвейер сборки
- **Аудио и субтитры (`mix.mjs` + `sync_audio.mjs`):**
  - `node mix.mjs` — собирает версию **с цензурой** (1000 Гц запикивания `BLEEPS` + маскировка мата `***` через `censorSubtitle`).
  - `node mix.mjs --uncensored` — собирает оригинальную версию **без цензуры** (без запикиваний и маскировки).
  - `node sync_audio.mjs` — переносит `audio/master.wav`, нарезает `s1..s4_master.wav` в `video/public/audio/` и обновляет таймлайн/субтитры в `video/src/data/scene1Timeline.ts`.
- **Рендер 3D Remotion (внутри `sudny-den/video/`):**
  - Бандл: `node node_modules/@remotion/cli/remotion-cli.js bundle src/index.ts build`
  - Сцены (`Scene1Shorts`, `Scene2Shorts`, `Scene3Shorts`, `Scene4Shorts`): рендерятся с флагами `--gl=angle --overwrite`, затем склеиваются через `ffmpeg` (`-c:v copy -c:a aac -b:a 192k -movflags +faststart -shortest`) со звуком из `video/public/audio/master.wav`.
- **Локальные скиллы:** в корне репозитория (`../.agents/skills/`) подключены Remotion-скиллы (`remotion-best-practices` и др.).

## Опубликованные версии и файлы
- **YouTube Shorts (с цензурой, без 18+):** https://youtube.com/shorts/n0ivTjW2BOo (канал `@PushckinAi`) → локальный файл `sudny_den_3d_shorts.mp4`.
- **TikTok (без цензуры):** https://www.tiktok.com/@pushckin3/video/7708099741892087092 (аккаунт `@pushckin3`) → локальный файл `sudny_den_3d_uncensored.mp4`.
- Исходная история создания (для ссылки через `@` в Antigravity): сессия `dd85afaf-a39a-4a8f-83a3-1c1a0d4c748a`.
