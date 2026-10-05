// Проверка таймлайна девлога на правила кадра (план монтажа, раздел 5).
// Запуск: npm run check:devlog (компилирует tsc во временную папку и запускает node).
// Ищет «окна лица» — промежутки A-roll, не закрытые полноэкранными слоями,
// короче 2 с или без речи. Время печатает и в исходнике, и в готовом ролике.

import { AROLL_FRAMES, FPS, isKept, srcToOutFrame } from '../src/animations/roblox-devlog-01/edl';
import { LAYERS } from '../src/animations/roblox-devlog-01/timeline';
import { SUBTITLE_PHRASES } from '../src/animations/roblox-devlog-01/subtitle-data';

const MIN_FACE = 2 * FPS;

const covered = new Uint8Array(AROLL_FRAMES);
for (const l of LAYERS) {
  if (!l.full) continue;
  const a = srcToOutFrame(l.from);
  const b = srcToOutFrame(l.to);
  for (let f = a; f < b && f < AROLL_FRAMES; f++) covered[f] = 1;
}

const speech = new Uint8Array(AROLL_FRAMES);
for (const p of SUBTITLE_PHRASES) {
  for (const [s, e] of p) {
    if (!isKept((s + e) / 2)) continue;
    for (let f = srcToOutFrame(s); f < srcToOutFrame(e); f++) speech[f] = 1;
  }
}

const mmss = (frame: number) => {
  const t = frame / FPS;
  return `${Math.floor(t / 60)}:${(t % 60).toFixed(1).padStart(4, '0')}`;
};

let problems = 0;
let f = 0;
while (f < AROLL_FRAMES) {
  if (covered[f]) {
    f++;
    continue;
  }
  const start = f;
  while (f < AROLL_FRAMES && !covered[f]) f++;
  const len = f - start;
  let spoken = 0;
  for (let i = start; i < f; i++) spoken += speech[i] ?? 0;
  const isEdge = start === 0 || f === AROLL_FRAMES;
  if (!isEdge && (len < MIN_FACE || spoken < FPS * 0.5)) {
    problems++;
    console.log(
      `ЛИЦО ${mmss(start)}–${mmss(f)} (${(len / FPS).toFixed(2)} с, речи ${(spoken / FPS).toFixed(2)} с) — нарушает правило 2`,
    );
  }
}

console.log(`Длина ролика: ${mmss(AROLL_FRAMES)} + заставка. Нарушений: ${problems}`);
process.exitCode = problems ? 1 : 0;
