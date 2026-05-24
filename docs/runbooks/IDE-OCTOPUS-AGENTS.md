---
status: draft
owner: agents
last_review: 2026-05-09
---

# IDE Octopus para Agentes

Consola web para operar sesiones terminal por agente/proceso sin exponer los endpoints internos del
orchestrator al navegador.

## Superficies

- Admin: `apps/admin` ruta `/openclaw/ide`.
- Portal: `apps/portal` ruta `/dashboard/[tenant]/agents/ide`.
- API BFF Admin: `/api/admin/agents/*`.
- API BFF Portal: `/api/portal/tenant/[slug]/agents/*` con validación Zero-Trust.
- Orchestrator interno: `/internal/terminal/*` protegido por `PLATFORM_ADMIN_TOKEN`.

## Arranque local

```bash
npm run build --workspace=@intcloudsysops/orchestrator
PLATFORM_ADMIN_TOKEN=dev-token \
OPSLY_ORCHESTRATOR_MODE=worker-enabled \
node apps/orchestrator/dist/index.js
```

Para producción, el browser solo debe hablar con `apps/api`; no publicar `/internal/terminal/*`.

## Variables operativas

- `PLATFORM_ADMIN_TOKEN`: compartido entre API y orchestrator para proxy interno.
- `ORCHESTRATOR_INTERNAL_URL`: URL interna del orchestrator si no se usa el default local.
- `OPSLY_TERMINAL_ENABLE_SSH=true`: requerido antes de permitir comandos remotos SSH.
- `OPSLY_TERMINAL_SSH_ALLOWLIST`: hosts permitidos para sesiones SSH controladas.
- `OPSLY_TERMINAL_BASE_DIR`: directorio base para sesiones locales.

## Smoke mínimo

1. Abrir Admin `/openclaw/ide`.
2. Usar `agent_id=cursor`, `tenant_slug=opsly-internal`, comandos `pwd` y `node --version`.
3. Confirmar `202` en la llamada `POST /api/admin/agents/terminal/start`.
4. Ver una sesión en tabs y output incremental.
5. Ejecutar un tool MCP read-only desde el panel; Portal no debe aceptar `run_agent_task`.

## Guardrails

- Portal siempre usa `runTrustedPortalDalForPathSlug`; slug del path debe coincidir con el JWT.
- Tools MCP de Portal son read-only por defecto.
- Acciones destructivas o SSH requieren allowlist, feature flag y aprobación humana.
- Registrar `tenant_slug`, `agent_id`, `session_id`, `request_id` cuando se conecte ejecución real de tools.

---

## Enlaces relacionados

- [[runbooks/README|runbooks]]
- [[brain/README|Brain Central]]
