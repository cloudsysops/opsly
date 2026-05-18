#!/usr/bin/env bash
# ADR-034: .github/AGENTS.md must be a symlink to ../AGENTS.md (single source of truth).
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT"

if [[ ! -f AGENTS.md ]]; then
  echo "❌ AGENTS.md missing at repo root" >&2
  exit 1
fi

if [[ -L .github/AGENTS.md ]] && [[ "$(readlink .github/AGENTS.md)" == "../AGENTS.md" ]]; then
  echo "✅ .github/AGENTS.md → ../AGENTS.md (symlink)"
  exit 0
fi

if [[ -e .github/AGENTS.md ]] && [[ ! -L .github/AGENTS.md ]]; then
  echo "⚠️  Replacing regular .github/AGENTS.md with symlink (ADR-034)" >&2
  rm -f .github/AGENTS.md
fi

mkdir -p .github
ln -s ../AGENTS.md .github/AGENTS.md

if [[ -L .github/AGENTS.md ]] && [[ "$(readlink .github/AGENTS.md)" == "../AGENTS.md" ]]; then
  echo "✅ .github/AGENTS.md → ../AGENTS.md (symlink restored)"
  exit 0
fi

echo "❌ Failed to create .github/AGENTS.md symlink" >&2
exit 1
