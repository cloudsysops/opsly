#!/usr/bin/env bash
# Cifra material sensible de emergencia con age (passphrase) en tools/usb-kit/secrets/
# Comandos: save | restore | verify  [--dry-run]
# La contraseña de age solo por read -s (o stdin no TTY para age); nunca por argv.
#
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
export USB_KIT_DIR="${SCRIPT_DIR}"
# shellcheck source=tools/usb-kit/lib/usb-common.sh
source "${SCRIPT_DIR}/lib/usb-common.sh"

SECRETS_DIR="${SCRIPT_DIR}/secrets"
RESTORE_DIR="/tmp/opsly-restore"

# Nombres fijos de salida (un .age por fuente)
AGE_ENV="emergency.env.age"
AGE_SSH="vps-dragon_ssh.age"
AGE_PAT="github_pat.age"

# Expande solo ~/ y ~ (bash 3.2+).
expand_tilde() {
  local p="$1"
  if [[ "${p}" == "~" ]]; then
    printf '%s' "${HOME}"
  elif [[ "${p}" =~ ^~/ ]]; then
    printf '%s' "${HOME}/${p#~/}"
  else
    printf '%s' "${p}"
  fi
}

hint_install_age() {
  local os
  os="$(uname -s)"
  log_info "Instala age:"
  if [[ "${os}" == "Darwin" ]]; then
    log_info "  macOS: brew install age"
  else
    log_info "  Linux (Debian/Ubuntu): sudo apt update && sudo apt install -y age"
  fi
}

require_age() {
  if ! command -v age >/dev/null 2>&1; then
    hint_install_age
    die "Falta el comando 'age' en PATH" 2
  fi
}

secure_rm() {
  local f="$1"
  if [[ -f "${f}" ]]; then
    if command -v shred >/dev/null 2>&1; then
      shred -u "${f}" 2>/dev/null || rm -f "${f}"
    else
      rm -f "${f}"
    fi
  fi
}

cmd_save() {
  local env_in ssh_in pat_tmp
  local pass1 pass2

  if [[ "${DRY_RUN}" == "true" ]]; then
    run mkdir -p "${SECRETS_DIR}"
    log_info "DRY-RUN: cifraría ${HOME}/opsly-emergency.env -> ${SECRETS_DIR}/${AGE_ENV}"
    log_info "DRY-RUN: cifraría ${HOME}/.ssh/vps-dragon -> ${SECRETS_DIR}/${AGE_SSH}"
    log_info "DRY-RUN: cifraría PAT (lectura oculta) -> ${SECRETS_DIR}/${AGE_PAT}"
    log_info "DRY-RUN: sin leer secretos reales en esta ejecución"
    return 0
  fi

  require_age

  read -r -p "Ruta del .env de emergencia [${HOME}/opsly-emergency.env]: " env_in || true
  env_in="$(expand_tilde "${env_in:-${HOME}/opsly-emergency.env}")"

  read -r -p "Ruta de la clave privada SSH del VPS [${HOME}/.ssh/vps-dragon]: " ssh_in || true
  ssh_in="$(expand_tilde "${ssh_in:-${HOME}/.ssh/vps-dragon}")"

  [[ -f "${env_in}" ]] || die "No existe el .env: ${env_in}" 1
  [[ -f "${ssh_in}" ]] || die "No existe la clave SSH: ${ssh_in}" 1

  echo "PAT de GitHub (no se muestra al escribir):"
  read -s -r pat_line || true
  echo ""
  [[ -n "${pat_line}" ]] || die "PAT vacío; abortando" 1

  echo "Contraseña de age (no se muestra):"
  read -s -r pass1 || true
  echo ""
  echo "Repite la contraseña de age:"
  read -s -r pass2 || true
  echo ""
  [[ -n "${pass1}" ]] || die "Contraseña vacía" 1
  [[ "${pass1}" == "${pass2}" ]] || die "Las contraseñas no coinciden" 1

  mkdir -p "${SECRETS_DIR}"

  pat_tmp="$(mktemp)"
  chmod 600 "${pat_tmp}"
  printf '%s' "${pat_line}" >"${pat_tmp}"
  unset pat_line pass2

  printf '%s\n' "${pass1}" | age -p -o "${SECRETS_DIR}/${AGE_ENV}" "${env_in}"
  printf '%s\n' "${pass1}" | age -p -o "${SECRETS_DIR}/${AGE_SSH}" "${ssh_in}"
  printf '%s\n' "${pass1}" | age -p -o "${SECRETS_DIR}/${AGE_PAT}" "${pat_tmp}"

  secure_rm "${pat_tmp}"
  unset pass1

  log_info "Guardado en ${SECRETS_DIR}/ (${AGE_ENV}, ${AGE_SSH}, ${AGE_PAT})"
}

cmd_restore() {
  local pass

  if [[ "${DRY_RUN}" == "true" ]]; then
    log_info "DRY-RUN: descifraría desde ${SECRETS_DIR}/ hacia ${RESTORE_DIR}/"
    log_info "DRY-RUN: no copiaría nada automáticamente al VPS"
    return 0
  fi

  require_age

  [[ -d "${SECRETS_DIR}" ]] || die "No existe ${SECRETS_DIR}; ejecuta save antes" 1
  [[ -f "${SECRETS_DIR}/${AGE_ENV}" ]] || die "Falta ${SECRETS_DIR}/${AGE_ENV}" 1
  [[ -f "${SECRETS_DIR}/${AGE_SSH}" ]] || die "Falta ${SECRETS_DIR}/${AGE_SSH}" 1
  [[ -f "${SECRETS_DIR}/${AGE_PAT}" ]] || die "Falta ${SECRETS_DIR}/${AGE_PAT}" 1

  echo "Contraseña de age (no se muestra):"
  read -s -r pass || true
  echo ""
  [[ -n "${pass}" ]] || die "Contraseña vacía" 1

  mkdir -p "${RESTORE_DIR}"
  chmod 700 "${RESTORE_DIR}"

  printf '%s\n' "${pass}" | age -d -o "${RESTORE_DIR}/emergency.env" "${SECRETS_DIR}/${AGE_ENV}"
  chmod 600 "${RESTORE_DIR}/emergency.env"

  printf '%s\n' "${pass}" | age -d -o "${RESTORE_DIR}/vps-dragon" "${SECRETS_DIR}/${AGE_SSH}"
  chmod 600 "${RESTORE_DIR}/vps-dragon"

  printf '%s\n' "${pass}" | age -d -o "${RESTORE_DIR}/github_pat.txt" "${SECRETS_DIR}/${AGE_PAT}"
  chmod 600 "${RESTORE_DIR}/github_pat.txt"

  unset pass

  log_info "Archivos descifrados en ${RESTORE_DIR}/ (permisos 600)."
  echo ""
  echo "=== Instrucciones (no se copió nada automáticamente) ==="
  echo "  • emergency.env  → copiar manualmente a /opt/opsly/.env en el VPS (ej. scp) cuando corresponda."
  echo "  • vps-dragon       → copiar a ~/.ssh/vps-dragon (o la ruta que uses) y: chmod 600 ~/.ssh/vps-dragon"
  echo "  • github_pat.txt   → usar con gh auth login --with-token o export GITHUB_TOKEN (evitar historial)."
  echo "  • Tras usar estos archivos: rotá secretos en Doppler/GitHub y borrá ${RESTORE_DIR} cuando termines (rm -rf)."
  echo "========================================================"
}

cmd_verify() {
  local pass f

  if [[ "${DRY_RUN}" == "true" ]]; then
    log_info "DRY-RUN: comprobaría existencia e integridad de .age en ${SECRETS_DIR}/"
    return 0
  fi

  require_age

  [[ -d "${SECRETS_DIR}" ]] || die "No existe ${SECRETS_DIR}" 1

  for f in "${AGE_ENV}" "${AGE_SSH}" "${AGE_PAT}"; do
    [[ -f "${SECRETS_DIR}/${f}" ]] || die "Falta o no es archivo: ${SECRETS_DIR}/${f}" 1
    [[ -s "${SECRETS_DIR}/${f}" ]] || die "Archivo vacío (corrupto?): ${SECRETS_DIR}/${f}" 1
  done

  echo "Contraseña de age para probar descifrado (no se muestra):"
  read -s -r pass || true
  echo ""
  [[ -n "${pass}" ]] || die "Contraseña vacía" 1

  for f in "${AGE_ENV}" "${AGE_SSH}" "${AGE_PAT}"; do
    if printf '%s\n' "${pass}" | age -d "${SECRETS_DIR}/${f}" >/dev/null 2>&1; then
      log_info "OK  ${f} (descifrado verificado)"
    else
      die "Fallo al descifrar ${f} (contraseña incorrecta o archivo corrupto)" 1
    fi
  done
  unset pass
  log_info "Los tres .age existen y la passphrase descifra correctamente."
}

usage() {
  echo "Uso: $0 [--dry-run] {save|restore|verify}"
  echo "  save    — Cifra .env emergencia, clave SSH y PAT → ${SECRETS_DIR}/"
  echo "  restore — Descifra a ${RESTORE_DIR}/ (solo instrucciones; sin copiar al VPS)"
  echo "  verify  — Comprueba que los .age existen y no están corruptos"
}

CMD=""
while [[ $# -gt 0 ]]; do
  case "$1" in
    --dry-run) export DRY_RUN=true ;;
    save | restore | verify) CMD="$1" ;;
    -h | --help)
      usage
      exit 0
      ;;
    *)
      usage
      exit 1
      ;;
  esac
  shift
done

[[ -n "${CMD}" ]] || {
  usage
  exit 1
}

case "${CMD}" in
  save) cmd_save ;;
  restore) cmd_restore ;;
  verify) cmd_verify ;;
esac
