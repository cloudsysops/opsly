# Política de retención de datos — Opsly

Documento de referencia para operación y cumplimiento. Los valores son **objetivos**; la automatización concreta está en `scripts/vps-cleanup-robust.sh` y cron (ver `docs/OPS-CLEANUP-PROCEDURES.md`).

## Principio general

Conservar lo necesario para operar y auditar; eliminar de forma controlada lo que no aporta valor o ya cumplió su propósito, sin tocar datos de tenants activos salvo proceso documentado.

## Logs

| Tipo | Retención objetivo | Notas |
|------|-------------------|--------|
| Sistema (`/var/log/*.log`) | 7 días | Limpieza en script robusto |
| Journal (systemd) | 3 días | `journalctl --vacuum-time=3d` |
| Logs `.gz` en `/var/log` | 3 días | Script robusto |
| Logs de contenedor Docker | Depende del driver | Rotación: `max-size`/`max-file` en compose si hace falta |
| Logs de app (API Next, etc.) | 30 días | Objetivo; implementar rotación por servicio si el volumen crece |

## Imágenes y capas Docker

| Tipo | Política |
|------|----------|
| Imágenes no usadas | `docker image prune -a --filter until=168h` (7 días) en limpieza programada |
| Build cache | `docker builder prune -a` en cada pasada |
| Imágenes “de release” | Mantener las referenciadas por contenedores; el resto cae en prune |

## Contenedores y volúmenes

| Estado | Acción |
|--------|--------|
| Contenedores parados | `docker container prune -f` |
| Volúmenes huérfanos | Solo con `--aggressive` (`docker volume prune`) — **revisar antes** en entornos con datos |

## Backups

| Tipo | Retención sugerida | Notas |
|------|-------------------|--------|
| Backups diarios | 7 días | Ajustar según `scripts/backup*.sh` / runbooks |
| Semanales | 4 semanas | — |
| Mensuales / anuales | Según compliance | No automatizado en este documento |

## Datos de tenants

| Situación | Retención |
|-----------|-----------|
| Tenant activo | Datos de producción según producto |
| Suspendido / offboarding | Definir en proceso legal y Supabase (no en script de disco) |

## Temporales y cachés

| Ubicación | Política en script |
|-----------|---------------------|
| `/tmp`, `/var/tmp` | Archivos con mtime +7 días |
| pip (root) | Limpieza best-effort |
| apt | `apt-get clean` |
| npm (contenedores app) | `npm cache clean` en `infra-app-*`, `opsly_portal`, `opsly_admin` |

## Frecuencia recomendada (implementación en repo)

| Tarea | Frecuencia | Archivo |
|-------|------------|---------|
| Limpieza ligera (solo Docker) | Cada 6 h | `infra/cron/opsly-cleanup` |
| Limpieza completa | Diaria 03:00 UTC | mismo |
| Limpieza agresiva (+ volúmenes) | Semanal domingo 04:00 UTC | mismo |
| Alerta disco | Cada 5 min | mismo + `scripts/disk-alert.sh` |

## Excepciones (no borrar con estos scripts)

- `/opt/opsly/.env`, `config/*` versionado
- Volúmenes de bases de datos en uso (no ejecutar `volume prune` sin revisión)
- Certificados y claves SSH
- Backups explícitamente fuera de rutas de limpieza

## Monitoreo

- **≥80%** uso en `/`: aviso (`disk-alert.sh`)
- **≥90%**: crítico
- **≥95%**: emergencia + intento de `vps-cleanup-robust.sh --aggressive`

## Historial

| Fecha | Cambio |
|-------|--------|
| 2026-04-11 | Política inicial alineada a scripts `vps-cleanup-robust.sh` y `disk-alert.sh` |

## Referencias

- `docs/OPS-CLEANUP-PROCEDURES.md`
- `scripts/vps-cleanup-robust.sh`, `scripts/disk-alert.sh`
- `infra/cron/opsly-cleanup`, `infra/cron/logrotate-opsly-cleanup.conf`
