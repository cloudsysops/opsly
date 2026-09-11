---
status: active
owner: operations
last_review: 2026-09-11
type: design
tags:
  - opsly/design
  - opsly/content
  - opsly/revenue
  - opsly/autonomy
---

# Blueprint — Autonomous income services (Opsly + Mauro)

**Goal:** generar ingresos con servicios repetibles (contenido gaming + control plane Opsly) **sin** romper Peskids y **sin** segundo orchestrator.

## Principio

| Capa | Quién | Regla |
|------|-------|-------|
| Decide / cobra / guarda | VPS + Supabase + Moon (admin) | Siempre ON |
| Ejecuta GPU / render / LLM barato | PC-gamer (efímero) | Best-effort; si se apaga, jobs quedan `QUEUED` |
| Aprueba publish | Humano (Cristian) en Moon | **Nunca** `OPSLY_CONTENT_AUTO_PUBLISH=true` por defecto |

## Cadena de valor (ya en código)

```text
clip / fixture
  → gameplay watcher / prepareGameplaySession
  → highlights + score + render
  → independent AI review (#1160)
  → REQUEST_CHANGES → repair → v2 → AI_APPROVED
  → ready_for_human_approval
  → Moon /moon/creator?tab=approvals
  → Approve & Schedule → publishJobs queued (YT/TikTok/IG/FB/X)
  → upload real solo con autorización explícita
```

Canal: `icso-gaming-tbd`. Publishing boundary: packages + jobs `queued`, **sin** URL pública hasta adapter autorizado.

## Autonomía Mac (cuando el humano no está)

1. **`com.opsly.pcgamerwatch`** (cada 120s)  
   Tailscale `pc-gamer` online + worker no sano → `pc-gamer-reconnect.sh` (`PC_GAMER_BRANCH=main`) → Docker/Ollama/OpenCode + heartbeat → Discord.

2. **`com.opsly.pc-gamer-autodispatch`** (cada 5 min, Doppler)  
   Si online + schedule permite → backlog overnight OpenCode.

3. **Content Studio 24×7** (LaunchAgent existente)  
   Solo draft/queue local; no publish.

## Servicios vendibles (orden de go-live)

| # | Servicio | Precio orientativo | Dependencias | Estado |
|---|----------|--------------------|--------------|--------|
| 1 | **Gameplay clip pack** (Mauro / ICSO Gaming) | pack semanal | gamer online + Moon approval | Path E2E proven en lib; UI Moon requiere admin con tip `main` |
| 2 | **Opsly tenant starter** (n8n + uptime + portal) | plan Startup | onboard-tenant + Resend | Live para Peskids / LocalRank |
| 3 | **Content review as a service** (AI gate + human) | add-on | #1161 Hermes→gamer + Gateway | Código restackeado; merge pendiente |
| 4 | **Overnight agent hours** (OpenCode on gamer) | hourly GPU | autodispatch + allowlist | Infra lista; no facturar hasta metering Hermes estable |

## Bloqueantes operativos (honestos)

- PC-gamer **offline** → no GPU; watcher espera (no inventar online).
- Admin Moon en prod puede ir **detrás** de `main` hasta redeploy nocturno.
- `#1161` debe ir **solo** con delta Hermes/router (sin re-meter #1160).
- Peskids: ventana noche + no flags n8n extra; CRM Twenty ya mitigado OOM.

## Criterio “servicio listo para vender”

- [ ] Watcher Mac en verde (exit ≠ 127; log SUCCESS al menos 1× tras online)
- [ ] `check-pc-gamer-online.sh --json` → `"online":true`
- [ ] 1 clip Mauro en Moon con preview + score + Approve & Schedule
- [ ] 5 `publishJobs` `queued` sin upload externo
- [ ] Discord notifica ONLINE / FAIL sin intervención

## Relacionado

- [`docs/04-infrastructure/PC-GAMER-WORKER.md`](../04-infrastructure/PC-GAMER-WORKER.md)
- [`docs/runbooks/PC-GAMER-AUTO-RECONNECT.md`](../runbooks/PC-GAMER-AUTO-RECONNECT.md)
- [`docs/reports/CONTENT-INDEPENDENT-AI-REVIEW-2026-09-09.md`](../reports/CONTENT-INDEPENDENT-AI-REVIEW-2026-09-09.md)
- [`docs/runbooks/PC-GAMER-OVERNIGHT-AUTODISPATCH.md`](../runbooks/PC-GAMER-OVERNIGHT-AUTODISPATCH.md)
