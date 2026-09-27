#!/usr/bin/env bash
# Send a Wake-on-LAN magic packet to the PC-gamer from the Mac / this host.
# The gamer Windows must have WOL enabled (scripts/ops/pc-gamer-power-always-on.ps1).
#
# Usage:
#   ./scripts/ops/pc-gamer-wake-on-lan.sh --mac AA:BB:CC:DD:EE:FF
#   ./scripts/ops/pc-gamer-wake-on-lan.sh --mac AA:BB:CC:DD:EE:FF --broadcast 192.168.1.255
#   ./scripts/ops/pc-gamer-wake-on-lan.sh --mac AA:BB:CC:DD:EE:FF --dry-run
#
# Defaults:
#   broadcast = 192.168.1.255  (LAN of the gamer; override with PC_GAMER_LAN_BCAST)
#   port      = 9
#
set -euo pipefail

MAC=""
BCAST="${PC_GAMER_LAN_BCAST:-192.168.1.255}"
PORT="${PC_GAMER_WOL_PORT:-9}"
DRY_RUN=false
TS_HOST="${PC_GAMER_TAILSCALE_HOST:-pc-gamer}"

for arg in "$@"; do
  case "$arg" in
    --mac=*) MAC="${arg#*=}" ;;
    --broadcast=*) BCAST="${arg#*=}" ;;
    --port=*) PORT="${arg#*=}" ;;
    --dry-run) DRY_RUN=true ;;
    -h|--help)
      sed -n '2,18p' "$0"
      exit 0
      ;;
  esac
done
args=("$@")
for i in "${!args[@]}"; do
  if [[ "${args[$i]}" == "--mac" && -n "${args[$((i + 1))]:-}" ]]; then MAC="${args[$((i + 1))]}"; fi
  if [[ "${args[$i]}" == "--broadcast" && -n "${args[$((i + 1))]:-}" ]]; then BCAST="${args[$((i + 1))]}"; fi
done

if [[ -z "$MAC" ]]; then
  echo "ERROR: --mac AA:BB:CC:DD:EE:FF required (MAC of the gamer NIC)" >&2
  exit 1
fi

# Normalize and validate MAC
MAC="$(tr '[:lower:]' '[:upper:]' <<<"$MAC")"
case "$MAC" in
  *?:*:?*) : ;;
  *) echo "ERROR: invalid MAC format: $MAC" >&2; exit 1 ;;
esac

# Build payload: 0xFFFFFFFFFFFF + 16x MAC
hex=$(tr -d ':' <<<"$MAC")
payload="FFFFFFFFFFFF"
for i in $(seq 1 16); do payload+="${hex}"; done

send_packet() {
  # Try python first (no external deps on macOS)
  if command -v python3 >/dev/null 2>&1; then
    python3 - "$BCAST" "$PORT" "$payload" <<'PY'
import socket, sys
bcast, port, payload = sys.argv[1], int(sys.argv[2]), sys.argv[3]
s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
s.setsockopt(socket.SOL_SOCKET, socket.SO_BROADCAST, 1)
data = bytes.fromhex(payload)
s.sendto(data, (bcast, port))
s.close()
print(f"WOL sent to {bcast}:{port} ({len(data)} bytes)")
PY
  elif command -v nc >/dev/null 2>&1; then
    echo "$payload" | xxd -r -p | nc -u "$BCAST" "$PORT"
  else
    echo "ERROR: need python3 or nc+xxd to send the magic packet" >&2
    exit 1
  fi
}

echo "== Wake-on-LAN =="
echo "MAC       : $MAC"
echo "Broadcast : $BCAST:$PORT"
if [[ "$DRY_RUN" == "true" ]]; then
  echo "[dry-run] would send $payload"
  exit 0
fi

send_packet

# Confirm via tailnet (if tailscale cli available)
if command -v tailscale >/dev/null 2>&1; then
  echo "-- waiting for the gamer to rejoin tailnet --"
  for i in $(seq 1 20); do
    if tailscale status 2>/dev/null | grep -qiE "${TS_HOST}.*(active|idle)"; then
      echo "OK: ${TS_HOST} is back on tailnet"
      exit 0
    fi
    sleep 3
  done
  echo "NOTE: ${TS_HOST} not seen on tailnet yet; run check-pc-gamer-online.sh later" >&2
  exit 2
fi