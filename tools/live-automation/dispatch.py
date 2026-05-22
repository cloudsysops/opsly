#!/usr/bin/env python3
"""
Structured live automation → OBS WebSocket 5 (obsws-python).

Environment (OBS → Tools → WebSocket Server Settings):
  OBS_WEBSOCKET_HOST   default 127.0.0.1
  OBS_WEBSOCKET_PORT   default 4455
  OBS_WEBSOCKET_PASSWORD  required if OBS has a password set

No shell injection: only allowlisted actions with typed parameters.
"""
from __future__ import annotations

import argparse
import json
import os
import sys
from typing import Any, Callable

Payload = dict[str, Any]


def _serialize(v: Any) -> Any:
    if isinstance(v, (str, int, float, bool)) or v is None:
        return v
    if isinstance(v, dict):
        return {k: _serialize(x) for k, x in v.items()}
    if isinstance(v, (list, tuple)):
        return [_serialize(x) for x in v]
    if hasattr(v, "__dict__"):
        return {k: _serialize(x) for k, x in vars(v).items() if not k.startswith("_")}
    return str(v)


def _client():
    import obsws_python as obs

    host = os.environ.get("OBS_WEBSOCKET_HOST", "127.0.0.1")
    port = int(os.environ.get("OBS_WEBSOCKET_PORT", "4455"))
    password = os.environ.get("OBS_WEBSOCKET_PASSWORD", "")
    return obs.ReqClient(host=host, port=port, password=password, timeout=10)


def _as_dict(obj: Any) -> dict[str, Any]:
    if obj is None:
        return {}
    if isinstance(obj, dict):
        return {k: _serialize(v) for k, v in obj.items()}
    if hasattr(obj, "__dict__"):
        return {k: _serialize(v) for k, v in vars(obj).items() if not k.startswith("_")}
    return {"value": _serialize(obj)}


def _action_get_version(client: Any, _: Payload) -> dict[str, Any]:
    return _as_dict(client.get_version())


def _action_get_stream_status(client: Any, _: Payload) -> dict[str, Any]:
    return _as_dict(client.get_stream_status())


def _action_start_stream(client: Any, _: Payload) -> dict[str, Any]:
    client.start_stream()
    return {"ok": True, "action": "start_stream"}


def _action_stop_stream(client: Any, _: Payload) -> dict[str, Any]:
    client.stop_stream()
    return {"ok": True, "action": "stop_stream"}


def _action_set_current_program_scene(client: Any, p: Payload) -> dict[str, Any]:
    name = p.get("scene_name")
    if not isinstance(name, str) or not name.strip():
        raise ValueError("set_current_program_scene requires non-empty string scene_name")
    client.set_current_program_scene(name.strip())
    return {"ok": True, "action": "set_current_program_scene", "scene_name": name.strip()}


def _action_get_current_program_scene(client: Any, _: Payload) -> dict[str, Any]:
    return _as_dict(client.get_current_program_scene())


def _action_get_scene_list(client: Any, _: Payload) -> dict[str, Any]:
    return _as_dict(client.get_scene_list())


ALLOWED: dict[str, Callable[[Any, Payload], dict[str, Any]]] = {
    "get_version": _action_get_version,
    "get_stream_status": _action_get_stream_status,
    "start_stream": _action_start_stream,
    "stop_stream": _action_stop_stream,
    "set_current_program_scene": _action_set_current_program_scene,
    "get_current_program_scene": _action_get_current_program_scene,
    "get_scene_list": _action_get_scene_list,
}


def run_command(payload: Payload) -> dict[str, Any]:
    action = payload.get("action")
    if not isinstance(action, str) or action not in ALLOWED:
        known = ", ".join(sorted(ALLOWED))
        raise ValueError(f"unknown or missing action: {action!r}. Allowed: {known}")

    params = payload.get("params")
    if params is None:
        params = {}
    if not isinstance(params, dict):
        raise ValueError("params must be an object when present")

    client = _client()
    try:
        return ALLOWED[action](client, params)
    finally:
        closer = getattr(client, "disconnect", None)
        if callable(closer):
            try:
                closer()
            except Exception:
                pass


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Opsly OBS WebSocket structured dispatch")
    parser.add_argument(
        "payload",
        nargs="?",
        help="JSON object, e.g. '{\"action\":\"get_version\"}'. If omitted, read stdin.",
    )
    args = parser.parse_args(argv)

    raw = args.payload
    if raw is None:
        raw = sys.stdin.read()
    if not raw.strip():
        parser.error("empty JSON")

    try:
        payload = json.loads(raw)
    except json.JSONDecodeError as e:
        print(json.dumps({"ok": False, "error": f"invalid json: {e}"}), file=sys.stderr)
        return 2

    if not isinstance(payload, dict):
        print(json.dumps({"ok": False, "error": "root must be a JSON object"}), file=sys.stderr)
        return 2

    try:
        out = run_command(payload)
        print(json.dumps({"ok": True, "data": out}, indent=2))
        return 0
    except Exception as e:
        print(json.dumps({"ok": False, "error": str(e)}), file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
