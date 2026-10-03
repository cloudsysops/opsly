#!/usr/bin/env python3
"""OpsAfterDark OBS doctor (READ-ONLY). Audita una scene collection de OBS.
Uso: python3 obs-doctor.py <scene-collection.json> [stream.config.json]
No lee perfiles (stream key) ni imprime secretos. Exit 1 si hay FAIL."""
import json, sys
GAMEPLAY = {"Battlefield 6 — Día 2", "Gaming"}
MISSION_CONTROL_URL = "127.0.0.1:4001/mission-control"
FACTORY_SCENE = "OAD_FACTORY_FOCUS"
PRIVATE_CAPTURES = {"monitor_capture"}
def main(p):
    with open(p, encoding="utf-8") as f:\n        d = json.load(f)
    S = {s["name"]: s for s in d["sources"]}
    fails, warns, info = [], [], []
    scenes = [s for s in d["sources"] if s["id"] == "scene"]
    for sc in scenes:
        items = sc["settings"].get("items", [])
        vis = [(i["name"], S.get(i["name"], {}).get("id")) for i in items if i.get("visible")]
        kinds = {k for _, k in vis}
        if sc["name"] in GAMEPLAY:
            mon = [n for n, k in vis if k in PRIVATE_CAPTURES]
            if mon: fails.append(f"[{sc['name']}] captura de monitor visible: {mon} (expone escritorio)")
            if "game_capture" not in kinds: fails.append(f"[{sc['name']}] sin Game Capture visible")
            if "wasapi_process_output_capture" not in kinds: warns.append(f"[{sc['name']}] sin Application Audio Capture (GAME_AUDIO)")
        if sc["name"] == "Coding" and any(k in PRIVATE_CAPTURES for _, k in vis):
            warns.append("[Coding] captura de monitor visible")
        if not items: warns.append(f"[{sc['name']}] escena vacía")
        info.append(f"{sc['name']}: " + ", ".join(n for n, _ in vis))
    for s in d["sources"]:
        if s["id"] == "ndi_source" and not s.get("settings", {}).get("ndi_source_name"):
            warns.append(f"[{s['name']}] NDI sin ndi_source_name configurado")
        if s["id"] == "wasapi_process_output_capture":
            info.append(f"app-audio {s['name']} -> {s['settings'].get('window','?').split(':')[-1]} muted={s.get('muted')}")
    # Mission Control Dev (factory) — fail-closed: solo informa dónde aparece
    mc = [s["name"] for s in d["sources"] if s["id"] == "browser_source" and MISSION_CONTROL_URL in s.get("settings", {}).get("url", "")]
    mc_scenes = [sc["name"] for sc in scenes if any(i["name"] in mc and i.get("visible") for i in sc["settings"].get("items", []))]
    info.append(f"mission-control sources={mc} scenes={mc_scenes}")
    if FACTORY_SCENE not in {sc["name"] for sc in scenes}: warns.append(f"{FACTORY_SCENE} no existe -> oad factory debe seguir NOT_CONFIGURED")
    elif FACTORY_SCENE not in mc_scenes: fails.append(f"{FACTORY_SCENE} existe pero no muestra Mission Control Dev")
    # Pistas vs stream.config.json audioTracks
    if len(sys.argv) > 2:
        with open(sys.argv[2], encoding="utf-8") as f:\n            want = json.load(f).get("audioTracks", {})
        mix = {s["name"]: s.get("mixers", 0) for s in d["sources"]}
        for k in ("AuxAudioDevice1", "AuxAudioDevice2", "DesktopAudioDevice1"):
            if d.get(k): mix[d[k]["name"]] = d[k].get("mixers", 0)
        for name, tracks in want.items():
            if name not in mix: fails.append(f"audioTracks: fuente '{name}' no existe en OBS"); continue
            have = [i + 1 for i in range(6) if mix[name] >> i & 1]
            if sorted(have) != sorted(tracks): warns.append(f"audioTracks: {name} tiene pistas {have}, esperado {tracks}")
    da = d.get("DesktopAudioDevice1")
    if da and not da.get("muted"):
        apps = [s for s in d["sources"] if s["id"] == "wasapi_process_output_capture" and not s.get("muted")]
        if apps: warns.append("Desktop Audio activo junto a Application Audio Capture -> riesgo de audio duplicado")
    print("== OBS DOCTOR ==", p)
    for x in info: print("  ·", x)
    for x in warns: print("  WARN", x)
    for x in fails: print("  FAIL", x)
    print("RESULT:", "FAIL" if fails else ("WARN" if warns else "PASS"))
    return 1 if fails else 0
if __name__ == "__main__": sys.exit(main(sys.argv[1]))
