"""Повторная расшифровка нарезанных кусков с таймкодами каждого слова: work\\cNN\\words.json."""
import json

from common import language, load_audio, load_clips, load_model, parse_args, work_dir

camp, only = parse_args("words.py clipping\\<название> [номер]")
clips = load_clips(camp, only)
model = load_model()

for clip in clips:
    d = work_dir(camp, clip["n"])
    if not (d / "src.mp4").exists():
        print(f"клип {clip['n']}: нет src.mp4, сначала cut.py")
        continue
    segments, _ = model.transcribe(load_audio(d / "src.mp4"), language=language(camp), word_timestamps=True)
    words = [
        {"w": w.word.strip(), "s": round(w.start, 2), "e": round(w.end, 2)}
        for s in segments for w in s.words if w.word.strip()
    ]
    (d / "words.json").write_text(json.dumps(words, ensure_ascii=False, indent=1), encoding="utf-8")
    print(f"клип {clip['n']}: {len(words)} слов")
