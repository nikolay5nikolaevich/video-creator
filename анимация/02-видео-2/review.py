"""Contact sheets from actual rendered frames, including the fast actions."""
from pathlib import Path
import argparse,json
from PIL import Image,ImageDraw
ROOT=Path(__file__).resolve().parent
p=argparse.ArgumentParser();p.add_argument('--probe',action='store_true');a=p.parse_args()
folder=ROOT/'сборка'/'web-frames'
start,end=(315,555) if a.probe else (0,1620)
step=1
missing=[f for f in range(start,end,step) if not (folder/f'{f:05d}.jpg').exists()]
assert not missing,f'Missing frames: {missing[:20]}'
for f in range(start,end,step):
    with Image.open(folder/f'{f:05d}.jpg') as im:
        assert im.size==(1080,1920),(f,im.size)
        im.verify()
indices=sorted(set(range(start,end,15)) | {f for f in [31,49,91,121,151,181,511,526,541,631,721,761,841,886,895,901,925,973,991,1024,1051,1066,1201,1241,1261,1321,1405,1453,1489,1501,1531,1591,1620] if start<=f<end})
out=ROOT/'сборка'/('review-probe' if a.probe else 'review-full');out.mkdir(exist_ok=True)
for page,offset in enumerate(range(0,len(indices),16)):
    sheet=Image.new('RGB',(864,1648),(17,22,28));d=ImageDraw.Draw(sheet)
    for slot,f in enumerate(indices[offset:offset+16]):
        im=Image.open(folder/f'{f:05d}.jpg').convert('RGB').resize((216,384),Image.Resampling.LANCZOS)
        x=(slot%4)*216;y=(slot//4)*412
        sheet.paste(im,(x,y+28));d.text((x+8,y+7),f'{f/60:.3f} s / {f}',fill='white')
    sheet.save(out/f'sheet-{page+1:02d}.jpg',quality=93)
(out/'frames-checked.json').write_text(json.dumps(dict(count=(end-start)//step,width=1080,height=1920,sampled=indices),indent=2),encoding='utf8')
print('Decoded',(end-start)//step,'frames;',len(indices),'sampled poses;',page+1,'contact sheets')
