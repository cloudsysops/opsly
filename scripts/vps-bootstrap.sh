#!/usr/bin/env bash
# Delegate to scripts/infra/bootstrap-vps.sh (Doppler → /opt/opsly/.env, red traefik-public, DOCKER_GID, etc.).
# Usage: ./scripts/vps-bootstrap.sh
# Ejecutar en el VPS como vps-dragon (ver cabecera del script infra).

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
exec "${ROOT}/scripts/infra/bootstrap-vps.sh" "$@"
