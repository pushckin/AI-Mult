#!/usr/bin/env bash
# Использование: PROJ=aes ./build.sh   (или PROJ=moloko). Кадры -> out/video_$PROJ.mp4, затем mux с аудио (mix.py).
set -euo pipefail
cd "$(dirname "$0")"
PROJ=${PROJ:-moloko}; export PROJ
INFO=$(node render.mjs info)
DUR=$(echo "$INFO" | python3 -c "import sys,json;print(json.load(sys.stdin)['total'])")
FPS=30; TOTAL=$(python3 -c "print(round($DUR*$FPS))"); N=${WORKERS:-4}
mkdir -p out; rm -f out/seg_${PROJ}_*.mp4
STEP=$(( (TOTAL + N - 1) / N ))
for i in $(seq 0 $((N-1))); do
  a=$((i*STEP)); b=$(( (i+1)*STEP )); [ $b -gt $TOTAL ] && b=$TOTAL
  node render.mjs $a $b out/seg_${PROJ}_$i.mp4 > out/log_${PROJ}_$i.txt 2>&1 &
done
wait
: > out/list_$PROJ.txt; for i in $(seq 0 $((N-1))); do echo "file 'seg_${PROJ}_$i.mp4'" >> out/list_$PROJ.txt; done
ffmpeg -y -loglevel error -f concat -safe 0 -i out/list_$PROJ.txt -c copy out/video_$PROJ.mp4
echo "video done $DUR"
