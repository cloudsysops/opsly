# Runbook — Onboarding de Nuevo Cliente (Opsly)

**Audiencia:** operador con acceso SSH Tailscale, token admin y Doppler `prd`.  
**Frecuencia:** por cada nuevo tenant que se provisioning.  
**Tiempo estimado:** 15-30 minutos.

---

## 1. Pre-requisitos

Antes de iniciar el onboarding, verificar:

| Requisito                | Cómo verificar                                                           | Contacto/Referencia            |
| ------------------------ | ------------------------------------------------------------------------ | ------------------------------ |
| Dominio configurado      | `dig +short n8n-test.ops.smiletripcare.com` → IP VPS                     | DNS en Cloudflare              |
| Doppler secrets cargados | `doppler secrets --only-names --project ops-intcloudsysops --config prd` | 50+ secrets должны быть        |
| Acceso SSH Tailscale     | `ssh -o BatchMode=yes vps-dragon@100.120.151.91 "hostname"`              | IP: 100.120.151.91             |
| Credenciales Supabase    | `doppler secrets get SUPABASE_SERVICE_ROLE_KEY --plain`                  | Proyecto: jkwykpldnitavhmtuzmo |
| Stripe customer ID       | Si es plan de pago, crear customer en Stripe                             | Dashboard Stripe               |

> [!WARNING]
> No iniciar onboarding hasta tener al menos **dominio + SSH + Doppler** verificados. Sin estos, el script fallará y deixe el tenant en estado inconsistente.

---

## 2. Checklist de Onboarding

```bash
# ============================================
# CHECKLIST DE ONBOARDING - Nuevo Cliente
# ============================================
# [ ] 1. Generar y validar slug (3-30 chars, a-z0-9-)
# [ ] 2. Validar email del owner (no emails externos hasta dominio Resend verificado)
# [ ] 3. Verificar plan disponible (startup/business/enterprise)
# [ ] 4. Ejecutar onboard-tenant.sh
# [ ] 5. Verificar Docker stacks levantados
# [ ] 6. Verificar n8n accesible (https://n8n-{slug}.ops.smiletripcare.com)
# [ ] 7. Verificar Uptime Kuma accesible (https://uptime-{slug}.ops.smiletripcare.com)
# [ ] 8. Enviar invitación al portal
# [ ] 9. Documentar credenciales en Doppler (si aplica)
# [ ] 10. Notificar en Discord canal #ops-notifications
```

---

## 3. Comandos Exactos

### 3.1 Onboarding Básico

```bash
# Usando el wrapper opsly.sh (recomendado)
./scripts/opsly.sh create-tenant nuevo-cliente \
  --email owner@dominio.com \
  --plan startup \
  --name "Nombre Cliente"

# Con dry-run para validar sin ejecutar
./scripts/opsly.sh create-tenant nuevo-cliente \
  --email owner@dominio.com \
  --plan startup \
  --name "Nombre Cliente" \
  --dry-run

# Argumentos disponibles:
#   --slug <slug>              # Identificador único (3-30 chars, a-z0-9-)
#   --email <email>            # Email del owner del tenant
#   --plan startup|business|enterprise  # Plan de facturación
#   --name "Nombre Cliente"    # Nombre comercial (opcional)
#   --dry-run                  # Simular sin ejecutar
#   --ssh-host <IP>            # IP SSH (default: 100.120.151.91)
```

### 3.2 Verificación Post-Onboard

```bash
# Verificar contenedores Docker del tenant
docker ps --filter "name=tenant_nuevo-cliente" --filter "name=n8n-nuevo-cliente" --filter "name=uptime-nuevo-cliente"

# Verificar estado del stack
./scripts/opsly.sh status --slug nuevo-cliente

# Verificar salud de n8n
curl -sf --max-time 15 https://n8n-nuevo-cliente.ops.smiletripcare.com/health

# Verificar Uptime Kuma (página principal)
curl -sf --max-time 15 https://uptime-nuevo-cliente.ops.smiletripcare.com/ | head -20

# Verificar respuesta HTTP
curl -sI --max-time 15 https://n8n-nuevo-cliente.ops.smiletripcare.com | head -1
curl -sI --max-time 15 https://uptime-nuevo-cliente.ops.smiletripcare.com | head -1
```

### 3.3 Invitación al Portal

```bash
# Enviar invitación al portal (desde VPS o local con credenciales)
curl -X POST https://api.ops.smiletripcare.com/api/invitations \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "owner@dominio.com",
    "tenantRef": "nuevo-cliente",
    "mode": "developer"
  }'

# O usando el script de invitación
./scripts/send-tenant-invitation.sh --slug nuevo-cliente --email owner@dominio.com --mode developer
```

### 3.4 Gestión del Stack

```bash
# Iniciar stack existente
./scripts/opsly.sh start-tenant nuevo-cliente --wait --wait-seconds 120

# Detener stack
docker compose -f tenants/nuevo-cliente/docker-compose.yml down

# Ver logs en tiempo real
docker compose -f tenants/nuevo-cliente/docker-compose.yml logs -f

# Reiniciar servicios
docker compose -f tenants/nuevo-cliente/docker-compose.yml restart n8n
```

---

## 4. URLs Generadas

| Servicio    | URL                                           | Puerto interno |
| ----------- | --------------------------------------------- | -------------- |
| n8n         | `https://n8n-{slug}.ops.smiletripcare.com`    | 5678           |
| Uptime Kuma | `https://uptime-{slug}.ops.smiletripcare.com` | 3001           |

**Ejemplo para cliente "acme-corp":**

- n8n: https://n8n-acme-corp.ops.smiletripcare.com
- Uptime: https://uptime-acme-corp.ops.smiletripcare.com

---

## 5. Troubleshooting

### 5.1 Docker Stack No Levanta

```bash
# Ver logs completos del compose
docker compose -f tenants/{slug}/docker-compose.yml logs

# Ver logs específicos de un servicio
docker compose -f tenants/{slug}/docker-compose.yml logs n8n
docker compose -f tenants/{slug}/docker-compose.yml logs uptime-kuma

# Verificar configuración del compose
docker compose -f tenants/{slug}/docker-compose.yml config

# Verificar red de Docker
docker network ls | grep traefik
```

### 5.2 Puerto Occupied

```bash
# Verificar qué proceso usa el puerto
netstat -tlnp | grep -E '5678|3001'  # puertos típicos de n8n y uptime

# o con lsof
lsof -i :5678
lsof -i :3001

# Listar puertos en uso por contenedores
docker ps --format "table {{.Names}}\t{{.Ports}}"
```

### 5.3 Invitación No Llega

```bash
# Verificar dominio verificado en Resend
# Ir a https://resend.com/domains y verificar ops.smiletripcare.com

# Verificar logs de la API
docker logs opsly_app_1 2>&1 | grep -i invitation

# Revisar estado en Supabase
# Query: SELECT * FROM auth.invitations WHERE email = 'owner@dominio.com'
```

### 5.4 Errores Comunes

| Error                              | Causa                          | Solución                                     |
| ---------------------------------- | ------------------------------ | -------------------------------------------- |
| `slug must be 3-30 characters`     | Longitud inválida              | Usar slug entre 3 y 30 caracteres            |
| `slug must match pattern`          | Caracteres no válidos          | Solo usar `a-z`, `0-9`, `-` (sin mayúsculas) |
| `docker: invalid reference format` | slug con caracteres especiales | Normalizar slug a minúsculas                 |
| `Conflict` en tenant creation      | Tenant ya existe               | Verificar con `GET /api/tenants`             |
| `401 Unauthorized`                 | Token admin inválido           | Verificar `PLATFORM_ADMIN_TOKEN` en Doppler  |

### 5.5 Verificación de Estado del Tenant

```bash
# Estado vía API
curl -sf https://api.ops.smiletripcare.com/api/tenants/{slug}

# Estado en Supabase
# SELECT slug, status, plan, created_at FROM platform.tenants WHERE slug = '{slug}'

# Estado de containers en VPS
ssh vps-dragon@100.120.151.91 "docker ps --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}' | grep {slug}"
```

---

## 6. Post-Onboarding

### 6.1 Actualizar Configuración

```bash
# Actualizar config/opsly.config.json con el nuevo tenant
# Añadir entrada en el array "tenants":

{
  "slug": "nuevo-cliente",
  "plan": "startup",
  "ownerEmail": "owner@dominio.com",
  "status": "active",
  "createdAt": "2026-04-24"
}
```

### 6.2 Notificación en Discord

```bash
# Notificar al canal #ops-notifications
./scripts/notify-discord.sh "✅ Nuevo cliente onboarding completado" \
  "Slug: nuevo-cliente\nEmail: owner@dominio.com\nPlan: startup\nn8n: https://n8n-nuevo-cliente.ops.smiletripcare.com" \
  "success"

# O manualmente via Webhook (si el script no está disponible)
curl -X POST "$DISCORD_WEBHOOK_URL" \
  -H "Content-Type: application/json" \
  -d '{
    "content": "✅ **Nuevo cliente onboarded**",
    "embeds": [{
      "title": "nuevo-cliente",
      "fields": [
        {"name": "Email", "value": "owner@dominio.com"},
        {"name": "Plan", "value": "startup"},
        {"name": "n8n", "value": "https://n8n-nuevo-cliente.ops.smiletripcare.com"}
      ],
      "color": 65280
    }]
  }'
```

### 6.3 Documentar Credenciales en Doppler

Si el tenant tiene credenciales específicas (webhooks, integraciones):

```bash
# Añadir secretos específicos del cliente
doppler secrets set N8N_WEBHOOK_URL_nuevo-cliente="https://..." \
  --project ops-intcloudsysops --config prd
```

> [!NOTE]
> Las credenciales n8n se generan automáticamente en el stack del tenant. No documentar passwords en chat ni en texto plano.

---

## 7. Referencia Rápida

### Variables de Entorno

| Variable          | Default                 | Descripción                           |
| ----------------- | ----------------------- | ------------------------------------- |
| `PLATFORM_DOMAIN` | `ops.smiletripcare.com` | Dominio base de la plataforma         |
| `SSH_HOST`        | `100.120.151.91`        | IP Tailscale del VPS                  |
| `TENANTS_PATH`    | `./tenants`             | Directorio donde se crean los compose |
| `ADMIN_TOKEN`     | -                       | Token de admin (obtener de Doppler)   |

### Planes Disponibles

| Plan       | Precio USD | Puerto Base |
| ---------- | ---------- | ----------- |
| startup    | $49        | 8000        |
| business   | $149       | 9000        |
| enterprise | $0         | 10000       |

### Estructura de Archivos del Tenant

```
tenants/
└── docker-compose.{slug}.yml    # Compose del tenant
```

### Scripts Relacionados

| Script                                | Propósito                                           |
| ------------------------------------- | --------------------------------------------------- |
| `./scripts/opsly.sh`                  | CLI unificado (create-tenant, start-tenant, status) |
| `./scripts/send-tenant-invitation.sh` | Enviar invitación al portal                         |
| `./scripts/notify-discord.sh`         | Notificaciones Discord                              |

---

## 8. Rollback (Emergency)

Si el onboarding falla y necesitas limpiar:

```bash
# Detener y eliminar stack del tenant
docker compose -f tenants/{slug}/docker-compose.yml down -v --remove-orphans

# Eliminar archivo compose
rm tenants/docker-compose.{slug}.yml

# Eliminar red del tenant (si existe)
docker network rm tenant_{slug} 2>/dev/null || true

# Eliminar volumenes (CUIDADO: datos perdidos)
docker volume rm tenant_{slug}_n8n_data 2>/dev/null || true
docker volume rm tenant_{slug}_uptime_data 2>/dev/null || true
```

> [!WARNING]
> El rollback manual **no** elimina el registro de Supabase. Para limpiar completamente, eliminar también en `platform.tenants`.

---

**Última actualización:** 2026-04-24  
**Mantenedor:** Equipo Opsly
