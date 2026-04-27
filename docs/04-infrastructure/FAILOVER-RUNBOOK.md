# Runbook — Failover y alta disponibilidad (Opsly)

## Estado actual (staging / plataforma típica)

- **Un solo VPS** de aplicación (Traefik, API, portal, Redis interno, etc.) — ver `AGENTS.md` / `VISION.md`.
- **Cloudflare** suele usarse como **Proxy (naranja)** y DNS, **no** como Load Balancer multi-origen salvo que lo contrates y configures en la cuenta.
- Un **failover automático de tráfico a un segundo servidor** solo es real si existen:
  - **Segundo origen** (otro VPS o stack) con el **mismo contrato** (TLS, datos, Redis/BullMQ — implica diseño de datos y RTO/RPO).
  - **Load Balancing** en Cloudflare (u otro edge) con **pools/orígenes** y health checks, **o** procedimiento manual de DNS.

Este documento describe **detección**, **alerta** y **pasos manuales**. La automatización vía API de Cloudflare **no** está activa por defecto en el repo (variables y rutas de API dependen de tu cuenta y plan).

**Standby en GCP (opcional):** arquitectura y scripts en [`FAILOVER-GCP-ARCHITECTURE.md`](FAILOVER-GCP-ARCHITECTURE.md) y [`GCP-STANDBY-CONFIG.md`](GCP-STANDBY-CONFIG.md).

---

## Detección (operador)

| Señal         | Qué mirar                                                             |
| ------------- | --------------------------------------------------------------------- |
| API caída     | `curl -sf --max-time 15 "https://api.${PLATFORM_DOMAIN}/api/health"`  |
| SSH admin     | Solo Tailscale: `ssh vps-dragon@100.120.151.91` (no IP pública SSH)   |
| Traefik / app | En el VPS: `docker compose ... ps`, logs `infra-app-*`                |
| Cola BullMQ   | Redis caído → orchestrator afectado; no es “failover DNS” por sí solo |

---

## Procedimiento manual si el primario no responde

1. **Confirmar** incidente (health + SSH + panel proveedor VPS).
2. **Comunicar** canal acordado (p. ej. Discord `#ops-alerts` vía `scripts/notify-discord.sh`).
3. Si **no** hay segundo origen listo: foco en **recuperar el mismo VPS** (reinicio controlado, disco, Traefik, `docker compose up`).
4. Si **sí** hay segundo origen y LB en Cloudflare: en el **dashboard** o con API **documentada en tu cuenta**, cambiar pesos / deshabilitar origen enfermo (ver [Load Balancing](https://developers.cloudflare.com/load-balancing/)).
5. Tras recuperación, **post-mortem** (causa, tiempo de detección, tiempo de recuperación).

No copies rutas `curl` genéricas a la API de Cloudflare sin verificar **Account ID**, **Zone**, **Pool ID** y token con permisos en la documentación actual.

---

## Monitor opcional (repo)

- Script: `scripts/failover-monitor.sh` — health + SSH + alertas Discord; failover Cloudflare **solo** si `FAILOVER_AUTO_CF=true` y config válida (desactivado por defecto).
- Manual API: `scripts/trigger-failover-manual.sh` (mismas variables; revisar respuesta `jq` en Cloudflare).
- Plantilla env: `config/failover-monitor.env.example`.
- Unidad de ejemplo: `infra/systemd/opsly-failover-monitor.service.example`.
- JSON de ejemplo: `infra/cloudflare-lb-config.json.example`, `infra/failover-vps-info.json.example`.

---

## Recuperación hacia el primario (cuando exista segundo nodo)

Solo aplicable si tuviste **replicación** o backups coherentes:

1. Verificar primario estable (health, contenedores, TLS).
2. **Datos** (Postgres/Supabase, Redis): la estrategia depende del diseño; **no** asumir `BGSAVE` cruzado sin runbook propio validado.
3. Volver a dirigir tráfico al primario en el LB/DNS cuando corresponda.

---

## Contactos y enlaces

- Runbook Cloudflare Proxy: `docs/CLOUDFLARE-PROXY-ACTIVATION.md`
- Mitigaciones red: `docs/SECURITY-MITIGATIONS-2026-04-09.md`
- Estado producto: `AGENTS.md`

| Métrica   | Objetivo orientativo                               |
| --------- | -------------------------------------------------- |
| Detección | Depende del intervalo del monitor (p. ej. 30–60 s) |
| RTO/RPO   | Definir por negocio cuando exista segundo origen   |

---

## Post-mortem (recomendado)

1. Causa raíz
2. Tiempo de detección y de recuperación
3. Acciones para evitar repetición
