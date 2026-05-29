# Panini Lab — Go-Live Runbook

**URL destino:** `https://panini.op-sly.com`  
**Puerto interno:** `3005` (localhost bind `127.0.0.1:3005` para ops)  
**Imagen:** `ghcr.io/cloudsysops/intcloudsysops-panini-lab:latest`  
**Compose:** `infra/docker-compose.panini-lab.yml`  
**Traefik:** `infra/traefik/dynamic/panini-lab.yml`  
**Redes Docker:** `traefik-public` + `infra_internal` (LLM gateway plataforma)

---

## Checklist ejecutivo

| # | Paso | Responsable | Estado |
|---|------|-------------|--------|
| 1 | Merge PR `feat/panini-lab-prod` → `main` | Dev | ☐ |
| 2 | CI verde + imagen en GHCR | CI | ☐ |
| 3 | Doppler secrets (tabla abajo) | Humano | ☐ |
| 4 | Supabase `0065` + `0066` | Humano (ámbar) | ☐ |
| 5 | DNS `panini` en Cloudflare (proxy ON) | Humano | ☐ |
| 6 | Deploy VPS (Actions o script manual) | Ops | ☐ |
| 7 | `./scripts/test-panini-lab-smoke.sh` | Ops | ☐ |

---

## Prerequisitos

- [ ] PR `feat/panini-lab-prod` mergeado a `main`
- [ ] CI verde (type-check + tests + build incl. panini-lab)
- [ ] Imagen `intcloudsysops-panini-lab:latest` en GHCR
- [ ] Redes Docker en VPS: `traefik-public`, `infra_internal` (creadas por platform compose)
- [ ] Secrets en Doppler (`ops-intcloudsysops / prd`)
- [ ] Migraciones `0065` + `0066` aplicadas en Supabase

---

## Fase A — Secrets en Doppler (humano)

Agregar en **Doppler → ops-intcloudsysops → prd**:

| Variable | Descripción | Requerido |
|----------|-------------|-----------|
| `PANINI_INBOUND_WEBHOOK_SECRET` | Header `x-panini-webhook-secret` en prod | ✅ |
| `SUPABASE_URL` | Compartido plataforma | ✅ |
| `SUPABASE_SERVICE_ROLE_KEY` | Compartido plataforma | ✅ |
| `LLM_GATEWAY_URL` | Default compose: `http://opsly_llm_gateway:3010` | ⚠️ opcional |
| `GEMINI_API_KEY` | Transcripción voz/imagen vía gateway | ⚠️ opcional |
| `AUTH_SECRET` | NextAuth (`openssl rand -base64 32`) | ⚠️ si proteges dashboard |
| `PANINI_AUTH_URL` | `https://panini.op-sly.com` | ⚠️ si NextAuth |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Login Google en `/dashboard` | ⚠️ opcional |

**Google OAuth redirect URI** (si usas login):

`https://panini.op-sly.com/api/auth/callback/google`

```bash
doppler secrets --project ops-intcloudsysops --config prd | grep -E 'PANINI|SUPABASE|GEMINI|LLM_GATEWAY|AUTH_SECRET|GOOGLE_CLIENT'
```

---

## Fase B — Migraciones Supabase (humano, zona ámbar)

> ⚠️ **Revisar SQL antes de aplicar.** Additive-only.

```bash
cat supabase/migrations/0065_panini_lab_schema.sql
cat supabase/migrations/0066_panini_lab_add_country.sql
npx supabase db push --project-id jkwykpldnitavhmtuzmo
npx supabase db psql --project-id jkwykpldnitavhmtuzmo -c "\dt panini_lab.*"
```

Exponer schema en Supabase API si aplica: Settings → API → Schema exposure → `panini_lab`.

---

## Fase C — DNS + Cloudflare

1. Zona `op-sly.com`: registro **A** `panini` → IP VPS (o wildcard `*.op-sly.com`)
2. **Proxy naranja ON**
3. Verificar: `dig +short panini.op-sly.com`

---

## Fase D — Deploy en VPS

### Opción 1 — GitHub Actions (recomendado)

Tras merge a `main`, workflow **Deploy Panini Lab** corre cuando CI pasa.  
Manual: Actions → Deploy Panini Lab → Run workflow.

### Opción 2 — Script manual

```bash
ssh vps-dragon@100.120.151.91
cd /opt/opsly && git pull --ff-only
./scripts/deploy-panini-lab-vps.sh
```

### Opción 3 — Comandos explícitos

```bash
ssh vps-dragon@100.120.151.91
cd /opt/opsly && git pull --ff-only

# Traefik file provider recarga solo al detectar cambios en infra/traefik/dynamic/
ls infra/traefik/dynamic/panini-lab.yml

doppler run --project ops-intcloudsysops --config prd -- \
  docker compose -f infra/docker-compose.panini-lab.yml pull

doppler run --project ops-intcloudsysops --config prd -- \
  docker compose -f infra/docker-compose.panini-lab.yml up -d

docker compose -f infra/docker-compose.panini-lab.yml ps
docker logs panini-lab --tail=30
curl -sf http://127.0.0.1:3005/dashboard | head -c 200
```

---

## Fase E — Smoke Tests

```bash
# Desde Mac (con Doppler)
./scripts/test-panini-lab-smoke.sh

# O manual
curl -sfL https://panini.op-sly.com/dashboard | grep -o "Panini Lab"

doppler run --project ops-intcloudsysops --config prd -- bash -c '
curl -X POST https://panini.op-sly.com/api/webhooks/inbound \
  -H "Content-Type: application/json" \
  -H "x-panini-webhook-secret: $PANINI_INBOUND_WEBHOOK_SECRET" \
  -d "{\"text\":\"Tengo la 10 de Colombia\",\"sender\":\"smoke\"}"
'
```

---

## Operaciones

| Acción | Comando |
|--------|---------|
| Actualizar imagen | Re-merge a main o `deploy-panini-lab-vps.sh` |
| Logs | `docker logs panini-lab -f --tail=100` |
| Reiniciar | `docker compose -f infra/docker-compose.panini-lab.yml restart panini-lab` |
| Parar | `docker compose -f infra/docker-compose.panini-lab.yml down` |

---

## Troubleshooting

| Síntoma | Causa | Fix |
|---------|-------|-----|
| 502 Bad Gateway | Container caído o red | `docker logs panini-lab`; verificar `traefik-public` |
| Webhook 401 | Secret faltante | `PANINI_INBOUND_WEBHOOK_SECRET` + header correcto |
| In-memory storage | Supabase env vacío | Doppler `SUPABASE_*` |
| Voz no transcribe | Gateway inalcanzable | Red `infra_internal`; `opsly_llm_gateway` healthy |
| Login Google falla | OAuth redirect | URI callback en Google Cloud Console |

---

## Arquitectura

```
Usuario / bridge WhatsApp
  → Cloudflare (proxy ON)
  → Traefik :443 → panini.op-sly.com → panini-lab:3005
  → Supabase panini_lab (persistencia)
  → opsly_llm_gateway:3010 → Gemini (transcripción)
```

**Docs tenant:** [`docs/tenants/panini-lab/README.md`](../tenants/panini-lab/README.md)
