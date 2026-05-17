#!/usr/bin/env bash
# Alinea clones Opsly (local + opcional VPS) a una rama de origin — flujo recomendado Mac ↔ VPS.
#
#   ./scripts/opsly-repo-align.sh              # local main + estado VPS (solo lectura)
#   ./scripts/opsly-repo-align.sh --local      # sincroniza este clon a main
#   ./scripts/opsly-repo-align.sh --vps        # VPS → main (prod)
#   ./scripts/opsly-repo-align.sh --vps --branch feat/foo
#   ./scripts/opsly-repo-align.sh --local --vps --branch main
#
# Variables: VPS_SSH_HOST, VPS_SSH_USER, VPS_PATH, OPSLY_VPS_BRANCH, DRY_RUN=1
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SYNC="${ROOT}/scripts/git-sync-repo.sh"

VPS_HOST="${VPS_SSH_HOST:-100.120.151.91}"
VPS_USER="${VPS_SSH_USER:-vps-dragon}"
VPS_PATH="${VPS_PATH:-/opt/opsly}"
BRANCH="${OPSLY_VPS_BRANCH:-main}"
DO_LOCAL=false
DO_VPS=false
STATUS_ONLY=false
VPS_STASH=false
VPS_RESET=false
DRY_RUN="${DRY_RUN:-0}"

usage() {
  cat <<'EOF'
Uso: ./scripts/opsly-repo-align.sh [opciones]

Opciones:
  --local           Sincroniza el clon actual (fast-forward a --branch)
  --vps             Alinea /opt/opsly en el VPS por SSH
  --status          Solo muestra ramas y commits (local vs VPS vs origin/main)
  --branch NAME     Rama objetivo (default: main)
  --vps-stash       En VPS: git stash antes de checkout (si working tree sucio)
  --vps-reset       En VPS: git reset --hard origin/<branch> tras pull (prod = GitHub)
  --dry-run         No modifica nada
  -h, --help        Esta ayuda

Modelo recomendado:
  - Mac: feat/* → PR → main
  - VPS producción: siempre main (salvo prueba temporal con --branch feat/…)
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --local) DO_LOCAL=true; shift ;;
    --vps) DO_VPS=true; shift ;;
    --status) STATUS_ONLY=true; shift ;;
    --branch) BRANCH="$2"; shift 2 ;;
    --vps-stash) VPS_STASH=true; shift ;;
    --vps-reset) VPS_RESET=true; shift ;;
    --dry-run) DRY_RUN=1; shift ;;
    -h|--help) usage; exit 0 ;;
    *)
      echo "opsly-repo-align: opción desconocida: $1" >&2
      usage >&2
      exit 1
      ;;
  esac
done

if [[ "$DO_LOCAL" == "false" && "$DO_VPS" == "false" ]]; then
  STATUS_ONLY=true
fi

remote_ref() {
  local repo="$1"
  local branch="$2"
  git -C "$repo" rev-parse "${branch}" 2>/dev/null || echo "n/a"
}

print_status() {
  local local_head remote_main vps_head vps_branch
  local_head="$(git -C "$ROOT" rev-parse HEAD 2>/dev/null || echo n/a)"
  remote_main="$(remote_ref "$ROOT" "origin/main")"
  local_branch="$(git -C "$ROOT" branch --show-current 2>/dev/null || echo detached)"

  echo "=== Opsly repo alignment ==="
  echo "Local:  $ROOT"
  echo "  branch: $local_branch @ $(git -C "$ROOT" log -1 --oneline 2>/dev/null || echo n/a)"
  echo "  origin/main: $(git -C "$ROOT" log -1 --oneline origin/main 2>/dev/null || echo n/a)"

  if ssh -o BatchMode=yes -o ConnectTimeout=12 "${VPS_USER}@${VPS_HOST}" "test -d ${VPS_PATH}/.git" 2>/dev/null; then
    vps_branch="$(ssh -o BatchMode=yes -o ConnectTimeout=12 "${VPS_USER}@${VPS_HOST}" \
      "cd ${VPS_PATH} && git branch --show-current" 2>/dev/null || echo n/a)"
    vps_head="$(ssh -o BatchMode=yes -o ConnectTimeout=12 "${VPS_USER}@${VPS_HOST}" \
      "cd ${VPS_PATH} && git rev-parse HEAD" 2>/dev/null || echo n/a)"
    echo "VPS:    ${VPS_USER}@${VPS_HOST}:${VPS_PATH}"
    echo "  branch: $vps_branch @ $(ssh -o BatchMode=yes -o ConnectTimeout=12 "${VPS_USER}@${VPS_HOST}" \
      "cd ${VPS_PATH} && git log -1 --oneline" 2>/dev/null || echo n/a)"
    if [[ "$local_head" != "n/a" && "$vps_head" != "n/a" && "$local_head" == "$vps_head" ]]; then
      echo "  ✓ Local y VPS en el mismo commit"
    elif [[ "$vps_branch" != "$local_branch" ]]; then
      echo "  ⚠ Ramas distintas (normal si Mac=feat y VPS=main)"
    else
      echo "  ⚠ Commits distintos — ejecuta: ./scripts/opsly-repo-align.sh --local --vps --branch <rama-acordada>"
    fi
    if [[ "$vps_branch" == codex/* ]]; then
      echo "  ⚠ VPS en rama codex/* — alinear a main: ./scripts/opsly-repo-align.sh --vps --branch main"
    fi
  else
    echo "VPS:    no alcanzable (${VPS_USER}@${VPS_HOST}) o sin repo en ${VPS_PATH}"
  fi
  echo ""
}

align_local() {
  echo ">>> Local → origin/${BRANCH}"
  DRY_RUN="$DRY_RUN" "$SYNC" "$ROOT" "$BRANCH"
}

align_vps() {
  echo ">>> VPS → origin/${BRANCH}"
  if [[ "$DRY_RUN" == "1" ]]; then
    echo "DRY_RUN: ssh ${VPS_USER}@${VPS_HOST} cd ${VPS_PATH} && git fetch && checkout ${BRANCH} && pull --ff-only"
    return 0
  fi

  ssh -o BatchMode=yes -o ConnectTimeout=20 "${VPS_USER}@${VPS_HOST}" bash -s -- "$VPS_PATH" "$BRANCH" "$VPS_STASH" "$VPS_RESET" <<'REMOTE'
set -euo pipefail
VPS_PATH="$1"
BRANCH="$2"
DO_STASH="$3"
DO_RESET="$4"
cd "$VPS_PATH"

if [[ -n "$(git status --porcelain)" ]]; then
  if [[ "$DO_STASH" == "true" ]]; then
    STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
    git stash push -u -m "opsly-repo-align-${STAMP}"
    echo "vps-git-align: cambios guardados en stash (opsly-repo-align-${STAMP})"
  else
    echo "vps-git-align: working tree sucio — usa --vps-stash o commit en VPS:" >&2
    git status -sb >&2
    exit 1
  fi
fi

CURRENT="$(git branch --show-current)"
echo "vps-git-align: ${VPS_PATH} (actual: ${CURRENT} → objetivo: ${BRANCH})"

git fetch origin "$BRANCH"
if [[ "$CURRENT" != "$BRANCH" ]]; then
  git checkout "$BRANCH"
fi
git pull --ff-only origin "$BRANCH" || true
if [[ "$DO_RESET" == "true" ]]; then
  git reset --hard "origin/${BRANCH}"
  echo "vps-git-align: reset --hard origin/${BRANCH}"
fi
echo "vps-git-align: OK $(git rev-parse --short HEAD) $(git log -1 --oneline)"
REMOTE
}

print_status

if [[ "$STATUS_ONLY" == "true" && "$DO_LOCAL" == "false" && "$DO_VPS" == "false" ]]; then
  exit 0
fi

if [[ "$DO_LOCAL" == "true" ]]; then
  align_local
fi

if [[ "$DO_VPS" == "true" ]]; then
  align_vps
fi

if [[ "$DO_LOCAL" == "true" || "$DO_VPS" == "true" ]]; then
  echo ""
  print_status
fi
