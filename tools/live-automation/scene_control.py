#!/usr/bin/env python3
"""
Ops After Dark stream-safe scene control.

Implements the allowlisted logical scene adapter described in
docs/streaming/REMOTE-STREAM-CONTROL.md on top of the canonical dispatch
allowlist in dispatch.py. Scene names are logical and stable; physical OBS
scene names come from scene_map.py and are never created, renamed or deleted.

Examples:
    oadctl status
    oadctl scene gaming
    oadctl scene factory --dry-run

OBS WebSocket credentials are read from the environment by dispatch.py and are
never accepted as arguments or echoed.
"""
from __future__ import annotations

import argparse
import json
import os
import subprocess
import sys
import urllib.error
import urllib.request
from typing import Any, Mapping, Sequence

import dispatch
import scene_map
from scene_map import SceneBinding

PROBE_TIMEOUT_SECONDS = 2.0


def _field(obj: Any, *names: str) -> Any:
    for name in names:
        if isinstance(obj, Mapping) and name in obj:
            return obj[name]
        if hasattr(obj, name):
            return getattr(obj, name)
    return None


def _scene_names(payload: Any) -> list[str]:
    raw = _field(payload, "scenes") or []
    names: list[str] = []
    for item in raw:
        if isinstance(item, str):
            names.append(item)
            continue
        name = _field(item, "name", "scene_name", "sceneName")
        if isinstance(name, str):
            names.append(name)
            continue
        text = str(item)
        marker = "name="
        if marker in text:
            names.append(text.split(marker, 1)[1].split(",", 1)[0].strip("'\" "))
    return names


def _available_physical(payload: Any) -> set[str]:
    return set(_scene_names(payload))


def _current_scene(payload: Any) -> str | None:
    value = _field(
        payload, "current_program_scene_name", "currentProgramSceneName", "scene_name"
    )
    return value if isinstance(value, str) and value.strip() else None


def _probe(urls: Sequence[str]) -> list[dict[str, Any]]:
    results: list[dict[str, Any]] = []
    for url in urls:
        entry: dict[str, Any] = {"url": url, "ok": False}
        try:
            with urllib.request.urlopen(url, timeout=PROBE_TIMEOUT_SECONDS) as response:
                entry["status"] = int(response.status)
                entry["ok"] = 200 <= int(response.status) < 400
        except urllib.error.HTTPError as error:
            entry["status"] = int(error.code)
            entry["ok"] = False
        except Exception as error:
            entry["error"] = type(error).__name__
        results.append(entry)
    return results


def _running_processes() -> str | None:
    try:
        if os.name == "nt":
            result = subprocess.run(
                ["tasklist.exe"], capture_output=True, text=True, timeout=10
            )
        else:
            result = subprocess.run(
                ["ps", "-eo", "comm"], capture_output=True, text=True, timeout=10
            )
    except Exception:
        return None
    if result.returncode != 0:
        return None
    return result.stdout.lower()


def _probe_processes(names: Sequence[str]) -> list[dict[str, Any]]:
    haystack = _running_processes()
    results: list[dict[str, Any]] = []
    for name in names:
        key = name.lower()
        results.append(
            {
                "process": name,
                "ok": haystack is not None and key in haystack,
                "probe": "ok" if haystack is not None else "unavailable",
            }
        )
    return results


def _unmet_requirements(binding: SceneBinding) -> list[dict[str, Any]]:
    unmet = [entry for entry in _probe(binding.requires) if not entry["ok"]]
    unmet.extend(entry for entry in _probe_processes(binding.requires_process) if not entry["ok"])
    return unmet


def _describe_unmet(entries: Sequence[Mapping[str, Any]]) -> str:
    labels = []
    for entry in entries:
        if "url" in entry:
            labels.append(str(entry["url"]))
        elif "process" in entry:
            labels.append(f"process {entry['process']} not running")
        else:
            labels.append(str(entry))
    return ", ".join(labels)


def _status(client: Any) -> dict[str, Any]:
    scene_list = dispatch.ALLOWED["get_scene_list"](client, {})
    stream = dispatch.ALLOWED["get_stream_status"](client, {})
    recording = dispatch.ALLOWED["get_record_status"](client, {})

    current = _current_scene(scene_list) or _current_scene(
        dispatch.ALLOWED["get_current_program_scene"](client, {})
    )

    return {
        "current_physical_scene": current,
        "current_logical_scene": scene_map.logical_for_physical(current) if current else None,
        "stream_output_active": bool(_field(stream, "output_active", "outputActive")),
        "recording_active": bool(
            _field(recording, "output_active", "outputActive")
        ),
        "scenes": scene_map.describe(_available_physical(scene_list)),
    }


def _switch(client: Any, requested: str, dry_run: bool, allow_degraded: bool) -> dict[str, Any]:
    binding = scene_map.resolve_remote(requested)

    scene_list = dispatch.ALLOWED["get_scene_list"](client, {})
    available = _available_physical(scene_list)
    if binding.physical not in available:
        raise LookupError(
            f"physical scene {binding.physical!r} for {binding.logical} is missing from OBS; "
            "refusing to create or rename scenes"
        )

    unmet = _unmet_requirements(binding)
    previous = _current_scene(scene_list)

    if dry_run:
        return {
            "dry_run": True,
            "logical": binding.logical,
            "physical": binding.physical,
            "current_physical_scene": previous,
            "would_switch": previous != binding.physical,
            "would_be_blocked": bool(unmet),
            "unmet_requirements": unmet,
        }

    if unmet and not allow_degraded:
        raise RuntimeError(
            f"{binding.logical} would show nothing useful because a dependency is "
            f"unreachable ({_describe_unmet(unmet)}); "
            "re-run with --allow-degraded if this is intentional"
        )

    dispatch.ALLOWED["set_current_program_scene"](
        client, {"scene_name": binding.physical}
    )
    readback = _current_scene(dispatch.ALLOWED["get_current_program_scene"](client, {}))

    if readback != binding.physical:
        raise RuntimeError(
            f"scene switch did not take effect: requested {binding.physical!r}, "
            f"OBS reports {readback!r}"
        )

    return {
        "dry_run": False,
        "logical": binding.logical,
        "physical": binding.physical,
        "previous_physical_scene": previous,
        "current_physical_scene": readback,
        "verified": True,
        "unmet_requirements": unmet,
    }


def run(argv: Sequence[str] | None = None) -> tuple[int, dict[str, Any]]:
    parser = argparse.ArgumentParser(
        prog="oadctl",
        description="Ops After Dark allowlisted scene control",
    )
    parser.add_argument("--dry-run", action="store_true", help="plan only, never mutate OBS")
    parser.add_argument(
        "--allow-degraded",
        action="store_true",
        help="allow switching to a scene whose overlay dependency is unreachable",
    )
    sub = parser.add_subparsers(dest="command", required=True)
    sub.add_parser("status", help="report current scene and stream state")
    scene_parser = sub.add_parser("scene", help="switch to an allowlisted logical scene")
    scene_parser.add_argument("name", help="logical scene name or alias")

    args = parser.parse_args(argv)

    client = dispatch._client()
    try:
        if args.command == "status":
            return 0, _status(client)
        return 0, _switch(client, args.name, args.dry_run, args.allow_degraded)
    finally:
        closer = getattr(client, "disconnect", None)
        if callable(closer):
            try:
                closer()
            except Exception:
                pass


def main(argv: Sequence[str] | None = None) -> int:
    try:
        code, payload = run(argv)
    except PermissionError as error:
        print(json.dumps({"ok": False, "error": str(error)}), file=sys.stderr)
        return 3
    except LookupError as error:
        print(json.dumps({"ok": False, "error": str(error)}), file=sys.stderr)
        return 4
    except (ValueError, RuntimeError) as error:
        print(json.dumps({"ok": False, "error": str(error)}), file=sys.stderr)
        return 2
    except Exception as error:
        print(
            json.dumps({"ok": False, "error": f"{type(error).__name__}: {error}"}),
            file=sys.stderr,
        )
        return 1

    print(json.dumps({"ok": True, "data": payload}, indent=2, ensure_ascii=False))
    return code


if __name__ == "__main__":
    raise SystemExit(main())