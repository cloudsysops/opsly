# MacBook Astral Runner

Purpose: add trusted build capacity without waiting behind GitHub-hosted Opsly jobs.

## Security boundary

`cloudsysops/opsly` is a public repository. The Mac runner must **not** execute
arbitrary pull-request code.

The Mac-specific workflows are intentionally limited to:

- trusted pushes to `preview/astral-arena`;
- explicit `workflow_dispatch`.

Do not add `pull_request` to a self-hosted Mac workflow without a separate security
review and an ephemeral/isolation model.

## Install

Fastest path on the MacBook when GitHub CLI is already authenticated:

```bash
git fetch origin
git checkout feat/astral-arena-universe
chmod +x scripts/ops/bootstrap-mac-astral-runner.sh
./scripts/ops/bootstrap-mac-astral-runner.sh
```

The bootstrap requests the short-lived runner registration token through your local
`gh` authentication, so the token does not need to be copied into chat or committed.

Manual fallback:

```bash
RUNNER_TOKEN='SHORT_LIVED_TOKEN' ./scripts/ops/bootstrap-mac-astral-runner.sh
```

The installer:
- detects Intel vs Apple Silicon;
- downloads the matching official GitHub Actions runner;
- verifies the pinned SHA-256 for v2.337.0;
- registers labels `astral-fast,godot,mac-build`;
- installs/starts the runner service.

## Godot

Install Godot 4.7.2 and export templates before running the Web build. The workflows
accept:
- `godot` in PATH;
- `godot4` in PATH;
- `/Applications/Godot.app/Contents/MacOS/Godot`.

## Workflows

- `Astral Mac Runner Smoke`: proves runner/toolchain health.
- `Astral Mac Web Build`: imports and exports the actual Astral Arena Web build.

This adds one true concurrent job. A second runner process on the same Mac would add
another slot, but start with one to avoid exhausting a 16 GB MacBook during Godot +
Cursor/VS Code use.


## Automatic Godot install

`scripts/ops/install-mac-godot.sh` installs:
- Godot 4.7.2 macOS universal app;
- Godot 4.7.2 export templates.

Both downloads are verified against the official release SHA-256 values.

Default install:
- editor: `~/Applications/Godot.app`;
- templates: `~/Library/Application Support/Godot/export_templates/4.7.2.stable`.

The download for export templates is large (~1.3 GB), so the script skips it when
templates are already present.


## Current status

Repository support is implemented.

As of 2026-09-12, the Mac-specific workflows exist but remain blocked until the
physical MacBook is registered and online with the required labels.

Expected first verification after registration:

1. `Astral Mac Runner Smoke` succeeds;
2. `Astral Mac Web Build` exports the same product as hosted CI;
3. hosted and Mac artifacts can be compared by product contract/checksums.

The Mac runner is an optimization/capacity lane, not a release authority.
