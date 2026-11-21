#!/usr/bin/env python3
"""Находит матерные слова в транскриптах Gemini (out/censor/work/*.gemini.json) и уточняет их границы по огибающей громкости.

Тайминги Gemini для TTS-озвучки часто «плывут» (ровная сетка 1 с, дрейф к концу), поэтому используются только слова (порядок),
а время берётся из аудио: слоги слов (по гласным) выравниваются на слоговые пики огибающей (DP), границы слова = провалы
огибающей между слогами соседних слов; плюс запас PAD с краёв. Результат -> tools/censor_words.json.
Запуск: python3 tools/censor_align.py [--debug]
"""
import json, re, sys, glob, os
import numpy as np
from scipy.io import wavfile
from scipy.signal import butter, sosfiltfilt, find_peaks

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
AUDIO = os.path.join(ROOT, 'video', 'public', 'audio')
WORK = os.path.join(ROOT, 'out', 'censor', 'work')
OUT = os.path.join(ROOT, 'tools', 'censor_words.json')
PAD = 0.05           # запас с краёв слова, с
HOP = 0.005          # шаг огибающей, с

# корни мата (слово целиком цензурим); мягкие слова (дегенераты, конченых, чучело, соя) не трогаем
PROF = re.compile(r'^(?:съ?|о|от|ъ?у|на|по|вы|за|до|раз|под|при|не|ни)?ъ?(?:еб|ёб|хуй|хуя|хуе|хуи|пизд|бляд|блят|бля$|жоп|пидор|пидар|мудак|мудил|говн|залуп|сука$|суки$|суку$|сучк|сучар|шлюх|ссан)')
def is_prof(w):
    w = re.sub(r'[^а-яёА-ЯЁ-]', '', w).lower()
    if not w: return False
    if w in ('небо', 'небольшой', 'нееб'): return False
    return bool(PROF.match(w)) and not w.startswith(('ебе', 'ебра', 'небо'))

def syl(w):
    return max(1, len(re.findall(r'[аеёиоуыэюя]', w.lower())))

def envelope(x, sr):
    sos = butter(4, [250, 3400], 'bandpass', fs=sr, output='sos')
    y = sosfiltfilt(sos, x)
    n = int(sr * HOP); win = int(sr * 0.02)
    k = len(y) // n
    e = np.array([np.sqrt(np.mean(y[max(0, i * n - win // 2): i * n + win // 2 + 1] ** 2) + 1e-12) for i in range(k)])
    return 20 * np.log10(e + 1e-9)

def smooth(a, m):
    return np.convolve(np.pad(a, (m, m), mode='edge'), np.ones(2 * m + 1) / (2 * m + 1), mode='valid')

def align(words, x, sr, dur):
    db = envelope(x, sr)
    sm = smooth(db, 3)
    top = np.percentile(sm, 98)
    pk, _ = find_peaks(sm, prominence=3.0, distance=int(0.07 / HOP), height=top - 30)
    sylls = []  # (word_idx, k)
    for i, w in enumerate(words):
        for k in range(syl(w)): sylls.append(i)
    S, P = len(sylls), len(pk)
    # DP: монотонное выравнивание слогов на пики; пропуск слога / пика штрафуется, позиция сравнивается с равномерным приором
    INF = 1e9
    D = np.full((S + 1, P + 1), INF); B = np.zeros((S + 1, P + 1), int)
    D[0, :] = np.arange(P + 1) * 0.6
    lo, hi = pk[0] if P else 0, pk[-1] if P else 1
    for i in range(1, S + 1):
        D[i, 0] = i * 1.0
        for j in range(1, P + 1):
            prior = abs((pk[j - 1] - lo) / max(hi - lo, 1) - (i - 0.5) / S) * 3.0
            c = [D[i - 1, j - 1] + prior, D[i - 1, j] + 1.0, D[i, j - 1] + 0.6]
            m = int(np.argmin(c)); D[i, j] = c[m]; B[i, j] = m
    i, j = S, P; match = {}
    while i > 0 and j > 0:
        m = B[i, j]
        if m == 0: match[i - 1] = pk[j - 1]; i -= 1; j -= 1
        elif m == 1: i -= 1
        else: j -= 1
    # пик первого/последнего слога слова; пропущенные слоги интерполируем по соседним
    nuc = {}
    for si, wi in enumerate(sylls):
        if si in match: nuc.setdefault(wi, []).append(match[si])
    firstlast = {}
    known = sorted(nuc)
    for wi in range(len(words)):
        if wi in nuc: firstlast[wi] = (min(nuc[wi]), max(nuc[wi]))
    # слова без найденных пиков: по доле слогов между известными соседями
    for wi in range(len(words)):
        if wi in firstlast: continue
        prev = max([k for k in known if k < wi], default=None); nxt = min([k for k in known if k > wi], default=None)
        a = firstlast[prev][1] if prev is not None else 0
        b = firstlast[nxt][0] if nxt is not None else len(db) - 1
        cnt = [syl(words[k]) for k in range(len(words)) if (prev is None or k > prev) and (nxt is None or k < nxt)]
        before = sum(syl(words[k]) for k in range(len(words)) if (prev is None or k > prev) and k < wi)
        t0 = a + (b - a) * before / sum(cnt); t1 = a + (b - a) * (before + syl(words[wi])) / sum(cnt)
        firstlast[wi] = (int(t0 + (t1 - t0) * 0.3), int(t0 + (t1 - t0) * 0.7))
    # границы: провал огибающей между последним пиком слова i и первым пиком слова i+1
    thr = top - 38
    def left_edge(p):   # идём влево от пика вниз до локального минимума/порога тишины
        k = p
        while k > 0 and sm[k - 1] <= sm[k] + 0.3 and sm[k - 1] > thr: k -= 1
        return k
    def right_edge(p):
        k = p
        while k < len(sm) - 1 and sm[k + 1] <= sm[k] + 0.3 and sm[k + 1] > thr: k += 1
        return k
    res = []
    for wi, w in enumerate(words):
        f, l = firstlast[wi]
        if wi > 0 and firstlast[wi - 1][1] < f:
            a, b = firstlast[wi - 1][1], f
            s = a + int(np.argmin(sm[a:b + 1]))
        else: s = left_edge(f)
        if wi < len(words) - 1 and firstlast[wi + 1][0] > l:
            a, b = l, firstlast[wi + 1][0]
            e = a + int(np.argmin(sm[a:b + 1]))
        else: e = right_edge(l)
        res.append((s * HOP, e * HOP))
    return res, dict(S=S, P=P)

def main():
    debug = '--debug' in sys.argv
    out = {}
    names = sorted({os.path.basename(f).split('.')[0] for f in glob.glob(os.path.join(WORK, 'voice_*.json'))})
    for name in names:
        jf = os.path.join(WORK, name + '.gemini.json')   # нет транскрипта Gemini -> слова из текста сценария (<name>.script.json)
        src = 'gemini'
        if not os.path.exists(jf): jf = os.path.join(WORK, name + '.script.json'); src = 'script'
        wavp = os.path.join(AUDIO, name + '.wav')
        sr, x = wavfile.read(wavp)
        x = x.astype(np.float64) / 32768.0
        if x.ndim > 1: x = x.mean(1)
        dur = len(x) / sr
        txt = open(jf).read().strip()
        try: g = json.loads(txt)
        except Exception: print('BAD JSON', name); continue
        words = [d['w'] for d in g]
        times, info = align(words, x, sr, dur)
        items = []
        for (w, d, (s, e)) in zip(words, g, times):
            if not is_prof(w): continue
            s2, e2 = max(0.0, s - PAD), min(dur, e + PAD)
            items.append({'слово': re.sub(r'[^\w-]', '', w), 'start': round(s2, 3), 'end': round(e2, 3), 'gemini': [d.get('s'), d.get('e')]})
        out[name + '.wav'] = items
        print(name, src, f'dur={dur:.2f} syl={info["S"]} peaks={info["P"]}', ' | '.join(f'{i["слово"]} {i["start"]:.2f}-{i["end"]:.2f} (G {i["gemini"][0]}-{i["gemini"][1]})' for i in items))
        if debug:
            print('   ', ' '.join(f'{w}[{s:.2f}-{e:.2f}]' for w, (s, e) in zip(words, times)))
    clean = {k: [{'слово': i['слово'], 'start': i['start'], 'end': i['end']} for i in v] for k, v in out.items() if v}
    json.dump(clean, open(OUT, 'w'), ensure_ascii=False, indent=1)
    print('->', OUT, sum(len(v) for v in clean.values()), 'слов')

if __name__ == '__main__': main()
