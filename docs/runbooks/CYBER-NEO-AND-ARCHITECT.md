# Cyber Neo and The Architect

Status: installed locally on 2026-05-21.

Sources:

- `vendor/cyber-neo` from https://github.com/Hainrixz/cyber-neo
- `vendor/the-architect` from https://github.com/Hainrixz/the-architect

Both projects are MIT licensed.

## Installed Surfaces

| Tool | Path | Purpose |
| --- | --- | --- |
| Codex project skill | `.agents/skills/cyber-neo` | Read-only security analysis patterns and helper scripts |
| Codex project skill | `.agents/skills/the-architect` | Blueprint generation workflow adapted for Opsly |
| Claude Code skill | `~/.claude/skills/cyber-neo` | `/cyber-neo` style security analysis |
| Claude Code agent | `~/.claude/agents/the-architect` | Blueprint/meta-architecture agent |
| Vendor source | `vendor/cyber-neo`, `vendor/the-architect` | Pinned local source copy |

## Safe Usage

Cyber Neo must be used read-only:

```bash
python3 .agents/skills/cyber-neo/scripts/scan_secrets.py . --summary
python3 .agents/skills/cyber-neo/scripts/check_lockfiles.py .
```

Do not paste raw secret-scan output into chat or docs. Summarize counts and file paths only when needed.

The Architect should write Opsly blueprints under:

- `docs/blueprints/`
- `docs/tenants/<slug>/`

For tenant apps, prefer the Opsly production path:

- VPS Docker
- Traefik on `op-sly.com`
- Supabase platform schema
- n8n and Uptime Kuma per tenant
- no Vercel dependency unless explicitly requested

## First Recommended Uses

- Peskids production hardening blueprint.
- Opsly tenant app template blueprint.
- Security review of tenant public forms and API proxy routes.
