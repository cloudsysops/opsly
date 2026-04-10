# Ingestion Bunker (`@intcloudsysops/ingestion-service`)

Servicio **ligero** (Express, sin Next.js) que recibe webhooks y eventos y los **enciola en BullMQ** en el mismo Redis que Opsly. No ejecuta lógica de negocio.

## Colas

| Cola | Uso |
|------|-----|
| `webhooks-processing` | `POST /ingest/stripe` (cuerpo crudo) |
| `general-events` | `POST /ingest/event` (`type`, `tenantId`, `data`) |

El **orchestrator** consume ambas colas: verifica Stripe y reenvía a la API interna; los eventos generales se registran o reenvían (ver `OPSLY_GENERAL_EVENTS_FORWARD_URL`).

## Variables de entorno

| Variable | Descripción |
|----------|-------------|
| `PORT` o `INGESTION_PORT` | Puerto HTTP (default **3040**) |
| `REDIS_URL` | Misma URL que `app` / orchestrator (ej. `redis://:PASS@redis:6379/0`) |
| `REDIS_PASSWORD` | Debe coincidir con el Redis de plataforma |

## Ejecución local

```bash
cd apps/ingestion-service
export REDIS_URL=redis://127.0.0.1:6379
export REDIS_PASSWORD=
npm install
npm start
```

## VPS con systemd

Copiar `infra/systemd/ingestion-bunker.service.example` a `/etc/systemd/system/ingestion-bunker.service`, ajustar `User`/`WorkingDirectory` y:

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now ingestion-bunker.service
```

`EnvironmentFile` debe apuntar al `.env` con **el mismo `REDIS_URL`** que el resto de Opsly.

## Docker Compose

Ver servicio `ingestion-bunker` en `infra/docker-compose.platform.yml` y URL pública opcional `https://ingest.<PLATFORM_DOMAIN>` (Traefik).

### Stripe

Configura en el dashboard de Stripe el endpoint de emergencia, por ejemplo:

`https://ingest.<tu-dominio>/ingest/stripe`

Así los eventos se acumulan en Redis aunque `api.*` no responda; al recuperarse la API, el orchestrator reenvía los jobs.
