#!/usr/bin/env python3
"""Plan Tailscale node-key hygiene without calling the API or printing secrets."""

from __future__ import annotations

import argparse
import datetime as dt
import json
import sys
from typing import Any

DEFAULT_CONFIG: dict[str, Any] = {
    "warn_days": 14,
    "servers": [
        "pc-gamer",
        "vps-dragon",
        "opsly-worker",
        "opsly-admin",
        "opslyquantum",
        "opsly-quantum",
    ],
    "exclude": ["github-runner", "opsly-gha-", "github-actions"],
}


def load_config(path: str | None) -> dict[str, Any]:
    if not path:
        return dict(DEFAULT_CONFIG)
    with open(path, encoding="utf-8") as handle:
        payload = json.load(handle)
    merged = dict(DEFAULT_CONFIG)
    merged.update(payload)
    return merged


def parse_expiry(raw: str | None) -> dt.datetime | None:
    if not raw or not isinstance(raw, str):
        return None
    text = raw.strip()
    if not text or text in {"0001-01-01T00:00:00Z", "0001-01-01T00:00:00.000Z"}:
        return None
    if text.endswith("Z"):
        text = text[:-1] + "+00:00"
    try:
        parsed = dt.datetime.fromisoformat(text)
    except ValueError:
        return None
    if parsed.tzinfo is None:
        parsed = parsed.replace(tzinfo=dt.timezone.utc)
    return parsed.astimezone(dt.timezone.utc)


def device_haystack(device: dict[str, Any]) -> str:
    parts = [
        str(device.get("name") or ""),
        str(device.get("hostname") or ""),
        str(device.get("givenName") or ""),
    ]
    return " ".join(parts).lower()


def matches_any(haystack: str, needles: list[str]) -> bool:
    return any(needle.lower() in haystack for needle in needles if needle)


def days_until(expiry: dt.datetime, now: dt.datetime) -> int:
    delta = expiry - now
    return int(delta.total_seconds() // 86400)


def plan_device(
    device: dict[str, Any],
    config: dict[str, Any],
    now: dt.datetime,
) -> dict[str, Any]:
    device_id = str(device.get("id") or device.get("nodeId") or "")
    name = str(device.get("name") or device.get("hostname") or device_id or "?")
    haystack = device_haystack(device)
    excluded = matches_any(haystack, list(config.get("exclude") or []))
    server = matches_any(haystack, list(config.get("servers") or []))
    disabled = bool(device.get("keyExpiryDisabled"))
    expiry = parse_expiry(
        device.get("keyExpiry") or device.get("expires") or device.get("keyExpiryTs")
    )
    remaining: int | None = days_until(expiry, now) if expiry else None
    expired = remaining is not None and remaining < 0
    warn_days = int(config.get("warn_days") or 14)
    row: dict[str, Any] = {
        "id": device_id,
        "name": name,
        "server": server,
        "excluded": excluded,
        "key_expiry_disabled": disabled,
        "expires_at": expiry.strftime("%Y-%m-%dT%H:%M:%SZ") if expiry else None,
        "days_remaining": remaining,
        "expired": expired,
        "action": "ok",
    }
    if excluded or not device_id:
        row["action"] = "skip"
        return row
    if server and not disabled:
        row["action"] = "disable_expiry"
        return row
    if not server and remaining is not None and remaining <= warn_days:
        row["action"] = "warn"
        return row
    return row


def plan_devices(
    devices: list[dict[str, Any]],
    config: dict[str, Any],
    now: dt.datetime | None = None,
) -> dict[str, Any]:
    clock = now or dt.datetime.now(dt.timezone.utc)
    actions = [plan_device(device, config, clock) for device in devices]
    return {
        "generated_at": clock.strftime("%Y-%m-%dT%H:%M:%SZ"),
        "warn_days": int(config.get("warn_days") or 14),
        "device_count": len(actions),
        "disable_count": sum(1 for row in actions if row["action"] == "disable_expiry"),
        "warn_count": sum(1 for row in actions if row["action"] == "warn"),
        "ok_count": sum(1 for row in actions if row["action"] == "ok"),
        "skip_count": sum(1 for row in actions if row["action"] == "skip"),
        "actions": actions,
    }


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Plan Tailscale node-key hygiene.")
    parser.add_argument("--config", default="", help="JSON config path")
    parser.add_argument("--devices-json", default="-", help="Devices JSON file or - for stdin")
    args = parser.parse_args(argv)
    config = load_config(args.config or None)
    raw = sys.stdin.read() if args.devices_json == "-" else read_text(args.devices_json)
    payload = json.loads(raw)
    devices = payload.get("devices", payload if isinstance(payload, list) else [])
    if not isinstance(devices, list):
        print("ERROR: expected {devices: []} JSON", file=sys.stderr)
        return 2
    print(json.dumps(plan_devices(devices, config), indent=2))
    return 0


def read_text(path: str) -> str:
    with open(path, encoding="utf-8") as handle:
        return handle.read()


if __name__ == "__main__":
    raise SystemExit(main())
