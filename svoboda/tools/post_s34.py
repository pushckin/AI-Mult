#!/usr/bin/env python3
"""Постобработка реплик сцен 3-4: оригиналы -> out/tts_s34/orig, срез тишины по краям, atempo, нормализация -3 dB,
запись video/public/audio/voice_sN_NN_<имя>.wav и voice_s3_durations.json / voice_s4_durations.json.
Запуск: python3 tools/post_s34.py [tempo=1.35]"""
import json, shutil, subprocess, sys
from pathlib import Path
import numpy as np
from scipy.io import wavfile
ROOT = Path(__file__).resolve().parents[1]
RAW = ROOT / 'out/tts_s34/raw'; ORIG = ROOT / 'out/tts_s34/orig'; AUDIO = ROOT / 'video/public/audio'
ORIG.mkdir(parents=True, exist_ok=True)
tempo = float(sys.argv[1]) if len(sys.argv) > 1 else 1.35
sil = 'silenceremove=start_periods=1:start_threshold=-42dB:start_silence=0.04'
af = f'{sil},areverse,{sil},areverse,atempo={tempo}'
dur = {'s3': {}, 's4': {}}
for f in sorted(RAW.glob('s[34]_*.wav')):
    sc = f.name[:2]; out = AUDIO / f'voice_{f.name}'
    shutil.copy(f, ORIG / f.name)
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', str(f), '-af', af, '-ar', '24000', '-ac', '1', str(out)], check=True)
    sr, x = wavfile.read(out); x = x.astype(np.float32)
    x *= (10 ** (-3 / 20) * 32767) / (np.abs(x).max() + 1)
    wavfile.write(out, sr, x.astype(np.int16))
    dur[sc][out.name] = round(len(x) / sr, 2)
for sc in dur:
    if dur[sc]:
        (AUDIO / f'voice_{sc}_durations.json').write_text(json.dumps(dur[sc], indent=1, ensure_ascii=False))
        print(sc, dur[sc], 'TOTAL', round(sum(dur[sc].values()), 2))
