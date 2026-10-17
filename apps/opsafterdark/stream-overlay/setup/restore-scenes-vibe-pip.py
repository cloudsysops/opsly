#!/usr/bin/env python3
"""Restaura layout del 30/09 (Vibe Glass, Overlay PC) con Game Capture + VIBE_PIP. Idempotente, hace backup."""
import json,copy,shutil,time,uuid,os
import sys
# Uso (OBS CERRADO): python3 restore-scenes-vibe-pip.py <OpsAfterDark.json> <backup-30sep.json>
P=sys.argv[1]
OLD=sys.argv[2]
shutil.copy(P,P+'.bak-pre-restore-'+time.strftime('%Y%m%d-%H%M%S'))
d=json.load(open(P,encoding='utf-8'))
old=json.load(open(OLD,encoding='utf-8'))
src={s['name']:s for s in d['sources']}
osrc={s['name']:s for s in old['sources']}
def items(sc,dd=src): return dd[sc]['settings']['items']
def item(sc,name,dd=src):
    return next((i for i in items(sc,dd) if i['name']==name),None)
def norel(it):
    for k in ('pos_rel','scale_rel','bounds_rel'): it.pop(k,None)
def setxf(it,**kw):
    it.update(kw); norel(it)
def new_item(sc,source,**kw):
    s=src[sc]['settings']; tmpl=copy.deepcopy(item('Coding','Window Capture'))
    s['id_counter']=s.get('id_counter',0)+1
    tmpl.update(name=source['name'],source_uuid=source['uuid'],id=s['id_counter'],visible=True,rot=0.0,
                scale={'x':1.0,'y':1.0},crop_left=0,crop_top=0,crop_right=0,crop_bottom=0)
    setxf(tmpl,**kw); s['items'].append(tmpl); return tmpl
# 1) window captures por herramienta (match por ejecutable, priority=2)
wc_t=src['Window Capture']
tools=[('VIBE · Claude','Claude:Chrome_WidgetWin_1:claude.exe'),
       ('VIBE · ChatGPT','ChatGPT:Chrome_WidgetWin_1:ChatGPT.exe'),
       ('VIBE · Cursor','Cursor:Chrome_WidgetWin_1:Cursor.exe'),
       ('VIBE · Terminal','OpenCode:CASCADIA_HOSTING_WINDOW_CLASS:WindowsTerminal.exe')]
caps=[]
for name,win in tools:
    if name in src: caps.append(src[name]); continue
    s=copy.deepcopy(wc_t); s.update(name=name,uuid=str(uuid.uuid4()))
    s['settings']=dict(wc_t['settings'],window=win,priority=2)
    d['sources'].append(s); src[name]=s; caps.append(s)
# 2) escena anidada VIBE_PIP (una herramienta visible a la vez; por defecto Terminal)
if 'VIBE_PIP' not in src:
    sc=copy.deepcopy(src['Vertical Scene']); sc.update(name='VIBE_PIP',uuid=str(uuid.uuid4()))
    sc['settings']={'id_counter':0,'custom_size':False,'items':[]}
    sc.pop('canvas_uuid',None)
    d['sources'].append(sc); src['VIBE_PIP']=sc
    for c in caps:
        new_item('VIBE_PIP',c,pos={'x':0.0,'y':0.0},bounds_type=2,bounds={'x':2560.0,'y':1440.0},bounds_align=0)
    new_item('VIBE_PIP',src['MISSION_CONTROL_DEV_PANEL'],pos={'x':0.0,'y':0.0},bounds_type=2,bounds={'x':2560.0,'y':1440.0},bounds_align=0)
    for it in items('VIBE_PIP'): it['visible']=(it['name']=='VIBE · Terminal')
    d['scene_order'].append({'name':'VIBE_PIP'})
pip=src['VIBE_PIP']
# 3) Coding: como el 30/09, pero el área del agente = VIBE_PIP
co=item('Coding','Window Capture'); oc=item('Coding','Window Capture',osrc)
co['visible']=False
if not item('Coding','VIBE_PIP'):
    new_item('Coding',pip,pos={'x':40.0,'y':140.0},bounds_type=2,bounds={'x':1600.0,'y':900.0},bounds_align=0)
item('Coding','Vibe Coding Glass')['visible']=True
item('Coding','MISSION_CONTROL_DEV_PANEL')['visible']=False
for n in ['Reloj','Marca OpsAfterDark']: item('Coding',n)['visible']=False
# 4) Gaming y BF6: juego + BATTLEFIELD 6 stats + Vibe Glass + mini agente abajo-izq
for sc in ['Gaming','Battlefield 6 — Día 2']:
    for n in ['Reloj','Marca OpsAfterDark']: item(sc,n)['visible']=False
    if not item(sc,'VIBE_PIP'):
        new_item(sc,pip,pos={'x':30.0,'y':1030.0},bounds_type=2,bounds={'x':640.0,'y':360.0},bounds_align=0)
for n in ['Overlay PC — Live','Vibe Coding Glass']:
    if not item('Gaming',n):
        t=copy.deepcopy(item('Battlefield 6 — Día 2',n)); s=src['Gaming']['settings']
        s['id_counter']+=1; t['id']=s['id_counter']; t['visible']=True; s['items'].append(t)
with open(P,'w',encoding='utf-8') as f:\n    json.dump(d,f,ensure_ascii=False,indent=4)
for sc in ['Gaming','Coding','Battlefield 6 — Día 2','VIBE_PIP']:
    print(sc,[(i['name'],i['visible']) for i in items(sc)])
