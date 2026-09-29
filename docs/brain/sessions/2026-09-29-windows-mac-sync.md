# Session 2026-09-29 ? Windows smdqcia-pc + Mac opsly-quantum sync

## Outcome
- Tailscale SSH Windows?Mac working (`dragon` + existing WSL key identity)
- Repo `cboteros/opsly-bootstrap` for machine bootstrap docs
- Twitch/OBS secrets moved to Doppler (`ops-intcloudsysops` / `dev_twitch` + `dev_content_studio`)
- Mac OBS: WebSocket :4455, scene OpslyLive, Twitch service preset (stream key via Doppler/UI)
- Opsly runtime already active on both machines (workers, bridges, AI-DJ launchd)

## Do not store
- SSH private keys, Doppler tokens, Twitch/OBS passwords in this vault

## Commands
- Mac OBS status: `ssh opsly-quantum '~/bin/opsly-obs-status.sh'`
- Twitch secrets run: `./scripts/secrets/run-twitch-with-doppler.sh -- <cmd>`
- Brain index: `npm run obsidian:file-index`

tags: [opsly, sync, streaming, doppler, session]
