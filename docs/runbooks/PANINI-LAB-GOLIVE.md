# Panini Lab — Go-Live Runbook

**URL destino:** `https://panini.op-sly.com`  
**Puerto interno:** `3005`  
**Imagen:** `ghcr.io/cloudsysops/intcloudsysops-panini-lab:latest`  
**Compose:** `infra/docker-compose.panini-lab.yml`  
**Traefik:** `infra/traefik/dynamic/panini-lab.yml`

---

## Prerequisitos

- [ ] PR `feat/panini-lab-prod` mergeado a `main`
- [ ] CI verde (type-check + tests + build)
- [ ] Imagen `intcloudsysops-panini-lab:latest` en GHCR
- [ ] Secrets configurados en Doppler (`ops-intcloudsysops / prd`)
- [ ] Migraciones `0065` + `0066` aplicadas en Supabase

---

## Fase A — Secrets en Doppler (humano)

Agregar en **Doppler → ops-intcloudsysops → prd**:

| Variable | Descripción | Requerido |
|----------|-------------|-----------|
| `PANINI_INBOUND_WEBHOOK_SECRET` | Secreto para header `x-panini-webhook-secret` | ✅ prod |
| `SUPABASE_URL` | Ya existe en prd (compartido) | ✅ |
| `SUPABASE_SERVICE_ROLE_KEY` | Ya existe en prd (compartido) | ✅ |
| `LLM_GATEWAY_URL` | `http://opsly_llm_gateway:3010` (red interna) | ✅ |
| `GEMINI_API_KEY` | Para transcripción voz/imagen vía gateway | ⚠️ opcional |

```bash
# Verificar que existen
doppler secrets --project ops-intcloudsysops --config prd | grep -E 'PANINI|SUPABASE|GEMINI|LLM_GATEWAY'
```

---

## Fase B — Migraciones Supabase (humano, zona ámbar)

> ⚠️ **Revisar SQL antes de aplicar.** Estas son additive-only (no dropean columnas existentes).

```bash
# Desde entorno con supabase CLI enlazado al proyecto jkwykpldnitavhmtuzmo
cd /path/to/intcloudsysops

# Revisar las migraciones antes
cat supabase/migrations/0065_panini_lab_schema.sql
cat supabase/migrations/0066_panini_lab_add_country.sql

# Aplicar
npx supabase db push --project-id jkwykpldnitavhmtuzmo

# Verificar tablas creadas
npx supabase db psql --project-id jkwykpldnitavhmtuzmo \
  -c "\dt panini_lab.*"
```

Exponer schema en Supabase API (si necesitas PostgREST):
- Dashboard → Settings → API → Schema exposure → añadir `panini_lab`

---

## Fase C — DNS + Cloudflare

1. En Cloudflare, zona `op-sly.com`:
   - Crear registro tipo **A** → nombre `panini` → IP del VPS (`157.245.223.7` o la actual)
   - **Proxy: naranja ON** (política Opsly)

2. Verificar propagación:
   ```bash
   dig +short panini.op-sly.com
   # Debe resolver a la IP de Cloudflare, no directo al VPS
   ```

---

## Fase D — Deploy en VPS

```bash
# Conectar al VPS vía Tailscale
ssh vps-dragon@100.120.151.91

cd /opt/opsly

# Actualizar repo
git pull --ff-only

# Copiar Traefik config (reload automático)
cp infra/traefik/dynamic/panini-lab.yml /opt/opsly/infra/traefik/dynamic/
# Traefik recarga dinámicamente — no necesita restart

# Pull imagen
doppler run --project ops-intcloudsysops --config prd -- \
  docker compose -f infra/docker-compose.panini-lab.yml pull

# Levantar
doppler run --project ops-intcloudsysops --config prd -- \
  docker compose -f infra/docker-compose.panini-lab.yml up -d

# Ver estado
docker compose -f infra/docker-compose.panini-lab.yml ps
docker logs panini-lab --tail=30
```

---

## Fase E — Smoke Tests

```bash
# 1. Health local en VPS
curl -sf http://localhost:3005/dashboard | grep -o "Panini Lab" && echo "✅ Local OK"

# 2. HTTPS público
curl -sfL https://panini.op-sly.com/dashboard | grep -o "Panini Lab" && echo "✅ HTTPS OK"

# 3. Webhook con figurita de prueba
curl -X POST https://panini.op-sly.com/api/webhooks/inbound \
  -H 'Content-Type: application/json' \
  -H "x-panini-webhook-secret: $PANINI_INBOUND_WEBHOOK_SECRET" \
  -d '{"text":"Tengo la 10 de Colombia y la 45 de Brasil repetida","sender":"smoke-test"}'
# Esperado: { "ok": true, "intent": "UPDATE_COLLECTION", "collection_updates": [...] }

# 4. Verificar dato en dashboard
curl -sfL https://panini.op-sly.com/dashboard | grep -o "Colombia" && echo "✅ Data visible"
```

---

## Operaciones comunes

### Actualizar a nueva versión

```bash
# El deploy workflow lo hace automáticamente en cada merge a main.
# Manual si necesario:
cd /opt/opsly && git pull --ff-only
doppler run --project ops-intcloudsysops --config prd -- \
  docker compose -f infra/docker-compose.panini-lab.yml pull && \
  docker compose -f infra/docker-compose.panini-lab.yml up -d
```

### Ver logs

```bash
docker logs panini-lab -f --tail=100
```

### Reiniciar

```bash
docker compose -f infra/docker-compose.panini-lab.yml restart panini-lab
```

### Parar

```bash
docker compose -f infra/docker-compose.panini-lab.yml down
```

### Ver variables activas

```bash
docker inspect panini-lab --format='{{range .Config.Env}}{{println .}}{{end}}' | grep -v KEY
```

---

## Troubleshooting

| Síntoma | Causa probable | Fix |
|---------|---------------|-----|
| 502 Bad Gateway en Traefik | Container no levantó | `docker logs panini-lab` |
| `Unauthorized` en webhook | Secret header faltante/incorrecto | Header `x-panini-webhook-secret` |
| `Storage: in-memory` en dashboard | `SUPABASE_URL` o `SUPABASE_SERVICE_ROLE_KEY` no configurados | Verificar Doppler |
| No persiste datos entre reinicios | En-memory mode activo | Ver punto anterior |
| Transcripción voz no funciona | `LLM_GATEWAY_URL` o `GEMINI_API_KEY` faltante | Verificar gateway y Doppler |
| TLS 404 / cert no emite | DNS aún propagando | Esperar 1-5 min, verificar Cloudflare proxy ON |

---

## Arquitectura de referencia

```
Usuario / WhatsApp bridge
  ↓ HTTPS
Cloudflare Proxy (ON)
  ↓
Traefik :443 → panini.op-sly.com → panini-lab:3005
  ↓ server-side
Supabase (panini_lab schema) — persistencia colección
LLM Gateway :3010 → Gemini API — transcripción voz/imagen
```

---

*Runbook generado con Opsly Conversational Runtime — feat/panini-lab-prod*
