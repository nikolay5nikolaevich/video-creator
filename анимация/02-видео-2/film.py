"""Original Barry fan animation. Run with Python 3.11 and local bpy 4.2.
python film.py --stills / --probe / --render / --bake
All animation is deterministic; units are metres, Z up, faces look -Y.
"""
import sys, math, random, argparse, time
from pathlib import Path
ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(ROOT/'сборка'/'render-tools'))
import bpy
from mathutils import Vector
from math import sin, cos, pi

P=argparse.ArgumentParser()
P.add_argument('--stills',action='store_true'); P.add_argument('--probe',action='store_true')
P.add_argument('--render',action='store_true'); P.add_argument('--bake',action='store_true')
P.add_argument('--scale',type=int,default=100); P.add_argument('--start',type=int,default=0)
P.add_argument('--end',type=int,default=1620); P.add_argument('--engine',default='BLENDER_EEVEE_NEXT')
P.add_argument('--step',type=int,default=1); P.add_argument('--samples',type=int,default=16)
P.add_argument('--audit',action='store_true')
P.add_argument('--width',type=int,default=1080)
P.add_argument('--batch',action='store_true')
P.add_argument('--web',action='store_true')
P.add_argument('--update-timeline',action='store_true')
args=P.parse_args()
random.seed(71)
bpy.ops.object.select_all(action='SELECT'); bpy.ops.object.delete(use_global=False)
S=bpy.context.scene
S.render.engine=args.engine
S.render.resolution_x=args.width; S.render.resolution_y=round(args.width*16/9); S.render.resolution_percentage=args.scale
S.render.fps=60; S.frame_start=1; S.frame_end=1620
S.render.image_settings.file_format='PNG'; S.render.image_settings.color_mode='RGB'
S.render.image_settings.compression=0
S.render.film_transparent=False
S.world.color=(.16,.16,.16)
S.world.use_nodes=True; S.world.node_tree.nodes['Background'].inputs[0].default_value=(.19,.27,.4,1)
S.world.node_tree.nodes['Background'].inputs[1].default_value=.36
S.view_settings.view_transform='AgX'
S.view_settings.look='AgX - Medium High Contrast'; S.view_settings.exposure=-.35
S.eevee.taa_render_samples=args.samples
S.render.threads_mode='FIXED'; S.render.threads=6
S.render.use_file_extension=True
if args.engine=='CYCLES':
    S.cycles.samples=12; S.cycles.use_denoising=True

def mat(n,c,rough=.4,metal=0,em=0):
    m=bpy.data.materials.new(n); m.diffuse_color=(*c,1); m.use_nodes=True
    p=m.node_tree.nodes.get('Principled BSDF'); p.inputs['Base Color'].default_value=(*c,1)
    p.inputs['Roughness'].default_value=rough; p.inputs['Metallic'].default_value=metal
    if em: p.inputs['Emission Color'].default_value=(*c,1); p.inputs['Emission Strength'].default_value=em
    return m
skin=mat('warm vinyl skin',(.68,.39,.18),.37)
blue=mat('cobalt uniform',(.015,.11,.40),.32)
navy=mat('navy trousers',(.012,.025,.06),.48)
black=mat('rubber and moustache',(.008,.011,.018),.38)
white=mat('ivory',(.91,.93,.86),.27)
orange=mat('prison orange',(.94,.19,.018),.48)
hair=mat('chestnut hair',(.10,.027,.008),.3)
gold=mat('brass',(.83,.43,.065),.23,.65)
steel=mat('brushed steel',(.21,.29,.34),.32,.75)
wall=mat('blue grey concrete',(.16,.22,.27),.86)
floor=mat('floor',(.11,.16,.20),.63,.12)
stripe=mat('ochre stripe',(.63,.35,.05),.65)
dark=mat('deep recess',(.026,.052,.07),.8)
pink=mat('strawberry icing',(.95,.09,.27),.26)
dough=mat('fried dough',(.68,.29,.052),.62)
red=mat('signal red',(.72,.024,.012),.3)
mint=mat('exit light',(.04,.9,.44),.28,em=3)
lamp=mat('diffuser',(.55,.78,1),.28,em=4)
lava=mat('molten orange',(.98,.13,.002),.34,em=2.5)
hot=mat('lava yellow', (1,.48,.015),.3,em=4)

def empty(n,loc=(0,0,0),parent=None):
    o=bpy.data.objects.new(n,None); S.collection.objects.link(o); o.parent=parent; o.location=loc; return o
def finish(o,n,loc,scale,m,parent=None):
    o.name=n; o.parent=parent; o.location=loc; o.scale=scale
    if m:o.data.materials.append(m)
    return o
def box(n,loc,size,m,parent=None,bev=.06):
    bpy.ops.mesh.primitive_cube_add()
    o=finish(bpy.context.object,n,loc,tuple(x/2 for x in size),m,parent)
    bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
    if bev:
        b=o.modifiers.new('rounded edges','BEVEL'); b.width=bev; b.segments=3
        o.modifiers.new('weighted normals','WEIGHTED_NORMAL')
    return o
def ell(n,loc,size,m,parent=None):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=24,ring_count=12)
    o=finish(bpy.context.object,n,loc,size,m,parent)
    for p in o.data.polygons:p.use_smooth=True
    return o
def cyl(n,a,b,r,m,parent=None):
    a,b=Vector(a),Vector(b)
    bpy.ops.mesh.primitive_cylinder_add(vertices=16,radius=r,depth=(b-a).length)
    o=finish(bpy.context.object,n,(a+b)/2,(1,1,1),m,parent)
    o.rotation_euler=(b-a).to_track_quat('Z','Y').to_euler()
    for p in o.data.polygons:p.use_smooth=True
    return o
def curve(n,pts,r,m,parent=None):
    d=bpy.data.curves.new(n,'CURVE'); d.dimensions='3D'; d.bevel_depth=r; d.bevel_resolution=3
    s=d.splines.new('POLY'); s.points.add(len(pts)-1)
    for p,c in zip(s.points,pts):p.co=(*c,1)
    o=bpy.data.objects.new(n,d); S.collection.objects.link(o); o.parent=parent; d.materials.append(m); return o
def text3(n,txt,loc,size,m,rot=(pi/2,0,0)):
    d=bpy.data.curves.new(n,'FONT'); d.body=txt; d.align_x='CENTER'; d.size=size; d.extrude=.003
    o=bpy.data.objects.new(n,d); S.collection.objects.link(o); o.location=loc; o.rotation_euler=rot; d.materials.append(m); return o
def torus(n,loc,major,minor,m,parent=None):
    bpy.ops.mesh.primitive_torus_add(major_segments=36,minor_segments=12,major_radius=major,minor_radius=minor)
    o=finish(bpy.context.object,n,loc,(1,1,1),m,parent)
    for p in o.data.polygons:p.use_smooth=True
    return o

# Set: open camera-facing wall, functioning trap, side cell and rear exit.
box('safe corridor',(3.95,0,-.24),(4.9,18,.48),floor,bev=.05)
box('left ledge',(-3.6,0,-.24),(2.2,18,.48),floor)
box('back walkway',(-.4,4,-.24),(4.2,10,.48),floor)
box('front walkway',(-.5,-7,-.24),(4,2,.48),floor)
box('lava pool',(-.55,-3.5,-1.2),(4.1,4.8,.2),lava)
for i in range(34):
    x=random.uniform(-2.4,1.2); y=random.uniform(-5.65,-1.3)
    ell('hot flowing lava',(x,y,-1.08),(random.uniform(.08,.38),random.uniform(.06,.25),.035),hot)
panels=[]
for i in [-1,1]:panels.append(box('sliding trap panel',( -.55+i*.98,-3.5,-.12),(1.96,4.65,.24),steel))
for x in [-2.62,1.53]:
    box('pit safety lip',(x,-3.5,.04),(.15,4.9,.15),gold)
    for y in [-5.7,-1.3]:box('pit edge',(-.55,y,.04),(4.3,.15,.15),gold)
for y in [-7,-5.8,-1,1,3,5,7]:
    box('floor seams',(2.2,y,.006),(4.9,.018,.009),dark,bev=0)
for x in [-4.85,6.4]:
    box('corridor side wall',(x,1,3.2),(.35,18,6.4),wall).hide_render=x>0
    box('painted stripe',(x-(.2 if x>0 else -.2),1,2.15),(.035,18,.40),stripe,bev=0).hide_render=x>0
box('rear wall',(0,8.8,3.2),(13,.35,6.4),wall)
for y in [-5,-1,3,7]:
    for x in [-4.6]:
        box('wall pier',(x,y,3),(.27,.26,6),steel)
        box('wall lamp',(x-(.16 if x>0 else -.16),y,4.35),(.12,.75,.27),lamp)
for x in [-4.3]:
    cyl('overhead pipe',(x,-8,5.7),(x,8.5,5.7),.095,steel)
    for y in [-5,-1,3,7]:torus('pipe collar',(x,y,5.7),.108,.025,black).rotation_euler=(pi/2,0,0)
# Exit reads as architecture, not an explanatory title.
box('exit recess',(-2.4,8.57,1.65),(2.3,.1,3.3),dark)
box('exit door',(-2.4,8.47,1.6),(1.9,.12,3.2),navy)
box('exit window',(-2.4,8.39,2.2),(1.4,.04,.65),mint)
box('exit pushbar',(-2.4,8.27,1.35),(1.4,.15,.09),steel)
box('exit sign housing',(-2.4,8.45,3.7),(1.9,.15,.55),black)
text3('exit sign','EXIT',(-2.4,8.34,3.5),.42,mint)
# Cell front at y=2.65, inside y>2.65.
box('cell back',(3.75,7.2,2.5),(4.6,.22,5),wall)
box('cell right',(6.05,4.9,2.5),(.22,4.6,5),wall).hide_render=True
box('cell left pier',(1.15,4.7,2.5),(.35,4.4,5),wall)
for x in [2.3,4.9]:box('cell front jamb',(x,2.7,2.4),(.23,.32,4.8),steel)
box('cell lintel',(3.65,2.7,4.8),(4.8,.35,.25),steel)
text3('cell number','07',(3.65,2.5,5.03),.48,gold)
box('bunk mattress',(4.7,6.4,.75),(2.2,1.2,.27),navy)
for x in [3.7,5.7]:
    for y in [5.9,6.85]:cyl('bed leg',(x,y,0),(x,y,.65),.045,steel)
box('bed pillow',(5.35,6.4,.97),(.62,1,.15),white)
gate=empty('SLIDING CELL GATE',(0,0,0))
bars=[]
for x in [1.65,2.2,2.75,4.4,4.95,5.5]:
    bars.append(cyl('gate bar',(x,2.62,.15),(x,2.62,4.6),.065,steel,gate))
for z in [.15,1.3,4.6]:box('gate cross brace',(3.575,2.62,z),(4.1,.14,.13),steel,gate,bev=.025)
latch=empty('EXTERIOR LATCH',(1.43,2.35,1.95))
box('latch mounting',(0,0,0),(.25,.15,.6),gold,latch)
bolt=box('visible drop bolt',(.16,-.15,.3),(.14,.14,.72),steel,latch)
box('bolt handle',(.19,-.03,.26),(.5,.13,.1),gold,bolt)
# Lever near guard.
box('lever pedestal',(-.15,1.4,.55),(.55,.55,1.1),navy)
lever=empty('trap lever pivot',(-.15,1.4,1.15))
cyl('lever shaft',(0,0,0),(0,0,.6),.04,steel,lever)
ell('red lever knob',(0,0,.64),(.14,.14,.14),red,lever)

AN=[]
def anim(o): AN.append(o); return o
def limb(n,root,m,width):
    o=box(n,(0,0,0),(width,width,1),m,root,bev=.065); anim(o); return o
def segment(o,a,b,width=None):
    a,b=Vector(a),Vector(b); o.location=(a+b)/2
    o.rotation_euler=(b-a).to_track_quat('Z','Y').to_euler(); o.scale.z=(b-a).length

def character(n,big):
    r=anim(empty(n)); body=anim(empty(n+' body',parent=r))
    if big:
        ell('round shirt',(0,0,1.85),(1.20,.76,1.03),blue,body)
        belly=anim(ell('bare round belly',(0,-.29,1.20),(1.05,.67,.53),skin,body))
        ell('navel',(0,-.948,1.17),(.065,.025,.065),hair,body)
        ell('belt',(0,0,.86),(1.0,.65,.16),black,body)
        box('buckle',(0,-.68,.85),(.30,.06,.20),gold,body)
        box('shirt placket',(0,-.746,2.05),(.075,.035,1.04),navy,body)
        for z in [1.68,1.98,2.28]:ell('shirt button',(0,-.782,z),(.045,.022,.045),gold,body)
        box('breast pocket',(.5,-.70,2.24),(.38,.08,.33),blue,body)
        ell('badge',(-.48,-.73,2.29),(.13,.035,.17),gold,body)
        ell('Barry neck',(0,0,2.88),(.32,.30,.25),skin,body)
        h=anim(empty('Barry head',(0,-.04,3.35),body))
        box('Barry head',(0,0,0),(1.11,.89,1.02),skin,h,bev=.24)
        ell('nose',(0,-.53,-.05),(.17,.14,.15),skin,h)
        for i in [-1,1]:
            ell('ear',(i*.60,0,-.03),(.14,.1,.22),skin,h)
            o=ell('moustache',(i*.17,-.49,-.19),(.26,.075,.10),black,h); o.rotation_euler.y=i*-.15
        box('cap band',(0,0,.54),(1.2,.95,.15),black,h)
        box('blue cap',(0,.015,.72),(1.29,1.02,.35),blue,h,bev=.15)
        box('cap visor',(0,-.53,.52),(1.13,.58,.085),black,h)
        ell('cap badge',(0,-.524,.75),(.12,.045,.15),gold,h)
        shoulder=1.06; shz=2.4; legx=.46; hip=.88; foot=.17; w=.34
    else:
        box('jumpsuit torso',(0,0,1.72),(1.06,.58,1.15),orange,body,bev=.12)
        box('zipper',(0,-.302,1.8),(.045,.025,1.03),gold,body,bev=.01)
        box('number patch',(.28,-.318,1.97),(.32,.025,.23),white,body,bev=.015)
        for x in [.2,.28,.36]:box('patch marks',(x,-.336,1.97),(.026,.015,.11),navy,body,bev=0)
        box('collar left',(-.20,-.33,2.25),(.25,.07,.13),orange,body)
        h=anim(empty('prisoner head',(0,0,2.74),body))
        box('block head',(0,0,0),(.98,.84,.92),skin,h,bev=.16)
        box('hair crown',(0,.03,.48),(1.03,.89,.26),hair,h,bev=.11)
        for i in range(6):
            o=box('bacon hair lock',(-.43+i*.17,-.40,.36+random.uniform(-.03,.03)),(.19,.20,.4),hair,h,bev=.065)
            o.rotation_euler.y=-.23
        for i in [-1,1]:ell('ear',(i*.52,0,-.04),(.1,.12,.16),skin,h)
        shoulder=.64; shz=2.1; legx=.27; hip=1.17; foot=.16; w=.29; belly=None
    # Eyes, brows and mutually exclusive mouth shapes are attached to animated head.
    eyes=[]; pupils=[]; brows=[]
    for i in [-1,1]:
        e=anim(ell('eye white',(i*.235,-.455,.105),(.17,.055,.18),white,h)); eyes.append(e)
        p=anim(ell('pupil',(i*.235,-.510,.11),(.072,.027,.105),black,h)); pupils.append(p)
        ell('eye glint',(i*.235-.022,-.537,.15),(.023,.011,.031),white,h)
        b=anim(box('brow',(i*.235,-.49,.33),(.34,.075,.065),black,h,bev=.025)); brows.append(b)
    mouths={}
    mz=-.34 if big else -.22
    for name,pts in {
        'smile':[(x,-.525,mz-.07*(1-(x/.27)**2)) for x in [i*.027 for i in range(-10,11)]],
        'frown':[(x,-.525,mz+.07*(1-(x/.25)**2)) for x in [i*.025 for i in range(-10,11)]],
    }.items():mouths[name]=anim(curve(name+' mouth',pts,.028,black,h))
    mouths['o']=anim(ell('open mouth',(0,-.53,mz),(.095,.025,.085),black,h))
    bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
    arms=[]; legs=[]
    for i in [-1,1]:
        upper=limb(n+' upper arm',body,blue if big else orange,.48 if big else .34)
        lower=limb(n+' forearm',body,skin if big else orange,.36 if big else .30)
        hand=anim(box(n+' hand',(0,0,0),(.38,.37,.38) if big else (.31,.30,.32),skin,body,bev=.1))
        arms.append((i,upper,lower,hand))
        thigh=limb(n+' thigh',r,navy if big else orange,w)
        shin=limb(n+' shin',r,navy if big else orange,w)
        shoe=anim(box(n+' shoe',(0,0,0),(.44,.66,.26) if big else (.39,.62,.25),black if big else white,r,bev=.065))
        legs.append((i,thigh,shin,shoe))
    return dict(root=r,body=body,head=h,eyes=eyes,pupils=pupils,brows=brows,mouths=mouths,arms=arms,legs=legs,
                shoulder=shoulder,shz=shz,legx=legx,hip=hip,foot=foot,big=big,belly=belly)

B=character('BARRY',True); H=character('PRISONER',False)
baton=anim(empty('BATON')); cyl('baton grip',(0,0,0),(0,0,.36),.072,black,baton)
cyl('baton shaft',(0,0,.24),(0,0,1.08),.085,black,baton)
for z in [.05,.12,.19,.26]:torus('grip ring',(0,0,z),.075,.015,steel,baton)
donut=anim(empty('DONUT'))
torus('dough ring',(0,0,0),.225,.125,dough,donut)
o=torus('icing',(0,0,.055),.224,.104,pink,donut); o.scale.z=.75
sprinkles=[white,mint,gold,blue]
for i in range(24):
    a=i*2.399; rad=random.uniform(.18,.29)
    o=box('sugar sprinkle',(rad*cos(a),rad*sin(a),.135),(.055,.018,.019),sprinkles[i%4],donut,bev=.007); o.rotation_euler.z=a
anim(gate); anim(bolt); anim(lever)
for o in panels:anim(o)
for o in bars:anim(o)

def area(n,loc,target,power,color,size):
    d=bpy.data.lights.new(n,'AREA'); d.energy=power; d.color=color; d.shape='DISK'; d.size=size
    o=bpy.data.objects.new(n,d); S.collection.objects.link(o); o.location=loc
    o.rotation_euler=(Vector(target)-o.location).to_track_quat('-Z','Y').to_euler(); return o
area('large soft key',(-3,-5,7),(0,1,1.5),1500,(.73,.85,1),6)
area('front face fill',(1,-8,4),(1,1,2),850,(1,.80,.61),5)
area('cell key',(3,3,6),(3,4,1),1100,(.5,.73,1),3)
area('warm edge',(5,5,5),(0,1,2),1800,(1,.59,.25),3)
area('lava bounce',(-.5,-3.4,-.8),(-.5,-3.4,2),600,(1,.19,.015),3)
cd=bpy.data.cameras.new('Cinema camera'); cam=anim(bpy.data.objects.new('Cinema camera',cd)); S.collection.objects.link(cam); S.camera=cam
cd.type='ORTHO'; cd.ortho_scale=10.6; cd.lens=45; cd.clip_end=100
S.use_nodes=True
tree=S.node_tree; tree.nodes.clear(); rl=tree.nodes.new('CompositorNodeRLayers')
gl=tree.nodes.new('CompositorNodeGlare'); gl.glare_type='FOG_GLOW'; gl.quality='MEDIUM'; gl.threshold=2; gl.size=6; gl.mix=-.91
out=tree.nodes.new('CompositorNodeComposite'); tree.links.new(rl.outputs['Image'],gl.inputs['Image']); tree.links.new(gl.outputs['Image'],out.inputs[0])

def ease(t,a,b):
    v=max(0,min(1,(t-a)/(b-a))); return v*v*(3-2*v)
def lerp(a,b,u):return Vector(a).lerp(Vector(b),u)
def path(t,keys):
    if t<=keys[0][0]:return Vector(keys[0][1])
    for (a,p),(b,q) in zip(keys,keys[1:]):
        if t<=b:return lerp(p,q,ease(t,a,b))
    return Vector(keys[-1][1])
def face(c,emotion,t,gaze=0):
    for n,o in c['mouths'].items():o.scale=(1,1,1) if n==emotion else (.001,.001,.001)
    blink= .12 if (t%3.77)>.1 and (t%3.77)<.18 else 1
    for j,i in enumerate([-1,1]):
        c['eyes'][j].scale.z=(.22 if emotion=='o' else .18)*blink
        c['pupils'][j].location.x=i*.235+gaze*.055
        c['pupils'][j].scale.z=(.11 if emotion=='o' else .105)*blink
        c['brows'][j].rotation_euler.y=(-i*.35 if emotion=='frown' else i*.13)
        c['brows'][j].location.z=.4 if emotion=='o' else .33

def pose(c,t,pos,yaw=0,walk=0,lean=0,head=0,emotion='smile',hands=None,hang=0,kick=0,walk_path=None):
    r=c['root']; r.location=pos; r.rotation_euler=(0,0,yaw)
    body=c['body']; body.location=(0,0,.035*sin(t*3)+abs(walk)*.045*abs(sin(t*12)))
    body.rotation_euler=(lean,0,.025*sin(t*6)*abs(walk))
    c['head'].rotation_euler=(.03*sin(t*3),0,head)
    face(c,emotion,t,1 if head>.05 else (-1 if head<-.05 else 0))
    for j,(i,up,lo,hand) in enumerate(c['arms']):
        shoulder=(i*c['shoulder'],0,c['shz'])
        target=(i*(c['shoulder']+.08),-.10+walk*.40*sin(t*12+i),c['shz']-1.05)
        if hands and hands[j] is not None:target=hands[j]
        elbow=lerp(shoulder,target,.50)+Vector((i*.12,-.16,0))
        segment(up,shoulder,elbow); segment(lo,elbow,target); hand.location=target
        hand.rotation_euler=(0,0,0)
    for i,thigh,shin,shoe in c['legs']:
        phase=t*(10 if c['big'] else 14)+(0 if i==-1 else pi)
        stride=sin(phase)*walk*.44
        lift=max(0,cos(phase))*abs(walk)*.25
        ankle=Vector((i*c['legx'],stride,c['foot']+lift))
        if walk_path and abs(walk)>.1:
            period=.70 if c['big'] else .48
            phase=(t/period+(0 if i==-1 else .5))%1
            contact=t-phase*period
            a=walk_path(contact+.20*period); b=walk_path(contact+1.20*period)
            footpos=a if phase<.58 else a.lerp(b,ease(phase,.58,1))
            q=r.rotation_euler.to_quaternion()
            footpos+=q @ Vector((i*c['legx'],0,0))
            footpos.z=c['foot']+(.25*sin(pi*(phase-.58)/.42) if phase>=.58 else 0)
            ankle=q.inverted() @ (footpos-r.location)
        if hang:ankle+=Vector((0,.3*sin(t*10+i),-.25))
        if kick:ankle+=Vector((0,.9+.3*sin(t*19+i),.1+.15*cos(t*19+i)))
        hip=Vector((i*c['legx'],0,c['hip']))
        knee=lerp(hip,ankle,.5)+Vector((0,-.06-.18*abs(walk),0))
        segment(thigh,hip,knee); segment(shin,knee,ankle)
        shoe.location=ankle+Vector((0,-.12,-.04)); shoe.rotation_euler=(kick*.35*sin(t*19+i),0,0)

def worldhand(c,index):
    bpy.context.view_layer.update()
    return c['arms'][index][3].matrix_world.translation.copy()
def reach(c,index,target):
    bpy.context.view_layer.update()
    i,up,lo,hand=c['arms'][index]
    p=c['body'].matrix_world.inverted() @ Vector(target)
    shoulder=Vector((i*c['shoulder'],0,c['shz']))
    elbow=lerp(shoulder,p,.52)+Vector((i*.12,-.1,0))
    segment(up,shoulder,elbow); segment(lo,elbow,p); hand.location=p
def camera(loc,target,scale):
    cam.location=loc; cam.rotation_euler=(Vector(target)-cam.location).to_track_quat('-Z','Y').to_euler(); cd.ortho_scale=scale

def apply(t):
    opening=ease(t,.12,.68)
    for i,o in zip([-1,1],panels):o.location.x=-.55+i*(.98+opening*2.1)
    lever.rotation_euler.x=-.65+1.2*ease(t,0,.3)
    gate.location.x=4.25*(1-ease(t,16.2,17.05))
    bolt.location.z=.30-.45*ease(t,17.5,17.76)
    for i,o in enumerate(bars):o.rotation_euler.y=0
    # Hero recovers on the near right edge. Hand props derive from posed hand transforms.
    hkeys=[(0,(-.4,-3.2,0)),(.6,(.95,-2.3,-2.45)),(1.4,(.95,-2.3,-2.45)),(2.8,(2,-2.0,0)),
               (5,(2,-1.6,0)),(12.4,(2,-1.6,0)),(16.1,(5.8,1.7,0)),(17.2,(1.5,1.65,0)),
               (18.7,(.0,3.0,0)),(21.8,(-1.7,4.7,0)),(23.2,(-1.7,4.7,0)),(25.0,(-2.4,8.4,0)),(27,(-2.4,10.5,0))]
    hp=path(t,hkeys)
    he='o' if t<2.8 else 'frown' if t<5 else 'smile'
    if 16.2<t<17.05:hp=Vector((1.55+gate.location.x,1.7,0))
    hy=-.25 if t<5 else -.5
    hh=0; hl=0; hw=0; hands=[None,None]
    if .4<t<2.3:
        hy=pi/2
        z=.10-hp.z
        hands=[(-.45,-.55,z),(.45,-.55,z)]
    if 2.3<t<2.9:hl=.22*sin((t-2.3)/.6*pi)
    if 5<t<12.75:
        lift=ease(t,5.25,5.8)
        hands[1]=(.82,-.7,1.25+lift*1.0)
        hh=-.2*ease(t,5,5.3)
        if 8.4<t<9.3:
            u=ease(t,8.4,8.75)-ease(t,8.95,9.3)
            hands[1]=(.82+u*.4,-.7+.95*u,2.25+.45*u); hl=-.12*u
    if 12<t<13.2:
        u=ease(t,12.1,12.4); v=ease(t,12.4,12.75)
        hands[1]=(.8+u*.3-v*.5,-.7+u*.9-v*1.1,2.25+u*.5-v*.1); hl=-.15*u+.3*v
    if 13.1<t<16.2:hw=.8; hy=pi
    if 16.2<t<17.3:hands[0]=(-.5,-.4,2.3); hy=pi*.9
    if 17.3<t<18:hands[1]=(.35,-.45,1.9-.4*ease(t,17.5,17.76)); hy=pi
    if 18<t<21.7:hw=.8; hy=pi+.4
    if 21.7<t<23.2:hy=-.4; hh=.1
    if t>23.2:hw=1; hy=pi
    pose(H,t,hp,hy,hw,hl,hh,he,hands,hang=1 if .4<t<2.3 else 0,walk_path=lambda v:path(v,hkeys))
    if 16.2<t<17.12:
        reach(H,0,(1.67+gate.location.x,2.48,2.35))
        reach(H,1,(1.95+gate.location.x,2.48,2.35))
    if 17.3<t<17.95:reach(H,1,(1.8,2.13,2.51-.45*ease(t,17.5,17.76)))
    bkeys=[(0,(-.3,.65,0)),(1.9,(-.3,.65,0)),(3.7,(2,1.1,0)),(12.75,(2,1.1,0)),
               (13.4,(3.6,1.9,0)),(14.15,(3.6,2.65,0)),(14.9,(3.6,4.25,0)),(23.5,(3.6,4.25,0)),
               (24.1,(3.6,3.6,0)),(24.9,(3.6,2.75,.5)),(27,(3.6,2.75,.5))]
    bp=path(t,bkeys)
    be='smile'; by=.1; bh=0; bl=0; bw=0; bhand=[None,None]
    if t<1.9:bhand[0]=(-.55,.45,1.8)
    if 2<t<5:bhand=[(-.45,-.8,1.9),(.55,-.8,1.8+.15*sin(t*14))]; be='frown'; bw=.3 if t<3.7 else 0
    if 5.8<t<8.4:
        be='o'; bh=-.3*ease(t,5.8,6.05); bl=.17*ease(t,6,6.45)
        bhand[0]=(-.85,-.6,1.4); bhand[1]=(.9,-.15,1.15)
    if 8.4<t<12.75:
        be='o' if t<10 else 'frown'
        bh=-1.05*(ease(t,8.55,8.77)-ease(t,10.5,11.1))
        by=.1-.55*(ease(t,8.73,9.1)-ease(t,10.8,11.5)); bl=.12
    if 12.75<t<15:
        by=.1+(pi-.1)*ease(t,12.55,13.1); bw=.8; be='o'; bl=.20
        bhand=[(-.7,-.75,2.15),(.7,-.75,2.15)]
    if 14<t<14.65:
        B['body'].scale=(.84,1.14,1.03)
    else:B['body'].scale=(1,1,1)
    if 14.9<t<20.7:
        by=pi*(1-ease(t,14.9,15.4)); bhand=[(-.30,-.80,2.9),(.30,-.80,2.95)]; be='smile'; bl=.03*sin(t*12)
    if 20.7<t<22:be='o'; bh=.15*sin(t*7)*ease(t,20.7,21.2)
    if 22<t<24.2:be='frown'; bhand=[(-1.15,-.8,2.3),(1.15,-.8,2.3)]
    if t>=24.2:
        be='o' if t<25.2 else 'frown'; bl=.50*ease(t,24.2,24.9)
        bhand=[(-1,-1.05,2.0),(1,-1.05,2.0)]
        B['body'].scale=(1+.06*sin(t*20),1-.12*ease(t,24.2,24.9),1)
        for i,o in enumerate(bars):
            if i in [2,3]:o.rotation_euler.y=(-1 if i==2 else 1)*.065*ease(t,24.2,24.9)
    pose(B,t,bp,by,bw,bl,bh,be,bhand,kick=1 if t>24.7 else 0,walk_path=lambda v:path(v,bkeys))
    if 14.25<t<14.9:
        reach(B,0,(3.40,5.2,2.42)); reach(B,1,(3.76,5.28,2.38))
    if 8.40<t<8.73:
        for j,i in enumerate([-1,1]):B['pupils'][j].location.x=i*.235-.06*ease(t,8.40,8.50)
    # Baton stays in the right hand, then drops before the chase.
    baton.location=worldhand(B,1); baton.rotation_euler=(.2+(.25*sin(t*14) if 2<t<5 else 0),-.30,by)
    if 2<t<5:baton.rotation_euler=(worldhand(B,0)-baton.location).to_track_quat('Z','Y').to_euler()
    if t>12.8:
        baton.location=path(t,[(12.8,tuple(worldhand(B,1))),(13.15,(2.8,1.1,.12)),(27,(2.8,1.1,.12))]); baton.rotation_euler=(pi/2,.1,1)
    donut.scale=(1,1,1) if 5.3<t<20.6 else (.001,.001,.001)
    if t<12.65:
        donut.location=worldhand(H,1)+Vector((0,-.1,.17)); donut.rotation_euler=(pi/2,0,t*.12)
    elif t<14.75:
        u=max(0,min(1,(t-12.65)/1.35))
        donut.location=lerp((2.65,-2.0,2.5),(3.6,5.2,2.5),u)+Vector((0,0,1.8*sin(pi*u)))
        donut.rotation_euler=(t*9,t*3,0)
    else:
        donut.location=worldhand(B,1)+Vector((-.16,-.08,.12)); donut.rotation_euler=(pi/2,0,t*.12)
        if t>19.8:donut.scale=(1-ease(t,19.8,20.6),)*3
    # Shot list: action is kept central with room at the top and bottom for Shorts UI.
    if t<1.5:camera((8,-12,9),(0,-2.0,.7),8.4-.25*t)
    elif t<2.05:camera((3,-7,4.5),(-.2,.7,2.25),5.3)
    elif t<5:camera((10,-14,11),(1,0,1.1),11.6)
    elif t<6.5:camera((6,-9,5),(2,-1.0,2.0),6.1)
    elif t<8.4:
        focus=B['head'].matrix_world.translation+Vector((0,0,-.25))
        camera(focus+Vector((-4,-4,1.6)),focus,4.7-.10*(t-6.5))
    elif t<12:camera((9,-13,8),(2,.2,2),9.0)
    elif t<15.3:camera((10,-11,9),(3,2.1,2),10.4)
    elif t<16.4:camera((6,-4,4.5),(3.6,4.25,2.5),6.1)
    elif t<17.35:camera((9,-9,7),(3,2.5,2.1),9.0)
    elif t<18.05:camera((3,-3,3.0),(1.5,2.4,1.95),3.7)
    elif t<20.6:camera((9,-11,9),(1.8,3.8,1.9),10.5)
    elif t<22.0:camera((4.2,-5,4.1),(3.6,4.15,2.8),5.8)
    elif t<23.4:camera((3,-3,4.8),(-1.6,4.6,2.2),5.3)
    else:camera((10,1,3.8),(3.55,2.1,1.9),7.4+.2*ease(t,25,27))
    if 16.98<t<17.16 or 24.8<t<25.0:cam.location.x+=.05*sin(t*150)
    bpy.context.view_layer.update()

def render(t,folder,name):
    apply(t); folder.mkdir(parents=True,exist_ok=True)
    S.render.filepath=str(folder/name)
    bpy.ops.render.render(write_still=True)

if __name__=='__main__':
    build=ROOT/'сборка'; build.mkdir(exist_ok=True)
    apply(6.9)
    bpy.ops.wm.save_as_mainfile(filepath=str(build/'barry-scene.blend'))
    if args.stills:
        for t in [.8,1.7,3.7,5.9,7.2,9.1,11.3,13.4,14.5,15.7,17.1,17.7,19,21.3,22.8,25.8]:
            render(t,build/'lookdev',f'{t:04.1f}.png')
    if args.probe or args.render:
        start,end=(315,555) if args.probe else (args.start,args.end)
        folder=build/(('probe-frames' if args.probe else 'frames-final')+('-720' if args.width==720 else ''))
        if args.batch:
            folder=build/(('batch-probe-v2' if args.probe else 'batch-final-v2')+('' if args.width==720 else '-1080'))
            folder.mkdir(exist_ok=True)
            S.frame_start=start+1; S.frame_end=end; S.frame_step=args.step
            S.render.filepath=str(folder/'#####'); S.render.use_overwrite=False
            def update_frame(scene):
                apply((scene.frame_current-1)/60)
                print('BATCH FRAME',scene.frame_current,flush=True)
            bpy.app.handlers.frame_change_pre.append(update_frame)
            bpy.ops.render.render(animation=True)
            bpy.app.handlers.frame_change_pre.remove(update_frame)
        else:
            for f in range(start,end,args.step):
                dest=folder/f'{f:05d}.png'
                if dest.exists():continue
                render(f/60,folder,dest.name)
                print('FRAME',f,flush=True)
    if args.bake:
        for f in range(0,1620,2):
            apply(f/60)
            for o in AN:
                for dp in ['location','rotation_euler','scale']:o.keyframe_insert(data_path=dp,frame=f+1)
            cd.keyframe_insert(data_path='ortho_scale',frame=f+1)
        for o in AN:
            if o.animation_data:
                for fc in o.animation_data.action.fcurves:
                    for k in fc.keyframe_points:k.interpolation='LINEAR'
        # Hard editorial cuts, no camera travel through walls between shots.
        for fc in cam.animation_data.action.fcurves:
            for k in fc.keyframe_points:
                if any(abs(k.co.x-(cut*60-1))<1 for cut in [1.5,2.05,5,6.5,8.4,12,15.3,16.4,17.35,18.05,20.6,22,23.4]):k.interpolation='CONSTANT'
        S.frame_set(1)
        target=ROOT/'ассеты'/'сцена'; target.mkdir(parents=True,exist_ok=True)
        if bpy.app.build_options.audaspace:
            S.sequence_editor_create()
            S.sequence_editor.sequences.new_sound('Original score and Foley',str(build/'soundtrack.wav'),channel=1,frame_start=1)
        else:
            print('Audaspace unavailable: soundtrack is supplied as separate WAV; MP4 audio is muxed by FFmpeg.',flush=True)
        bpy.ops.file.pack_all()
        source=bpy.data.texts.new('film.py'); source.write(Path(__file__).read_text(encoding='utf8'))
        bpy.ops.wm.save_as_mainfile(filepath=str(target/'barry-animation.blend'))
    if args.audit:
        import json
        from bpy_extras.object_utils import world_to_camera_view
        result=[]
        for t,names in [(0.8,['H']),(1.7,['B']),(3.7,['H','B']),(5.9,['H','donut']),(7.2,['B']),
                        (9.1,['H','B','donut']),(13.4,['B','donut']),(15.7,['B']),(17.7,['latch']),
                        (21.3,['B']),(22.8,['H']),(25.8,['B'])]:
            apply(t)
            for n in names:
                o={'H':H['head'],'B':B['head'],'donut':donut,'latch':latch}[n]
                v=world_to_camera_view(S,cam,o.matrix_world.translation)
                result.append(dict(time=t,subject=n,x=round(v.x,3),y=round(v.y,3),inside=.05<v.x<.95 and .08<v.y<.92))
        (build/'framing-audit.json').write_text(json.dumps(result,indent=2),encoding='utf8')
        print(json.dumps(result,indent=2),flush=True)
    if args.web:
        import json
        target=build/'web-render'; target.mkdir(exist_ok=True)
        for i,o in enumerate(AN):o['anim_id']=i
        apply(0)
        if not args.update_timeline:
            bpy.ops.export_scene.gltf(filepath=str(target/'scene.glb'),export_format='GLB',export_animations=False,
                export_yup=False,export_apply=True,export_extras=True,export_cameras=False,export_lights=False,use_renderable=True)
        frames=json.loads((target/'timeline.json').read_text(encoding='utf8'))['frames'] if args.update_timeline else []
        for f in range(args.start,args.end):
            apply(f/60)
            states=[]
            for o in AN:
                q=o.rotation_euler.to_quaternion()
                states.append([round(v,6) for v in (*o.location,q.x,q.y,q.z,q.w,*o.scale)])
            state=dict(p=states,o=round(cd.ortho_scale,6))
            if args.update_timeline:frames[f]=state
            else:frames.append(state)
            if f%120==0:print('TIMELINE',f,flush=True)
        (target/'timeline.json').write_text(json.dumps(dict(camera=AN.index(cam),frames=frames),separators=(',',':')),encoding='utf8')
        print('WEB EXPORT COMPLETE',flush=True)
