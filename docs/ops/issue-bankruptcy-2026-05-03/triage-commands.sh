#!/usr/bin/env bash
# Issue bankruptcy — REVIEW ONLY. Do not run as-is without human approval.
# Policy: never bulk-close without a comment; exclude label:keep-backlog;
#         exclude security/CVE/data-leak (review manually); exclude >5 comments (interest).
# Between mutations: sleep 1 (rate / audit trail).
set -euo pipefail

REPO="cloudsysops/opsly"
# Cutoff for "no activity >90d" from report date 2026-05-03 → updated before 2026-02-03
STALE_CUTOFF="2026-02-03"

echo "# 0) Dry-run: count candidates (GitHub search; zero expected while automation keeps updating)"
gh issue list --repo "$REPO" --state open --search "updated:<${STALE_CUTOFF} -label:keep-backlog" --limit 5 --json number,title,updatedAt || true

echo "# 1) Example: list stale numbers into a file, then comment + close (DO NOT RUN IN LOOPS UNTIL APPROVED)"
cat <<'TEMPLATE'
# for n in $(cat /tmp/stale-issue-numbers.txt); do
#   gh issue comment "$REPO" "$n" --body "Closing as stale (no activity >90d). Reopen with repro if still valid. Ref: docs/ops/issue-bankruptcy-2026-05-03.md"
#   sleep 1
#   gh issue close "$REPO" "$n" --reason "not_planned"
#   sleep 1
# done
TEMPLATE

echo "# 2) Label hygiene (safe): add needs-owner to unassigned backlog (optional)"
cat <<'TEMPLATE'
# gh issue list --repo "$REPO" --state open --search "no:assignee" --limit 200 --json number -q '.[].number' | while read -r n; do
#   gh issue edit "$REPO" "$n" --add-label "needs-owner"
#   sleep 1
# done
TEMPLATE

echo "# 3) Mark epics / keep-backlog (manual pick issue numbers)"
cat <<'TEMPLATE'
# gh issue edit "$REPO" ISSUE_NUMBER --add-label "epic" "keep-backlog"
TEMPLATE

echo "# 4) After dedupe: add stale-closed to superseded duplicates (comment first, then close or label only)"
echo "# Use GitHub UI or gh issue comment + gh issue close per issue with explicit reason."

echo "Done printing templates. No issues were modified by this script."
