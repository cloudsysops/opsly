#!/usr/bin/env python3
"""Servicio HTTP del agente AI DJ (puerto 5013).

Endpoints (contrato worker local del orquestador):
  GET  /health   -> {"ok": true, ...}
  POST /execute  -> body JSON {prompt_content, agent_role, max_steps, job_id, model?}
                     responde {"success": bool, "result": str, "job_id": str,
                               "execution_time_ms": int}

Config: JSON en env OPSLY_AI_DJ_CONFIG, o `config.json` en el cwd/src, o
`config.example.json`. Opcional auth Bearer si OPSLY_CLI_AGENT_TOKEN está en el
entorno.

El agente NO llama LLMs: resuelve `prompt_content` contra un vocabulario
determinista (router.py). Correr en el Mac junto a Serato.
"""
import json
import os
import sys
import time
import traceback
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import urlparse

SRC = os.path.dirname(os.path.abspath(__file__))
if SRC not in sys.path:
    sys.path.insert(0, SRC)

import midi_serato  # noqa: E402
import obs_client  # noqa: E402
import router as router_mod  # noqa: E402
import serato_library  # noqa: E402
from mapping_xml import install as mapping_install  # noqa: E402
from mapping_xml import generate as mapping_generate  # noqa: E402

SERVICE_NAME = "ai-dj"
SERVICE_VERSION = "0.1.0"
AGENT_TOKEN = os.environ.get("OPSLY_CLI_AGENT_TOKEN", "")

DEFAULT_CONFIG = {
    "host": "127.0.0.1",
    "port": 5013,
    "serato": {
        "db_path": "/Users/dragon/Music/_Serato_/database V2",
        "midi_xml_dir": "/Users/dragon/Music/_Serato_/MIDI/Xml",
        "virtual_port_name": "OPSLY AI DJ",
        "library_json": "",
    },
    "midi": {
        "deck_channels": ["A", "B"],
        "notes": {"play": 88, "cue": 89, "sync": 90, "back": 91, "fwd": 92,
                  "load": 93, "hotcue": 94, "loop": 95, "fx_on_off": 96,
                  "tempo_up": 97, "tempo_down": 98},
        "crossfader_cc": 84,
    },
    "obs": {
        "endpoint": "ws://127.0.0.1:4455",
        "password_file": "",
        "password_env": "OBS_WEBSOCKET_PASSWORD",
        "connect_timeout_s": 10,
    },
    "setlist": {"bpm_tolerance_pct": 8, "max_bpm_delta_pct": 15,
                "default_energy": "up", "seed": 20260924},
}


def load_config() -> dict:
    path = os.environ.get("OPSLY_AI_DJ_CONFIG") or os.path.join(SRC, "config.json")
    if not os.path.exists(path):
        candidate = os.path.join(os.path.dirname(os.path.dirname(SRC)), "config.json")
        if os.path.exists(candidate):
            path = candidate
        else:
            path = os.path.join(SRC, "config.example.json")
    data = json.load(open(path, encoding="utf-8"))
    merged = json.loads(json.dumps(DEFAULT_CONFIG))
    merged.update(data)
    for section in ("serato", "midi", "obs", "setlist"):
        merged[section].update(data.get(section) or {})
    return merged


def load_obs_password(cfg: dict) -> str | None:
    obs = cfg["obs"]
    secret = os.environ.get(obs.get("password_env") or "OBS_WEBSOCKET_PASSWORD", "")
    if not secret and obs.get("password_file"):
        try:
            for line in open(obs["password_file"], encoding="utf-8"):
                if line.strip().startswith("OBS_WEBSOCKET_PASSWORD="):
                    secret = line.strip().split("=", 1)[1].strip().strip('"')
        except OSError:
            pass
    return secret or None


class Context:
    def __init__(self, cfg: dict):
        self.config = cfg
        self.library: list[dict] = []
        self.library_stats: dict = {}
        self.mapping_path: str | None = None
        self.last_key = ""
        self.last_bpm: float | None = None
        self.midi = midi_serato.SeratoMidi(
            cfg["serato"].get("virtual_port_name", "OPSLY AI DJ"),
            cfg.get("midi", {}).get("deck_channels", ["A", "B"]),
        )
        self.obs = obs_client.ObsClient(
            cfg["obs"]["endpoint"],
            password=load_obs_password(cfg),
            timeout=float(cfg["obs"].get("connect_timeout_s", 10)),
        )
        self.router = router_mod.Router(self)

    def refresh_library(self) -> str:
        try:
            self.library = serato_library.load_library(
                self.config["serato"].get("db_path", ""),
                self.config["serato"].get("library_json", ""),
            )
            self.library_stats = serato_library.stats(self.library)
            return f"librería cargada: {len(self.library)} pistas"
        except serato_library.LibraryError as exc:
            self.library = []
            return f"librería sin cargar: {exc}"

    def ensure_library(self) -> str:
        if not self.library:
            return self.refresh_library()
        return ""


class Handler(BaseHTTPRequestHandler):
    ctx: Context = None  # fijado por el servicio

    # ------------------------------------------------------------------
    def log_message(self, *args):
        return

    def _send(self, status: int, obj):
        body = json.dumps(obj).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def _require_auth(self) -> bool:
        if not AGENT_TOKEN:
            return True
        header = self.headers.get("Authorization", "")
        if header == f"Bearer {AGENT_TOKEN}":
            return True
        self._send(401, {"success": False, "result": "unauthorized"})
        return False

    def _read_prompt(self) -> str | dict:
        length = int(self.headers.get("Content-Length") or 0)
        raw = self.rfile.read(length).decode("utf-8", "replace")
        if not raw:
            return ""
        try:
            obj = json.loads(raw)
        except json.JSONDecodeError:
            return raw
        if isinstance(obj, dict):
            for key in ("prompt_content", "prompt", "input"):
                if key in obj:
                    return obj[key]
            return obj
        return raw

    # ------------------------------------------------------------------ routes
    def do_GET(self):
        path = urlparse(self.path).path
        if not self._require_auth():
            return
        if path == "/health":
            self._send(200, {"ok": True, "service": SERVICE_NAME,
                             "version": SERVICE_VERSION,
                             "job": "ai-dj"})
        elif path == "/actions":
            self._send(200, {"actions": router_mod.SUPPORTED})
        else:
            self._send(404, {"success": False, "result": "ruta no encontrada"})

    def do_POST(self):
        path = urlparse(self.path).path
        if not self._require_auth():
            return
        if path != "/execute":
            self._send(404, {"success": False, "result": "ruta no encontrada"})
            return
        start = time.monotonic()
        job_id = None
        try:
            raw = self._read_prompt()
            meta = raw if isinstance(raw, dict) else {}
            prompt = meta.get("prompt_content") if meta.get("prompt_content") else raw
            if not isinstance(prompt, str):
                prompt = json.dumps(prompt)
            job_id = meta.get("job_id") or "unknown"
            self.ctx.ensure_library()
            result = self.ctx.router.resolve(prompt)
            self._send(200, {
                "success": True,
                "result": result,
                "response_content": result,
                "model": None,
                "job_id": job_id,
                "execution_time_ms": int((time.monotonic() - start) * 1000),
            })
        except Exception as exc:  # noqa: BLE001
            detail = f"{type(exc).__name__}: {exc}"
            if isinstance(exc, router_mod.ActionError):
                detail = str(exc)
            self._send(200, {
                "success": False,
                "result": detail,
                "response_content": detail,
                "model": None,
                "job_id": job_id or "unknown",
                "execution_time_ms": int((time.monotonic() - start) * 1000),
            })


def build_server(cfg: dict) -> ThreadingHTTPServer:
    ctx = Context(cfg)
    Handler.ctx = ctx
    host = cfg.get("host", "127.0.0.1")
    port = int(cfg.get("port", 5013))
    server = ThreadingHTTPServer((host, port), Handler)
    return server


def main():
    cfg = load_config()
    try:
        server = build_server(cfg)
    except KeyboardInterrupt:
        return
    host, port = server.server_address
    print(f"ai-dj agent escuchando en ws://{host}:{port}/execute", flush=True)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("parando ai-dj agent", flush=True)


if __name__ == "__main__":
    main()