#!/usr/bin/env bash
set -euo pipefail

SERVICE_ROOT="${OPSLY_EXTERNAL_SERVICES_DIR:-$HOME/.opsly/external-services}"
DEST="${SERVICE_ROOT}/twenty"
REPO_URL="https://github.com/twentyhq/twenty.git"
REF="${OPSLY_TWENTY_REF:-twenty/v2.39.0}"

mkdir -p "$SERVICE_ROOT"

if [[ ! -d "$DEST/.git" ]]; then
  git clone --filter=blob:none "$REPO_URL" "$DEST"
fi

git -C "$DEST" fetch --tags --prune origin
git -C "$DEST" checkout --detach "$REF"

SHA="$(git -C "$DEST" rev-parse HEAD)"
TAG="$(git -C "$DEST" describe --tags --exact-match 2>/dev/null || true)"

echo "Twenty external service ready"
echo "path=$DEST"
echo "ref=$REF"
echo "tag=${TAG:-unverified}"
echo "sha=$SHA"

if [[ -z "$TAG" ]]; then
  echo "ERROR: checked-out revision is not an exact tag; refusing production-ready status." >&2
  exit 3
fi

cat > "$DEST/.opsly-pin.json" <<EOF
{
  "repository": "$REPO_URL",
  "ref": "$REF",
  "tag": "$TAG",
  "sha": "$SHA"
}
EOF

echo "pin_file=$DEST/.opsly-pin.json"
