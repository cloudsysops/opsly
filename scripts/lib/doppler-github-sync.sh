#!/usr/bin/env bash
# Shared Doppler → GitHub Secrets sync (sourced; never prints secret values).
set -euo pipefail

DGS_PROJECT="${DOPPLER_PROJECT:-ops-intcloudsysops}"
DGS_CONFIG="${DOPPLER_CONFIG:-prd}"
DGS_REPO="${GITHUB_REPOSITORY:-cloudsysops/opsly}"
DGS_DRY_RUN="${DGS_DRY_RUN:-false}"

dgs_require_tools() {
  local cmd
  for cmd in doppler gh jq; do
    command -v "$cmd" >/dev/null 2>&1 || {
      echo "Missing command: $cmd" >&2
      exit 2
    }
  done
}

dgs_require_gh_repo() {
  gh repo view "$DGS_REPO" >/dev/null 2>&1 || {
    echo "Cannot access GitHub repo: $DGS_REPO (run: gh auth login)" >&2
    exit 2
  }
}

dgs_doppler_has_secret() {
  local key="$1"
  doppler secrets get "$key" --project "$DGS_PROJECT" --config "$DGS_CONFIG" --plain >/dev/null 2>&1
}

dgs_doppler_secret_nonempty() {
  local key="$1"
  local value
  value="$(doppler secrets get "$key" --project "$DGS_PROJECT" --config "$DGS_CONFIG" --plain 2>/dev/null || true)"
  [[ -n "$value" ]]
}

dgs_github_has_secret() {
  local key="$1"
  gh secret list --repo "$DGS_REPO" --json name --jq '.[].name' 2>/dev/null | grep -Fxq "$key"
}

dgs_sync_one() {
  local key="$1"
  if ! dgs_doppler_secret_nonempty "$key"; then
    echo "missing-doppler $key" >&2
    return 1
  fi
  if [[ "$DGS_DRY_RUN" == true ]]; then
    echo "plan  $key → GitHub ($DGS_REPO)"
    return 0
  fi
  doppler secrets get "$key" --project "$DGS_PROJECT" --config "$DGS_CONFIG" --plain \
    | gh secret set "$key" --repo "$DGS_REPO" >/dev/null
  echo "ok    $key → GitHub ($DGS_REPO)"
}

dgs_verify_github_keys() {
  local key missing=0
  for key in "$@"; do
    if dgs_github_has_secret "$key"; then
      echo "ok    GitHub has $key"
    else
      echo "missing-github $key" >&2
      missing=1
    fi
  done
  return "$missing"
}

dgs_load_group_keys() {
  local manifest="$1"
  local group="$2"
  jq -r --arg g "$group" '.groups[$g].keys[]?' "$manifest"
}

dgs_group_required() {
  local manifest="$1"
  local group="$2"
  jq -r --arg g "$group" '.groups[$g].required // false' "$manifest"
}

dgs_list_groups() {
  local manifest="$1"
  jq -r '.groups | keys[]' "$manifest"
}

dgs_keys_for_selection() {
  local manifest="$1"
  local selection="$2"
  if [[ "$selection" == "all" ]]; then
    jq -r '.groups[].keys[]' "$manifest" | sort -u
  else
    dgs_load_group_keys "$manifest" "$selection"
  fi
}
