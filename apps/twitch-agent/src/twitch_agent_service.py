#!/usr/bin/env python3
"""Servicio HTTP del agente Twitch (puerto 5014).

Endpoints (contrato worker local del orquestador, igual a apps/ai-dj):
  GET  /health   -> {"ok": true, ...}
  GET  /actions  -> {"actions": [...]}
  POST /execute  -> body JSON {prompt_content, agent_role, max_steps, job_id, model?}
                     responde {"success": bool, "result": str, "job_id": str,
                               "execution_time_ms": int}

Config: JSON en env OPSLY_TWITCH_AGENT_CONFIG, o `config.json` en el cwd/src, o
`config.example.json`. Opcional auth Bearer si OPSLY_CLI_AGENT_TOKEN está en el
entorno.

Credenciales OAuth: runtime/twitch.env (gitignored) vía TWITCH_ENV_FILE.
El agente refresca el access_token solo (proactivo antes de expirar, y
reactivo en un 401), y rota el refresh_token en el mismo archivo — nunca
imprime tokens ni la stream key en logs o respuestas.

El agente NO llama LLMs: resuelve `prompt_content` contra un vocabulario
determinista (router.py). No auto-publica nada por su cuenta: cada acción es
disparada por una llamada explícita a /execute.
"""
import json
import os
import sys
import time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import urlparse

SRC = os.path.dirname(os.path.abspath(__file__))
if SRC not in sys.path:
    sys.path.insert(0, SRC)

import router as router_mod  # noqa: E402
from twitch_client import TwitchClient, TwitchAuthError, TwitchApiError  # noqa: E402

SERVICE_NAME = "twitch-agent"
SERVICE_VERSION = "0.1.0"
AGENT_TOKEN = os.environ.get("OPSLY_CLI_AGENT_TOKEN", "")

DEFAULT_CONFIG = {
    "host": "127.0.0.1",
    "port": 5014,
    "twitch_env_file": "runtime/twitch.env",
}


def load_config() -> dict:
    path = os.environ.get("OPSLY_TWITCH_AGENT_CONFIG") or os.path.join(SRC, "config.json")
    if not os.path.exists(path):
        candidate = os.path.join(os.path.dirname(os.path.dirname(SRC)), "config.json")
        if os.path.exists(candidate):
            path = candidate
        else:
            path = os.path.join(SRC, "config.example.json")
    data = {}
    if os.path.exists(path):
        data = json.load(open(path, encoding="utf-8"))
    merged = dict(DEFAULT_CONFIG)
    merged.update(data)
    return merged


class Context:
    def __init__(self, cfg: dict):
        self.config = cfg
        self.client = TwitchClient(cfg.get("twitch_env_file"))
        self.router = router_mod.Router(self.client)


class Handler(BaseHTTPRequestHandler):
    ctx: Context = None  # fijado por el servicio

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

    def _read_prompt(self):
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

    def do_GET(self):
        path = urlparse(self.path).path
        if not self._require_auth():
            return
        if path == "/health":
            channel_ready = bool(self.ctx.client.broadcaster_id)
            self._send(200, {"ok": True, "service": SERVICE_NAME,
                              "version": SERVICE_VERSION, "job": "twitch-agent",
                              "channel_configured": channel_ready})
        elif path == "/actions":
            self._send(200, {"actions": router_mod.SUPPORTED})
        else:
            self._send(404, {"success": False, "result": "route not found"})

    def do_POST(self):
        path = urlparse(self.path).path
        if not self._require_auth():
            return
        if path != "/execute":
            self._send(404, {"success": False, "result": "route not found"})
            return
        start = time.monotonic()
        job_id = "unknown"
        try:
            raw = self._read_prompt()
            meta = raw if isinstance(raw, dict) else {}
            prompt = meta.get("prompt_content") if meta.get("prompt_content") else raw
            if not isinstance(prompt, str):
                prompt = json.dumps(prompt)
            job_id = meta.get("job_id") or "unknown"
            result = self.ctx.router.resolve(prompt)
            self._send(200, {
                "success": True,
                "result": result,
                "response_content": result,
                "model": None,
                "job_id": job_id,
                "execution_time_ms": int((time.monotonic() - start) * 1000),
            })
        except (router_mod.ActionError, TwitchAuthError, TwitchApiError) as exc:
            detail = str(exc)
            self._send(200, {
                "success": False,
                "result": detail,
                "response_content": detail,
                "job_id": job_id,
                "execution_time_ms": int((time.monotonic() - start) * 1000),
            })
        except Exception as exc:  # noqa: BLE001
            detail = f"{type(exc).__name__}: {exc}"
            self._send(200, {
                "success": False,
                "result": detail,
                "response_content": detail,
                "job_id": job_id,
                "execution_time_ms": int((time.monotonic() - start) * 1000),
            })


def main():
    cfg = load_config()
    ctx = Context(cfg)
    Handler.ctx = ctx
    server = ThreadingHTTPServer((cfg["host"], cfg["port"]), Handler)
    print(f"[{SERVICE_NAME}] listening on {cfg['host']}:{cfg['port']} "
          f"(env file: {ctx.client.env_path})")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass


if __name__ == "__main__":
    main()
