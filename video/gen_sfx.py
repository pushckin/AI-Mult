# Генерация звуковых эффектов через ElevenLabs sound-generation (ключ подставляет прокси окружения).
import json, sys, os, urllib.request, urllib.error
S = {
 'pop': ('short cute cartoon bubble pop, comic speech bubble appearing', 0.8),
 'whoosh': ('soft cartoon sponge wipe swoosh across a whiteboard, squeaky whoosh', 1.8),
 'boil': ('kettle boiling water bubbling and starting to whistle, cartoon', 2.5),
 'steam': ('steam hiss release, soft gentle hiss', 2.0),
 'fire': ('small fire crackling, cozy', 2.5),
 'turbine': ('industrial turbine spinning up whirr, mechanical hum', 2.5),
 'zap': ('short electric zap buzz spark', 1.2),
 'boom': ('cartoon energy burst with sparkle, short punchy atom split pop', 1.2),
 'clunk': ('heavy metal rod sliding down and clunk, mechanical thunk', 1.2),
 'ding': ('bright success ding chime, short', 0.8),
 'bulb': ('light bulb turning on, cartoon ping and glow', 1.0),
 'logo': ('magical logo sting, shimmering whoosh with a soft chime, cinematic', 2.5),
}
for name, (text, dur) in S.items():
    f = f'sfx/{name}.mp3'
    if os.path.exists(f) and os.path.getsize(f) > 2000: continue
    body = json.dumps({'text': text, 'duration_seconds': dur, 'prompt_influence': 0.5}).encode()
    req = urllib.request.Request('https://api.elevenlabs.io/v1/sound-generation?output_format=mp3_44100_128', body, {'Content-Type': 'application/json'})
    try:
        d = urllib.request.urlopen(req, timeout=120).read(); open(f, 'wb').write(d); print(name, 'ok', len(d))
    except urllib.error.HTTPError as e: print(name, 'HTTP', e.code, e.read()[:200]); 
    except Exception as e: print(name, 'ERR', repr(e)[:150])
