#!/usr/bin/env bash
# Guard: scan-env-dollar-interpolation.sh reports KEY names, never values.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../../.." && pwd)"
SCRIPT="${ROOT}/scripts/ops/scan-env-dollar-interpolation.sh"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

chmod +x "$SCRIPT"

clean="${TMP}/clean.env"
cat >"$clean" <<'EOF'
# comment
FOO=bar
ESCAPED=pass$$word
INTENTIONAL=${PLATFORM_DOMAIN}
QUOTED="hello"
EOF

if ! "$SCRIPT" --env-file "$clean"; then
  echo "expected clean env to pass" >&2
  exit 1
fi

risky="${TMP}/risky.env"
cat >"$risky" <<'EOF'
SAFE=ok
PASSWORD=ab$uFcd
TOKEN=xx$GH_TOKEN
ALSO=${PLATFORM_DOMAIN}
EOF

if "$SCRIPT" --env-file "$risky" >"${TMP}/out.txt" 2>&1; then
  echo "expected risky env to fail" >&2
  cat "${TMP}/out.txt" >&2
  exit 1
fi

if grep -q 'ab\$uFcd\|xx\$GH' "${TMP}/out.txt"; then
  echo "script leaked a secret value" >&2
  exit 1
fi
if ! grep -q 'PASSWORD' "${TMP}/out.txt"; then
  echo "expected PASSWORD in key list" >&2
  cat "${TMP}/out.txt" >&2
  exit 1
fi
if ! grep -q 'TOKEN' "${TMP}/out.txt"; then
  echo "expected TOKEN in key list" >&2
  cat "${TMP}/out.txt" >&2
  exit 1
fi

if ! "$SCRIPT" --env-file "$risky" --dry-run >"${TMP}/dry.txt"; then
  echo "dry-run should exit 0" >&2
  exit 1
fi

echo "scan-env-dollar-interpolation: ok"
