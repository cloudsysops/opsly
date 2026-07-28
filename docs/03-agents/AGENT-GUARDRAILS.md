---
status: draft
owner: operations
last_review: 2026-05-24
type: agent-doc
tags:
  - opsly/agents
---

# Guardrails para agentes (Cursor, Copilot, Claude, automatismos)

> Políticas **obligatorias** además de `AGENTS.md`, `.cursor/rules/opsly.mdc` y [AGENTS-GUIDE.md](AGENTS-GUIDE.md).  
> Objetivo: que ningún agente toque **producción, secretos o contratos** sin trazabilidad humana.

## 1. Zona roja — no modificar sin aprobación explícita del responsable

| Área | Por qué |
|------|---------|
| `supabase/migrations/*.sql` en **prod** (o push sin `--dry-run` revisado) | Datos y RLS de todos los tenants; errores son irreversibles sin restore. |
| `.github/workflows/*` que despliegan o mutan secretos | Un cambio malicioso o erróneo despliega a VPS o expone tokens. |
| `infra/docker-compose.platform.yml`, `infra/traefik/*`, reglas TLS/ACME | Un error deja la plataforma o tenants fuera de servicio. |
| `config/root-whitelist.json` (ampliar sin consenso) | Debilita el gate de CI que evita basura en raíz del **repo**. |
| `config/docs-root-allowlist.json` (ampliar sin consenso) | La raíz de `docs/` debe quedarse en **tres** hubs; ampliar sin revisión rompe Obsidian/validación. |
| `doppler secrets set`, rotación de tokens, subida de `.env` a Doppler | Riesgo de fuga, sobrescritura de `prd`, o valores truncados en la nube. |
| `docs/ACTIVE-PROMPT.md` en VPS si **no** confías en quien puede editarlo | `cursor-prompt-monitor` ejecuta líneas no comentadas = **RCE** (ver `AGENTS.md`). |
| Billing real: Stripe **live**, precios, webhooks de cobro | Impacto legal y financiero directo. |
| IPs públicas, SSH a VPS, UFW, Cloudflare DNS **en producción** | Superficie de ataque; la política Opsly es Tailscale para admin. |
| **Reactivar GoHighLevel** (`PESKIDS_GHL_ENABLED=true`, nuevos flujos GHL, sync GHL como CRM) | Peskids usa **Twenty** como CRM canónico; GHL es legacy contenido (410). Un agente no debe reabrir SaaS de pago ni dual-write. |
| **Refactor de arquitectura productiva Peskids** (leads→CRM, auth admin, Traefik `www.peskids.com`, compose/deploy del contenedor live, cutover WhatsApp) | Tenant en operación diaria; cambios solo con aprobación explícita + ventana nocturna. Ver `.cursor/rules/peskids-twenty-freeze.mdc`. |

**Regla:** si la tarea cae en esta tabla → el agente **documenta el plan** y **para** hasta confirmación humana (o PR con review de owner/CODEOWNERS).

### 1.1 Peskids + CRM — verdad operativa

| Capacidad | Fuente de verdad | Prohibido para agentes |
|-----------|------------------|------------------------|
| CRM comercial | **Twenty** (`lib/services/twenty`, sync best-effort) | GHL como producto, fallback o “sidecar prod” |
| Registro operativo leads | Supabase (`platform.peskids_leads` / flujos Peskids actuales) | Sustituir SoT sin ADR + humano |
| GHL rutas legacy | Disabled / **HTTP 410** si flag off | Ampliar superficie GHL; default `true` |
| WhatsApp Meta/WACRM | Flags **OFF** hasta go/no-go humano | Activar outbound o cutover del número principal |

Gate CI: `npm run guard:ghl-runtime` (+ `npm run guard:ghl-runtime:test`).

## 2. Zona ámbar — solo con PR pequeño + checklist

| Área | Condición |
|------|-----------|
| Nuevas rutas bajo `apps/api/app/api/portal/**` | Zero-Trust: `resolveTrustedPortalSession` / `tenantSlugMatchesSession`; tests; actualizar `docs/00-architecture/openapi-opsly-api.yaml` si aplica subset CI. |
| `apps/mcp` tools que llaman API o ejecutan efectos | No nuevos vectores de exfiltración; autenticación alineada a ADR-009. |
| `apps/orchestrator` colas, prioridades, workers | Sin breaking de payloads; `JOB_VALIDATION` / idempotencia; Vitest. |
| Scripts bajo `scripts/` que hacen `ssh`, `docker`, `curl` a prod | `set -euo pipefail`, `--dry-run` por defecto donde tenga sentido; no imprimir secretos. |

## 3. Secretos y datos sensibles (siempre)

- **No** pegar API keys, JWT, passwords, webhooks completos en código, docs, commits ni prompts de chat.
- **No** `doppler secrets get … --plain` en logs compartidos.
- Valores de ejemplo: placeholders tipo `re_xxx…` / `eyJ…` **cortados** o `***` en documentación.
- Credenciales solo **Doppler** (`ops-intcloudsysops/prd`); el agente no “inventa” vars nuevas sin runbook.

## 4. Git y ramas

- **No** `git push origin main` automático desde el agente si la política del equipo es PR + review (ajustar `opsly.mdc` localmente si aplica).
- **No** `--force` a `main` / borrar historia sin humano.
- Preferir **rama + PR** para cambios que toquen zona roja/ámbar.
- **Ventana nocturna (Peskids live):** merge/deploy de impacto en producción solo `America/Bogota` **22:00–06:00**. De día: docs OK; runtime/infra solo con label `safe-daytime` o `hotfix-prod`. Ver [PRODUCTION-CHANGE-WINDOW.md](../runbooks/PRODUCTION-CHANGE-WINDOW.md) y check CI `production-change-window`.

## 5. Herramientas de cumplimiento (usar antes de merge)

```bash
npm run type-check
npm run validate-structure
npm run validate-openapi   # si API / contrato portal
npm run validate-skills    # si skills/
```

En CI: `validate-structure` valida la raíz completa contra `config/root-whitelist.json` (archivos, carpetas, symlinks documentados). Entradas gitignored no cuentan.

**Contaminación en raíz (staged):** el pre-commit bloquea `git add` de `*.py`, imágenes, `dump.rdb`, `.env*` (salvo allowlisted), y `*.json` no allowlisted en raíz. Mover a `runtime/tmp/`, `scripts/`, o carpeta dueña.

**No ampliar whitelist para pasar CI:** documentar en `docs/reports/REPOSITORY-AUDIT-*.md` sección REVIEW y escalar a humano.

## 6. Relación con otras reglas

| Documento | Rol |
|-----------|-----|
| [AGENTS.md](../../AGENTS.md) | Estado operativo y bloqueantes |
| [AGENTS-GUIDE.md](AGENTS-GUIDE.md) | Multi-agente en paralelo, límites por plan |
| [.cursor/rules/opsly.mdc](../../.cursor/rules/opsly.mdc) | Reglas Cursor (always apply) |
| [.cursor/rules/peskids-twenty-freeze.mdc](../../.cursor/rules/peskids-twenty-freeze.mdc) | Peskids live + Twenty-only; GHL no producto |
| [.github/copilot-instructions.md](../../.github/copilot-instructions.md) | Copilot / patrones código |
| [REPO-MAP.md](../REPO-MAP.md) | Dónde editar; whitelist |

---

**Última revisión:** 2026-07-28 — Twenty-only CRM + freeze arquitectura Peskids prod; 2026-07-27 — ventana nocturna; 2026-05-10 — política raíz `docs/` + allowlist.

---

## Enlaces relacionados

- [[03-agents/README|03-agents]]
- [[brain/README|Brain Central]]
