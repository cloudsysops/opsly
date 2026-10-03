#!/usr/bin/env python3
"""Añade OAD_SYSTEM_MONITOR (btop) y OAD_GPU_MONITOR (nvtop) como Window Capture WGC (match por TÍTULO)
a OAD_FACTORY_FOCUS y Coding. OBS CERRADO. Idempotente, backup previo, no borra nada.
Uso: python3 add-monitors.py <coleccion.json>"""
import json,copy,shutil,time,uuid,sys
P=sys.argv[1]; shutil.copy(P,P+'.bak-pre-monitors-'+time.strftime('%Y%m%d-%H%M%S'))
with open(P,encoding='utf-8') as f:
    d=json.load(f)
src={s['name']:s for s in d['sources']}
wc=src['Window Capture']
MON={'OAD_SYSTEM_MONITOR':'OAD-BTOP:CASCADIA_HOSTING_WINDOW_CLASS:WindowsTerminal.exe',
     'OAD_GPU_MONITOR':'OAD-NVTOP:CASCADIA_HOSTING_WINDOW_CLASS:WindowsTerminal.exe'}
for n,w in MON.items():
    if n not in src:
        s=copy.deepcopy(wc); s.update(name=n,uuid=str(uuid.uuid4()))
        s['settings']=dict(wc['settings'],window=w,priority=0,method=2,client_area=True,cursor=False)
        d['sources'].append(s); src[n]=s
tmpl=next(i for i in src['Coding']['settings']['items'] if i['name']=='Window Capture')
def items(sc): return src[sc]['settings']['items']
def get(sc,n): return next((i for i in items(sc) if i['name']==n),None)
def place(it,x,y,w=None,h=None):
    for k in ('pos_rel','scale_rel','bounds_rel'): it.pop(k,None)
    it['pos']={'x':float(x),'y':float(y)}
    if w: it.update(bounds_type=2,bounds={'x':float(w),'y':float(h)},bounds_align=0,scale={'x':1.0,'y':1.0})
def ensure(sc,n,x,y,w,h):
    it=get(sc,n)
    if not it:
        it=copy.deepcopy(tmpl); s=src[sc]['settings']; s['id_counter']=s.get('id_counter',0)+1
        it.update(name=n,source_uuid=src[n]['uuid'],id=s['id_counter'],visible=True,crop_left=0,crop_top=0,crop_right=0,crop_bottom=0)
        items(sc).append(it)
    place(it,x,y,w,h)
G=16
mc=get('OAD_FACTORY_FOCUS','MISSION_CONTROL_DEV_FULL'); place(mc,0,0,2560,1024)
m=get('OAD_FACTORY_FOCUS','Marca OpsAfterDark');  m and place(m,30,978)
W=(2560-3*G)//2
ensure('OAD_FACTORY_FOCUS','OAD_SYSTEM_MONITOR',G,1040,W,384)
ensure('OAD_FACTORY_FOCUS','OAD_GPU_MONITOR',2*G+W,1040,W,384)
place(get('Coding','Window Capture'),G,G,1808,1170)
place(get('Coding','MISSION_CONTROL_DEV_PANEL'),1840,G,704,880)
ensure('Coding','OAD_SYSTEM_MONITOR',1840,912,704,248)
ensure('Coding','OAD_GPU_MONITOR',1840,1176,704,248)
vg=[i for i in items('Coding') if i['name']=='Vibe Coding Glass' and i['visible']]
for i in vg: place(i,G,1200)
mk=get('Coding','Marca OpsAfterDark'); mk and place(mk,1500,1392)
with open(P,'w',encoding='utf-8') as f:
    json.dump(d,f,ensure_ascii=False,indent=4)
for sc in ('OAD_FACTORY_FOCUS','Coding'):
    print(sc,[(i['name'],int(i['pos']['x']),int(i['pos']['y'])) for i in items(sc) if i['visible']])
