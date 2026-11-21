#!/usr/bin/env bash
# Рендер серии в 60 fps и склейка: tools/render_series60.sh 1   (сцены 1+2 -> out/seriya1_60.mp4)
#                                tools/render_series60.sh 2   (сцены 3+4 -> out/seriya2_60.mp4)
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT/video"
mkdir -p "$ROOT/out"
BROWSER="$(command -v google-chrome || true)"
FLAGS=(--gl=angle --overwrite --concurrency="${CONC:-4}")
[ -n "$BROWSER" ] && FLAGS+=(--browser-executable="$BROWSER")
case "${1:?серия 1 или 2}" in
  1) A=Scene1; B=Scene2 ;;
  2) A=Scene3; B=Scene4 ;;
  *) echo "серия 1 или 2"; exit 1 ;;
esac
for S in "$A" "$B"; do
  f="$ROOT/out/${S,,}_60.mp4"
  if [ -s "$f" ] && [ -z "${FORCE:-}" ]; then echo "есть $f, пропускаю"; continue; fi
  npx remotion render src/index.ts "$S" "$f" "${FLAGS[@]}"
done
ffmpeg -y -loglevel error -i "$ROOT/out/${A,,}_60.mp4" -i "$ROOT/out/${B,,}_60.mp4" -filter_complex "[0:v]fps=60,scale=1920:1080,setsar=1,format=yuv420p[v0];[1:v]fps=60,scale=1920:1080,setsar=1,format=yuv420p[v1];[0:a]aresample=44100,aformat=channel_layouts=stereo[a0];[1:a]aresample=44100,aformat=channel_layouts=stereo[a1];[v0][a0][v1][a1]concat=n=2:v=1:a=1[v][a]" -map "[v]" -map "[a]" -c:v libx264 -crf 18 -preset medium -c:a aac -b:a 192k -movflags +faststart "$ROOT/out/seriya${1}_60.mp4"
ffprobe -v error -show_entries stream=codec_name,width,height,r_frame_rate -show_entries format=duration -of default=nw=1 "$ROOT/out/seriya${1}_60.mp4"
echo "готово: $ROOT/out/seriya${1}_60.mp4"
