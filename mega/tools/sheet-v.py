#!/usr/bin/env python3
"""sheet-v.py — лист кадров из вертикального mp4 (таймкод в углу каждого кадра).

  python3 tools/sheet-v.py video.mp4 out.jpg [--step 0.5] [--from 0] [--to 10] [--cols 8] [--height 480]

  --step    шаг по времени, с (по умолчанию 0.5)
  --from/--to  диапазон, с (по умолчанию весь ролик)
  --cols    число колонок (по умолчанию 8)
  --height  высота одного кадра, px (по умолчанию 480; ширина по пропорции)
Лист шире ~2000 px при просмотре уменьшается — для деталей бери меньше колонок или диапазон короче.
"""
import argparse, subprocess, tempfile, os, shutil
from PIL import Image, ImageDraw, ImageFont

ap = argparse.ArgumentParser()
ap.add_argument("src"); ap.add_argument("out")
ap.add_argument("--step", type=float, default=0.5)
ap.add_argument("--from", dest="t0", type=float, default=0.0)
ap.add_argument("--to", dest="t1", type=float, default=None)
ap.add_argument("--cols", type=int, default=8)
ap.add_argument("--height", type=int, default=480)
a = ap.parse_args()

dur = float(subprocess.check_output(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", a.src]).strip())
t1 = min(a.t1, dur) if a.t1 is not None else dur
times = []
t = a.t0
while t < t1 - 1e-6:
    times.append(round(t, 4)); t += a.step
d = tempfile.mkdtemp()
frames = []
for i, t in enumerate(times):
    f = os.path.join(d, f"f{i:05d}.jpg")
    # точный кадр: -ss после -i медленнее, но без промаха по ключевым кадрам
    subprocess.run(["ffmpeg", "-loglevel", "error", "-y", "-ss", f"{max(0, t - 2):.3f}", "-i", a.src, "-ss", f"{min(t, 2):.3f}",
                    "-frames:v", "1", "-vf", f"scale=-2:{a.height}", "-q:v", "3", f], check=True)
    if os.path.exists(f): frames.append((t, f))
if not frames: raise SystemExit("нет кадров")
w, h = Image.open(frames[0][1]).size
cols = min(a.cols, len(frames)); rows = -(-len(frames) // cols); gap = 4
S = Image.new("RGB", (cols * (w + gap) + gap, rows * (h + gap) + gap), (24, 24, 24)); g = ImageDraw.Draw(S)
try: font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", max(14, h // 22))
except OSError: font = ImageFont.load_default()
for i, (t, f) in enumerate(frames):
    x, y = gap + (i % cols) * (w + gap), gap + (i // cols) * (h + gap)
    S.paste(Image.open(f), (x, y))
    lab = f"{t:.2f}"; bb = g.textbbox((0, 0), lab, font=font)
    g.rectangle([x, y, x + bb[2] + 12, y + bb[3] + 10], fill=(0, 0, 0)); g.text((x + 6, y + 3), lab, fill=(255, 230, 60), font=font)
S.save(a.out, quality=88); shutil.rmtree(d, ignore_errors=True)
print(a.out, f"{len(frames)} кадров, {S.size[0]}x{S.size[1]}")
