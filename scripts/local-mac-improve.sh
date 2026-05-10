#!/usr/bin/env bash
# Comprueba y mejora el entorno Mac local para Opsly (Doppler + shell).
#
# Uso:
#   ./scripts/local-mac-improve.sh [--dry-run] [--apply-zsh]
#
# --apply-zsh  Añade un bloque idempotente a ~/.zshrc con alias claude-dop / opsly-doppler-run.
# --dry-run    No escribe ~/.zshrc; solo muestra acciones.
#
# Variables opcionales:
#   OPSLY_DOPPLER_PROJECT (default: ops-intcloudsysops)
#   OPSLY_DOPPLER_CONFIG  (default: prd)
#   ZSHRC_PATH            (default: $HOME/.zshrc)

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
# shellcheck source=scripts/lib/common.sh
source "${SCRIPT_DIR}/lib/common.sh"

DRY_RUN_FLAG=false
APPLY_ZSH=false
OPSLY_DOPPLER_PROJECT="${OPSLY_DOPPLER_PROJECT:-ops-intcloudsysops}"
OPSLY_DOPPLER_CONFIG="${OPSLY_DOPPLER_CONFIG:-prd}"
ZSHRC_PATH="${ZSHRC_PATH:-$HOME/.zshrc}"

MARKER_BEGIN="# >>> opsly-mac-integration (managed by scripts/local-mac-improve.sh)"
MARKER_END="# <<< opsly-mac-integration <<<"

usage() {
  sed -n '1,18p' "$0" | tail -n +2
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --dry-run) DRY_RUN_FLAG=true ;;
    --apply-zsh) APPLY_ZSH=true ;;
    -h|--help) usage; exit 0 ;;
    *) die "Argumento desconocido: $1 (usa --help)" ;;
  esac
  shift
done

if [[ "${DRY_RUN_FLAG}" == "true" ]]; then
  export DRY_RUN=true
fi

snippet() {
  cat <<EOF
${MARKER_BEGIN}
# Claude Code / terminal con secretos desde Doppler (no pegues API keys en disco).
export OPSLY_DOPPLER_PROJECT="\${OPSLY_DOPPLER_PROJECT:-${OPSLY_DOPPLER_PROJECT}}"
export OPSLY_DOPPLER_CONFIG="\${OPSLY_DOPPLER_CONFIG:-${OPSLY_DOPPLER_CONFIG}}"
alias claude-dop='doppler run --project "\$OPSLY_DOPPLER_PROJECT" --config "\$OPSLY_DOPPLER_CONFIG" -- claude'
alias opsly-doppler-run='doppler run --project "\$OPSLY_DOPPLER_PROJECT" --config "\$OPSLY_DOPPLER_CONFIG" --'
${MARKER_END}
EOF
}

zshrc_has_block() {
  [[ -f "${ZSHRC_PATH}" ]] && grep -qF "${MARKER_BEGIN}" "${ZSHRC_PATH}"
}

append_zsh_block() {
  if zshrc_has_block; then
    log_info "Bloque opsly-mac-integration ya está en ${ZSHRC_PATH}"
    return 0
  fi
  if [[ "${DRY_RUN}" == "true" ]]; then
    log_info "DRY-RUN: añadiría bloque a ${ZSHRC_PATH}"
    return 0
  fi
  log_info "Añadiendo bloque a ${ZSHRC_PATH}"
  {
    echo ""
    snippet
  } >>"${ZSHRC_PATH}"
  log_ok "Añadido. Ejecuta: source ${ZSHRC_PATH}"
}

check_doppler_cli() {
  if command -v doppler >/dev/null 2>&1; then
    log_ok "doppler CLI: $(command -v doppler)"
  else
    log_warn "doppler CLI no está en PATH (brew install dopplerhq/cli/doppler)."
    return 1
  fi
}

check_doppler_secret() {
  local n
  if ! command -v doppler >/dev/null 2>&1; then
    return 1
  fi
  n="$(doppler secrets get ANTHROPIC_API_KEY --project "${OPSLY_DOPPLER_PROJECT}" --config "${OPSLY_DOPPLER_CONFIG}" --plain 2>/dev/null | wc -c | tr -d ' ')"
  if [[ "${n}" -gt 10 ]]; then
    log_ok "Doppler ANTHROPIC_API_KEY presente (${n} bytes) en ${OPSLY_DOPPLER_PROJECT}/${OPSLY_DOPPLER_CONFIG}"
  else
    log_warn "No se pudo leer ANTHROPIC_API_KEY en ${OPSLY_DOPPLER_PROJECT}/${OPSLY_DOPPLER_CONFIG} (revisa login y config)."
    return 1
  fi
}

check_shell_env() {
  if [[ -n "${ANTHROPIC_API_KEY:-}" ]]; then
    log_ok "Shell actual: ANTHROPIC_API_KEY definida (${#ANTHROPIC_API_KEY} chars)"
  else
    log_warn "Shell actual: ANTHROPIC_API_KEY vacía — usa claude-dop u opsly-doppler-run tras --apply-zsh."
  fi
}

check_claude_settings() {
  local f="${HOME}/.claude/settings.json"
  if [[ ! -f "${f}" ]]; then
    log_warn "No existe ${f}"
    return 1
  fi
  if python3 -m json.tool "${f}" >/dev/null 2>&1; then
    log_ok "~/.claude/settings.json es JSON válido"
  else
    log_warn "${f} no es JSON válido; corrígelo."
    return 1
  fi
  if grep -q '\${ANTHROPIC_API_KEY}' "${f}" 2>/dev/null || grep -q '"apiKey".*ANTHROPIC_API_KEY' "${f}" 2>/dev/null; then
    log_ok "Claude settings referencian ANTHROPIC_API_KEY (variable de entorno)"
  else
    log_warn "Revisa apiKey en ${f}; se recomienda \${ANTHROPIC_API_KEY}"
  fi
}

main() {
  log_info "Repo: ${REPO_ROOT}"
  log_info "Doppler: project=${OPSLY_DOPPLER_PROJECT} config=${OPSLY_DOPPLER_CONFIG}"

  check_doppler_cli || true
  check_doppler_secret || true
  check_shell_env
  check_claude_settings || true

  if [[ "${APPLY_ZSH}" == "true" ]]; then
    append_zsh_block
  else
    log_info "Omitido escritura en .zshrc (pasa --apply-zsh para integrar alias)."
  fi

  echo ""
  log_info "Siguiente paso: lee docs/01-development/LOCAL-MAC-IMPROVEMENT-PLAN.md"
}

main "$@"
