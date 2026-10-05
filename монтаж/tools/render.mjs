#!/usr/bin/env node
// Тонкая обёртка над `remotion render` для удобного рендера НЕСКОЛЬКИХ композиций
// за один вызов. Сама раскладка по каталогам out/<slug>/<id>.<ext> делается НЕ
// здесь, а через `defaultOutName` каждой композиции в src/Root.tsx (он же
// применяется и в веб-Studio) — единый источник правды, обёртка в него не лезет.
//
// Использование:
//   node tools/render.mjs <id> [<id2> ...] [флаги remotion]
//   npm run render <id>                                  — один бролл
//   npm run render claude-97-guide-12 claude-97-guide-15 — пачкой (каждый в свою папку)
//   npm run render -- <id> --codec=prores --prores-profile=4444 \
//     --pixel-format=yuva444p10le --image-format=png     — OVERLAY с альфой (.mov)
//
// Правила:
//   • Позиционные аргументы (без ведущего `-`) — id композиций, рендерятся по очереди.
//   • Флаги пробрасываются в `remotion render` как есть и применяются ко всем id.
//   • Путь/имя файла НЕ задаём — его берёт remotion из defaultOutName композиции
//     (out/<slug>/<id>.<ext>); подпапку remotion создаёт сам. Контейнер — по кодеку.
//   • Для одной композиции это эквивалентно `remotion render <id>` (см. render:raw).

import { spawnSync } from 'node:child_process';

const ENTRY = 'src/index.ts';

const argv = process.argv.slice(2);
const ids = argv.filter((t) => !t.startsWith('-'));
const flags = argv.filter((t) => t.startsWith('-'));

if (ids.length === 0) {
  console.error(
    'Usage: node tools/render.mjs <composition-id> [<id2> ...] [remotion flags]',
  );
  process.exit(1);
}

let failed = 0;
for (const id of ids) {
  console.log(`\n▶ ${id}`);
  const res = spawnSync('npx', ['remotion', 'render', ENTRY, id, ...flags], {
    stdio: 'inherit',
    shell: process.platform === 'win32', // на Windows npx — это npx.cmd, без shell не стартует
  });
  if (res.status !== 0) {
    failed++;
    console.error(`✗ Рендер ${id} завершился с кодом ${res.status}`);
  }
}

process.exit(failed > 0 ? 1 : 0);
