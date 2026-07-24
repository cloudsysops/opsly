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
the whole installed dependency tree, not the diff). Investigated and mostly
fixed in PR **#811** (`fix/npm-audit-moderate`), in two rounds. This file
documents what's left and exactly why it can't be finished from a session
without `workflow` OAuth scope, so the next agent that has it can pick this
up without re-deriving the investigation.

**Symptom on every PR:**
```
## ⚠️ npm audit found MODERATE+ vulnerabilities
Run `npm audit --audit-level=moderate` locally to see details.
This PR cannot be merged until vulnerabilities are resolved or explicitly exempted.
```

## What's already fixed (PR #811) — 17 → 11 vulnerabilities

**Round 1** — `npm audit fix --package-lock-only` (no `--force`), run to
convergence: **17 → 15**. Resolved: `tar` (critical), `js-yaml` (high),
`protobufjs` (moderate), `body-parser`, and their transitive advisories.

**Round 2** — targeted fixes for two more, each needed manual intervention
because `npm audit fix` silently no-ops on them (see "The silent no-op
problem" below): **15 → 11**.
- `next-auth` / `@auth/core` (critical) — `next-auth` in
  `apps/panini-lab/package.json` was pinned `^5.0.0-beta` (no specific beta
  number), locked to `5.0.0-beta.31` — exactly the vulnerable advisory's
  upper bound. Fixed via `npm view next-auth versions` (confirmed
  `5.0.0-beta.32` is published and is NOT in the vulnerable range) then
  `npm install next-auth@5.0.0-beta.32 --package-lock-only --ignore-scripts
  --workspace=@intcloudsysops/panini-lab`.
- `fast-uri` (high) — pinned via the root `overrides` block at `3.1.2`
  (vulnerable range `3.0.0 - 3.1.3`). Fixed by bumping the override to
  `3.1.4` in `package.json`, then
  `npm install --package-lock-only --ignore-scripts`.

Both verified via `git diff --stat package-lock.json` actually showing a
change (not just trusting npm's exit code / summary text — see below for
why that matters). **Neither has been build-verified** in this sandbox (no
`node_modules`, `npm ci` not run) — CI's build matrix on PR #811 is the real
check.

## The silent no-op problem (read this before touching anything else here)

`npm audit fix` and even plain `npm install --package-lock-only` in this
repo will frequently print `up to date` / show no error, **and make zero
change to `package-lock.json`**, even when npm's own `--json` audit output
says `"fixAvailable": true` for that exact package. There is no warning that
distinguishes "already fixed" from "silently didn't apply." This burned real
time in this investigation — an earlier version of this doc incorrectly
claimed `@auth/core` was a *new* finding that appeared only after a reverted
broader-fix attempt, when it had actually been present and stuck the whole
time; the mistake came from viewing `npm audit`'s text output through `tail`,
which cut off `@auth/core` (it sorts first alphabetically).

**Rule for whoever continues this:** after every `npm audit fix` / `npm
install` / `npm update` attempt, always run
`git diff --stat package-lock.json` immediately after. If it shows no change
(or the same line count as before), the command silently did nothing —
don't trust the printed vulnerability count alone, and don't assume "up to
date" means "nothing left to fix."

What worked when `npm audit fix` wouldn't: a **targeted** `npm update
<package>@<version> --package-lock-only --ignore-scripts` naming the exact
package and version (see `next-auth` above), or bumping the version pinned
in the root `overrides` block directly and re-running plain
`npm install --package-lock-only --ignore-scripts` (see `fast-uri` above).

## What's still blocked, and why (11 remaining)

### 1. `next` (+ transitively `postcss`, `sharp`) — genuinely unfixable right now, not a --force problem

As of 2026-07-24, `npm audit --package-lock-only` reports the advisory range
for `next` as:

```
next  9.5.6-canary.0 - 10.0.7 || 12.0.0 - 16.3.0-preview.7
```

That covers **every currently-published stable release**, including
`16.0.0`–`16.2.11` (checked live against the npm registry — no stable
release exists above `16.3.0-preview.7`, only further previews:
`16.3.0-preview.8`, `.9`, etc.). There is no version to upgrade *to* yet.
`postcss` and `sharp` are both transitive dependencies of `next` and will
very likely resolve on their own once `next` has a real fix to bump to —
don't try to fix them independently first.

This needs either:
- A stable Next.js release to ship past `16.3.0-preview.7` with the fix, then
  a normal (non-`--force`) bump (root `overrides` pins `next` at `15.5.18`;
  every app's own `package.json` already declares `^15.5.18`, so a patch/
  minor bump only requires moving the root override, not touching per-app
  files), **or**
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

### 3. `brace-expansion` (high) — low real risk, ESLint-only, nested override didn't take

Vulnerable instance is specifically `@eslint/eslintrc` → `minimatch@3.1.5` →
`brace-expansion@1.1.14` (confirmed via `npm ls brace-expansion
--package-lock-only` — three *other* resolved copies in the tree are already
on safe major versions: `2.1.2`, `5.0.8` ×2). This is a lint-tooling-only
dependency path — not reachable by any runtime/production code — so real
risk is low despite the "high" severity label (it's a regex DoS).

Attempted fix: a 3-level nested override —
```json
"@eslint/eslintrc": { "minimatch": { "brace-expansion": "^1.1.16" } }
```
`npm ls` showed `@eslint/eslintrc overridden` after adding this, but the
resolved `brace-expansion` version under it never actually moved off
`1.1.14` (another instance of the silent no-op problem, or a genuine
limitation of 3-level override nesting in this npm version — not
determined). Reverted rather than left half-working. A top-level
`"brace-expansion": "..."` override was **not** tried because it would be a
blanket override across all four resolved instances, and three of those
already need *different* major versions (1.x/2.x/5.x) for their respective
consumers — a single pinned version would likely break at least one of them.

## What actually needs `workflow`-scope GitHub access

Neither option below is achievable from a session whose GitHub token lacks
the `workflow` OAuth scope (confirmed: both a direct `git push` and the
GitHub API's `create_or_update_file`/`push_files` on `.github/workflows/*`
are rejected — see PR #704's history for the earlier confirmation of this on
an unrelated CI-duplication fix).

1. **Once `next` ships a real fix**: bump the `next` override in
   `package.json`, verify `postcss`/`sharp` resolve as a side effect, and
   merge.
2. **Until then, to unblock merges generally**: add an explicit advisory
   exemption/allowlist to whatever step runs `npm audit --audit-level=moderate`
   in `.github/workflows/ci.yml` (or wherever the `npm audit (moderate+)`
   check is defined) for the specific unfixable GHSA IDs tied to `next`. Do
   **not** blanket-disable the check; scope the exemption to the specific
   advisory IDs that are genuinely unfixable, with a comment linking back to
   this file, and remove the exemption once `next` ships a fix.

## Reproduce / verify

```bash
npm audit --audit-level=moderate --package-lock-only    # current state, no install needed
npm view next versions --json | tail -20                 # check if a stable next fix has shipped
git diff --stat package-lock.json                        # ALWAYS check this after any fix attempt
```
