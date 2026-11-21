#!/usr/bin/env bash
# Рендер сцены 4 («Закон и порядок», кадры 19-27). Длина считается из длительностей реплик (public/audio/voice_s4_*.wav).
#   tools/render_s4.sh                 -> out/scene4.mp4 (полный рендер)
#   tools/render_s4.sh range A B       -> быстрый рендер части кадров (60 fps: 60 кадров = 1 с) в out/scene4_<A>-<B>.mp4
#   Сцена 60 fps (data/fps.ts). Параллелизм: CONC=<число> tools/render_s4.sh ...
#   node tools/stills.mjs <папка> <кадры…> с COMP=Scene4 -> still'ы
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT/video"
mkdir -p "$ROOT/out"
BROWSER="${BROWSER:-}"
if [ -z "$BROWSER" ] && command -v google-chrome >/dev/null; then BROWSER="$(command -v google-chrome)"; fi
FLAGS=(--gl=angle --overwrite)
[ -n "$BROWSER" ] && FLAGS+=(--browser-executable="$BROWSER")
[ -n "${CONC:-}" ] && FLAGS+=(--concurrency="$CONC")
[ -d node_modules ] || npm install --no-audit --no-fund
case "${1:-render}" in
  range) A="${2:?от}"; B="${3:?до}"; npx remotion render src/index.ts Scene4 "$ROOT/out/scene4_${A}-${B}.mp4" --frames="$A-$B" "${FLAGS[@]}" ;;
  *) OUT="${OUT:-scene4}"; npx remotion render src/index.ts Scene4 "$ROOT/out/$OUT.mp4" "${FLAGS[@]}"; echo "готово: $ROOT/out/$OUT.mp4" ;;
esac
