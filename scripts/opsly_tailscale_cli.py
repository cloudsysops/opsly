#!/usr/bin/env python3
"""
CLI ligera: rutas Tailscale + hook post-agente (sin deps de super_orchestrator).
Uso: python3 scripts/opsly_tailscale_cli.py <routes|ping-vps|ssh-hint|agent-stop-hook> [args]
"""
from __future__ import annotations

import json
import os
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


def _repo_root() -> Path:
    env = os.environ.get("OPSLY_ROOT", "").strip()
    if env:
        return Path(env).resolve()
    here = Path(__file__).resolve()
    return here.parents[1]


def routes_path() -> Path:
    override = os.environ.get("OPSLY_TAILSCALE_ROUTES_JSON", "").strip()
    if override:
        return Path(override).expanduser().resolve()
    return _repo_root() / "config" / "tailscale-routes.json"


def load_routes() -> dict[str, Any]:
    path = routes_path()
    if not path.is_file():
        raise FileNotFoundError(f"Missing tailscale routes file: {path}")
    with path.open(encoding="utf-8") as f:
        return json.load(f)


def ssh_spec(node_key: str = "vps") -> str:
    data = load_routes()
    nodes = data.get("nodes") or {}
    node = nodes.get(node_key) or {}
    spec = (node.get("ssh_spec") or "").strip()
    if not spec:
        raise KeyError(f"nodes.{node_key}.ssh_spec missing in {routes_path()}")
    return spec


def agent_stop_hook() -> dict[str, Any]:
    root = _repo_root()
    log_dir = root / ".cursor" / "hooks" / "logs"
    log_dir.mkdir(parents=True, exist_ok=True)
    log_file = log_dir / "tailscale-agent-stop.jsonl"

    routes = load_routes()
    vps = (routes.get("nodes") or {}).get("vps") or {}
    entry: dict[str, Any] = {
        "ts": datetime.now(timezone.utc).isoformat(),
        "event": "cursor_agent_stop",
        "vps_tailscale_ipv4": vps.get("tailscale_ipv4"),
        "hook_stdin_len": len(os.environ.get("OPSLY_HOOK_STDIN_JSON", "") or ""),
    }

    ping_ok: bool | None = None
    if os.environ.get("OPSLY_HOOK_TAILSCALE_PING", "").strip() == "1":
        name = str(vps.get("name") or "vps-dragon").strip()
        ping_ok = _tailscale_ping(name)

    entry["tailscale_ping_ok"] = ping_ok

    with log_file.open("a", encoding="utf-8") as f:
        f.write(json.dumps(entry, ensure_ascii=False) + "\n")

    return {"ok": True, "logged": str(log_file), "tailscale_ping_ok": ping_ok}


def _tailscale_ping(hostname: str) -> bool:
    try:
        r = subprocess.run(
            ["tailscale", "ping", "-c", "1", hostname],
            capture_output=True,
            text=True,
            timeout=12,
            check=False,
        )
        return r.returncode == 0
    except (FileNotFoundError, subprocess.TimeoutExpired, OSError):
        return False


def print_routes() -> None:
    print(json.dumps(load_routes(), indent=2, ensure_ascii=False))


def print_ssh_hint(node_key: str = "vps") -> None:
    spec = ssh_spec(node_key)
    print(
        json.dumps(
            {
                "ssh_spec": spec,
                "example": f"ssh -o BatchMode=yes -o ConnectTimeout=20 {spec} 'hostname'",
            },
            indent=2,
        )
    )


def main(argv: list[str] | None = None) -> int:
    argv = argv if argv is not None else sys.argv[1:]
    if not argv:
        print(
            "Uso: opsly_tailscale_cli.py <routes|ping-vps|ssh-hint|agent-stop-hook>",
            file=sys.stderr,
        )
        return 2
    sub = argv[0]
    if sub == "routes":
        print_routes()
        return 0
    if sub == "ssh-hint":
        key = argv[1] if len(argv) > 1 else "vps"
        print_ssh_hint(key)
        return 0
    if sub == "ping-vps":
        data = load_routes()
        vps = (data.get("nodes") or {}).get("vps") or {}
        name = str(vps.get("name") or "vps-dragon").strip()
        ok = _tailscale_ping(name)
        print(json.dumps({"tailscale_ping": name, "ok": ok}, indent=2))
        return 0 if ok else 1
    if sub == "agent-stop-hook":
        out = agent_stop_hook()
        print(json.dumps(out, indent=2, ensure_ascii=False))
        return 0
    print(f"Subcomando desconocido: {sub}", file=sys.stderr)
    return 2


if __name__ == "__main__":
    raise SystemExit(main())
