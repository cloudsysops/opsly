#!/usr/bin/env python3
"""Unit tests for Tailscale node-key hygiene planner."""

from __future__ import annotations

import datetime as dt
import json
import unittest
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[3]
sys.path.insert(0, str(ROOT / "scripts" / "ops"))

from tailscale_key_hygiene import (  # noqa: E402
    DEFAULT_CONFIG,
    load_config,
    plan_devices,
)


NOW = dt.datetime(2026, 9, 8, 12, 0, tzinfo=dt.timezone.utc)


def _device(
    *,
    device_id: str,
    name: str,
    hostname: str = "",
    expiry: str | None,
    disabled: bool = False,
) -> dict:
    payload: dict = {
        "id": device_id,
        "name": name,
        "hostname": hostname,
        "keyExpiryDisabled": disabled,
    }
    if expiry is not None:
        payload["expires"] = expiry
        payload["keyExpiry"] = expiry
    return payload


class TailscaleKeyHygieneTest(unittest.TestCase):
    def test_disables_expiry_on_matching_server(self) -> None:
        devices = [
            _device(
                device_id="5765286086734854",
                name="pc-gamer.tailnet.ts.net",
                hostname="DESKTOP-P06TD4R",
                expiry="2026-09-09T12:00:00Z",
            )
        ]
        plan = plan_devices(devices, DEFAULT_CONFIG, now=NOW)
        self.assertEqual(plan["disable_count"], 1)
        self.assertEqual(plan["actions"][0]["action"], "disable_expiry")
        self.assertEqual(plan["actions"][0]["id"], "5765286086734854")

    def test_skips_server_already_disabled(self) -> None:
        devices = [
            _device(
                device_id="1",
                name="vps-dragon.tailnet.ts.net",
                expiry=None,
                disabled=True,
            )
        ]
        plan = plan_devices(devices, DEFAULT_CONFIG, now=NOW)
        self.assertEqual(plan["disable_count"], 0)
        self.assertEqual(plan["ok_count"], 1)

    def test_warns_on_phone_expiring_soon(self) -> None:
        devices = [
            _device(
                device_id="iphone-1",
                name="iphone-de-carlos.tailnet.ts.net",
                hostname="iPhone",
                expiry="2026-09-09T18:00:00Z",
            )
        ]
        plan = plan_devices(devices, DEFAULT_CONFIG, now=NOW)
        self.assertEqual(plan["warn_count"], 1)
        self.assertEqual(plan["disable_count"], 0)
        self.assertEqual(plan["actions"][0]["action"], "warn")

    def test_ignores_github_runners(self) -> None:
        devices = [
            _device(
                device_id="gha-1",
                name="opsly-gha-linux-1.tailnet.ts.net",
                hostname="github-runner",
                expiry="2026-09-10T00:00:00Z",
            )
        ]
        plan = plan_devices(devices, DEFAULT_CONFIG, now=NOW)
        self.assertEqual(plan["skip_count"], 1)
        self.assertEqual(plan["disable_count"], 0)

    def test_expired_server_still_gets_disable(self) -> None:
        devices = [
            _device(
                device_id="2",
                name="opsly-worker.tailnet.ts.net",
                expiry="2026-09-01T00:00:00Z",
            )
        ]
        plan = plan_devices(devices, DEFAULT_CONFIG, now=NOW)
        self.assertEqual(plan["disable_count"], 1)
        self.assertTrue(plan["actions"][0]["expired"])

    def test_config_json_roundtrip(self) -> None:
        raw = json.dumps(DEFAULT_CONFIG)
        parsed = json.loads(raw)
        self.assertIn("pc-gamer", parsed["servers"])
        self.assertGreater(parsed["warn_days"], 0)

    def test_loads_repo_config(self) -> None:
        config = load_config(str(ROOT / "config" / "tailscale-key-hygiene.json"))
        self.assertIn("pc-gamer", config["servers"])
        self.assertEqual(config["warn_days"], 14)


if __name__ == "__main__":
    unittest.main()
