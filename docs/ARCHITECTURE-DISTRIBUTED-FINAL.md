# Arquitectura distribuida — Opsly (objetivo)

> **Alcance:** diseño objetivo para aliviar el VPS (disco/RAM) moviendo **carga pesada de inferencia y workers** a un nodo secundario (p. ej. **Mac 2011 + Ubuntu** en Tailscale). Alineado con `docs/HEAVY-SERVICES-DECISION.md` y `config/opsly.config.json`.  
> **IPs de ejemplo** (Tailscale): VPS `100.120.151.91`, worker `100.80.41.29` — verificar con `tailscale status` antes de operar.

## Diagrama general

```
┌─────────────────────────────────────────────────────────────┐
│                    ARQUITECTURA OPSLY                        │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  INTERNET                                                    │
│     │                                                        │
│     ▼                                                        │
│  CLOUDFLARE (DNS + proxy recomendado)                        │
│     │                                                        │
│     ▼                                                        │
│  VPS PRINCIPAL (edge público; IP en opsly.config)            │
│     ├── API Next.js (:3000) — app                            │
│     ├── Admin (:3001)                                        │
│     ├── Portal (:3002)                                       │
│     ├── Redis (:6379) — solo red interna / no público      │
│     ├── Traefik (:80, :443)                                  │
│     ├── Tenants: n8n + Uptime por slug                       │
│     └── Servicios plataforma (según compose desplegado)      │
│     │                                                        │
│     │  TAILSCALE (capa administrativa / worker)              │
│     ▼                                                        │
│  MAC 2011 WORKER (opsly-mac2011)                             │
│     ├── Orchestrator worker (proceso Node / tmux)            │
│     ├── Ollama (:11434) — si inferencia local                │
│     ├── Carga experimental / OpenClaw (si aplica)          │
│     └── Opcional: builds locales de apps Opsly               │
│                                                              │
│  Nota: LLM Gateway / MCP / Context Builder en compose        │
│  usan puertos internos 3010 / 3003 / 3012 (ver tabla).      │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## Responsabilidades por nodo

### VPS (control plane + edge)

| Rol | Contenido típico |
|-----|-------------------|
| API pública | `apps/api`, HTTPS vía Traefik |
| Redis + BullMQ | Colas; **no** exponer `6379` a Internet |
| Traefik | TLS, routers por host |
| Admin / Portal | Dashboards cliente y operador |
| Tenants | Stacks `n8n` / Uptime por `tenant_<slug>` |

### Worker Mac 2011 (data plane / workers)

| Rol | Contenido típico |
|-----|-------------------|
| Workers BullMQ | Procesos que consumen Redis del VPS (`REDIS_URL` en `.env.worker`) |
| Ollama (opcional) | Modelos locales; gran consumo de disco en el VPS si se co-ubica |
| OpenClaw / labs | Solo si el producto lo exige; preferir imagen y versión alineadas al VPS |

**Referencias:** `docs/WORKER-SETUP-MAC2011.md`, `scripts/start-workers-mac2011.sh`.

## Puertos canónicos (monorepo)

Evitar confusiones con el borrador “3001 = LLM Gateway”: en **`infra/docker-compose.platform.yml`** el **Admin** usa **3001** en su servicio; el **LLM Gateway** escucha en **3010** dentro de la red Docker.

| Servicio | Puerto interno (compose) | Notas |
|----------|---------------------------|--------|
| API (`app`) | 3000 | |
| Admin | 3001 | |
| Portal | 3002 | |
| MCP | 3003 | Traefik `mcp.${PLATFORM_DOMAIN}` |
| LLM Gateway | 3010 | `ORCHESTRATOR_LLM_GATEWAY_URL` → `http://llm-gateway:3010` |
| Orchestrator (health) | 3011 | |
| Context Builder | 3012 | |
| Ollama (típico) | 11434 | Solo si se despliega |

Si se **mueve** LLM Gateway / MCP / Context Builder al worker, hay que **reapuntar** variables de entorno y DNS/Traefik; no basta con copiar puertos del diagrama antiguo.

## Flujo de datos (simplificado)

```
Usuario → Traefik → API (VPS)
                         │
                         ▼
                    Redis (VPS, autenticado)
                         │
                         ▼
              Worker Mac 2011 (BullMQ) → LLM / herramientas
                         │
                         ▼
              Respuesta vía jobs / API según diseño
```

La ruta exacta depende de si el orchestrator y el LLM Gateway siguen en el VPS o se colocan en el worker; la regla de producto es: **todo tráfico LLM a través del LLM Gateway** (ver `VISION.md` / OpenClaw).

## Recursos (orden de magnitud)

| Nodo | Disco | RAM | Observación |
|------|-------|-----|-------------|
| VPS DO | 48 GiB | ~4 GiB | Crítico si se acumulan imágenes Docker |
| Mac 2011 (ejemplo medido) | ~200 GiB+ libre típico | 16 GiB | Adecuado para modelos y workers |

## Comunicación

### Tailscale

- **VPS:** IP Tailscale del host (ej. `100.120.151.91`).
- **Worker:** `100.80.41.29` (`opsly-mac2011`).

### Seguridad

- **Redis:** usar `REDIS_URL` con contraseña (misma que Doppler `prd`); conexión solo por **Tailscale** o red privada, **nunca** `0.0.0.0:6379` en IP pública.
- **Servicios internos** (Ollama, LLM en worker): restringir a Tailscale o firewall local.

### Exposición pública (opcional)

Si se publica Ollama u OpenClaw por HTTPS, usar **Traefik en el VPS** con backend `http://<tailscale-ip-worker>:<puerto>` y **DNS** en `*.${PLATFORM_DOMAIN}`; validar certificados y política de acceso (no abrir APIs sin auth).

## Escalabilidad

### Si el VPS vuelve a llenarse

1. Política de limpieza: `docs/OPS-CLEANUP-PROCEDURES.md`, `scripts/vps-cleanup-robust.sh`.
2. Mover imágenes pesadas (Ollama, OpenClaw) al worker o eliminarlas del host de producción.
3. Ampliar volumen en el proveedor o segregar observabilidad.

### Si el worker se satura

1. Reducir concurrencia (`WORKER_CONCURRENCY`).
2. Modelos Ollama más pequeños o inferencia en cloud vía LLM Gateway.
3. Añadir otro nodo worker con el mismo patrón Redis.

## Costes (indicativos)

| Concepto | Notas |
|----------|--------|
| VPS | Plan actual (DigitalOcean, etc.) |
| Mac 2011 | Hardware existente |
| Cloud opcional | Solo si se añade failover o inferencia gestionada |

**Totales:** no fijar cifras en doc; dependen del plan y región.

## Estado de implementación

| Ítem | Estado |
|------|--------|
| Documentación objetivo | Este archivo |
| Worker BullMQ en Mac 2011 | Guía viva `WORKER-SETUP-MAC2011.md` |
| Migración Ollama/OpenClaw/compose al worker | **Manual**, ventana de mantenimiento; seguir `HEAVY-SERVICES-DECISION.md` |

## Referencias

- `docs/HEAVY-SERVICES-DECISION.md`
- `docs/DISK-USAGE-REPORT.md`
- `docs/WORKER-SETUP-MAC2011.md`
- `infra/docker-compose.platform.yml`
