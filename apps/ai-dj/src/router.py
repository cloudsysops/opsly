"""Router de acciones del AI DJ: text DSL + JSON -> acción ejecutable.

El agente NO llama LLMs directamente (el tráfico LLM va por LLM Gateway). Este
módulo resuelve el `prompt_content` del worker contra un vocabulario
determinista de acciones. Si algo no se entiende, devuelve un error con la
lista de acciones soportadas.
"""
import json
import re

import setlist as setlist_mod
from mapping_xml import FUNCTION_MAP
from mapping_xml import generate as mapping_generate
from mapping_xml import install as mapping_install


class ActionError(RuntimeError):
    pass


SUPPORTED = [
    "stream.start", "stream.stop", "stream.status",
    "scene.set", "scene.list",
    "deck.play", "deck.pause", "deck.cue", "deck.sync",
    "deck.tempo", "deck.load", "deck.hotcue", "deck.loop", "deck.fx",
    "mixer.crossfader",
    "setlist.next", "setlist.pick",
    "library.stats",
    "mapping.install", "mapping.path", "mapping.functions",
    "status.all",
]


def _as_json_text(text: str) -> tuple | None:
    text = text.strip()
    if text[:1] not in ("{", "["):
        return None
    try:
        obj = json.loads(text)
    except json.JSONDecodeError:
        return None
    if isinstance(obj, dict) and "action" in obj:
        return ("action", obj["action"], obj.get("params") or {})
    return None


def parse(text) -> tuple:  # -> (action, params)
    if isinstance(text, dict):
        if "action" not in text:
            raise ActionError("prompt_content JSON sin clave 'action'")
        return text["action"], text.get("params") or {}
    text = (text or "").strip()
    hit = _as_json_text(text)
    if hit:
        return hit[1], hit[2]
    low = text.lower()

    m = re.fullmatch(r"stream\s+(start|stop|status)", low)
    if m:
        return f"stream.{m.group(1)}", {}
    m = re.fullmatch(r"scene\s+([\w\s\-_()]+)", text)
    if m:
        return "scene.set", {"scene": m.group(1).strip()}
    m = re.fullmatch(r"scene\s+list", low)
    if m:
        return "scene.list", {}
    m = re.fullmatch(r"(?:deck\s+|d\s+)?([ab])\s*(play|pause|stop|sync|cue)", low)
    if m:
        action = {"play": "deck.play", "pause": "deck.pause",
                  "stop": "deck.pause", "sync": "deck.sync", "cue": "deck.cue"}[m.group(2)]
        return action, {"deck": m.group(1).upper()}
    m = re.fullmatch(r"(play|pause|stop|sync|cue)\s+([ab])", low)
    if m:
        action = {"play": "deck.play", "pause": "deck.pause",
                  "stop": "deck.pause", "sync": "deck.sync", "cue": "deck.cue"}[m.group(1)]
        return action, {"deck": m.group(2).upper()}
    m = re.fullmatch(r"(deck|d)?\s*([ab])\s*tempo\s+(up|down)\s*([0-9.]+|)", low)
    if m:
        return "deck.tempo", {"deck": m.group(2).upper(),
                              "direction": m.group(3), "amount": float(m.group(4) or 0)}
    m = re.fullmatch(r"(deck|d)?\s*([ab])\s*load\s+(.+)", text)
    if m:
        return "deck.load", {"deck": m.group(2).upper(), "query": m.group(3).strip()}
    m = re.fullmatch(r"(deck|d)?\s*([ab])\s*hotcue\s+([1-4])", low)
    if m:
        return "deck.hotcue", {"deck": m.group(2).upper(), "slot": int(m.group(3))}
    m = re.fullmatch(r"(deck|d)?\s*([ab])\s*loop\s+(on|off)", low)
    if m:
        return "deck.loop", {"deck": m.group(2).upper(), "state": m.group(3)}
    m = re.fullmatch(r"(deck|d)?\s*([ab])\s*fx\s*(on|off)?", low)
    if m:
        return "deck.fx", {"deck": m.group(2).upper(), "state": m.group(3) or "on"}
    m = re.fullmatch(r"crossfader\s+([0-9]+)(%|)", low)
    if m:
        return "mixer.crossfader", {"percent": min(100, int(m.group(1)))}
    m = re.fullmatch(r"setlist\s+(next|pick)\s*(up|down|neutral)?\s*(\d+)?", low)
    if m:
        return f"setlist.{m.group(1)}", {
            "energy": m.group(2) or "up",
            "count": int(m.group(3) or 3) if m.group(1) == "next" else 1,
        }
    m = re.fullmatch(r"library\s+stats", low)
    if m:
        return "library.stats", {}
    m = re.fullmatch(r"mapping\s+(install|path|functions)", low)
    if m:
        return f"mapping.{m.group(1)}", {}
    m = re.fullmatch(r"status\s+all", low)
    if m:
        return "status.all", {}
    m = re.fullmatch(r"(help|actions)", low)
    if m:
        return "status.all", {}
    raise ActionError(f"sintaxis no reconocida: {text!r}")


class Router:
    def __init__(self, ctx):
        self.ctx = ctx
        self.last_setlist: list[dict] = []
        self.last_load = None

    # ------------------------------------------------------------------
    def resolve(self, text):
        action, params = parse(text)
        return self._exec(action, params)

    def _exec(self, action, params):
        s = self.ctx
        obs, midi = s.obs, s.midi
        notes = s.config.get("midi", {}).get("notes", {})
        cc = s.config.get("midi", {}).get("crossfader_cc", 84)

        if action == "stream.start":
            obs.start_stream()
            return "stream iniciado"
        if action == "stream.stop":
            obs.stop_stream()
            return "stream detenido"
        if action == "stream.status":
            st = obs.stream_status()
            active = st.get("outputActive")
            return f"stream {'ACTIVO' if active else 'inactivo'} (reconnecting={st.get('outputReconnecting')})"
        if action == "scene.set":
            obs.set_scene(params["scene"])
            return f"escena a {params['scene']}"
        if action == "scene.list":
            scenes = (obs.get_scene_list().get("scenes") or [])
            return "escenas: " + ", ".join(x.get("sceneName", "?") for x in scenes)
        if action == "deck.play":
            midi.note(params["deck"], notes.get("play", 88))
            return f"play {params['deck']}"
        if action in ("deck.pause",):
            midi.note(params["deck"], notes.get("play", 88), on=False)
            return f"pause {params['deck']}"
        if action == "deck.cue":
            midi.note(params["deck"], notes.get("cue", 89))
            return f"cue {params['deck']}"
        if action == "deck.sync":
            midi.note(params["deck"], notes.get("sync", 90))
            return f"sync {params['deck']}"
        if action == "deck.tempo":
            amount = params.get("amount") or 1.0
            note = 97 if params["direction"] == "up" else 98
            midi.note(params["deck"], notes.get("tempo_up" if params["direction"] == "up" else "tempo_down", note))
            return f"tempo{'+' if params['direction']=='up' else '-'} {amount} {params['deck']}"
        if action == "deck.load":
            track = self._find_track(params["query"])
            midi.note(params["deck"], notes.get("load", 93))
            result = f"load {track['title']} en {params['deck']}"
            self.last_load = track
            return result
        if action == "deck.hotcue":
            slot = params["slot"]
            note = int(notes.get("hotcue", 94)) + slot - 1
            midi.note(params["deck"], note)
            return f"hotcue {slot} {params['deck']}"
        if action == "deck.loop":
            midi.note(params["deck"], notes.get("loop", 95), on=(params["state"] == "on"))
            return f"loop {params['state']} {params['deck']}"
        if action == "deck.fx":
            midi.note(params["deck"], notes.get("fx_on_off", 96), on=(params["state"] == "on"))
            return f"fx {'on' if params['state']=='on' else 'off'} {params['deck']}"
        if action == "mixer.crossfader":
            midi.cc("M", cc, round(params["percent"] * 127 / 100))
            return f"crossfader {params['percent']}%"
        if action == "setlist.next":
            lib = s.library
            tracks = self._filter(lib)
            last_key = (self.last_load or {}).get("key") or s.last_key or ""
            last_bpm = s.last_bpm or _pick_bpm(tracks)
            picks = setlist_mod.plan_next(
                tracks, last_key=last_key, last_bpm=last_bpm,
                count=params.get("count", 3), energy=params.get("energy") or "up",
                seed=s.config.get("setlist", {}).get("seed"),
                bpm_tolerance_pct=float(s.config.get("setlist", {}).get("bpm_tolerance_pct", 8)),
                max_bpm_delta_pct=float(s.config.get("setlist", {}).get("max_bpm_delta_pct", 15)),
            )
            self.last_setlist = picks
            if not picks:
                return "sin pistas que encajen (revisa library.stats)"
            lines = [f"{i+1}. {t.get('title','?')} — {t.get('artist','')} @ {t.get('bpm')}|{t.get('key','-')}" for i, t in enumerate(picks)]
            return "setlist: " + " | ".join(lines)
        if action == "setlist.pick":
            return "usá: setlist next [up|down|neutral] [count] (o: deck X load <título>)"
        if action == "library.stats":
            st = setlist_mod.status(s.library)
            base = s.library_stats
            return f"librería: {base['total']} pistas (bpm {base['con_bpm']}), keys camelot {st['tracks_con_key_camelot']}"
        if action == "mapping.install":
            serato = s.config.get("serato", {})
            xml_dir = serato.get("midi_xml_dir", "")
            xml_text = mapping_generate(
                tuple(s.config.get("midi", {}).get("deck_channels", ["A", "B"])),
                notes,
                cc,
            )
            path = mapping_install(xml_dir, xml_text)
            s.mapping_path = path
            return f"mapping instalado en {path} (reiniciar/recargar Serato)"
        if action == "mapping.path":
            return s.mapping_path or "no instalado (mapping install)"
        if action == "mapping.functions":
            return ", ".join(sorted(set(FUNCTION_MAP.values())))
        if action == "status.all":
            states = []
            try:
                active = obs.stream_status().get("outputActive")
                states.append(f"stream:{'on' if active else 'off'}")
            except Exception as exc:  # noqa: BLE001
                states.append(f"stream:error({exc})")
            states.append(f"midi:{'ok' if midi.ready else 'no'}")
            states.append(f"libreria:{len(s.library)}")
            return " | ".join(states) + " | acciones: " + ", ".join(SUPPORTED)
        raise ActionError(f"acción sin implementar: {action}")

    # ------------------------------------------------------------------
    def _find_track(self, query: str) -> dict:
        q = query.lower()
        for t in self.last_setlist + self._filter(self.ctx.library):
            hay = f"{t.get('title','')} {t.get('artist','')}".lower()
            if q in hay:
                return t
        raise ActionError(f"sin pista que contenga {query!r}")

    def _filter(self, library):
        return library


def _pick_bpm(tracks) -> float:
    bpm = [t["bpm"] for t in tracks if isinstance(t.get("bpm"), (int, float))]
    return sorted(bpm)[len(bpm) // 2] if bpm else 124.0