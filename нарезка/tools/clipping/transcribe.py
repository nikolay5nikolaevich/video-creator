"""Расшифровка всего выпуска: source\\transcript.json и читаемый transcript.txt с таймкодами."""
import json

from common import find_source, language, load_audio, load_model, parse_args

camp, _ = parse_args("transcribe.py clipping\\<название>")
src = find_source(camp)
print("Расшифровываю:", src.name)

model = load_model()
segments, info = model.transcribe(load_audio(src), language=language(camp), vad_filter=True)

rows = []
for s in segments:
    rows.append({"start": round(s.start, 2), "end": round(s.end, 2), "text": s.text.strip()})
    print(f"\r{s.end / info.duration:6.1%}", end="", flush=True)
print()


def hms(t):
    t = int(t)
    return f"{t // 3600:02d}:{t % 3600 // 60:02d}:{t % 60:02d}"


# Пишем одним куском в конце: файл либо целый, либо его нет.
out = camp / "source"
(out / "transcript.json").write_text(json.dumps(rows, ensure_ascii=False, indent=1), encoding="utf-8")
(out / "transcript.txt").write_text(
    "".join(f"[{hms(r['start'])} | {r['start']:.1f}–{r['end']:.1f}] {r['text']}\n" for r in rows),
    encoding="utf-8",
)
print(f"Готово: {len(rows)} фраз, {out / 'transcript.txt'}")
