---
status: blocked
owner: operations
date: 2026-07-24
severity: mixed
blocked_on: workflow-scope-github-access
---

# npm audit — blocked findings (needs `workflow`-scope access to finish)

## Why this file exists

The `npm audit (moderate+)` CI check has been failing on every open PR since
before 2026-07-24 (confirmed unrelated to any specific PR's diff — it scans
the whole installed dependency tree, not the diff). Investigated and partly
fixed in PR **#811** (`fix/npm-audit-moderate`). This file documents what's
left and exactly why it can't be finished from a session without `workflow`
OAuth scope, so the next agent that has it can pick this up without
re-deriving the investigation.

**Symptom on every PR:**
```
## ⚠️ npm audit found MODERATE+ vulnerabilities
Run `npm audit --audit-level=moderate` locally to see details.
This PR cannot be merged until vulnerabilities are resolved or explicitly exempted.
```

## What's already fixed (PR #811)

`npm audit fix --package-lock-only` (no `--force`), run to convergence:
**17 → 15 vulnerabilities**. Resolved: `tar` (critical), `js-yaml` (high),
`protobufjs` (moderate), `brace-expansion` (high), `body-parser`, and their
transitive advisories. Safe, verified via CI's build matrix (not just local
lockfile diffing).

## What's still blocked, and why

### 1. `next` — genuinely unfixable right now (not a --force problem)

As of 2026-07-24, `npm audit --package-lock-only` reports the advisory range
for `next` as:

```
next  9.5.6-canary.0 - 10.0.7 || 12.0.0 - 16.3.0-preview.7
```

That covers **every currently-published stable release**, including
`16.0.0`–`16.2.11` (checked live against the npm registry — no stable
release exists above `16.3.0-preview.7`, only further previews:
`16.3.0-preview.8`, `.9`, etc.). There is no version to upgrade *to* yet.
This needs either:
- A stable Next.js release to ship past `16.3.0-preview.7` with the fix, then
  a normal (non-`--force`) bump, **or**
- An explicit exemption for this specific advisory in the CI gate until then
  (see "What actually needs `workflow` scope" below).

Re-verify before acting: `npm view next versions --json | tail -20` and
re-run `npm audit --package-lock-only` to see if the range has moved.

### 2. `hono` (→ `@modelcontextprotocol/sdk`) and `dompurify` (→ `mermaid`) — need `--force`, unverified

Both only have `--force` fixes available, meaning the resolved fix installs a
version outside the dependency's stated semver range:
- `hono` fix pulls in `@modelcontextprotocol/sdk@1.24.3` — flagged by npm as
  **"a SemVer major change."**
- `dompurify` fix (`3.4.12`) is outside `mermaid`'s stated dependency range.

These are plausibly safe (patch-adjacent version numbers) but **not verified
against a real build** in the sandbox this was investigated in (no
`node_modules`, `npm ci` not run, no way to build the ~10 apps that share
this root lockfile). Do not push a `--force` lockfile change without running
the full CI build matrix or a real local `npm ci && npm run build` across
affected apps first.

### 3. `@auth/core` (via `next-auth`) — NEW finding, root cause not identified

**This one needs investigation, not just a version bump.** It was **not** in
the original 17-vulnerability CI report. It appeared only after running a
broader `npm install --package-lock-only` (not `npm audit fix`) following
override bumps to `next`/`postcss`/`hono`/`dompurify`/`fast-uri` in
`package.json`. Two explanations, unconfirmed:
- It was always latently present (masked by some other resolution) and the
  broader re-resolve simply exposed it, **or**
- Bumping those overrides genuinely changed `next-auth`'s resolved dependency
  subtree and pulled in a vulnerable `@auth/core` that wasn't there before.

The attempted fix was **reverted** rather than pushed once this appeared,
specifically because it couldn't be verified. Before touching this: run
`npm ls @auth/core next-auth` on `main` (clean) vs. on a branch with the
`next`/`postcss`/`hono`/`dompurify`/`fast-uri` overrides bumped, and diff the
resolution paths to find what actually pulls it in.

### 4. `postcss`, `sharp`, `fast-uri` — mostly downstream of #1

- `postcss` and `sharp` are transitive dependencies of `next` — likely
  resolve on their own once `next` has a real fix to bump to.
- `fast-uri` bumped cleanly in local testing (`3.1.2` → `3.1.4`, override in
  `package.json`) with no observed side effects, but wasn't pushed here since
  it was bundled with the reverted broader attempt. Safe to re-apply on its
  own: bump the `fast-uri` entry in the root `package.json` `overrides`
  block, then `npm install --package-lock-only --ignore-scripts` and confirm
  only `fast-uri` moved in the lockfile diff.

## Root cause behind the stuck pins

Root `package.json` already has an `overrides` block (search for
`"overrides"`) pinning several of these exact vulnerable versions —
`postcss: 8.5.13`, `fast-uri: 3.1.2`, `hono: 4.12.26`, `dompurify: 3.4.11`,
`next: 15.5.18` — presumably pinned for a past, unrelated reason. Plain
`npm audit fix` (no `--force`) cannot move a package past an explicit
`overrides` pin; the override itself has to be bumped, then
`npm install --package-lock-only` re-run to regenerate the lockfile. (Note:
`npm install --package-lock-only` still triggers the root `postinstall`
build script unless you also pass `--ignore-scripts` — without it, the
command fails on unrelated workspace build errors that have nothing to do
with the dependency resolution you're trying to do.)

## What actually needs `workflow`-scope GitHub access

Neither option below is achievable from a session whose GitHub token lacks
the `workflow` OAuth scope (confirmed: both a direct `git push` and the
GitHub API's `create_or_update_file`/`push_files` on `.github/workflows/*`
are rejected — see PR #704's history for the earlier confirmation of this on
an unrelated CI-duplication fix).

1. **Once `next` ships a real fix**: bump the `next` override + direct
   per-app dependency ranges (already `^15.5.18` in `apps/{api,admin,portal,
   peskids,panini-lab}/package.json`, so a patch bump is compatible without
   touching those files — only the root `overrides` pin needs to move),
   verify `postcss`/`sharp` resolve as a side effect, and merge.
2. **Until then, to unblock merges generally**: add an explicit advisory
   exemption/allowlist to whatever step runs `npm audit --audit-level=moderate`
   in `.github/workflows/ci.yml` (or wherever the `npm audit (moderate+)`
   check is defined) for the specific unfixable GHSA IDs — e.g.
   `GHSA-m99w-x7hq-7vfj` and the other `next`-related ones listed in the CI
   comment on any affected PR. Do **not** blanket-disable the check; scope
   the exemption to the specific advisory IDs that are genuinely unfixable,
   with a comment linking back to this file, and remove the exemption once
   `next` ships a fix.

## Reproduce / verify

```bash
npm audit --audit-level=moderate --package-lock-only   # current state, no install needed
npm view next versions --json | tail -20                # check if a stable fix has shipped
```
