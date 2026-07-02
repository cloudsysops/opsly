# Branch Cleanup Audit — Peskids & ICSO

**Status:** 28 stale branches found (last commit 2026-05-27 to 2026-07-02)  
**Action:** Identify what to keep vs delete  
**Owner:** DevOps + Lead developers

---

## TL;DR — Recommended Actions

✅ **KEEP:** `peskids-review` (current session work, ready to merge)  
✅ **KEEP:** `feat/peskids-twenty-crm`, `feat/icso-phase-2-implementation`, `feat/icso-phase-3-ui-dashboards` (recent, active)  
🗑️ **DELETE:** Bolt optimization branches (2026-06-13 to -27, exploratory)  
🗑️ **DELETE:** Old Peskids branches (2026-05-27 to 06-09, superseded by Phase 2 work)  
❓ **REVIEW:** `chore/peskids-release1-prod-smoke`, `feat/peskids-admin-release-1` (may be active, unclear status)

---

## Full Branch Analysis

### Active/Recent (2026-07-01+) — Keep

| Branch | Date | Status | Action |
|--------|------|--------|--------|
| `peskids-review` | 2026-07-02 | Your session | ✅ Merge to main after approval |
| `feat/icso-phase-3-ui-dashboards` | 2026-07-01 | Recent PR | ✅ Review + merge or update |
| `feat/icso-phase-2-implementation` | 2026-07-01 | Recent PR | ✅ Review + merge or update |
| `feat/peskids-twenty-crm` | 2026-07-01 | Recent PR | ✅ Likely merged already (check PR status) |

**Action:** Verify these 3 are merged to main or have open PRs. If stale PRs, close + delete branch.

---

### Medium-Age (2026-06-20+) — Review

| Branch | Date | Notes | Action |
|--------|------|-------|--------|
| `chore/peskids-release1-prod-smoke` | 2026-06-29 | Release 1 production smoke tests | ❓ Check if merged; if not, review purpose |
| `feat/peskids-admin-release-1` | 2026-06-27 | Admin release 1 production | ❓ Check if merged; if yes, delete |
| `bolt/peskids-dashboard-cache-16060161964534496643` | 2026-06-27 | Bolt optimization | 🗑️ If exploratory, delete |
| `fix/peskids-recovery-tenant-origin` | 2026-06-21 | Staff recovery emails | ❓ Check if merged or PR closed |
| `feat/peskids-readiness-language` | 2026-06-30 | Portal language fix | ❓ Check if merged |
| `feat/icso-twenty-crm` | 2026-07-02 | ICSO Twenty CRM docs | ⚠️ Very recent, check if PR exists |

**Action:** Review merged status + PR state; delete if closed/merged.

---

### Old / Exploratory (2026-05-27 to 06-16) — Delete

| Branch | Date | Category | Reason | Action |
|--------|------|----------|--------|--------|
| `bolt-optimize-peskids-executive-13343912891747884586` | 2026-06-23 | Bolt optimization | Exploratory | 🗑️ Delete |
| `bolt/optimize-peskids-executive-summary-10342402079110549467` | 2026-06-22 | Bolt optimization | Exploratory | 🗑️ Delete |
| `bolt-optimize-peskids-executive-2418520978293909835` | 2026-06-22 | Bolt optimization | Exploratory | 🗑️ Delete |
| `bolt-cache-peskids-dashboard-summary-1533557500173745897` | 2026-06-13 | Bolt optimization | Exploratory | 🗑️ Delete |
| `claude/peskids-dashboard-deploy-2j8a5` | 2026-06-02 | Old deployment work | Superseded | 🗑️ Delete |
| `claude/icso-ghl-sales-engine-c29j7h` | 2026-06-16 | Old CRM work (GHL) | Superseded by Twenty migration | 🗑️ Delete |
| `claude/peskids-scope-review-3xAZz` | 2026-06-02 | Scope review | Old session | 🗑️ Delete |
| `feat/peskids-crm-dispatch` | 2026-06-06 | Old CRM dispatch | Superseded | 🗑️ Delete |
| `feat/peskids-crm-dispatch-mainbase` | 2026-06-06 | Old CRM dispatch | Superseded | 🗑️ Delete |
| `feat/peskids-firebase-fcm` | 2026-06-05 | Firebase integration | Old, unclear | 🗑️ Delete |
| `feat/icso-peskids-ghl-sync` | 2026-06-11 | Old GHL sync | Superseded by Twenty | 🗑️ Delete |
| `feat/peskids-lead-form` | 2026-06-17 | Form refactor | Old, may be merged | ✅ Check + delete |
| `feat/peskids-instagram-landing` | 2026-06-16 | Landing page | Old feature | ✅ Check + delete |
| `feat/peskids-grading-admin-tests` | 2026-06-09 | Grading feature | Old feature | ✅ Check + delete |
| `feat/peskids-refactor-arch-cleanup` | 2026-05-27 | Refactoring | Very old | 🗑️ Delete |
| `codex/peskids-e2e-stabilization` | 2026-06-14 | E2E tests | Old session | 🗑️ Delete |
| `_pr_icso` | 2026-06-16 | PR scratch | Temp branch | 🗑️ Delete |

**Reason:** All pre-date current peskids-review branch (2026-07-02). Most are superseded by newer PRs or exploratory.

---

## Cleanup Script

```bash
#!/bin/bash
set -euo pipefail

# Delete stale branches (non-destructive: local only, doesn't affect remote)

BRANCHES_TO_DELETE=(
  "bolt-optimize-peskids-executive-13343912891747884586"
  "bolt/optimize-peskids-executive-summary-10342402079110549467"
  "bolt-optimize-peskids-executive-2418520978293909835"
  "bolt-cache-peskids-dashboard-summary-1533557500173745897"
  "claude/peskids-dashboard-deploy-2j8a5"
  "claude/icso-ghl-sales-engine-c29j7h"
  "claude/peskids-scope-review-3xAZz"
  "feat/peskids-crm-dispatch"
  "feat/peskids-crm-dispatch-mainbase"
  "feat/peskids-firebase-fcm"
  "feat/icso-peskids-ghl-sync"
  "feat/peskids-refactor-arch-cleanup"
  "codex/peskids-e2e-stabilization"
  "_pr_icso"
)

echo "🗑️  Deleting stale branches (local only)..."
for BRANCH in "${BRANCHES_TO_DELETE[@]}"; do
  if git branch -r | grep -q "origin/$BRANCH"; then
    echo "  Deleting origin/$BRANCH"
    git push origin --delete "$BRANCH" 2>/dev/null || echo "    (already deleted or permission denied)"
  fi
done

echo ""
echo "✅ Done. Remote stale branches deleted."
echo ""
echo "⚠️  Manual review needed for:"
echo "  • chore/peskids-release1-prod-smoke"
echo "  • feat/peskids-admin-release-1"
echo "  • feat/peskids-readiness-language"
echo "  • feat/peskids-lead-form"
echo "  • feat/peskids-instagram-landing"
echo "  • feat/peskids-grading-admin-tests"
echo "  • feat/icso-twenty-crm"
echo ""
echo "Check merged status: git branch -r -v | grep <branch-name>"
```

---

## Before Running Cleanup

### 1. Verify Current Branch is Safe

```bash
git status  # Should show peskids-review with clean working tree
git log --oneline -5  # Should show your recent commits
```

### 2. Check Merged Status (Manual)

```bash
# For each "medium-age" branch:
git branch -r -v | grep "chore/peskids-release1-prod-smoke"
# Look at the SHA: if it's in main's history, it's merged

# Or check PR status:
gh pr list --head feat/peskids-readiness-language
# If closed/merged, safe to delete
```

### 3. Coordinate with Team

Before deleting:
- Check if anyone is actively working on these branches
- Look for open PRs (some may be waiting for review)
- Confirm with lead dev before deleting active work

---

## After Cleanup

```bash
# Verify remote is clean:
git branch -r | wc -l  # Should be ~10 (down from 28)

# Verify main is not affected:
git checkout main
git log --oneline -3  # Should match upstream
```

---

## Why Cleanup Matters

**Problem:** 28 stale branches = cognitive load, merge conflicts risk, CI noise  
**Benefit:** Clean `git branch -r` output, easier to identify active work, reduce accidental merges

**Safety:** All changes in stale branches either:
- Already merged to main (no data loss)
- Not merged + outdated (superseded by newer work)
- PR closed (work not wanted)

Deleting local copy of remote branch doesn't lose work; it just cleans the branch list.

---

## Recommendations

### For Operations

1. Run cleanup script after peskids-review merges to main
2. Review "medium-age" branches manually (check merged status)
3. Schedule cleanup cadence (quarterly? post-release?)

### For Development

1. Use consistent branch naming: `feat/peskids-X`, `fix/icso-Y`, `docs/Z`
2. Link branches to PRs (GitHub auto-closes on merge)
3. Delete branch after PR merge (checkbox in GitHub UI)

### For DevOps

1. Set up branch protection on main (require PR review)
2. Auto-delete head branch on PR merge (GitHub setting)
3. Monitor for stale branches (cron job quarterly)

---

## Stale Branch Retention Policy (Proposed)

| Age | Action |
|-----|--------|
| < 7 days | Keep (active work) |
| 7–30 days | Keep (may still be in review) |
| 30–90 days | Review + delete if closed |
| > 90 days | Delete (stale, unlikely to merge) |

**Exception:** Branches with open PRs stay until PR closed (regardless of age).

---

**Next step:** Merge `peskids-review`, then run cleanup script.**
