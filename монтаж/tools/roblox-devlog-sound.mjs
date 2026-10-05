#!/usr/bin/env node
// Подключает звуки к девлогу: копирует звуки/*.mp3 и фоновый трек в public/assets/roblox-devlog-01/sound/
// и записывает список найденных файлов в src/animations/roblox-devlog-01/sound-files.ts.
//   node tools/roblox-devlog-sound.mjs
// Запускать заново, когда в папке звуки/ или музыка/ что-то поменялось. Отсутствующие звуки в ролике просто не звучат.

import { copyFileSync, existsSync, mkdirSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const NAMES = ['pop', 'typing', 'click', 'boom', 'tick', 'whoosh'];
const DEST = 'public/assets/roblox-devlog-01/sound';
const OUT = 'src/animations/roblox-devlog-01/sound-files.ts';
// Трек пользователя (любой mp3 в музыка/, кроме фон-альтернатива*). Флаг --alt берёт альтернативный трек с чистой лицензией.
const MUSIC_DIR = 'музыка';

mkdirSync(DEST, { recursive: true });

const found = NAMES.filter((n) => {
  const src = join('звуки', `${n}.mp3`);
  if (!existsSync(src)) return false;
  copyFileSync(src, join(DEST, `${n}.mp3`));
  return true;
});

let music = null;
if (existsSync(MUSIC_DIR)) {
  const files = readdirSync(MUSIC_DIR).filter((f) => f.toLowerCase().endsWith('.mp3'));
  const alt = process.argv.includes('--alt');
  const isAlt = (f) => f.startsWith('фон-альтернатива');
  const pick = files.find((f) => (alt ? isAlt(f) : !isAlt(f))) ?? files[0];
  if (pick) {
    copyFileSync(join(MUSIC_DIR, pick), join(DEST, 'music.mp3'));
    music = 'music.mp3';
    console.log(`Музыка: ${pick}`);
  }
}

writeFileSync(
  OUT,
  `// Сгенерировано tools/roblox-devlog-sound.mjs — какие звуки реально лежат в public.
export const SFX_FILES: readonly string[] = ${JSON.stringify(found)};
export const MUSIC_FILE: string | null = ${JSON.stringify(music)};
`,
);
console.log(`Эффекты: ${found.length ? found.join(', ') : 'нет'}; нет: ${NAMES.filter((n) => !found.includes(n)).join(', ') || '—'}`);
