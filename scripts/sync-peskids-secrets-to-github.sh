#!/usr/bin/env bash
# Sync Peskids Doppler prd → GitHub Actions secrets (never prints values).
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
# shellcheck source=scripts/lib/doppler-github-sync.sh
source "${ROOT}/scripts/lib/doppler-github-sync.sh"

MANIFEST="${ROOT}/config/peskids-github-secrets.json"
GROUP="all"
VERIFY_ONLY=false

usage() {
  cat <<EOF
Usage: ./scripts/sync-peskids-secrets-to-github.sh [--dry-run] [--verify] [--group NAME]

Sync Doppler (${DGS_PROJECT}/${DGS_CONFIG}) → GitHub secrets for Peskids CI build-args.
Values travel only via stdin pipe; nothing is echoed.

Groups (from config/peskids-github-secrets.json):
$(dgs_list_groups "$MANIFEST" 2>/dev/null | sed 's/^/  /' || echo "  (manifest missing)")
  all       — union of every group (default)

Options:
  --dry-run   Plan only; no writes to GitHub
  --verify    Check GitHub has secret names (no Doppler read, no writes)
  --group G   supabase | whatsapp | firebase | n8n | all

Prerequisites:
  doppler login   (read access to ${DGS_PROJECT}/${DGS_CONFIG})
  gh auth login   (secret write on ${DGS_REPO})

Examples:
  ./scripts/sync-peskids-secrets-to-github.sh --dry-run --group supabase
  ./scripts/sync-peskids-secrets-to-github.sh --group supabase
  ./scripts/sync-peskids-secrets-to-github.sh --verify --group all
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --dry-run) DGS_DRY_RUN=true ;;
    --verify) VERIFY_ONLY=true ;;
    --group)
      shift
      GROUP="${1:?--group requires a name}"
      ;;
    -h|--help) usage; exit 0 ;;
    *) echo "Unknown: $1" >&2; usage; exit 1 ;;
  esac
  shift
done

[[ -f "$MANIFEST" ]] || { echo "Missing manifest: $MANIFEST" >&2; exit 1; }

DGS_PROJECT="$(jq -r '.doppler_project' "$MANIFEST")"
DGS_CONFIG="$(jq -r '.doppler_config' "$MANIFEST")"
DGS_REPO="$(jq -r '.github_repository' "$MANIFEST")"

dgs_require_tools
dgs_require_gh_repo

if [[ "$GROUP" != "all" ]] && ! jq -e --arg g "$GROUP" '.groups[$g]' "$MANIFEST" >/dev/null; then
  echo "Unknown group: $GROUP" >&2
  usage
  exit 1
fi

KEYS=()
while IFS= read -r line; do
  [[ -n "$line" ]] && KEYS+=("$line")
done < <(dgs_keys_for_selection "$MANIFEST" "$GROUP")
if [[ "${#KEYS[@]}" -eq 0 ]]; then
  echo "No keys for group: $GROUP" >&2
  exit 1
fi

echo "Peskids secrets → GitHub (${DGS_REPO})"
echo "  doppler: ${DGS_PROJECT}/${DGS_CONFIG}"
echo "  group:   ${GROUP}"
echo "  mode:    $([[ "$VERIFY_ONLY" == true ]] && echo verify-only || ([[ "$DGS_DRY_RUN" == true ]] && echo dry-run || echo sync))"
echo ""

if [[ "$VERIFY_ONLY" == true ]]; then
  dgs_verify_github_keys "${KEYS[@]}"
  exit $?
fi

missing=0
for key in "${KEYS[@]}"; do
  if ! dgs_doppler_has_secret "$key"; then
    echo "missing-doppler $key (${DGS_PROJECT}/${DGS_CONFIG})" >&2
    missing=1
  fi
done
if [[ "$missing" -ne 0 ]]; then
  echo "" >&2
  echo "Fix Doppler first:" >&2
  echo "  ./scripts/doppler-configure-peskids-prd.sh" >&2
  echo "  ./scripts/doppler-set-peskids-firebase-admin.sh --file <path-to-json>  (server FCM only)" >&2
  exit 1
fi

for key in "${KEYS[@]}"; do
  dgs_sync_one "$key"
done

echo ""
echo "Verify names (values hidden):"
echo "  gh secret list --repo ${DGS_REPO} | grep -E 'SUPABASE|FIREBASE|PESKIDS|N8N'"
echo "Re-deploy: GitHub Actions → Deploy Peskids → Run workflow"
