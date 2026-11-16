# Персонажи сцены 1 (Артём, Катя)

```tsx
import { Artyom, Katya } from "./characters";
<Artyom frame={f} view="side" facing="right" mouth={env} emotion="smile"
        armL="underTable" armR="holdHand" upperBodyOnly x={200} y={300} scale={0.6} />
```
Все пропсы — `CharacterProps` из SPEC_SCENE1 (см. `shared.tsx`). SVG 1000×1400 (viewBox), `overflow: visible`.
`x,y,scale,rotate` применяются внутри (scale/rotate вокруг точки 500,700 — плечи).

Дополнительные (необязательные) пропсы для мягкого overshoot при смене:
`prevEmotion` + `emotionSince` (кадр смены); `prevArmL/prevArmR` + `poseSince`. Без них смена мгновенная.

Заметки
- `side`: рисуется лицом вправо, `facing="left"` зеркалит. В профиле `armR` — ближняя рука, `armL` — дальняя (за корпусом).
- `front`: `armL` — рука слева на экране.
- `upperBodyOnly` обрезает корпус/руки по y=1170 (линия стола в локальных координатах).
- Контур «кипит» (смена seed каждые 3 кадра), моргание/дыхание/микродвижения — от `frame`.
- `twitch` дёргает левый (на экране) глаз и щёку, `sweat` — капли, `tear` — слёзы (по обоим глазам).
- `slap` — периодические удары рукой (период 14 кадров), `typing` — дрожь пальцев.
- Предпросмотр: `src/scene1/_preview/characters.entry.ts` (Still: artyom-front, katya-side, *-pose, *-mouth, big).
