# LegalVial — configuración, secretos y zero-trust

**Prerrequisito:** leer [LEGALVIAL-LOCALRANK-MODEL.md](./LEGALVIAL-LOCALRANK-MODEL.md).

## Convención de secretos (Doppler `prd`)

- **No** pegar secretos en el repo, issues ni chat.
- Preferir **un secreto por integración y por tenant** cuando el proveedor lo permita (p. ej. webhook n8n distinto para `legalvial` vs `localrank`).
- Nombres sugeridos (ejemplos, ajustar al catálogo real del proyecto):
  - `RESEND_*`, `DISCORD_WEBHOOK_*` — compartidos plataforma salvo requisito de canal dedicado.
  - Cualquier clave **específica** de LegalVial: sufijo o prefijo explícito en el nombre Doppler (`…_LEGALVIAL` o documentado en runbook interno) para evitar sobrescrituras al copiar configs.

## API y portal (zero-trust)

- Rutas bajo `/api/portal/tenant/[slug]/*` deben usar **`resolveTrustedPortalSession`** y **`tenantSlugMatchesSession`** antes de mutar estado o leer datos sensibles.
- El cuerpo de las peticiones **no** sustituye `tenant_slug` ni email del owner; viene de la sesión.
- Referencia: [`docs/04-infrastructure/SECURITY_CHECKLIST.md`](../04-infrastructure/SECURITY_CHECKLIST.md).

## Orquestador y jobs

- `OrchestratorJob` e `IntentRequest` exigen **`tenant_slug`** en código actual.
- Encolar jobs para LegalVial siempre con `tenant_slug: "legalvial"` (o el slug definitivo acordado).
- Incluir **`request_id`** (UUID) en llamadas al LLM Gateway y en logs estructurados.
- Opcional en **`metadata`**: `parent_tenant_slug: "localrank"`, `client_slug: "legalvial"` para informes (alineado con `config/tenants/legalvial.json`).

## Compose y stacks

- Stack del tenant: fichero bajo `TENANTS_PATH` (default `<repo>/tenants`) con patrón `docker-compose.<slug>.yml`; arranque idempotente vía `./scripts/opsly.sh start-tenant <slug>` → `scripts/deploy/rollout-tenant.sh`.
- Alta vía API/DB: `./scripts/opsly.sh create-tenant <slug> --email … --plan …` (implementado en `scripts/tenant/onboard.sh`).
- Variables inyectadas vía `.env` del VPS desde Doppler; revisar `TENANT_BASE_DOMAIN` vs `PLATFORM_DOMAIN` para URLs públicas de n8n/Uptime.

## Validación local del registro subcliente

```bash
./scripts/validate-subclient-config.sh
```

Falla si falta `tenant_slug` / `schema_name` en `config/tenants/*.json` o si hay `parent_tenant_slug` sin `client_slug`.
