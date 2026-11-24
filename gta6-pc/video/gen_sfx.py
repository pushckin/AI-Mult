# Звуковые эффекты ElevenLabs sound-generation (ключ подставляет прокси окружения). python3 gen_sfx.py
import json, os, urllib.request, urllib.error
S = {
 'pop': ('short cute cartoon bubble pop, comic speech bubble appearing', 0.8),
 'whoosh': ('soft cartoon sponge wipe swoosh across a whiteboard, squeaky whoosh', 1.8),
 'ding': ('bright success ding chime, short', 0.8),
 'logo': ('magical logo sting, shimmering whoosh with a soft chime, cinematic', 2.5),
 'zap': ('short electric zap buzz spark', 1.2),
 'fire': ('small fire crackling', 2.5),
 'boom': ('cartoon punchy pop burst with sparkle, short', 1.2),
 'clunk': ('heavy metal thunk, mechanical clunk', 1.2),
 'cash': ('old cash register ka-ching with coins, cartoon', 1.2),
 'squish': ('cartoon hydraulic press slam squishing something soft, comedic splat', 1.2),
 'defib': ('defibrillator charging whine then electric shock thump, cartoon', 1.8),
 'error': ('computer error beep, windows-like critical error sound, short', 0.8),
 'saw': ('cartoon hand saw sawing back and forth, comedic', 2.0),
 'scribble': ('marker pen squeaking on whiteboard, quick drawing', 1.5),
 'clink': ('two beer mugs clinking cheers', 1.0),
 'coins': ('pile of coins falling and jingling, cartoon money', 1.5),
}
for name, (text, dur) in S.items():
    f = f'sfx/{name}.mp3'
    if os.path.exists(f) and os.path.getsize(f) > 2000: continue
    body = json.dumps({'text': text, 'duration_seconds': dur, 'prompt_influence': 0.5}).encode()
    req = urllib.request.Request('https://api.elevenlabs.io/v1/sound-generation?output_format=mp3_44100_128', body, {'Content-Type': 'application/json', 'xi-api-key': 'proxy'})
    try:
        d = urllib.request.urlopen(req, timeout=120).read(); open(f, 'wb').write(d); print(name, 'ok', len(d))
    except urllib.error.HTTPError as e: print(name, 'HTTP', e.code, e.read()[:200])
    except Exception as e: print(name, 'ERR', repr(e)[:150])
