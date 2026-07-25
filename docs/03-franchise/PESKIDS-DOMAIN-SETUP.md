# 🌐 Peskids Domain Setup — peskids.com

**Status:** Domain comprado en Cloudflare ✅  
**Dominio:** `peskids.com`  
**Próximo agente:** Con acceso a Cloudflare + VPS  
**Tiempo estimado:** 30 minutos

---

## 📋 RESUMEN EJECUTIVO

El dominio `peskids.com` está comprado. Necesita:
1. **Cloudflare DNS:** Configurar registros A y CNAME
2. **Traefik:** Agregar regla para el nuevo dominio
3. **Let's Encrypt:** Certificado SSL automático
4. **Verificación:** Probar que funciona

**Resultado final:** `https://peskids.com` y `https://www.peskids.com` funcionando

---

## ✅ PREREQUISITOS

- [ ] Acceso a Cloudflare (panel o API)
- [ ] Acceso SSH VPS: `vps-dragon@100.120.151.91` (Tailscale)
- [ ] Doppler: `ops-intcloudsysops / prd` (lectura de PLATFORM_VPS_PUBLIC_IP)

---

## PASO 1: Cloudflare DNS (5 min)

### En Cloudflare panel: https://dash.cloudflare.com

1. **Agregar dominio a Cloudflare**
   - Login → Add site
   - Dominio: `peskids.com`
   - Plan: Free (o el que tengan)
   - Next

2. **Copiar nameservers de Cloudflare**
   ```
   • ns1.cloudflare.com
   • ns2.cloudflare.com
   ```

3. **Actualizar registrador (donde lo compraron)**
   - Ir a registrador (GoDaddy, Namecheap, etc.)
   - Cambiar nameservers → pegados de Cloudflare
   - Esperar 5-10 min propagación

4. **Crear registros DNS en Cloudflare**

   | Tipo | Nombre | Contenido | Proxy | TTL |
   |------|--------|-----------|-------|-----|
   | A | `peskids.com` | `$PLATFORM_VPS_PUBLIC_IP` | ✅ Proxied | Auto |
   | A | `www` | `$PLATFORM_VPS_PUBLIC_IP` | ✅ Proxied | Auto |
   | CNAME | `admin` | `peskids.com` | ✅ Proxied | Auto |
   | CNAME | `api` | `peskids.com` | ✅ Proxied | Auto |

   **Donde `$PLATFORM_VPS_PUBLIC_IP` es:**
   ```bash
   doppler run --project ops-intcloudsysops --config prd -- echo $PLATFORM_VPS_PUBLIC_IP
   # Ejemplo: 157.245.223.7
   ```

5. **Verificar DNS propague**
   ```bash
   nslookup peskids.com
   # Debe mostrar: 157.245.223.7
   ```

---

## PASO 2: Traefik Routing (15 min)

### En VPS, actualizar configuración Traefik

```bash
# 1. Conectar a VPS
ssh vps-dragon@100.120.151.91

# 2. Editar Traefik middlewares (SSL/TLS)
cd /opt/opsly
nano infra/docker-compose.platform.yml
```

### Buscar sección de `peskids` labels y agregar:

```yaml
peskids:
  image: ghcr.io/cloudsysops/opsly/peskids:latest
  container_name: opsly_peskids
  environment:
    - NEXT_PUBLIC_PLATFORM_DOMAIN=peskids.com  # ← AGREGAR ESTO
    - NEXT_PUBLIC_SUPABASE_URL=${NEXT_PUBLIC_SUPABASE_URL}
    # ... otras vars ...
  labels:
    - traefik.enable=true
    
    # Ruter principal (peskids.com)
    - traefik.http.routers.peskids.rule=Host(`peskids.com`) || Host(`www.peskids.com`)
    - traefik.http.routers.peskids.entrypoints=websecure
    - traefik.http.routers.peskids.tls.certresolver=letsencrypt
    - traefik.http.routers.peskids.service=peskids
    
    # Ruter admin (admin.peskids.com, para consistency con op-sly.com)
    - traefik.http.routers.peskids-admin.rule=Host(`admin.peskids.com`)
    - traefik.http.routers.peskids-admin.entrypoints=websecure
    - traefik.http.routers.peskids-admin.tls.certresolver=letsencrypt
    - traefik.http.routers.peskids-admin.service=peskids
    
    # Service backend
    - traefik.http.services.peskids.loadbalancer.server.port=3004
    - traefik.http.services.peskids.loadbalancer.server.scheme=http
    
    # Redirect HTTP → HTTPS
    - traefik.http.middlewares.peskids-redirect.redirectscheme.scheme=https
    - traefik.http.middlewares.peskids-redirect.redirectscheme.permanent=true
    - traefik.http.routers.peskids-http.rule=Host(`peskids.com`) || Host(`www.peskids.com`) || Host(`admin.peskids.com`)
    - traefik.http.routers.peskids-http.entrypoints=web
    - traefik.http.routers.peskids-http.middlewares=peskids-redirect
    - traefik.http.routers.peskids-http.service=noop
```

### Validar compose y restart:

```bash
# Validar sintaxis
docker-compose -f infra/docker-compose.platform.yml config > /dev/null && echo "✓ Valid"

# Restart peskids
docker-compose -f infra/docker-compose.platform.yml restart peskids

# Ver logs
docker-compose -f infra/docker-compose.platform.yml logs --tail=50 peskids
```

---

## PASO 3: Verificación (5 min)

### Test desde local:

```bash
# 1. Health check
curl -I https://peskids.com/
# Debe retornar: 200 OK (después de 30s, certificado Let's Encrypt)

# 2. Admin
curl -I https://admin.peskids.com/
# Debe retornar: 200 OK

# 3. API health
curl https://peskids.com/api/health
# Debe retornar: {"status":"ok"}
```

### Test en navegador:

```
https://peskids.com → Debe cargar la app
https://www.peskids.com → Debe cargar la app
https://admin.peskids.com → Admin portal
```

### Verificar certificado SSL:

```bash
# En VPS
docker exec opsly_traefik ls /letsencrypt/acme.json | grep peskids
# O desde navegador:
curl -I https://peskids.com/ 2>&1 | grep -A 5 "certificate"
```

---

## PASO 4: Actualizar URLs en código (10 min)

### Archivos que usan URLs hardcoded:

```bash
# Buscar referencias a op-sly.com
grep -r "op-sly.com\|peskids.op-sly.com" apps/peskids --include="*.ts" --include="*.tsx"
```

### Actualizar env vars (RECOMENDADO → usar env, no hardcoded):

**En Doppler (`ops-intcloudsysops/prd`):**

```yaml
# Agregar
PESKIDS_DOMAIN=peskids.com
PESKIDS_ADMIN_URL=https://admin.peskids.com
PESKIDS_API_URL=https://peskids.com/api
```

**En `.env.local` (dev local):**

```env
NEXT_PUBLIC_PESKIDS_DOMAIN=localhost:3004
PESKIDS_DOMAIN=peskids.com
```

### Actualizar código (usar env en lugar de hardcoded):

```typescript
// Antes (malo)
const adminUrl = "https://peskids.op-sly.com/admin"

// Después (bien)
const domain = process.env.NEXT_PUBLIC_PESKIDS_DOMAIN || process.env.PESKIDS_DOMAIN || "peskids.com"
const adminUrl = `https://admin.${domain}`
```

---

## 🚨 TROUBLESHOOTING

### "ERR_CERT_AUTHORITY_INVALID"

→ Certificado Let's Encrypt aún se genera. Esperar 2-5 min y recargar.

### "Connection timed out"

→ Verificar que Cloudflare tiene registros DNS correctos:
```bash
dig peskids.com @1.1.1.1  # Usar Cloudflare DNS
# Debe mostrar IP del VPS
```

### "404 Not Found"

→ Traefik no tiene regla para peskids.com. Revisar logs:
```bash
docker logs opsly_traefik | tail -20 | grep peskids
```

### "SSL Certificate Error"

→ Let's Encrypt falla si Traefik no está accesible en puerto 80/443:
```bash
# Verificar puertos abiertos
sudo netstat -tlnp | grep -E ":80|:443"

# Verificar Traefik health
curl -I http://localhost/  # Debe conectar a través de Traefik
```

---

## ✅ CHECKLIST FINAL

```
DNS & Cloudflare
[ ] Dominio peskids.com en Cloudflare
[ ] Nameservers actualizados en registrador
[ ] Registros A y CNAME configurados
[ ] DNS propaga (nslookup confirma)

Traefik
[ ] Labels actualizados en docker-compose.platform.yml
[ ] peskids container restarted
[ ] Logs muestran "certificateResolution=letsencrypt"
[ ] Certificado Let's Encrypt generado (/letsencrypt/acme.json)

Verificación
[ ] curl https://peskids.com → 200 OK
[ ] curl https://admin.peskids.com → 200 OK
[ ] curl https://peskids.com/api/health → {"status":"ok"}
[ ] Navegador: https://peskids.com carga la app
[ ] SSL certificate válido (sin warnings)

Código
[ ] Env vars actualizadas en Doppler
[ ] URLs en código usan env vars (no hardcoded)
[ ] NEXT_PUBLIC_PESKIDS_DOMAIN=peskids.com
```

---

## 📞 REFERENCIA RÁPIDA

| Tarea | Comando |
|-------|---------|
| Verificar IP VPS | `doppler run -- echo $PLATFORM_VPS_PUBLIC_IP` |
| Restart Traefik | `ssh vps-dragon@... "cd /opt/opsly && docker-compose -f infra/docker-compose.platform.yml restart traefik"` |
| Ver logs Traefik | `ssh vps-dragon@... "docker logs opsly_traefik \| tail -50"` |
| Test DNS | `nslookup peskids.com` |
| Test SSL | `curl -I https://peskids.com/` |
| Test app | `curl https://peskids.com/api/health` |

---

## 📝 NOTAS

- **HTTPS automático:** Let's Encrypt se genera automáticamente cuando Traefik ve un nuevo domain en labels
- **Tiempo propagación DNS:** 5-30 min (Cloudflare generalmente es más rápido)
- **Certificado SSL:** Se valida cada 30 días (automático)
- **Respuesta esperada:** Tomar café ☕ y dejar que Traefik + Let's Encrypt hagan su magia

---

**Estado:** 🟡 Listo para ejecutar  
**Próximo agente:** Con acceso Cloudflare + VPS SSH  
**Tiempo total:** ~30 min (incluye espera DNS + cert generation)

---

## SCRIPT AUTOMATIZADO (Opcional)

Si quieres automatizar, crear script:

```bash
#!/bin/bash
# scripts/setup-peskids-domain.sh

set -euo pipefail

DOMAIN="peskids.com"
VPS_IP=$(doppler run -- echo $PLATFORM_VPS_PUBLIC_IP)

log() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*"; }
log "🚀 Setting up $DOMAIN on $VPS_IP"

# Verificar DNS propague
log "⏳ Waiting for DNS propagation..."
for i in {1..30}; do
  if dig $DOMAIN @1.1.1.1 +short | grep -q $VPS_IP; then
    log "✓ DNS propagated"
    break
  fi
  log "  Attempt $i/30..."
  sleep 10
done

# Restart Traefik
log "🔄 Restarting Traefik..."
ssh vps-dragon@100.120.151.91 "cd /opt/opsly && docker-compose -f infra/docker-compose.platform.yml restart traefik"

# Esperar certificado
log "⏳ Waiting for Let's Encrypt certificate..."
for i in {1..60}; do
  if curl -s -o /dev/null -w "%{http_code}" https://$DOMAIN/ | grep -q "200"; then
    log "✓ Certificate issued!"
    break
  fi
  log "  Attempt $i/60..."
  sleep 2
done

# Verificaciones finales
log "✓ Testing endpoints..."
curl -I https://$DOMAIN/
curl -I https://admin.$DOMAIN/
curl https://$DOMAIN/api/health

log "✅ Done! $DOMAIN is live at https://$DOMAIN"
```

Ejecutar:
```bash
chmod +x scripts/setup-peskids-domain.sh
./scripts/setup-peskids-domain.sh
```
