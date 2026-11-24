# Сведение: озвучка (со сдвигом на заставку) + фоновая музыка (с приглушением под голос) + звуковые эффекты.
# Использование: cd video && python3 mix.py  -> out/audio.m4a, затем mux в ../final_gta6_pc_dark.mp4
import json, os, subprocess
info = json.loads(subprocess.check_output(['node', 'render.mjs', 'info'], stderr=subprocess.DEVNULL))
INTRO, TOTAL = info['intro'], info['total']
voice = '../voiceover.mp3'; music = '../audio/music/bg.mp3'
VOL = {'pop': 0.5, 'whoosh': 0.5, 'fire': 0.25, 'zap': 0.45, 'boom': 0.5, 'clunk': 0.55, 'ding': 0.45, 'logo': 0.6, 'cash': 0.5, 'squish': 0.55, 'defib': 0.45, 'error': 0.4, 'saw': 0.35, 'clink': 0.55, 'coins': 0.45}
ev = [e for e in info['sfx'] if os.path.exists(f"sfx/{e['name']}.mp3")]
inputs, filt, labels = [], [], []
if os.path.exists(voice):
    inputs += ['-i', voice]; filt.append(f'[0:a]aformat=sample_rates=44100:channel_layouts=stereo,adelay={int(INTRO*1000)}:all=1,volume=1.0,asplit=2[v0][vsc]'); labels.append('[v0]')
n = len(inputs) // 2
if os.path.exists(music):
    inputs += ['-stream_loop', '-1', '-i', music]
    m = f'[{n}:a]aformat=sample_rates=44100:channel_layouts=stereo,volume=0.16,afade=t=in:d=1.5,afade=t=out:st={TOTAL-3}:d=3,atrim=0:{TOTAL}[mraw]'
    if labels: filt += [m, '[mraw][vsc]sidechaincompress=threshold=0.03:ratio=4:attack=40:release=500[m]']
    else: filt.append(m.replace('[mraw]', '[m]'))
    labels.append('[m]'); n += 1
elif labels: filt[0] = filt[0].replace(',asplit=2[v0][vsc]', '[v0]')
for e in ev:
    inputs += ['-i', f"sfx/{e['name']}.mp3"]
    ms = max(0, int((e['t'] + INTRO) * 1000))
    filt.append(f"[{n}:a]aformat=sample_rates=44100:channel_layouts=stereo,volume={VOL.get(e['name'], .4) * e.get('vol', 1)},adelay={ms}:all=1[s{n}]"); labels.append(f'[s{n}]'); n += 1
filt.append(f"{''.join(labels)}amix=inputs={len(labels)}:normalize=0:duration=longest,alimiter=limit=0.95,apad[a]")
os.makedirs('out', exist_ok=True)
subprocess.check_call(['ffmpeg', '-y', '-loglevel', 'error', *inputs, '-filter_complex', ';'.join(filt), '-map', '[a]', '-t', str(TOTAL), '-c:a', 'aac', '-b:a', '192k', 'out/audio.m4a'])
subprocess.check_call(['ffmpeg', '-y', '-loglevel', 'error', '-i', 'out/video.mp4', '-i', 'out/audio.m4a', '-map', '0:v', '-map', '1:a', '-c:v', 'copy', '-c:a', 'copy', '-movflags', '+faststart', '-shortest', '../final_gta6_pc_dark.mp4'])
print('final ok:', len(ev), 'sfx events, total', TOTAL)
