"""Режет моменты из исходника и склеивает отрезки в work\\cNN\\src.mp4."""
from common import duration, ffmpeg, find_source, load_clips, parse_args, work_dir

MIN_LEN, MAX_LEN = 20, 70   # секунды; сверяйте с брифом кампании
SAFE_PART = 0.85            # дальше — финал выпуска, обычно его показывать нельзя

camp, only = parse_args("cut.py clipping\\<название> [номер]")
src = find_source(camp)
total = duration(src)

for clip in load_clips(camp, only):
    n, parts = clip["n"], clip["parts"]
    length = sum(b - a for a, b in parts)
    if not MIN_LEN <= length <= MAX_LEN:
        print(f"  ! клип {n}: длина {length:.0f} с вне {MIN_LEN}–{MAX_LEN} с")
    if max(b for _, b in parts) > total * SAFE_PART:
        print(f"  ! клип {n}: заходит в последние {1 - SAFE_PART:.0%} выпуска — проверьте запрет на финал")

    args, pads = [], ""
    for i, (a, b) in enumerate(parts):
        args += ["-ss", str(a), "-t", str(b - a), "-i", str(src)]
        pads += f"[{i}:v][{i}:a]"
    ffmpeg([
        *args,
        "-filter_complex", f"{pads}concat=n={len(parts)}:v=1:a=1[v][a]",
        "-map", "[v]", "-map", "[a]",
        "-c:v", "libx264", "-preset", "veryfast", "-crf", "16",
        "-c:a", "aac", "-b:a", "192k",
        str(work_dir(camp, n) / "src.mp4"),
    ])
    print(f"клип {n}: {length:.0f} с, отрезков: {len(parts)}")
