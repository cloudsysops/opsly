---
title: Content Studio + Twitch secrets (Doppler)
owner: operations
---

# Content Studio + Twitch secrets

## Problem we fix

`runtime/twitch.env` held Twitch OAuth secrets in **plaintext** and was **not gitignored** (untracked but easy to commit by mistake). Worker file `.env.worker` also held `OBS_WEBSOCKET_PASSWORD` / agent tokens in plaintext.

## Canon

| Item | Value |
|------|-------|
| Doppler project | `ops-intcloudsysops` |
| Twitch config | `dev_twitch` |
| Content Studio config | `dev_content_studio` |
| Map file | `config/config/doppler/doppler.setup.yaml` |
| Never commit | `runtime/twitch.env`, `.env.worker`, any `*.pub` private material |

## One-time setup

```bash
# 1) Auth CLI (browser)
doppler login

# 2) Migrate Twitch plaintext -> Doppler (no values printed)
./scripts/secrets/migrate-twitch-env-to-doppler.sh --dry-run
./scripts/secrets/migrate-twitch-env-to-doppler.sh

# 3) Migrate OBS/worker secrets
./scripts/secrets/migrate-obs-worker-to-doppler.sh --dry-run
./scripts/secrets/migrate-obs-worker-to-doppler.sh

# 4) Delete local plaintext after verify
rm -f runtime/twitch.env
# keep .env.worker only if still required for non-Doppler workers; prefer doppler run
```

## Runtime

```bash
./scripts/secrets/run-twitch-with-doppler.sh -- python -m apps.twitch_agent
# or any command that reads TWITCH_* from env
```

## Agent rules

- Never print Twitch/OBS tokens.
- Never put secrets in `config/content-studio/**` JSON.
- Prefer `doppler secrets --only-names` for verification.
- If a plaintext file was shared/copied, rotate Twitch client secret + tokens.

## Related

- `docs/00-architecture/CONTENT-STUDIO-ARCHITECTURE.md`
- `docs/00-architecture/CONTENT-PIPELINE-CANONICAL.md`
- `docs/runbooks/STREAMING-GAMER-DJ-NDI.md`
- `docs/runbooks/KEY-HYGIENE.md`
