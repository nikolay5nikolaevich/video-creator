"""Звуковая дорожка: мемные эффекты из ассеты/звуки/источники/ плюс синтез. Пишет сборка/sound.wav.

Тайминги берутся из timing.json — того же файла, что читает scene.html.
"""
from pathlib import Path
import json, subprocess, wave
import numpy as np

ROOT = Path(__file__).resolve().parent
T = json.loads((ROOT / 'timing.json').read_text(encoding='utf8'))
E, S, D, SR = T['ev'], T['shots'], T['dur'], 48000
rng = np.random.default_rng(3)
mix = np.zeros((int(D * SR), 2))


def clip(name, a, b, fade=.15):
    """Фрагмент [a, b] секунд из подборки, пик приведён к 1."""
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-ss', str(a), '-t', str(b - a), '-i', str(ROOT / 'ассеты' / 'звуки' / 'источники' / f'{name}.webm'),
                          '-f', 's16le', '-ac', '2', '-ar', str(SR), '-'], capture_output=True, check=True).stdout
    x = np.frombuffer(raw, np.int16).reshape(-1, 2) / 32768
    n = int(fade * SR)
    x = x * np.minimum(1, np.arange(len(x))[::-1] / n)[:, None]
    return x / np.abs(x).max()


def add(t, x, gain=1.0):
    if x.ndim == 1:
        x = np.stack([x, x], 1)
    i = int(t * SR)
    n = min(len(x), len(mix) - i)
    if n > 0:
        mix[i:i + n] += x[:n] * gain


def synth(kind, d):
    z = np.arange(int(d * SR)) / SR
    noise = rng.normal(0, 1, len(z))
    bell = np.sin(np.pi * z / d)
    if kind == 'key':     # щелчок клавиши
        return noise * np.exp(-z * 260) * .6 + np.sin(2 * np.pi * 1900 * z) * np.exp(-z * 180) * .3
    if kind == 'blip':    # писк игры
        return np.sign(np.sin(2 * np.pi * rng.choice([660, 880, 990, 1320]) * z)) * np.exp(-z * 30) * .5
    if kind == 'creak':   # скрип двери: дребезжащий тон, ползущий вверх
        f = 240 + 190 * z / d + 25 * np.sin(z * 31)
        return np.sign(np.sin(2 * np.pi * np.cumsum(f) / SR)) * (.5 + .5 * np.sin(2 * np.pi * 37 * z)) ** 3 * bell ** .5 * .5
    if kind == 'alert':   # «ой!»
        return (np.sin(2 * np.pi * 1320 * z) + np.sin(2 * np.pi * 1760 * z)) * np.exp(-z * 9) * .4
    if kind == 'whoosh':
        return noise * bell ** 3 * .6 + np.sin(2 * np.pi * (900 * z - 500 * z * z / d)) * bell * .12
    if kind == 'snore':   # храп: хриплый вдох и свист на выдохе
        inh = z < d * .55
        rasp = np.convolve(noise, np.ones(60) / 60, 'same') * 6 * (.5 + .5 * np.sin(2 * np.pi * 42 * z)) * np.sin(np.pi * np.clip(z / (d * .55), 0, 1)) ** .7
        whistle = np.sin(2 * np.pi * (700 - 250 * (z - d * .55) / d) * z) * np.sin(np.pi * np.clip((z - d * .6) / (d * .4), 0, 1)) * .25
        return np.where(inh, rasp, whistle)
    if kind == 'tick':    # кресло докручивается
        return noise * np.exp(-z * 200) * .5
    if kind == 'thud':    # дверь закрылась
        return np.sin(2 * np.pi * (70 * z + 10 * (1 - np.exp(-z * 30)))) * np.exp(-z * 16) + noise * np.exp(-z * 90) * .4
    if kind == 'ding':
        return (np.sin(2 * np.pi * 1568 * z) + .5 * np.sin(2 * np.pi * 3136 * z)) * np.exp(-z * 6) * .5
    raise ValueError(kind)


# 1: игра за компьютером
t = .05
while t < E['panic']:
    add(t, synth('key', .03), .28 * rng.uniform(.6, 1))
    t += rng.uniform(.045, .11)
for t in np.arange(.1, E['creak'], .19):
    add(float(t), synth('blip', .09), .07)
add(E['creak'], synth('creak', .55), .5)
add(E['panic'], synth('alert', .35), .45)
add(E['zip'] - .05, clip('a9P_j1gMXBo', 233.7, 234.25, .08), .8)       # Cartoon Running
add(E['zip'] + .05, synth('whoosh', .32), .7)
# 2–4: мама
add(S[1], clip('MZIK5pQuJD8', 6.0, 6.0 + S[4] - S[1], .5), .5)           # Suspense до ухода мамы
add(E['peek'], synth('creak', .9), .4)
for t in (S[2] + .15, S[2] + 1.15):
    add(t, synth('snore', .95), .5)
for i in range(14):                                                     # тиканье кресла замедляется
    add(E['zip'] + .25 + .12 * i * (1 + i * .12), synth('tick', .03), .2 * .9 ** i)
add(E['doorClose'], synth('creak', .35), .35)
add(E['doorClose'] + .38, synth('thud', .4), .7)
# 5: тишина и сверчки
add(S[4] + .05, clip('a9P_j1gMXBo', 241.3, 241.3 + S[5] - S[4] - .1, .1), .3)   # Crickets
add(S[4] + .1, synth('snore', .6), .3)
add(E['eye'], synth('ding', .6), .35)
# 6–7: развязка
add(E['boom'], clip('kxKCRaAEwAY', 38.78, 41.6, .5), 1.0)                # Vine Boom (Slowed)
add(E['horror'], clip('kxKCRaAEwAY', 73.98, 76.0, .6), .95)              # Cinematic Boom

fade = np.minimum(1, np.arange(len(mix))[::-1] / (SR * .12))
mix = np.tanh(mix * 1.2) * fade[:, None]
mix *= .95 / np.abs(mix).max()
out = ROOT / 'сборка' / 'sound.wav'
out.parent.mkdir(exist_ok=True)
with wave.open(str(out), 'wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
    w.writeframes((mix * 32767).astype('<i2').tobytes())
# проверка: дорожка нужной длины, развязка — самое громкое место
rms = lambda a, b: float(np.sqrt((mix[int(a * SR):int(b * SR)] ** 2).mean()))
assert len(mix) == int(D * SR)
assert rms(E['boom'], E['boom'] + .5) > 3 * rms(S[4], E['boom']), 'удар должен быть громче тишины перед ним'
print(out, '| по планам:', ' '.join(f'{20 * np.log10(rms(a, b) + 1e-9):.0f}' for a, b in zip(S, S[1:] + [D])), 'дБ')
