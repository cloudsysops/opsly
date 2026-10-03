#!/usr/bin/env python3
"""Crea la escena CODING_4 (2x2 igual que el monitor LG: Claude | Cursor / ChatGPT | OpenCode-WSL). OBS CERRADO. Idempotente, backup previo.
Uso: python3 add_coding4.py <OpsAfterDark.json>"""
import json,copy,shutil,time,uuid,sys
P=sys.argv[1]
shutil.copy(P,P+'.bak-pre-coding4-'+time.strftime('%Y%m%d-%H%M%S'))
with open(P,encoding='utf-8') as f:\n    d=json.load(f)
src={s['name']:s for s in d['sources']}
SCENE='CODING_4'
wc=src['Window Capture']                      # plantilla: WGC method 2 (OpenCode)
tools=[('VIBE · Claude','Claude:Chrome_WidgetWin_1:claude.exe'),
       ('VIBE · Cursor','Cursor:Chrome_WidgetWin_1:Cursor.exe'),
       ('VIBE · ChatGPT','ChatGPT:Chrome_WidgetWin_1:ChatGPT.exe'),
       ('VIBE · Terminal',wc['settings']['window'])]
caps=[]
for name,win in tools:
    if name not in src:
        s=copy.deepcopy(wc); s.update(name=name,uuid=str(uuid.uuid4()))
        s['settings']=dict(wc['settings'],window=win,priority=2,method=2,client_area=True)
        d['sources'].append(s); src[name]=s
    caps.append(src[name])
tmpl_item=next(i for s in d['sources'] if s['name']=='Coding' for i in s['settings']['items'] if i['name']=='Window Capture')
def mk(source,i,x,y,w,h,vis=True):
    it=copy.deepcopy(tmpl_item)
    for k in ('pos_rel','scale_rel','bounds_rel'): it.pop(k,None)
    it.update(name=source['name'],source_uuid=source['uuid'],id=i,visible=vis,rot=0.0,
              pos={'x':float(x),'y':float(y)},scale={'x':1.0,'y':1.0},bounds_type=2,
              bounds={'x':float(w),'y':float(h)},bounds_align=0,crop_left=0,crop_top=0,crop_right=0,crop_bottom=0)
    return it
G=16; W=(2560-3*G)//2; H=(1440-3*G)//2
cells=[(G,G),(2*G+W,G),(G,2*G+H),(2*G+W,2*G+H)]
items=[mk(c,n+1,x,y,W,H) for n,(c,(x,y)) in enumerate(zip(caps,cells))]
# privacidad: recortar barras laterales con lista de chats (px de la ventana; ajustar en OBS con Alt+arrastrar)
CROP={'VIBE · Claude':295,'VIBE · ChatGPT':335}  # oculta lista de chats, nombre de cuenta y proyectos
for it in items:
    if it['name'] in CROP: it['crop_left']=CROP[it['name']]
# overlays existentes encima (sin audio nuevo): HUD, Alertas, Marca
n=len(items)
for name,(x,y) in [('HUD OpsAfterDark',(30,20)),('Alertas',(0,0))]:
    if name in src: n+=1; it=mk(src[name],n,x,y,0,0); it['bounds_type']=0; it.pop('bounds',None); items.append(it)
# Cortina de privacidad (reusa fuentes BRB existentes), OCULTA por defecto; se activa con el ojo o un hotkey
for name in ('Fondo BRB','Texto BRB'):
    if name in src:
        n+=1; it=mk(src[name],n,0,0,2560,1440,vis=False)
        if name=='Texto BRB': it['bounds_type']=0; it.pop('bounds',None); it['pos']={'x':1280.0,'y':720.0}
        items.append(it)
for a in ('MIC_OPERATOR',):
    if a in src: n+=1; it=mk(src[a],n,0,0,0,0); it['bounds_type']=0; items.append(it)
if SCENE in src:
    src[SCENE]['settings']['items']=items; src[SCENE]['settings']['id_counter']=n
else:
    sc=copy.deepcopy(next(s for s in d['sources'] if s['id']=='scene' and s['name']=='Vertical Scene' or s['name']=='Coding'))
    sc.update(name=SCENE,uuid=str(uuid.uuid4())); sc.pop('canvas_uuid',None)
    sc['settings']={'id_counter':n,'custom_size':False,'items':items}
    sc['hotkeys']={'OBSBasic.SelectScene':[]}
    d['sources'].append(sc); d['scene_order'].append({'name':SCENE})
with open(P,'w',encoding='utf-8') as f:\n    json.dump(d,f,ensure_ascii=False,indent=4)
print(SCENE,[(i['name'],i['pos'],i.get('bounds')) for i in items])
