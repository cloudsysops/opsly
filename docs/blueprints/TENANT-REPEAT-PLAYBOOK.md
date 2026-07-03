---
status: canon
owner: operations
last_review: 2026-06-09
---

# Tenant Repeat Playbook — vender, desplegar y repetir en días

**Objetivo:** un solo dueño, un flujo, un dato de verdad por canal. Sin improvisar entre clientes.

**Fuentes canónicas:**
- Launch contract: `clients/<slug>.launch.json` + `config/client-launch.schema.json`
- Vertical blueprints: `config/vertical-blueprints/`
- Tenant registry: `config/tenants/<slug>.json` + `config/opsly.config.json`
- Platform read API: `GET /api/admin/tenants/registry`, `GET /api/admin/mission-control/incubation?slug=`
- CRM cutover: `docs/blueprints/TWENTY-CRM-CUTOVER-CHECKLIST.md`

---

## División de responsabilidades (no mezclar datos)

| Sistema | Dueño de |
|---------|----------|
| **Twenty** | Pipeline comercial, personas, oportunidades |
| **Supabase Opsly** | Leads operativos, tenant metadata, RLS |
| **n8n** | Automatización, webhooks, approval-first |
| **GHL** | Legacy apagable (`PESKIDS_GHL_ENABLED=false`) — no pipeline nuevo |

---

## A. Nuevo tenant en 3 comandos (plantilla)

```bash
# 1. Clonar blueprint vertical → launch contract
./scripts/provisioning/clone-vertical-launch.sh \
  --vertical barberia \
  --slug mi-barberia \
  --business-name "Mi Barbería" \
  --domain mi-barberia.op-sly.com \
  --email owner@example.com \
  --dry-run

# 2. Quitar --dry-run; revisar clients/mi-barberia.launch.json

# 3. Plan + bootstrap (dry-run primero)
npm run client:plan -- --tenant-slug mi-barberia
./scripts/provisioning/bootstrap-tenant.sh \
  --launch clients/mi-barberia.launch.json --dry-run
```

**Verticales disponibles:** `swim-school`, `barberia`, `restaurante`, `hotel`, `ventas`, `marketplace`  
Listar: `jq -r '.verticals[] | "\(.id)\t\(.label)"' config/vertical-blueprints/index.json`

---

## B. Peskids — cerrar operación (Twenty ON, GHL OFF)

### Estado código (rama `peskids-review`)
- Lead capture: Twenty vía `apps/peskids/lib/twenty-lead-sync.ts`
- GHL: `@deprecated`, flag `PESKIDS_GHL_ENABLED=false` por defecto en Doppler script
- Launch contract: `clients/peskids.launch.json` (`vertical_blueprint_id: swim-school`)

### Secuencia operativa (copy/paste)

```bash
# Mac — flags + secretos (sin imprimir valores)
./scripts/tenants/bootstrap-twenty.sh --tenant peskids --execute-secrets --skip-compose

# VPS — stack + .env
cd /opt/opsly && git pull --ff-only
./scripts/vps-bootstrap.sh
./scripts/tenants/setup-twenty-peskids.sh
./scripts/tenants/verify-twenty-stack.sh

# Manual UNA VEZ: Twenty UI → admin + API key
echo "<API_KEY>" | ./scripts/tenants/twenty-apply-api-key.sh --tenant peskids

# Apagar GHL legacy
./scripts/tenants/ghl-disable-legacy.sh --tenant peskids
./scripts/tenants/doppler-configure-twenty-prd.sh --tenant peskids --force

# Redeploy peskids + smoke
TWENTY_SMOKE_EXPECT_IDS=true ./scripts/tenants/twenty-crm-smoke.sh --tenant peskids
```

**Checklist completo:** `docs/blueprints/TWENTY-CRM-CUTOVER-CHECKLIST.md`  
**Runbook Twenty:** `docs/tenants/peskids/TWENTY-CRM.md`

---

## C. ICSO — administrar tenants (control plane)

### Qué existe hoy
| Capa | Ubicación |
|------|-----------|
| Marketing + leads | `apps/icso` → `icso.op-sly.com` |
| Tenant slug | `intcloudsysops` en `config/tenants/intcloudsysops.json` |
| Launch contract | `clients/intcloudsysops.launch.json` (`vertical: ventas`) |
| Registry API | `apps/api` → `/api/admin/tenants/registry` |
| Incubation machine | `/api/admin/mission-control/incubation?slug=` |
| Admin UI | `apps/admin` Mission Control (default slug aún `peskids` en UI) |

### Qué falta (no bloquea Peskids)
- Merge `feat/icso-twenty-crm` para leads ICSO → Twenty
- `apps/intcloudsysops` limpio (hoy mezcla código Peskids)
- `client:deploy` automatizado (usar `bootstrap-tenant.sh --execute` + onboard)

### Bootstrap ICSO

```bash
./scripts/provisioning/bootstrap-tenant.sh \
  --launch clients/intcloudsysops.launch.json --dry-run

# Tras merge Twenty ICSO:
./scripts/tenants/doppler-configure-twenty-prd.sh --tenant icso
./scripts/tenants/ghl-disable-legacy.sh --tenant icso
./scripts/tenants/twenty-crm-smoke.sh --tenant icso
```

Doc migración: `docs/tenants/intcloudsysops/TWENTY-CRM-MIGRATION.md`

---

## D. Pasos manuales inevitables (documentados una vez)

1. **Twenty:** primer usuario admin + API key en UI (no hay API de signup público)
2. **DNS:** wildcard `*.op-sly.com` ya cubre subdominios; dominio custom = Cloudflare manual
3. **Meta WhatsApp:** si aplica, ver `docs/tenants/peskids/WHATSAPP-CHANNEL.md`  
   **wacrm híbrido (opcional):** `docs/blueprints/WACRM-TWENTY-HYBRID-CONTRACT.md` — inbox en wacrm, pipeline en Twenty; activar con `./scripts/tenants/bootstrap-wacrm.sh` tras smoke Twenty.

Todo lo demás debe ser script/API: onboard, Doppler flags, compose, CRM workflows, smoke.

---

## E. Scripts npm

| Comando | Acción |
|---------|--------|
| `npm run client:plan -- --tenant-slug <slug>` | Plan de lanzamiento |
| `npm run client:setup` | Wizard → `config/tenants/<slug>.json` |
| `npm run client:bootstrap -- --launch clients/<slug>.launch.json` | Orchestrator (dry-run default) |

---

## F. Qué NO tocar

- Reescribir slices CRM Peskids / migraciones 0082+
- Segundo control plane o fork CRM por tenant
- Pipeline interno de herramientas WA (wacrm Kanban) en prod — usar Twenty + `notes-only` sync
- Segundo CRM activo sin flag (`WACRM_*_ENABLED`, `PESKIDS_TWENTY_ENABLED`)
- UI estética admin/ICSO
- Eliminar código GHL hasta ventana 30d post-cutover (solo flags off)

---

## G. Referencia piloto

**Peskids** = tenant incubado completo (`swim-school`).  
Copiar proceso: launch JSON → registry → Twenty → n8n CRM pack → smoke → Mission Control incubation gate.

```bash
./scripts/provisioning/bootstrap-tenant.sh \
  --launch clients/peskids.launch.json \
  --execute-doppler --execute-ghl-off
```
