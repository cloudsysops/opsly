#!/usr/bin/env bash
# Delegate to scripts/infra/security-hardening.sh (UFW: SSH solo Tailscale, 80/443).
# Usage: ./scripts/vps-secure.sh [--dry-run] [--reset-ufw] [--ssh-host HOST] [--ssh-user USER]
# See: ./scripts/vps-secure.sh --help

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
exec "${ROOT}/scripts/infra/security-hardening.sh" "$@"
