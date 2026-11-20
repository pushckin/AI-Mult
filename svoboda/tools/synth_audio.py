#!/usr/bin/env python3
"""Процедурная генерация звука сцены 1 (SFX + music_s1) без внешних API.
Запуск:  python3 svoboda/tools/synth_audio.py   (нужны numpy, scipy)
Результат: svoboda/video/public/audio/{sfx_*.wav, music_s1.wav}  и  svoboda/out/s1_audio_preview.wav
Все файлы 44.1 кГц, 16 бит, стерео, пик около -3 dBFS.
"""
import re
from pathlib import Path

import numpy as np
from scipy.io import wavfile
from scipy.signal import butter, sosfilt, fftconvolve, resample_poly

SR = 44100
ROOT = Path(__file__).resolve().parents[1]
AUDIO = ROOT / "video" / "public" / "audio"
OUT = ROOT / "out"
SCENE_TS = ROOT / "video" / "src" / "data" / "scene1.ts"
PEAK = 10 ** (-3 / 20)
rng = np.random.default_rng(1126)
TAU = 2 * np.pi


# ------------------------------------------------------------------ helpers
def tt(d):
    return np.arange(int(round(d * SR))) / SR


def noise(n):
    return rng.standard_normal(n)


def filt(x, kind, fc, order=4):
    if kind in ("bandpass", "bandstop"):
        fc = [min(fc[0], SR * 0.47), min(fc[1], SR * 0.47)]
    else:
        fc = min(fc, SR * 0.47)
    sos = butter(order, fc, btype=kind, fs=SR, output="sos")
    return sosfilt(sos, x, axis=0)


def lp(x, fc, o=4):
    return filt(x, "lowpass", fc, o)


def hp(x, fc, o=4):
    return filt(x, "highpass", fc, o)


def bp(x, lo, hi, o=3):
    return filt(x, "bandpass", (lo, hi), o)


def svf(x, fc, q=0.7, mode="band"):
    """Перестраиваемый фильтр (Chamberlin SVF); fc скаляр или массив."""
    n = len(x)
    fc = np.broadcast_to(np.asarray(fc, float), (n,))
    f = (2 * np.sin(np.pi * np.minimum(fc, SR * 0.2) / SR)).tolist()
    xs = x.tolist()
    low = band = 0.0
    out = [0.0] * n
    for i in range(n):
        low += f[i] * band
        high = xs[i] - low - q * band
        band += f[i] * high
        out[i] = band if mode == "band" else (low if mode == "low" else high)
    return np.array(out)


def ex(t, tau):
    return np.exp(-np.maximum(t, 0) / tau)


def gate_at(n, t0, x):
    """Положить моно/стерео x в буфер длины n со сдвигом t0 секунд."""
    out = np.zeros((n,) + x.shape[1:])
    i = int(round(t0 * SR))
    if i >= n:
        return out
    m = min(len(x), n - i)
    out[i:i + m] = x[:m]
    return out


def add(buf, x, t0, g=1.0):
    i = int(round(t0 * SR))
    if i >= len(buf) or i + len(x) <= 0:
        return
    a = max(0, -i)
    m = min(len(x) - a, len(buf) - max(i, 0))
    buf[max(i, 0):max(i, 0) + m] += g * x[a:a + m]


def pan(x, p):
    p = np.clip(np.asarray(p, float), -1, 1)
    th = (p + 1) * np.pi / 4
    return np.stack([x * np.cos(th), x * np.sin(th)], axis=-1)


def st(x):
    return np.stack([x, x], axis=-1) if x.ndim == 1 else x


def widen(x, d=0.0007):
    """Псевдо-стерео: небольшая задержка одного канала."""
    s = int(d * SR)
    r = np.concatenate([np.zeros(s), x[:len(x) - s]]) if s else x
    return np.stack([x, r], axis=-1)


def reverb(x, rt60=0.6, wet=0.3, lpf=6000, pre=0.0, flat=None):
    """Шумовая свёртка. flat=сек: «gated reverb» (плоский хвост, затем обрыв)."""
    x = st(x)
    n = int((rt60 + pre) * SR)
    t = np.arange(n) / SR
    env = np.where(t >= pre, np.exp(-6.9 * np.maximum(t - pre, 0) / rt60), 0)
    if flat:
        env = np.where(t >= pre, np.where(t < pre + flat, 1.0, 0.0) * np.exp(-1.5 * (t - pre) / flat), 0)
    ir = np.stack([noise(n), noise(n)], axis=-1) * env[:, None]
    ir = lp(ir, lpf, 2)
    ir /= np.sqrt((ir ** 2).sum()) + 1e-9
    out = np.stack([fftconvolve(x[:, c], ir[:, c]) for c in range(2)], axis=-1)[: len(x)]
    return x + wet * out


def fade(x, a=0.0, b=0.0):
    x = x.copy()
    na, nb = int(a * SR), int(b * SR)
    if na:
        x[:na] *= (np.linspace(0, 1, na) ** 1)[:, None] if x.ndim == 2 else np.linspace(0, 1, na)
    if nb:
        r = np.linspace(1, 0, nb)
        x[-nb:] *= r[:, None] if x.ndim == 2 else r
    return x


def sat(x, d=1.0):
    return np.tanh(x * d) / np.tanh(d)


def save(name, x, loop=False, peak=PEAK):
    x = st(x)
    if not loop:
        x = fade(x, 0.0, 0.004)
    x = x - x.mean(axis=0, keepdims=True) if not loop else x
    m = np.abs(x).max()
    x = x * (peak / m)
    AUDIO.mkdir(parents=True, exist_ok=True)
    wavfile.write(AUDIO / f"{name}.wav", SR, (np.clip(x, -1, 1) * 32767).astype(np.int16))
    print(f"{name}.wav  {len(x) / SR:.3f} s")
    return x


def circ_conv(x, ir):
    n = len(x)
    return np.fft.irfft(np.fft.rfft(x) * np.fft.rfft(ir, n), n)


# ------------------------------------------------------------------ SFX
def sfx_siren():
    """Loop 4 с: полицейская «вейл» (слева) + скорая hi-lo (справа), дальняя."""
    n = 4 * SR
    t = np.arange(n) / SR
    # вейл: период 2 с, интеграл частоты по 4 с даёт целое число циклов => бесшовно
    f = 950 + 380 * np.sin(TAU * t / 2.0 - np.pi / 2)
    ph = TAU * np.cumsum(f) / SR
    ph -= 0  # цикл замкнут: 950*4 целое, синус интегрируется в 0
    pol = sat(np.sin(ph) + 0.35 * np.sin(2 * ph) + 0.2 * np.sin(3 * ph), 1.6)
    # скорая: 960/770 Гц по 0.5 с (фаза непрерывна, целое число циклов)
    seg = (t // 0.5).astype(int) % 2
    f2 = np.where(seg == 0, 960.0, 770.0)
    ph2 = TAU * np.cumsum(f2) / SR
    amb = sat(np.sin(ph2) + 0.5 * np.sin(2 * ph2) + 0.25 * np.sin(3 * ph2), 1.4)
    amb *= 0.8 + 0.2 * np.abs(np.sin(np.pi * t / 0.5))
    # «дальность»: смягчение + короткое эхо улицы с оборачиванием
    ir = np.zeros(n)
    for d, g in [(0.0, 1.0), (0.11, 0.35), (0.23, 0.2), (0.41, 0.1)]:
        ir[int(d * SR)] += g
    def lpc(x, fc):  # фильтр без шва: фильтруем 3 копии, берём среднюю
        return lp(np.tile(x, 3), fc, 2)[n:2 * n]
    pol = circ_conv(lpc(pol, 3200), ir)
    amb = circ_conv(lpc(amb, 2800), ir)
    L = pol * 0.9 + amb * 0.35
    R = pol * 0.35 + amb * 0.8
    return np.stack([L, R], axis=-1)


def sfx_engine_roar():
    """1.6 с: проезд суперкара V8, разгон + доплер."""
    d = 1.6
    t = tt(d)
    tc = 0.9
    rev = 55 + 95 * (t / d) ** 0.9
    doppler = 1 + 0.13 * np.tanh((tc - t) / 0.13)
    f0 = rev * doppler
    ph = TAU * np.cumsum(f0) / SR
    sig = np.zeros_like(t)
    for k in range(1, 36):
        a = 1.0 / k ** 0.85 * (1 + 0.6 * np.sin(k * 0.9))  # формантные бугры
        sig += a * np.sin(k * ph + k * 0.37)
    sig *= 1 + 0.45 * np.sin(ph / 2 + 0.5) * np.sin(ph / 4)  # неровность выхлопа
    sig = sat(sig * 0.5, 2.2)
    crack = lp(noise(len(t)), 2500, 2) * (np.sign(np.sin(ph / 2)) * 0.5 + 0.5) * 0.35
    air = lp(noise(len(t)), 1600, 2) * 0.25
    x = sat(sig + crack + air, 1.3)
    amp = 0.22 + 0.78 * np.exp(-(((t - tc) / 0.42) ** 2))
    x = x * amp
    x = fade(x, 0.03, 0.12)
    return pan(x, 0.85 * np.tanh((t - tc) / 0.35))


def sfx_rocket_whoosh():
    """2.0 с: свист ракеты — полоса шума с пролётом + тонкий двигатель."""
    d = 2.0
    t = tt(d)
    tc = 1.0
    g = np.exp(-(((t - tc) / 0.5) ** 2))
    fc = 450 + 3800 * g
    n1 = svf(noise(len(t)), fc, q=0.45, mode="band")
    hiss = hp(noise(len(t)), 5000, 2) * (0.04 + 0.2 * g)
    rumble = lp(noise(len(t)), 260, 2) * (0.3 + 1.2 * g)
    f0 = 210 * (1 + 0.18 * np.tanh((tc - t) / 0.2)) * (1 + 0.1 * t)
    ph = TAU * np.cumsum(f0) / SR
    tone = lp(np.sign(np.sin(ph)) * 0.5 + np.sin(ph), 1800, 2) * 0.25 * g
    x = 3.0 * n1 * (0.1 + g) + hiss + rumble + tone
    x = x / (np.abs(x).max() + 1e-9)
    x = fade(x, 0.08, 0.3)
    return pan(x, 0.9 * np.tanh((t - tc) / 0.4))


def sfx_explosion_far():
    """3.0 с: далёкие взрывы — глухой бум + раскат, затем второй хлопок."""
    d = 3.0
    n = int(d * SR)
    t = np.arange(n) / SR
    out = np.zeros((n, 2))

    def boom(g, seed_shift):
        tb = tt(2.6)
        f = 28 + 70 * ex(tb, 0.25)
        body = np.sin(TAU * np.cumsum(f) / SR) * ex(tb, 0.55)
        nz = np.stack([lp(noise(len(tb)), 420, 3), lp(noise(len(tb)), 380, 3)], axis=-1)
        nz *= (ex(tb, 0.75) * (1 - np.exp(-tb / 0.012)))[:, None]
        roll = lp(noise(len(tb)), 140, 2) * ex(tb, 1.1) * (1 - np.exp(-tb / 0.08))
        crack = lp(hp(noise(len(tb)), 300, 2), 1800, 2) * ex(tb, 0.08) * 0.5
        s = body[:, None] * 0.9 + nz * 1.1 + roll[:, None] * 0.9 + crack[:, None]
        s = lp(s, 1500, 2)  # расстояние
        add(out, s, seed_shift, g)

    boom(1.0, 0.0)
    boom(0.45, 0.85)
    boom(0.25, 1.5)
    out = reverb(out, 1.4, 0.35, 1800)
    return fade(out, 0.0, 0.25)


def sfx_crunch_hit():
    """1.6 с: сочный хруст удара (металл + стекло + кость-хрящ), басовый бум в начале."""
    d = 1.6
    n = int(d * SR)
    t = np.arange(n) / SR
    out = np.zeros((n, 2))
    # транзиент
    tr = hp(noise(n), 200, 2) * ex(t, 0.012)
    out += widen(tr, 0.0004) * 1.2
    # металл: неравномерные парциалы
    for fr, tau, a in [(310, .25, .5), (523, .2, .45), (887, .16, .4), (1290, .12, .3), (1871, .09, .25), (2640, .07, .2)]:
        fr *= 1 + 0.01 * rng.standard_normal()
        s = np.sin(TAU * fr * t * (1 + 0.03 * ex(t, .05))) * ex(t, tau) * a
        out += pan(s, rng.uniform(-.4, .4))
    # хруст: зёрна шума
    cr = np.zeros(n)
    for _ in range(34):
        t0 = rng.uniform(0.0, 0.38) ** 1.3
        lo = rng.uniform(600, 2500)
        gr = bp(noise(int(0.04 * SR)), lo, lo * rng.uniform(1.8, 3.2), 2) * ex(np.arange(int(0.04 * SR)) / SR, rng.uniform(.004, .012))
        add(cr, gr, t0, rng.uniform(.35, 1.0) * (1.2 - t0))
    out += widen(cr * 2.2, 0.0009)
    # звон осколков
    gl = np.zeros(n)
    for _ in range(22):
        t0 = rng.uniform(0.06, 0.9)
        fr = rng.uniform(4500, 9500)
        k = tt(0.05)
        add(gl, np.sin(TAU * fr * k) * ex(k, rng.uniform(.006, .02)), t0, rng.uniform(.1, .35))
    out += widen(gl, 0.0013) * 0.7
    # тело (удар по низам)
    f = 45 + 100 * ex(t, 0.05)
    out += (np.sin(TAU * np.cumsum(f) / SR) * ex(t, 0.16) * 1.4)[:, None]
    out = sat(out, 1.2)
    out = reverb(out, 0.5, 0.18, 7000)
    return fade(out, 0, 0.15)


def sfx_bass_drop():
    """2.5 с: бас-дроп (синус-свип вниз + саб), насыщение."""
    d = 2.5
    t = tt(d)
    f = 34 + 120 * ex(t, 0.11)
    s = np.sin(TAU * np.cumsum(f) / SR)
    sub = np.sin(TAU * 31 * t) * 0.6
    env = (1 - np.exp(-t / 0.004)) * (0.6 * ex(t, 0.22) + 0.4 * ex(t, 0.9))
    x = sat((s + sub) * env * 1.8, 1.8)
    x += lp(noise(len(t)), 220, 2) * ex(t, 0.07) * 0.9
    x += np.sin(TAU * 62 * t + 1) * ex(t, 0.5) * 0.35
    return fade(widen(x, 0.0002), 0, 0.3)


def sfx_slowmo_hum():
    """5.4 с: гул замедленного времени — плывущий дрон, пульсация, «втягивающий» свип."""
    d = 5.4
    t = tt(d)
    drift = 1 - 0.16 * (1 - np.exp(-t / 0.7))  # питч уходит вниз в начале (слоу-мо)
    x = np.zeros_like(t)
    for f0, a in [(55, 1.0), (82.4, .5), (110.5, .55), (165.2, .25), (220.8, .18)]:
        ph = TAU * np.cumsum(f0 * drift) / SR
        x += a * (np.sin(ph) + 0.25 * np.sin(2 * ph))
    for dt in (-0.7, 0.9):  # биения
        x += 0.45 * np.sin(TAU * np.cumsum(110 * drift + dt) / SR)
    x *= 0.65 + 0.35 * np.sin(TAU * 0.8 * t - 1.0)  # медленная пульсация
    swirl = svf(noise(len(t)), 260 + 220 * np.sin(TAU * 0.35 * t) + 120 * t, q=0.3, mode="band") * 1.4
    sweep_n = svf(noise(len(t)), 3500 * np.exp(-t / 0.35) + 150, q=0.4, mode="band") * ex(t, 0.45) * 1.8
    beat = np.zeros_like(t)
    for tb in np.arange(0.3, d, 1.25):  # «сердце» в замедлении
        k = tt(0.5)
        add(beat, np.sin(TAU * np.cumsum(70 * ex(k, .08) + 38) / SR) * ex(k, .1), tb, .5)
    x = sat(0.45 * x + swirl + sweep_n + beat, 1.2)
    x = fade(x, 0.02, 0.35)
    s = widen(x, 0.0012)
    return s


def sfx_body_thud():
    """1.2 с: глухой удар тела об асфальт + два затухающих подскока."""
    d = 1.2
    t = tt(d)
    n = len(t)
    out = np.zeros((n, 2))
    f = 42 + 70 * ex(t, 0.04)
    out += (np.sin(TAU * np.cumsum(f) / SR) * ex(t, 0.13) * 1.5)[:, None]
    out += widen(lp(noise(n), 520, 3) * ex(t, 0.04) * 1.4, 0.0005)
    out += widen(bp(noise(n), 900, 3200, 2) * ex(t, 0.012) * 0.9, 0.0007)  # шлепок ткани/кожи
    for t0, g in [(0.2, .38), (0.34, .17), (0.44, .07)]:
        k = tt(0.25)
        add(out, st(np.sin(TAU * np.cumsum(38 + 40 * ex(k, .05)) / SR) * ex(k, .07) * g * 1.6
                    + lp(noise(len(k)), 400, 2) * ex(k, .03) * g), t0)
    scr = lp(hp(noise(n), 500, 2), 2200, 2) * np.clip(t - 0.06, 0, None) * ex(t - 0.06, 0.18) * 1.5
    out += widen(scr, 0.001) * 0.25
    out = sat(out, 1.3)
    out = reverb(out, 0.35, 0.12, 3000)
    return out


def sfx_digital_click():
    """0.6 с: щелчок билборда — клик + два бипа + цифровая рябь."""
    d = 0.6
    t = tt(d)
    n = len(t)
    x = np.zeros(n)
    x += hp(noise(n), 2500, 2) * ex(t, 0.004) * 1.4
    x += np.sin(TAU * 140 * t) * ex(t, 0.02) * 0.7
    for t0, fr in [(0.025, 1760), (0.075, 2640), (0.13, 1320)]:
        k = tt(0.04)
        sq = np.sign(np.sin(TAU * fr * k)) * 0.5 + 0.5 * np.sin(TAU * fr * k)
        add(x, sq * np.hanning(len(k)) ** 0.5, t0, 0.45)
    # цифровая рябь: sample&hold шум
    k = tt(0.16)
    hold = np.repeat(rng.uniform(-1, 1, len(k) // 24 + 1), 24)[: len(k)]
    add(x, hold * ex(k, 0.04), 0.03, 0.4)
    add(x, hp(noise(40), 4000, 2) * 1.0, 0.2, 0.5)  # реле
    x = reverb(widen(x, 0.0006), 0.25, 0.1, 8000)
    return fade(x, 0, 0.1)


def sfx_unplug():
    """1.2 с: выдёргивание вилки из розетки + искры + затухающий гул питания."""
    d = 1.2
    t = tt(d)
    n = len(t)
    out = np.zeros((n, 2))
    # пластик-вилка: скрип/«зип» и клац
    zip_ = bp(noise(n), 1800, 5200, 2) * np.where(t < 0.07, 1, 0) * (0.6 + 0.4 * np.sign(np.sin(TAU * 230 * t)))
    out += widen(zip_ * 0.7, 0.0006)
    out += (np.sin(TAU * np.cumsum(70 + 220 * ex(t, 0.02)) / SR) * ex(t, 0.05) * 1.4)[:, None]
    out += widen(hp(noise(n), 1500, 2) * np.where((t > 0.065) & (t < 0.075), 1, 0) * 1.5, 0.0004)  # «поп»
    # искра/дуга
    sp = np.zeros(n)
    for _ in range(26):
        t0 = 0.07 + rng.uniform(0, 0.4) ** 1.5
        add(sp, hp(noise(60), 2500, 2) * ex(np.arange(60) / SR, 0.0012), t0, rng.uniform(.3, 1))
    out += widen(sp * 1.4, 0.0011)
    # падающий вой блока питания: частота ухает вниз
    k = t - 0.07
    f = 55 + 2400 * ex(k, 0.13)
    ph = TAU * np.cumsum(np.where(k > 0, f, 0)) / SR
    wh = (np.sin(ph) + 0.5 * np.sign(np.sin(ph)) * 0.3) * ex(k, 0.22) * (k > 0)
    out += widen(lp(wh, 4000, 2) * 0.9, 0.0008)
    # гул сети 50 Гц, затухает за ~0.6 c
    hum = sum(np.sin(TAU * 50 * h * t + h) / h for h in (1, 2, 3, 5)) * ex(k, 0.18) * (k > 0)
    out += (hum * 0.5)[:, None]
    # последний тихий «тик» остывания
    add(out, st(hp(noise(100), 3000, 2) * ex(np.arange(100) / SR, 0.002)), 0.55, 0.25)
    out = sat(out, 1.2)
    out = reverb(out, 0.3, 0.1, 6000)
    return fade(out, 0, 0.35)


def sfx_glitch():
    """0.34 с: пиксельный глитч-«стирание»: биткраш, заикание, обрыв."""
    d = 0.34
    n = int(d * SR)
    x = np.zeros(n)
    i = 0
    last = None
    while i < n:
        L = int(rng.uniform(0.006, 0.026) * SR)
        kind = rng.choice(["noise", "tone", "stutter", "dead"], p=[.3, .35, .22, .13])
        k = np.arange(L) / SR
        if kind == "noise":
            seg = np.repeat(rng.uniform(-1, 1, L // int(rng.integers(6, 30)) + 2), 30)[:L]
        elif kind == "tone":
            fr = rng.choice([220, 440, 880, 1760, 3520, 2093])
            seg = np.sign(np.sin(TAU * fr * k)) * 0.8
        elif kind == "stutter" and last is not None:
            seg = np.resize(last, L)
        else:
            seg = np.zeros(L)
        seg = np.resize(seg, L)
        x[i:i + L] = seg[: n - i]
        last = seg[: max(4, L // 3)] if len(seg) else last
        i += L
    # убывающая цифровая «лесенка» + биткраш
    t = np.arange(n) / SR
    x = np.round(x * 4) / 4
    x *= 1 - (t / d) ** 2 * 0.5
    hold = 5
    x = np.repeat(x[::hold], hold)[:n]
    x = hp(x, 120, 2)
    tail = int(0.012 * SR)
    x[-tail:] *= np.linspace(1, 0, tail)
    return reverb(widen(x * 0.9, 0.0009), 0.12, 0.05, 6000)[:n]


def sfx_crickets():
    """Loop 8 с: ночные сверчки (6 штук) + слабый ветер; бесшовный."""
    d = 8
    n = d * SR
    out = np.zeros((n, 2))
    for k, f0, npulse, sp, pl in [(14, 4350, 4, .030, .018), (17, 4620, 3, .034, .020), (19, 4880, 5, .027, .016),
                                  (12, 4180, 3, .036, .022), (16, 5050, 4, .031, .017), (21, 4480, 3, .029, .019)]:
        period = d / k
        off = rng.uniform(0, period)
        p = rng.uniform(-.9, .9)
        amp = rng.uniform(.5, 1.0)
        pul = tt(pl)
        pulse = np.sin(TAU * f0 * pul) * np.hanning(len(pul)) ** 1.2
        pulse += 0.25 * np.sin(TAU * f0 * 2 * pul) * np.hanning(len(pul))
        st_p = pan(pulse, p)
        for c in range(k):
            for q in range(npulse):
                i = int((off + c * period + q * sp) * SR)
                g = amp * (0.85 + 0.15 * q / npulse)
                idx = (np.arange(len(pulse)) + i) % n
                out[idx] += st_p * g
    # ветер: периодический шум через случайные фазы спектра
    fr = np.fft.rfftfreq(n, 1 / SR)
    spec = np.exp(1j * rng.uniform(0, TAU, len(fr))) * (1 / (1 + (fr / 300) ** 2)) * (fr > 40)
    wind = np.fft.irfft(spec, n)
    wind /= np.abs(wind).max()
    out += 0.05 * np.stack([wind, np.roll(wind, 4000)], axis=-1) * 5 * 0.2
    return out


def sfx_water_drip():
    """Loop 6 с: капли в пустой улице/подземке, с эхом; бесшовный."""
    d = 6
    n = d * SR
    x = np.zeros(n)
    for t0, f0, g in [(0.35, 1050, 1.0), (1.9, 870, .85), (3.05, 1250, .7), (3.5, 1500, .45), (4.95, 980, .95)]:
        k = tt(0.35)
        f = f0 * (1 + 2.2 * (1 - np.exp(-k / 0.018)))  # пузырь: частота растёт
        s = np.sin(TAU * np.cumsum(f) / SR) * ex(k, 0.045) * (1 - np.exp(-k / 0.0015))
        s += hp(noise(len(k)), 3000, 2) * ex(k, 0.002) * 0.6  # «тик» удара
        i = int(t0 * SR)
        x[(np.arange(len(s)) + i) % n] += g * s
    ir = np.zeros(n)
    ir[0] = 1
    for dly, g in [(0.19, .38), (0.37, .24), (0.58, .14), (0.83, .08)]:
        ir[int(dly * SR)] += g
    tail = lp(noise(int(1.2 * SR)), 2500, 2) * ex(tt(1.2), 0.35) * 0.05
    ir[: len(tail)] += tail
    y = circ_conv(x, ir)
    yr = circ_conv(x, np.roll(ir, int(0.013 * SR)))
    return np.stack([y, yr * 0.9], axis=-1)


def sfx_bone_crack():
    """1.2 с: хруст вправляемого плеча — зернистый скрежет, глухой «клац» и мокрый поп."""
    d = 1.2
    n = int(d * SR)
    t = np.arange(n) / SR
    out = np.zeros((n, 2))

    def pop(t0, lo, hi, g, tau=0.006, body=None):
        k = tt(0.12)
        s = bp(noise(len(k)), lo, hi, 2) * ex(k, tau)
        if body:
            s += np.sin(TAU * np.cumsum(body * (1 + .5 * ex(k, .02))) / SR) * ex(k, 0.03) * 0.9
        add(out, widen(s, 0.0006), t0, g)

    pop(0.0, 1500, 4500, 1.5, 0.005, 320)
    cr = np.zeros(n)
    for _ in range(16):
        t0 = rng.uniform(0.02, 0.22)
        lo = rng.uniform(800, 2400)
        gr = bp(noise(int(0.03 * SR)), lo, lo * 2.4, 2) * ex(np.arange(int(0.03 * SR)) / SR, rng.uniform(.003, .008))
        add(cr, gr, t0, rng.uniform(.3, .9))
    out += widen(cr * 2.0, 0.0008)
    pop(0.24, 350, 2200, 2.2, 0.012, 170)  # «клац» на место
    k = tt(0.3)
    add(out, st(np.sin(TAU * np.cumsum(95 * ex(k, .06) + 55) / SR) * ex(k, .09) * 1.3), 0.24)
    pop(0.34, 1000, 3000, 0.7, 0.008, 260)  # мокрый хрящ
    pop(0.55, 2000, 5000, 0.28, 0.004)
    out = sat(out, 1.2)
    out = reverb(out, 0.3, 0.14, 5000)
    return fade(out, 0, 0.1)


def sfx_spit():
    """0.55 с: плевок «пчту» + капельки и шлёпок на асфальт."""
    d = 0.55
    n = int(d * SR)
    t = np.arange(n) / SR
    wet = 0.55 + 0.45 * lp(noise(n), 90, 2) * 6
    wet = np.clip(wet, 0, 1.4)
    air = bp(noise(n), 2800, 7500, 2) * (1 - np.exp(-t / 0.006)) * ex(t, 0.045) * wet * 1.6
    plos = np.sin(TAU * np.cumsum(220 * ex(t, 0.012) + 90) / SR) * ex(t, 0.014) * 1.1
    mid = bp(noise(n), 700, 2000, 2) * ex(t, 0.02) * 0.5
    x = air + plos + mid
    for t0, f0, g in [(0.10, 1700, .5), (0.17, 2200, .4), (0.25, 1500, .3), (0.31, 2500, .22)]:
        k = tt(0.07)
        add(x, np.sin(TAU * np.cumsum(f0 * (1 + 1.4 * (1 - np.exp(-k / .01)))) / SR) * ex(k, 0.015), t0, g)
    k = tt(0.1)
    add(x, bp(noise(len(k)), 300, 2200, 2) * ex(k, 0.012) * 1.1, 0.36, 0.5)  # шлёп
    x = reverb(widen(x, 0.0006), 0.2, 0.08, 6000)
    return fade(x, 0, 0.08)


def sfx_tooth_ping():
    """0.9 с: звон зуба о асфальт — несколько затухающих отскоков с высокими парциалами."""
    d = 0.9
    n = int(d * SR)
    out = np.zeros((n, 2))
    for t0, g in [(0.0, 1.0), (0.105, .55), (0.185, .3), (0.245, .17), (0.285, .09), (0.31, .05)]:
        k = tt(0.5)
        s = hp(noise(len(k)), 3500, 2) * ex(k, 0.0015) * 0.9
        for fr, tau, a in [(3150, .09, 1.0), (4820, .06, .6), (7600, .04, .35), (1780, .13, .5)]:
            fr *= 1 + 0.02 * rng.standard_normal()
            s += np.sin(TAU * fr * k) * ex(k, tau * (0.6 + g * .5)) * a
        add(out, pan(s, rng.uniform(-.2, .2)), t0, g)
    out = reverb(out, 0.5, 0.18, 9000, pre=0.01)
    return fade(out, 0, 0.1)


# ------------------------------------------------------------------ MUSIC
BPM = 110
STEP = 60 / BPM / 4
BAR = STEP * 16
MUSIC_LEN = 19.0


def saw_add(f, n, maxf=6000.0, ph=0.0):
    t = np.arange(n) / SR
    out = np.zeros(n)
    k = 1
    while k * f < maxf and k < 90:
        out += np.sin(TAU * k * f * t + k * ph) / k
        k += 1
    return out * (2 / np.pi)


def pulse_add(f, n, w=0.3, maxf=7000.0):
    return saw_add(f, n, maxf) - saw_add(f, n, maxf, -TAU * w)


def naive_saw(f, n, ph0=0.0):
    ph = (ph0 + f * np.arange(n) / SR) % 1.0
    return ph * 2 - 1


def adsr_note(n, a, d_tau, sus, rel_n):
    t = np.arange(n) / SR
    env = np.minimum(1, t / a) * (sus + (1 - sus) * np.exp(-t / d_tau))
    if rel_n:
        env[-rel_n:] *= np.linspace(1, 0, rel_n)
    return env


def music_s1():
    total = MUSIC_LEN + 0.6
    n = int(total * SR)
    nsteps = int(total / STEP) + 2
    bass = np.zeros(n)
    pad = np.zeros((n, 2))
    arp = np.zeros((n, 2))
    lead = np.zeros((n, 2))
    drums = np.zeros((n, 2))
    kicks = np.zeros(n)

    chords = {  # корень баса, аккорд пэда, арпеджио
        "Am": (110.00, [220.0, 261.63, 329.63, 440.0], [440.0, 523.25, 659.25, 880.0]),
        "F": (87.31, [174.61, 220.0, 261.63, 349.23], [349.23, 440.0, 523.25, 698.46]),
        "Dm": (73.42, [146.83, 174.61, 220.0, 293.66], [293.66, 349.23, 440.0, 587.33]),
        "E": (82.41, [164.81, 207.65, 246.94, 329.63], [329.63, 415.30, 493.88, 659.25]),
    }
    prog = ["Am", "F", "Dm", "E"]
    nbars = int(total / BAR) + 1

    # ---- пэд (накладывается с атакой, держится такт)
    for b in range(nbars):
        name = prog[b % 4]
        _, pc, _ = chords[name]
        L = int((BAR + 0.15) * SR)
        env = adsr_note(L, 0.35, 1.0, 0.85, int(0.25 * SR))
        for fr in pc:
            for det, p in [(-9, -0.6), (-3, -0.25), (4, 0.25), (10, 0.6)]:
                fd = fr * 2 ** (det / 1200)
                s = naive_saw(fd, L, rng.uniform())
                add(pad, pan(lp(s, 1700, 2) * env, p), b * BAR, 0.075)

    # ---- бас, 16-е: корень/октава
    pat = ["r", "r", "o", "r", "r", "o", "r", "r", "r", "r", "o", "r", "r", "o", "f", "o"]
    for s_i in range(nsteps):
        t0 = s_i * STEP
        if t0 >= total:
            break
        b, st_i = divmod(s_i, 16)
        root = chords[prog[b % 4]][0]
        m = {"r": root, "o": root * 2, "f": root * 1.498}[pat[st_i]]
        L = int(STEP * 0.95 * SR)
        env = adsr_note(L, 0.003, 0.35, 0.75, int(0.012 * SR))
        bright = np.exp(-np.arange(L) / SR / 0.07)
        s = saw_add(m, L, 700) + 0.9 * bright * saw_add(m, L, 2600) + 0.7 * np.sin(TAU * root * np.arange(L) / SR)
        add(bass, s * env, t0, 0.5 * (0.6 if b < 1 and st_i % 4 else 1.0))

    # ---- арпеджио (со 3-го такта) + пинг-понг дилей
    ap = [0, 1, 2, 3, 2, 1, 2, 3, 0, 1, 2, 3, 2, 1, 3, 2]
    for s_i in range(nsteps):
        t0 = s_i * STEP
        b, st_i = divmod(s_i, 16)
        if t0 >= total or b < 2:
            continue
        fr = chords[prog[b % 4]][2][ap[st_i]]
        L = int(STEP * 1.1 * SR)
        env = adsr_note(L, 0.002, 0.07, 0.15, int(0.01 * SR))
        s = pulse_add(fr, L, 0.28, 5000) * env
        add(arp, pan(s, -0.25 if st_i % 2 else 0.25), t0, 0.16 + 0.04 * min(b - 2, 4) / 4)
    d = int(3 * STEP * SR)
    for rep, g in [(1, .45), (2, .28), (3, .17)]:
        sh = d * rep
        dl = lp(arp[:-sh], 3200, 2) * g
        arp[sh:, 0] += dl[:, 1]
        arp[sh:, 1] += dl[:, 0]

    # ---- лид-тревога (с 5-го такта): мотив + тритон
    for b in range(4, nbars):
        name = prog[b % 4]
        a = chords[name][2]
        for st_i, ln, fr in [(0, 3, a[3]), (6, 2, a[2]), (10, 2, a[3]), (14, 2, chords[name][2][0] * 2 * 2 ** (6 / 12))]:
            t0 = b * BAR + st_i * STEP
            if t0 >= total:
                continue
            L = int(ln * STEP * SR)
            env = adsr_note(L, 0.004, 0.25, 0.55, int(0.03 * SR))
            vib = 1 + 0.004 * np.sin(TAU * 5.5 * np.arange(L) / SR) * np.minimum(1, np.arange(L) / SR / 0.15)
            s = lp(naive_saw(fr, L) * 0.7 + np.sign(np.sin(TAU * np.cumsum(fr * vib) / SR)) * 0.3, 4500, 2) * env
            add(lead, pan(s, 0.15), t0, 0.2)

    # ---- ударные
    def kick(t0, g=1.0):
        k = tt(0.35)
        f = 48 + 110 * ex(k, 0.03)
        s = np.sin(TAU * np.cumsum(f) / SR) * ex(k, 0.13) * (1 - np.exp(-k / 0.001))
        s += hp(noise(len(k)), 1500, 2) * ex(k, 0.003) * 0.4
        add(drums, st(s * 1.4), t0, g)
        add(kicks, np.ones(int(0.01 * SR)), t0)

    def snare(t0, g=1.0):
        k = tt(0.35)
        body = np.sin(TAU * np.cumsum(185 + 80 * ex(k, .02)) / SR) * ex(k, 0.07) * 0.7
        nz = bp(noise(len(k)), 1200, 9000, 2) * ex(k, 0.09)
        s = st(body + nz * 1.0)
        s = reverb(s, 0.3, 0.9, 7000, flat=0.2)  # gated reverb
        add(drums, s, t0, 0.9 * g)

    def hat(t0, g=0.5, open_=False):
        k = tt(0.25 if open_ else 0.05)
        s = hp(noise(len(k)), 7500, 2) * ex(k, 0.12 if open_ else 0.012)
        add(drums, pan(s, 0.35), t0, g * 0.5)

    def tom(t0, f0, g=0.8):
        k = tt(0.3)
        s = np.sin(TAU * np.cumsum(f0 * (1 + 0.8 * ex(k, 0.03))) / SR) * ex(k, 0.11)
        s += bp(noise(len(k)), 600, 3000, 2) * ex(k, 0.01) * 0.4
        add(drums, pan(s, rng.uniform(-.4, .4)), t0, g)

    def crash(t0, g=.6):
        k = tt(1.4)
        s = hp(noise(len(k)), 4500, 2) * ex(k, 0.5) * (1 - np.exp(-k / 0.003))
        add(drums, widen(s, 0.0012), t0, g * 0.6)

    for s_i in range(nsteps):
        t0 = s_i * STEP
        if t0 >= total:
            break
        b, st_i = divmod(s_i, 16)
        if b >= 1 and st_i % 4 == 0:
            kick(t0)
        if b >= 4 and st_i == 10:
            kick(t0, 0.8)
        if b >= 8 and st_i in (2, 14):
            kick(t0, 0.7)
        if b >= 2 and st_i in (4, 12):
            snare(t0)
        if b in (3, 7) and st_i >= 12:  # тома-филлы
            tom(t0, [230, 190, 150, 115][st_i - 12], 0.9)
        if b == 7 and 8 <= st_i < 12:  # нарастающий снейр-ролл
            snare(t0, 0.5 + 0.12 * (st_i - 8))
        if b == 7 and 12 <= st_i:
            snare(t0 + 0.0001, 0.9)
        if b >= 8 and st_i % 2 == 1 and st_i > 4:
            snare(t0, 0.55)
        if b == 0 and st_i % 2 == 0:
            hat(t0, 0.35 + 0.1 * (st_i % 4 == 0))
        elif b >= 1:
            if (st_i % 2 == 0) or b >= 4:
                hat(t0, 0.35 + 0.25 * (st_i % 4 == 2))
            if st_i == 14 and b % 2 == 1:
                hat(t0, 0.5, open_=True)
        if st_i == 0 and b in (0, 4, 8):
            crash(t0)

    # ---- ризер перед обрывом (с 7-го такта)
    rs = 6 * BAR
    L = int((total - rs) * SR)
    tr = np.arange(L) / SR
    prog_r = tr / tr[-1]
    riser = svf(noise(L), 300 * 2 ** (prog_r * 5.5), q=0.35, mode="band") * (0.2 + 1.8 * prog_r ** 2)
    whine = np.sin(TAU * np.cumsum(220 * 2 ** (prog_r * 3)) / SR) * prog_r ** 2
    riser_s = widen(riser * 0.8 + whine * 0.35, 0.001)
    ris = np.zeros((n, 2))
    add(ris, riser_s, rs, 1.0)

    # ---- сайдчейн от кика
    k_env = np.convolve(kicks, ex(np.arange(int(0.3 * SR)) / SR, 0.09))[:n]
    duck = 1 - 0.55 * np.clip(k_env, 0, 1)
    pad *= duck[:, None]
    arp *= (1 - 0.3 * np.clip(k_env, 0, 1))[:, None]

    bass_s = widen(sat(lp(bass, 3000, 2), 1.4) , 0.0002)
    # тревожность: лёгкий «pitch-wobble» лид-реверба
    mix = bass_s * 0.85 + pad * 0.85 + arp * 1.0 + reverb(lead, 0.8, 0.25, 5000) * 1.0 + drums * 0.95 + ris * 0.5
    mix = reverb(mix, 0.5, 0.06, 6000)
    # плавное нарастание общей громкости к финалу
    t = np.arange(n) / SR
    mix *= (0.8 + 0.2 * np.clip(t / MUSIC_LEN, 0, 1))[:, None]
    mix = sat(mix * 0.9, 1.6)
    out = mix[: int(MUSIC_LEN * SR)]
    return out


# ------------------------------------------------------------------ MIX PREVIEW
def read_wav(path):
    sr, a = wavfile.read(path)
    a = a.astype(np.float64)
    if a.dtype != np.float64 or np.abs(a).max() > 2:
        a /= 32768.0
    if a.ndim == 1:
        a = np.stack([a, a], axis=-1)
    if sr != SR:
        a = resample_poly(a, SR, sr, axis=0)
    return a


def parse_cues():
    src = SCENE_TS.read_text()
    consts = dict(re.findall(r"export const (\w+)\s*=\s*(\d+)\s*;", src))
    consts = {k: int(v) for k, v in consts.items()}
    consts.update({k: int(v) for k, v in re.findall(r"export const (\w+) = \{ from: (\d+)", src)})
    m = re.search(r"GREG_LINE = \{ from: (\d+)", src)
    consts["GREG_LINE.from"] = int(m.group(1))
    body = src[src.index("AUDIO_CUES"):]
    cues = []
    for line in re.findall(r"\{ base: .*? \},?(?=\n)", body):
        base = re.search(r'base: "(\w+)"', line).group(1)

        def ev(s):
            s = s.strip().replace("GREG_LINE.from", str(consts["GREG_LINE.from"]))
            return int(eval(s, {}, consts))

        fr = ev(re.search(r"from: ([^,]+),", line).group(1))
        to_m = re.search(r"to: ([^,}]+?)(?:,| \})", line)
        to = ev(to_m.group(1)) if to_m else consts["DURATION"]
        vol = float(re.search(r"volume: ([\d.]+)", line).group(1)) if "volume:" in line else 1.0
        cues.append((base, fr, to, vol, "loop: true" in line))
    return cues, consts


def preview():
    cues, c = parse_cues()
    # зуб ударяется об асфальт на SPIT_FRAME+22 (в AUDIO_CUES cue нет)
    cues.append(("sfx_tooth_ping", c["SPIT_FRAME"] + 22, c["SPIT_FRAME"] + 22 + 22, 0.7, False))
    FPS = 24
    total = int(30 * SR)
    mix = np.zeros((total, 2))
    cache = {}
    for base, fr, to, vol, loop in cues:
        p = AUDIO / f"{base}.wav"
        if not p.exists():
            print("  (нет файла, пропуск)", base)
            continue
        if base not in cache:
            cache[base] = read_wav(p)
        a = cache[base]
        n = int((to - fr) / FPS * SR)
        if loop:
            a = np.tile(a, (n // len(a) + 1, 1))
        a = a[:n].copy()
        r = min(int(0.003 * SR), len(a))
        a[-r:] *= np.linspace(1, 0, r)[:, None]  # короткая отсечка без щелчка
        add(mix, a, fr / FPS, vol)
        print(f"  cue {base:18s} {fr / FPS:6.2f}-{to / FPS:6.2f} s  vol {vol}")
    m = np.abs(mix).max()
    if m > 0.98:
        mix *= 0.98 / m
    OUT.mkdir(parents=True, exist_ok=True)
    wavfile.write(OUT / "s1_audio_preview.wav", SR, (np.clip(mix, -1, 1) * 32767).astype(np.int16))
    print(f"preview peak {20 * np.log10(np.abs(mix).max() + 1e-12):.1f} dBFS (scale {min(1, 0.98 / max(m, 1e-9)):.2f})")


def main():
    save("sfx_siren", sfx_siren(), loop=True)
    save("sfx_engine_roar", sfx_engine_roar())
    save("sfx_rocket_whoosh", sfx_rocket_whoosh())
    save("sfx_explosion_far", sfx_explosion_far())
    save("sfx_crunch_hit", sfx_crunch_hit())
    save("sfx_bass_drop", sfx_bass_drop())
    save("sfx_slowmo_hum", sfx_slowmo_hum())
    save("sfx_body_thud", sfx_body_thud())
    save("sfx_digital_click", sfx_digital_click())
    save("sfx_unplug", sfx_unplug())
    save("sfx_glitch", sfx_glitch())
    save("sfx_crickets", sfx_crickets(), loop=True)
    save("sfx_water_drip", sfx_water_drip(), loop=True)
    save("sfx_bone_crack", sfx_bone_crack())
    save("sfx_spit", sfx_spit())
    save("sfx_tooth_ping", sfx_tooth_ping())
    m = music_s1()
    assert len(m) == int(MUSIC_LEN * SR)
    x = save("music_s1", m, loop=True)  # без fade-out: резкий обрыв
    preview()


if __name__ == "__main__":
    main()
