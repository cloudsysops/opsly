# Guardrails para agentes (Cursor, Copilot, Claude, automatismos)

> Políticas **obligatorias** además de `AGENTS.md`, `.cursor/rules/opsly.mdc` y [AGENTS-GUIDE.md](AGENTS-GUIDE.md).  
> Objetivo: que ningún agente toque **producción, secretos o contratos** sin trazabilidad humana.

## 1. Zona roja — no modificar sin aprobación explícita del responsable

| Área | Por qué |
|------|---------|
| `supabase/migrations/*.sql` en **prod** (o push sin `--dry-run` revisado) | Datos y RLS de todos los tenants; errores son irreversibles sin restore. |
| `.github/workflows/*` que despliegan o mutan secretos | Un cambio malicioso o erróneo despliega a VPS o expone tokens. |
| `infra/docker-compose.platform.yml`, `infra/traefik/*`, reglas TLS/ACME | Un error deja la plataforma o tenants fuera de servicio. |
| `config/root-whitelist.json` (ampliar sin consenso) | Debilita el gate de CI que evita basura en raíz. |
| `doppler secrets set`, rotación de tokens, subida de `.env` a Doppler | Riesgo de fuga, sobrescritura de `prd`, o valores truncados en la nube. |
| `docs/ACTIVE-PROMPT.md` en VPS si **no** confías en quien puede editarlo | `cursor-prompt-monitor` ejecuta líneas no comentadas = **RCE** (ver `AGENTS.md`). |
| Billing real: Stripe **live**, precios, webhooks de cobro | Impacto legal y financiero directo. |
| IPs públicas, SSH a VPS, UFW, Cloudflare DNS **en producción** | Superficie de ataque; la política Opsly es Tailscale para admin. |

**Regla:** si la tarea cae en esta tabla → el agente **documenta el plan** y **para** hasta confirmación humana (o PR con review de owner/CODEOWNERS).

## 2. Zona ámbar — solo con PR pequeño + checklist

| Área | Condición |
|------|-----------|
| Nuevas rutas bajo `apps/api/app/api/portal/**` | Zero-Trust: `resolveTrustedPortalSession` / `tenantSlugMatchesSession`; tests; actualizar `docs/openapi-opsly-api.yaml` si aplica subset CI. |
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

## 5. Herramientas de cumplimiento (usar antes de merge)

```bash
npm run type-check
npm run validate-structure
npm run validate-openapi   # si API / contrato portal
npm run validate-skills    # si skills/
```

En CI: `validate-structure-strict` con `CI=true` valida raíz contra whitelist.

## 6. Relación con otras reglas

| Documento | Rol |
|-----------|-----|
| [AGENTS.md](../../AGENTS.md) | Estado operativo y bloqueantes |
| [AGENTS-GUIDE.md](AGENTS-GUIDE.md) | Multi-agente en paralelo, límites por plan |
| [.cursor/rules/opsly.mdc](../../.cursor/rules/opsly.mdc) | Reglas Cursor (always apply) |
| [.github/copilot-instructions.md](../../.github/copilot-instructions.md) | Copilot / patrones código |
| [REPO-MAP.md](../REPO-MAP.md) | Dónde editar; whitelist |

---

**Última revisión:** 2026-04-30 — añadir filas a zonas roja/ámbar cuando aparezca un incidente o nueva superficie (billing, nuevo proveedor, etc.).
