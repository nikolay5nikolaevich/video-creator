"""Собирает вертикальный ролик 1080×1920: кадр по центру, размытый фон, хук сверху, субтитры по словам."""
import json
import re

from common import duration, ffmpeg, load_clips, parse_args, work_dir

# Мат в субтитрах закрывается звёздочками. Шаблон привязан к началу слова, чтобы не задевать «рубля», «требую».
BAD = re.compile(
    r"^(?:на|за|вы|у|от|по|до|при|про|пере|разъ|съ|объ|подъ|о|а)?"
    r"(?:ху[йеёяию]|пизд|[её]б|бля(?:$|[дт])|сук(?:а|и|у|ой|ам)$|суч|муда|муди|пид[оа]р|гандон|залуп|шлюх)",
    re.IGNORECASE,
)
# Ключевые слова для поиска TikTok: почти невидимая строка внизу кадра. Пусто — строки нет.
HIDDEN_KEYWORDS = []

FRAME_H = 880                       # высота основного кадра
FRAME_Y = (1920 - FRAME_H) // 2     # его отступ сверху
SUB_Y = 1330                        # центр субтитров
MAX_WORDS, MAX_CHARS, MAX_GAP = 3, 16, 0.5

# Раскладка кадра. Для геймплея «игра сверху, камера снизу» правится именно эта строка.
# {x} — отступ окна слева в пикселях уже отмасштабированного кадра (поле crop_x в clips.json),
# по умолчанию окно по центру. Сдвигом убирают из кадра вебкамеру автора.
VF = (
    "[0:v]split[a][b];"
    f"[a]scale=1080:{FRAME_H}:force_original_aspect_ratio=increase,crop=1080:{FRAME_H}:{{x}}:0,"
    "scale=270:480:force_original_aspect_ratio=increase,crop=270:480,boxblur=6:2,scale=1080:1920[bg];"
    f"[b]scale=1080:{FRAME_H}:force_original_aspect_ratio=increase,crop=1080:{FRAME_H}:{{x}}:0[fg];"
    f"[bg][fg]overlay=0:{FRAME_Y},ass=subs.ass[v]"
)

# Все строки с ASS-тегами — только raw, иначе \f, \a, \t превратятся в управляющие символы.
HEADER = r"""[Script Info]
ScriptType: v4.00+
PlayResX: 1080
PlayResY: 1920
WrapStyle: 0
ScaledBorderAndShadow: yes

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Hook,Impact,96,&H00FFFFFF,&H00FFFFFF,&H00000000,&H80000000,0,0,0,0,100,100,1,0,1,6,3,2,50,50,0,1
Style: Sub,Arial Black,84,&H00FFFFFF,&H00FFFFFF,&H00000000,&H80000000,0,0,0,0,100,100,0,0,1,7,3,5,40,40,0,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
"""
LIME = r"{\c&H00FF32&}"
WHITE = r"{\c&HFFFFFF&}"


def ts(t):
    cs = max(0, round(t * 100))
    return f"{cs // 360000}:{cs // 6000 % 60:02d}:{cs // 100 % 60:02d}.{cs % 100:02d}"


def show(word):
    """Слово для экрана: капсом, без лишней пунктуации, мат — звёздочками."""
    w = word.strip(" .,;:«»\"()—-").upper()
    core = w.rstrip("?!")
    if BAD.match(core):
        w = core[0] + "*" * (len(core) - 1) + w[len(core):]
    return w


def group(words):
    out, cur = [], []
    for w in words:
        if cur and (
            len(cur) >= MAX_WORDS
            or w["s"] - cur[-1]["e"] > MAX_GAP
            or sum(len(x["w"]) for x in cur) + len(w["w"]) > MAX_CHARS
            or cur[-1]["w"][-1:] in ".?!"
        ):
            out.append(cur)
            cur = []
        cur.append(w)
    if cur:
        out.append(cur)
    return out


def build_ass(hook, words, total):
    lines = [rf"Dialogue: 0,{ts(0)},{ts(total)},Hook,,0,0,0,,{{\pos(540,{FRAME_Y - 30})}}{hook.upper()}"]
    if HIDDEN_KEYWORDS:
        lines.append(
            rf"Dialogue: 0,{ts(0)},{ts(total)},Sub,,0,0,0,,{{\an2\pos(540,1905)\fs18\bord0\shad0\alpha&HF0&}}"
            + " ".join(HIDDEN_KEYWORDS)
        )
    groups = group([w for w in words if show(w["w"])])
    for gi, g in enumerate(groups):
        limit = groups[gi + 1][0]["s"] if gi + 1 < len(groups) else total
        shown = [show(w["w"]) for w in g]
        for i, w in enumerate(g):
            end = g[i + 1]["s"] if i + 1 < len(g) else max(w["e"], min(limit, w["e"] + 0.4))
            text = " ".join(LIME + s + WHITE if j == i else s for j, s in enumerate(shown))
            lines.append(rf"Dialogue: 1,{ts(w['s'])},{ts(end)},Sub,,0,0,0,,{{\pos(540,{SUB_Y})}}{text}")
    return HEADER + "\n".join(lines) + "\n"


def main():
    camp, only = parse_args("render.py clipping\\<название> [номер]")
    (camp / "out").mkdir(exist_ok=True)
    for clip in load_clips(camp, only):
        n = clip["n"]
        d = work_dir(camp, n)
        if not (d / "src.mp4").exists() or not (d / "words.json").exists():
            print(f"клип {n}: нет src.mp4 или words.json, сначала cut.py и words.py")
            continue
        words = json.loads((d / "words.json").read_text(encoding="utf-8-sig"))
        (d / "subs.ass").write_text(build_ass(clip["hook"], words, duration(d / "src.mp4")), encoding="utf-8")
        out = camp / "out" / f"c{n:02d}.mp4"
        # cwd = папка клипа: так в фильтр ass идёт простое имя файла без экранирования путей.
        ffmpeg([
            "-i", "src.mp4", "-filter_complex", VF.format(x=clip.get("crop_x", "(iw-1080)/2")), "-map", "[v]", "-map", "0:a",
            "-r", "30", "-c:v", "libx264", "-preset", "veryfast", "-crf", "20", "-pix_fmt", "yuv420p",
            "-c:a", "aac", "-b:a", "160k", "-movflags", "+faststart", str(out),
        ], cwd=d)
        print(f"клип {n}: {out}")


if __name__ == "__main__":
    main()
