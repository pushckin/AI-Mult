# Микс: озвучка (со сдвигом на заставку) + звуковые эффекты по событиям сцен. Использование: PROJ=aes python3 mix.py
import json, os, subprocess, sys
proj = os.environ.get('PROJ', 'moloko')
info = json.loads(subprocess.check_output(['node', 'render.mjs', 'info'], env={**os.environ, 'PROJ': proj}))
INTRO, TOTAL = info['intro'], info['total']
voice = {'aes': '../voiceover_aes.mp3', 'moloko': '../voiceover.mp3'}[proj]
VOL = {'pop': 0.55, 'whoosh': 0.5, 'boil': 0.35, 'steam': 0.3, 'fire': 0.25, 'turbine': 0.3, 'zap': 0.45, 'boom': 0.5, 'clunk': 0.55, 'ding': 0.45, 'bulb': 0.5, 'logo': 0.6}
ev = [e for e in info['sfx'] if os.path.exists(f"sfx/{e['name']}.mp3")]
inputs = ['-i', voice]; filt = [f'[0:a]adelay={int(INTRO*1000)}:all=1,volume=1.0[v0]']; labels = ['[v0]']
for i, e in enumerate(ev, 1):
    inputs += ['-i', f"sfx/{e['name']}.mp3"]
    ms = max(0, int((e['t'] + INTRO) * 1000))
    filt.append(f"[{i}:a]aformat=sample_rates=44100:channel_layouts=stereo,volume={VOL.get(e['name'], .4) * e.get('vol', 1)},adelay={ms}:all=1[s{i}]"); labels.append(f'[s{i}]')
filt.append(f"{''.join(labels)}amix=inputs={len(labels)}:normalize=0:duration=longest,alimiter=limit=0.95,apad[a]")
os.makedirs('out', exist_ok=True)
subprocess.check_call(['ffmpeg', '-y', '-loglevel', 'error', *inputs, '-filter_complex', ';'.join(filt), '-map', '[a]', '-t', str(TOTAL), '-c:a', 'aac', '-b:a', '192k', f'out/audio_{proj}.m4a'])
print('audio ok', len(ev), 'sfx events')
