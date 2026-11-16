# Ломка Клод мульт

Вертикальный (1080×1920, 24 FPS) 3D-мультфильм на Remotion + Three.js (`@remotion/three`).

Сейчас в проекте только заготовка: композиция `LomkaClaudeMult` с тестовым 3D-кубом и заголовком. Сценария пока нет.

## Запуск
```bash
cd ломка_клод_мульт/video
npm install
npm run dev          # Remotion Studio
npm run render       # рендер в ../ломка_клод_мульт.mp4 (GPU, --gl=angle)
npm run render:cpu   # рендер без GPU (--gl=swangle)
```
