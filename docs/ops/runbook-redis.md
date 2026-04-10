# Redis Password Rotation (Low Downtime)

Este runbook rota la credencial de Redis minimizando impacto en `GET /api/portal/billing/summary` y en el metering en tiempo real.

## Objetivo

- Rotar credencial por incidente o hardening.
- Mantener servicio activo durante el cambio.
- Tener rollback corto y explícito.

## Supuestos

- Redis instalado en VPS Linux (Ubuntu/Debian).
- Config principal: `/etc/redis/redis.conf`.
- Snippet Opsly: `/etc/redis/opsly-billing.conf`.
- Password actual guardada en `/root/.redis-opsly-password`.
- App usa `REDIS_URL=redis://:PASSWORD@HOST:6379`.

## 0) Pre-checks

```bash
set -euo pipefail

sudo systemctl is-active redis-server
sudo test -f /etc/redis/opsly-billing.conf
sudo test -f /root/.redis-opsly-password
```

## 1) Backup rápido de configuración

```bash
set -euo pipefail

TS="$(date -u +%Y%m%dT%H%M%SZ)"
sudo cp /etc/redis/opsly-billing.conf "/etc/redis/opsly-billing.conf.bak-${TS}"
echo "Backup: /etc/redis/opsly-billing.conf.bak-${TS}"
```

## 2) Generar nueva password (sin aplicar todavía)

```bash
set -euo pipefail

NEW_PASS="$(openssl rand -hex 24)"
echo "Nueva password generada en memoria."
```

## 3) Aplicar nueva credencial en Redis

Redis OSS usa una sola `requirepass`; el cutover real requiere reload/restart.

```bash
set -euo pipefail

sudo sed -i -E "s|^requirepass .*$|requirepass ${NEW_PASS}|g" /etc/redis/opsly-billing.conf
sudo systemctl restart redis-server
sudo systemctl is-active --quiet redis-server
```

## 4) Validar autenticación nueva

```bash
set -euo pipefail

export REDISCLI_AUTH="${NEW_PASS}"
redis-cli --no-auth-warning -h 127.0.0.1 -p 6379 ping
unset REDISCLI_AUTH
```

Esperado: `PONG`.

## 5) Actualizar secreto de aplicación (Vercel/Doppler)

Formato:

```bash
redis://:${NEW_PASS}@IP_DEL_VPS:6379
```

Acción:

- Actualiza `REDIS_URL` en Vercel (y/o Doppler si aplica).
- Ejecuta redeploy de la API para consumir el nuevo secreto.

## 6) Persistir nueva password local del VPS

```bash
set -euo pipefail

printf "%s\n" "${NEW_PASS}" | sudo tee /root/.redis-opsly-password >/dev/null
sudo chmod 600 /root/.redis-opsly-password
```

## 7) Verificación post-cutover

```bash
set -euo pipefail

# 1) Redis local responde
export REDISCLI_AUTH="$(sudo cat /root/.redis-opsly-password)"
redis-cli --no-auth-warning -h 127.0.0.1 -p 6379 ping
unset REDISCLI_AUTH

# 2) Endpoint responde 200 (usa token real)
curl -i "https://api.TU_DOMINIO/api/portal/billing/summary" \
  -H "Authorization: Bearer TU_PORTAL_JWT"
```

Si en logs aparece:

`[BILLING WARNING] Redis unreachable. Real-time billing disabled. Data may be delayed.`

entonces el `REDIS_URL` de la app no coincide con la credencial nueva o hay bloqueo de red/firewall.

## Rollback (rápido)

Si falla autenticación tras reinicio:

```bash
set -euo pipefail

# Sustituye por tu backup más reciente
sudo cp /etc/redis/opsly-billing.conf.bak-YYYYMMDDTHHMMSSZ /etc/redis/opsly-billing.conf
sudo systemctl restart redis-server
sudo systemctl is-active --quiet redis-server
```

Después:

- Reaplica `REDIS_URL` previa en Vercel/Doppler.
- Redeploy.

## Nota de seguridad

Si Redis está en `0.0.0.0`, no dejes `6379/tcp` abierto globalmente en producción. Restringe por IP de salida (Vercel/VPN/Tailscale) en UFW o firewall perimetral.
