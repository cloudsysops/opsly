#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
REGISTRY="${OPSLY_EXTERNAL_SERVICES_REGISTRY:-$ROOT/config/external-services.json}"
SERVICE="${1:-}"

if [[ -z "$SERVICE" ]]; then
  echo "usage: $0 <service|all>" >&2
  exit 2
fi

command -v jq >/dev/null || { echo "jq required" >&2; exit 2; }
command -v git >/dev/null || { echo "git required" >&2; exit 2; }

install_one() {
  local key="$1"
  local repo ref raw_path dest sha tag

  repo="$(jq -r --arg k "$key" '.services[$k].repository // empty' "$REGISTRY")"
  ref="$(jq -r --arg k "$key" '.services[$k].reviewedRef // empty' "$REGISTRY")"
  raw_path="$(jq -r --arg k "$key" '.services[$k].installPath // empty' "$REGISTRY")"

  [[ -n "$repo" && -n "$ref" && -n "$raw_path" ]] || {
    echo "ERROR: incomplete registry entry for $key" >&2
    return 3
  }

  dest="${raw_path/#\~/$HOME}"
  mkdir -p "$(dirname "$dest")"

  if [[ ! -d "$dest/.git" ]]; then
    git clone --filter=blob:none "$repo" "$dest"
  fi

  git -C "$dest" fetch --tags --prune origin
  git -C "$dest" checkout --detach "$ref"

  sha="$(git -C "$dest" rev-parse HEAD)"
  tag="$(git -C "$dest" describe --tags --exact-match 2>/dev/null || true)"
  if [[ -z "$tag" ]]; then
    echo "ERROR: $key ref $ref does not resolve to an exact tag" >&2
    return 4
  fi

  cat > "$dest/.opsly-pin.json" <<EOF
{
  "service": "$key",
  "repository": "$repo",
  "reviewed_ref": "$ref",
  "resolved_tag": "$tag",
  "resolved_sha": "$sha",
  "update_policy": "manual-review-only"
}
EOF

  echo "READY service=$key tag=$tag sha=$sha path=$dest"
}

if [[ "$SERVICE" == "all" ]]; then
  jq -r '.services | keys[]' "$REGISTRY" | while read -r key; do
    install_one "$key"
  done
else
  jq -e --arg k "$SERVICE" '.services[$k]' "$REGISTRY" >/dev/null || {
    echo "unknown service: $SERVICE" >&2
    exit 2
  }
  install_one "$SERVICE"
fi
