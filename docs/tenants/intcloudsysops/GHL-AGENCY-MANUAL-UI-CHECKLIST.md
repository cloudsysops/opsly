---
status: draft
owner: operations
last_review: 2026-06-04
tenant_slug: intcloudsysops
---

# Intcloudsysops — GHL Manual UI Checklist (Agency)

**Objetivo:** cerrar los **5 ítems** que la API no provisiona de forma segura. Tras completarlos, el stack GHL agencia queda listo para consultoría y el patrón se replica en otros blueprints.

**Location GHL:** `qD7Z9jt3owk0LMtKElow`  
**Manifest canónico:** [`docs/examples/intake/intcloudsysops.json`](../../examples/intake/intcloudsysops.json)  
**Contrato:** [`GOHIGHLEVEL-CONTRACT.md`](GOHIGHLEVEL-CONTRACT.md)

**Tiempo estimado:** 35–45 min (una sesión en la consola GHL).

```bash
# Imprimir checklist + URLs en terminal
./scripts/ghl-agency-manual-checklist.sh

# Tras completar UI, re-validar provision
./scripts/ghl-provision-intcloudsysops.sh --execute
```

---

## Pre-vuelo (2 min)

- [ ] Entrar a GHL con la subcuenta **Intcloudsysops** (location `qD7Z9jt3owk0LMtKElow`).
- [ ] API ya aplicada: tags, custom fields, calendario **Discovery Call** → reporte con **13 already_exists**.
- [ ] Private Integration scopes OK (`./scripts/validate-ghl-config.sh --tenant intcloudsysops`).

---

## 1. Pipeline — Opsly Agency Sales (~8 min)

**Ruta:** Opportunities → Pipelines → **+ Create Pipeline**

| Campo | Valor |
|-------|--------|
| Nombre | `Opsly Agency Sales` |

**Etapas (en orden):**

1. New Lead  
2. Contacted  
3. Discovery  
4. Proposal  
5. Negotiation  
6. Won  
7. Lost  

**Verificación:**

- [ ] Pipeline visible en Opportunities con las 7 etapas.
- [ ] `./scripts/ghl-provision-intcloudsysops.sh --execute` → fila `pipeline | Opsly Agency Sales | already_exists`.

---

## 2. Form — Opsly Agency Lead Capture (~10 min)

**Ruta:** Sites → Forms → **+ New Form** (o Funnels → Form builder según tu vista GHL)

| Campo GHL | Tipo | Required | Notas |
|-----------|------|----------|--------|
| Name | Short text / Full name | ✅ | mapea a contact name |
| Email | Email | ✅ | |
| Phone | Phone | ✅ | |
| Company | Short text | opcional | |
| Service Interest | Short text | opcional | label legible; key interna `service_interest` si aplica |

**Nombre del formulario:** `Opsly Agency Lead Capture`

**Post-submit (MVP):**

- Tag contacto: `lead-web` (opcional en esta sesión).
- Workflow Lead Intake → fase posterior (n8n / GHL automation).

**Verificación:**

- [ ] Preview del form carga sin error.
- [ ] Test submit crea contacto en CRM.
- [ ] Re-provision: `form | Opsly Agency Lead Capture | already_exists` (si IAM/forms scope habilitado) o sigue `manual_required` con nota IAM — el contacto de prueba confirma el form.

> **IAM / forms API:** si el execute sigue reportando `This route is not yet supported by the IAM Service`, el form **sigue siendo válido** si existe en UI y captura leads. Añade `forms.write` en Private Integration cuando GHL lo permita en tu plan.

---

## 3. Email — Opsly — Welcome Lead (~5 min)

**Ruta:** Marketing → Emails → Templates → **+ New Template**

| Campo | Valor |
|-------|--------|
| Template name | `Opsly — Welcome Lead` |
| Subject | `Thanks for reaching out to Intcloudsysops` |
| Body (HTML) | `<p>We received your inquiry and will follow up shortly.</p>` |

**Verificación:**

- [ ] Template guardado con nombre exacto (incluye em dash `—`).
- [ ] Send test a tu email interno.

---

## 4. Email — Opsly — Discovery Call Confirmation (~5 min)

**Ruta:** Marketing → Emails → Templates → **+ New Template**

| Campo | Valor |
|-------|--------|
| Template name | `Opsly — Discovery Call Confirmation` |
| Subject | `Your discovery call is scheduled` |
| Body (HTML) | `<p>Looking forward to learning about {{contact.company_name}}.</p>` |

**Merge tag:** si `{{contact.company_name}}` no resuelve, usa el campo estándar **Company** del contacto (`{{contact.company}}`) o el custom field **`client_company`** (`{{contact.client_company}}` según merge tags de tu location).

**Verificación:**

- [ ] Template guardado.
- [ ] Preview con contacto de prueba muestra company.

---

## 5. SMS — Opsly — Discovery Reminder (~5 min)

**Ruta:** Conversations → Templates → **+ New Template** (SMS)

| Campo | Valor |
|-------|--------|
| Template name | `Opsly — Discovery Reminder` |
| Message | `Reminder: your Opsly discovery call is tomorrow.` |

**Verificación:**

- [ ] Template SMS guardado (nombre exacto).
- [ ] Longitud ≤ 160 caracteres (OK en este copy).

---

## Cierre de sesión (~5 min)

Ejecutar en repo:

```bash
./scripts/ghl-provision-intcloudsysops.sh --execute
./scripts/validate-ghl-config.sh --tenant intcloudsysops
```

**Criterio “stack operativo consultoría”:**

| Check | Esperado |
|-------|----------|
| API provision | 0 `blocked`; pipeline → `already_exists` |
| Manual UI | 5 ítems marcados arriba |
| Peskids E2E | siguiente paso: smoke form → webhook → n8n |
| Blueprint | copiar este checklist + `intcloudsysops.json` para nuevos tenants |

Actualizar en [`GOHIGHLEVEL-CONTRACT.md`](GOHIGHLEVEL-CONTRACT.md):

```markdown
**Estado manual UI (YYYY-MM-DD):** ✅ 5/5 completados
```

---

## Orden recomendado del programa

1. **Este checklist** (agencia Intcloudsysops)  
2. **Smoke E2E Peskids** — [`docs/tenants/peskids/GOHIGHLEVEL-CONTRACT.md`](../peskids/GOHIGHLEVEL-CONTRACT.md)  
3. **Replicar patrón** — nuevo tenant: manifest en `docs/examples/intake/{slug}.json` + contrato + provision script

---

## Enlaces GHL (location agencia)

Sustituye `{loc}` = `qD7Z9jt3owk0LMtKElow`:

- Subcuenta: `https://app.gohighlevel.com/v2/location/{loc}/dashboard`
- Private Integration: `https://app.gohighlevel.com/v2/location/{loc}/settings/private-integrations/6a1e2b7830bb8f3a824f783a`
- Opportunities: `https://app.gohighlevel.com/v2/location/{loc}/opportunities/pipelines`
- Forms: `https://app.gohighlevel.com/v2/location/{loc}/funnels-websites/funnels`
- Email templates: `https://app.gohighlevel.com/v2/location/{loc}/marketing/emails/templates`
