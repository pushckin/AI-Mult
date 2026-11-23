# «Как работает ИИ?» — whiteboard-анимация (стиль «Научпок»)

1920×1080, 30 fps, H.264, 200 секунд, 7 сцен. HTML/SVG + Rough.js → Puppeteer → FFmpeg.

- `public/engine.js` — движок: рисование маркером (dash-анимация + кончик маркера), рукописный текст, облачка pop-in, красная губка-переход.
- `public/scenes.js` — 7 сцен по сценарию (`script/prompt_scenario.txt`), тайминги в секундах заданы прямо в сценах.
- `render.mjs` — рендер кадров в 4 потока, пишет `timeline.json` (тайминги звуковых событий).
- `sfx_elevenlabs.mjs` — звуковые эффекты (ElevenLabs Sound Generation) → `audio/sfx/`.
- `tts_gemini.mjs` — озвучка диктора (Gemini TTS, голос Algenib) → `audio/voice/s1..s7.wav`. Текст: `script/voice_text.json`.
- `mix_audio.mjs` — сведение: голос + эффекты → `final_ai_chatgpt.mp4`. Если в корне проекта лежит `voiceover.mp3`, он накладывается целиком вместо покадровых файлов.

```bash
npm install
node sfx_elevenlabs.mjs                 # эффекты (один раз)
GEMINI_API_KEY=... node tts_gemini.mjs  # озвучка (по желанию)
node render.mjs                         # видео без звука → build/video_silent.mp4
node mix_audio.mjs                      # итог: final_ai_chatgpt.mp4
node render.mjs --still 12 --out a.png  # один кадр на секунде 12 (для проверки вёрстки)
```
