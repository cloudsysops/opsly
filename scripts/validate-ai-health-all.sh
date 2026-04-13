#!/usr/bin/env bash
set -euo pipefail

DRY_RUN="false"
for arg in "$@"; do
  if [[ "$arg" == "--dry-run" ]]; then
    DRY_RUN="true"
  fi
done

status_icon() {
  local code="$1"
  case "$code" in
    ok) echo "✅" ;;
    warn) echo "⚠️" ;;
    fail) echo "❌" ;;
    *) echo "❓" ;;
  esac
}

check_cmd() {
  local cmd="$1"
  if [[ "$DRY_RUN" == "true" ]]; then
    echo "warn"
    return 0
  fi
  if eval "$cmd" >/dev/null 2>&1; then
    echo "ok"
  else
    echo "fail"
  fi
}

latency_check() {
  local cmd="$1"
  if [[ "$DRY_RUN" == "true" ]]; then
    echo "warn"
    return 0
  fi
  local started ended elapsed
  started="$(date +%s%3N)"
  if ! eval "$cmd" >/dev/null 2>&1; then
    echo "fail"
    return 0
  fi
  ended="$(date +%s%3N)"
  elapsed=$((ended - started))
  if (( elapsed < 100 )); then
    echo "ok"
  else
    echo "warn"
  fi
}

print_row() {
  local machine="$1"
  local ollama="$2"
  local gateway="$3"
  local redis="$4"
  local profile="$5"
  local latency="$6"
  echo "| $machine | $(status_icon "$ollama") | $(status_icon "$gateway") | $(status_icon "$redis") | $(status_icon "$profile") | $(status_icon "$latency") |"
}

check_machine() {
  local machine="$1"
  local prefix="$2"
  local ollama gateway redis profile latency
  ollama="$(check_cmd "$prefix curl -sf http://127.0.0.1:11434/api/tags")"
  gateway="$(check_cmd "$prefix curl -sf http://127.0.0.1:9000/health || $prefix curl -sf http://127.0.0.1:3010/health")"
  redis="$(check_cmd "$prefix redis-cli PING | grep -q PONG")"
  profile="$(check_cmd "$prefix test -n \"\${AI_PROFILE:-}\"")"
  latency="$(latency_check "$prefix curl -sf http://127.0.0.1:11434/api/tags")"
  print_row "$machine" "$ollama" "$gateway" "$redis" "$profile" "$latency"
}

echo "| Máquina | Ollama | Gateway | Redis | AI_PROFILE | Latencia local <100ms |"
echo "|---|---|---|---|---|---|"

check_machine "vps-dragon" "ssh vps-dragon@100.120.151.91 "
check_machine "opsly-mac2011" "ssh opsly-mac2011 "
check_machine "opsly-mac2020" "ssh opsly-mac2020 "
