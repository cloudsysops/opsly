#!/usr/bin/env bash
# Idempotent NOPASSWD for user devops on pc-gamer WSL Ubuntu only.
# Uses Windows OpenSSH → `wsl -d Ubuntu -u root` (no Linux password needed).
# Never apply to the VPS control plane.
#
# Usage:
#   ./scripts/ops/setup-pc-gamer-sudoers.sh --dry-run
#   ./scripts/ops/setup-pc-gamer-sudoers.sh
#   ./scripts/ops/setup-pc-gamer-sudoers.sh --status
#
set -euo pipefail

DRY_RUN=false
DO_STATUS=false
SSH_HOST="${PC_GAMER_SSH_HOST:-pc-gamer}"
WSL_DISTRO="${PC_GAMER_WSL_DISTRO:-Ubuntu}"
SUDOERS_FILE="/etc/sudoers.d/devops"
FORBIDDEN_HOST="${PC_GAMER_FORBID_SSH_HOST:-100.120.151.91}"

SUDOERS_BODY='# Managed by scripts/ops/setup-pc-gamer-sudoers.sh
# Scope: pc-gamer WSL Ubuntu ONLY. Never copy to the VPS.
# Lets unattended agents install/configure worker tools without a TTY password.
devops ALL=(ALL) NOPASSWD: ALL
'

usage() {
  sed -n '2,16p' "$0"
}

wsl_root() {
  ssh -o BatchMode=yes -o ConnectTimeout=15 "$SSH_HOST" \
    wsl -d "$WSL_DISTRO" -u root -- "$@"
}

wsl_devops() {
  ssh -o BatchMode=yes -o ConnectTimeout=15 "$SSH_HOST" \
    wsl -d "$WSL_DISTRO" -- "$@"
}

assert_not_vps() {
  if [[ "$SSH_HOST" == "$FORBIDDEN_HOST" || "$SSH_HOST" == "vps-dragon" ]]; then
    echo "[pc-gamer-sudoers] ERROR: refusing to touch VPS host ($SSH_HOST)" >&2
    exit 1
  fi
}

status() {
  echo "[pc-gamer-sudoers] host=$SSH_HOST distro=$WSL_DISTRO"
  # Windows OpenSSH lands in cmd.exe — do not use bash -lc with spaces
  # (quotes are stripped and `sudo -n true` splits). Pass argv after wsl --.
  echo -n "user="; wsl_devops whoami
  echo -n "host="; wsl_devops hostname
  wsl_devops id
  if wsl_devops sudo -n true; then
    echo "[pc-gamer-sudoers] sudo -n: OK (NOPASSWD)"
  else
    echo "[pc-gamer-sudoers] sudo -n: MISSING (password required)"
    return 1
  fi
  wsl_root cat "$SUDOERS_FILE" || true
}

apply() {
  assert_not_vps
  if [[ "$DRY_RUN" == "true" ]]; then
    echo "[dry-run] would write $SUDOERS_FILE on $SSH_HOST WSL $WSL_DISTRO as root"
    printf '%s' "$SUDOERS_BODY"
    return 0
  fi

  printf '%s' "$SUDOERS_BODY" | wsl_root tee /tmp/devops-sudoers >/dev/null
  wsl_root visudo -cf /tmp/devops-sudoers
  wsl_root install -o root -g root -m 0440 /tmp/devops-sudoers "$SUDOERS_FILE"
  wsl_root rm -f /tmp/devops-sudoers
  wsl_root visudo -cf "$SUDOERS_FILE"
  status
}

for arg in "$@"; do
  case "$arg" in
    --dry-run) DRY_RUN=true ;;
    --status) DO_STATUS=true ;;
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
