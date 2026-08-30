#!/usr/bin/env bash
# Clona y compila Fincept Terminal (fuera del monorepo Opsly).
# Repo: https://github.com/Fincept-Corporation/FinceptTerminal
#
# Uso:
#   ./scripts/install-fincept-terminal.sh           # clone + build (CI, sin prompt)
#   ./scripts/install-fincept-terminal.sh --dry-run
#   ./scripts/install-fincept-terminal.sh --launch  # build y abrir app
#
# Nota Mac Intel (x86_64): no hay .dmg oficial; solo build desde fuente.
# Mac Apple Silicon: alternativa DMG en releases v4.0.3.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=scripts/lib/common.sh
# shellcheck disable=SC1091
source "${SCRIPT_DIR}/lib/common.sh"

INSTALL_DIR="${FINCEPT_INSTALL_DIR:-$(dirname "$SCRIPT_DIR")/../FinceptTerminal}"
REPO_URL="https://github.com/Fincept-Corporation/FinceptTerminal.git"
DRY_RUN=false
LAUNCH=false

for arg in "$@"; do
  case "$arg" in
    --dry-run) DRY_RUN=true ;;
    --launch) LAUNCH=true ;;
    -h | --help)
      grep '^#' "$0" | head -20
      exit 0
      ;;
    *)
      die "Argumento desconocido: $arg" 1
      ;;
  esac
done

ARCH="$(uname -m)"
echo "Fincept Terminal — instalación local"
echo "  destino: $INSTALL_DIR"
echo "  arquitectura: $ARCH"
echo "  dry-run: $DRY_RUN"

if [[ "$ARCH" == "x86_64" ]]; then
  echo "  nota: Mac Intel → build desde fuente (DMG oficial es arm64 solamente)"
fi

if [[ "$DRY_RUN" == true ]]; then
  echo "DRY_RUN: git clone + ./setup.sh --ci"
  exit 0
fi

if [[ ! -d "$INSTALL_DIR/.git" ]]; then
  echo "Clonando $REPO_URL …"
  git clone --depth 1 "$REPO_URL" "$INSTALL_DIR"
else
  echo "Repo existente; git pull …"
  git -C "$INSTALL_DIR" pull --ff-only
fi

export PATH="/usr/local/opt/python@3.11/bin:/opt/homebrew/opt/python@3.11/bin:${PATH}"
if command -v brew >/dev/null 2>&1; then
  export OPENSSL_ROOT_DIR="$(brew --prefix openssl@3 2>/dev/null || true)"
fi

cd "$INSTALL_DIR"
chmod +x setup.sh run-fincept.sh 2>/dev/null || true
./setup.sh --ci

echo ""
echo "✅ Build listo."
echo "  Ejecutar: $INSTALL_DIR/run-fincept.sh"
echo "  o: open $INSTALL_DIR/fincept-qt/build/macos-release/FinceptTerminal.app"

if [[ "$LAUNCH" == true ]]; then
  open "$INSTALL_DIR/fincept-qt/build/macos-release/FinceptTerminal.app"
fi
