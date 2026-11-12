#!/usr/bin/env python3
"""Синтез реплик (piper) + расчёт таймингов сцен. Пишет voice/*.wav, kit/lines.js, script-timing.json"""
import json, subprocess, os, sys, wave
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
VOICES = os.environ.get("PIPER_VOICES", "/tmp/claude-0/-home-user/0a6d5537-3e2d-5be1-a4f4-fc128ace735a/scratchpad/voices")
# персонаж -> (модель, питч, темп)
CAST = {
 "ustav":   ("ruslan", 0.90, 0.97),
 "chaika":  ("denis",  1.00, 1.04),
 "ladoshka":("dmitri", 0.96, 0.98),
 "hohotun": ("denis",  1.26, 1.06),
 "gvozd":   ("ruslan", 1.17, 0.95),
}
# сцены: ("L", id, кто, текст, пауза_перед)  |  ("B", имя_бита, длительность)
S = {
1: [("B","intro",1.0),
    ("L",1,"ustav","Задача простая. Зона — здесь. Кто стоит в зоне, тот получает очки. Вопросы?",0),
    ("L",2,"hohotun","А можно стоять не в зоне?",0.3),
    ("L",3,"ustav","Можно. Мы так делали вчера. Счёт помнишь?",0.35),
    ("L",4,"hohotun","Ноль?",0.3),
    ("L",5,"ustav","Ноль — это у красных было бы стыдно. У нас был минус.",0.4),
    ("B","forms",1.6),
    ("L",6,"ustav","Подпишите заранее. Погиб геройски я уже вписал. Причину добавлю по факту.",0),
    ("L",7,"gvozd","А если я не погибну?",0.4),
    ("B","stare",1.5),
    ("L",8,"ustav","Подписывай.",0),
    ("B","door",3.8),
    ("L",9,"ustav","Дверь.",0),
    ("L",10,"ladoshka","Первый пошёл. Штампик ставлю.",0.5),
    ("B","out",1.0)],
2: [("B","intro",1.2),
    ("L",11,"chaika","Сразу предупреждаю: это мой первый полёт.",0),
    ("L",12,"ustav","Ты это говорил утром.",0.35),
    ("L",13,"chaika","Утром я не взлетел. Не считается.",0.3),
    ("B","takeoff",2.2),
    ("L",14,"gvozd","Командир, а парашюты есть?",0),
    ("L",15,"ustav","Есть. Один.",0.35),
    ("L",16,"gvozd","На пятерых?",0.3),
    ("L",17,"chaika","На пилота.",0.3),
    ("B","landing",2.6),
    ("L",18,"chaika","Приехали. Как договаривались — на чай.",0),
    ("L",19,"ustav","До зоны три километра.",0.4),
    ("L",20,"chaika","Зато живые. Пока.",0.35),
    ("B","out",1.3)],
3: [("B","walk",1.6),
    ("L",21,"ustav","Хохотун, координаты я тебе дал.",0),
    ("L",22,"hohotun","Дали! Хи-хи-хи. Я только цифры местами поменял. Так красивее.",0.3),
    ("B","shell",4.2),
    ("B","impact",1.3),
    ("L",23,"hohotun","В голову!",0),
    ("L",24,"ustav","Чайка. Свои. Чаевые соберите, семье отправим.",0.5),
    ("L",25,"ladoshka","Семье — после моей комиссии.",0.4),
    ("B","out",1.0)],
4: [("B","reveal",2.0),
    ("L",26,"ustav","Где выход?",0),
    ("L",27,"gvozd","Так безопаснее. Никто не войдёт.",0.35),
    ("L",28,"ustav","А мы как выйдем?",0.35),
    ("B","think",1.3),
    ("L",29,"gvozd","А нам надо?",0),
    ("B","firefight",5.5),
    ("L",30,"ladoshka","Гвоздь, поздравляю, десятая! Эта — за счёт заведения.",0),
    ("L",31,"gvozd","Ура.",0.4),
    ("B","out",0.9)],
5: [("B","silence",2.6),
    ("B","victory",1.6),
    ("L",32,"ustav","Победа. Потери — сорок семь.",0),
    ("L",33,"hohotun","Командир, нас же пятеро.",0.4),
    ("B","pause",0.7),
    ("L",34,"ustav","Я знаю.",0),
    ("B","terminal",1.6),
    ("L",35,"ladoshka","С вас за сорок шесть. Одна была по акции.",0),
    ("B","shed",2.6),
    ("B","black",0.7),
    ("L",36,"ustav","Сорок восемь.",0),
    ("B","endcard",2.2)],
}
def dur(p):
    with wave.open(p) as w: return w.getnframes()/w.getframerate()
def synth(i, who, text):
    out = f"{ROOT}/voice/L{i:02d}.wav"
    if os.path.exists(out) and "--force" not in sys.argv: return dur(out)
    model, pitch, tempo = CAST[who]; raw = f"{ROOT}/voice/.raw{i}.wav"
    subprocess.run([sys.executable,"-m","piper","-m",f"{VOICES}/ru_RU-{model}-medium.onnx","-f",raw],input=text.encode(),check=True,capture_output=True)
    af = (f"silenceremove=start_periods=1:start_threshold=-45dB,areverse,silenceremove=start_periods=1:start_threshold=-45dB,areverse,"
          f"rubberband=pitch={pitch}:tempo={tempo}:formant=preserved,highpass=f=70,loudnorm=I=-17:TP=-2:LRA=7,aresample=48000")
    subprocess.run(["ffmpeg","-y","-v","error","-i",raw,"-af",af,"-ac","1",out],check=True); os.remove(raw)
    return dur(out)
timing = {}
for sc, items in S.items():
    t = 0.0; lines = []; beats = {}
    for it in items:
        if it[0] == "B":
            beats[it[1]] = {"t": round(t,2), "dur": it[2]}; t += it[2]
        else:
            _, i, who, text, gap = it; d = synth(i, who, text); t += gap
            lines.append({"id": i, "who": who, "text": text, "t": round(t,2), "dur": round(d,2), "file": f"L{i:02d}.wav"}); t += d
    timing[sc] = {"duration": round(t + 0.0, 2), "lines": lines, "beats": beats}
start = 0.0
for sc in timing: timing[sc]["partStart"] = round(start,2); start += timing[sc]["duration"]
json.dump(timing, open(f"{ROOT}/script-timing.json","w"), ensure_ascii=False, indent=1)
open(f"{ROOT}/kit/lines.js","w").write("// СГЕНЕРИРОВАНО tools/build_voice.py — не править руками\nwindow.TIMING = " + json.dumps(timing, ensure_ascii=False) + ";\n")
for sc in timing: print(sc, timing[sc]["duration"], "с, старт", timing[sc]["partStart"])
print("ИТОГО", round(start,2))
