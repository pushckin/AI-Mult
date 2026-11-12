#!/usr/bin/env python3
"""Озвучка реплик через Gemini TTS. Ключ — в переменной GEMINI_API_KEY (в файлы не пишется).
По одному запросу на реплику; тишина по краям обрезается.
usage: GEMINI_API_KEY=... python3 tools/gemini_tts.py [номер_реплики ...]"""
import json, os, sys, base64, subprocess, re, urllib.request, urllib.error, wave, time
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
KEY = os.environ["GEMINI_API_KEY"]; MODEL = os.environ.get("GEMINI_TTS_MODEL", "gemini-3.8-flash-tts")
CAST = {
 "ustav":   ("Algenib", "мрачно, сухо, устало"),
 "chaika":  ("Puck", "самодовольно, нагло, бодро"),
 "ladoshka":("Iapetus", "вкрадчиво, хитро, довольно"),
 "hohotun": ("Fenrir", "восторженно, хихикая, по-детски"),
 "gvozd":   ("Umbriel", "наивно, простодушно, медленно"),
}
def call(who, text):
    voice, style = CAST[who]
    prompt = text  # модель читает вслух весь присланный текст, поэтому никаких инструкций и меток
    body = {"contents":[{"parts":[{"text":prompt}]}],
            "generationConfig":{"responseModalities":["AUDIO"],"speechConfig":{"voiceConfig":{"prebuiltVoiceConfig":{"voiceName":voice}}}}}
    rq = urllib.request.Request(f"https://generativelanguage.googleapis.com/v1beta/models/{MODEL}:generateContent",
        data=json.dumps(body).encode(), headers={"x-goog-api-key":KEY,"Content-Type":"application/json"})
    try: d = json.load(urllib.request.urlopen(rq, timeout=300))
    except urllib.error.HTTPError as e: print("HTTP", e.code, e.read()[:300].decode(errors="ignore"), flush=True); return None
    try: part = d["candidates"][0]["content"]["parts"][0]["inlineData"]
    except Exception: print("нет аудио:", json.dumps(d)[:300], flush=True); return None
    return base64.b64decode(part["data"])  # готовый WAV
T = json.load(open(f"{ROOT}/script-timing.json"))
lines = [l for s in T.values() for l in s["lines"]]
want = set(map(int, sys.argv[1:]))
for l in lines:
    if want and l["id"] not in want: continue
    raw = f"{ROOT}/voice/.g{l['id']}.wav"; r = None
    for attempt in range(8):
        r = call(l["who"], l["text"])
        if r: break
        time.sleep(45)
    if not r: print("L%02d ПРОПУЩЕНА" % l["id"], flush=True); continue
    open(raw,"wb").write(r)
    af=("silenceremove=start_periods=1:start_threshold=-45dB,areverse,silenceremove=start_periods=1:start_threshold=-45dB,areverse,"
        "highpass=f=70,loudnorm=I=-17:TP=-2:LRA=7,aresample=48000")
    out=f"{ROOT}/voice/L{l['id']:02d}.wav"
    subprocess.run(["ffmpeg","-y","-v","error","-i",raw,"-af",af,"-ac","1",out],check=True); os.remove(raw)
    with wave.open(out) as w: print("L%02d %s %.2f c" % (l["id"], l["who"], w.getnframes()/w.getframerate()), flush=True)
    time.sleep(7)
