# 🎯 DOMINIO PESKIDS.COM — CHECKLIST EJECUTABLE

**Para:** Agente con acceso Cloudflare + VPS  
**Tiempo:** 30 minutos  
**Dominio:** peskids.com (ya comprado ✅)

---

## PASO 1: CLOUDFLARE DNS (5 min)

```bash
# [ ] Ir a: https://dash.cloudflare.com
# [ ] Login → Add site → peskids.com
# [ ] Copiar nameservers Cloudflare
# [ ] Actualizar registrador con esos nameservers
# [ ] Esperar propagación (5-10 min)

# Verificar DNS está listo
nslookup peskids.com
# Debe mostrar: 157.245.223.7 (aproximadamente)
```

**Registros DNS a crear en Cloudflare:**

| Tipo | Nombre | Apunta a | Proxied |
|------|--------|----------|---------|
| A | peskids.com | `$VPS_IP` | ✅ |
| A | www | `$VPS_IP` | ✅ |
| CNAME | admin | peskids.com | ✅ |

```bash
# Obtener VPS_IP:
doppler run --project ops-intcloudsysops --config prd -- echo $PLATFORM_VPS_PUBLIC_IP
# → Copiar este valor → Pegarlo en Cloudflare como A record
```

---

## PASO 2: TRAEFIK LABELS (10 min)

```bash
# [ ] SSH a VPS
ssh vps-dragon@100.120.151.91

# [ ] Editar docker-compose
cd /opt/opsly
nano infra/docker-compose.platform.yml

# [ ] Buscar sección: services → peskids → labels
# [ ] Agregar reglas para peskids.com (ver PESKIDS-DOMAIN-SETUP.md)
# [ ] Guardar (Ctrl+O, Enter, Ctrl+X)

# [ ] Validar sintaxis
docker-compose -f infra/docker-compose.platform.yml config > /dev/null && echo "✓ Valid"

# [ ] Restart peskids
docker-compose -f infra/docker-compose.platform.yml restart peskids

# [ ] Ver que inicie sin errores
docker-compose -f infra/docker-compose.platform.yml logs --tail=20 peskids
```

---

## PASO 3: CERTIFICADO SSL (5 min, automático)

```bash
# Esperar a que Let's Encrypt genere certificado
# (Traefik lo hace automáticamente)

# Verificar que se generó
docker exec opsly_traefik ls /letsencrypt/acme.json

# Si no existe, revisar logs:
docker logs opsly_traefik | grep -i "certificate\|tls\|ssl"
```

---

## PASO 4: VERIFICACIÓN (5 min)

```bash
# Test 1: DNS resuelve
dig peskids.com +short
# Esperado: 157.245.223.7 (IP del VPS)

# Test 2: App carga
curl -I https://peskids.com/
# Esperado: HTTP/2 200 (después de ~30s)

# Test 3: Admin
curl -I https://admin.peskids.com/
# Esperado: HTTP/2 200

# Test 4: API health
curl https://peskids.com/api/health
# Esperado: {"status":"ok"} o {"ok":true}

# Test 5: SSL válido (en navegador o curl)
curl -I https://peskids.com/ 2>&1 | head -10
# Debe decir: "SSL certificate verify ok"
```

---

## PASO 5: CÓDIGO (5 min, OPCIONAL)

```bash
# Si quieren usar env vars en lugar de hardcoded URLs:

# [ ] Agregar en Doppler (ops-intcloudsysops/prd):
#     PESKIDS_DOMAIN=peskids.com

# [ ] Actualizar código en apps/peskids:
#     const domain = process.env.PESKIDS_DOMAIN || 'peskids.com'
#     const adminUrl = `https://admin.${domain}`

# [ ] Commit + push
```

---

## ⚠️ PROBLEMAS COMUNES

| Problema | Solución |
|----------|----------|
| `ERR_CERT_AUTHORITY_INVALID` | Esperar 30-60s para Let's Encrypt. Recargar. |
| `Connection timed out` | Verificar Cloudflare DNS: `dig peskids.com @1.1.1.1` |
| `404 Not Found` | Revisar logs Traefik: `docker logs opsly_traefik \| tail -20` |
| DNS no propaga | Revisar registrador, nameservers configurados correctamente |

---

## ✅ CHECKLIST FINAL

```
Cloudflare
☐ Dominio agregado a Cloudflare
☐ Nameservers actualizados en registrador
☐ Registros A y CNAME creados
☐ DNS propaga (dig peskids.com)

Traefik
☐ Labels actualizados en docker-compose.platform.yml
☐ Sintaxis validada (docker-compose config)
☐ Container peskids restarted
☐ Logs sin errores

SSL/TLS
☐ Let's Encrypt genera certificado (esperar 30-60s)
☐ curl https://peskids.com/ retorna 200

Verificación Final
☐ https://peskids.com carga app (navegador)
☐ https://admin.peskids.com carga admin
☐ https://peskids.com/api/health OK
☐ SSL certificate válido (sin warnings)
```

---

## 🚀 RESUMEN

1. **Cloudflare:** Agregar registros DNS
2. **Traefik:** Actualizar labels en docker-compose
3. **Restart:** Docker restart peskids
4. **Wait:** Let's Encrypt genera certificado (automático)
5. **Test:** curl https://peskids.com/

**⏱️ Total: ~30 minutos**

---

Documentación completa: `PESKIDS-DOMAIN-SETUP.md`
