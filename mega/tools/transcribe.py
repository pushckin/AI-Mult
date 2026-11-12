#!/usr/bin/env python3
"""Проверка озвучки: распознаёт voice/LNN.wav через Gemini и печатает текст. GEMINI_API_KEY в окружении."""
import json, os, sys, base64, urllib.request
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__))); KEY = os.environ["GEMINI_API_KEY"]
M = os.environ.get("GEMINI_ASR_MODEL", "gemini-3.8-flash-lite")
for i in sys.argv[1:]:
    b = base64.b64encode(open(f"{ROOT}/voice/L{int(i):02d}.wav","rb").read()).decode()
    body = {"contents":[{"parts":[{"inlineData":{"mimeType":"audio/wav","data":b}},{"text":"Запиши дословно всё, что произнесено в этой записи. Только текст, без пояснений."}]}]}
    rq = urllib.request.Request(f"https://generativelanguage.googleapis.com/v1beta/models/{M}:generateContent", data=json.dumps(body).encode(), headers={"x-goog-api-key":KEY,"Content-Type":"application/json"})
    try: d = json.load(urllib.request.urlopen(rq, timeout=120)); print(i, "→", d["candidates"][0]["content"]["parts"][0]["text"].strip())
    except Exception as e: print(i, "ERR", getattr(e,"code",e), (e.read()[:200] if hasattr(e,"read") else ""))
