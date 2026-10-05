#!/usr/bin/env node
// Открывает Remotion Studio сразу на папке нужной серии анимаций — и только на ней.
//
// Использование:
//   node tools/open-editor.mjs <slug>   — открыть на серии <slug> (напр. claude-5-day-guide)
//   node tools/open-editor.mjs          — без аргумента: серия = самая свежая папка в src/animations
//   npm run editor -- <slug>            — то же через npm (обязателен разделитель `--`)
//
// Желаемое поведение: все ранее раскрытые папки в сайдбаре сворачиваются, и
// раскрывается ровно одна — папка нужной серии, с выбранной первой композицией.
//
// Почему недостаточно `open <url>` (это и был баг):
//   В macOS `open http://localhost:3000/<id>`, когда в браузере уже есть вкладка
//   на том же origin (localhost:3000) с ДРУГИМ путём, лишь активирует эту вкладку,
//   но НЕ переходит на новый путь. Studio остаётся на старой композиции/папке —
//   «редактор открылся, а папка не та». Поэтому нужную вкладку надо ЯВНО навести
//   на целевой URL (а не полагаться на `open`).
//
// Почему недостаточно просто навести вкладку на /<id>:
//   Studio при выборе композиции только ДОБАВЛЯет её папку в раскрытые
//   (localStorage['remotion.expandedFolders']) и никогда не сворачивает остальные.
//   Чтобы «закрыть все ранее открытые», надо переписать этот ключ на ровно одну
//   запись { 'no-parent/<slug>': true } и перезагрузить — тогда раскрыта будет
//   только целевая папка. Сделать это можно лишь из JS на странице.
//
// Механика (macOS + Google Chrome):
//   1. Находим (или создаём) вкладку Studio на localhost:<port>.
//   2. Через AppleScript `execute ... javascript` ставим expandedFolders в одну
//      целевую папку и делаем location.assign('/<id>') — папка-серии раскрыта одна,
//      первая композиция выбрана.
//   3. Если в Chrome выключено «Allow JavaScript from Apple Events» — сворачивать
//      чужие папки нечем, но баг с навигацией всё равно чиним: ЯВНО наводим вкладку
//      на /<id> (set URL of tab) и подсказываем, как включить полное поведение.
//   На прочих платформах / если Chrome не управляется — деградируем до `open`.
//
// id композиции == имя папки (конвенция скиллов script-to-motion-*), поэтому
// первый id серии берётся из имён папок без чтения модулей.

import { readdirSync, statSync, existsSync } from 'node:fs';
import { spawn, execFileSync } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import http from 'node:http';

// Порт Studio: по умолчанию 3000, переопределяется через env PORT (напр. `PORT=3001 node tools/open-editor.mjs <slug>`).
const PORT = Number(process.env.PORT) || 3000;
const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const ANIM_DIR = join(REPO_ROOT, 'src', 'animations');

// slug серии = часть id до первого `-NN` (та же логика, что folderOf в src/Root.tsx)
const seriesOf = (name) => name.match(/^(.+?)-\d{2}/)?.[1] ?? name;

const listAnimationDirs = () =>
  readdirSync(ANIM_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name);

function resolveSeries(arg) {
  const dirs = listAnimationDirs();
  if (dirs.length === 0) throw new Error('В src/animations/ нет папок.');

  if (arg) {
    // принимаем и сам slug, и полный id одной из папок серии
    const slug = seriesOf(arg);
    const members = dirs.filter((n) => seriesOf(n) === slug);
    if (members.length === 0) {
      throw new Error(`Серия "${slug}" не найдена в src/animations/.`);
    }
    return { slug, members, picked: 'аргумент' };
  }

  // авто: самая свежая по mtime папка → её серия
  let newest = null;
  for (const name of dirs) {
    const m = statSync(join(ANIM_DIR, name)).mtimeMs;
    if (!newest || m > newest.m) newest = { name, m };
  }
  const slug = seriesOf(newest.name);
  const members = dirs.filter((n) => seriesOf(n) === slug);
  return { slug, members, picked: `авто по mtime (${newest.name})` };
}

// первый id серии = первая папка по сортировке (id == имя папки)
const firstCompositionId = (members) =>
  [...members].sort((a, b) => a.localeCompare(b))[0];

const probeStudio = (port) =>
  new Promise((resolve) => {
    const req = http.get(
      { host: 'localhost', port, path: '/', timeout: 800 },
      (res) => {
        res.resume();
        resolve(true);
      },
    );
    req.on('error', () => resolve(false));
    req.on('timeout', () => {
      req.destroy();
      resolve(false);
    });
  });

async function waitForStudio(port, timeoutMs = 60000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (await probeStudio(port)) return true;
    await new Promise((r) => setTimeout(r, 500));
  }
  return false;
}

function startStudio(port) {
  const bin = join(REPO_ROOT, 'node_modules', '.bin', 'remotion');
  const exec = existsSync(bin) ? bin : 'npx';
  const args = existsSync(bin)
    ? ['studio', '--no-open', '--port', String(port)]
    : ['remotion', 'studio', '--no-open', '--port', String(port)];
  spawn(exec, args, { cwd: REPO_ROOT, detached: true, stdio: 'ignore' }).unref();
}

// Грубый фолбэк: отдать URL дефолтному обработчику ОС. На macOS, если вкладка
// того же origin уже открыта, путь НЕ сменится — поэтому это лишь последний резерв.
function openUrlFallback(url) {
  const p = process.platform;
  const [cmd, args] =
    p === 'darwin'
      ? ['open', [url]]
      : p === 'win32'
        ? ['cmd', ['/c', 'start', '', url]]
        : ['xdg-open', [url]];
  spawn(cmd, args, { detached: true, stdio: 'ignore' }).unref();
}

// Папка-ключ в localStorage Studio: openFolderKey({folderName, parentName:null}).
// Серии скилла — папки верхнего уровня, поэтому parent = 'no-parent'.
const folderKeyOf = (slug) => `no-parent/${slug}`;

// id/slug — kebab-case из имён папок. Подстрахуемся от инъекции в AppleScript/JS.
const SAFE = /^[A-Za-z0-9._-]+$/;

// macOS + Chrome: навести вкладку Studio на целевую композицию, оставив раскрытой
// только её папку. Возвращает статус: 'collapsed' | 'navigated' | 'unsupported'.
function revealInChromeMac({ id, slug, port }) {
  if (process.platform !== 'darwin') return 'unsupported';
  if (!SAFE.test(id) || !SAFE.test(slug)) return 'unsupported';

  const fullUrl = `http://localhost:${port}/${id}`;
  const folderKey = folderKeyOf(slug);

  // JS выполняется на странице Studio: оставляем раскрытой только целевую папку и
  // переходим на её первую композицию. Только одинарные кавычки внутри — чтобы
  // безопасно вложить в двойные кавычки AppleScript-строки.
  const js =
    `(function(){try{` +
    `localStorage.setItem('remotion.expandedFolders',JSON.stringify({'${folderKey}':true}));` +
    `if(location.pathname!=='/${id}'){location.assign('/${id}');}else{location.reload();}` +
    `return 'OK';}catch(e){return 'ERR:'+String(e);}})()`;

  const applescript = `
tell application "Google Chrome"
  if (count of windows) is 0 then make new window
  activate
  set theTab to missing value
  repeat with w in windows
    set idx to 0
    repeat with t in tabs of w
      set idx to idx + 1
      if (URL of t) contains "localhost:${port}" then
        set theTab to t
        set active tab index of w to idx
        set index of w to 1
        exit repeat
      end if
    end repeat
    if theTab is not missing value then exit repeat
  end repeat
  if theTab is missing value then
    set theTab to make new tab at end of tabs of window 1 with properties {URL:"${fullUrl}"}
    delay 2.5
  end if
  try
    set res to execute theTab javascript "${js}"
    return "COLLAPSED:" & res
  on error errMsg
    if errMsg contains "JavaScript through AppleScript is turned off" then
      set URL of theTab to "${fullUrl}"
      return "JSOFF"
    else
      return "ERR:" & errMsg
    end if
  end try
end tell`;

  let out;
  try {
    out = execFileSync('osascript', ['-e', applescript], {
      encoding: 'utf8',
      timeout: 15000,
    }).trim();
  } catch (e) {
    // Chrome не установлен/не управляется — пусть решает дефолтный обработчик.
    return 'unsupported';
  }

  if (out.startsWith('COLLAPSED:')) return 'collapsed';
  if (out === 'JSOFF') return 'navigated';
  // Любая иная ошибка AppleScript — деградируем до системного открытия.
  return 'unsupported';
}

async function main() {
  const series = resolveSeries(process.argv[2]);
  const id = firstCompositionId(series.members);

  if (!(await probeStudio(PORT))) {
    console.log(`Studio не запущена — стартую на :${PORT}…`);
    startStudio(PORT);
    if (!(await waitForStudio(PORT))) {
      console.error(`Studio не поднялась на :${PORT} за отведённое время.`);
      process.exit(1);
    }
  }

  const url = `http://localhost:${PORT}/${id}`;
  console.log(
    `Серия: ${series.slug} — ${series.members.length} композ. (выбор: ${series.picked})`,
  );

  const status = revealInChromeMac({ id, slug: series.slug, port: PORT });

  if (status === 'collapsed') {
    console.log(
      `Открыл Studio на папке «${series.slug}» (${id}); остальные папки свёрнуты.`,
    );
  } else if (status === 'navigated') {
    console.log(`Навёл Studio на ${id}.`);
    console.log(
      '(опц.) свернуть и чужие папки: Chrome → View → Developer → Allow JavaScript from Apple Events.',
    );
  } else {
    // Резерв для не-macOS / неуправляемого Chrome.
    console.log(`Открываю ${url}`);
    openUrlFallback(url);
  }
}

main().catch((e) => {
  console.error(e?.message ?? e);
  process.exit(1);
});
