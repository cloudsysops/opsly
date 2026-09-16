#!/usr/bin/env python3
"""Watch for OBS coming online and ensure a display-capture source exists.

Mauro opens OBS himself on his own schedule (launching it into his
interactive Windows session from outside is unreliable and out of scope —
see docs/runbooks/PC-GAMER-GAMEPLAY-WATCHER.md). This watcher polls the OBS
WebSocket bridge; once OBS is reachable it checks whether the target scene
already has a display-capture source and creates one if not. It never
touches streaming (start_stream/stop_stream stay blocked by
tools/live-automation/dispatch.py and scripts/opsly-live-obs-windows.ps1)
and it is idempotent — safe to leave running indefinitely.

Environment:
  OBS_WEBSOCKET_HOST          default 127.0.0.1
  OBS_WEBSOCKET_PORT          default 4455
  OBS_WEBSOCKET_PASSWORD      required if OBS has a password set
  OBS_SCENE_NAME              optional; defaults to the current program scene
  OBS_CAPTURE_INPUT_NAME      default "Display Capture"
  OBS_WATCHER_POLL_SECONDS       default 30  (used while OBS is offline or just acted)
  OBS_WATCHER_IDLE_POLL_SECONDS  default 300 (used once the source is confirmed present)
"""
from __future__ import annotations

import logging
import os
import time
from typing import Optional

import obsws_python as obs

HOST = os.environ.get("OBS_WEBSOCKET_HOST", "127.0.0.1")
PORT = int(os.environ.get("OBS_WEBSOCKET_PORT", "4455"))
PASSWORD = os.environ.get("OBS_WEBSOCKET_PASSWORD", "")
INPUT_NAME = os.environ.get("OBS_CAPTURE_INPUT_NAME", "Display Capture")
SCENE_OVERRIDE = os.environ.get("OBS_SCENE_NAME", "").strip() or None
POLL_SECONDS = int(os.environ.get("OBS_WATCHER_POLL_SECONDS", "30"))
IDLE_POLL_SECONDS = int(os.environ.get("OBS_WATCHER_IDLE_POLL_SECONDS", "300"))

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
log = logging.getLogger("obs-capture-source-watcher")


def connect() -> Optional[obs.ReqClient]:
    try:
        return obs.ReqClient(host=HOST, port=PORT, password=PASSWORD, timeout=5)
    except Exception as exc:  # OBS not running, wrong password, etc.
        log.debug("OBS not reachable yet: %s", exc)
        return None


def target_scene(client: obs.ReqClient) -> str:
    if SCENE_OVERRIDE:
        return SCENE_OVERRIDE
    try:
        return client.get_current_program_scene().current_program_scene_name
    except Exception:
        return "Scene"


def has_capture_source(client: obs.ReqClient, scene_name: str) -> bool:
    items = client.get_scene_item_list(scene_name).scene_items
    return any(item.get("sourceName") == INPUT_NAME for item in items)


def ensure_capture_source() -> str:
    """Returns one of: not_reachable, already_present, created, error."""
    client = connect()
    if client is None:
        return "not_reachable"
    try:
        scene_name = target_scene(client)
        if has_capture_source(client, scene_name):
            log.debug("capture source '%s' already present in scene '%s'", INPUT_NAME, scene_name)
            return "already_present"
        client.create_input(scene_name, INPUT_NAME, "monitor_capture", {}, True)
        log.info("added display-capture source '%s' to scene '%s'", INPUT_NAME, scene_name)
        return "created"
    except Exception as exc:
        log.warning("could not ensure capture source: %s", exc)
        return "error"
    finally:
        closer = getattr(client, "disconnect", None)
        if callable(closer):
            try:
                closer()
            except Exception:
                pass


def main() -> int:
    if not PASSWORD:
        log.warning("OBS_WEBSOCKET_PASSWORD is not set; connections will fail if OBS requires auth")
    log.info(
        "watching for OBS at %s:%s — will ensure input '%s' exists (poll %ss, idle %ss)",
        HOST, PORT, INPUT_NAME, POLL_SECONDS, IDLE_POLL_SECONDS,
    )
    while True:
        state = ensure_capture_source()
        time.sleep(IDLE_POLL_SECONDS if state == "already_present" else POLL_SECONDS)
    return 0  # pragma: no cover — infinite loop, unreachable


if __name__ == "__main__":
    raise SystemExit(main())
