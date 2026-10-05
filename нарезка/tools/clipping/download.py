"""Скачивает выпуск с YouTube в source\\ (1080p). Запуск: download.py clipping\\<название> <ссылка>"""
import shutil
import subprocess
import sys
from pathlib import Path

from common import FFMPEG, parse_args

FORMATS = [
    "bv*[height<=1080]+ba/b[height<=1080]",
    # Запасной вариант на 403 Forbidden: HLS, медленнее, но работает.
    "bv*[height<=1080][protocol^=m3u8]+ba[protocol^=m3u8]/bv*[height<=1080]+ba",
]

camp, _ = parse_args("download.py clipping\\<название> <ссылка>")
if len(sys.argv) < 3:
    sys.exit("Нужна ссылка на видео вторым аргументом")
url = sys.argv[2]

(camp / "source").mkdir(exist_ok=True)
base = [sys.executable, "-m", "yt_dlp", "--no-playlist", "--merge-output-format", "mp4",
        "-o", str(camp / "source" / "source.%(ext)s")]
if Path(FFMPEG).is_file():
    base += ["--ffmpeg-location", str(Path(FFMPEG).parent)]
node = shutil.which("node")
if node:
    base += ["--js-runtimes", f"node:{node}"]

for fmt in FORMATS:
    if subprocess.run([*base, "-f", fmt, url]).returncode == 0:
        print("Готово:", camp / "source")
        break
    print("Не получилось, пробую запасной формат…")
else:
    sys.exit("Скачать не удалось")
