#!/usr/bin/env bash
# Idempotent NOPASSWD for the gamer WSL worker user.
# Nodo consolidado (default): opsly@smdqcia-pc — sshd vive DENTRO del WSL,
# sin puente Windows `wsl -d Ubuntu -u root`. Elevación a root vía `sudo`
# (la primera vez pide password; después queda NOPASSWD vía sudoers.d).
# Nodo legacy (override): pc-gamer / devops — Windows OpenSSH → `wsl -u root`.
# Never apply to the VPS control plane.
#
# Usage:
#   PC_GAMER_SSH_HOST=opsly@smdqcia-pc ./scripts/ops/setup-pc-gamer-sudoers.sh --dry-run
#   PC_GAMER_SSH_HOST=opsly@smdqcia-pc ./scripts/ops/setup-pc-gamer-sudoers.sh --with-password
#   ./scripts/ops/setup-pc-gamer-sudoers.sh --status
#
set -euo pipefail

DRY_RUN=false
DO_STATUS=false
WITH_PASSWORD=false
SSH_HOST="${PC_GAMER_SSH_HOST:-opsly@smdqcia-pc}"
WSL_DISTRO="${PC_GAMER_WSL_DISTRO:-Ubuntu}"
SUDO_USER="${PC_GAMER_SUDO_USER:-opsly}"
SUDOERS_FILE="/etc/sudoers.d/${SUDO_USER}"
FORBIDDEN_HOST="${PC_GAMER_FORBID_SSH_HOST:-100.120.151.91}"

SUDOERS_BODY="# Managed by scripts/ops/setup-pc-gamer-sudoers.sh
# Scope: gamer WSL (${SSH_HOST}) ONLY. Never copy to the VPS.
# Lets unattended agents restart docker/services without a TTY password.
${SUDO_USER} ALL=(ALL) NOPASSWD: ALL
"

usage() {
  sed -n '2,20p' "$0"
}

# Legacy: Windows OpenSSH → `wsl -d Ubuntu -u root` (nodo pc-gamer/devops).
is_legacy_host() {
  [[ "$SSH_HOST" == *"pc-gamer"* || -n "${PC_GAMER_LEGACY_BRIDGE:-}" ]]
}

wsl_root() {
  ssh -o BatchMode=yes -o ConnectTimeout=15 "$SSH_HOST" \
    wsl -d "$WSL_DISTRO" -u root -- "$@"
}

wsl_user() {
  ssh -o BatchMode=yes -o ConnectTimeout=15 "$SSH_HOST" \
    wsl -d "$WSL_DISTRO" -- "$@"
}

consolidated_root() {
  local cmd="$1"; shift
  local sudo_flags=(-n)
  [[ "$WITH_PASSWORD" == "true" ]] && sudo_flags=(-p '')
  ssh -o BatchMode=yes -o ConnectTimeout=15 "$SSH_HOST" \
    sudo "${sudo_flags[@]}" bash -lc "$cmd"
}

assert_not_vps() {
  if [[ "$SSH_HOST" == "$FORBIDDEN_HOST" || "$SSH_HOST" == "vps-dragon" ]]; then
    echo "[pc-gamer-sudoers] ERROR: refusing to touch VPS host ($SSH_HOST)" >&2
    exit 1
  fi
}

root_cat() {
  local file="$1"
  if is_legacy_host; then
    wsl_root cat "$file" 2>/dev/null || true
  else
    consolidated_root "cat '$file' 2>/dev/null || true"
  fi
}

run_as_root() {
  local script="$1"
  if is_legacy_host; then
    printf '%s' "$script" | wsl_root bash
  else
    consolidated_root "$script"
  fi
}

status() {
  echo "[pc-gamer-sudoers] host=$SSH_HOST sudo_user=$SUDO_USER legacy=$(is_legacy_host && echo yes || echo no)"
  if is_legacy_host; then
    echo -n "user="; wsl_user whoami
    echo -n "host="; wsl_user hostname
    wsl_user id
    if wsl_user sudo -n true; then
      echo "[pc-gamer-sudoers] sudo -n: OK (NOPASSWD)"
    else
      echo "[pc-gamer-sudoers] sudo -n: MISSING (password required)"
      return 1
    fi
  else
    ssh -o BatchMode=yes -o ConnectTimeout=15 "$SSH_HOST" \
      'echo -n "user="; whoami; echo -n "host="; hostname; id'
    if ssh -o BatchMode=yes -o ConnectTimeout=15 "$SSH_HOST" \
        'sudo -n true' >/dev/null 2>&1; then
      echo "[pc-gamer-sudoers] sudo -n: OK (NOPASSWD)"
    else
      echo "[pc-gamer-sudoers] sudo -n: MISSING (password required) — usa --with-password la primera vez" >&2
      return 1
    fi
  fi
  echo "[pc-gamer-sudoers] $SUDOERS_FILE:"
  root_cat "$SUDOERS_FILE"
}

apply() {
  assert_not_vps
  if [[ "$DRY_RUN" == "true" ]]; then
    echo "[dry-run] would write $SUDOERS_FILE on $SSH_HOST (legacy=$(is_legacy_host && echo yes || echo no)) as root"
    printf '%s' "$SUDOERS_BODY"
    return 0
  fi

  local tmp="/tmp/${SUDO_USER}-sudoers"
  run_as_root "tee '$tmp' >/dev/null" <<<"$SUDOERS_BODY"
  run_as_root "visudo -cf '$tmp'
install -o root -g root -m 0440 '$tmp' '$SUDOERS_FILE'
rm -f '$tmp'
visudo -cf '$SUDOERS_FILE'"
  status
}

for arg in "$@"; do
  case "$arg" in
    --dry-run) DRY_RUN=true ;;
    --status) DO_STATUS=true ;;
    --with-password) WITH_PASSWORD=true ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "[pc-gamer-sudoers] unknown arg: $arg" >&2
      usage >&2
      exit 2
      ;;
  esac
done

if [[ "$DO_STATUS" == "true" ]]; then
  status
  exit 0
fi

apply