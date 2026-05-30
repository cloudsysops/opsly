#!/usr/bin/env bash
# Sync SigmaHQ detection rules into vendor/sigma (not committed — large upstream tree).
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
VENDOR_DIR="${SIGMA_VENDOR_DIR:-$REPO_ROOT/vendor/sigma}"
SIGMA_REPO="${SIGMA_REPO_URL:-https://github.com/SigmaHQ/sigma.git}"
SIGMA_REF="${SIGMA_RELEASE:-r2026-04-01}"
DRY_RUN=false

usage() {
  cat <<'EOF'
Usage: ./scripts/install-sigma-rules.sh [--dry-run] [--ref TAG_OR_BRANCH]

Clones or updates SigmaHQ/sigma under vendor/sigma for the Opsly sigma-harness module.
Default ref: r2026-04-01 (latest packaged release at time of integration).

Env:
  SIGMA_VENDOR_DIR   Override vendor path
  SIGMA_REPO_URL     Override git remote
  SIGMA_RELEASE      Override ref (tag/branch)
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --dry-run)
      DRY_RUN=true
      shift
      ;;
    --ref)
      SIGMA_REF="${2:?missing value for --ref}"
      shift 2
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "Unknown argument: $1" >&2
      usage >&2
      exit 1
      ;;
  esac
done

if [[ "$DRY_RUN" == true ]]; then
  echo "[dry-run] Would sync $SIGMA_REPO ref=$SIGMA_REF -> $VENDOR_DIR"
  exit 0
fi

mkdir -p "$(dirname "$VENDOR_DIR")"

if [[ -d "$VENDOR_DIR/.git" ]]; then
  echo "Updating existing Sigma clone at $VENDOR_DIR"
  git -C "$VENDOR_DIR" fetch --tags origin
  git -C "$VENDOR_DIR" checkout "$SIGMA_REF"
  git -C "$VENDOR_DIR" pull --ff-only origin "$SIGMA_REF" 2>/dev/null || true
else
  echo "Cloning Sigma ($SIGMA_REF) into $VENDOR_DIR"
  git clone --depth 1 --branch "$SIGMA_REF" "$SIGMA_REPO" "$VENDOR_DIR"
fi

RULE_COUNT="$(find "$VENDOR_DIR/rules" -name '*.yml' 2>/dev/null | wc -l | tr -d ' ')"
echo "Sigma rules ready: $RULE_COUNT files under rules/"
echo "Manifest: $REPO_ROOT/config/sigma/manifest.json"
