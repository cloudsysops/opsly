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


## Current result

The workflow cleanup reduced the observed backlog from roughly **229 queued runs**
to the low tens during the 2026-09-12 session.

Key mechanisms now in place:

- `cancel-in-progress` for PR-scoped workflows;
- `PR Run Janitor` for obsolete runs;
- no duplicate feature-branch `push + pull_request` CI where unnecessary;
- game-only fast lane;
- preview branch;
- Mac self-hosted lane prepared.

## Astral build lanes

```
feat/astral-arena-universe
        │
        └─ integration PR / shared contracts

preview/astral-arena
        │
        ├─ Web Preview
        ├─ Windows Artifact
        ├─ Mac Runner Smoke
        └─ Mac Web Build
```

Use the preview branch for rapid game artifact iteration. Do not use it as the
canonical merge target.

## Proven artifacts

- Web staging pipeline: successful run `34724858943`.
- Windows x64 artifact: successful run `34725562503`.

The next capacity improvement is not more YAML; it is registering trusted self-hosted
runners so Godot jobs do not compete with the monorepo GitHub-hosted queue.
