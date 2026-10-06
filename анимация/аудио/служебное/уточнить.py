"""Измерить исходные дорожки и получить кадры для ручной разметки."""
import runpy
import re
import json
import subprocess
import sys
from pathlib import Path
import numpy as np
from PIL import Image, ImageDraw

m = runpy.run_path(str(Path(__file__).with_name('собрать.py')))
A, S, F = m['AUDIO'], m['SERVICE'], m['FFMPEG']
sys.stdout.reconfigure(encoding='utf-8')

def pcm(path, rate=8000):
    r = subprocess.run([str(F), '-v', 'error', '-i', str(path), '-ac', '1', '-ar', str(rate), '-f', 'f32le', '-'], capture_output=True, check=True)
    return np.frombuffer(r.stdout, dtype='<f4')

def gaps(path, level=-35, length=.1):
    r = subprocess.run([str(F), '-hide_banner', '-i', str(path), '-af', f'silencedetect=noise={level}dB:d={length}', '-f', 'null', '-'], capture_output=True, check=True)
    return [(float(a), float(b)) for a,b in re.findall(r'silence_start: ([\d.]+).*?silence_end: ([\d.]+)', r.stderr.decode(errors='replace'), re.S)]

def frames(vid, start=0, end=None, step=.5):
    video = S / 'видео-референсы' / (vid + '.mp4')
    if not video.exists():
        m['preview'](vid)
    audio = A / 'источники' / (vid + '.mp3')
    duration = len(pcm(audio if audio.exists() else video)) / 8000
    end = end or duration
    points = np.arange(start, end, step)
    out = S / 'разметка'
    out.mkdir(exist_ok=True)
    for offset in range(0, len(points), 32):
        sheet = Image.new('RGB', (1280, 8*205), 'white')
        draw = ImageDraw.Draw(sheet)
        for i, t in enumerate(points[offset:offset+32]):
            r = subprocess.run([str(F), '-v', 'error', '-ss', str(t), '-i', str(video), '-frames:v', '1', '-vf', 'scale=320:180:force_original_aspect_ratio=decrease,pad=320:180:(ow-iw)/2:(oh-ih)/2', '-f', 'image2pipe', '-vcodec', 'mjpeg', '-'], capture_output=True, check=True)
            import io
            image = Image.open(io.BytesIO(r.stdout))
            x,y = (i%4)*320, (i//4)*205
            sheet.paste(image, (x,y))
            draw.text((x+6,y+181), f'{t:.2f} s', fill='black')
        path = out / f'{vid}-{start:g}-{offset//32:02}.jpg'
        sheet.save(path)
        print(path, flush=True)

if sys.argv[1] == 'frames':
    frames(sys.argv[2], float(sys.argv[3]) if len(sys.argv)>3 else 0, float(sys.argv[4]) if len(sys.argv)>4 else None, float(sys.argv[5]) if len(sys.argv)>5 else .5)
elif sys.argv[1] == 'newgrounds':
    page = 'https://www.newgrounds.com/portal/view/1030653'
    folder = A / 'авторские-дорожки/When-You-Deliver-to-Yourself-on-Pizza-Place'
    folder.mkdir(parents=True, exist_ok=True)
    with m['yt_dlp'].YoutubeDL({**m['OPTS'], 'format': '360p', 'outtmpl': str(S / 'видео-референсы/newgrounds-1030653.%(ext)s')}) as ydl:
        data = ydl.extract_info(page, download=True)
    video = S / 'видео-референсы/newgrounds-1030653.mp4'
    duration = len(pcm(video))/8000
    m['cut'](video, folder, 0, duration)
    (folder / 'описание.md').write_text(f'# {data["title"]}\n\nАудио: [звук.mp3](звук.mp3)\n\nАвтор: Zamb1e. Источник: {page}\n\nДлительность: {duration:.3f} с.\n\nПолная смешанная дорожка Roblox-анимации о доставке пиццы самому себе. В авторских кредитах указаны I want some applesauce, November-Waltz и Wobbly-Weeble. Голос Applesauce также сохранён отдельно.\n', encoding='utf-8')
    print('NEWGROUNDS', duration, flush=True)
elif sys.argv[1] == 'match-pizza':
    x = pcm(A / 'источники/hRousVIACr0.mp3').astype(float)
    # ponytail: корреляция находит ту же запись; изменённый темп или другая версия потребуют спектрального сопоставления.
    for file in (A / 'голоса-персонажей/Pizza-Place').glob('*/звук.mp3'):
        y = pcm(file).astype(float)
        active = np.flatnonzero(np.abs(y)>.025)
        if not len(active):
            continue
        y = y[active[0]:active[-1]+1]
        size = 1 << (len(x)+len(y)-1).bit_length()
        corr = np.fft.irfft(np.fft.rfft(x,size)*np.fft.rfft(y[::-1],size),size)[len(y)-1:len(x)]
        cumsum = np.r_[0,np.cumsum(x.astype(float)**2)]
        energy = cumsum[len(y):]-cumsum[:-len(y)]
        score = np.where(energy > np.dot(y,y)*.001, corr/np.sqrt(np.maximum(energy*np.dot(y,y),1e-20)), 0)
        assert score.max() < 1.00001
        top = np.argsort(score)[-1]
        print(file.parent.name, round(float(score[top]),3), round(top/8000,3), round(len(y)/8000,3), flush=True)
elif sys.argv[1] == 'match-goofy':
    x = pcm(A / 'источники/NPbWhDaESds.mp3').astype(float)
    matches = []
    for file in (A / 'звуковые-эффекты').rglob('звук.mp3'):
        if 'Goofy-Ahh' in file.parts:
            continue
        y = pcm(file).astype(float)
        if len(y)<1600:
            continue
        width = min(6000,len(y))
        energy = np.r_[0,np.cumsum(y*y)]
        offset = int(np.argmax(energy[width:]-energy[:-width]))
        y = y[offset:offset+width]
        if np.dot(y,y) < .01:
            continue
        size = 1 << (len(x)+len(y)-1).bit_length()
        corr = np.fft.irfft(np.fft.rfft(x,size)*np.fft.rfft(y[::-1],size),size)[len(y)-1:len(x)]
        cumsum = np.r_[0,np.cumsum(x*x)]
        energy = cumsum[len(y):]-cumsum[:-len(y)]
        score = np.where(energy > np.dot(y,y)*.001, corr/np.sqrt(np.maximum(energy*np.dot(y,y),1e-20)), 0)
        assert score.max()<1.00001
        peak = int(np.argmax(score))
        if score[peak]>.65:
            entry = {'reference':str(file.relative_to(A)), 'score':float(score[peak]),'anchor':peak/8000,'reference_offset':offset/8000,'window':width/8000}
            matches.append(entry)
            print(json.dumps(entry,ensure_ascii=False),flush=True)
    (S / 'разметка/Goofy-совпадения.json').write_text(json.dumps(matches,ensure_ascii=False,indent=2),encoding='utf-8')
elif sys.argv[1] == 'death':
    file = A / 'источники/FEmVxT4hOpQ.mp3'
    r = subprocess.run([str(F),'-v','error','-i',str(file),'-ac','2','-ar','8000','-f','f32le','-'],capture_output=True,check=True)
    stereo = np.frombuffer(r.stdout,dtype='<f4').reshape(-1,2).astype(float)
    y = pcm(A / 'голоса-персонажей/Roblox-Oof/звук.mp3').astype(float)
    active = np.flatnonzero(abs(y)>.03)
    y = y[active[0]:active[-1]+1]
    for label,x in [('left',stereo[:,0]),('right',stereo[:,1]),('left-right',stereo[:,0]-stereo[:,1])]:
        size = 1 << (len(x)+len(y)-1).bit_length()
        corr = np.fft.irfft(np.fft.rfft(x,size)*np.fft.rfft(y[::-1],size),size)[len(y)-1:len(x)]
        sums = np.r_[0,np.cumsum(x*x)]
        energies = sums[len(y):]-sums[:-len(y)]
        score = np.where(energies>.001,corr/np.sqrt(np.maximum(energies*np.dot(y,y),1e-20)),0)
        i = int(np.argmax(score))
        print(label,float(score[i]),i/8000,flush=True)
elif sys.argv[1] == 'match-death':
    x = pcm(A / 'источники/FEmVxT4hOpQ.mp3').astype(float)
    ref = pcm(A / 'источники/YTC75cKzuNk.mp3').astype(float)
    for t in np.arange(0, len(ref)/8000-.4, .2):
        y = ref[int(t*8000):int((t+.4)*8000)]
        size = 1 << (len(x)+len(y)-1).bit_length()
        c = np.fft.irfft(np.fft.rfft(x,size)*np.fft.rfft(y[::-1],size),size)[len(y)-1:len(x)]
        energy = np.r_[0,np.cumsum(x*x)]
        energy = energy[len(y):]-energy[:-len(y)]
        score = np.where(energy>.001,c/np.sqrt(np.maximum(energy*np.dot(y,y),1e-20)),0)
        i = int(np.argmax(score))
        if score[i]>.6:
            print(round(t,3), round(i/8000,3),round(float(score[i]),3),flush=True)
elif sys.argv[1] == 'goofy-full':
    x = pcm(A / 'источники/NPbWhDaESds.mp3').astype(float)
    for entry in json.loads((S/'разметка/Goofy-совпадения.json').read_text(encoding='utf-8')):
        y = pcm(A/entry['reference']).astype(float)
        if any(label in entry['reference'] for label in ['Oi (shocked)','headshot csgo','bonk']):
            y = y[:4000]  # Не включать соседний эффект в конце секундного авторского интервала.
        active = np.flatnonzero(abs(y)>max(abs(y))*.03)
        left,right = max(0,int(active[0]) - 200), min(len(y),int(active[-1])+201)
        y = y[left:right]
        size = 1 << (len(x)+len(y)-1).bit_length()
        c = np.fft.irfft(np.fft.rfft(x,size)*np.fft.rfft(y[::-1],size),size)[len(y)-1:len(x)]
        sums = np.r_[0,np.cumsum(x*x)]
        energy = sums[len(y):]-sums[:-len(y)]
        score = np.where(energy>.001,c/np.sqrt(np.maximum(energy*np.dot(y,y),1e-20)),0)
        i = int(np.argmax(score))
        print(entry['reference'], 'reference',left/8000,right/8000,'match',i/8000,(i+len(y))/8000,'score',float(score[i]),flush=True)
