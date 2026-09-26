#!/usr/bin/env bash
# Regresión anti-legacy para la flota gamer consolidada (PR #1673).
# Falla si cualquier script activo (watch / reconnect / online / gpu-load /
# reconnect / opcode plane) vuelve a defaultear a la identidad legacy
# `pc-gamer` / `devops` / puente Windows `wsl -d Ubuntu -u root`.
#
# La identidad canónica del nodo consolidado es:
#   SSH_HOST  = opsly@smdqcia-pc   (sshd DENTRO del WSL)
#   TS_HOST   = smdqcia-pc
#   sudo user = opsly              (NOPASSWD opcional, sin puente Windows)
#
# Uso (CI y local):
#   bash scripts/ci/check-no-gamer-legacy-defaults.sh
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT"

# (default-var) o (asignación `=pc-gamer`) en cualquier script activo.
# También se comprueban los plist de launchd que orquestan el ciclo de vida.
# Se avisa (warning) para los comentarios; solo FALLA cuando es código activo.
# Excluimos bloques de comentario (líneas cuyo primer char no-espacio sea '#').
ACTIVE_PATTERNS=(
  'PC_GAMER_SSH_HOST:-pc-gamer'
  'PC_GAMER_TAILSCALE_HOST:-pc-gamer'
  'PC_GAMER_SSH_HOST:-gamer'
  'sudo -u devops'
  'PC_GAMER_SUDO_USER:-devops'
  'wsl -d Ubuntu -u root'
  'wsl -d Ubuntu -- '
)

FILES=(
  scripts/ops/check-pc-gamer-gpu-load.sh
  scripts/ops/check-pc-gamer-online.sh
  scripts/ops/pc-gamer-reconnect.sh
  scripts/ops/pc-gamer-watch.sh
  scripts/ops/pc-gamer-watchdog.sh
  scripts/ops/pc-gamer-heartbeat.sh
  scripts/ops/pc-gamer-docker-plane.sh
  scripts/ops/pc-gamer-opencode-plane.sh
  scripts/ops/pc-gamer-schedule.sh
  scripts/ops/setup-pc-gamer-sudoers.sh
  infra/launchd/com.opsly.pcgamerwatch.plist
)

fail=0
for f in "${FILES[@]}"; do
  [[ -f "$f" ]] || continue
  for pat in "${ACTIVE_PATTERNS[@]}"; do
    if grep -nF -- "$pat" "$f" | grep -vE '^[0-9]+:\s*#' | grep -qF -- "$pat"; then
      echo "FAIL: '$pat' en $f es código activo (identidad legacy no permitida)" >&2
      fail=1
    fi
  done
done

if [[ "$fail" -ne 0 ]]; then
  echo "Error: la flota gamer debe usar la identidad consolidada opsly@smdqcia-pc." >&2
  echo "Detalle: docs/04-infrastructure/PC-GAMER-WORKER.md § identidad canónica." >&2
  exit 1
fi

echo "OK: ningún script/plist activo vuelve a defaults legacy pc-gamer/devops."