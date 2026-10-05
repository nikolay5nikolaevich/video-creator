#!/usr/bin/env node
// Собирает субтитры девлога из пословной расшифровки Whisper.
//   node tools/roblox-devlog-subtitles.mjs
// Вход:  монтаж/расшифровка.json  (сегменты с words: [[start, end, word], …], секунды исходника)
// Выход: src/animations/roblox-devlog-01/subtitle-data.ts — фразы во времени ИСХОДНИКА.
// Вырезки здесь не учитываются: слова из вырезанных кусков отбрасывает композиция (edl.ts).
// Готовый subtitle-data.ts можно править руками — но повторный запуск скрипта его перезапишет.

import { readFileSync, writeFileSync } from 'node:fs';

const SRC = 'монтаж/расшифровка.json';
const OUT = 'src/animations/roblox-devlog-01/subtitle-data.ts';

const MAX_WORDS = 5;
const MAX_CHARS = 30;
const MAX_GAP = 0.4;

const segments = JSON.parse(readFileSync(SRC, 'utf8'));
let words = segments
  .flatMap((s) => s.words)
  .map(([start, end, text]) => ({ start, end, text: text.trim() }))
  .filter((w) => w.text);

// Хвосты вида «-то», «-таки», «-за», «.п.» Whisper отдаёт отдельными словами — приклеиваем к предыдущему.
const glued = [];
for (const w of words) {
  const prev = glued[glued.length - 1];
  if (prev && /^(-|\.)/.test(w.text)) {
    prev.text += w.text;
    prev.end = w.end;
  } else {
    glued.push({ ...w });
  }
}
words = glued;

// Ошибки распознавания (список из плана монтажа, раздел 5а).
// Каждое правило: последовательность слов (без пунктуации, без регистра) → замена.
const RULES = [
  [['cloud'], ['Claude']],
  [['не', 'рассеть'], ['нейросеть']],
  [['не', 'рассеять'], ['нейросеть']],
  [['молта'], ['молота']],
  [['которому', 'проверяют'], ['которым', 'проверяет']],
  [['прячь'], ['Прячет']],
  [['замерять'], ['замереть']],
  [['шорцами'], ['шортсами']],
  [['повторно', 'нажатием', 'наверно'], ['повторным', 'нажатием', 'мгновенно']],
  [['выходим', 'со', 'стороны', 'на', 'охотника'], ['посмотрим', 'со', 'стороны', 'охотника']],
  [['обговорим'], ['Обговариваем']],
  [['т.п.'], ['т. п.']],
];

const bare = (t) => t.toLowerCase().replace(/[.,!?…:;–—«»"]+/g, '');
const trailingPunct = (t) => t.match(/[.,!?…:;]+$/)?.[0] ?? '';

for (let i = 0; i < words.length; i++) {
  for (const [from, to] of RULES) {
    const slice = words.slice(i, i + from.length);
    if (slice.length !== from.length || !slice.every((w, k) => bare(w.text) === from[k])) continue;
    const first = slice[0];
    const last = slice[slice.length - 1];
    const punct = trailingPunct(last.text);
    const span = last.end - first.start;
    const replaced = to.map((text, k) => ({
      start: +(first.start + (span * k) / to.length).toFixed(2),
      end: +(first.start + (span * (k + 1)) / to.length).toFixed(2),
      text: k === to.length - 1 ? text + punct : text,
    }));
    // Сохраняем заглавную букву, если исходное слово начинало предложение.
    if (/^[A-ZА-ЯЁ]/.test(first.text) && /^[a-zа-яё]/.test(replaced[0].text)) {
      replaced[0].text = replaced[0].text[0].toUpperCase() + replaced[0].text.slice(1);
    }
    words.splice(i, from.length, ...replaced);
    break;
  }
}

// Разбивка на фразы: сначала куски речи (конец предложения или пауза), потом каждый кусок
// делим на РАВНЫЕ части, чтобы не оставалось слов-сирот («Code?» отдельной фразой).
// Устойчивые пары между частями не разрываем.
const UNBREAKABLE = [['claude', 'code'], ['roblox', 'studio']];
const isPair = (a, b) => UNBREAKABLE.some(([x, y]) => bare(a.text) === x && bare(b.text) === y);
const len = (ws) => ws.reduce((n, w) => n + w.text.length + 1, -1);

const runs = [];
let run = [];
for (const w of words) {
  const prev = run[run.length - 1];
  if (prev && (/[.!?…]$/.test(prev.text) || w.start - prev.end > MAX_GAP)) {
    runs.push(run);
    run = [];
  }
  run.push(w);
}
if (run.length) runs.push(run);

const phrases = [];
for (const r of runs) {
  const parts = Math.max(Math.ceil(r.length / MAX_WORDS), Math.ceil(len(r) / MAX_CHARS));
  let i = 0;
  for (let p = 0; p < parts && i < r.length; p++) {
    let end = p === parts - 1 ? r.length : Math.round(((p + 1) * r.length) / parts);
    if (end < r.length && end > i + 1 && isPair(r[end - 1], r[end])) end--;
    if (end < r.length && isPair(r[end - 1], r[end])) end++;
    phrases.push(r.slice(i, end));
    i = end;
  }
  if (i < r.length) phrases[phrases.length - 1].push(...r.slice(i));
}

// Точки в конце фраз убираем, запятые и вопросы оставляем.
for (const p of phrases) {
  const last = p[p.length - 1];
  last.text = last.text.replace(/\.+$/, (m) => (m === '...' ? '…' : ''));
}

const body = phrases
  .map(
    (p) =>
      `  [${p.map((w) => `[${w.start}, ${w.end}, ${JSON.stringify(w.text)}]`).join(', ')}],`,
  )
  .join('\n');

writeFileSync(
  OUT,
  `// Сгенерировано tools/roblox-devlog-subtitles.mjs из монтаж/расшифровка.json.
// Формат: фраза = массив слов [начало, конец, текст], время в секундах ИСХОДНИКА.
// Правка руками допустима; повторный запуск генератора перезапишет файл.

export type SubWord = readonly [start: number, end: number, text: string];

export const SUBTITLE_PHRASES: readonly (readonly SubWord[])[] = [
${body}
];
`,
);

console.log(`Фраз: ${phrases.length}, слов: ${words.length} → ${OUT}`);
