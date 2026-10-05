"""Раскладывает готовые клипы в publish\\ с понятными именами и собирает подписи.txt."""
import re
import shutil
import sys

from common import load_clips, parse_args

camp, _ = parse_args('publish.py clipping\\<название> "Клиппинг — <Автор>"')
title = sys.argv[2] if len(sys.argv) > 2 and not sys.argv[2].isdigit() else camp.name


def brief_field(name):
    """Строка вида «Хештеги: ...» из brief.md."""
    brief = camp / "brief.md"
    if brief.exists():
        m = re.search(rf"^{name}:[ \t]*(.+)$", brief.read_text(encoding="utf-8-sig"), re.MULTILINE | re.IGNORECASE)
        if m:
            return m.group(1).strip()
    return ""


author, tags = brief_field("Автор"), brief_field("Хештеги")
if not tags:
    print("  ! в brief.md нет строки «Хештеги: …» — обязательный хештег кампании не попадёт в подписи")

dest = camp / "publish"
dest.mkdir(exist_ok=True)
text = [title, "=" * len(title), ""]
done = 0
for clip in load_clips(camp):
    src = camp / "out" / f"c{clip['n']:02d}.mp4"
    if not src.exists():
        print(f"клип {clip['n']}: не отрендерен, пропускаю")
        continue
    name = f"{clip['n']:02d} {re.sub(r'[\\/:*?\"<>|]', '', clip['hook']).strip()}.mp4"
    shutil.copy2(src, dest / name)
    caption = clip.get("caption") or clip["hook"].capitalize()
    text += [name, caption, " ".join(x for x in (author, tags) if x), ""]
    done += 1

(camp / "подписи.txt").write_text("\n".join(text), encoding="utf-8")
print(f"Готово: {done} клипов в {dest}, подписи в {camp / 'подписи.txt'}")
if author.startswith("@"):
    print("Напоминание: @автор в TikTok надо набрать заново и выбрать из подсказки, иначе отметки не будет.")
