"""Звуковая дорожка ролика «Нуб и качели».

Фоновая музыка — Kevin MacLeod, «Pixel Peeker Polka (faster)», CC BY 4.0 (до мажор, ~193 уд/мин).
Эффекты и «голоса» персонажей синтезируются и настроены на ноты трека; голоса
поставлены по сетке восьмых долей музыки. Звуки персонажей приоритетнее музыки:
она приглушается под голосами и ударами, замолкает перед главными ударами
и звучит глухо в космосе.
"""
import math
import os
import random
import subprocess
import sys
import wave

import numpy as np

SR = 44100
DUR = 24.8
TRACK = "ассеты/музыка/Pixel Peeker Polka - faster.mp3"
MUSIC_OFFSET = 0.24  # с этой секунды трека начинается ролик: сильная доля попадает на удар T2
STEP = 0.15517  # восьмая доля трека
buf = [0.0] * int(SR * DUR)
random.seed(7)
TAU = 2 * math.pi

# ключевые моменты из Film.luau
T1, T1L, T2, T3, T4, T5 = 4.6, 5.4, 9.6, 14.0, 20.2, 23.0
T_FLICK, CLOUD0, SPACE0, MOON0, RET0, EARTH2 = 8.3, 10.4, 11.4, 13.4, 21.0, 22.2

# ноты тональности трека (до): тоника, секунда, кварта, квинта — звучат и в мажоре, и в миноре
C, D, F, G = 261.63, 293.66, 349.23, 392.0


def grid(t):
    """Ближайшая восьмая доля музыки (сетка привязана к удару T2)."""
    return T2 + round((t - T2) / STEP) * STEP


def add(t0, length, fn, gain=1.0):
    i0 = int(t0 * SR)
    for i in range(int(length * SR)):
        if 0 <= i0 + i < len(buf):
            buf[i0 + i] += fn(i / SR) * gain


def step(t):
    return math.sin(TAU * 110 * t) * math.exp(-t * 60) + random.uniform(-1, 1) * 0.3 * math.exp(-t * 120)


def thud(t):  # удар, оседающий на соль большой октавы
    f = 98 + 90 * math.exp(-t * 9)
    return math.sin(TAU * f * t) * math.exp(-t * 7) + random.uniform(-1, 1) * 0.5 * math.exp(-t * 40)


def boom(t):  # большой удар, оседающий на до контроктавы
    f = 32.7 + 65 * math.exp(-t * 5)
    return math.sin(TAU * f * t) * math.exp(-t * 3.5) * 1.2 + random.uniform(-1, 1) * 0.7 * math.exp(-t * 9)


def whoosh(length, depth=0.12):
    state = [0.0]

    def fn(t):
        state[0] += (random.uniform(-1, 1) - state[0]) * depth
        return state[0] * math.sin(math.pi * t / length) ** 2 * 3
    return fn


def boing(t):  # пружина, оседающая на соль
    f = G / 2 + 150 * math.exp(-t * 5) + 22 * math.sin(TAU * 17 * t)
    return math.sin(TAU * f * t) * math.exp(-t * 4.5)


def sweep(length, f0, f1, power=1.0):
    ph = [0.0]

    def fn(t):
        f = f0 * (f1 / f0) ** ((t / length) ** power)
        ph[0] += TAU * f / SR
        return math.sin(ph[0]) * min(1, t * 30) * min(1, (length - t) * 12)
    return fn


def ding(t):  # звёздочка: до и соль
    return (math.sin(TAU * C * 8 * t) + 0.5 * math.sin(TAU * G * 8 * t)) * math.exp(-t * 9)


VOICE_TIMES = []


def voice(t0, notes, count=4, warble=0.0):
    """Бормотание персонажа: короткие ноты из тональности трека по сетке шестнадцатых."""
    t0 = grid(t0)
    count = max(2, round(count * 0.7))
    VOICE_TIMES.append((t0, t0 + count * STEP))
    for k in range(count):
        f = random.choice(notes)
        ph = [0.0]

        def fn(t, f=f, ph=ph):
            ff = f * (1 + warble * math.sin(TAU * 28 * t))
            ph[0] += TAU * ff / SR
            s = math.sin(ph[0])
            return (0.6 * s + 0.2 * (1 if s > 0 else -1)) * math.sin(math.pi * t / 0.12)
        add(t0 + k * STEP, 0.12, fn, 0.34)


def steps(t0, count, gap, gain):
    for k in range(count):
        add(t0 + k * gap, 0.12, step, gain)


# --- эффекты ---
steps(0.11, 5, 0.217, 0.5)
add(1.15, 0.38, whoosh(0.38), 0.3)
add(1.55, 0.5, thud, 0.5)
steps(1.75, 4, 0.21, 0.45)
add(4.2, 0.4, whoosh(0.4), 0.45)
add(T1, 0.9, thud, 1.0)
add(T1 + 0.01, 1.0, boing, 0.5)
add(T1 + 0.05, 0.75, sweep(0.75, C * 2, G * 4, 0.6), 0.2)
add(T1L, 0.5, thud, 0.6)
add(T1L + 0.01, 0.4, boing, 0.25)
for k in range(4):
    add(6.2 + k * 0.4, 0.7, thud, 1.45 + k * 0.1)  # шаги Качка — тяжёлые, громче остальных шагов
add(T_FLICK - 0.05, 0.25, whoosh(0.25), 0.6)
add(T_FLICK, 0.3, thud, 0.7)
add(T_FLICK + 0.05, 0.6, sweep(0.6, G * 2, G * 8), 0.16)
add(T_FLICK + 0.6, 0.5, ding, 0.3)
add(8.9, 0.7, sweep(0.7, G, C, 2), 0.22)          # Качок в прыжке: в тишине перед ударом
add(T2, 1.6, boom, 1.4)
add(T2 + 0.02, 0.9, sweep(0.9, C * 2, C * 16, 0.5), 0.28)
add(CLOUD0, 1.0, whoosh(1.0, 0.3), 0.5)
add(SPACE0, 2.0, whoosh(2.0, 0.04), 0.4)
add(MOON0 - 0.3, 0.9, sweep(0.9, C * 8, C, 1.5), 0.26)  # падение на Луну — в паузе музыки
add(T3, 1.3, boom, 1.2)
add(14.1, 0.9, lambda t: math.sin(TAU * 9 * t) * math.sin(TAU * G * t) * math.exp(-t * 2), 0.18)
add(15.1, 0.25, sweep(0.25, C, C * 4), 0.4)
add(17.5, 0.35, ding, 0.35)
steps(18.25, 3, 0.19, 0.4)
add(19.0, 0.5, thud, 0.4)
add(19.2, 1.0, sweep(1.0, C * 2, G * 2, 0.5), 0.14)
add(T4, 1.2, boom, 1.0)
add(T4 + 0.02, 0.8, sweep(0.8, C * 2, C * 16, 0.5), 0.26)
add(RET0, 1.2, whoosh(1.2, 0.05), 0.45)
add(RET0 + 0.6, 1.5, whoosh(1.5, 0.5), 0.45)
add(EARTH2 + 0.2, 0.8, sweep(0.8, C * 8, C * 2, 1.2), 0.24)
add(T5, 1.8, boom, 1.5)
add(T5 + 0.03, 0.8, sweep(0.8, C, C * 8, 0.5), 0.24)
add(T5 + 0.75, 0.5, ding, 0.35)

# --- «голоса»: у каждого свой регистр, ноты из тональности трека ---
NOOB = [C * 2, D * 2, F * 2, G * 2]
PRO = [G / 2, C, D]
BUFF = [C / 2, G / 4, F / 4]
ALIEN = [C * 4, D * 4, G * 4]
for t0, who, n in [(2.7, PRO, 3), (3.35, NOOB, 3), (3.9, PRO, 2), (5.6, NOOB, 5), (5.75, PRO, 5), (6.5, NOOB, 2),
                   (7.2, PRO, 4), (7.6, BUFF, 3), (8.0, NOOB, 6), (9.95, BUFF, 3), (12.5, NOOB, 3), (16.0, NOOB, 3),
                   (16.7, NOOB, 5), (18.0, NOOB, 2), (22.25, BUFF, 3), (22.7, BUFF, 2), (24.0, NOOB, 4)]:
    voice(t0, who, n)
for t0, n in [(14.5, 3), (15.6, 4), (17.55, 2), (17.9, 4), (20.5, 4)]:
    voice(t0, ALIEN, n, warble=0.1)

# --- музыка: фрагмент трека в двух видах — обычном и приглушённом («в космосе») ---
n = len(buf)
t = np.arange(n) / SR


def load(name, filt):
    cmd = ["ffmpeg", "-v", "error", "-y", "-ss", str(MUSIC_OFFSET), "-t", str(DUR), "-i", TRACK]
    subprocess.run(cmd + (["-af", filt] if filt else []) + ["-ac", "2", "-ar", str(SR), name], check=True)
    with wave.open(name) as w:
        m = np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16).astype(np.float32) / 32768
    os.remove(name)
    m = m.reshape(-1, 2)
    if len(m) < n:
        m = np.vstack([m, np.zeros((n - len(m), 2), np.float32)])
    return m[:n]


def ramp(a, b):
    """Плавный переход 0→1 между моментами a и b."""
    return np.clip((t - a) / (b - a), 0, 1)


bright = load("сборка/_seg.wav", None)
muffled = load("сборка/_seg_low.wav", "lowpass=f=650,lowpass=f=650")
# в космосе и на Луне (от взлёта до возвращения на Землю) музыка звучит глухо
space = ramp(SPACE0 - 0.3, SPACE0 + 0.3) * (1 - ramp(EARTH2 - 0.1, EARTH2 + 0.1))
music = (bright * (1 - space)[:, None] + muffled * (space * 1.6)[:, None]) / max(1e-6, np.abs(bright).max())

# громкость музыки: звуки персонажей в приоритете
gain = np.ones(n, np.float32)
for a, b in VOICE_TIMES:  # под голосами музыка отступает
    gain = np.minimum(gain, 1 - 0.62 * (ramp(a - 0.08, a) * (1 - ramp(b, b + 0.25))))
for a, b in [(5.55, 6.3), (15.4, 18.6)]:  # смех после первого прыжка и разговор на Луне — музыка тише всё время
    gain = np.minimum(gain, 1 - 0.5 * (ramp(a - 0.2, a) * (1 - ramp(b, b + 0.3))))
for ti in (T1, T2, T3, T4, T5):  # под ударами музыка проседает и возвращается
    u = t - ti
    gain *= np.where(u >= 0, 1 - 0.6 * np.exp(-u * 3.5), 1)
for k in range(4):  # под каждым шагом Качка музыка проседает
    u = t - (6.2 + k * 0.4)
    gain *= np.where(u >= 0, 1 - 0.5 * np.exp(-u * 6), 1)
for a, b in [(8.9, T2), (13.25, T3), (22.75, T5)]:  # тишина перед главными ударами
    gain *= 1 - ramp(a, a + 0.15) * (t < b)
gain *= ramp(0, 0.05) * (1 - ramp(DUR - 0.7, DUR))

fx = np.array(buf, np.float32)
fx /= max(1e-6, np.abs(fx).max())
mix = music * (0.36 * gain)[:, None] + fx[:, None] * 0.9
mix = np.tanh(mix * 1.5) / math.tanh(1.5) * 0.95

with wave.open(sys.argv[1] if len(sys.argv) > 1 else "сборка/sfx.wav", "w") as w:
    w.setnchannels(2)
    w.setsampwidth(2)
    w.setframerate(SR)
    w.writeframes((mix * 32767).astype(np.int16).tobytes())
if "--report" in sys.argv:  # кривая громкости музыки и итоговый уровень по четвертям секунды
    q = SR // 4
    mono = mix.mean(axis=1)
    print("музыка, %:", " ".join("%d" % round(v * 100) for v in gain[::q]))
    print("итог, дБ:", " ".join("%d" % round(20 * np.log10(np.sqrt((mono[i:i + q] ** 2).mean()) + 1e-6)) for i in range(0, n - q, q)))
print("ok")
