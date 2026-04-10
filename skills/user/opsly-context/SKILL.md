# Opsly Context Skill

## Cuándo usar

**SIEMPRE** al inicio de cualquier sesión con Opsly, antes de escribir código, scripts o docs.

## Protocolo obligatorio

```bash
# 1. Fuentes de verdad (desde la raíz del repo)
cat AGENTS.md
cat VISION.md
cat docs/OPENCLAW-ARCHITECTURE.md

# 2. Estado VPS — acceso SOLO por Tailscale (nunca IP pública 157.245.223.7)
ssh vps-dragon@100.120.151.91 "
  systemctl is-active cursor-prompt-monitor opsly-watcher 2>/dev/null || true
  docker ps --format 'table {{.Names}}\t{{.Status}}' \
    | grep -E 'n8n|uptime|infra|traefik|mcp|gateway' || true
"

# 3. Tokens en Doppler (longitudes, sin volcar valores)
./scripts/check-tokens.sh

# 4. Últimos commits
git log --oneline -5
```

## Decisiones fijas (NUNCA proponer alternativas)

- Orquestación: docker-compose por tenant
- DB plataforma: Supabase schema `platform`
- Proxy: Traefik v3
- Secrets: Doppler `ops-intcloudsysops` / `prd`
- TypeScript: sin `any`
- Scripts: `set -euo pipefail`, idempotentes, `--dry-run` cuando aplique

## Stack

Next.js 15 · TypeScript · Tailwind · Supabase · Stripe · Docker Compose · Traefik v3 · Redis/BullMQ · Doppler · Resend · Discord · MCP · LLM Gateway

## Repos y paths

- GitHub: `cloudsysops/opsly`
- VPS: `/opt/opsly` · SSH `vps-dragon@100.120.151.91` (Tailscale · IP pública `157.245.223.7` solo para tráfico HTTP/HTTPS)
- Doppler: `ops-intcloudsysops` / `prd`
