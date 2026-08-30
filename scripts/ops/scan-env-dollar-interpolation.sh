#!/usr/bin/env bash
# Lista KEYS de un .env cuyos valores tienen `$` sin escapar.
# Compose interpola `$uF` como variable `uF` y avisa "The uF variable is not set"
# con el stack ya sano. Nunca imprime valores.
#
# Usage:
#   ./scripts/ops/scan-env-dollar-interpolation.sh --env-file /opt/opsly/.env
#   ./scripts/ops/scan-env-dollar-interpolation.sh --env-file .env.example
#   ./scripts/ops/scan-env-dollar-interpolation.sh --env-file /tmp/fixture.env --dry-run
#
# Exit 0 = limpio (o --dry-run). Exit 1 = hay keys riesgosas (sin --dry-run).
# Exit 2 = uso / archivo faltante.
set -euo pipefail

DRY_RUN=false
ENV_FILE=""

usage() {
  sed -n '2,14p' "$0"
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --env-file)
      ENV_FILE="${2:-}"
      shift 2
      ;;
    --env-file=*)
      ENV_FILE="${1#*=}"
      shift
      ;;
    --dry-run)
      DRY_RUN=true
      shift
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "[env-dollar] unknown arg: $1" >&2
      exit 2
      ;;
  esac
done

if [[ -z "$ENV_FILE" ]]; then
  echo "[env-dollar] --env-file required" >&2
  usage >&2
  exit 2
fi
if [[ ! -f "$ENV_FILE" ]]; then
  echo "[env-dollar] missing file: $ENV_FILE" >&2
  exit 2
fi

RISKY="$(
  python3 - "$ENV_FILE" <<'PY'
import re
import sys

path = sys.argv[1]
bare = re.compile(r"\$[A-Za-z0-9_]+")
intentional = re.compile(r"\$\{[A-Za-z_][A-Za-z0-9_]*\}")

keys = []
with open(path, encoding="utf-8", errors="replace") as handle:
    for raw in handle:
        line = raw.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, val = line.split("=", 1)
        key = key.strip()
        if not key:
            continue
        if len(val) >= 2 and val[0] == val[-1] and val[0] in ("'", '"'):
            val = val[1:-1]
        tmp = val.replace("$$", "")
        tmp = intentional.sub("", tmp)
        if bare.search(tmp):
            keys.append(key)

for key in keys:
    print(key)
PY
)"

if [[ -z "$RISKY" ]]; then
  echo "[env-dollar] OK: no unescaped \$ interpolation in values"
  exit 0
fi

echo "[env-dollar] keys with unescaped \$ in value (names only):"
while IFS= read -r key; do
  [[ -z "$key" ]] && continue
  printf '  %s\n' "$key"
done <<<"$RISKY"
echo "[env-dollar] fix in Doppler: escape as \$\$ or wrap \${VAR}. Do not cat the .env."

if [[ "$DRY_RUN" == "true" ]]; then
  exit 0
fi
exit 1
