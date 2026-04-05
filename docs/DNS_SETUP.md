# DNS Setup para Opsly

Guía para apuntar tu dominio al VPS de producción (`157.245.223.7`) y habilitar certificados Let’s Encrypt vía Traefik.

## Registros recomendados (resumen)

| Host / tipo | Valor | Uso |
|-------------|--------|-----|
| `@` (raíz) | `157.245.223.7` | Opcional: marketing o redirect |
| `api` | `157.245.223.7` | API Opsly (`api.TUDOMINIO`) |
| `admin` | `157.245.223.7` | Panel admin (`admin.TUDOMINIO`) |
| `traefik` | `157.245.223.7` | Dashboard Traefik con BasicAuth (`traefik.TUDOMINIO`) |
| `*` (wildcard) | `157.245.223.7` | Tenants `n8n-<slug>.TUDOMINIO`, `uptime-<slug>.TUDOMINIO`, etc. |

Los nombres `n8n-*` y `uptime-*` **no** se crean uno a uno: un único registro **wildcard** `*.tudominio.com` cubre todos los subdominios de tenants.

## Opción A — DigitalOcean DNS (recomendado si el dominio está en DO)

1. En [DigitalOcean → Networking → Domains](https://cloud.digitalocean.com/networking/domains), añade el dominio o ábrelo si ya existe.
2. En **Records**, crea registros **A**:
   - **Hostname** `@` → **Will direct to** `157.245.223.7`
   - **Hostname** `api` → `157.245.223.7`
   - **Hostname** `admin` → `157.245.223.7`
   - **Hostname** `traefik` → `157.245.223.7`
   - **Hostname** `*` (wildcard) → `157.245.223.7`  
     Si el panel no permite `*` en la raíz del dominio, usa **CNAME** según documentación DO o delega el subdominio `tenants.tudominio.com` con su propio wildcard.
3. TTL: 300 s (5 min) o el mínimo permitido durante el cutover.

## Opción B — Cloudflare (recomendado para wildcard + mitigación DDoS)

1. Añade el dominio en Cloudflare y usa los nameservers que indiquen.
2. Crea los mismos registros **A** (`@`, `api`, `admin`, `traefik`, `*` → `157.245.223.7`).
3. Proxy (nube naranja): puedes activarlo para `api` / `admin` si aceptas que Cloudflare termine TLS delante del origen; Traefik seguirá sirviendo HTTPS en el VPS.
4. **SSL/TLS → Overview**: modo **Full (strict)** si el origen presenta certificado válido (Let’s Encrypt en Traefik). Con proxy naranja, suele usarse **Full** mientras el cert del origen sea de una CA reconocida.

## Verificar propagación

Sustituye `TUDOMINIO` por tu dominio raíz (ej. `opsly.example.com` si usas subdominio raíz, o `example.com`).

```bash
dig api.TUDOMINIO +short          # → 157.245.223.7
dig admin.TUDOMINIO +short        # → 157.245.223.7
dig traefik.TUDOMINIO +short      # → 157.245.223.7
dig tenant-test.TUDOMINIO +short  # con wildcard, cualquier host → 157.245.223.7
curl -sI --max-time 10 "http://TUDOMINIO" | head -5   # debe haber respuesta HTTP (200, 301, 404, etc.)
```

## Tiempos de propagación

| Proveedor | Orden de magnitud |
|-----------|-------------------|
| DigitalOcean DNS | 5–30 minutos |
| Cloudflare (sin caché agresiva) | suele ser casi inmediato |
| Registradores / DNS externos | hasta 48 h en casos raros |

## Nota sobre el VPS

El edge en `:80` y `:443` lo atiende normalmente **Traefik** (u otro proxy en Docker). No hace falta instalar nginx en el host si todo el routing va por Traefik.
