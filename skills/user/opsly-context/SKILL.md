# Opsly Context Skill

## Cuándo usar

**SIEMPRE** al inicio de cualquier sesión con Opsly, antes de escribir código, scripts, docs o ejecutar cambios en infra.

## Objetivo

Cargar el contexto operativo real de la sesión, detectar gaps antes de actuar y frenar cualquier ejecución adicional hasta que el responsable confirme el reporte inicial.

## Protocolo obligatorio de arranque

```bash
# 1. Fuentes de verdad mínimas (desde la raíz del repo)
cat AGENTS.md
cat VISION.md

# 2. Consulta NotebookLM (fuente de verdad universal para agentes IA)
# Si NOTEBOOKLM_ENABLED=true en el entorno:
if [ "${NOTEBOOKLM_ENABLED:-false}" = "true" ]; then
  node scripts/query-notebooklm.mjs "Resume en 5 bullets: 1) Qué se decidió hoy, 2) Qué está bloqueado, 3) Qué es prioritario, 4) Qué optimizar, 5) Qué NO hacer. Basado en AGENTS.md, ROADMAP.md y docs/adr/"
fi

# 3. Estado VPS — acceso SOLO por Tailscale (nunca IP pública 157.245.223.7)
ssh vps-dragon@100.120.151.91 \
  "systemctl is-active cursor-prompt-monitor opsly-watcher && \
   docker ps --format '{{.Names}}\t{{.Status}}' | grep -E 'n8n|uptime|infra|traefik'"

# 3. Variables críticas Doppler (solo longitudes; si GITHUB_TOKEN está vacío, revisar legado)
for VAR in DISCORD_WEBHOOK_URL RESEND_API_KEY GITHUB_TOKEN GOOGLE_DRIVE_TOKEN; do
  VAL=$(doppler secrets get "$VAR" --project ops-intcloudsysops --config prd --plain 2>/dev/null || echo "")
  if [[ "$VAR" == "GITHUB_TOKEN" && -z "$VAL" ]]; then
    LEGACY=$(doppler secrets get GITHUB_TOKEN_N8N --project ops-intcloudsysops --config prd --plain 2>/dev/null || echo "")
    echo "$VAR: ${#VAL} chars | GITHUB_TOKEN_N8N: ${#LEGACY} chars"
  else
    echo "$VAR: ${#VAL} chars"
  fi
done
```

## Antes de seguir

1. **Reporta gaps**: servicios caídos, SSH por ruta incorrecta, vars vacías o cualquier desalineación visible contra `AGENTS.md`.
2. **No ejecutes nada más** hasta que el responsable confirme el reporte inicial.
3. Si `GITHUB_TOKEN` está vacío, consulta `docs/GITHUB-TOKEN.md`.
4. Si `GOOGLE_DRIVE_TOKEN` está vacío, contrástalo con `AGENTS.md`: puede ser una variable legacy si el flujo actual usa `GOOGLE_SERVICE_ACCOUNT_JSON`.

## Contexto adicional a cargar tras la confirmación

```bash
# Estado de sprint / capa IA
cat ROADMAP.md
cat docs/IMPLEMENTATION-IA-LAYER.md

# Arquitectura OpenClaw / operación multi-agente
cat docs/OPENCLAW-ARCHITECTURE.md

# Contexto git
git log --oneline -5
git status --short
```

## Decisiones fijas (NUNCA proponer alternativas)

- Orquestación: docker-compose por tenant
- DB plataforma: Supabase schema `platform`
- Proxy: Traefik v3
- Secrets: Doppler `ops-intcloudsysops` / `prd`
- SSH admin: solo Tailscale `100.120.151.91`
- TypeScript: sin `any`
- Scripts: `set -euo pipefail`, idempotentes, `--dry-run` cuando aplique
- No proponer Kubernetes, Swarm ni nginx sin ADR nuevo explícito

## Stack

Next.js 15 · TypeScript · Tailwind · Supabase · Stripe · Docker Compose · Traefik v3 · Redis/BullMQ · Doppler · Resend · Discord · MCP · LLM Gateway · Context Builder · Hermes

## Repos y paths

- GitHub: `cloudsysops/opsly`
- VPS: `/opt/opsly`
- SSH: `vps-dragon@100.120.151.91` (Tailscale)
- IP pública VPS: `157.245.223.7` (solo edge HTTP/HTTPS)
- Doppler: `ops-intcloudsysops` / `prd`
