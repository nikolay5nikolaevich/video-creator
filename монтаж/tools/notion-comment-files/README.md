# notion-comment-files (MCP)

Достаёт **реальные вложения комментариев Notion** (картинки/файлы), которые
хостовый Notion-коннектор не отдаёт — он показывает только `image-attached-count`.
Сервер ходит в официальный REST API (`GET /v1/comments`), где у каждого
комментария есть `attachments[]` с временной signed-ссылкой `file.url`,
скачивает файлы сразу (ссылка протухает) и возвращает манифест:
`комментарий → текст блока сценария → локальные пути к файлам`.

## 1. Установка

```bash
cd tools/notion-comment-files
npm install
```

Требуется Node 18+ (в проекте — Node 22, нативный `fetch`).

## 2. Notion integration (один раз)

1. https://www.notion.so/my-integrations → **New integration** (internal).
2. Capabilities → включить **Read comments** (и Read content).
3. Скопировать **Internal Integration Secret** (`ntn_…`).
4. Открыть нужную страницу/teamspace в Notion → **⋯ → Connections →
   Add connection →** выбрать свою интеграцию. Без этого шага API вернёт
   `restricted`/`object_not_found` — интеграция не видит страницу.

## 3. Токен

Положи токен в окружение (НЕ коммить):

```bash
export NOTION_API_KEY=ntn_xxx        # в ~/.zshrc или локально
# либо tools/notion-comment-files/.env (см. .env.example) и подгружай сам
```

## 4. Регистрация в Claude Code

В корне репозитория лежит `.mcp.json` — Claude Code подхватит сервер
автоматически (env `NOTION_API_KEY` берётся из шелла через `${NOTION_API_KEY}`).
Проверить: `claude mcp list`. Альтернатива вручную:

```bash
claude mcp add notion-comment-files -- node tools/notion-comment-files/server.mjs
```

## 5. Инструмент

`get_comment_attachments`:

| параметр | смысл |
|---|---|
| `page_url` | URL/id страницы — обойти все блоки (вкл. комментарии уровня страницы) |
| `block_ids` | конкретные блоки — быстрее, если уже знаешь, где вложения |
| `include_resolved` | включать закрытые комментарии (по умолчанию `false`) |
| `out_dir` | куда сохранять (по умолчанию `.notion-cache/<pageId>`) |
| `inline_images` | вернуть картинки ещё и инлайн как image-блоки (по умолчанию `false`) |

Возвращает JSON-манифест + (опц.) сами картинки. Пути из `saved_path` можно
открыть штатным чтением файла.

## Ограничения / нюансы

- Требуется `Notion-Version: 2026-03-11` (вложения комментариев — свежая фича); меняется через `NOTION_VERSION`.
- До 3 вложений на комментарий (лимит Notion).
- Signed-URL временный — сервер качает сразу; повторный прогон перекачивает заново.
- Нет «list all comments on page» в API → блоки опрашиваются по одному
  (с ограниченным параллелизмом). Для точечной задачи передавай `block_ids`.
- `.notion-cache/` добавлен в `.gitignore` — бинарь в репозиторий не кладём.
