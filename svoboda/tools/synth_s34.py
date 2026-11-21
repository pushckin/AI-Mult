#!/usr/bin/env python3
"""Синтез музыки и игровых звуков сцен 3-4: music_s4_title.wav, music_s3_tension.wav, sfx_s4_wanted_star(.wav|2.wav).
Запуск: python3 svoboda/tools/synth_s34.py   (numpy, scipy). 44.1 кГц, 16 бит, стерео, пик -3 dBFS."""
from pathlib import Path
import numpy as np
from scipy.io import wavfile
from scipy.signal import butter, sosfilt, fftconvolve

SR = 44100
AUDIO = Path(__file__).resolve().parents[1] / "video" / "public" / "audio"
PEAK = 10 ** (-3 / 20)
rng = np.random.default_rng(34)
TAU = 2 * np.pi


def tt(d): return np.arange(int(round(d * SR))) / SR
def lp(x, fc, o=4): return sosfilt(butter(o, fc, 'lowpass', fs=SR, output='sos'), x, axis=0)
def hp(x, fc, o=4): return sosfilt(butter(o, fc, 'highpass', fs=SR, output='sos'), x, axis=0)
def saw(f, t): return 2 * ((f * t) % 1.0) - 1
def sq(f, t, pw=0.5): return np.where((f * t) % 1.0 < pw, 1.0, -1.0)
def env(n, a, d, s=0.0, r=0.0):
    e = np.ones(n); na = int(a * SR); nd = int(d * SR)
    e[:na] = np.linspace(0, 1, max(na, 1)) if na else 1
    if nd: e[na:na + nd] = np.linspace(1, s, nd)[:n - na]
    if na + nd < n: e[na + nd:] = s
    nr = int(r * SR)
    if nr: e[-nr:] *= np.linspace(1, 0, nr)
    return e


def echo(x, delay, fb, taps, tone=3500):
    out = x.copy(); d = int(delay * SR); cur = x
    for i in range(taps):
        cur = lp(np.concatenate([np.zeros(d), cur])[:len(x)], tone, 2) * fb
        out = out + cur
    return out


def reverb(x, sec=1.6, wet=0.3):
    n = int(sec * SR); ir = rng.standard_normal(n) * np.exp(-np.arange(n) / (sec * SR / 4.5)); ir = lp(ir, 5000, 2)
    ir /= np.abs(ir).sum() / 8
    w = fftconvolve(x, ir)[:len(x)]
    return x * (1 - wet) + w * wet


def stereo(l, r=None):
    return np.stack([l, l if r is None else r], axis=1)


def save(name, x):
    x = np.asarray(x)
    if x.ndim == 1: x = stereo(x)
    x = x / (np.abs(x).max() + 1e-9) * PEAK
    wavfile.write(AUDIO / name, SR, (x * 32767).astype(np.int16))
    print('wrote', name, round(len(x) / SR, 2), 's')


def title_hit():
    """Vice City-синтвейв: удар на чёрном экране, 3 с."""
    D = 3.0; n = int(D * SR); t = tt(D)
    out = np.zeros(n)
    # суб-бас + кик с падением частоты
    tk = t[:int(0.5 * SR)]
    kick = np.sin(TAU * np.cumsum(50 + 150 * np.exp(-tk * 30)) / SR) * np.exp(-tk * 6)
    out[:len(kick)] += kick * 1.2
    sub = np.sin(TAU * 55 * t) * np.exp(-t * 1.1) + 0.4 * np.sin(TAU * 110 * t) * np.exp(-t * 2)
    out += sub * 0.9
    # аккорд Am(add9)->пэд пилы с детюном, обрезка фильтром
    chord = np.zeros(n)
    for f in (110.0, 164.81, 220.0, 261.63, 329.63):
        for dt in (-0.004, 0.0, 0.004):
            chord += saw(f * (1 + dt), t) * 0.12
    e = np.exp(-t * 1.6); fcut = 600 + 5000 * np.exp(-t * 5)
    cf = np.zeros(n); blocks = 64
    for i in range(0, n, blocks):
        pass
    # плавающий фильтр: смесь двух lowpass по огибающей (дёшево и быстро)
    low, high = lp(chord, 700, 2), lp(chord, 6000, 2)
    m = np.exp(-t * 4)
    chord = (low * (1 - m) + high * m) * e
    out += chord
    # snare/clap на 0
    clap = hp(rng.standard_normal(n), 1200, 2) * np.exp(-t * 14) * 0.6
    out += clap
    # хвост: эхо 80-х + большой реверб
    out = echo(out, 0.375, 0.5, 4)
    out = reverb(out, 1.6, 0.28)
    out[-int(0.4 * SR):] *= np.linspace(1, 0, int(0.4 * SR))
    L = out; R = np.concatenate([np.zeros(int(0.011 * SR)), out])[:n]
    save('music_s4_title.wav', stereo(L, R))


def tension():
    """Тревожный пульс 23 с: тихо, нарастает, жёсткий обрыв."""
    D = 23.0; n = int(D * SR); t = tt(D)
    prog = (t / D) ** 1.6
    out = np.zeros(n)
    # дрон: тритон + малая секунда, медленное дрожание
    drone = (np.sin(TAU * 55 * t) + 0.6 * np.sin(TAU * 77.78 * t + 0.3 * np.sin(TAU * 0.2 * t)) + 0.4 * np.sin(TAU * 58.27 * t)) * (0.25 + 0.5 * prog)
    out += lp(drone, 400, 2) * 0.8
    # пульс: частота ударов растёт 1.1 -> 3.2 Гц
    rate = 1.1 + 2.1 * prog
    ph = np.cumsum(rate) / SR
    beat = ph % 1.0
    tb = beat / rate
    thump = np.sin(TAU * (48 + 40 * np.exp(-tb * 40)) * tb) * np.exp(-tb * 14)
    out += thump * (0.35 + 0.8 * prog)
    # высокий пискливый тремоло-кластер ближе к концу
    hi = (sq(880, t) + sq(932.3, t)) * 0.03 * np.clip((prog - 0.35) / 0.65, 0, 1) ** 2
    hi *= 0.5 + 0.5 * np.sin(TAU * (4 + 6 * prog) * t)
    out += lp(hi, 3000, 2) * 2.0
    # шорох шума
    nz = hp(lp(rng.standard_normal(n), 4000, 2), 1500, 2) * 0.02 * (0.2 + prog) * (0.5 + 0.5 * np.sin(TAU * rate * t))
    out += nz
    out = reverb(out, 1.0, 0.18)
    out *= 0.55 + 0.45 * prog  # общий нарост
    out[:int(1.0 * SR)] *= np.linspace(0, 1, int(1.0 * SR))
    out[-int(0.03 * SR):] *= np.linspace(1, 0, int(0.03 * SR))  # жёсткий обрыв
    save('music_s3_tension.wav', stereo(out, np.roll(out, 300)))


def star(n_stars=1):
    """Аркадный джингл «получена звезда розыска» (оригинальная мелодия): восходящее арпеджио + блеск."""
    notes = [(659.25, 0.0), (830.61, 0.07), (987.77, 0.14), (1318.5, 0.21), (1661.2, 0.30)]
    D = 1.3 if n_stars == 1 else 1.9; n = int(D * SR); t = tt(D); out = np.zeros(n)
    starts = [0.0] if n_stars == 1 else [0.0, 0.55]
    for s0 in starts:
        for f, st in notes:
            i0 = int((s0 + st) * SR); d = int(0.5 * SR)
            if i0 + d > n: d = n - i0
            tl = np.arange(d) / SR
            tone = sq(f, tl, 0.25) * 0.5 + np.sin(TAU * f * 2 * tl) * 0.25
            out[i0:i0 + d] += tone * np.exp(-tl * 6)
        # звонкий «звёздный» блеск
        i0 = int((s0 + 0.30) * SR); d = min(int(0.7 * SR), n - i0); tl = np.arange(d) / SR
        out[i0:i0 + d] += np.sin(TAU * 3322 * tl) * np.exp(-tl * 7) * 0.3 + np.sin(TAU * 4435 * tl) * np.exp(-tl * 9) * 0.2
    out = echo(out, 0.09, 0.35, 3, 6000)
    out = reverb(out, 0.6, 0.15)
    save('sfx_s4_wanted_star.wav' if n_stars == 1 else 'sfx_s4_wanted_star2.wav', out)


if __name__ == '__main__':
    title_hit(); tension(); star(1); star(2)
