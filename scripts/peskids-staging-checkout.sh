#!/usr/bin/env bash
# Idempotent checkout for the isolated Peskids staging deploy.
# Prefers /opt/opsly-staging; falls back to $HOME/opsly-staging when /opt is not writable.
set -euo pipefail
: "${RELEASE_SHA:?RELEASE_SHA is required}"
[[ "$RELEASE_SHA" =~ ^[0-9a-f]{40}$ ]] || { echo "Expected full commit SHA" >&2; exit 1; }

REPO_URL="${PESKIDS_STAGING_REPO_URL:-https://github.com/cloudsysops/opsly.git}"
OPT_DIR="/opt/opsly-staging"
HOME_DIR="${HOME:?HOME is required}/opsly-staging"

choose_dir() {
  if [[ -d "$OPT_DIR/.git" && -w "$OPT_DIR" ]]; then
    printf '%s\n' "$OPT_DIR"
    return
  fi
  if mkdir -p "$OPT_DIR" 2>/dev/null && [[ -w "$OPT_DIR" ]]; then
    printf '%s\n' "$OPT_DIR"
    return
  fi
  mkdir -p "$HOME_DIR"
  printf '%s\n' "$HOME_DIR"
}

STAGING_DIR="$(choose_dir)"
if [[ ! -d "$STAGING_DIR/.git" ]]; then
  git clone --filter=blob:none "$REPO_URL" "$STAGING_DIR"
fi
cd "$STAGING_DIR"
git fetch --depth=1 origin "$RELEASE_SHA"
git -c advice.detachedHead=false checkout --force "$RELEASE_SHA"
printf 'PESKIDS_STAGING_DIR=%s\n' "$STAGING_DIR"
printf 'PESKIDS_STAGING_SHA=%s\n' "$(git rev-parse HEAD)"
