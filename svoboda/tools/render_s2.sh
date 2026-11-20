#!/usr/bin/env bash
# Рендер сцены 2 («Освобождение», кадры 07-12). Длина считается из длительностей реплик (public/audio/voice_s2_*.wav).
#   tools/render_s2.sh                 -> out/scene2.mp4 (полный рендер)
#   tools/render_s2.sh range A B       -> быстрый рендер части кадров в out/scene2_<A>-<B>.mp4
#   node tools/stills.mjs <папка> <кадры…> с COMP=Scene2 -> still'ы
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
  range) A="${2:?от}"; B="${3:?до}"; npx remotion render src/index.ts Scene2 "$ROOT/out/scene2_${A}-${B}.mp4" --frames="$A-$B" "${FLAGS[@]}" ;;
  *) npx remotion render src/index.ts Scene2 "$ROOT/out/scene2.mp4" "${FLAGS[@]}"; echo "готово: $ROOT/out/scene2.mp4" ;;
esac
