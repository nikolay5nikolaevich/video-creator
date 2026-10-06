"""Доступные альтернативные источники; не обходит вход или защиту аудио."""
import runpy
import re
import json
import sys
from pathlib import Path

m = runpy.run_path(str(Path(__file__).with_name('собрать.py')))
A, S = m['AUDIO'], m['SERVICE']

if sys.argv[1] == 'pages':
    pages = {
        'tom': 'https://sndup.net/4swc/',
        'applesauce': 'https://www.101soundboards.com/sounds/3313085-i-want-some-applesauce',
        'goofy': 'https://tuna.voicemod.net/sound/50da91fc-c8c5-4683-a85c-db96d46805d5',
    }
    for name, page in pages.items():
        try:
            data = m['fetch'](page)
            (S / 'каталоги' / (name + '.html')).write_bytes(data)
            print(name, '\n'.join(re.findall(r'https?[^\s"<>]+\.(?:mp3|ogg|wav)(?:\?[^\s"<>]*)?', data.decode(errors='replace'))[:5]), flush=True)
        except Exception as e:
            print(name, str(e), flush=True)
elif sys.argv[1] == 'direct':
    jobs = [
        ('Roblox-Oof', 'https://www.myinstants.com/media/sounds/roblox-death-sound_1.mp3', 'https://www.myinstants.com/en/instant/roblox-oof/', 'Короткий старый звук смерти Roblox. Демонстрация происхождения в списке: https://www.youtube.com/watch?v=YTC75cKzuNk . Отдельная сюжетная сценка не указана.'),
        ('Riser', 'https://www.myinstants.com/media/sounds/popular-riser.mp3', 'https://www.myinstants.com/en/instant/popular-riser-33262/', 'Нарастающий звук из публичного каталога. Источник из списка: https://www.youtube.com/watch?v=Am4wYTiHHx8 . Совпадение вариантов на слух не подтверждено.'),
        ('SpongeBob-Laugh', 'https://www.myinstants.com/media/sounds/spongebob-laughing-sound-effect.mp3', 'https://www.myinstants.com/en/instant/spongebob-laugh-23766/', 'Отдельный смех SpongeBob. Видеодемонстрация из списка: https://www.youtube.com/watch?v=_gIWQr-bIlU . Конкретная Roblox-сцена не указана.'),
        ('Micheal-P-Scream', 'https://www.myinstants.com/media/sounds/micheal-p-scream-sfx.mp3', 'https://www.myinstants.com/en/instant/micheal-p-scream-92914/', 'По описанию загрузчика, крик из roblox inaproprite plase 2!!!!!!!!!!!!!!!!!!!!!!.wmv. Это голосовая реакция на происходящее в Roblox; покадровый сюжет не проверен.'),
        ('Life-is-Roblox', 'https://www.myinstants.com/media/sounds/life-is-roblox-dj-khaled.mp3', 'https://www.myinstants.com/en/instant/life-is-roblox-dj-khaled-79261/', 'Короткая реплика DJ Khaled. Она названа в Roblox-анимации CriticalChum: https://www.youtube.com/watch?v=_z71ODPwTkU . Здесь версия из каталога, а не полная дорожка этой анимации.'),
        ('Tom-Scream', 'https://sndup.net/4swc/d', 'https://sndup.net/4swc/', 'Крик Тома, каталог подписан Tom And Jerry. Видеодемонстрация из списка: https://www.youtube.com/watch?v=eHSJeuD3HAM . Roblox-сцена не указана.'),
        ('I-want-some-applesauce', 'https://www.101soundboards.com/storage/sounds_rendered/thdqhgqokowcq5hd-i-want-some-applesauce.mp3', 'https://www.101soundboards.com/sounds/3313085-i-want-some-applesauce', 'Реплика I want some applesauce. Автор Zamb1e указал её в кредитах Roblox-анимации о доставке пиццы самому себе: https://www.newgrounds.com/portal/view/1030653 . Таймкод не указан. Здесь версия каталога; точное совпадение с версией автора на слух не проверено.'),
    ]
    for name, address, page, context in jobs:
        try:
            m['downloaded_card'](A / ('звуковые-эффекты' if name == 'Riser' else 'голоса-персонажей') / name, name, address, page, context)
        except Exception as e:
            print(name, str(e), flush=True)
elif sys.argv[1] == 'search':
    for search in sorted((S / 'soundcloud').glob('*.json')):
        choices = json.loads(search.read_text(encoding='utf-8'))
        folder = A / 'фоновая-музыка' / (search.stem + '-' + m['clean'](choices['name']))
        if (folder / 'трек.mp3').exists():
            continue
        try:
            result = S / 'soundcloud-дополнение' / search.name
            result.parent.mkdir(exist_ok=True)
            if not result.exists():
                with m['yt_dlp'].YoutubeDL({**m['OPTS'], 'extract_flat': True}) as ydl:
                    data = ydl.extract_info('scsearch10:' + choices['name'], download=False)
                choices['entries'] = [{k: e.get(k) for k in ('id', 'title', 'duration', 'uploader', 'url')} for e in data['entries']]
                result.write_text(json.dumps(choices, ensure_ascii=False, indent=2), encoding='utf-8')
            choices = json.loads(result.read_text(encoding='utf-8'))
            print(search.stem, [(e['id'], e['title'], e['uploader'], e['duration']) for e in choices['entries']], flush=True)
        except Exception as e:
            print(search.stem, str(e), flush=True)
