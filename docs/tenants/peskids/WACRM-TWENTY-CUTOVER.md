---
status: canon
owner: peskids
last_review: 2026-06-09
tenant_slug: peskids
---

# Peskids — cutover híbrido wacrm + Twenty

**Piloto Opsly** para el modelo: una capa de conversación (wacrm) + un CRM (Twenty) + Supabase operativo + n8n.

## Qué hace wacrm en Peskids

| Función | Sí |
|---------|-----|
| Inbox WhatsApp (Meta Cloud API) | ✅ |
| Hilos, etiquetas, asignación a staff | ✅ |
| Respuesta humana desde UI wacrm | ✅ |
| Webhook firmado → n8n | ✅ |
| Pipeline comercial / etapas de matrícula | ❌ (Twenty) |
| Fuente maestra de lead | ❌ (Supabase + Twenty) |
| Kanban interno wacrm en prod | ❌ |

**URL sugerida:** `https://wa-peskids.op-sly.com`

## Qué hace Twenty en Peskids

| Función | Sí |
|---------|-----|
| Persona / contacto comercial | ✅ |
| Oportunidad pipeline «Enrollment» | ✅ |
| Etapa comercial (trial, enrolled, lost…) | ✅ |
| Lead web vía `twenty-lead-sync.ts` | ✅ (ya en código) |
| Copia literal de cada mensaje WA | ❌ |
| Envío WhatsApp | ❌ |

**Código existente:** `apps/peskids/lib/twenty-lead-sync.ts`, `apps/peskids/lib/peskids-crm-sync.ts`

## Qué sincroniza Supabase (sí / no)

| Dato | ¿Se escribe en Supabase? | Origen | Notas |
|------|--------------------------|--------|-------|
| Lead formulario web | ✅ Sí | App Peskids / API | Ya operativo |
| `twenty_person_id` / `twenty_opportunity_id` | ✅ Sí (cuando sync OK) | Twenty API | Smoke `TWENTY_SMOKE_EXPECT_IDS` |
| Mensaje WA crudo (texto completo) | ✅ Sí | n8n ← wacrm webhook | Tabla/evento operativo; no duplicar en Twenty |
| Resumen conversación | ✅ Sí | n8n (opcional IA) | Para dashboard Peskids |
| Estado pipeline | ❌ No en Supabase como fuente | Twenty | Solo lectura vía API si hace falta UI |
| DB interna wacrm | ❌ No replicar | Sidecar aislado | Sin merge a `platform` |

## Qué automatiza n8n (`n8n_peskids`)

| Workflow | Trigger | Acción |
|----------|---------|--------|
| CRM pack (existente) | Lead web / form | Supabase + alertas |
| `wacrm-inbound-twenty-note` | Webhook wacrm | Normalizar → upsert lead/message → nota Twenty (`notes-only`) |
| Cambio etapa Twenty | Manual o regla explícita | **No** automático desde cada mensaje WA |

Plantilla: `docs/examples/n8n/wacrm-inbound-twenty-note.json`

## Flags Doppler (Peskids)

```
PESKIDS_TWENTY_ENABLED=true          # CRM — requisito previo
PESKIDS_GHL_ENABLED=false            # legacy off
WACRM_PESKIDS_ENABLED=false          # hasta smoke verde
WACRM_PESKIDS_SERVER_URL=https://wa-peskids.op-sly.com
WACRM_PESKIDS_WEBHOOK_SECRET=<secret>
WACRM_PESKIDS_SYNC_TWENTY=notes-only
```

Lib: `@intcloudsysops/wacrm-channel` → `resolveWacrmForTenant('peskids')`

## Secuencia de cutover (orden fijo)

```bash
# 1. Twenty estable
./scripts/tenants/bootstrap-twenty.sh --tenant peskids --dry-run
TWENTY_SMOKE_EXPECT_IDS=true ./scripts/tenants/twenty-crm-smoke.sh --tenant peskids

# 2. wacrm preparado (flags OFF)
./scripts/tenants/bootstrap-wacrm.sh --slug peskids --execute-doppler
./scripts/tenants/setup-wacrm-tenant.sh --slug peskids

# 3. VPS: Meta tokens + compose template infra/templates/wacrm/
# 4. n8n: importar workflow wacrm-inbound
# 5. Smoke combinado
./scripts/peskids/wacrm-twenty-hybrid-smoke.sh --dry-run

# 6. Activar solo si smoke OK
# doppler: WACRM_PESKIDS_ENABLED=true
# Desactivar Jelou/OpenWA como primario (ADR si coexistían)
```

## Un solo proveedor WA primario

Antes de `WACRM_PESKIDS_ENABLED=true`, elegir **uno**:

| Proveedor | Flag / estado |
|-----------|----------------|
| wacrm | `WACRM_PESKIDS_ENABLED=true`, launch `primary_whatsapp_provider: wacrm` |
| Jelou | Legacy `apps/peskids/lib/jelou.ts` — apagar si wacrm ON |
| OpenWA | `OPENWA_PESKIDS_*` — no usar en paralelo sin ADR |

## Criterio «listo para prod»

- [ ] Twenty smoke con IDs reales
- [ ] wacrm health 200
- [ ] n8n workflow importado y probado con mensaje de prueba
- [ ] Supabase recibe evento WA
- [ ] Twenty muestra nota (no cambio de etapa accidental)
- [ ] `WACRM_PESKIDS_ENABLED=true` en Doppler

## Referencias

- Contrato global: `docs/blueprints/WACRM-TWENTY-HYBRID-CONTRACT.md`
- Canal WA histórico: `docs/tenants/peskids/WHATSAPP-CHANNEL.md`
- Launch: `clients/peskids.launch.json`
