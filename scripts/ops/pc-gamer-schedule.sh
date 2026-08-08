#!/usr/bin/env bash
# Lee config/pc-gamer-schedule.json y reporta el modo actual (gaming|light|heavy).
# Exit 0 siempre en --json/--status; exit 2 si --require-mode no coincide.
#
# Usage:
#   ./scripts/ops/pc-gamer-schedule.sh
#   ./scripts/ops/pc-gamer-schedule.sh --json
#   ./scripts/ops/pc-gamer-schedule.sh --allow heavy
#   ./scripts/ops/pc-gamer-schedule.sh --allow opencode
#   ./scripts/ops/pc-gamer-schedule.sh --at "2026-08-08T20:00:00-05:00"
#   PC_GAMER_MODE_OVERRIDE=gaming ./scripts/ops/pc-gamer-schedule.sh --json
#
set -euo pipefail

JSON_OUT=false
ALLOW_CLASS=""
AT_ISO=""
SHOW_WEEK=false

while [[ $# -gt 0 ]]; do
  case "$1" in
    --json) JSON_OUT=true; shift ;;
    --allow)
      ALLOW_CLASS="${2:-}"
      shift 2
      ;;
    --at)
      AT_ISO="${2:-}"
      shift 2
      ;;
    --week)
      SHOW_WEEK=true
      shift
      ;;
    -h|--help)
      sed -n '2,16p' "$0"
      exit 0
      ;;
    *)
      echo "Unknown arg: $1" >&2
      exit 1
      ;;
  esac
done

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
CFG="${PC_GAMER_SCHEDULE_FILE:-$ROOT/config/pc-gamer-schedule.json}"

if [[ ! -f "$CFG" ]]; then
  echo "[schedule] missing $CFG" >&2
  exit 1
fi

if ! command -v python3 >/dev/null 2>&1; then
  echo "[schedule] python3 required" >&2
  exit 1
fi

export PC_GAMER_SCHEDULE_FILE="$CFG"
export PC_GAMER_MODE_OVERRIDE="${PC_GAMER_MODE_OVERRIDE:-}"
export PC_GAMER_AT_ISO="$AT_ISO"
export PC_GAMER_ALLOW_CLASS="$ALLOW_CLASS"
export PC_GAMER_SHOW_WEEK="$SHOW_WEEK"
export PC_GAMER_JSON_OUT="$JSON_OUT"

python3 <<'PY'
import json
import os
import sys
from datetime import datetime, time
from zoneinfo import ZoneInfo

cfg_path = os.environ["PC_GAMER_SCHEDULE_FILE"]
with open(cfg_path, encoding="utf-8") as f:
    cfg = json.load(f)

tz_name = cfg.get("timezone") or "America/Bogota"
tz = ZoneInfo(tz_name)
override = (os.environ.get("PC_GAMER_MODE_OVERRIDE") or "").strip().lower()
at_iso = (os.environ.get("PC_GAMER_AT_ISO") or "").strip()
allow_class = (os.environ.get("PC_GAMER_ALLOW_CLASS") or "").strip().lower()
show_week = os.environ.get("PC_GAMER_SHOW_WEEK") == "true"
json_out = os.environ.get("PC_GAMER_JSON_OUT") == "true"

if at_iso:
    now = datetime.fromisoformat(at_iso)
    if now.tzinfo is None:
        now = now.replace(tzinfo=tz)
    else:
        now = now.astimezone(tz)
else:
    now = datetime.now(tz)

day_keys = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"]
day = day_keys[now.weekday()]


def parse_hhmm(s: str) -> time:
    h, m = s.split(":")
    hh = int(h)
    mm = int(m)
    if hh == 24 and mm == 0:
        return time(23, 59, 59)
    return time(hh, mm)


def mode_for(dt: datetime) -> str:
    # exceptions first
    for ex in cfg.get("exceptions") or []:
        start = datetime.fromisoformat(ex["start"]).astimezone(tz)
        end = datetime.fromisoformat(ex["end"]).astimezone(tz)
        if start <= dt < end:
            return ex["mode"]
    dkey = day_keys[dt.weekday()]
    slots = (cfg.get("weekly") or {}).get(dkey) or []
    t = dt.time()
    for slot in slots:
        start = parse_hhmm(slot["start"])
        end = parse_hhmm(slot["end"])
        # half-open [start, end); end 24:00 → end of day
        if slot["end"] == "24:00":
            if t >= start:
                return slot["mode"]
        elif start <= t < end:
            return slot["mode"]
    return "light"


mode = override if override in ("gaming", "light", "heavy") else mode_for(now)
modes = cfg.get("modes") or {}
meta = modes.get(mode) or {}
allow = list(meta.get("allow_enqueue") or [])
deny = list(meta.get("deny_enqueue") or [])

allowed = True
if allow_class:
    if allow_class in deny:
        allowed = False
    elif allow_class not in allow and allow_class not in ("light", "heavy", "opencode", "ollama_short", "ollama_generate_long"):
        allowed = False
    elif allow_class not in allow:
        allowed = False

payload = {
    "ok": True,
    "timezone": tz_name,
    "now": now.isoformat(),
    "weekday": day,
    "mode": mode,
    "override": override or None,
    "draft": True,
    "owner": cfg.get("owner"),
    "description": meta.get("description"),
    "allow_enqueue": allow,
    "deny_enqueue": deny,
    "worker_hint": meta.get("worker_hint") or {},
    "allowed": allowed if allow_class else None,
    "allow_class": allow_class or None,
    "config": cfg_path,
}

if show_week:
    summary = {}
    for d in day_keys:
        summary[d] = (cfg.get("weekly") or {}).get(d) or []
    payload["weekly"] = summary
    payload["task_classes"] = cfg.get("task_classes") or {}

if json_out:
    print(json.dumps(payload, ensure_ascii=False, indent=2))
else:
    print(f"mode={mode} now={now.strftime('%a %Y-%m-%d %H:%M %Z')} owner={cfg.get('owner')}")
    print(f"  {meta.get('description', '')}")
    print(f"  allow={','.join(allow) or '-'} deny={','.join(deny) or '-'}")
    if allow_class:
        print(f"  allow_check class={allow_class} → {'OK' if allowed else 'BLOCKED'}")
    if show_week:
        for d in day_keys:
            slots = (cfg.get("weekly") or {}).get(d) or []
            parts = [f"{s['start']}-{s['end']}={s['mode']}" for s in slots]
            print(f"  {d}: " + "; ".join(parts))

if allow_class and not allowed:
    sys.exit(2)
PY
