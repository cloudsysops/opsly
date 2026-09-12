#!/usr/bin/env bash
set -euo pipefail

# Opsly Mac security + storage audit.
# Read-only by design: no deletes, no secret values, no config mutation.

section(){ printf '\n===== %s =====\n' "$1"; }
cmd(){ printf '\n$ %s\n' "$*"; "$@" 2>&1 || true; }

section "SYSTEM"
cmd sw_vers
cmd uname -m
cmd uptime
cmd df -h /

section "TOP-LEVEL HOME STORAGE"
for p in "$HOME"/Library "$HOME"/Downloads "$HOME"/Documents "$HOME"/Desktop "$HOME"/.cache "$HOME"/.npm "$HOME"/.pnpm-store "$HOME"/.ollama "$HOME"/.docker; do
  [[ -e "$p" ]] || continue
  du -sh "$p" 2>/dev/null || true
done

section "REPO STORAGE"
ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
printf 'repo=%s\n' "$ROOT"
du -sh "$ROOT" 2>/dev/null || true
for p in node_modules .next dist build coverage runtime .turbo .cache; do
  [[ -e "$ROOT/$p" ]] && du -sh "$ROOT/$p" 2>/dev/null || true
done
find "$ROOT" -type d -name node_modules -prune -print 2>/dev/null | head -100 | while read -r d; do
  du -sh "$d" 2>/dev/null || true
done | sort -h | tail -30

section "DOCKER / COLIMA"
if command -v docker >/dev/null 2>&1; then
  cmd docker system df
  cmd docker ps --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}'
fi
if command -v colima >/dev/null 2>&1; then
  cmd colima status
fi

section "OLLAMA"
if command -v ollama >/dev/null 2>&1; then
  cmd ollama list
fi

section "LAUNCHAGENTS"
cmd launchctl list
printf '\nOpsly LaunchAgents:\n'
launchctl list 2>/dev/null | grep -i opsly || true
printf '\nUser LaunchAgents files:\n'
find "$HOME/Library/LaunchAgents" -maxdepth 1 -type f -name '*.plist' -print 2>/dev/null | sort || true

section "LISTENING TCP PORTS"
lsof -nP -iTCP -sTCP:LISTEN 2>/dev/null | sed -E 's/([0-9]{1,3}\.){3}[0-9]{1,3}/<IP>/g' | head -200 || true

section "SECURITY BASELINE"
if command -v fdesetup >/dev/null 2>&1; then
  cmd fdesetup status
fi
if command -v /usr/libexec/ApplicationFirewall/socketfilterfw >/dev/null 2>&1; then
  cmd /usr/libexec/ApplicationFirewall/socketfilterfw --getglobalstate
  cmd /usr/libexec/ApplicationFirewall/socketfilterfw --getstealthmode
fi
cmd softwareupdate --schedule
cmd systemsetup -getremotelogin

section "SSH"
[[ -f "$HOME/.ssh/config" ]] && {
  printf '~/.ssh/config exists; permissions: '
  stat -f '%Sp %Su:%Sg' "$HOME/.ssh/config" 2>/dev/null || true
} || echo '~/.ssh/config absent'
find "$HOME/.ssh" -maxdepth 1 -type f -print 2>/dev/null | while read -r f; do
  base="$(basename "$f")"
  case "$base" in
    *.pub|known_hosts|known_hosts.old|config|authorized_keys)
      stat -f '%Sp %N' "$f" 2>/dev/null || true
      ;;
    *)
      printf 'private-or-sensitive ssh file: '
      stat -f '%Sp %N' "$f" 2>/dev/null || true
      ;;
  esac
done

section "DOPPLER / AGENT CLIS"
for bin in doppler claude codex cursor opencode hermes openclaw tailscale; do
  if command -v "$bin" >/dev/null 2>&1; then
    printf '%-12s %s\n' "$bin" "$(command -v "$bin")"
  else
    printf '%-12s MISSING\n' "$bin"
  fi
done

# Presence only. Never print values.
for name in PLATFORM_ADMIN_TOKEN OPSLY_CLI_AGENT_TOKEN ANTHROPIC_API_KEY OPENAI_API_KEY REDIS_URL; do
  if [[ -n "${!name:-}" ]]; then
    printf '%s=PRESENT\n' "$name"
  else
    printf '%s=NOT_IN_CURRENT_SHELL\n' "$name"
  fi
done

section "GIT"
cmd git -C "$ROOT" status --short --branch
cmd git -C "$ROOT" remote -v
cmd git -C "$ROOT" branch --show-current

section "LARGE FILES IN REPO (>100MB)"
find "$ROOT" -type f -size +100M -print 2>/dev/null | sed "s#^$ROOT/##" | head -100 || true

section "OPS LOGS"
for p in "$HOME/Library/Logs/opsly" "$ROOT/runtime/logs"; do
  [[ -d "$p" ]] || continue
  du -sh "$p" 2>/dev/null || true
  find "$p" -type f -size +20M -print 2>/dev/null | head -100 || true
done

section "SUMMARY HINTS"
echo "Read-only audit complete."
echo "Do not paste secret values into tickets/chat."
echo "Review large caches, Docker usage, Ollama models, logs, LaunchAgents, FileVault/firewall, SSH permissions, and bound interfaces."
