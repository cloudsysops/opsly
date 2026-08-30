#!/usr/bin/env bash
# Resuelve el modo actual (gaming/light/heavy) del PC-gamer según config/pc-gamer-schedule.json.
#
# Usage:
#   ./scripts/ops/pc-gamer-schedule.sh
#   ./scripts/ops/pc-gamer-schedule.sh --json
#   ./scripts/ops/pc-gamer-schedule.sh --at 02:30 --day mon --json   # override para testing
#
set -euo pipefail

JSON=false
AT=""
DAY=""

for arg in "$@"; do
  case "$arg" in
    --json) JSON=true ;;
    --at=*) AT="${arg#*=}" ;;
    --day=*) DAY="${arg#*=}" ;;
    -h|--help)
      sed -n '2,8p' "$0"
      exit 0
      ;;
  esac
done
args=("$@")
for i in "${!args[@]}"; do
  if [[ "${args[$i]}" == "--at" && -n "${args[$((i + 1))]:-}" ]]; then AT="${args[$((i + 1))]}"; fi
  if [[ "${args[$i]}" == "--day" && -n "${args[$((i + 1))]:-}" ]]; then DAY="${args[$((i + 1))]}"; fi
done

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
cd "$ROOT"

CONFIG="${PC_GAMER_SCHEDULE_FILE:-config/pc-gamer-schedule.json}"
if [[ ! -f "$CONFIG" ]]; then
  echo "[pc-gamer-schedule] ERROR: missing $CONFIG" >&2
  exit 1
fi

HUMAN=true
[[ "$JSON" == "true" ]] && HUMAN=false

CONFIG="$CONFIG" AT="$AT" DAY="$DAY" HUMAN="$HUMAN" node --input-type=module -e "
  import { readFileSync } from 'node:fs';
  const cfg = JSON.parse(readFileSync(process.env.CONFIG, 'utf8'));
  const tz = cfg.timezone || 'America/Bogota';

  const now = new Date();
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone: tz, weekday: 'short', hour: '2-digit', minute: '2-digit', hour12: false,
  });
  const parts = Object.fromEntries(fmt.formatToParts(now).map((p) => [p.type, p.value]));
  const weekdayMap = { Mon: 'mon', Tue: 'tue', Wed: 'wed', Thu: 'thu', Fri: 'fri', Sat: 'sat', Sun: 'sun' };

  const day = (process.env.DAY || weekdayMap[parts.weekday] || 'mon').toLowerCase();
  const hhmm = process.env.AT || \`\${parts.hour}:\${parts.minute}\`;

  const toMinutes = (t) => {
    const [h, m] = String(t).split(':').map(Number);
    return h * 60 + m;
  };
  const nowMin = toMinutes(hhmm === '24:00' ? '23:59' : hhmm);

  const blocks = cfg.weekly?.[day] || [];
  let block = blocks.find((b) => {
    const start = toMinutes(b.start);
    const end = b.end === '24:00' ? 24 * 60 : toMinutes(b.end);
    return nowMin >= start && nowMin < end;
  });

  if (!block) {
    console.error(\`[pc-gamer-schedule] no block matched for day=\${day} at=\${hhmm}; defaulting to gaming (fail-safe)\`);
    block = { mode: 'gaming' };
  }

  const modeCfg = cfg.modes?.[block.mode] || {};
  const out = {
    timezone: tz,
    day,
    time: hhmm,
    mode: block.mode,
    allow_enqueue: modeCfg.allow_enqueue || [],
    deny_enqueue: modeCfg.deny_enqueue || [],
    worker_hint: modeCfg.worker_hint || {},
  };

  if (process.env.HUMAN === 'true') {
    console.log(\`pc-gamer mode=\${out.mode} day=\${out.day} time=\${out.time} tz=\${out.timezone}\`);
    console.log(\`allow=[\${out.allow_enqueue.join(',')}] deny=[\${out.deny_enqueue.join(',')}]\`);
  } else {
    process.stdout.write(JSON.stringify(out) + '\\n');
  }
"
