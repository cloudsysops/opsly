#!/usr/bin/env python3
"""
Minimal OSC sender for Ableton (or any OSC receiver), e.g. AbletonOSC / Max bridge.

Environment:
  OPSLY_OSC_HOST  default 127.0.0.1
  OPSLY_OSC_PORT  default 11000 (change to match your bridge)

Example:
  python3 osc_send.py /live/tempo 128.0
  python3 osc_send.py /live/start_playing
"""
from __future__ import annotations

import argparse
import json
import os
import sys


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Send one OSC message (python-osc)")
    parser.add_argument("address", help="OSC address, e.g. /live/tempo")
    parser.add_argument(
        "values",
        nargs="*",
        help="Optional values: floats/ints/strings inferred from text",
    )
    args = parser.parse_args(argv)

    try:
        from pythonosc import udp_client
    except ImportError:
        print("Install deps: pip install -r tools/live-automation/requirements.txt", file=sys.stderr)
        return 2

    host = os.environ.get("OPSLY_OSC_HOST", "127.0.0.1")
    port = int(os.environ.get("OPSLY_OSC_PORT", "11000"))

    parsed: list[float | int | str | bool] = []
    for v in args.values:
        lv = v.lower()
        if lv in ("true", "false"):
            parsed.append(lv == "true")
            continue
        try:
            if "." in v:
                parsed.append(float(v))
            else:
                parsed.append(int(v))
        except ValueError:
            parsed.append(v)

    client = udp_client.SimpleUDPClient(host, port)
    if not parsed:
        client.send_message(args.address, [])
    elif len(parsed) == 1:
        client.send_message(args.address, parsed[0])
    else:
        client.send_message(args.address, tuple(parsed))
    print(
        json.dumps(
            {"ok": True, "host": host, "port": port, "address": args.address, "values": parsed},
        )
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
