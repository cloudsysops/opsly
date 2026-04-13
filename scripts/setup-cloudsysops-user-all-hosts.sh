#!/usr/bin/env bash
set -euo pipefail

USER_NAME="cloudsysops"
GROUP_NAME="cloudsysops"
TARGET_UID="1001"
TARGET_GID="1001"

DRY_RUN="false"
if [[ "${1:-}" == "--dry-run" ]]; then
  DRY_RUN="true"
fi

setup_payload() {
  cat <<'EOF'
set -euo pipefail
USER_NAME="${USER_NAME}"
GROUP_NAME="${GROUP_NAME}"
TARGET_UID="${TARGET_UID}"
TARGET_GID="${TARGET_GID}"

ensure_group() {
  if [[ "$(uname -s)" == "Darwin" ]]; then
    if dscl . -read "/Groups/${GROUP_NAME}" >/dev/null 2>&1; then
      return
    fi
    sudo dscl . -create "/Groups/${GROUP_NAME}"
    sudo dscl . -create "/Groups/${GROUP_NAME}" PrimaryGroupID "${TARGET_GID}"
    return
  fi

  if getent group "${GROUP_NAME}" >/dev/null 2>&1; then
    current_gid="$(getent group "${GROUP_NAME}" | awk -F: '{print $3}')"
    if [[ "${current_gid}" != "${TARGET_GID}" ]]; then
      echo "[WARN] grupo ${GROUP_NAME} existe con GID=${current_gid} (esperado ${TARGET_GID})"
    fi
    return
  fi
  if getent group "${TARGET_GID}" >/dev/null 2>&1; then
    echo "[WARN] GID ${TARGET_GID} ya existe; creando grupo ${GROUP_NAME} sin forzar GID"
    sudo groupadd "${GROUP_NAME}"
    return
  fi
  sudo groupadd -g "${TARGET_GID}" "${GROUP_NAME}"
}

ensure_user() {
  if [[ "$(uname -s)" == "Darwin" ]]; then
    if id -u "${USER_NAME}" >/dev/null 2>&1; then
      return
    fi
    sudo dscl . -create "/Users/${USER_NAME}"
    sudo dscl . -create "/Users/${USER_NAME}" UserShell /bin/bash
    sudo dscl . -create "/Users/${USER_NAME}" RealName "${USER_NAME}"
    sudo dscl . -create "/Users/${USER_NAME}" UniqueID "${TARGET_UID}"
    sudo dscl . -create "/Users/${USER_NAME}" PrimaryGroupID "${TARGET_GID}"
    sudo dscl . -create "/Users/${USER_NAME}" NFSHomeDirectory "/Users/${USER_NAME}"
    sudo createhomedir -c -u "${USER_NAME}" >/dev/null 2>&1 || true
    return
  fi

  if id -u "${USER_NAME}" >/dev/null 2>&1; then
    current_uid="$(id -u "${USER_NAME}")"
    if [[ "${current_uid}" != "${TARGET_UID}" ]]; then
      echo "[WARN] usuario ${USER_NAME} existe con UID=${current_uid} (esperado ${TARGET_UID})"
    fi
    return
  fi
  if getent passwd "${TARGET_UID}" >/dev/null 2>&1; then
    echo "[WARN] UID ${TARGET_UID} ya existe; creando usuario ${USER_NAME} sin forzar UID"
    sudo useradd -m -g "${GROUP_NAME}" -s /bin/bash "${USER_NAME}"
    return
  fi
  sudo useradd -m -u "${TARGET_UID}" -g "${GROUP_NAME}" -s /bin/bash "${USER_NAME}"
}

verify_result() {
  id "${USER_NAME}"
  if [[ "$(uname -s)" == "Darwin" ]]; then
    dscl . -read "/Groups/${GROUP_NAME}" >/dev/null
  else
    getent group "${GROUP_NAME}" >/dev/null
  fi
}

ensure_group
ensure_user
verify_result
EOF
}

remote_script() {
  setup_payload | sed \
    -e "s/\${USER_NAME}/${USER_NAME}/g" \
    -e "s/\${GROUP_NAME}/${GROUP_NAME}/g" \
    -e "s/\${TARGET_UID}/${TARGET_UID}/g" \
    -e "s/\${TARGET_GID}/${TARGET_GID}/g"
}

setup_local_host() {
  local host_label="$1"
  echo "==> [$host_label] setup local"
  if [[ "$DRY_RUN" == "true" ]]; then
    echo "[dry-run][$host_label] (payload omitido por brevedad)"
    return
  fi
  bash -c "$(remote_script)"
}

setup_remote_host() {
  local host="$1"
  local host_label="$2"
  echo "==> [$host_label] setup remoto ($host)"
  if [[ "$DRY_RUN" == "true" ]]; then
    echo "[dry-run][$host_label] (payload omitido por brevedad)"
    return
  fi
  ssh -tt -o ConnectTimeout=12 "$host" "bash -s" <<EOF
$(remote_script)
EOF
}

failures=0

if ! setup_local_host "opsly-admin"; then
  echo "[ERROR] falló opsly-admin"
  failures=$((failures + 1))
fi

if ! setup_remote_host "opslyquantum@opsly-mac2011" "opsly-worker"; then
  echo "[ERROR] falló opsly-worker"
  failures=$((failures + 1))
fi

if ! setup_remote_host "vps-dragon@vps-dragon" "vps-dragon"; then
  echo "[ERROR] falló vps-dragon"
  failures=$((failures + 1))
fi

if [[ "$failures" -gt 0 ]]; then
  echo "✗ Setup incompleto: ${failures} host(s) con error"
  exit 1
fi

echo "✓ Setup completado en todas las máquinas"
