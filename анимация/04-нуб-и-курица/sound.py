"""Звуковая дорожка: музыка, эффекты из ../аудио/ и синтез. Пишет в сборка/:
  sound.wav                    — музыка и эффекты, идёт в готовый ролик
  звуки-на-прослушивание.wav   — все взятые из библиотеки эффекты подряд, по 1,5 с на каждый

Музыка — Kevin MacLeod, «Pixel Peeker Polka (faster)», CC BY 4.0, сведена как в ролике 01:
она тише эффектов, проседает под каждым акцентом, обрывается на ложных тревогах
и перед появлением хранителей, возвращается в полную силу на побеге.
Все события ролика стоят на долях трека (timing.json: beat), поэтому акценты попадают в ритм.

  python sound.py --report     — кривая громкости музыки и итоговый уровень по четвертям секунды
"""
from pathlib import Path
import json, subprocess, sys, wave
import numpy as np

ROOT = Path(__file__).resolve().parent
LIB = ROOT.parent / 'аудио'
FX = LIB / 'звуковые-эффекты' / 'из-подборок'
T = json.loads((ROOT / 'timing.json').read_text(encoding='utf8'))
E, S, D, B, SR = T['ev'], T['shots'], T['dur'], T['beat'], 48000
MUSIC, FXGAIN = .36, .9          # базовые уровни: эффекты в приоритете
rng = np.random.default_rng(4)
N = int(D * SR)
fx = np.zeros((N, 2))
t = np.arange(N) / SR
used = {}
accents = []                     # (момент, глубина, скорость возврата): под ними музыка проседает


def load(path, start=0.0, dur=None, filt=None):
    cmd = ['ffmpeg', '-v', 'error', '-ss', str(start)] + (['-t', str(dur)] if dur else []) + ['-i', str(path)] + (['-af', filt] if filt else []) + ['-f', 's16le', '-ac', '2', '-ar', str(SR), '-']
    return np.frombuffer(subprocess.run(cmd, capture_output=True, check=True).stdout, np.int16).reshape(-1, 2) / 32768


def clip(folder, dur, skip=0.0, fade=.12):
    """Эффект из библиотеки: от начала звука (первый всплеск громче трети пика) плюс skip, длиной dur, пик приведён к 1."""
    x = load(folder / 'звук.mp3')
    env = np.abs(x).max(1)
    i = int(np.argmax(env > .33 * env.max())) + int(skip * SR)
    x = x[max(0, i - 480):i + int(dur * SR)].copy()
    x *= np.minimum(1, np.arange(len(x))[::-1] / int(fade * SR))[:, None]
    x /= np.abs(x).max()
    used.setdefault(folder.name, x)
    return x


def speed(x, k):
    """Быстрее и выше в k раз."""
    i = np.arange(0, len(x) - 1, k)
    return np.stack([np.interp(i, np.arange(len(x)), x[:, c]) for c in (0, 1)], 1)


def add(t0, x, gain=1.0, duck=0.0, to=None):
    """Кладёт звук на t0; duck > 0 — музыка под ним проседает на эту долю."""
    to = fx if to is None else to
    if x.ndim == 1:
        x = np.stack([x, x], 1)
    i = int(t0 * SR)
    n = min(len(x), len(to) - i)
    if n > 0:
        to[i:i + n] += x[:n] * gain
    if duck:
        accents.append((t0, duck, 3.5 / max(.25, len(x) / SR)))


def synth(kind, d, f=440.0):
    z = np.arange(int(d * SR)) / SR
    noise = rng.normal(0, 1, len(z))
    bell = np.sin(np.pi * z / d)
    if kind == 'pizz':    # шаг на цыпочках: щипок струны в тональности трека
        return (np.sin(2 * np.pi * f * z) + .4 * np.sin(2 * np.pi * 2 * f * z) + .2 * np.sin(2 * np.pi * 3 * f * z)) * np.exp(-z * 20) * .5
    if kind == 'rustle':  # курица ворочается
        return np.convolve(noise, np.ones(8) / 8, 'same') * bell ** 2 * (.6 + .4 * np.sin(2 * np.pi * 23 * z)) * 1.2
    if kind == 'creak':   # гнездо скрипит: дребезжащий тон, ползущий вверх
        fr = 240 + 190 * z / d + 25 * np.sin(z * 31)
        return np.sign(np.sin(2 * np.pi * np.cumsum(fr) / SR)) * (.5 + .5 * np.sin(2 * np.pi * 37 * z)) ** 3 * bell ** .5 * .5
    if kind == 'whoosh':
        return noise * bell ** 3 * .6 + np.sin(2 * np.pi * (900 * z - 500 * z * z / d)) * bell * .12
    if kind == 'rumble':  # топот толпы
        return np.convolve(noise, np.ones(240) / 240, 'same') * 14 * (.55 + .45 * np.sign(np.sin(2 * np.pi * 13 * z))) * bell ** .6
    raise ValueError(kind)


nb = lambda n: n * B
C, Dn, F, G = 261.63, 293.66, 349.23, 392.0      # ноты тональности трека (до мажор)
snore = clip(FX / '500-Meme' / '172-snoring cartoon', 1.0)
crickets = lambda d: clip(FX / 'Popular-Meme' / '029-CRICKETS', d, skip=1.0, fade=.08)
boom = clip(FX / '500-Meme' / '004-Vine boom', .9)

# курица храпит раз в шесть долей, пока земля не вздрогнет; замолкает на ложных тревогах; у безопасной зоны её почти не слышно
quiet = [(E['snort'] - .3, E['rollOver'] + .5), (E['eyeOpen'] - .3, E['eyeClose'] + .3)]
for k in range(0, 54, 6):
    t0 = nb(k) + .05
    if any(a <= t0 < b for a, b in quiet) or t0 + 1 > E['quake']:
        continue
    add(t0, snore, .42 if t0 < S[4] else .16)
add(E['dustSettles'] + .05, snore, .5)
# шаги на цыпочках: щипок на каждый шаг, по нотам трека
for i in range(4):
    add(nb(1 + 2 * i), synth('pizz', .3, [C, Dn, F, G][i] * 2), .45, duck=.3)        # план 1
    add(S[4] + nb(1 + 2 * i), synth('pizz', .3, [G, F, Dn, C][i] * 2), .45, duck=.3)  # план 5
add(E['back'], synth('pizz', .3, C * 2), .4, duck=.3)
# 2: всхрап — музыка обрывается, сверчки
add(E['snort'], speed(snore, 1.25)[:int(.5 * SR)], 1.0)
add(E['snort'] + .35, crickets(E['rollOver'] - E['snort'] - .35), .4)
add(E['rollOver'], synth('rustle', .5), .5)
# 3: руки на яйце, подъём
add(E['grab'], synth('pizz', .25, G * 2), .3)
add(E['lift'], synth('creak', .55), .4, duck=.5)
# 4: глаз приоткрылся — музыка обрывается; пузырь
add(E['eyeOpen'], clip(FX / 'Top-60' / "032-Hell's Kitchen Suspense", E['eyeClose'] - E['eyeOpen'], fade=.08), .85)
blink = clip(FX / '500-Meme' / '145-eye blink cartoon', .5)
add(E['eyeOpen'], blink, .6)
add(E['eyeClose'], blink, .5)
add(E['eyeClose'] + .15, clip(FX / '500-Meme' / '132-water drop', .7), .65)
# 5–6: выдох, ухмылка, земля вздрогнула — музыка обрывается до побега
add(E['exhale'] - .3, clip(FX / '500-Meme' / '160-huh that was close', 1.0), .9, duck=.62)
add(E['grin'], clip(FX / 'Top-10-Transition' / '007-Ding', 1.0, fade=.5), .5, duck=.4)
add(E['quake'], clip(FX / 'Top-60' / '013-Vine Boom (Slowed)', 1.8, fade=.7), 1.0)
# 7: глаза хранителей — каждый удар на полтона выше; на тираннозавре большой удар и рёв
for i, t0 in enumerate(E['eyes'][:-1]):
    add(t0, speed(boom, 2 ** (i / 12)), .6 + .05 * i)
rex = load(LIB / 'дополнительные-из-каталога' / 'The-Isle-rex' / 'звук.mp3')
w = int(.25 * SR)
i0 = max(0, int(np.argmax(np.convolve((rex ** 2).sum(1), np.ones(w) / w, 'valid'))) - int(.15 * SR))   # самый громкий участок рёва
roar = rex[i0:i0 + int(.8 * SR)].copy()
roar *= (np.minimum(1, np.arange(len(roar)) / (.03 * SR)) * np.minimum(1, np.arange(len(roar))[::-1] / (.35 * SR)))[:, None]
roar /= np.abs(roar).max()
used['The-Isle-rex'] = roar
add(E['eyes'][-1], clip(FX / 'Top-60' / '020-Cinematic Boom', 1.0, fade=.6), 1.0)
add(E['eyes'][-1] + .05, roar, .9)
# 8: плашка «БЕГИ!!»
add(E['banner'], clip(FX / 'Top-60' / '030-999 Credit Score Siren', E['run'] - E['banner'], fade=.05), .5)
# 9: побег под вернувшуюся музыку; потом тишина, храп и сверчки
add(E['run'], clip(FX / 'Popular-Meme' / '027-CARTOON RUNNING', 1.0, fade=.25), .8, duck=.3)
add(E['run'] + .05, clip(FX / '500-Meme' / '032-Scared scream', .9, fade=.3), .6)
add(E['run'] + .05, synth('rumble', E['dustSettles'] - E['run'] - .1), .4)
add(E['run'], synth('whoosh', .4), .5)
add(E['dustSettles'], crickets(D - E['dustSettles']), .3)

# ---------- музыка: трек идёт под всем роликом, слышно его или нет — решает кривая громкости ----------
ramp = lambda a, b: np.clip((t - a) / (b - a), 0, 1)
track = T['music']
music = load(LIB / 'фоновая-музыка' / track['track'] / 'трек.mp3', track['offset'], D)
music = np.vstack([music, np.zeros((max(0, N - len(music)), 2))])[:N]
music /= np.abs(music).max()
gain = np.ones(N)
for t0, depth, back in accents:                      # под акцентами музыка проседает и возвращается
    u = t - t0
    gain *= np.where(u >= 0, 1 - depth * np.exp(-u * back), 1)
for a, b in [(E['snort'], E['relax']), (E['eyeOpen'], E['back'])]:   # ложные тревоги: обрыв и возврат, когда нуб выдохнул
    gain *= 1 - ramp(a - .03, a) * (1 - ramp(b, b + .25))
gain *= 1 - ramp(E['quake'] - .04, E['quake']) * (1 - ramp(E['run'] - .02, E['run']))   # тишина от «вздрогнула» до побега
gain *= np.where(t >= E['run'], 1.75, 1)             # побег — самое громкое место музыки
gain *= 1 - ramp(E['dustSettles'] - .04, E['dustSettles'])           # пыль осела — музыка оборвалась
gain *= ramp(0, .05)

fx /= np.abs(fx).max()
mix = music * (MUSIC * gain)[:, None] + fx * FXGAIN
mix = np.tanh(mix * 1.5) / np.tanh(1.5) * .95
mix *= (1 - ramp(D - .12, D))[:, None]


def write(name, x):
    out = ROOT / 'сборка' / name
    out.parent.mkdir(exist_ok=True)
    with wave.open(str(out), 'wb') as f:
        f.setnchannels(2); f.setsampwidth(2); f.setframerate(SR)
        f.writeframes((x * 32767).astype('<i2').tobytes())


write('sound.wav', mix)
demo = np.zeros((int(1.5 * SR) * len(used), 2))
for k, x in enumerate(used.values()):
    add(k * 1.5, x[:int(1.4 * SR)], .8, to=demo)
write('звуки-на-прослушивание.wav', demo)

# проверка: музыка молчит там, где должна, и возвращается на побеге
rms = lambda x, a, b: float(np.sqrt((x[int(a * SR):int(b * SR)] ** 2).mean()))
db = lambda v: 20 * np.log10(v + 1e-9)
m = music * (MUSIC * gain)[:, None]
assert rms(m, E['quake'] + .1, E['run'] - .1) < 1e-4, 'от «вздрогнула» до побега музыки быть не должно'
assert rms(m, E['run'], E['dustSettles'] - .1) > 1.4 * rms(m, 0, E['snort']), 'на побеге музыка должна быть громче, чем в начале'
assert rms(m, 0, E['snort']) < .6 * rms(fx * FXGAIN, E['quake'], E['quake'] + .4), 'музыка должна быть тише акцентов'
print('по планам, дБ (музыка / эффекты):', ' '.join(f'{db(rms(m, a, b)):.0f}/{db(rms(fx * FXGAIN, a, b)):.0f}' for a, b in zip(S, S[1:] + [D])))
if '--report' in sys.argv:
    q = SR // 4
    print('музыка, %:', ' '.join(str(round(v * 100)) for v in gain[::q]))
    print('итог, дБ:', ' '.join(str(round(db(rms(mix, i / SR, (i + q) / SR)))) for i in range(0, N - q, q)))
