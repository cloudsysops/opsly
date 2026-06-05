#!/usr/bin/env bash
# Shared runtime bootstrap for Git hooks (non-interactive shells).
# Source from .githooks/* via: source "$ROOT/scripts/hooks/hook-bootstrap.sh"

set -euo pipefail

opsly_hook_bootstrap_runtime() {
  if command -v npm >/dev/null 2>&1 && command -v npx >/dev/null 2>&1 && command -v node >/dev/null 2>&1; then
    return 0
  fi

  # Version managers (best-effort; no login shell required)
  if [[ -n "${NVM_DIR:-}" && -s "${NVM_DIR}/nvm.sh" ]]; then
    # shellcheck disable=SC1090
    source "${NVM_DIR}/nvm.sh" --no-use 2>/dev/null || true
  elif [[ -s "${HOME}/.nvm/nvm.sh" ]]; then
    # shellcheck disable=SC1091
    source "${HOME}/.nvm/nvm.sh" --no-use 2>/dev/null || true
  fi

  if [[ -d "${HOME}/.fnm" ]] && command -v fnm >/dev/null 2>&1; then
    eval "$(fnm env --shell bash 2>/dev/null)" || true
  fi

  if [[ -d "${HOME}/.volta/bin" ]]; then
    export PATH="${HOME}/.volta/bin:${PATH}"
  fi

  local candidates=(
    "${ASDF_DATA_DIR:-${HOME}/.asdf}/shims"
    /usr/local/opt/node@22/bin
    /usr/local/opt/node@20/bin
    /opt/homebrew/opt/node@22/bin
    /opt/homebrew/opt/node@20/bin
    /opt/homebrew/bin
    /usr/local/bin
  )

  local candidate
  for candidate in "${candidates[@]}"; do
    if [[ -d "$candidate" ]]; then
      export PATH="$candidate:${PATH}"
    fi
    if command -v npm >/dev/null 2>&1 && command -v npx >/dev/null 2>&1 && command -v node >/dev/null 2>&1; then
      return 0
    fi
  done

  return 1
}

opsly_hook_require() {
  local binary="$1"
  if ! command -v "$binary" >/dev/null 2>&1; then
    echo "❌ Missing required command: $binary (PATH=${PATH})" >&2
    exit 1
  fi
}

opsly_hook_staged_files() {
  git diff --cached --name-only --diff-filter=ACMR 2>/dev/null || true
}

# Files introduced by commits being pushed (stdin: pre-push hook arguments).
opsly_hook_push_changed_files() {
  local local_ref local_sha remote_ref remote_sha
  while read -r local_ref local_sha remote_ref remote_sha; do
    [[ -z "${local_ref:-}" ]] && continue
    if [[ "${local_sha:-}" =~ ^0+$ ]]; then
      continue
    fi
    if [[ "${remote_sha:-}" =~ ^0+$ ]]; then
      git show --pretty="" --name-only "$local_sha"
    else
      git diff --name-only "$remote_sha" "$local_sha"
    fi
  done
}

opsly_hook_files_match() {
  local files="$1"
  local pattern="$2"
  [[ -n "$files" ]] && printf '%s\n' "$files" | grep -Eq "$pattern"
}
