#!/usr/bin/env bash
set -euo pipefail

OUTPUT_FORMAT="text"

for arg in "$@"; do
  case "$arg" in
    --json) OUTPUT_FORMAT="json" ;;
    --help|-h)
      cat <<'EOF'
Uso: ./scripts/provision-detect-os.sh [--json]

Detecta OS, arquitectura y herramientas base para provisioning.
EOF
      exit 0
      ;;
    *)
      echo "Argumento no soportado: $arg" >&2
      exit 1
      ;;
  esac
done

detect_os() {
  local os_name="unknown"
  local os_version="unknown"
  local os_family="unknown"

  if [[ -f /etc/os-release ]]; then
    # shellcheck disable=SC1091
    source /etc/os-release
    os_name="${NAME:-unknown}"
    os_version="${VERSION_ID:-unknown}"
    case "${ID_LIKE:-$ID}" in
      *debian*) os_family="debian" ;;
      *rhel*|*fedora*|*centos*) os_family="rhel" ;;
      *suse*) os_family="suse" ;;
      *arch*) os_family="arch" ;;
      *) os_family="${ID:-unknown}" ;;
    esac
  elif [[ "$(uname -s)" == "Darwin" ]]; then
    os_name="macOS"
    os_version="$(sw_vers -productVersion)"
    os_family="darwin"
  fi

  printf '%s|%s|%s\n' "$os_name" "$os_version" "$os_family"
}

command_status() {
  local cmd="$1"
  if command -v "$cmd" >/dev/null 2>&1; then
    printf 'yes'
  else
    printf 'no'
  fi
}

IFS='|' read -r OS_NAME OS_VERSION OS_FAMILY < <(detect_os)
ARCH="$(uname -m)"
KERNEL="$(uname -s)"
HOSTNAME_SHORT="$(hostname -s 2>/dev/null || hostname)"

HAS_SSH="$(command_status ssh)"
HAS_GIT="$(command_status git)"
HAS_DOCKER="$(command_status docker)"
HAS_NODE="$(command_status node)"
HAS_NPM="$(command_status npm)"
HAS_PYTHON3="$(command_status python3)"

if [[ "$OUTPUT_FORMAT" == "json" ]]; then
  cat <<EOF
{
  "hostname": "${HOSTNAME_SHORT}",
  "kernel": "${KERNEL}",
  "architecture": "${ARCH}",
  "os_name": "${OS_NAME}",
  "os_version": "${OS_VERSION}",
  "os_family": "${OS_FAMILY}",
  "tools": {
    "ssh": ${HAS_SSH},
    "git": ${HAS_GIT},
    "docker": ${HAS_DOCKER},
    "node": ${HAS_NODE},
    "npm": ${HAS_NPM},
    "python3": ${HAS_PYTHON3}
  }
}
EOF
  exit 0
fi

echo "Hostname:      ${HOSTNAME_SHORT}"
echo "Kernel:        ${KERNEL}"
echo "Architecture:  ${ARCH}"
echo "OS:            ${OS_NAME} ${OS_VERSION} (${OS_FAMILY})"
echo "Tools:"
echo "  ssh:         ${HAS_SSH}"
echo "  git:         ${HAS_GIT}"
echo "  docker:      ${HAS_DOCKER}"
echo "  node:        ${HAS_NODE}"
echo "  npm:         ${HAS_NPM}"
echo "  python3:     ${HAS_PYTHON3}"
