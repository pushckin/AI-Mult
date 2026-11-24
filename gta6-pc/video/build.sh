#!/usr/bin/env bash
# Рендер кадров в N потоков -> out/video.mp4 (без звука). Затем python3 mix.py -> ../final_gta6_pc_dark.mp4
set -euo pipefail
cd "$(dirname "$0")"
INFO=$(node render.mjs info)
DUR=$(echo "$INFO" | python3 -c "import sys,json;print(json.load(sys.stdin)['total'])")
FPS=30; TOTAL=$(python3 -c "print(round($DUR*$FPS))"); N=${WORKERS:-4}
mkdir -p out; rm -f out/seg_*.mp4
STEP=$(( (TOTAL + N - 1) / N ))
for i in $(seq 0 $((N-1))); do
  a=$((i*STEP)); b=$(( (i+1)*STEP )); [ $b -gt $TOTAL ] && b=$TOTAL
  node render.mjs $a $b out/seg_$i.mp4 > out/log_$i.txt 2>&1 &
done
wait
: > out/list.txt; for i in $(seq 0 $((N-1))); do echo "file 'seg_$i.mp4'" >> out/list.txt; done
ffmpeg -y -loglevel error -f concat -safe 0 -i out/list.txt -c copy out/video.mp4
echo "video done $DUR"
