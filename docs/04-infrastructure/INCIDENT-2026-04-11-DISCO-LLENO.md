# Incidente: disco VPS al límite

## Fecha

2026-04-11 (UTC)

## Síntoma

Uso de disco en **`/`** cercano al **99 %** (del orden de **~800 MiB–1,3 GiB libres** en distintas mediciones), con riesgo de fallos en pulls de imágenes, escritura de logs y operaciones Docker.

## Causas contribuyentes

1. **Muchas imágenes Docker** acumuladas (decenas de tags / capas no referenciadas por contenedores en ejecución).
2. **Stacks pesados** en el mismo host (p. ej. Ollama, OpenClaw, observabilidad, múltiples n8n) sobre un volumen de **48 GiB**.
3. **Limpieza y alertas** no aplicadas de forma sistemática hasta el incidente (política y scripts añadidos en el mismo período).

## Resolución

1. **`docker image prune -a -f`** (+ `docker builder prune -a -f`, `docker container prune -f`) ejecutado de forma controlada.
2. **~14 imágenes** eliminadas en el sentido de recuento Docker (47 → 33 imágenes listadas).
3. **Espacio libre** en `df /` pasó a **~9 GiB**; uso **~82 %** (orden **39 GiB usados / 48 GiB**).

Docker reportó **~2 GiB** reclamados en el mensaje del prune; el alivio en **`df`** fue mayor (**~7–8 GiB** de margen recuperado), coherente con capas compartidas y contabilidad del filesystem.

## Tiempo de recuperación

Orden de **tens de minutos** (incl. análisis y documentación).

## Impacto

- **Contenedores en ejecución:** no se forzó `docker rmi` manual sobre imágenes en uso; **no hubo bajada intencionada de servicios** por el prune.
- **API pública:** comprobación **`GET /api/health`** → `ok` tras la intervención.
- **Datos de tenants:** no se ejecutó `docker volume prune` en esta intervención.

## Prevención (en repo)

| Medida                                                          | Ubicación                                                                                     |
| --------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| Limpieza programada (ligera / diaria / agresiva semanal)        | `infra/cron/opsly-cleanup`, `scripts/vps-cleanup-robust.sh`, `scripts/install-vps-cleanup.sh` |
| Alertas por umbral de disco (80 / 90 / 95 %) + Discord opcional | `scripts/disk-alert.sh`                                                                       |
| Política de retención                                           | `docs/RETENTION-POLICY.md`                                                                    |
| Informe de uso de disco                                         | `docs/DISK-USAGE-REPORT.md`                                                                   |
| Servicios pesados (Ollama / OpenClaw / migración)               | `docs/HEAVY-SERVICES-DECISION.md`                                                             |
| Smoke post-cambios                                              | `scripts/verify-platform-smoke.sh`                                                            |

**Instalación en el VPS:** el cron y logrotate requieren **`sudo bash /opt/opsly/scripts/install-vps-cleanup.sh`** si aún no se ejecutó (ver `docs/OPS-CLEANUP-PROCEDURES.md`).

> No se recomienda depender de `mail` a `root` sin MTA configurado; usar **`disk-alert.sh`** + webhook o monitorización externa.

## Métricas (orden de magnitud)

| Métrica                    | Antes (crítico) | Después |
| -------------------------- | --------------- | ------- |
| Uso `df /`                 | ~98–99 %        | ~82 %   |
| Libre                      | ~0,8–1,3 GiB    | ~9 GiB  |
| Imágenes (`docker images`) | 47              | 33      |

## Lecciones

1. **`docker image prune -a`** es la palanca principal cuando hay imágenes huérfanas; evitar `rmi` masivo manual salvo caso concreto.
2. El VPS **48 GiB** no admite sin planificar **todo**: Ollama + OpenClaw + observabilidad + muchos tenants + Opsly.
3. **Alertas y cron** deben quedar instalados en el servidor, no solo en el repo.

## Referencias

- `docs/DISK-USAGE-REPORT.md`
- `docs/HEAVY-SERVICES-DECISION.md`
- `docs/OPS-CLEANUP-PROCEDURES.md`
- `scripts/vps-cleanup-robust.sh`, `scripts/disk-alert.sh`

## Cierre

**Estado:** incidente mitigado; disco en rango operativo. **Seguimiento:** instalar cron de limpieza/alertas en VPS si falta; revisión semanal de `df` y `docker system df`.
