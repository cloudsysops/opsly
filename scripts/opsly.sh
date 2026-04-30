#!/usr/bin/env bash
# Unified Opsly CLI helpers for Fase 1 validation.

set -euo pipefail

_SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=scripts/lib/common.sh
source "${_SCRIPT_DIR}/lib/common.sh"
# shellcheck source=scripts/lib/docker-helpers.sh
source "${_SCRIPT_DIR}/lib/docker-helpers.sh"

if [[ -z "${TENANTS_PATH:-}" ]]; then
  TENANTS_PATH="$(cd "${_SCRIPT_DIR}/.." && pwd)/tenants"
fi
SSH_HOST="${SSH_HOST:-100.120.151.91}"
SSH_CONNECT_TIMEOUT="${SSH_CONNECT_TIMEOUT:-15}"
export TENANTS_PATH

show_help() {
  cat <<'EOF'
Opsly CLI (Fase 1)

Uso:
  ./scripts/opsly.sh <comando> [args]

Comandos:
  create-tenant <slug> --email <owner@email> --plan startup|business|enterprise [--dry-run]
      Wrapper de tenant/onboard.sh para alta inicial del tenant.

  start-tenant <slug> [--wait] [--wait-seconds <n>] [--dry-run]
      Inicia stack existente desde TENANTS_PATH/docker-compose.<slug>.yml

  status [--slug <slug>] [--json]
      Estado de stacks tenant en disco (running/degraded/stopped + URLs esperadas).

  help

Variables:
  TENANTS_PATH, PLATFORM_DOMAIN, TENANT_BASE_DOMAIN, SSH_HOST (default: 100.120.151.91), SSH_USER, SSH_CONNECT_TIMEOUT (default: 15)

EOF
}

status_cmd() {
  local only_slug=""
  local out_json=false
  while [[ $# -gt 0 ]]; do
    case "$1" in
      --slug)
        only_slug="${2:-}"
        shift 2
        ;;
      --json)
        out_json=true
        shift
        ;;
      *)
        die "Unknown status arg: $1" 1
        ;;
    esac
  done

  local -a rows
  rows=()
  shopt -s nullglob
  local compose_file slug state n8n_url uptime_url
  for compose_file in "${TENANTS_PATH}"/docker-compose.*.yml; do
    slug="$(basename "${compose_file}")"
    slug="${slug#docker-compose.}"
    slug="${slug%.yml}"

    if [[ -n "${only_slug}" && "${slug}" != "${only_slug}" ]]; then
      continue
    fi

    if stack_running "${slug}"; then
      state="running"
    elif stack_exists "${slug}"; then
      state="stopped_or_degraded"
    else
      state="missing"
    fi

    local tenant_domain="${TENANT_BASE_DOMAIN:-${PLATFORM_DOMAIN:-}}"
    if [[ -n "${tenant_domain}" ]]; then
      n8n_url="https://n8n-${slug}.${tenant_domain}/"
      uptime_url="https://uptime-${slug}.${tenant_domain}/"
    else
      n8n_url=""
      uptime_url=""
    fi

    rows+=("${slug}|${state}|${compose_file}|${n8n_url}|${uptime_url}")
  done
  shopt -u nullglob

  if [[ "${out_json}" == "true" ]]; then
    local json="["
    local first=true
    local row
    for row in "${rows[@]}"; do
      IFS='|' read -r slug state compose_file n8n_url uptime_url <<<"${row}"
      if [[ "${first}" == "true" ]]; then
        first=false
      else
        json+=","
      fi
      json+="{\"slug\":\"${slug}\",\"state\":\"${state}\",\"compose\":\"${compose_file}\",\"n8n_url\":\"${n8n_url}\",\"uptime_url\":\"${uptime_url}\"}"
    done
    json+="]"
    echo "${json}"
    return 0
  fi

  if [[ ${#rows[@]} -eq 0 ]]; then
    log_warn "No tenant compose files found in ${TENANTS_PATH}"
    return 0
  fi

  log_info "Tenant stacks in ${TENANTS_PATH}:"
  local row
  for row in "${rows[@]}"; do
    IFS='|' read -r slug state compose_file n8n_url uptime_url <<<"${row}"
    echo "- ${slug}: ${state}"
    echo "  compose: ${compose_file}"
    if [[ -n "${n8n_url}" ]]; then
      echo "  n8n:     ${n8n_url}"
      echo "  uptime:  ${uptime_url}"
    fi
  done
}

if [[ $# -lt 1 ]]; then
  show_help
  exit 1
fi

command="$1"
shift

case "${command}" in
  create-tenant)
    if [[ $# -lt 1 ]]; then
      die "Usage: opsly.sh create-tenant <slug> --email ... --plan ..." 1
    fi
    slug="$1"
    shift
    exec "${_SCRIPT_DIR}/tenant/onboard.sh" --slug "${slug}" "$@"
    ;;
  start-tenant)
    if [[ $# -lt 1 ]]; then
      die "Usage: opsly.sh start-tenant <slug> [--wait] [--wait-seconds n]" 1
    fi
    slug="$1"
    shift
    exec "${_SCRIPT_DIR}/deploy/rollout-tenant.sh" --slug "${slug}" "$@"
    ;;
  status)
    status_cmd "$@"
    ;;
  help | -h | --help)
    show_help
    ;;
  *)
    die "Unknown command: ${command}. Use help." 1
    ;;
esac
