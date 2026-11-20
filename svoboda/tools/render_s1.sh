#!/usr/bin/env bash
# Рендер сцены 1.
#   tools/render_s1.sh                 -> out/scene1_final.mp4 (полный рендер, 720 кадров)
#   tools/render_s1.sh checks [frames] -> кадры-проверки out/check/s1_<кадр>.png (по умолчанию 12 таймкодов)
#   tools/render_s1.sh range A B       -> быстрый рендер части кадров в out/scene1_<A>-<B>.mp4
# Переменные: BROWSER=/usr/bin/google-chrome (если headless-shell не скачивается), CONC=2
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
VIDEO="$ROOT/video"
OUT="$ROOT/out"
mkdir -p "$OUT/check"
cd "$VIDEO"

BROWSER="${BROWSER:-}"
if [ -z "$BROWSER" ] && command -v google-chrome >/dev/null; then
  BROWSER="$(command -v google-chrome)"
fi
FLAGS=(--gl=angle --overwrite)
[ -n "$BROWSER" ] && FLAGS+=(--browser-executable="$BROWSER")
[ -n "${CONC:-}" ] && FLAGS+=(--concurrency="$CONC")

[ -d node_modules ] || npm install --no-audit --no-fund

# Индекс аудио: какие файлы из public/audio реально есть (нет файлов - слои пропускаются, сборка не падает)
echo "аудио в public/audio:"; ls public/audio 2>/dev/null | sed 's/^/  /' || true

MODE="${1:-render}"
case "$MODE" in
  checks)
    shift || true
    FRAMES=("$@")
    # 12 таймкодов: по одному на кадр раскадровки + ключевые моменты
    [ ${#FRAMES[@]} -eq 0 ] && FRAMES=(60 120 172 210 290 330 380 420 470 500 600 700)
    for f in "${FRAMES[@]}"; do
      npx remotion still src/index.ts Scene1 "$OUT/check/s1_$(printf '%03d' "$f").png" --frame="$f" "${FLAGS[@]}" 2>&1 | grep -E "error|Error|Rendered 1/1" || true
    done
    echo "готово: $OUT/check/"
    ;;
  range)
    A="${2:?от}"; B="${3:?до}"
    npx remotion render src/index.ts Scene1 "$OUT/scene1_${A}-${B}.mp4" --frames="$A-$B" "${FLAGS[@]}"
    ;;
  *)
    npx remotion render src/index.ts Scene1 "$OUT/scene1_final.mp4" "${FLAGS[@]}"
    echo "готово: $OUT/scene1_final.mp4"
    ;;
esac
