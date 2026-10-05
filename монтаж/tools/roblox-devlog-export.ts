// Экспорт для YouTube: субтитры .srt и главы для описания (план монтажа, разделы 5а и 5б).
// Запуск: npm run export:devlog. Вторым аргументом можно передать секунды исходника —
// скрипт напечатает соответствующие кадры ролика (удобно для `remotion still`).

import { mkdirSync, writeFileSync } from 'node:fs';
import { AROLL_FRAMES, CUT_C6, FPS, isKept, srcToOutFrame } from '../src/animations/roblox-devlog-01/edl';
import { SUBTITLE_PHRASES } from '../src/animations/roblox-devlog-01/subtitle-data';

const OUT_DIR = 'out/roblox-devlog';
mkdirSync(OUT_DIR, { recursive: true });

const srtTime = (frame: number) => {
  const ms = Math.round((frame / FPS) * 1000);
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  const r = ms % 1000;
  const p = (n: number, w = 2) => String(n).padStart(w, '0');
  return `${p(h)}:${p(m)}:${p(s)},${p(r, 3)}`;
};

// Окно GFX-1 в ролике закрыто заголовком, но в .srt текст нужен — его там не скрываем.
const cues: { a: number; b: number; text: string }[] = [];
for (const p of SUBTITLE_PHRASES) {
  const kept = p.filter(([s, e]) => isKept((s + e) / 2));
  const first = kept[0];
  const last = kept[kept.length - 1];
  if (!first || !last) continue;
  cues.push({ a: srcToOutFrame(first[0]), b: srcToOutFrame(last[1]) + 18, text: kept.map((w) => w[2]).join(' ') });
}
cues.forEach((c, i) => {
  const next = cues[i + 1];
  if (next) c.b = Math.min(c.b, next.a);
});
writeFileSync(
  `${OUT_DIR}/roblox-devlog-01.srt`,
  cues.map((c, i) => `${i + 1}\n${srtTime(c.a)} --> ${srtTime(c.b)}\n${c.text}\n`).join('\n'),
);

const CHAPTERS: [number, string][] = [
  [0, 'Можно ли заработать на игре в Roblox с ИИ'],
  [61.01, 'Откуда идея'],
  [CUT_C6 ? 171.3 : 164.9, 'Как я делаю игру с нейросетью'],
  [256.47, 'Карта 1: лаборатория'],
  [337.6, 'Карта 2: пиратский корабль'],
  [392.29, 'Семь способностей'],
  [516.29, 'Планы и продвижение'],
  [592.42, 'Финал'],
];
const mmss = (frame: number) => {
  const t = Math.floor(frame / FPS);
  return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`;
};
const chapters = CHAPTERS.map(([s, name], i) => `${i === 0 ? '0:00' : mmss(srcToOutFrame(s))} ${name}`).join('\n');
writeFileSync(`${OUT_DIR}/главы.txt`, `${chapters}\n`);

console.log(chapters);
console.log(`Субтитров: ${cues.length}. Длина речи: ${mmss(AROLL_FRAMES)}`);

const probe = process.argv.slice(2).map(Number).filter((n) => !Number.isNaN(n));
if (probe.length) console.log('Кадры:', probe.map((s) => `${s}→${srcToOutFrame(s)}`).join(' '));
