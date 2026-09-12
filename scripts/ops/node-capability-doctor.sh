#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT"

ROLE=""
STRICT=false

usage() {
  cat <<'EOF'
Usage: ./scripts/ops/node-capability-doctor.sh --role mac|gamer|vps [--strict]

Checks whether the current host has the minimum toolchain expected by Opsly.
It does not install packages or print secrets.
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --role) ROLE="${2:-}"; shift 2 ;;
    --strict) STRICT=true; shift ;;
    -h|--help) usage; exit 0 ;;
    *) echo "Unknown argument: $1" >&2; exit 1 ;;
  esac
done

[[ -n "$ROLE" ]] || { usage >&2; exit 2; }

failures=0
check() {
  local cmd="$1"
  local required="$2"
  if command -v "$cmd" >/dev/null 2>&1; then
    printf 'PASS %-18s %s\n' "$cmd" "$(command -v "$cmd")"
  else
    if [[ "$required" == "required" ]]; then
      printf 'FAIL %-18s missing\n' "$cmd"
      failures=$((failures+1))
    else
      printf 'WARN %-18s missing\n' "$cmd"
    fi
  fi
}

case "$ROLE" in
  mac)
    for c in git node npm python3; do check "$c" required; done
    for c in gh tailscale doppler cursor claude codex opencode hermes goose; do check "$c" optional; done
    check npx required
    ;;
  gamer)
    for c in git node npm python3 ffmpeg ffprobe; do check "$c" required; done
    for c in tailscale doppler nvidia-smi ollama; do check "$c" required; done
    echo "INFO worker_id=pc-gamer-openclaw-01"
    echo "INFO production_db_credentials=forbidden"
    echo "INFO release_authority=forbidden"
    ;;
  vps)
    for c in git docker tailscale doppler aws; do check "$c" required; done
    if docker compose version >/dev/null 2>&1; then
      echo "PASS docker-compose      docker compose"
    else
      echo "FAIL docker-compose      missing"
      failures=$((failures+1))
    fi
    echo "INFO external_write_agents=forbidden"
    echo "INFO content_rendering=forbidden"
    ;;
  *)
    echo "Unsupported role: $ROLE" >&2
    exit 2
    ;;
esac

echo "SUMMARY role=$ROLE failures=$failures strict=$STRICT"
if [[ "$STRICT" == "true" && "$failures" -gt 0 ]]; then
  exit 1
fi
exit 0
