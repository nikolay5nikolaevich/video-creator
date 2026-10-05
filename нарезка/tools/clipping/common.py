"""Общий код конвейера клиппинга: пути, аргументы, запуск ffmpeg, модель Whisper."""
import json
import shutil
import subprocess
import sys
from pathlib import Path

# Консоль Windows (cp1251) падает на кириллице и спецсимволах — печатаем в UTF-8.
for _stream in (sys.stdout, sys.stderr):
    try:
        _stream.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass

ROOT = Path(__file__).resolve().parents[2]
TOOLS = ROOT / "tools"


def _exe(name):
    # Сначала локальная сборка в tools\ffmpeg, потом то, что есть в PATH.
    local = TOOLS / "ffmpeg" / "bin" / f"{name}.exe"
    return str(local) if local.exists() else (shutil.which(name) or name)


FFMPEG = _exe("ffmpeg")
FFPROBE = _exe("ffprobe")
# Если модель скачана вручную в tools\whisper_small — берём её, иначе скачается сама.
WHISPER_MODEL = str(TOOLS / "whisper_small") if (TOOLS / "whisper_small").exists() else "small"
LANGUAGE = "ru"
VIDEO_EXT = {".mp4", ".mkv", ".webm", ".mov"}


def parse_args(usage):
    """Возвращает (папка кампании, номер клипа или None)."""
    if len(sys.argv) < 2:
        sys.exit(f"Запуск: python tools\\clipping\\{usage}")
    camp = Path(sys.argv[1]).resolve()
    if not camp.is_dir():
        sys.exit(f"Нет папки кампании: {camp}")
    only = int(sys.argv[2]) if len(sys.argv) > 2 and sys.argv[2].isdigit() else None
    return camp, only


def load_clips(camp, only=None):
    path = camp / "clips.json"
    if not path.exists():
        sys.exit(f"Нет {path}: сначала выберите моменты и запишите clips.json")
    # utf-8-sig: Блокнот и PowerShell сохраняют с BOM, обычный utf-8 на нём падает.
    clips = json.loads(path.read_text(encoding="utf-8-sig"))
    if only is not None:
        clips = [c for c in clips if c["n"] == only]
        if not clips:
            sys.exit(f"В clips.json нет клипа с n={only}")
    return clips


def work_dir(camp, n):
    d = camp / "work" / f"c{n:02d}"
    d.mkdir(parents=True, exist_ok=True)
    return d


def find_source(camp):
    videos = [p for p in (camp / "source").glob("*") if p.suffix.lower() in VIDEO_EXT]
    if not videos:
        sys.exit(f"В {camp / 'source'} нет видео: скачайте выпуск (download.py) или положите файл")
    return max(videos, key=lambda p: p.stat().st_size)


def ffmpeg(args, cwd=None):
    subprocess.run([FFMPEG, "-hide_banner", "-loglevel", "error", "-y", *args], cwd=cwd, check=True)


def duration(path):
    out = subprocess.run(
        [FFPROBE, "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(path)],
        capture_output=True, text=True, check=True,
    )
    return float(out.stdout.strip())


def load_audio(path):
    """Звук 16 кГц моно для Whisper. Декодируем своим ffmpeg: встроенный в faster-whisper PyAV капризен к версиям."""
    import numpy as np
    raw = subprocess.run(
        [FFMPEG, "-v", "error", "-i", str(path), "-vn", "-ac", "1", "-ar", "16000", "-f", "f32le", "-"],
        capture_output=True, check=True,
    ).stdout
    return np.frombuffer(raw, dtype=np.float32)


def language(camp):
    """Язык речи: строка «Язык: en» в brief.md, иначе LANGUAGE."""
    brief = camp / "brief.md"
    if brief.exists():
        for line in brief.read_text(encoding="utf-8-sig").splitlines():
            if line.lower().startswith("язык:"):
                return line.split(":", 1)[1].strip() or LANGUAGE
    return LANGUAGE


def load_model():
    from faster_whisper import WhisperModel
    return WhisperModel(WHISPER_MODEL, device="cpu", compute_type="int8")
