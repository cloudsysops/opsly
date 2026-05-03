#!/usr/bin/env bash
# Regenera docs/ops/workflows-catalog.tsv usando gh (requiere auth).
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
REPO="${GITHUB_REPOSITORY:-cloudsysops/opsly}"
TSV="${ROOT}/docs/ops/workflows-catalog.tsv"

wf_category() {
  case "$1" in
    ci.yml | structure-validation.yml | validate-context.yml | validate-doppler.yml | security.yml | dependency-audit-strict.yml | auto-fix-on-push.yml | nightly-fix.yml | copilot-setup-steps.yml)
      echo "ci-quality"
      ;;
    deploy.yml | deploy-staging.yml | promote-production-canary.yml | guardian-shield-deploy.yml | security-bot-deployment.yml)
      echo "deploy-release"
      ;;
    sync-all.yml | sync-docs.yml | obsidian-vault-sync.yml | notebooklm-sync.yml | docs-governance.yml)
      echo "sync-docs"
      ;;
    cleanup-demos.yml | tenant-onboarding-readiness.yml | github-project-sync.yml | task-orchestrator-ci.yml)
      echo "tenant-ops"
      ;;
    backup.yml)
      echo "backup"
      ;;
    hermes-health.yml | autonomy-safety-check.yml)
      echo "health-autonomy"
      ;;
    evolution-pipeline.yml)
      echo "experimental"
      ;;
    *)
      echo "general"
      ;;
  esac
}

printf '%s\t%s\t%s\t%s\t%s\t%s\n' "file" "category" "archive_tier" "last_success_utc" "usage_signal" "notes" >"$TSV"

for path in "${ROOT}/.github/workflows/"*.yml; do
  base=$(basename "$path")
  cat=$(wf_category "$base")
  last=""
  last=$(gh run list --repo "$REPO" --workflow "$base" --limit 1 --status success --json updatedAt -q '.[0].updatedAt // ""' 2>/dev/null || true)
  if [[ -n "$last" ]]; then
    sig="yes"
    tier="keep"
    note="success sample from gh run list"
  else
    sig="unknown"
    tier="review_quarterly"
    note="no success in sample; manual-only scheduled or failing"
  fi
  printf '%s\t%s\t%s\t%s\t%s\t%s\n' "$base" "$cat" "$tier" "$last" "$sig" "$note" >>"$TSV"
done

echo "Wrote $TSV ($(wc -l <"$TSV") lines)"
