"""Скачать источники из топ-звуки-shorts.md; разрезать размеченные подборки.
Запуск: python аудио/служебное/собрать.py collect|music|check
"""
import concurrent.futures as cf
import hashlib
import json
import re
import subprocess
import sys
import time
import urllib.request
import html
import shutil
from pathlib import Path

import yt_dlp

sys.stdout.reconfigure(encoding='utf-8', errors='replace')
sys.stderr.reconfigure(encoding='utf-8', errors='replace')

ROOT = Path(__file__).resolve().parents[2]
AUDIO = ROOT / 'аудио'
SERVICE = AUDIO / 'служебное'
FFMPEG = next((ROOT / '02-видео-2/сборка/инструменты/imageio_ffmpeg/binaries').glob('*.exe'))
DOC = (ROOT / 'топ-звуки-shorts.md').read_text(encoding='utf-8')
OPTS = dict(quiet=True, no_warnings=True, noplaylist=True, socket_timeout=20,
            retries=1, extractor_retries=1, js_runtimes={'node': {}},
            ffmpeg_location=str(FFMPEG), windowsfilenames=True, noprogress=True)
PACKS = {'kxKCRaAEwAY': 'Top-60', 'a9P_j1gMXBo': 'Popular-Meme',
         'MZIK5pQuJD8': 'Top-10-Transition', 'pOlDL3_MYnI': '500-Meme',
         'NPbWhDaESds': 'Goofy-Ahh', 'hRousVIACr0': 'Pizza-Place'}


def clean(s):
    return re.sub(r'[<>:"/\\|?*\x00-\x1f]', '-', s).strip(' .')[:105]


def url(vid):
    return 'https://www.youtube.com/watch?v=' + vid


def info(vid):
    path = SERVICE / 'метаданные' / (vid + '.json')
    if path.exists():
        return json.loads(path.read_text(encoding='utf-8'))
    with yt_dlp.YoutubeDL(OPTS) as ydl:
        data = ydl.extract_info(url(vid), download=False)
    result = {k: data.get(k) for k in ('id', 'title', 'description', 'duration', 'uploader',
                                     'upload_date', 'webpage_url', 'chapters', 'thumbnail')}
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding='utf-8')
    return result


def source(vid):
    folder = AUDIO / 'источники'
    folder.mkdir(parents=True, exist_ok=True)
    dest = folder / (vid + '.mp3')
    data = info(vid)
    if not dest.exists():
        opts = {**OPTS, 'format': 'bestaudio/best', 'outtmpl': str(folder / (vid + '.%(ext)s')),
                'postprocessors': [{'key': 'FFmpegExtractAudio', 'preferredcodec': 'mp3', 'preferredquality': '192'}]}
        with yt_dlp.YoutubeDL(opts) as ydl:
            ydl.download([url(vid)])
    if not dest.exists() or dest.stat().st_size < 100:
        raise RuntimeError('Аудио не получено: ' + vid)
    (folder / (vid + '.md')).write_text(
        f"# {data['title']}\n\nАвтор: {data['uploader']}\n\nИсточник: {url(vid)}\n\n"
        'Полная звуковая дорожка источника. Она может содержать музыку, речь и несколько эффектов.\n', encoding='utf-8')
    return data, dest


def timecode(t):
    return f'{int(t)//60:02}:{int(t)%60:02}'


def timestamps(data):
    entries = []
    for line in (data.get('description') or '').splitlines():
        match = re.match(r'^\s*(\d{1,2}:\d{2}(?::\d{2})?)\s*[-–—]?\s*(.+)', line)
        if match:
            parts = [int(p) for p in match[1].split(':')]
            seconds = 0
            for part in parts:
                seconds = seconds * 60 + part
            if seconds < data['duration']:
                entries.append((seconds, match[2]))
    if not entries:
        entries = [(c['start_time'], c['title']) for c in data.get('chapters') or []
                   if c['end_time'] > c['start_time']]
    entries = sorted(dict(entries).items())
    return [(t, entries[i+1][0] if i+1 < len(entries) else data['duration'], name)
            for i, (t, name) in enumerate(entries)]


def purpose(name):
    n = name.lower()
    rules = [
        (r'cry|sad|fine ketty|titanic', 'Грусть или плач. Сцена для Roblox: герой теряет вещь или проигрывает.'),
        (r'laugh|lol|hehe|hahaha', 'Смех или насмешка. Сцена: персонаж смеётся после розыгрыша.'),
        (r'scream|scared|ahh|fah|surpris|shock|gasp', 'Испуг, крик или удивление. Сцена: внезапно появляется опасность.'),
        (r'huh|hmm|what|nani|confused', 'Вопрос или недоумение. Сцена: нуб замечает странную деталь и замирает.'),
        (r'angry|grrr|mad|rage', 'Злость. Сцена: персонаж понимает, что его разыграли.'),
        (r'bonk|punch|slap|pipe|damage|bone|hit', 'Удар или акцент на столкновении. Сцена: удар, падение предмета, комическая драка.'),
        (r'boom|explosion|flashbang|gong|taco', 'Резкий звуковой акцент. Сцена: взрыв, внезапный провал или крупный план лица.'),
        (r'run|fast|slip|throw|teleport|jet|helicopter', 'Движение или погоня. Сцена: герой бежит, скользит или резко меняет положение.'),
        (r'death|dead|kill|wasted|failed|ko\b|oof', 'Поражение или игровой проигрыш. Сцена: неудача нуба в финале трюка.'),
        (r'later|rewind|scratch|signal', 'Переход или изменение времени. Сцена: пропуск ожидания, перемотка либо обрыв действия.'),
        (r'error|discord|ringtone|notification|windows|beep|buzzer', 'Сигнал интерфейса. Сцена: звонок, сообщение, ошибка или неверное действие.'),
        (r'heaven|magic|ding|correct|perfect|cheer|yeah|yay|glee|woah|amazed|wow', 'Радость, открытие или успех. Сцена: найден подарок, появилась идея или герой победил.'),
        (r'dramatic|suspense|riser|drum|dun dun|build up|awkward|cricket', 'Пауза или ожидание. Сцена: подготовка к развязке либо неловкая тишина.'),
        (r'^hi\b|^hello\b', 'Короткое приветствие. Сцена: появление персонажа или встреча друзей.'),
        (r'^bye\b', 'Короткое прощание. Сцена: персонаж машет рукой и уходит.'),
    ]
    for pattern, text in rules:
        if re.search(pattern, n):
            return text
    return f'Короткая реплика или эффект «{name}». Подбирать под действие, соответствующее названию; точное звучание нужно прослушать.'


def card(folder, name, data, start, end, context, recommendation=None, filename='звук.mp3'):
    folder.mkdir(parents=True, exist_ok=True)
    clip_link = url(data['id']) + ('&t=' + str(int(start)) + 's' if start else '')
    (folder / 'описание.md').write_text(
        f'# {name}\n\nАудио: [{filename}]({filename})\n\n'
        f"Источник: [{data['title']}]({clip_link})\n\nАвтор источника: {data.get('uploader') or 'не указан'}\n\n"
        f'Фрагмент источника: **{timecode(start)}–{timecode(end)}** ({end-start:.2f} с).\n\n'
        f'## Что это за звук\n\n{recommendation or purpose(name)}\n\n'
        f'## Где и как использован\n\n{context}\n\n'
        '## Как применить\n\nСцена выше, если она названа рекомендацией, — предложение для монтажа, а не наблюдение из исходного ролика. '
        'Синхронизировать начало с действием персонажа; после реплики оставить короткую паузу.\n\n'
        '## Проверка источника\n\nНазвание, автор и таймкод взяты из метаданных источника. '
        'Автоматическая вырезка следует границам авторской разметки; перед монтажом прослушать начало и конец. '
        'Карточка не подтверждает разрешение на публикацию или монетизацию.\n', encoding='utf-8')


def cut(path, folder, start, end, filename='звук.mp3'):
    folder.mkdir(parents=True, exist_ok=True)
    dest = folder / filename
    if not dest.exists():
        subprocess.run([str(FFMPEG), '-v', 'error', '-nostdin', '-i', str(path), '-ss', str(start),
                        '-t', str(end-start), '-vn', '-c:a', 'libmp3lame', '-b:a', '192k', str(dest)], check=True)
    return dest


def pack(vid):
    data, path = source(vid)
    entries = timestamps(data)
    if not entries:
        print(f'БЕЗ РАЗМЕТКИ {PACKS[vid]} ({data["duration"]} с)', flush=True)
        return
    for i, (start, end, name) in enumerate(entries, 1):
        title = re.sub(r'\s*\[.*', '', name).strip()
        folder = AUDIO / 'звуковые-эффекты' / 'из-подборок' / PACKS[vid] / f'{i:03}-{clean(title)}'
        cut(path, folder, start, end)
        card(folder, title, data, start, end,
             'Источник — демонстрационная подборка. На этом таймкоде автор обозначает эффект названием '
             f'«{title}». Подтверждённой отдельной сюжетной сценки или Roblox-ролика для этого фрагмента нет.')
    print(f'ПОДБОРКА {PACKS[vid]}: {len(entries)} отдельных звуков', flush=True)


def direct(vid, category, name, scene):
    data, path = source(vid)
    folder = AUDIO / category / clean(name)
    cut(path, folder, 0, data['duration'])
    card(folder, name, data, 0, data['duration'], scene)
    print('ЗВУК ' + name, flush=True)


def music():
    section = DOC.split('## Фоновая музыка', 1)[1].split('## Авторские звуки', 1)[0]
    rows = [line.split('|')[1:-1] for line in section.splitlines() if re.match(r'\| \d+ \|', line)]
    for row in rows:
        number, name, artist = [x.strip() for x in row[:3]]
        example = re.search(r'https://www.youtube.com/shorts/([\w-]+)', row[-1])[1]
        folder = AUDIO / 'фоновая-музыка' / (number.zfill(2) + '-' + clean(name))
        candidates = SERVICE / 'поиск-музыки' / (number.zfill(2) + '.json')
        if not candidates.exists():
            with yt_dlp.YoutubeDL({**OPTS, 'extract_flat': True}) as ydl:
                results = ydl.extract_info('ytsearch3:' + name + ' ' + artist, download=False)
            candidates.parent.mkdir(parents=True, exist_ok=True)
            candidates.write_text(json.dumps({'name': name, 'artist': artist, 'example': example,
                'entries': [{k: e.get(k) for k in ('id', 'title', 'duration', 'uploader')} for e in results['entries']]},
                ensure_ascii=False, indent=2), encoding='utf-8')
        choices = json.loads(candidates.read_text(encoding='utf-8'))
        print(number + ' ' + name + ' => ' + ' | '.join(e['id'] + ':' + e['title'] for e in choices['entries']), flush=True)


def download_music(search_file):
    choices = json.loads(search_file.read_text(encoding='utf-8'))
    number = search_file.stem
    choice = choices['entries'][{'01': 1, '20': 2, '21': 2, '23': 1, '24': 1}.get(number, 0)]
    data, path = source(choice['id'])
    example = info(choices['example'])
    folder = AUDIO / 'фоновая-музыка' / (number + '-' + clean(choices['name']))
    if (folder / 'трек.mp3').exists() and (folder / 'источник.json').exists():
        alternate = folder / 'версия-SoundCloud'
        alternate.mkdir(exist_ok=True)
        for name in ('трек.mp3', 'описание.md', 'источник.json'):
            (folder / name).rename(alternate / name)
    cut(path, folder, 0, data['duration'], 'трек.mp3')
    context = (f"В исходном списке трек связан с [{example['title']}]({url(example['id'])}) "
               f"автора {example['uploader']}. По названию/описанию ролика: {example['title']}. "
               'В исходном исследовании название музыки было взято из подписи звука YouTube. '
               'Наличие именно этой версии на слух повторно не проверено; здесь скачана полная музыкальная публикация, а не смешанная дорожка Shorts.')
    card(folder, choices['name'], data, 0, data['duration'], context,
         f"Фоновая музыка. Название в списке: **{choices['name']}**. Исполнитель: **{choices['artist']}**. "
         f"Скачанная публикация: **{data['title']}**, канал **{data['uploader']}**. "
         'Версия выбрана по названию и исполнителю; обрезки, ремиксы и темп из другого Shorts могут отличаться.', 'трек.mp3')
    print('МУЗЫКА ' + number + ' ' + choices['name'], flush=True)


def preview(vid):
    data = info(vid)
    folder = SERVICE / 'видео-референсы'
    folder.mkdir(parents=True, exist_ok=True)
    dest = folder / (vid + '.mp4')
    if not dest.exists():
        with yt_dlp.YoutubeDL({**OPTS, 'format': 'bv[ext=mp4][width<=480]/bv[ext=mp4][height<=480]/bv[ext=mp4]',
                              'outtmpl': str(dest)}) as ydl:
            ydl.download([url(vid)])
    interval = max(.1, data['duration']/12)
    image = folder / (vid + '.jpg')
    subprocess.run([str(FFMPEG), '-v', 'error', '-nostdin', '-y', '-i', str(dest),
                    '-vf', f'fps=1/{interval},scale=240:-1,tile=4x3', '-frames:v', '1', str(image)], check=True)
    print('КАДРЫ ' + vid + ' ' + str(interval), flush=True)


def extras():
    jobs = [('q_i8WmC29tQ', 'голоса-персонажей', 'FAHHH', 'Видео демонстрирует отдельный крик; сюжетная сценка не указана.'),
            ('Am4wYTiHHx8', 'звуковые-эффекты', 'Riser', 'Видео демонстрирует отдельный нарастающий эффект перед развязкой.'),
            ('eHSJeuD3HAM', 'голоса-персонажей', 'Tom-Scream', 'Крик Тома из Tom and Jerry; в описании указан мультфильм, отдельная Roblox-сцена не подтверждена.'),
            ('MUL5w91dzbo', 'голоса-персонажей', 'Goofy-Yell', 'Публикация отдельно демонстрирует крик Гуфи. Конкретный Roblox-ролик не указан.'),
            ('_gIWQr-bIlU', 'голоса-персонажей', 'SpongeBob-Laugh', 'Отдельная демонстрация смеха SpongeBob; Roblox-сценка не указана.'),
            ('D2_r4q2imnQ', 'голоса-персонажей', 'Bruh', 'Отдельная демонстрация реплики Bruh; это не автоматически вариант Nikocado из TDS-референса.'),
            ('v3T_nuDMHpI', 'голоса-персонажей', 'I-want-some-applesauce', 'Автор Zamb1e указал эту реплику в кредитах Roblox-анимации When You Deliver to Yourself on Pizza Place: https://www.newgrounds.com/portal/view/1030653 . Конкретный таймкод её использования не указан.'),
            ('_z71ODPwTkU', 'авторские-дорожки', 'Life-is-Roblox', 'Roblox-анимация CriticalChum воспроизводит реплику DJ Khaled «Life is Roblox». Полная дорожка содержит также Harvest Dawn; это голос с музыкой, не изолированная реплика.'),
            ('mCT7nKWrxIo', 'авторские-дорожки', 'Zombie-Bruh-TDS', 'По названию это Zombie Bruh Sound Noice moment, Roblox TDS-анимация. Автор указывает источник nikocado avocado bruh meme; дорожка может включать несколько звуков.')]
    section = DOC.split('## Авторские звуки', 1)[1].split('## Звуки персонажей', 1)[0]
    for line in section.splitlines():
        match = re.search(r'https://www.youtube.com/shorts/([\w-]+)', line)
        if match:
            row = [part.strip() for part in line.split('|')[1:-1]]
            jobs.append((match[1], 'авторские-дорожки', row[0],
                         f'В списке указан Shorts автора {row[1]}. По названию сценка: {row[0]}. '
                         'Скачана полная дорожка Shorts, поэтому внутри могут быть речь, музыка и несколько эффектов.'))
    for job in jobs:
        if (AUDIO / job[1] / clean(job[2]) / 'звук.mp3').exists():
            continue
        try:
            direct(*job)
        except Exception as error:
            print('ОШИБКА ' + job[2] + ' ' + str(error), flush=True)
        time.sleep(7)


def catalogs():
    pages = {'pizza': 'https://soundboardmax.com/work-at-a-pizza-place-soundboard/',
             'itch': 'https://skatecow.itch.io/workatapizzaplacevoices',
             'tuna': 'https://tuna.voicemod.net/sound/821bf186-6e0d-4e9d-8736-99e043049e24',
             'vine': 'https://www.myinstants.com/media/sounds/vine-boom.mp3'}
    for name, address in pages.items():
        try:
            request = urllib.request.Request(address, headers={'User-Agent': 'Mozilla/5.0'})
            with urllib.request.urlopen(request, timeout=20) as response:
                data = response.read()
            dest = SERVICE / 'каталоги' / (name + ('.mp3' if name == 'vine' else '.html'))
            dest.parent.mkdir(parents=True, exist_ok=True)
            dest.write_bytes(data)
            print(name, len(data))
            if name != 'vine':
                text = data.decode('utf-8', errors='replace')
                print('\n'.join(re.findall(r'https?[^\s"<>]+\.(?:mp3|ogg|wav)(?:\?[^\s"<>]*)?', text)[:30]))
                if name == 'itch':
                    print('\n'.join(re.findall(r'.{0,80}data-upload_id.{0,120}', text)))
        except Exception as error:
            print(name, str(error))


def fetch(address):
    request = urllib.request.Request(address, headers={'User-Agent': 'Mozilla/5.0'})
    with urllib.request.urlopen(request, timeout=30) as response:
        return response.read()


def downloaded_card(folder, name, address, page, context):
    folder.mkdir(parents=True, exist_ok=True)
    dest = folder / 'звук.mp3'
    if not dest.exists():
        dest.write_bytes(fetch(address))
    result = subprocess.run([str(FFMPEG), '-hide_banner', '-i', str(dest)], capture_output=True)
    match = re.search(rb'Duration: (\d+):(\d+):(\d+\.\d+)', result.stderr)
    if not match:
        raise RuntimeError('Скачан не аудиофайл: ' + name)
    duration = int(match[1])*3600 + int(match[2])*60 + float(match[3])
    (folder / 'описание.md').write_text(
        f'# {name}\n\nАудио: [звук.mp3](звук.mp3)\n\nДлительность: {duration:.2f} с.\n\n'
        f'Страница: {page}\n\nПрямой источник MP3: {address}\n\n'
        f'## Описание и применение\n\n{purpose(name)}\n\n'
        f'## Как использовался\n\n{context}\n\n'
        'Сценки, предложенные в разделе применения, — рекомендации для Roblox-анимации. '
        'Описание конкретного чужого видео здесь не выдумано. Аудио проверено декодированием; перед монтажом прослушать.\n', encoding='utf-8')
    print('MP3 ' + name, flush=True)


def pizza():
    page = 'https://soundboardmax.com/work-at-a-pizza-place-soundboard/'
    text = (SERVICE / 'каталоги/pizza.html').read_text(encoding='utf-8')
    addresses = list(dict.fromkeys(re.findall(r'https?[^\s"<>]+\.mp3', text)))
    # Ниже последнего Hmm на странице идут рекомендации из других игр, не этот набор.
    addresses = addresses[:next(i+1 for i, a in enumerate(addresses) if a.endswith('/hmm-rblx-SE.mp3'))]
    for address in addresses:
        name = address.rsplit('/', 1)[1][:-4]
        folder = AUDIO / 'голоса-персонажей/Pizza-Place' / clean(name)
        try:
            downloaded_card(folder, name, address, page,
                'Каталог размещает этот файл в soundboard игры Work at a Pizza Place. '
                'Это голос или реакция Roblox-персонажа; каталог не показывает отдельную сюжетную Roblox-анимацию с таймкодом. '
                'Видео-демонстрация набора: https://www.youtube.com/watch?v=hRousVIACr0 .')
        except Exception as error:
            print('ОШИБКА MP3 ' + name + ' ' + str(error), flush=True)
    # Прямые файлы из каталога itch.io, в том числе отсутствующий на первом сайте Hmm.
    page = 'https://skatecow.itch.io/workatapizzaplacevoices'
    text = (SERVICE / 'каталоги/itch.html').read_text(encoding='utf-8')
    for upload, name in re.findall(r'data-upload_id="(\d+)".*?title="([^"]+\.mp3)"', text):
        try:
            request = urllib.request.Request(page + '/file/' + upload,
                data=b'', headers={'User-Agent': 'Mozilla/5.0', 'Referer': page})
            with urllib.request.urlopen(request, timeout=20) as response:
                result = json.load(response)
            address = result['url']
            downloaded_card(AUDIO / 'голоса-персонажей/Pizza-Place' / clean(name[:-4]), name[:-4], address, page,
                            'Отдельный голосовой файл из пользовательского набора Work at a Pizza Place. '
                            'Указанной сюжетной сценки с этим конкретным файлом в источнике нет.')
        except Exception as error:
            print('ОШИБКА ITCH ' + name + ' ' + str(error), flush=True)


def split_goofy():
    data, path = source('NPbWhDaESds')
    result = subprocess.run([str(FFMPEG), '-hide_banner', '-nostdin', '-i', str(path),
                            '-af', 'silencedetect=noise=-38dB:d=0.25', '-f', 'null', '-'], capture_output=True, check=True)
    text = result.stderr.decode('utf-8', errors='replace')
    gaps = [(float(a), float(b)) for a,b in re.findall(r'silence_start: ([\d.]+).*?silence_end: ([\d.]+)', text, re.S)]
    # ponytail: тишина может быть внутри эффекта; исходник сохранён, при необходимости уточнить границы вручную.
    boundaries = [0] + [(a+b)/2 for a,b in gaps if a>0.15 and b<data['duration']-.15] + [data['duration']]
    for i, (start, end) in enumerate(zip(boundaries, boundaries[1:]), 1):
        folder = AUDIO / 'звуковые-эффекты/из-подборок/Goofy-Ahh' / f'{i:03}-неподписанный-эффект'
        cut(path, folder, start, end)
        card(folder, f'Goofy Ahh — фрагмент {i:02}', data, start, end,
             'В источнике отсутствуют имена отдельных звуков и таймкоды. Фрагмент выделен по паузам в аудио; '
             'название конкретного эффекта и сюжетная сценка не подтверждены. Оригинальная подборка сохранена целиком.',
             'Неподписанный фрагмент комедийной подборки Goofy Ahh. Подходит для подбора абсурдного панча после прослушивания. '
             'Границы автоматические: один эффект может быть разделён паузой либо несколько эффектов могут остаться вместе.')
    print('GOOFY ' + str(len(boundaries)-1), flush=True)


def soundcloud_music():
    for search_file in sorted((SERVICE / 'поиск-музыки').glob('*.json')):
        choices = json.loads(search_file.read_text(encoding='utf-8'))
        folder = AUDIO / 'фоновая-музыка' / (search_file.stem + '-' + clean(choices['name']))
        if (folder / 'трек.mp3').exists():
            continue
        query = choices['name'] + ' ' + choices['artist']
        result_file = SERVICE / 'soundcloud' / search_file.name
        try:
            if result_file.exists():
                results = json.loads(result_file.read_text(encoding='utf-8'))
            else:
                with yt_dlp.YoutubeDL({**OPTS, 'extract_flat': True}) as ydl:
                    response = ydl.extract_info('scsearch3:' + query, download=False)
                results = {**choices, 'entries': [{k: e.get(k) for k in ('id', 'title', 'duration', 'uploader', 'url')} for e in response['entries']]}
                result_file.parent.mkdir(parents=True, exist_ok=True)
                result_file.write_text(json.dumps(results, ensure_ascii=False, indent=2), encoding='utf-8')
            print(search_file.stem + ' ' + choices['name'] + ' => ' + ' | '.join(str(e) for e in results['entries']), flush=True)
        except Exception as error:
            print('ОШИБКА SC ' + search_file.stem + ' ' + str(error), flush=True)


def download_sc(numbers=()):
    selection = {'03': 1, '05': 2, '10': 1, '15': 1, '16': 1, '19': 1, '26': 1, '27': 1, '28': 1, '29': 1}
    for search_file in sorted((SERVICE / 'soundcloud').glob('*.json')):
        if numbers and search_file.stem not in numbers:
            continue
        if search_file.stem in ('11', '18', '23'):
            continue  # Уточнить версию: в первых результатах есть другие ремиксы.
        choices = json.loads(search_file.read_text(encoding='utf-8'))
        candidate = choices['entries'][selection.get(search_file.stem, 0)]
        folder = AUDIO / 'фоновая-музыка' / (search_file.stem + '-' + clean(choices['name']))
        folder.mkdir(parents=True, exist_ok=True)
        try:
            metadata = folder / 'источник.json'
            if not (folder / 'трек.mp3').exists():
                with yt_dlp.YoutubeDL({**OPTS, 'format': 'bestaudio/best', 'outtmpl': str(folder / 'трек.%(ext)s'),
                        'postprocessors': [{'key': 'FFmpegExtractAudio', 'preferredcodec': 'mp3', 'preferredquality': '192'}]}) as ydl:
                    data = ydl.extract_info(candidate['url'], download=True)
                metadata.write_text(json.dumps({k: data.get(k) for k in ('title','uploader','description','duration','webpage_url','id')}, ensure_ascii=False, indent=2), encoding='utf-8')
            data = json.loads(metadata.read_text(encoding='utf-8'))
            example = info(choices['example'])
            preview_note = 'Это публичный 30-секундный предпросмотр, не полная песня.' if data['duration'] <= 30.5 else 'Сохранена доступная аудиопубликация целиком.'
            (folder / 'описание.md').write_text(
                f"# {choices['name']}\n\nАудио: [трек.mp3](трек.mp3)\n\nИсполнитель из списка: **{choices['artist']}**.\n\n"
                f"Источник: [{data['title']}]({data['webpage_url']}). Канал: {data['uploader']}.\n\n"
                f"Длительность: **{data['duration']:.2f} с**. {preview_note}\n\n"
                f"## Что это\n\nФоновый музыкальный трек **{choices['name']}**. Версия выбрана по названию и исполнителю; точное совпадение звучания с Shorts на слух не подтверждено.\n\n"
                f"## Где использовали\n\nRoblox-референс из исходного списка: [{example['title']}]({url(example['id'])}), автор {example['uploader']}.\n\n"
                f"По названию/описанию ролика: {example['title']}. Исходное исследование указало этот трек по подписи звука YouTube. Подробная сценка на видео пока не просмотрена; её детали не выдуманы.\n\n"
                '## Применение\n\nВыбрать подходящий музыкальный фрагмент для темпа сцены. Убавить под репликами персонажей и резкими панчами. '
                'Скачивание не заменяет разрешения на публикацию музыки; для Shorts можно выбирать трек в библиотеке платформы.\n', encoding='utf-8')
            print('SC СКАЧАНО ' + search_file.stem + ' ' + choices['name'] + ' ' + preview_note, flush=True)
        except Exception as error:
            print('ОШИБКА SC ЗАГРУЗКИ ' + search_file.stem + ' ' + str(error), flush=True)


def check():
    files = [p for p in AUDIO.glob('**/*.mp3') if SERVICE not in p.parents]
    missing = [str(p) for p in files if not (p.parent / ('описание.md' if p.name == 'звук.mp3' or p.name == 'трек.mp3' else p.stem + '.md')).exists()]
    bad = []
    for path in files:
        result = subprocess.run([str(FFMPEG), '-v', 'error', '-nostdin', '-i', str(path), '-f', 'null', '-'], capture_output=True)
        if result.returncode:
            bad.append(str(path))
    print(json.dumps({'audio': len(files), 'missing_cards': missing, 'decode_errors': bad}, ensure_ascii=False))
    assert not missing and not bad


if __name__ == '__main__':
    SERVICE.mkdir(parents=True, exist_ok=True)
    if sys.argv[1] == 'check':
        check()
    elif sys.argv[1] == 'music':
        music()
    elif sys.argv[1] == 'download-music':
        for p in sorted((SERVICE / 'поиск-музыки').glob('*.json')):
            if p.stem in ('01', '04', '08', '09', '12', '19', '21', '30'):
                continue  # Полные публикации нужной версии уже скачаны с SoundCloud.
            try:
                download_music(p)
            except Exception as error:
                print('ОШИБКА МУЗЫКИ ' + p.stem + ' ' + str(error), flush=True)
            time.sleep(8)
    elif sys.argv[1] == 'extras':
        extras()
    elif sys.argv[1] == 'catalogs':
        catalogs()
    elif sys.argv[1] == 'pizza':
        pizza()
    elif sys.argv[1] == 'goofy':
        split_goofy()
    elif sys.argv[1] == 'soundcloud-music':
        soundcloud_music()
    elif sys.argv[1] == 'download-sc':
        download_sc(sys.argv[2:])
    elif sys.argv[1] == 'preview':
        for vid in sys.argv[2:]:
            try:
                preview(vid)
            except Exception as error:
                print('ОШИБКА КАДРОВ ' + vid + ' ' + str(error), flush=True)
            time.sleep(8)
    elif sys.argv[1] == 'collect':
        ids = sorted(set(re.findall(r'youtube\.com/(?:watch\?v=|shorts/)([\w-]{11})', DOC)))
        with cf.ThreadPoolExecutor(max_workers=4) as pool:
            jobs = {pool.submit(info, vid): vid for vid in ids}
            for job in cf.as_completed(jobs):
                try:
                    data = job.result()
                    print('МЕТАДАННЫЕ ' + jobs[job] + ' ' + data['title'], flush=True)
                except Exception as error:
                    print('ОШИБКА ' + jobs[job] + ' ' + str(error), flush=True)
        with cf.ThreadPoolExecutor(max_workers=3) as pool:
            jobs = {pool.submit(pack, vid): vid for vid in PACKS}
            for job in cf.as_completed(jobs):
                try:
                    job.result()
                except Exception as error:
                    print('ОШИБКА ПОДБОРКИ ' + jobs[job] + ' ' + str(error), flush=True)
