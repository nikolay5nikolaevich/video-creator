"""Применить просмотренные сценки, обновить локальные каталоги и проверить ссылки."""
import json
import re
import os
from pathlib import Path
from urllib.parse import quote, unquote

A = Path(__file__).resolve().parents[1]
S = A / 'служебное'
scenes = json.loads((S / 'сценки.json').read_text(encoding='utf-8'))
assert len(scenes) == 37

def link(label, target, base):
    return '[' + label.replace('|', '/') + '](' + quote(os.path.relpath(target, base).replace('\\', '/'), safe='/.-') + ')'

for card in A.rglob('описание.md'):
    body = card.read_text(encoding='utf-8')
    if 'дополнительные-из-каталога' in card.parts:
        body = re.sub(r'Каталог размещает этот файл.*?https://www.youtube.com/watch\?v=hRousVIACr0 \.',
            'Файл находился в блоке рекомендаций каталога, после основного набора Pizza Place. Его происхождение из этой игры не подтверждено; это дополнительный материал вне исходного списка.', body, flags=re.S)
    matched = next((vid for vid in scenes if vid in body), None)
    if matched:
        body = body.replace('Подробная сценка на видео пока не просмотрена; её детали не выдуманы.', '')
        body = re.sub(r'\n## Сценка в видео-референсе\n.*?(?=\n## |\Z)', '', body, flags=re.S)
        frames = S / 'видео-референсы' / (matched + '.jpg')
        assert frames.exists(), matched
        body += '\n## Сценка в видео-референсе\n\n' + scenes[matched] + '\n\n' + link('Просмотренные кадры', frames, card.parent) + '\n\n'
        body += 'Сюжет описан по выборочным кадрам. Связь с названием звука установлена по подписи YouTube, названию видео или авторским кредитам; точный момент звучания внутри сценки на слух не размечен.\n'
    if '25-FALL FROM THE SKY PT. 2 (SLOWED)' in card.parts and '## Уточнение версии' not in body:
        body += '\n## Уточнение версии\n\nСкачана официальная публикация **VIRAL SLOWED**, 122 с. В исходном списке указан **SLOWED**; это другая версия. Точное совпадение с исходным Shorts не подтверждено. Этот файл не следует считать проверенной заменой версии SLOWED.\n'
    card.write_text(body, encoding='utf-8')

groups = ['фоновая-музыка', 'голоса-персонажей', 'звуковые-эффекты', 'авторские-дорожки', 'дополнительные-из-каталога', 'источники']
all_files = []
lines = ['# Аудиобиблиотека для Roblox Animation', '', 'Собрано 6 октября 2026 года. Основной список: [топ-звуки-shorts.md](../топ-звуки-shorts.md).', '',
    'Каждый рабочий звук лежит в своей папке рядом с `описание.md`. В карточке есть источник, таймкод или длительность, назначение и контекст. У музыкальных референсов и авторских Shorts добавлены сценки по просмотренным кадрам. Рекомендации для монтажа отделены от наблюдений.', '',
    '## Статус подборок', '', '| Подборка | Файлов | Метод |', '|---|---:|---|']
packs = A / 'звуковые-эффекты/из-подборок'
for folder in sorted(packs.iterdir()):
    clips = sorted(folder.rglob('звук.mp3'))
    method = 'Паузы + зрительские таймкоды; 3 сирены и Vine Boom подтверждены аудиосопоставлением' if folder.name == 'Goofy-Ahh' else 'Авторские таймкоды; 4 группы разделены по подписям и паузам' if folder.name == 'Top-60' else 'По таймкодам / главам автора'
    lines.append(f'| {link(folder.name, folder / "каталог.md", A)} | {len(clips)} | {method} |')
    sub = ['# ' + folder.name, '', '| Звук | Таймкод | Описание |', '|---|---|---|']
    for p in clips:
        card = p.parent / 'описание.md'
        text = card.read_text(encoding='utf-8')
        title = text.splitlines()[0].lstrip('# ')
        timestamp = re.search(r'Фрагмент источника: \*\*(.*?)\*\*', text)[1]
        sub.append(f'| {link(title, p, folder)} | {timestamp} | {link("карточка", card, folder)} |')
    (folder / 'каталог.md').write_text('\n'.join(sub) + '\n', encoding='utf-8')
pizza = A / 'голоса-персонажей/Pizza-Place-из-видео'
clips = sorted(pizza.rglob('звук.mp3'))
assert len(list(pizza.glob('*/звук.mp3'))) == 17 and len(clips) == 43
sub = ['# Pizza Place — звуки из самого видео', '', '17 подписанных эмоций. Ещё 26 файлов — 14 нот Sing и 12 хлопков Clap; это части эмоций, а не 26 новых эмоций.', '', '| Звук | Границы в исходнике | Описание |', '|---|---|---|']
for p in clips:
    card = p.parent / 'описание.md'
    body = card.read_text(encoding='utf-8')
    sub.append(f'| {link(body.splitlines()[0].lstrip("# "),p,pizza)} | {re.search(r"Точные границы в исходнике: \*\*(.*?)\*\*",body)[1]} | {link("карточка",card,pizza)} |')
(pizza/'каталог.md').write_text('\n'.join(sub)+'\n',encoding='utf-8')
lines += [f'| {link("Pizza Place — из видео",pizza/"каталог.md",A)} | 17 + 26 частей | По подписям эмоций в кадре и паузам |', '',
    'Pizza Place нарезан непосредственно из ролика: 17 эмоций и отдельно 14 нот Sing / 12 хлопков Clap. Прежние 33 публикации с саундбордов сохранены как варианты в соседней папке `Pizza-Place`.', '',
    '«500+» — название автора. В бесплатном ролике доступно 219 позиций; полный набор автор предлагает отдельно. В четырёх подборках с авторской разметкой теперь 320 фрагментов. У Popular Meme последняя глава TITANIC FLUTE FAIL нулевой длины: отдельного звука нет. У Top 10 Transition исключена вступительная заставка.', '',
    'Старая нарезка Goofy Ahh и четыре групповых фрагмента Top 60 перенесены в `источники`, чтобы не мешать рабочим вариантам. Goofy Ahh: 18 интервалов, 17 имеют названия. Сирена (три повторения) и Vine Boom подтверждены аудиосопоставлением; остальные названия взяты из зрительской разметки @GiantGoose67 в комментариях, не подтверждены на слух. Один короткий эффект около 39 с не опознан; возможный кашель в конце Cartoony Run не удалось достоверно отделить. Полностью точной эту подборку считать пока нельзя.', '',
    '## Версии и ограничения', '',
    '- Музыкальных позиций из таблицы: 30. Все имеют полный аудиофайл основной публикации; прежние 30-секундные предпросмотры и один вариант сохранены в подпапках `версия-SoundCloud`.',
    '- Позиция 25: скачана **VIRAL SLOWED**. Точная **SLOWED** из исходного списка не получена; отличие явно отмечено в карточке.',
    '- Записи `авторские-дорожки` и `источники` могут содержать музыку вместе с голосами. Это полные дорожки, а не гарантированно изолированные реплики.',
    '- Roblox Death Comparison: полная дорожка сохранена; отдельно вырезаны мемная реплика 6,78–7,22 с и исходный Oof 11,80–12,22 с. Фон этих сцен остаётся в аудио. Чистый Oof есть отдельно среди голосов.',
    '- Newgrounds «When You Deliver to Yourself on Pizza Place»: полная дорожка 67,925 с и описание просмотренной сценки добавлены в `авторские-дорожки`.',
    '- По отдельным демонстрациям эффектов сюжетной сценки может не быть: в карточке так и написано.', '',
    '## Быстрый поиск', '', 'Поиск по этому файлу или каталогам подборок: Vine Boom, Taco Bell, Metal Pipe, Bonk, Anime Punch, Slap, Punch, Nani, Huh, What, Mario, Wasted, Tape, Windows, Discord, Crickets, Heavenly, Drum, Ding.', '']
for group in groups:
    files = sorted((A / group).rglob('*.mp3'))
    all_files += files
    lines += ['## ' + group, '', f'Файлов: {len(files)}.', '', '| Запись | MP3 | Описание |', '|---|---|---|']
    for p in files:
        card = p.parent / ('описание.md' if p.name in ('звук.mp3', 'трек.mp3') else p.stem + '.md')
        assert card.exists(), card
        name = str(p.parent.relative_to(A / group)).replace('\\', ' / ') if group != 'источники' else card.read_text(encoding='utf-8').splitlines()[0].lstrip('# ')
        lines.append(f'| {name.replace("|", "/")} | {link("слушать", p, A)} | {link("карточка", card, A)} |')
    lines.append('')
lines += ['## Проверка файлов', '', f'MP3 в библиотеке (без служебного кеша): **{len(all_files)}**. Все проверены полным декодированием FFmpeg; отсутствующих карточек и ошибок декодирования: **0**.', '', 'Повторить проверку: `python аудио/служебное/собрать.py check` из корня проекта.', '']
(A / 'каталог.md').write_text('\n'.join(lines), encoding='utf-8')
for doc in [A / 'каталог.md', pizza/'каталог.md', *packs.glob('*/каталог.md')]:
    for address in re.findall(r'\]\(([^)]+)\)', doc.read_text(encoding='utf-8')):
        assert (doc.parent / unquote(address)).exists(), (doc, address)
music = [p for p in (A / 'фоновая-музыка').glob('*/трек.mp3')]
assert len(music) == 30
print('Каталоги: ссылки проверены. Основных музыкальных позиций: 30. MP3:', len(all_files))
