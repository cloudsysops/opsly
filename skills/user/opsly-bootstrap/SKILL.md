# Opsly Bootstrap Skill

> **Triggers:** `nueva sesión`, `inicio`, `contexto`, `start`, `sesión`, `autónomo`, `autonomous`, `godmode`
> **Priority:** CRITICAL
> **Skills relacionados:** todos — este skill se ejecuta antes que cualquier otro

## Cuándo usar

**SIEMPRE** al inicio de cualquier sesión con Opsly. Carga el contexto operativo, detecta gaps, y decide qué skills activar según la tarea del usuario.

## Protocolo de arranque

### 1. Cargar fuentes de verdad

```bash
cat AGENTS.md
cat VISION.md
```

### 2. Estado de infraestructura

```bash
# VPS — solo Tailscale, NUNCA IP pública directa
ssh vps-dragon@100.120.151.91 \
  "docker ps --format '{{.Names}}\t{{.Status}}' | grep -E 'n8n|uptime|infra|traefik'"

# Variables críticas Doppler (solo longitudes, nunca valores)
for VAR in DISCORD_WEBHOOK_URL RESEND_API_KEY GITHUB_TOKEN; do
  VAL=$(doppler secrets get "$VAR" --project ops-intcloudsysops --config prd --plain 2>/dev/null || echo "")
  echo "$VAR: ${#VAL} chars"
done
```

### 3. Estado git

```bash
git log --oneline -5
git status --short
```

### 4. Reportar gaps

Si hay servicios caídos, SSH por ruta incorrecta, o vars vacías — **reportar y parar** antes de continuar.

## Auto-activación de skills

Después del bootstrap, analizar la query del usuario y cargar skills relevantes:

| Tipo de tarea  | Keywords                              | Skills a cargar               |
| -------------- | ------------------------------------- | ----------------------------- |
| Ruta API       | ruta, endpoint, handler               | `opsly-api`, `opsly-supabase` |
| Frontend       | componente, página, portal, admin, UI | `opsly-frontend`              |
| Infra/Deploy   | docker, deploy, vps, script, bash     | `opsly-infra`                 |
| LLM/AI         | llm, modelo, cache, provider          | `opsly-llm`                   |
| Onboarding     | tenant, onboard, invitar              | `opsly-tenant`                |
| Orquestación   | n8n, workflow, OAR, orchestrator      | `opsly-orchestrator`          |
| Billing        | stripe, factura, plan, metering       | `opsly-billing`               |
| Testing/QA     | test, smoke, audit, qa                | `opsly-qa`                    |
| Arquitectura   | ADR, decisión, riesgo                 | `opsly-architect`             |
| MCP Tools      | mcp, tool, oauth                      | `opsly-mcp`                   |
| Notificaciones | discord, webhook, alerta              | `opsly-discord`               |
| Crear skill    | skill, automatizar, capturar workflow | `opsly-skill-creator`         |

Si la confianza es baja o no hay match claro, cargar `opsly-api` + `opsly-frontend` como fallback general.

## Decisiones fijas (innegociables)

- Docker Compose por tenant — no K8s/Swarm
- Supabase schema `platform` — no DB externa
- Traefik v3 — no nginx
- Doppler `ops-intcloudsysops/prd` — no .env en producción
- SSH solo Tailscale `100.120.151.91` — no IP pública
- TypeScript sin `any`
- Scripts: `set -euo pipefail`, idempotentes

## Stack

Next.js 15 · React 19 · TypeScript 5.7 · Tailwind 3.4 · Supabase · Stripe · Docker Compose · Traefik v3 · Redis · Doppler · Resend · Discord · MCP · LLM Gateway

## Repos y paths

| Recurso    | Ubicación                               |
| ---------- | --------------------------------------- |
| GitHub     | `cloudsysops/opsly`                     |
| VPS        | `/opt/opsly`                            |
| SSH        | `vps-dragon@100.120.151.91` (Tailscale) |
| IP pública | `157.245.223.7` (solo HTTP/HTTPS edge)  |
| Doppler    | `ops-intcloudsysops` / `prd`            |
| Supabase   | `jkwykpldnitavhmtuzmo`                  |

## Reglas

- Siempre ejecutar bootstrap antes de escribir código o ejecutar cambios.
- No ejecutar nada hasta que el reporte inicial confirme 0 gaps.
- No proponer alternativas a las decisiones fijas sin ADR nuevo.
- Máximo 5 skills por sesión — priorizar por relevancia.

## Errores comunes

| Error                   | Causa                              | Solución                                         |
| ----------------------- | ---------------------------------- | ------------------------------------------------ |
| SSH timeout             | Usó IP pública en vez de Tailscale | Usar `100.120.151.91`                            |
| Doppler fails           | Token sin scope                    | `doppler configure set token --scope /opt/opsly` |
| Skills no cargados      | No ejecutó bootstrap               | Ejecutar este skill primero                      |
| Contexto desactualizado | No leyó AGENTS.md                  | Siempre leer al inicio                           |
