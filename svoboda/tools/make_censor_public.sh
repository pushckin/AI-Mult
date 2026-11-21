#!/usr/bin/env bash
# Каталог out/censor/public: копия структуры video/public через ХАРДЛИНКИ (cp -al; симлинки не годятся: статик-сервер Remotion
# не отдаёт файлы, чей realpath вне public-dir, и calculateMetadata/probeWav молча берёт дефолтные длительности), но voice_*.wav — цензурные версии из out/censor/audio.
# video/public не трогаем. Запуск: tools/make_censor_public.sh
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SRC="$ROOT/video/public"; DST="$ROOT/out/censor/public"; CENS="$ROOT/out/censor/audio"
rm -rf "$DST"
cp -al "$SRC" "$DST" 2>/dev/null || cp -a "$SRC" "$DST"   # хардлинки (одна ФС) или обычная копия
for e in "$SRC"/audio/voice_*.wav; do
  n="$(basename "$e")"
  [ -s "$CENS/$n" ] || { echo "нет цензурного $CENS/$n (сначала python3 tools/censor_voices.py)" >&2; exit 1; }
  rm -f "$DST/audio/$n"; cp -al "$CENS/$n" "$DST/audio/$n" 2>/dev/null || cp "$CENS/$n" "$DST/audio/$n"
done
echo "public для цензурного рендера: $DST ($(ls "$DST/audio" | wc -l) файлов в audio/)"
