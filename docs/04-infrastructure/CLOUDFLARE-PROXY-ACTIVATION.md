# Cloudflare Proxy — Runbook de activación

> Cubre: activar Proxy (nube naranja) para `*.ops.smiletripcare.com`,
> verificar que Traefik obtiene TLS por `dnsChallenge` y que la IP origen queda oculta.

## Por qué es necesario

Sin Cloudflare Proxy ON, la IP pública del VPS (`157.245.223.7`) queda expuesta en DNS.
Con Proxy ON:

- La IP origen queda **oculta** a atacantes.
- Cloudflare actúa como **WAF** y absorbe ataques DDoS.
- Traefik sigue resolviendo TLS mediante `dnsChallenge` (no `httpChallenge`), lo que funciona
  **detrás de proxy** ya que la verificación ocurre en DNS y no en HTTP.

---

## Prerequisitos

| Requisito                                                                    | Dónde verificar                                |
| ---------------------------------------------------------------------------- | ---------------------------------------------- |
| `CF_DNS_API_TOKEN` en Doppler `prd`                                          | `doppler secrets get CF_DNS_API_TOKEN --plain` |
| Traefik config usa `dnsChallenge.provider: cloudflare`                       | `infra/traefik/traefik.yml`                    |
| `CF_DNS_API_TOKEN` en entorno del contenedor Traefik                         | `infra/docker-compose.platform.yml`            |
| Token CF tiene permisos **Zone:DNS:Edit** en la zona `ops.smiletripcare.com` | Dashboard CF → Profile → API Tokens            |

---

## DNS autoritativo y ACME (bloqueo típico)

Traefik usa **`dnsChallenge` con provider Cloudflare**: Let's Encrypt pide un registro TXT y Traefik lo crea vía **API de Cloudflare** en la zona gestionada ahí.

Si **`dig NS ops.smiletripcare.com`** (o el dominio base que uses) **no** devuelve nameservers de Cloudflare (p. ej. solo `ns1.vercel-dns.com`), la zona pública **no** está en Cloudflare: el token `CF_DNS_API_TOKEN` **no puede** crear los TXT necesarios y verás errores ACME del tipo *Unable to obtain certificate* aunque el token sea válido.

**Opciones:**

1. **Delegar DNS a Cloudflare** para ese dominio (o subzona), crear la zona en Cloudflare y apuntar los NS en el registrador — alineado con este runbook y `infra/traefik/traefik.yml`.
2. **Mantener DNS en otro proveedor (p. ej. Vercel)** y cambiar la estrategia de certificados: por ejemplo `httpChallenge` / TLS-ALPN en Traefik si el puerto 443 llega al origen, u otro borde TLS; no depender de `CF_DNS_API_TOKEN` para esa zona.

Ver también [DOMAIN-CUTOVER-OP-SLY.md](DOMAIN-CUTOVER-OP-SLY.md) (cutover con NS en Cloudflare).

---

## Crear el CF API Token (una sola vez)

1. Ir a **Cloudflare Dashboard → Profile → API Tokens → Create Token**.
2. Usar plantilla **"Edit zone DNS"**.
3. En _Zone Resources_: seleccionar `smiletripcare.com`.
4. Guardar el token generado.
5. Cargarlo en Doppler:

```bash
doppler secrets set CF_DNS_API_TOKEN --project ops-intcloudsysops --config prd
# pegarlo cuando pregunte (stdin)
```

---

## Activar Proxy ON en Cloudflare Dashboard

> Esto **no se puede automatizar** por código (requiere autenticación humana en CF dashboard).

1. Ir a **Cloudflare Dashboard → smiletripcare.com → DNS → Records**.
2. Por cada registro que apunte a `157.245.223.7`:
   - `ops` (`A` → IP)
   - `*.ops` (`A` → IP)
   - `api.ops`, `admin.ops`, `portal.ops`, `web.ops` (si son registros explícitos)
3. Hacer clic en la **nube gris** → cambiar a **nube naranja** (Proxy: ON).
4. Guardar.

---

## Verificar que Proxy está activo

```bash
# Debe aparecer IPs de Cloudflare (103.x.x.x / 104.x.x.x), NO 157.245.223.7
dig +short api.ops.smiletripcare.com

# Debe incluir el header CF-RAY en la respuesta
curl -sI https://api.ops.smiletripcare.com/api/health | grep -i cf-ray
```

Respuesta esperada:

```
cf-ray: 8a1b2c3d4e5f6789-MAD
```

---

## Verificar TLS dnsChallenge desde el VPS

```bash
ssh vps-dragon@100.120.151.91 "docker logs infra-traefik-1 2>&1 | grep -E 'certificate|ACME|dnsChallenge|error' | tail -20"
```

Traefik hace la validación ACME vía DNS en lugar de HTTP, por lo que Cloudflare Proxy no lo bloquea.

---

## Reconstruir contenedor Traefik tras añadir `CF_DNS_API_TOKEN`

Si el token se añadió **después** del último `compose up`:

Desde el directorio del repo en el VPS, Compose debe leer **`/opt/opsly/.env`** (las variables `${CF_DNS_API_TOKEN}` se interpolan al crear el contenedor; sin `--env-file` suele aparecer el warning *Defaulting to a blank string*):

```bash
ssh vps-dragon@100.120.151.91 "cd /opt/opsly && docker compose --env-file /opt/opsly/.env -f infra/docker-compose.platform.yml up -d --force-recreate traefik"
```

Alternativa si el VPS tiene Doppler configurado con scope en `/opt/opsly`:

```bash
ssh vps-dragon@100.120.151.91 "cd /opt/opsly && doppler run -- docker compose --env-file /opt/opsly/.env -f infra/docker-compose.platform.yml up -d --force-recreate traefik"
```

---

## Firewall VPS — bloquear acceso directo al origen

Una vez Proxy activo, solo Cloudflare debe alcanzar el VPS en puertos 80/443:

```bash
# Ejecutar en VPS (o via scripts/vps-secure.sh)
sudo ufw default deny incoming
sudo ufw allow from 100.64.0.0/10 to any port 22 proto tcp   # Tailscale
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

Con esto, cualquier acceso directo a `157.245.223.7:443` sin pasar por Cloudflare será rechazado.
Opcional (más restrictivo): limitar 80/443 solo a IPs de Cloudflare:
https://www.cloudflare.com/ips/

---

## Estado del checklist de seguridad

Tras completar esta guía, marcar en `docs/SECURITY_CHECKLIST.md`:

- `[x]` Cloudflare Proxy ON para `*.ops.smiletripcare.com`
- `[x]` `CF_DNS_API_TOKEN` en Doppler `prd`
- `[x]` Traefik `api.insecure: false` (sin dashboard expuesto)
- `[x]` UFW: SSH solo Tailscale, 80/443 públicos
