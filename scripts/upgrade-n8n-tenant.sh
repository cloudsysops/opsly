#!/usr/bin/env bash
# Upgrade a single n8n tenant container with automatic rollback on failure.
#
# Usage:
#   ./scripts/upgrade-n8n-tenant.sh --slug <slug> [--target 2.32.5] [--dry-run]
#   ./scripts/upgrade-n8n-tenant.sh --all [--target 2.32.5] [--dry-run]
#
# Guarantees:
#   - Keeps previous container as backup until health OK
#   - Restores previous container if healthz / public probe fails
#   - One tenant at a time (caller should serialize)
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
# shellcheck source=scripts/lib/common.sh
source "${SCRIPT_DIR}/lib/common.sh" 2>/dev/null || true

TARGET_VERSION="${N8N_TARGET_VERSION:-2.32.5}"
TARGET_IMAGE="n8nio/n8n:${TARGET_VERSION}"
DRY_RUN=false
ALL=false
SLUG=""
HEALTH_TIMEOUT_SEC="${N8N_HEALTH_TIMEOUT_SEC:-120}"
PLATFORM_DOMAIN="${PLATFORM_DOMAIN:-op-sly.com}"
OPSLY_ROOT="${OPSLY_ROOT:-${REPO_ROOT}}"
LOG_DIR="${OPSLY_ROOT}/runtime/logs"
mkdir -p "${LOG_DIR}"

log() { printf '[%s] %s\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$*"; }
die() { log "ERROR: $*"; exit 1; }

while [[ $# -gt 0 ]]; do
  case "$1" in
    --slug) SLUG="${2:-}"; shift 2 ;;
    --target) TARGET_VERSION="${2:-}"; TARGET_IMAGE="n8nio/n8n:${TARGET_VERSION}"; shift 2 ;;
    --all) ALL=true; shift ;;
    --dry-run) DRY_RUN=true; shift ;;
    -h|--help)
      sed -n '2,14p' "$0"
      exit 0
      ;;
    *) die "Unknown arg: $1" ;;
  esac
done

require_cmd() {
  command -v "$1" >/dev/null 2>&1 || die "Missing command: $1"
}
require_cmd docker
require_cmd curl
require_cmd python3

container_name_for() {
  echo "n8n_${1}"
}

compose_candidates() {
  local slug="$1"
  cat <<EOF
${OPSLY_ROOT}/runtime/tenants/docker-compose.${slug}.yml
${OPSLY_ROOT}/tenants/docker-compose.${slug}.yml
${OPSLY_ROOT}/runtime/tenants/${slug}/docker-compose.yml
EOF
}

find_compose() {
  local slug="$1" f
  while IFS= read -r f; do
    [[ -f "$f" ]] || continue
    if grep -q "n8n_${slug}\|n8nio/n8n" "$f" 2>/dev/null; then
      echo "$f"
      return 0
    fi
  done < <(compose_candidates "$slug")
  return 1
}

wait_health() {
  local name="$1"
  local url="$2"
  local deadline=$((SECONDS + HEALTH_TIMEOUT_SEC))
  while (( SECONDS < deadline )); do
    if docker exec "$name" wget -qO- http://127.0.0.1:5678/healthz >/dev/null 2>&1 \
      || docker exec "$name" n8n --version >/dev/null 2>&1; then
      if curl -sf --max-time 8 -o /dev/null "${url}" 2>/dev/null \
        || curl -sf --max-time 8 -o /dev/null "${url%/}/healthz" 2>/dev/null; then
        return 0
      fi
      # Internal OK is enough if public Traefik lags a few seconds
      if docker exec "$name" wget -qO- http://127.0.0.1:5678/healthz >/dev/null 2>&1; then
        sleep 5
        if curl -sf --max-time 8 -o /dev/null "${url}" 2>/dev/null \
          || curl -sf --max-time 8 -o /dev/null "${url%/}/healthz" 2>/dev/null; then
          return 0
        fi
        # Accept internal health if public still 404 during Traefik re-register
        return 0
      fi
    fi
    sleep 5
  done
  return 1
}

pin_compose_image() {
  local file="$1"
  if [[ "$DRY_RUN" == "true" ]]; then
    log "DRY-RUN: would pin ${TARGET_IMAGE} in ${file}"
    return 0
  fi
  # Replace n8nio/n8n:* with target
  python3 - "$file" "$TARGET_IMAGE" <<'PY'
import re, sys
path, image = sys.argv[1], sys.argv[2]
text = open(path, encoding="utf-8").read()
new = re.sub(r"n8nio/n8n:[^\s\"']+", image, text)
if new == text and "n8nio/n8n" not in text:
    sys.exit(0)
open(path, "w", encoding="utf-8").write(new)
print(f"pinned {image} in {path}")
PY
}

upgrade_via_compose() {
  local slug="$1" compose="$2" name
  name="$(container_name_for "$slug")"
  log "Upgrade via compose: slug=${slug} file=${compose}"
  pin_compose_image "$compose"
  if [[ "$DRY_RUN" == "true" ]]; then
    log "DRY-RUN: docker compose -f ${compose} pull/up ${name}"
    return 0
  fi
  local backup="${name}_bak_$(date +%Y%m%d%H%M%S)"
  local old_id
  old_id="$(docker inspect -f '{{.Id}}' "$name" 2>/dev/null || true)"
  docker pull "$TARGET_IMAGE"
  # Snapshot rename only if container exists
  if docker inspect "$name" >/dev/null 2>&1; then
    docker stop "$name"
    docker rename "$name" "$backup"
  fi
  if ! (
    cd "$(dirname "$compose")"
    docker compose -f "$(basename "$compose")" pull "n8n_${slug}" 2>/dev/null \
      || docker compose -f "$(basename "$compose")" pull
    docker compose -f "$(basename "$compose")" up -d "n8n_${slug}" 2>/dev/null \
      || docker compose -f "$(basename "$compose")" up -d
  ); then
    log "compose up failed — rolling back"
    docker rm -f "$name" 2>/dev/null || true
    if docker inspect "$backup" >/dev/null 2>&1; then
      docker rename "$backup" "$name"
      docker start "$name"
    fi
    return 1
  fi
  local url="https://n8n-${slug}.${PLATFORM_DOMAIN}/"
  if wait_health "$name" "$url"; then
    log "Health OK for ${name} → $(docker exec "$name" n8n --version 2>/dev/null || echo unknown)"
    docker rm -f "$backup" 2>/dev/null || true
    return 0
  fi
  log "Health FAILED — rolling back to ${backup}"
  docker rm -f "$name" 2>/dev/null || true
  docker rename "$backup" "$name"
  docker start "$name"
  wait_health "$name" "$url" || die "Rollback also unhealthy for ${slug}"
  log "Rollback restored ${name}"
  return 1
}

upgrade_via_recreate() {
  local slug="$1" name backup state_dir
  name="$(container_name_for "$slug")"
  docker inspect "$name" >/dev/null 2>&1 || die "Container ${name} not found"
  state_dir="${LOG_DIR}/n8n-upgrade-state"
  mkdir -p "$state_dir"
  backup="${name}_bak_$(date +%Y%m%d%H%M%S)"
  log "Upgrade via recreate: ${name} → ${TARGET_IMAGE}"

  if [[ "$DRY_RUN" == "true" ]]; then
    log "DRY-RUN: would recreate ${name} from ${TARGET_IMAGE}"
    return 0
  fi

  docker pull "$TARGET_IMAGE"
  local env_file="${state_dir}/${slug}.env"
  local labels_json="${state_dir}/${slug}.labels.json"
  local mounts_json="${state_dir}/${slug}.mounts.json"
  local networks_json="${state_dir}/${slug}.networks.json"
  docker inspect "$name" --format '{{range .Config.Env}}{{println .}}{{end}}' >"$env_file"
  docker inspect "$name" --format '{{json .Config.Labels}}' >"$labels_json"
  docker inspect "$name" --format '{{json .Mounts}}' >"$mounts_json"
  docker inspect "$name" --format '{{json .NetworkSettings.Networks}}' >"$networks_json"

  # Build docker run args via Python (safe quoting)
  local run_args
  run_args="$(python3 - "$env_file" "$labels_json" "$mounts_json" "$networks_json" "$name" "$TARGET_IMAGE" <<'PY'
import json, shlex, sys
env_file, labels_file, mounts_file, networks_file, name, image = sys.argv[1:7]
args = ["docker", "run", "-d", "--name", name, "--restart", "unless-stopped"]
with open(env_file, encoding="utf-8") as f:
    for line in f:
        line = line.rstrip("\n")
        if not line or "=" not in line:
            continue
        args.extend(["-e", line])
labels = json.load(open(labels_file, encoding="utf-8"))
for k, v in labels.items():
    # Keep Traefik/runtime labels; drop compose-managed ones that confuse recreate
    if k.startswith("com.docker.compose."):
        continue
    args.extend(["--label", f"{k}={v}"])
mounts = json.load(open(mounts_file, encoding="utf-8"))
for m in mounts:
    if m.get("Type") == "volume" and m.get("Name") and m.get("Destination"):
        args.extend(["-v", f"{m['Name']}:{m['Destination']}"])
    elif m.get("Type") == "bind" and m.get("Source") and m.get("Destination"):
        args.extend(["-v", f"{m['Source']}:{m['Destination']}"])
networks = json.load(open(networks_file, encoding="utf-8"))
first = True
for net in networks.keys():
    if first:
        args.extend(["--network", net])
        first = False
    else:
        # connect after create
        pass
args.append(image)
print(" ".join(shlex.quote(a) for a in args))
extra = list(networks.keys())
print("EXTRA_NETWORKS=" + " ".join(shlex.quote(n) for n in extra[1:]))
PY
)"

  local docker_cmd extra_line
  docker_cmd="$(printf '%s\n' "$run_args" | head -1)"
  extra_line="$(printf '%s\n' "$run_args" | sed -n '2p')"

  docker stop "$name"
  docker rename "$name" "$backup"

  # shellcheck disable=SC2086
  if ! eval "$docker_cmd"; then
    log "docker run failed — restoring backup"
    docker rm -f "$name" 2>/dev/null || true
    docker rename "$backup" "$name"
    docker start "$name"
    return 1
  fi

  # Attach additional networks if any
  if [[ "$extra_line" == EXTRA_NETWORKS=* ]]; then
    local nets="${extra_line#EXTRA_NETWORKS=}"
    for net in $nets; do
      docker network connect "$net" "$name" 2>/dev/null || true
    done
  fi

  local url="https://n8n-${slug}.${PLATFORM_DOMAIN}/"
  if wait_health "$name" "$url"; then
    log "Health OK for ${name} → $(docker exec "$name" n8n --version 2>/dev/null || echo unknown)"
    docker rm -f "$backup" 2>/dev/null || true
    return 0
  fi

  log "Health FAILED — rolling back to ${backup}"
  docker rm -f "$name" 2>/dev/null || true
  docker rename "$backup" "$name"
  docker start "$name"
  wait_health "$name" "$url" || die "Rollback also unhealthy for ${slug}"
  log "Rollback restored ${name}"
  return 1
}

upgrade_slug() {
  local slug="$1" name compose
  name="$(container_name_for "$slug")"
  if ! docker inspect "$name" >/dev/null 2>&1; then
    log "SKIP ${slug}: container ${name} not running/present"
    return 0
  fi
  local current
  current="$(docker exec "$name" n8n --version 2>/dev/null || echo unknown)"
  if [[ "$current" == "$TARGET_VERSION" ]]; then
    log "SKIP ${slug}: already on ${TARGET_VERSION}"
    return 0
  fi
  log "Upgrading ${slug}: ${current} → ${TARGET_VERSION}"
  if compose="$(find_compose "$slug")"; then
    upgrade_via_compose "$slug" "$compose"
  else
    upgrade_via_recreate "$slug"
  fi
}

list_running_n8n_slugs() {
  docker ps --format '{{.Names}}' | sed -n 's/^n8n_//p' | grep -E '^[a-z0-9-]+$' || true
}

main() {
  log "n8n upgrade target=${TARGET_IMAGE} dry_run=${DRY_RUN}"
  if [[ "$ALL" == "true" ]]; then
    local failed=0 slug
    while IFS= read -r slug; do
      [[ -n "$slug" ]] || continue
      if ! upgrade_slug "$slug"; then
        failed=$((failed + 1))
        log "FAILED slug=${slug}"
      fi
      # Memory breathing room between tenants
      sleep 8
    done < <(list_running_n8n_slugs)
    if (( failed > 0 )); then
      die "${failed} tenant upgrade(s) failed (rolled back where possible)"
    fi
    log "All n8n upgrades completed"
    return 0
  fi
  [[ -n "$SLUG" ]] || die "Pass --slug <slug> or --all"
  upgrade_slug "$SLUG"
}

main "$@"
