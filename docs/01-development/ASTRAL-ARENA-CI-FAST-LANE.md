# Astral Arena CI fast lane

## Goal

Keep the monorepo PR as the integration gate while allowing fast game iteration and
staging deploys without enqueueing the full Opsly validation suite for every scene/UI edit.

## Lanes

### Integration lane

Branch: `feat/astral-arena-universe`  
PR: #1300

Runs canonical integration checks when shared contracts/configuration change.

### Preview lane

Branch: `preview/astral-arena`

Pushes that affect Astral Arena trigger only the dedicated Web Preview workflow and
deploy to the isolated staging route:

`https://peskids-staging.op-sly.com/astral-arena/`

The Web Preview workflow uses `cancel-in-progress`, so only the newest preview push
should consume build/deploy capacity.

## Game-only optimization

Generic monorepo workflows ignore PR changes when **all** changed paths are under:

`apps/game-astral-arena/**`

Astral-specific validation remains mandatory for those changes.

If a change touches `lib/game-core`, `lib/universe`, shared config, scripts, or
other monorepo owners, the full integration lane still runs.

## Runner pools

Current:
- GitHub-hosted: validation + Web build + image publication.
- VPS: deployment target only.
- PC gamer: governed compute path, not yet registered as a GitHub Actions runner.

Target:
- GitHub-hosted fast pool: contracts, lint, lightweight security.
- self-hosted `astral-build`: Godot import/export and Windows builds.
- self-hosted `astral-media`: Content OS rendering/transcoding.

Do not register one self-hosted runner process and expect parallel jobs. Each GitHub
Actions runner process executes one job at a time. To consume two jobs in parallel,
run two isolated runner instances with separate work directories and bounded resources.
