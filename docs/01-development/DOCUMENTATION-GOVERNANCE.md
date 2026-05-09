---
status: canon
owner: operations
last_review: 2026-05-09
---

# Documentation Governance & Protection

This document defines how canonical documentation is protected and maintained in Opsly.

## Canonical Documentation Files

The following files are **sources of truth** and are protected from unauthorized modification:

| File | Purpose | Update Frequency | Owner |
|------|---------|------------------|-------|
| `VISION.md` | Product north star, strategic direction | Quarterly or on major pivot | Operations |
| `ROADMAP.md` | Timeline, milestones, quarterly goals | Weekly/Sprint planning | Operations |
| `AGENTS.md` | Operational status, session state, next steps | Per session end | All Agents |
| `SPRINT-TRACKER.md` | Current sprint progress, blockers, velocity | Daily during sprint | Operations |
| `docs/README.md` | Documentation index and architecture guide | As docs are added | Operations |
| `config/modules.json` | Library module registry, versions, owners | When modules added/retired | Architecture |

## Protection Mechanisms

### 1. GitHub Branch Protection Rules

The following rules are enforced on the `main` branch:

```yaml
Branch: main
Protection Rules:
  - Require pull request reviews before merging
  - Require 1 approval for canonical docs changes
  - Require status checks to pass (type-check, validate-context)
  - Require branches to be up to date before merging
  - Include administrators in restrictions
  - Allow force pushes: disabled
  - Allow deletion: disabled
```

**How to configure (requires GitHub admin access):**

1. Go to `cloudsysops/opsly` → Settings → Branches
2. Click "Add rule" for branch `main`
3. Enable:
   - ☑ Require a pull request before merging
   - ☑ Require approvals (set to 1)
   - ☑ Require status checks to pass (select `validate-context`, `type-check`)
   - ☑ Require branches to be up to date before merging
   - ☑ Include administrators (enforce for everyone)

**Via GitHub CLI:**

```bash
# Requires GitHub admin token + gh CLI
gh api repos/cloudsysops/opsly/branches/main/protection \
  -X PUT \
  -f required_pull_request_reviews='{require_code_owner_reviews:true,required_approving_review_count:1}' \
  -f enforce_admins=true \
  -f require_status_checks='{strict:true,contexts:["validate-context","type-check"]}' \
  -f allow_force_pushes=false \
  -f allow_deletions=false
```

### 2. Pre-Commit Hook Protection

File: `.githooks/pre-commit` — validates canonical files are not modified carelessly.

**Behavior:**
- Detects if canonical files are staged for commit
- Warns developer about the modification
- Requires explicit commit message indicating intentional change

### 3. Commit Message Validation

File: `.githooks/commit-msg` — enforces semantic commit messages for canonical docs.

**Required patterns for canonical file changes:**
```
docs(agents): update session state
docs(roadmap): Q2 2026 milestones
chore(modules): register new lib module
feat(vision): update product direction
```

**Validation logic:**
```bash
if canonical_files_modified && ! (commit_message matches docs|chore|feat pattern)
  then exit 1 with error message
fi
```

## Update Process

### For Daily Operations (AGENTS.md)

**When to update:** At the end of each development session

**Who:** The agent (Claude, Cursor, etc.) or developer working on that session

**How:**
1. Update relevant sections (🔄 markers indicate update points)
2. Commit with message: `docs(agents): update session state and progress`
3. Push to `main`
4. The `.githooks/post-commit` will mirror to `.github/AGENTS.md` (see ADR-034)

### For Strategic Changes (VISION.md, ROADMAP.md)

**When to update:** During planning cycles or major pivots

**Who:** Operations team + product lead

**How:**
1. Create a PR against `main` with the changes
2. Include rationale in PR description
3. Require 1 approval before merge
4. Merge to `main`
5. Update `last_review` timestamp in frontmatter

### For Module Registry (config/modules.json)

**When to update:** When adding/retiring/versioning modules

**Who:** Architecture team (claude)

**How:**
1. Update `config/modules.json` with new module metadata
2. Update `docs/01-development/LIBRARY-MODULES.md` with usage examples
3. Commit with message: `chore(modules): register {module-name} v{version}`
4. Push to `main`

## Frontmatter Requirements

All canonical docs MUST include:

```yaml
---
status: canon
owner: {operations|architecture|team-name}
last_review: YYYY-MM-DD
---
```

**Validation:** `.github/workflows/docs-governance.yml` checks this on every push to `main`.

## ADR Reference

See `docs/adr/ADR-033-docs-canonicalization.md` for the architectural decision around canonical documentation and why parallel sources of truth are forbidden.

See `docs/adr/ADR-034-ci-hygiene.md` for `.github/AGENTS.md` symlink strategy and post-commit hook behavior.

## Emergency Override

**If canonical docs are corrupted or incorrect:**

1. Create a backup branch: `git checkout -b fix/canonical-restore`
2. Fix the issue
3. Create PR with title: `[CRITICAL] Restore canonical doc: {filename}`
4. Describe what was broken and why
5. Request immediate review + merge

All GitHub admins can approve emergency overrides.

## Monitoring

**Automatic checks:**
- CI workflow `validate-context.yml` verifies all canonical docs exist with proper frontmatter
- Pre-commit hooks prevent accidental modifications
- Post-commit hooks keep `.github/` mirror in sync

**Manual review (recommended quarterly):**
```bash
# Check if any canonical docs are out of sync
git diff main docs/README.md VISION.md ROADMAP.md AGENTS.md

# Verify all canonical docs have frontmatter
grep -l "status: canon" VISION.md ROADMAP.md AGENTS.md SPRINT-TRACKER.md docs/README.md
```

## Q&A

**Q: I need to update AGENTS.md, but the hook is preventing it.**
A: Use commit message with `docs(agents): ` prefix. See examples above.

**Q: Can I modify canonical docs in a feature branch?**
A: Yes, but changes won't go to `main` without PR review. Merge via normal PR workflow.

**Q: What if the protection rules are too strict?**
A: File an issue or discussion on GitHub. Changes require team consensus and ADR update.

**Q: Is documentation protected from deletion?**
A: Yes, `main` branch rules prevent deletion. You can delete in feature branches, but main branch requires protection.
