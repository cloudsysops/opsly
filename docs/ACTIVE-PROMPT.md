# ACTIVE-PROMPT — Opsly

# Protocolo: leer AGENTS.md y VISION.md antes de ejecutar

# Fuente de verdad: https://raw.githubusercontent.com/cloudsysops/opsly/main/AGENTS.md

#

# Prompt operativo cargado (modo comentario para evitar ejecución automática por cursor-prompt-monitor)

#

# ## OBJETIVO

# Diagnosticar y corregir el bug crítico: POST /api/tenants retorna 202 pero NO persiste el tenant en DB.

# Luego verificar que los tenants smiletripcare y peskids están correctamente registrados en Supabase y sus stacks Docker corren en VPS.

#

# ## CONTEXTO

# - Síntoma: `curl -X POST https://api.ops.smiletripcare.com/api/tenants` → HTTP 202 con UUID pero el tenant no aparece en GET /api/tenants ni en platform.tenants

# - Archivo sospechoso: `apps/api/lib/orchestrator.ts` → función `createTenantRecord()`

# - Causa posible: (a) error catch silencioso, (b) RLS policy bloquea insert, (c) transaction rollback sin log, (d) usa anon key en lugar de service_role key

# - Stacks Docker en VPS: smiletripcare y peskids YA tienen contenedores corriendo (n8n + uptime-kuma)

# - Supabase proyecto: jkwykpldnitavhmtuzmo, schema: platform, tabla: platform.tenants

#

# ## PASO 1 — DIAGNÓSTICO EN CÓDIGO

#

# 1.1 Abrir `apps/api/lib/orchestrator.ts`

# - Localizar `createTenantRecord()` o equivalente

# - Verificar si el insert usa `supabaseServiceRole` (con SUPABASE_SERVICE_ROLE_KEY) o `supabaseClient` (anon)

# - Verificar si hay try/catch que swallow el error sin relanzar

# - Verificar si la función es async y si se hace await correctamente en el caller

#

# 1.2 Abrir la ruta `apps/api/app/api/tenants/route.ts` (POST handler)

# - Verificar el flujo completo: validación → createTenantRecord → respuesta 202

# - Verificar si hay await faltante antes de createTenantRecord

# - Verificar si el error se loguea pero la respuesta sigue siendo 202

#

# 1.3 Verificar cliente Supabase usado para inserts admin

# - Archivo: `apps/api/lib/supabase.ts` o similar

# - Debe existir un cliente con SUPABASE_SERVICE_ROLE_KEY para operaciones admin (bypass RLS)

# - Si solo hay cliente anon → ese es el bug

#

# ## PASO 2 — CORRECCIÓN

#

# 2.1 Si el bug es cliente anon en createTenantRecord:

# - Crear o importar `supabaseAdmin` usando SUPABASE_SERVICE_ROLE_KEY

# - Reemplazar el cliente en createTenantRecord

#

# 2.2 Si el bug es await faltante:

# - Añadir await en el caller

#

# 2.3 Si el bug es catch silencioso:

# - Relanzar el error con `throw` después del log

# - Cambiar la respuesta a 500 si falla el insert

#

# 2.4 Después de cualquier fix, añadir log explícito:

# ```typescript

# console.log('[createTenantRecord] inserting tenant:', { slug, plan, email })

# const { data, error } = await supabaseAdmin

# .schema('platform')

# .from('tenants')

# .insert({ ... })

# .select()

# .single()

# if (error) {

# console.error('[createTenantRecord] FAILED:', error)

# throw error

# }

# console.log('[createTenantRecord] SUCCESS:', data.id)

# ```

#

# ## PASO 3 — VERIFICAR TENANTS EXISTENTES EN SUPABASE

#

# 3.1 Ejecutar desde el VPS:

# ```bash

# cd /opt/opsly && doppler run -c prd -- npx supabase db query --linked \

# "SELECT slug, plan, status, owner_email, created_at FROM platform.tenants ORDER BY created_at;"

# ```

#

# 3.2 Si smiletripcare y peskids NO están en DB → insertarlos manualmente:

# ```bash

# cd /opt/opsly && doppler run -c prd -- node -e "

# const { createClient } = require('@supabase/supabase-js');

# const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

# async function main() {

# const tenants = [

# { slug: 'smiletripcare', plan: 'startup', status: 'active', owner_email: process.env.SMILETRIPCARE_EMAIL || 'admin@smiletripcare.com' },

# { slug: 'peskids', plan: 'startup', status: 'active', owner_email: process.env.PESKIDS_EMAIL || 'admin@peskids.com' }

# ];

# for (const t of tenants) {

# const { data, error } = await sb.schema('platform').from('tenants').upsert(t, { onConflict: 'slug' }).select().single();

# console.log(t.slug, error ? 'ERROR: ' + error.message : 'OK: ' + data.id);

# }

# }

# main();

# "

# ```

#

# 3.3 Confirmar con GET:

# ```bash

# curl -s https://api.ops.smiletripcare.com/api/tenants | jq '.[] | {slug, status, plan}'

# ```

#

# ## PASO 4 — VERIFICAR STACKS DOCKER EN VPS

#

# 4.1 SSH al VPS y verificar contenedores:

# ```bash

# ssh vps-dragon@100.120.151.91 "docker ps --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}' | grep -E 'smiletripcare|peskids|traefik|opsly'"

# ```

#

# 4.2 Verificar URLs de cada tenant:

# ```bash

# curl -sk https://n8n-smiletripcare.ops.smiletripcare.com/healthz | head -c 100

# curl -sk https://uptime-smiletripcare.ops.smiletripcare.com/ | head -c 100

# curl -sk https://n8n-peskids.ops.smiletripcare.com/healthz | head -c 100

# curl -sk https://uptime-peskids.ops.smiletripcare.com/ | head -c 100

# ```

#

# 4.3 Si algún stack no corre → levantar:

# ```bash

# ssh vps-dragon@100.120.151.91 "cd /opt/opsly && docker compose --project-name tenant_smiletripcare -f tenants/smiletripcare/docker-compose.yml up -d"

# ssh vps-dragon@100.120.151.91 "cd /opt/opsly && docker compose --project-name tenant_peskids -f tenants/peskids/docker-compose.yml up -d"

# ```

#

# ## PASO 5 — VERIFICAR DISCO VPS

#

# ```bash

# ssh vps-dragon@100.120.151.91 "df -h / && docker system df"

# ```

# Si uso de disco > 85%:

# ```bash

# ssh vps-dragon@100.120.151.91 "docker image prune -f && docker builder prune -f"

# ```

# NUNCA usar `docker system prune --volumes` (destruye redes externas como traefik-public).

#

# ## PASO 6 — COMMIT Y DEPLOY

#

# 6.1 Si se hizo algún fix en código:

# ```bash

# npm run type-check

# npm run test --workspace=@intcloudsysops/api

# ```

#

# 6.2 Commit:

# ```

# fix(api): resolve silent tenant insert failure in createTenantRecord

#

# - Use supabaseAdmin (service_role) for platform.tenants insert

# - Add explicit error throw on insert failure

# - Add structured logs for insert start/success/failure

# ```

#

# 6.3 Push a main → CI hace build + push a GHCR automáticamente

#

# 6.4 En VPS hacer pull y redeploy de api:

# ```bash

# ssh vps-dragon@100.120.151.91 "cd /opt/opsly && git pull --ff-only && doppler run -c prd -- docker compose -f infra/docker-compose.platform.yml pull app && docker compose -f infra/docker-compose.platform.yml up -d --no-deps --force-recreate app"

# ```

#

# ## PASO 7 — SMOKE TEST FINAL

#

# 7.1 Crear un tenant de prueba para verificar el fix:

# ```bash

# curl -s -X POST https://api.ops.smiletripcare.com/api/tenants \

# -H "Content-Type: application/json" \

# -H "Authorization: Bearer $(cd /opt/opsly && doppler run -c prd -- printenv PLATFORM_ADMIN_TOKEN)" \

# -d '{"slug":"test-verify-fix","plan":"startup","email":"test@opsly.dev"}' | jq .

# ```

#

# 7.2 Verificar que aparece en DB:

# ```bash

# curl -s https://api.ops.smiletripcare.com/api/tenants | jq '.[] | select(.slug == "test-verify-fix")'

# ```

#

# 7.3 Si OK → eliminar tenant de prueba y notificar Discord:

# ```bash

# cd /opt/opsly && doppler run -c prd -- ./scripts/notify-discord.sh "✅ Tenant provisioning FIXED" "POST /api/tenants ahora persiste en DB. smiletripcare + peskids verificados en producción." "success"

# ```

#

# ## RESTRICCIONES

# - NO usar `docker system prune --volumes`

# - NO modificar RLS policies sin dry-run primero

# - NO tocar tenants/smiletripcare/ ni tenants/peskids/ a menos que un stack esté caído

# - Secrets solo via Doppler con `doppler run -c prd --`

# - Si onboard-tenant.sh se necesita, recordar el bug conocido (detiene tenants existentes) — usar solo si el stack no existe

#

# ## VERIFICACIÓN FINAL ESPERADA

# - [ ] GET /api/tenants devuelve smiletripcare y peskids con status: active

# - [ ] POST /api/tenants crea y persiste correctamente

# - [ ] n8n y uptime-kuma corriendo para ambos tenants

# - [ ] Disco VPS < 85%

# - [ ] Discord notificado
