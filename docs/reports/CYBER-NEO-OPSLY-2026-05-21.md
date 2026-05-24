---
status: draft
owner: operations
last_review: 2026-05-24
type: doc
tags:
  - opsly/doc
---

# Cyber Neo Opsly Scan

Date: 2026-05-21

Scope:

- Repository root: `/Users/dragon/cboteros/proyectos/intcloudsysops`
- Secret scan: Cyber Neo helper script, summary only
- Lockfile scan: Cyber Neo helper script
- Production dependency scan: `npm audit --omit=dev`

No raw secret values are included in this report.

## Summary

| Check | Result |
| --- | --- |
| Secret scan | 47 potential findings |
| Lockfile scan | 1 finding, assessed as false positive |
| Production npm audit | 7 vulnerabilities |
| Skills validation | Passed |

## Secret Scan

Cyber Neo scanned 2701 files and skipped 61 generated/vendor-like files.

Findings by severity:

| Severity | Count |
| --- | ---: |
| Critical | 5 |
| High | 23 |
| Medium | 1 |
| Low | 18 |

Top finding types:

| Type | Count | Assessment |
| --- | ---: | --- |
| Redis connection strings | 14 | Mixed: examples/docs plus local env |
| Hardcoded secret-like strings | 14 | Needs triage |
| Hardcoded password-like strings | 5 | Needs triage |
| PostgreSQL connection strings | 5 | Needs triage; docs may contain examples |
| Env password | 2 | Local/example context likely |
| Hardcoded API key | 2 | Needs triage |
| JWT token | 1 | Local `.env`; not tracked |
| Authorization header | 1 | Likely documentation example |
| GCP service account marker | 1 | Needs triage |
| Discord webhook | 1 | Needs triage |

High-signal paths to review first:

- `.env` — ignored by git, local only.
- `docs/01-development/LAYERS-SANDBOX-QA-PROD.md`
- `scripts/setup-redis-vps.sh`
- `scripts/dispatch-discord-command.sh`
- `scripts/lib/google-auth.sh`
- `apps/api/lib`
- `apps/mcp/__tests__`

## Lockfile Scan

Cyber Neo reported a missing `pnpm-lock.yaml` because `pnpm-workspace.yaml` exists.

Assessment: false positive for current repo policy.

Evidence:

- `package.json` declares `packageManager: npm@10.5.0`.
- Root `package-lock.json` exists and is tracked.
- `pnpm-lock.yaml` does not exist.

Recommended cleanup:

- Either remove `pnpm-workspace.yaml` if npm is canonical.
- Or formally migrate to pnpm and commit `pnpm-lock.yaml`.

Do not keep both signals ambiguous.

## npm Audit Production

Production dependency scan reported:

| Severity | Count |
| --- | ---: |
| Moderate | 5 |
| High | 2 |
| Critical | 0 |

Packages involved:

- `next`
- `postcss`
- `ws`
- `langsmith`
- `llamaindex`
- `@llamaindex/workflow`
- `@llamaindex/workflow-core`

Notes:

- Some suggested fixes are major-version or invalid downgrade paths. Do not run `npm audit fix --force` blindly.
- Treat `next` separately because this monorepo has several Next apps and production deployment risk is high.
- Treat `llamaindex/langsmith` separately; confirm whether they are runtime dependencies in production services.

## Recommended Actions

1. Triage potential secrets by path and remove real values from tracked docs/scripts.
2. Keep `.env` ignored and never commit it.
3. Decide package manager canonical source: npm or pnpm.
4. Add a CI secret scan that redacts values in logs.
5. Open dependency upgrade tickets for `next`, `postcss`, `ws`, `langsmith`, and `llamaindex`.
6. Run Cyber Neo focused scans per app before major deploys.

---

## Enlaces relacionados

- [[reports/README|reports]]
- [[brain/README|Brain Central]]
