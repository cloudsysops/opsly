#!/usr/bin/env bash
# Fails when a changed runtime file adds a direct LLM provider call outside the gateway.
# Use --all for an inventory of legacy bypasses.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
ALL=false
if [[ "${1:-}" == "--all" ]]; then
  ALL=true
fi

is_runtime_file() {
  case "$1" in
    *.ts|*.tsx|*.js|*.mjs|*.cjs|*.py) return 0 ;;
    *) return 1 ;;
  esac
}

is_allowed_file() {
  case "$1" in
    apps/llm-gateway/*|lib/content-studio/src/llm/client.ts) return 0 ;;
    */__tests__/*|*/test/*|*/tests/*) return 0 ;;
    *) return 1 ;;
  esac
}

changed_files() {
  if $ALL; then
    git -C "$ROOT" ls-files
    return
  fi

  if [[ -n "${GITHUB_BASE_REF:-}" ]]; then
    git -C "$ROOT" diff --name-only "origin/${GITHUB_BASE_REF}...HEAD"
    return
  fi

  # Local mode includes unstaged/staged work. With no worktree diff, inspect HEAD.
  local files
  files="$(git -C "$ROOT" diff --name-only; git -C "$ROOT" diff --cached --name-only)"
  if [[ -n "$files" ]]; then
    printf '%s\n' "$files"
  else
    git -C "$ROOT" diff-tree --no-commit-id --name-only -r HEAD
  fi
}

violations=()
while IFS= read -r file; do
  [[ -n "$file" ]] || continue
  is_runtime_file "$file" || continue
  is_allowed_file "$file" && continue
  [[ -f "$ROOT/$file" ]] || continue

  if rg -n -i \
    "api\\.anthropic\\.com|api\\.openai\\.com|api\\.deepseek\\.com|generativelanguage\\.googleapis\\.com|from ['\"]@anthropic-ai/sdk['\"]|new Anthropic\\(|from ['\"]openai['\"]|new OpenAI\\(" \
    "$ROOT/$file" >/dev/null; then
    violations+=("$file")
  fi
done < <(changed_files | sort -u)

if (( ${#violations[@]} > 0 )); then
  echo "❌ Direct LLM provider call detected outside apps/llm-gateway:"
  printf '   - %s\n' "${violations[@]}"
  echo "Use OpenClaw -> apps/llm-gateway. If this is an intentional migration exception, add a narrow allowlist entry with owner/reason."
  exit 1
fi

if $ALL; then
  echo "✅ No unallowlisted direct provider calls found."
else
  echo "✅ No new direct LLM provider bypasses in changed runtime files."
fi
