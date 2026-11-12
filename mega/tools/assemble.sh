#!/usr/bin/env bash
# assemble.sh — финальная сборка «Отряд Мега».
#   tools/assemble.sh [видео сцен по порядку]        (по умолчанию out/s1.mp4 … out/s5.mp4)
#   OUT=out/mega-full.mp4   куда писать
#   SFX=0.8 VOICE=1.6       громкость эффектов и голосов до сведения
#   LUFS=-14 PEAK=-1.5      целевая громкость и потолок лимитера (дБ)
#   VOICES=0                собрать без голосов
# Номер сцены берётся из имени файла (s3.mp4, s3-draft.mp4 → сцена 3), иначе по порядку.
# Голос voice/LNN.wav ставится на (начало своей сцены в склейке + line.t); при полном наборе сцен это partStart + line.t.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
if [ $# -eq 0 ]; then set -- out/s1.mp4 out/s2.mp4 out/s3.mp4 out/s4.mp4 out/s5.mp4; fi
OUT="${OUT:-out/mega-full.mp4}" SFX="${SFX:-0.8}" VOICE="${VOICE:-1.6}" LUFS="${LUFS:--14}" PEAK="${PEAK:--1.5}" VOICES="${VOICES:-1}" \
python3 - "$@" <<'PY'
import json, os, re, subprocess, sys, tempfile, shutil
vids = sys.argv[1:]
OUT = os.environ["OUT"]; SFX = float(os.environ["SFX"]); VOICE = float(os.environ["VOICE"])
LUFS = float(os.environ["LUFS"]); PEAK = float(os.environ["PEAK"]); USE_V = os.environ["VOICES"] != "0"
T = json.load(open("script-timing.json"))
for v in vids:
    if not os.path.exists(v): sys.exit(f"нет файла {v}")
def dur(f): return float(subprocess.check_output(["ffprobe", "-v", "error", "-select_streams", "v:0", "-show_entries", "format=duration", "-of", "csv=p=0", f]).strip())
def has_audio(f): return bool(subprocess.check_output(["ffprobe", "-v", "error", "-select_streams", "a", "-show_entries", "stream=index", "-of", "csv=p=0", f]).strip())
def run(a): subprocess.run(a, check=True)

# --- раскладка сцен и голосов ---
start, cues = 0.0, []
print("Сцены:")
for i, v in enumerate(vids):
    m = re.search(r"s(\d)", os.path.basename(v)); n = m.group(1) if m and m.group(1) in T else str(i + 1)
    d = dur(v); sc = T.get(n)
    note = ""
    if sc:
        if len(vids) == len(T) and abs(start - sc["partStart"]) > 0.05: note += f"  ВНИМАНИЕ: начало {start:.2f} ≠ partStart {sc['partStart']}"
        if abs(d - sc["duration"]) > 0.05: note += f"  ВНИМАНИЕ: длина {d:.2f} ≠ {sc['duration']} по сценарию"
        for L in sc["lines"]:
            f = os.path.join("voice", L["file"])
            if os.path.exists(f): cues.append((start + L["t"], f, L["who"], L["text"]))
            else: print("  нет голоса", f)
    print(f"  сцена {n}: {v}  начало {start:7.2f} с, длина {d:6.2f} с{note}")
    start += d
total = start
if not USE_V: cues = []
print(f"Голосов: {len(cues)}; общая длина {total:.2f} с")
for t, f, who, text in cues: print(f"  {t:7.2f}  {os.path.basename(f)}  {who:9s} {text[:48]}")

tmp = tempfile.mkdtemp(prefix="asm-")
try:
    # --- 1. сведение звука: эффекты (со склейки) + голоса (adelay), эффекты приглушаются под голосом ---
    cmd = ["ffmpeg", "-y", "-loglevel", "error"]
    for v in vids: cmd += ["-i", v]
    for _, f, _, _ in cues: cmd += ["-i", f]
    fc, nv = [], len(vids)
    for i, v in enumerate(vids):
        d = dur(v)
        if has_audio(v): fc.append(f"[{i}:a]aresample=48000,aformat=channel_layouts=stereo,apad,atrim=0:{d:.4f},asetpts=N/SR/TB[sa{i}]")
        else: fc.append(f"anullsrc=r=48000:cl=stereo,atrim=0:{d:.4f}[sa{i}]")
    fc.append("".join(f"[sa{i}]" for i in range(nv)) + f"concat=n={nv}:v=0:a=1,volume={SFX}[sfx]")
    if cues:
        for k, (t, f, _, _) in enumerate(cues):
            fc.append(f"[{nv + k}:a]aresample=48000,aformat=channel_layouts=stereo,adelay={int(round(t * 1000))}:all=1[v{k}]")
        fc.append("".join(f"[v{k}]" for k in range(len(cues))) + f"amix=inputs={len(cues)}:normalize=0:dropout_transition=0,volume={VOICE},apad,atrim=0:{total:.4f},asplit=2[vox][key]")
        fc.append("[sfx][key]sidechaincompress=threshold=0.02:ratio=5:attack=15:release=350:makeup=1[duck]")
        fc.append(f"[duck][vox]amix=inputs=2:normalize=0:dropout_transition=0,atrim=0:{total:.4f}[mix]")
    else:
        fc.append(f"[sfx]atrim=0:{total:.4f}[mix]")
    mix = os.path.join(tmp, "mix.wav")
    run(cmd + ["-filter_complex", ";".join(fc), "-map", "[mix]", "-c:a", "pcm_f32le", "-ar", "48000", mix])

    # --- 2. замер громкости → статическое усиление до цели, затем лимитер ---
    def loud(f):
        e = subprocess.run(["ffmpeg", "-hide_banner", "-nostats", "-i", f, "-af", "ebur128=peak=true", "-f", "null", "-"], capture_output=True, text=True).stderr
        tail = e[e.rfind("Summary:"):]
        I = re.search(r"I:\s+(-?[\d.]+) LUFS", tail); P = re.search(r"Peak:\s+(-?[\d.]+) dBFS", tail)
        return (float(I.group(1)) if I else -70.0, float(P.group(1)) if P else -70.0)
    I0, P0 = loud(mix)
    gain = max(-20.0, min(24.0, LUFS - I0)) if I0 > -60 else 0.0
    lim = 10 ** (PEAK / 20)
    print(f"Сведение: {I0:.1f} LUFS, пик {P0:.1f} dBFS → усиление {gain:+.1f} дБ, лимитер {PEAK} дБ")
    # лимитер съедает часть громкости — добираем вторым замером
    fin = os.path.join(tmp, "fin.wav")
    for _ in range(3):
        run(["ffmpeg", "-y", "-loglevel", "error", "-i", mix, "-af", f"volume={gain:.2f}dB,alimiter=limit={lim:.4f}:level=false:attack=4:release=60,aresample=48000", "-c:a", "pcm_s24le", fin])
        I1, P1 = loud(fin)
        if abs(I1 - LUFS) < 0.4 or I0 < -60: break
        gain += (LUFS - I1)
    # --- 3. видео: склейка + итоговый звук ---
    cmd = ["ffmpeg", "-y", "-loglevel", "error"]
    for v in vids: cmd += ["-i", v]
    cmd += ["-i", fin]
    vf = "".join(f"[{i}:v]fps=30,scale=1080:1920:flags=lanczos,setsar=1,format=yuv420p[vv{i}];" for i in range(nv))
    vf += "".join(f"[vv{i}]" for i in range(nv)) + f"concat=n={nv}:v=1:a=0[v]"
    os.makedirs(os.path.dirname(os.path.abspath(OUT)), exist_ok=True)
    run(cmd + ["-filter_complex", vf, "-map", "[v]", "-map", f"{nv}:a", "-c:v", "libx264", "-preset", "slow", "-crf", "17", "-pix_fmt", "yuv420p", "-r", "30",
               "-c:a", "aac", "-b:a", "192k", "-ar", "48000", "-shortest", "-movflags", "+faststart", OUT])
    I2, P2 = loud(OUT)
    print(f"Готово: {OUT}  длина {dur(OUT):.2f} с, громкость {I2:.1f} LUFS, истинный пик {P2:.1f} dBFS" + ("" if P2 <= -1.0 else "  ВНИМАНИЕ: пик выше −1 dBFS — понизь PEAK"))
finally:
    shutil.rmtree(tmp, ignore_errors=True)
PY
