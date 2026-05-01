# Opsly Scripts Guide

This directory contains operational and deployment scripts organized by category.

## Categories

- `scripts/infra/`: VPS bootstrap, networking, hardening, infrastructure health.
- `scripts/deploy/`: platform/tenant rollout and rollback helpers.
- `scripts/tenant/`: tenant lifecycle operations.
- `scripts/ops/`: diagnostics, cleanup, and runtime operations.
- `scripts/utils/`: shared validation and helper entrypoints.
- `scripts/ci/`: CI-oriented validation scripts.

## Quick Start

### Infrastructure Setup

```bash
./scripts/infra/bootstrap-vps.sh
./scripts/vps-secure.sh --help   # alias → scripts/infra/security-hardening.sh (UFW / Tailscale SSH)
```

### Deployment

```bash
./scripts/deploy/build-and-push.sh
./scripts/deploy/rollout-platform.sh
./scripts/deploy/smoke-test.sh
```

### Tenant Lifecycle

```bash
./scripts/tenant/onboard.sh --slug customer-name --email admin@customer.com --plan startup
./scripts/tenant/suspend.sh --slug customer-name
./scripts/tenant/resume.sh --slug customer-name
```

### Operations

```bash
./scripts/ops/monitor-resources.sh
./scripts/ops/cleanup-disk.sh
```

### Utilities

```bash
./scripts/utils/validate.sh
./scripts/utils/git-sync.sh
./scripts/utils/notify-discord.sh "Title" "Message" "success"
./scripts/health-check-autostart.sh
./scripts/generate-daily-report.sh
```

### Python CLI automations

```bash
python3 scripts/opsly_cli.py health --api-url https://api.ops.smiletripcare.com
python3 scripts/opsly_cli.py deploy-last
python3 scripts/opsly_cli.py deploy-status 24970035820
python3 scripts/opsly_cli.py deploy-watch 24970035820
python3 scripts/opsly_cli.py secret-rotation --secrets TAILSCALE_AUTHKEY DOPPLER_TOKEN_PRD DOPPLER_TOKEN_STG
```

## Compatibility

Legacy script paths in `scripts/*.sh` remain available as wrappers and forward to the canonical location.

## Script Standards

All shell scripts should:

- start with `#!/bin/bash` and `set -euo pipefail`
- support `--help`
- support `--dry-run` when state-changing
- keep stderr for errors and stdout for progress

## Environment Conventions

```bash
OPSLY_ROOT=${OPSLY_ROOT:-.}
SSH_HOST=${SSH_HOST:-100.120.151.91}
DRY_RUN=${DRY_RUN:-false}
VERBOSE=${VERBOSE:-false}
```
