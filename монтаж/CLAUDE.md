# Видеомонтаж

Монтаж вертикальных рилзов и моушн-графика (бролл) для них на Remotion. Единственный проект в `видео/`, где используется Notion.

## Команды

- `npm run studio` — Remotion Studio.
- `npm run render` — рендер (`tools/render.mjs`).
- `npm run typecheck` — проверка типов.
- `npm run check:devlog` / `npm run export:devlog` — проверка и экспорт девлога Roblox.

## Notion

- `.mcp.json` подключает локальный сервер `notion-comment-files` (`tools/notion-comment-files/`). Он нужен только здесь.
- Скилл `script-to-motion-v` (`.claude/skills/`) читает сценарий из таблицы Notion и генерирует композиции в `src/animations/<slug>-<NN>-<mode>/`.

## Что где лежит

- `src/` — композиции Remotion (`Root.tsx`, `animations/`, `components/`, `shared/`).
- `tools/` — скрипты рендера, экспорта, субтитров и звука.
- `сценарий.txt`, `монтаж/` (план, расшифровка, склейки) — материалы текущего ролика.
- `myvideo/`, `видео/`, `звуки/`, `музыка/`, `превью/` — исходники; `out/`, `готовые видео/` — результат.
