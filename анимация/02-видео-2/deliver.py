"""Encode footage, make contact sheets and verify the delivered stream."""
from pathlib import Path
import argparse, subprocess, json, re, os, shutil
from PIL import Image,ImageDraw
ROOT=Path(__file__).resolve().parent
ff=str(next((ROOT/'сборка'/'render-tools'/'imageio_ffmpeg'/'binaries').glob('ffmpeg*.exe')))
p=argparse.ArgumentParser(); p.add_argument('mode',choices=['probe','final','sheet','verify']); a=p.parse_args()
if a.mode in ['probe','final']:
    probe=a.mode=='probe'; dest=ROOT/('черновики' if probe else 'готовое'); dest.mkdir(exist_ok=True)
    out=dest/('barry-reaction-probe.mp4' if probe else 'barry-prison-trap-1080x1920-60fps.mp4')
    frames=ROOT/'сборка'/'web-frames'
    cmd=[ff,'-y','-framerate','60','-start_number','315' if probe else '0','-i',str(frames/'%05d.jpg')]
    if probe:cmd+=['-ss','5.25']
    offset=5.25 if probe else 0
    intervals=[(.12,.7),(8.45,9.25),(12.45,14),(16.45,17.2),(24.4,25.2)]
    enable='+'.join(f'between(t,{max(0,a-offset):.3f},{b-offset:.3f})' for a,b in intervals if b>offset and a<offset+(4 if probe else 27))
    vf=f"tmix=frames=2:weights='1 3':enable='{enable}',scale=in_range=full:out_range=tv:out_color_matrix=bt709,eq=contrast=1.035:saturation=1.06"
    cmd+=['-i',str(ROOT/'сборка'/'soundtrack.wav'),'-t','4' if probe else '27','-r','60',
          '-vf',vf,
          '-c:v','libx264','-preset','medium','-crf','17','-pix_fmt','yuv420p','-color_primaries','bt709','-color_trc','bt709','-colorspace','bt709',
          '-af','loudnorm=I=-16:TP=-1.5:LRA=11','-ar','48000','-c:a','aac','-b:a','256k','-movflags','+faststart',str(out)]
    r=subprocess.run(cmd,stdout=subprocess.PIPE,stderr=subprocess.STDOUT,text=True,encoding='utf8',errors='replace')
    (ROOT/'сборка'/('encode-probe.txt' if probe else 'encode-final.txt')).write_text(r.stdout,encoding='utf8')
    assert r.returncode==0,r.stdout[-3000:]
    print('ENCODED',out,'bytes',out.stat().st_size)
elif a.mode=='sheet':
    files=sorted((ROOT/'сборка'/'lookdev').glob('*.png'))
    w,h=216,384; out=Image.new('RGB',(w*4,(h+28)*((len(files)+3)//4)),(18,24,31)); d=ImageDraw.Draw(out)
    for i,f in enumerate(files):
        im=Image.open(f).convert('RGB'); im.thumbnail((w,h)); x=(i%4)*w; y=(i//4)*(h+28)
        out.paste(im,(x,y+28)); d.text((x+8,y+7),f.stem+' s',fill='white')
    out.save(ROOT/'сборка'/'contact-sheet.jpg',quality=93)
else:
    f=ROOT/'готовое'/'barry-prison-trap-1080x1920-60fps.mp4'
    r=subprocess.run([ff,'-i',str(f),'-af','volumedetect','-vf','blackdetect=d=0.1:pix_th=0.02','-f','null','-'],capture_output=True,text=True)
    (ROOT/'сборка'/'verification.txt').write_text(r.stderr,encoding='utf8')
    assert r.returncode==0,r.stderr
    assert '1080x1920' in r.stderr and '60 fps' in r.stderr and 'Audio: aac' in r.stderr
    assert 'Duration: 00:00:27.' in r.stderr
    assert 'black_start:' not in r.stderr
    print(r.stderr[-3500:])
