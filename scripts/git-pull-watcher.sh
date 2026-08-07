#!/usr/bin/env bash
# Monitorea origin/<branch> y, cuando hay commits nuevos, hace pull --ff-only
# (vía scripts/git-sync-repo.sh) para que agentes locales (Cursor, etc.)
# "despierten" sin que el humano tenga que hacer git pull a mano.
#
# Inverso de auto-push-watcher.sh (ese vigila cambios locales y hace push;
# este vigila el remoto y hace pull). No reimplementa el pull: delega en
# scripts/git-sync-repo.sh. Tras el pull, dispara el hook post-merge
# (.githooks/post-merge) igual que un `git pull` manual.
#
# Uso: ./scripts/git-pull-watcher.sh [options]
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib/common.sh
source "${SCRIPT_DIR}/lib/common.sh"

REPO_ROOT="${REPO_ROOT:-$(cd "${SCRIPT_DIR}/.." && pwd)}"
POLL_SEC="${POLL_SEC:-60}"
BRANCH="${WATCH_BRANCH:-}"
ONCE="${ONCE:-false}"
DRY_RUN="${DRY_RUN:-false}"
NOTIFY_DISCORD="${NOTIFY_DISCORD:-false}"

usage() {
  cat <<'EOF'
Usage: git-pull-watcher.sh [options]

Options:
  --dry-run       Log actions only; no git pull
  --poll N        Seconds between remote checks (default: 60)
  --branch NAME   Branch to watch (default: rama actual del repo)
  --once          Un solo ciclo (fetch + pull si aplica) y sale; pensado
                  para invocarse desde un timer (launchd/systemd) en vez
                  de correr en loop permanente
  --notify        Notifica por Discord al hacer pull (requiere
                  DISCORD_WEBHOOK_URL o config existente de notify-discord.sh)
  -h, --help      This help

Environment:
  REPO_ROOT, POLL_SEC, WATCH_BRANCH, ONCE, DRY_RUN, NOTIFY_DISCORD

Notas:
  - Requiere working tree limpio para hacer pull (mismo criterio que
    scripts/git-sync-repo.sh); si hay cambios locales sin commitear, avisa
    y NO toca nada.
  - No ejecuta contenido remoto como shell (a diferencia de
    cursor-prompt-monitor.sh en el VPS) — solo hace git pull y notifica.
    Revisar AGENTS.md manualmente (o con Cursor) para ver la tarea.
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --dry-run)
      DRY_RUN=true
      shift
      ;;
    --poll)
      POLL_SEC="${2:?}"
      shift 2
      ;;
    --branch)
      BRANCH="${2:?}"
      shift 2
      ;;
    --once)
      ONCE=true
      shift
      ;;
    --notify)
      NOTIFY_DISCORD=true
      shift
      ;;
    -h | --help)
      usage
      exit 0
      ;;
    *)
      die "Unknown option: $1 (try --help)"
      ;;
  esac
done

require_cmd git

cd "${REPO_ROOT}"

if ! git rev-parse --git-dir >/dev/null 2>&1; then
  die "Not a git repository: ${REPO_ROOT}"
fi

if [[ -z "${BRANCH}" ]]; then
  BRANCH="$(git branch --show-current 2>/dev/null || true)"
  if [[ -z "${BRANCH}" ]]; then
    die "No hay rama actual; indica --branch NAME"
  fi
fi

if ! git remote get-url origin >/dev/null 2>&1; then
  die "No git remote 'origin' configured"
fi

trap 'log_info "Watcher detenido"; exit 0' INT TERM

remote_has_new_commits() {
  git fetch --quiet origin "${BRANCH}"
  local local_sha remote_sha
  local_sha="$(git rev-parse "${BRANCH}" 2>/dev/null || echo "")"
  remote_sha="$(git rev-parse "origin/${BRANCH}" 2>/dev/null || echo "")"
  [[ -n "${remote_sha}" && "${local_sha}" != "${remote_sha}" ]]
}

do_pull_and_wake() {
  local before_sha
  before_sha="$(git rev-parse HEAD 2>/dev/null || echo "")"

  if [[ -n "$(git status --porcelain 2>/dev/null)" ]]; then
    log_warn "Working tree sucio; no se hace pull automático. Revisa 'git status' y vuelve a intentar."
    return 0
  fi

  if [[ "${DRY_RUN}" == "true" ]]; then
    log_info "DRY-RUN: habría commits nuevos en origin/${BRANCH}; se ejecutaría git-sync-repo.sh"
    return 0
  fi

  if ! "${SCRIPT_DIR}/git-sync-repo.sh" "${REPO_ROOT}" "${BRANCH}"; then
    log_warn "git-sync-repo.sh falló; se reintenta en el próximo ciclo"
    return 0
  fi

  local after_sha
  after_sha="$(git rev-parse HEAD 2>/dev/null || echo "")"
  if [[ "${before_sha}" == "${after_sha}" ]]; then
    return 0
  fi

  log_ok "Pull aplicado: ${before_sha:0:8} → ${after_sha:0:8}"
  echo ""
  echo "════════════════════════════════════════════════════════════════"
  echo "🔔 NUEVOS COMMITS — revisa AGENTS.md por si hay tarea asignada"
  echo "════════════════════════════════════════════════════════════════"
  git log --oneline "${before_sha}..${after_sha}" 2>/dev/null || true
  echo "════════════════════════════════════════════════════════════════"
  echo ""

  if [[ "${NOTIFY_DISCORD}" == "true" && -x "${SCRIPT_DIR}/notify-discord.sh" ]]; then
    local summary
    summary="$(git log --oneline "${before_sha}..${after_sha}" 2>/dev/null | head -5)"
    "${SCRIPT_DIR}/notify-discord.sh" \
      --title "Opsly — pull automático (${BRANCH})" \
      --message "${summary}" \
      --type info || log_warn "notify-discord.sh falló (no bloquea el watcher)"
  fi
}

log_info "Watching origin/${BRANCH} (repo ${REPO_ROOT}, poll ${POLL_SEC}s, once=${ONCE})"

if [[ "${ONCE}" == "true" ]]; then
  if remote_has_new_commits; then
    do_pull_and_wake
  else
    log_info "Sin commits nuevos en origin/${BRANCH}"
  fi
  exit 0
fi

while true; do
  if remote_has_new_commits; then
    do_pull_and_wake
  fi
  sleep "${POLL_SEC}"
done
