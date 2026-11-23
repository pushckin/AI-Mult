#!/usr/bin/env bash
# Сборка final_moloko.mp4: 4 параллельных чанка кадров -> склейка -> озвучка voiceover.mp3
set -euo pipefail
cd "$(dirname "$0")"
FPS=30; DUR=229.3; TOTAL=$(python3 -c "print(round($DUR*$FPS))"); N=${WORKERS:-4}
mkdir -p out; rm -f out/seg_*.mp4
STEP=$(( (TOTAL + N - 1) / N ))
for i in $(seq 0 $((N-1))); do
  a=$((i*STEP)); b=$(( (i+1)*STEP )); [ $b -gt $TOTAL ] && b=$TOTAL
  node render.mjs $a $b out/seg_$i.mp4 > out/log_$i.txt 2>&1 &
done
wait
: > out/list.txt; for i in $(seq 0 $((N-1))); do echo "file 'seg_$i.mp4'" >> out/list.txt; done
ffmpeg -y -loglevel error -f concat -safe 0 -i out/list.txt -i ../voiceover.mp3 -map 0:v -map 1:a -c:v copy -c:a aac -b:a 192k -af apad -t $DUR -movflags +faststart ../final_moloko.mp4
echo done
