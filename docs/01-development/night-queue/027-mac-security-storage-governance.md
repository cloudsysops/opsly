---
id: mac-security-storage-governance-027
status: pending
owner: operations
created: 2026-09-11
requires_pr: true
risk: medium
autonomy: supervised
---

# Mac security, storage, organization and administration

## Goal

Turn the primary Mac engineering node into a predictable, low-risk Opsly workstation without making it a production control plane.

## Phase A — read-only evidence

Run:
```bash
cd /path/to/opsly
bash scripts/ops/mac-security-storage-audit.sh | tee /tmp/opsly-mac-audit.txt
```

Collect only non-secret evidence:
- disk usage;
- repo/node_modules/build caches;
- Docker/Colima disk usage;
- Ollama model inventory;
- Opsly LaunchAgents;
- listening TCP ports;
- FileVault;
- macOS firewall + stealth mode;
- automatic update schedule;
- Remote Login state;
- SSH file permissions;
- agent CLI presence;
- env secret presence only, never values;
- git branch/status;
- oversized repo files;
- Opsly log footprint.

## Phase B — classify

For every finding classify:
- KEEP_LOCAL
- MOVE_TO_GOOGLE_DRIVE
- REGENERABLE_CACHE
- SAFE_DELETE_WITH_APPROVAL
- SECURITY_FIX
- DO_NOT_TOUCH

## Security targets

- FileVault enabled.
- Firewall enabled; stealth mode preferred where compatible.
- Agent bridges bound to localhost/Tailscale only.
- Redis never public.
- No long-lived production admin token in shell profile or repo.
- Doppler remains secret source.
- Per-node credentials replace shared automated admin token when task 024 lands.
- SSH private keys mode 600, config mode 600.
- Remote Login only if operationally required; prefer Tailscale-restricted access.
- LaunchAgents use canonical installer/template paths instead of brittle personal absolute paths.
- Builder agents cannot auto-merge/deploy.

## Storage targets

Keep local:
- active repo/worktrees;
- current build cache within budget;
- active agent CLIs;
- recent working assets.

Move/archive:
- source images;
- completed renders/video;
- old exports;
- large historical artifacts;
- backups.

Canonical archive: Google Drive / Opsly.

Do not move to Drive as plain files:
- raw secrets;
- recovery codes;
- production credential exports;
- live database volumes.

## Automation target

After evidence, implement only approved safe automation:
- warning thresholds at 75/85/92%;
- log retention;
- cache cleanup allowlist;
- completed content asset archive;
- Docker image cleanup that cannot remove named data volumes;
- no automatic deletion of unknown user files.

## Current repo finding

`infra/launchd/com.opsly.local-agents-worker.plist` currently contains an absolute user checkout path under `/Users/dragon/...`.
Replace via installer/template or generated plist so workstation path is not hardcoded in the repository.

Do not change runtime until the Mac evidence confirms the active installed plist and path.

## Forbidden

- print/copy secret values;
- delete user Documents/Desktop/Downloads automatically;
- prune Docker volumes automatically;
- remove Ollama models without an explicit keep-list;
- modify production;
- disable OS security controls;
- expose agent ports publicly.

## Deliverable

```
MAC_NODE_AUDIT
DISK_TOTAL:
DISK_FREE:
LARGEST_SAFE_CANDIDATES:
DOCKER_USAGE:
OLLAMA_MODELS:
LAUNCHAGENTS:
FILEVAULT:
FIREWALL:
STEALTH_MODE:
REMOTE_LOGIN:
LISTENING_AGENT_PORTS:
SSH_PERMISSIONS:
SECRET_POSTURE:
GOOGLE_DRIVE_ARCHIVE_PLAN:
SECURITY_FIXES:
SAFE_CLEANUP_PLAN:
BLOCKERS:
```
