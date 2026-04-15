#!/usr/bin/env bash
# Ejecuta `openclaw` usando Node 22 de Homebrew (sin depender de nvm en PATH).
# Uso: ./scripts/openclaw-with-node22.sh [args...]
set -euo pipefail

node22_bin=""
if [[ -x "/opt/homebrew/opt/node@22/bin/node" ]]; then
  node22_bin="/opt/homebrew/opt/node@22/bin"
elif [[ -x "/usr/local/opt/node@22/bin/node" ]]; then
  node22_bin="/usr/local/opt/node@22/bin"
else
  echo "openclaw-with-node22: no se encontró Homebrew node@22. Instala: brew install node@22" >&2
  exit 1
fi

export PATH="${node22_bin}:${PATH}"
exec openclaw "$@"
