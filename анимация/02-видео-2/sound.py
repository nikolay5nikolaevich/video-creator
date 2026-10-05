"""Original 27-second instrumental cue and synchronous Foley. No external samples."""
from pathlib import Path
import wave
import numpy as np
ROOT=Path(__file__).resolve().parent
SR=48000; D=27; rng=np.random.default_rng(44)
music=np.zeros((SR*D,2),dtype=np.float64); effects=np.zeros_like(music)

def add(buf,t,x,gain=1,pan=0):
    i=int(t*SR); n=min(len(x),len(buf)-i)
    if n<=0:return
    buf[i:i+n,0]+=x[:n]*gain*np.sqrt((1-pan)/2)
    buf[i:i+n,1]+=x[:n]*gain*np.sqrt((1+pan)/2)
def tone(note,d=.25,kind='wood'):
    t=np.arange(int(d*SR))/SR; f=440*2**((note-69)/12)
    if kind=='bass':return (np.sin(2*np.pi*f*t)+.25*np.sin(4*np.pi*f*t))*np.exp(-t*10)*(1-np.exp(-t*90))
    return (np.sin(2*np.pi*f*t)*np.exp(-t*14)+.27*np.sin(2*np.pi*f*3.99*t)*np.exp(-t*28))*(1-np.exp(-t*500))
beat=60/144
mel=[76,79,81,79,76,72,74,75,76,79,84,83,81,79,76,74]
for k in range(128):
    t=k*beat/2
    if t>=26.3:break
    note=mel[k%len(mel)]+([0,0,-5,-5][(k//16)%4])
    add(music,t,tone(note,.31),.18 if k%2 else .23,(-.22 if k%2 else .22))
    if k%2==0:
        root=[48,48,41,43][(k//16)%4]+(7 if k%4==2 else 0)
        add(music,t,tone(root,.38,'bass'),.20,-.10)
        z=np.arange(int(.13*SR))/SR
        drum=(rng.normal(0,1,len(z))*.13+np.sin(2*np.pi*(70*z+12*(1-np.exp(-z*30)))))*np.exp(-z*42)
        add(music,t,drum,.15)
    else:
        z=np.arange(int(.08*SR))/SR
        add(music,t,rng.normal(0,1,len(z))*np.exp(-z*70),.045,.3)
for a,b in [(8.72,10.15),(20.65,21.85)]:
    i,j=int(a*SR),int(b*SR); music[i:j]*=.06
# Ending cadence follows the trapped belly, then a short final button.
for k,n in enumerate([72,76,79,84]):add(music,26.15+k*.08,tone(n,.65),.18)

def fx(t,d,kind,g=.35,pan=0):
    z=np.arange(int(d*SR))/SR; noise=rng.normal(0,1,len(z))
    if kind=='metal':
        x=sum(np.sin(2*np.pi*f*z)*np.exp(-z*(5+i*2)) for i,f in enumerate([191,327,569,873]))*.28
        x+=noise*np.exp(-z*80)*.5
    elif kind=='scrape':x=(noise*.24+np.sin(2*np.pi*(360*z+40*z*z))*.15)*np.sin(np.pi*z/d)**.4
    elif kind=='step':x=(np.sin(2*np.pi*95*z)+noise*.22)*np.exp(-z*38)
    elif kind=='whoosh':x=noise*np.sin(np.pi*z/d)**3*.4+np.sin(2*np.pi*(1000*z-400*z*z/d))*.08*np.sin(np.pi*z/d)
    elif kind=='squeak':x=np.sin(2*np.pi*(540*z+80*np.sin(z*18)))*np.sin(np.pi*z/d)**.7*.45
    elif kind=='boing':x=np.sin(2*np.pi*(110*z+12*(1-np.exp(-z*12))))*np.exp(-z*5)
    elif kind=='sparkle':x=(np.sin(2*np.pi*1568*z)+.5*np.sin(2*np.pi*2093*z))*np.exp(-z*8)
    elif kind=='crunch':x=noise*np.exp(-z*17)*(.5+.5*np.sin(z*90))
    else:x=noise*.1
    add(effects,t,x,g,pan)

fx(.08,.8,'scrape',.6,-.35); fx(.48,.42,'metal',.55); fx(.66,.7,'boing',.45)
# A soft, continuous lava texture with bubbling transients.
z=np.arange(D*SR)/SR
bubble=np.sin(2*np.pi*(49*z+1.8*np.sin(z*3)))*(.4+.6*np.sin(z*1.3)**2)
add(effects,0,bubble,.035,-.3)
for t in [1.1,1.8,2.4,3.1,4.4]:fx(t,.12,'boing',.065,-.5)
for t in [2.7,3.25,3.65]:fx(t,.14,'step',.35)
for t in [3.3,3.76,4.22,4.68]:fx(t,.10,'step',.20,.2)
fx(5.63,.6,'sparkle',.25,.1)
fx(6.08,.4,'boing',.20,.2)
fx(8.55,.3,'whoosh',.32); fx(8.79,.25,'squeak',.2)
fx(10.9,.24,'boing',.16)
fx(12.64,.6,'whoosh',.46,.35)
fx(13.14,.55,'metal',.4,.25)
for t in np.arange(13.1,15.0,.30):fx(float(t),.16,'step',.37,.25)
fx(14.12,.55,'squeak',.38,.25); fx(14.70,.5,'boing',.38,.3)
for t in [15.2,16.0,18.6,19.3,20.1]:fx(t,.16,'crunch',.13,.3)
fx(16.45,.62,'scrape',.5); fx(17.04,.85,'metal',.67); fx(17.75,.20,'metal',.5,-.2)
for t in np.arange(18.4,21.2,.26):fx(float(t),.12,'step',.19,-.3)
fx(21.05,.2,'squeak',.22,.2)
for t in np.arange(23.45,25.1,.22):fx(float(t),.13,'step',.18,-.5)
fx(24.78,.46,'metal',.45,.3); fx(24.82,.75,'boing',.43,.3)
fx(25.12,.82,'squeak',.35,.3); fx(26.1,.42,'squeak',.3,.3)
fx(26.55,.35,'boing',.28)
mix=music+effects
fade=np.minimum(1,np.arange(SR*D)/240)*np.minimum(1,np.arange(SR*D)[::-1]/4800)
mix=np.tanh(mix*1.35)*fade[:,None]
mix*=.92/max(.92,float(np.max(np.abs(mix))))
out=ROOT/'сборка'/'soundtrack.wav'; out.parent.mkdir(exist_ok=True)
with wave.open(str(out),'wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes((mix*32767).astype('<i2').tobytes())
print(out, 'peak',round(float(np.max(np.abs(mix))),4),'RMS',round(float(np.sqrt(np.mean(mix**2))),4))
