---
name: opsly-self-healing
description: >
  Opsly Self-Healing Skill
status: draft
owner: operations
last_review: 2026-05-24
type: package-doc
tags:
  - opsly/package
---

# Opsly Self-Healing Skill

> **Triggers:** `self-healing`, `auto-repair`, `healing`, `alerts`, `discord alerts`, `url failed`, `container down`, `domain mismatch`, `traefik 404`, `middleware`, `wildcard dns`
> **Priority:** HIGH
> **Skills relacionados:** `opsly-infra`, `opsly-discord`, `opsly-tenant`

## Cuándo usar

Cuando hay alerts de Discord por URLs caídas, contenedores unhealthy, o cualquier problema de infraestructura que deba diagnosticarse y repararse automáticamente.

## Script principal

```bash
# Check (solo detectar problemas)
python3 scripts/super_orchestrator/self_healing.py check

# Check + reparar
python3 scripts/super_orchestrator/self_healing.py repair

# Check + notificar Discord
python3 scripts/super_orchestrator/self_healing.py check --notify

# Con dominio personalizado
python3 scripts/super_orchestrator/self_healing.py check --domain op-sly.com
```

## Patrones de detección

### 1. Domain Mismatch

Los compose files de tenants deben usar `op-sly.com` en:
- `N8N_HOST`
- `WEBHOOK_URL`
- Labels de Traefik (`Host(...)`)

El agente busca cualquier dominio diferente al esperado en URLs dentro de los compose files y los reemplaza.

**Causa común:** Template antiguo (`docker-compose.tenant.tpl`) tenía `opsly.io` hardcodeado.

### 2. DNS Resolution

Verifica que `n8n-{slug}.{domain}` y `uptime-{slug}.{domain}` resuelvan a una IP mediante `dig @1.1.1.1`.

**Causa común:** Falta el registro wildcard `*.{domain}` → `PLATFORM_VPS_PUBLIC_IP` (Doppler, no commitear el valor) en Cloudflare (DNS-only, proxied=false para evitar issues IPv6).

**Fix automático:** Usa `CF_DNS_API_TOKEN` de Doppler para crear el registro A wildcard vía API de Cloudflare.

### 3. Container Health

Verifica que contenedores `n8n_{slug}` y `uptime_{slug}` estén corriendo via `docker ps`.

**Fix automático:** Ejecuta `docker compose -f docker-compose.{slug}.yml up -d`.

### 4. Traefik Middleware (crítico)

Detecta `stsForceHTTPS` en `infra/traefik/dynamic/middlewares.yml` — campo obsoleto de Traefik v2 que causa que **todo** el file provider falle.

**Síntoma:** Todos los endpoints devuelven 404 aunque los contenedores estén healthy. Traefik loggea `"middleware \"rate-limit@file\" does not exist"`.

**Fix:** Reemplazar `stsForceHTTPS` → `forceSTSHeader` + reiniciar Traefik.

### 5. Wildcard DNS

Verifica que `*.{domain}` exista como registro A en Cloudflare.

**Fix:** Crea registro A `*.{domain}` → `PLATFORM_VPS_PUBLIC_IP` (Doppler, no commitear el valor) con `proxied=false` vía API de Cloudflare.

## Arquitectura

```
scripts/super_orchestrator/self_healing.py
├── SelfHealingAgent
│   ├── detect_domain_mismatch()   → issues auto_repairable=True
│   ├── detect_dns_resolution()    → issues auto_repairable=False (manual)
│   ├── detect_container_health()  → issues auto_repairable=True
│   ├── detect_traefik_middleware() → issues auto_repairable=True
│   └── detect_wildcard_dns()      → issues auto_repairable=True
├── repair_domain_mismatch()       → reescribe compose + recreate containers
├── repair_traefik_middleware()    → fix stsForceHTTPS + restart Traefik
├── repair_wildcard_dns()          → crea registro A en Cloudflare vía API
└── repair_container()             → docker compose up -d
```

Integrado al CLI del super orchestrator via `cli.py` comando `self-healing`.

## Cooldown

El agente tiene cooldown de 60 minutos por componente reparado (configurable via `repair_cooldown_minutes`) para evitar loops de reparación. Se guarda en `~/.opsly/self_healing_cooldown.json`.

## Límites

- `max_repairs_per_cycle`: 3 reparaciones por ciclo (default)
- DNS issues sin wildcard: solo se reportan, no se reparan automáticamente

## Errores comunes

| Error | Causa | Solución |
|-------|-------|----------|
| `middleware "rate-limit@file" does not exist` | stsForceHTTPS rompe file provider | Ejecutar self-healing o fix manual: `s/stsForceHTTPS/forceSTSHeader/g` + restart Traefik |
| URL failed to redirect | Wildcard DNS no existe | Crear `*.{domain}` A → `PLATFORM_VPS_PUBLIC_IP` (Doppler, no commitear el valor) en Cloudflare |
| Contenedor en loop | Docker no pudo recrear | Verificar compose syntax, disk space, puertos |
| 404 en todos los tenants | Traefik no puede rutear (middlewares rotos) | Revisar logs de Traefik: `docker logs traefik \| grep "middleware"` |
| n8n-*.op-sly.com: 000 | DNS devuelve IPv6 pero VPS no tiene IPv6 global | Asegurar wildcard en DNS-only (proxied=false) o forzar IPv4 |

---

## Enlaces relacionados

- [[packages/skills/README|skills]]
- [[README|Inicio]]
