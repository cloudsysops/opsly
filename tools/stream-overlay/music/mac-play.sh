#!/usr/bin/env bash
# Lanza un patrón Strudel en el MacBook por SSH (Tailscale). Lo ejecuta OpenCode/WSL, no el stream.
# Uso: MAC=usuario@nombre-mac-tailscale bash mac-play.sh <intro|gameplay|vibecoding|techno|house|buildup|drop>
# Requisitos: SSH por CLAVE (sin contraseña) solo vía Tailscale; Chrome en el Mac. El primer Play lo pulsa el humano (Ctrl+Enter).
set -euo pipefail
: "${MAC:?define MAC=usuario@host}"
D="$(cd "$(dirname "$0")" && pwd)"
FILE=$(python3 -c "import json,sys;print(json.load(open('$D/catalog.json'))[sys.argv[1]]['file'])" "$1")
URL=$(python3 -c "import json,sys;print(json.load(open('$D/strudel-links.json'))[sys.argv[1]])" "$FILE")
ssh -o BatchMode=yes "$MAC" "open -a 'Google Chrome' '$URL'"
echo "Abierto en el Mac: $FILE — pulsa Ctrl+Enter en Strudel para sonar."
