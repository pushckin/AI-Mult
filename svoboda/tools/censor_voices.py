#!/usr/bin/env python3
"""Цензурные версии реплик: на интервалах мата оригинал заглушён, поверх синус 1000 Гц (0.35 от пика файла), fade 8 мс по краям.
Вход:  video/public/audio/voice_*.wav + tools/censor_words.json ({файл: [{слово,start,end}]})
Выход: out/censor/audio/<то же имя>.wav (длина, частота, каналы, формат — как у оригинала).
Запуск: python3 tools/censor_voices.py   (проверка: python3 tools/censor_voices.py --check)
"""
import json, os, sys, glob
import numpy as np
from scipy.io import wavfile

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
SRC = os.path.join(ROOT, 'video', 'public', 'audio')
DST = os.path.join(ROOT, 'out', 'censor', 'audio')
WORDS = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'censor_words.json')
FREQ, AMP_REL, FADE = 1000.0, 0.35, 0.008

def build_mask(n, sr, ivs):
    m = np.zeros(n)
    f = max(1, int(round(FADE * sr)))
    for it in ivs:
        a, b = int(round(it['start'] * sr)), int(round(it['end'] * sr))
        a, b = max(0, a), min(n, b)
        if b <= a: continue
        m[a:b] = 1.0
        # fade-in на [a-f, a), fade-out на [b, b+f)
        i0 = max(0, a - f); ramp = np.linspace(0, 1, a - i0, endpoint=False)[:a - i0] if a > i0 else np.array([])
        if len(ramp): m[i0:a] = np.maximum(m[i0:a], ramp)
        j1 = min(n, b + f); ramp = np.linspace(1, 0, j1 - b, endpoint=False)
        if len(ramp): m[b:j1] = np.maximum(m[b:j1], ramp)
    return m

def censor(x, sr, ivs):
    """x: int16 (n,) или (n,ch). Возвращает int16 той же формы."""
    xf = x.astype(np.float64)
    peak = np.max(np.abs(xf)) if xf.size else 0.0
    n = len(xf)
    m = build_mask(n, sr, ivs)
    t = np.arange(n) / sr
    tone = np.sin(2 * np.pi * FREQ * t) * AMP_REL * peak
    if xf.ndim == 2: m = m[:, None]; tone = tone[:, None]
    y = xf * (1 - m) + tone * m
    return np.clip(np.round(y), -32768, 32767).astype(np.int16), m

def main():
    words = json.load(open(WORDS))
    os.makedirs(DST, exist_ok=True)
    for p in sorted(glob.glob(os.path.join(SRC, 'voice_*.wav'))):
        name = os.path.basename(p)
        sr, x = wavfile.read(p)
        assert x.dtype == np.int16, (name, x.dtype)
        ivs = words.get(name, [])
        y, _ = censor(x, sr, ivs)
        wavfile.write(os.path.join(DST, name), sr, y)
        print(f'{name}: {len(ivs)} слов', ', '.join(f"{i['слово']} {i['start']:.2f}-{i['end']:.2f}" for i in ivs))

def check():
    """Контроль: вне интервалов сигнал равен оригиналу; внутри — синус 1 кГц с амплитудой 0.35 пика, RMS оригинала заменён."""
    words = json.load(open(WORDS)); bad = 0
    for name, ivs in words.items():
        sr, x = wavfile.read(os.path.join(SRC, name)); sr2, y = wavfile.read(os.path.join(DST, name))
        assert sr == sr2 and x.shape == y.shape and x.dtype == y.dtype, name
        xf, yf = x.astype(float), y.astype(float); peak = np.abs(xf).max()
        diff = np.abs(xf - yf) > 0.5
        f = int(FADE * sr) + 2
        inside = np.zeros(len(x), bool)
        for it in ivs:
            a, b = int(it['start'] * sr), int(it['end'] * sr); inside[a:b] = True
        near = np.convolve(inside.astype(float), np.ones(2 * f + 1), 'same') > 0
        leak = diff & ~near
        for it in ivs:
            a, b = int(it['start'] * sr) + f, int(it['end'] * sr) - f
            if b <= a: continue
            seg, ref = yf[a:b], xf[a:b]
            rms_y, rms_x = np.sqrt(np.mean(seg ** 2)), np.sqrt(np.mean(ref ** 2))
            exp = AMP_REL * peak / np.sqrt(2)
            spec = np.abs(np.fft.rfft(seg * np.hanning(len(seg)))); fpk = np.argmax(spec) * sr / len(seg)
            ok = abs(rms_y - exp) / exp < 0.03 and abs(fpk - FREQ) < 30
            bad += not ok
            print(f"{name} {it['слово']:>10} {it['start']:.2f}-{it['end']:.2f}: RMS ориг {rms_x:7.1f} -> {rms_y:7.1f} (ожид. синус {exp:7.1f}), пик спектра {fpk:6.0f} Гц  {'OK' if ok else 'FAIL'}")
        if leak.any(): print(name, 'ИЗМЕНЕНО ВНЕ интервалов:', leak.sum(), 'отсчётов'); bad += 1
        print(f'  {name}: пик {np.abs(yf).max()/32768:.3f} (оригинал {peak/32768:.3f})')
    print('ИТОГ:', 'всё OK' if not bad else f'проблем: {bad}'); return bad

if __name__ == '__main__':
    sys.exit(check() if '--check' in sys.argv else main())
