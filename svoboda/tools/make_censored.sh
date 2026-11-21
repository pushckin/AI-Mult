#!/usr/bin/env bash
# Цензурная версия серии без перерендера картинки: tools/make_censored.sh 1   (или 2)
#   1) python3 tools/censor_voices.py -> out/censor/audio/voice_*.wav (мат заменён писком 1 кГц)
#   2) tools/make_censor_public.sh   -> out/censor/public (хардлинки на video/public, voice_* цензурные)
#   3) аудио-рендер Remotion (--codec=wav, без кадров) сцен серии -> out/censor/sceneN_c.wav
#   4) видео из out/seriyaN_60.mp4 (-c:v copy) + склеенный цензурный звук (aac 192k) -> out/seriyaN_60_cenz.mp4
# Если out/seriyaN_60.mp4 ещё нет — падает с сообщением (WAIT=1: ждать его появления и стабильного размера).
# SKIP_RENDER=1 — не рендерить заново, собрать из уже готовых out/censor/sceneN_c.wav. alimiter -0.5 dBFS — чтобы пик не клиппил после AAC.
# video/public и video/src не трогаются. CONC — параллелизм рендера (по умолчанию 1).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
N="${1:?серия 1 или 2}"
case "$N" in 1) A=Scene1; B=Scene2 ;; 2) A=Scene3; B=Scene4 ;; *) echo "серия 1 или 2" >&2; exit 1 ;; esac
VIDEO="$ROOT/out/seriya${N}_60.mp4"
OUT="$ROOT/out/seriya${N}_60_cenz.mp4"
CEN="$ROOT/out/censor"
if [ ! -s "$VIDEO" ]; then
  if [ -n "${WAIT:-}" ]; then
    echo "жду $VIDEO ..."; while [ ! -s "$VIDEO" ]; do sleep 20; done
    s0=-1; while true; do s1=$(stat -c %s "$VIDEO"); [ "$s1" = "$s0" ] && break; s0=$s1; sleep 10; done
  else
    echo "ОШИБКА: нет $VIDEO — серия $N ещё не отрендерена (tools/render_series60.sh $N, лог /tmp/render_series2_60.log). Повторите позже или запустите с WAIT=1." >&2
    exit 2
  fi
fi
python3 "$ROOT/tools/censor_voices.py" >/dev/null
python3 "$ROOT/tools/censor_voices.py" --check | tail -1
"$ROOT/tools/make_censor_public.sh"
cd "$ROOT/video"
BROWSER="$(command -v google-chrome || true)"
FLAGS=(--codec=wav --public-dir="$CEN/public" --gl=angle --concurrency="${CONC:-1}")
[ -n "$BROWSER" ] && FLAGS+=(--browser-executable="$BROWSER")
[ -n "${SKIP_RENDER:-}" ] || for S in "$A" "$B"; do npx remotion render src/index.ts "$S" "$CEN/${S,,}_c.wav" "${FLAGS[@]}" ${RANGE:+--frames="$RANGE"} 2>&1 | tail -1; done
[ -n "${RANGE:-}" ] && { echo "RANGE задан — тест аудио-рендера, видео не собираю"; exit 0; }
ffmpeg -y -loglevel error -i "$VIDEO" -i "$CEN/${A,,}_c.wav" -i "$CEN/${B,,}_c.wav" \
  -filter_complex "[1:a]aresample=44100,aformat=channel_layouts=stereo[a0];[2:a]aresample=44100,aformat=channel_layouts=stereo[a1];[a0][a1]concat=n=2:v=0:a=1,alimiter=limit=0.944:level=disabled[a]" \
  -map 0:v -map "[a]" -c:v copy -c:a aac -b:a 192k -movflags +faststart "$OUT"
dv=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$VIDEO"); do_=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$OUT")
da=$(ffprobe -v error -select_streams a -show_entries stream=duration -of csv=p=0 "$OUT")
echo "длительность: оригинал $dv, цензурный контейнер $do_, аудио $da"
python3 - "$dv" "$do_" <<'PY'
import sys; a, b = float(sys.argv[1]), float(sys.argv[2])
if abs(a - b) > 0.1: print("ВНИМАНИЕ: длительности расходятся на %.3f с" % abs(a - b)); sys.exit(3)
PY
ffmpeg -hide_banner -nostats -i "$OUT" -map 0:a -af astats=metadata=0:reset=0 -f null - 2>&1 | grep -E "Peak level dB|Number of samples" | tail -3 || true
echo "готово: $OUT"
