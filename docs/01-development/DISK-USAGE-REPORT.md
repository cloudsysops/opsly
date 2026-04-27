# Informe de uso de disco — VPS Opsly

**Instantánea:** 2026-04-11 (comandos vía SSH `vps-dragon@100.120.151.91`).  
**SO:** Ubuntu 24.04.4 LTS, kernel 6.8.

## Resumen global

| Métrica              | Valor medido (instantánea inicial)                                 |
| -------------------- | ------------------------------------------------------------------ |
| **Disco raíz (`/`)** | **48 G** totales (`/dev/vda1`)                                     |
| **Usado**            | **47 G (~99 %)**                                                   |
| **Libre**            | **~847 MiB**                                                       |
| **Estado**           | **Crítico** — riesgo inmediato de fallos (pulls, logs, escrituras) |

> **Post‑limpieza (2026‑04‑11):** ~**39 G usados / ~9 G libres (~82 %)** — ver sección **Actualización** al final.

> Nota: el volumen es **48 G**, no 50 G; el proveedor puede mostrar redondeos distintos en la UI.

## Top categorías (orden aproximado por impacto)

1. **Docker (imágenes + metadatos)** — **`docker system df`:** **~37,76 G** solo en **imágenes**; **~25,47 G marcados como reclaimable** (67 %) si se hace prune de imágenes no usadas. Contenedores en ejecución: **290,5 MiB** acumulados; volúmenes locales **~972,6 MiB** (~22 MiB reclaimable). Build cache: **0 B** en el momento del muestreo.
2. **`/home`** — **~3,7 G** (`du -sh /*` como usuario).
3. **`/usr`** — **~2,7 G**.
4. **Swap** — **`/swapfile` ~2,1 G** (no es “basura”; no borrar salvo rediseño de memoria).
5. **`/var`** — **~1,6 G** en el árbol visible; **subestimado**: gran parte del almacenamiento de Docker está bajo `/var/lib/docker` y **no se pudo medir con `du` sin `sudo`** en esta sesión.
6. **`/opt/opsly` (repo git)** — **~23 M** (código, docs, lockfile; **no** incluye capas Docker).
7. **`/var/cache/apt`** — **~453 M**.
8. **Journal systemd** — **`journalctl --disk-usage`:** **~61,6 M**.
9. **`/tmp` + `/var/tmp`** — decenas de KiB en el momento del muestreo.
10. **Contenedores** — **37** en ejecución; capas anónimas pequeñas en `docker ps -s` (orden KB–MB salvo datos n8n ~54 M por instancia).

## Docker — desglose útil (datos reales)

### `docker system df` (resumen)

```
TYPE            TOTAL     ACTIVE    SIZE      RECLAIMABLE
Images          47        27        37.76GB   25.47GB (67%)
Containers      37        37        290.5MB   0B (0%)
Local Volumes   25        21        972.6MB   22.02MB (2%)
Build Cache     0         0         0B        0B
```

- **47 imágenes**, **27** “activas” (referenciadas por contenedores existentes): hay **~20 imágenes** candidatas a desreferenciar tras prune / revisión manual.
- El espacio **reclamable en imágenes (~25,5 G)** es la palanca principal para recuperar gigabytes **sin tocar volúmenes de datos** (salvo que borres imágenes aún referenciadas por tags huérfanos — usar prune con criterio).

### Imágenes más grandes (orden por tamaño declarado)

| Tamaño (aprox.) | Imagen                                                                   |
| --------------- | ------------------------------------------------------------------------ |
| **9,7 G**       | `ollama/ollama:latest`                                                   |
| **4,62 G**      | `ghcr.io/openclaw/openclaw:latest`                                       |
| **2,01 G**      | `n8nio/n8n:latest` y `n8nio/n8n:2.13.4` (duplicado de versión)           |
| **1,47 G**      | `ghcr.io/cloudsysops/intcloudsysops-orchestrator:latest`                 |
| **1,35 G**      | `ghcr.io/cloudsysops/intcloudsysops-context-builder:latest`              |
| **1,01 G**      | `grafana/grafana:latest`                                                 |
| **724 M**       | `louislam/uptime-kuma:1`                                                 |
| **577 M**       | `prom/prometheus:latest`                                                 |
| **395 M**       | `postgres:16-alpine`                                                     |
| …               | Resto Opsly (api, portal, admin, mcp, llm-gateway, traefik, redis, etc.) |

**Qué destaca:** stacks **OpenClaw/Ollama** y **n8n** (varias copias de imagen) y **Grafana/Prometheus** concentran muchos GB. Tener **dos tags n8n** (`latest` y `2.13.4`) duplica ~2 G si ambas están presentes.

### Contenedores — ejemplo de capa escribible + imagen virtual

| Nombre               | Tamaño mostrado (`docker ps -s`)  |
| -------------------- | --------------------------------- |
| `smiletrip_ollama`   | ~16 kB (virtual **~6,05 G**)      |
| `smiletrip_openclaw` | ~16,6 M (virtual **~3,51 G**)     |
| `n8n_*` (varios)     | ~54 M capa (virtual **~1,78 G**)  |
| `opsly_orchestrator` | ~4 kB (virtual **~1,06 G**)       |
| …                    | Ver `docker ps -s` en el servidor |

El “virtual” refiere el tamaño de la **imagen base**; el consumo en disco compartido sigue dominado por el total de imágenes en `docker system df`.

## `/opt/opsly` (solo repositorio)

| Ruta                           | Tamaño aprox. |
| ------------------------------ | ------------- |
| Total                          | **~23 M**     |
| `apps/`                        | ~3,5 M        |
| `node_modules/` (raíz)         | ~2,4 M        |
| `docs/`, `scripts/`, `infra/`  | <1 M cada uno |
| `tenants/` (solo YAML compose) | **~24 K**     |

Los **datos pesados de tenants** (n8n, uptime, etc.) están en **volúmenes Docker**, no en el árbol git bajo `/opt/opsly`.

## Logs

- **Journal:** ~**61,6 M** (vacuum periódico ya documentado en política de limpieza).
- **`/var/log/*`:** no se listó con `sudo` en esta sesión; suele ser cientos de MB–GB según rotación; revisar con `sudo du -sh /var/log/*` en el servidor.

## Qué se puede liberar con **bajo riesgo** (orden sugerido)

1. **`docker image prune -a`** (tras confirmar que no necesitas rollback de imágenes viejas) — hasta **~25 G** reclaimable según Docker (ver tabla arriba).
2. **`apt-get clean`** / limpiar **`/var/cache/apt`** — del orden de **~450 M** medidos.
3. **Unificar imágenes n8n** a un solo tag/digest** para no mantener **dos capas ~2 G\*\* si ambas no son necesarias.
4. **Revisar si** `ollama` **y** `openclaw` **deben** estar ambos en el mismo host en producción; son las imágenes más pesadas aisladas.
5. **Journal** ya es pequeño; ganancia marginal frente a Docker.

## Qué **no** borrar sin análisis

- Volúmenes con `docker volume prune` sin listar (`docker volume ls` y backup).
- `swapfile` sin cambiar configuración de memoria.
- Datos bajo volúmenes de n8n/uptime/redis de clientes.

## Recomendación inmediata

1. Ejecutar en el VPS (con cuidado y ventana de mantenimiento):  
   `sudo /opt/opsly/scripts/vps-cleanup-robust.sh` o al menos `docker image prune -a --filter "until=168h" -f` tras verificar imágenes necesarias.
2. Objetivo: bajar **uso de `/` por debajo del 90 %** y mantener **≥2–3 G libres** mínimo.
3. Si tras prune sigue el disco alto: **ampliar volumen** en DigitalOcean o mover stacks pesados (p. ej. observabilidad completa) a otro nodo.

## Actualización: limpieza de emergencia (2026-04-11, ~22:39 UTC)

Ejecutado en el VPS (usuario con acceso Docker, **sin** eliminar contenedores en ejecución):

- `docker image prune -a -f`
- `docker builder prune -a -f`
- `docker container prune -f`

| Métrica                                 | Antes                | Después                                                                             |
| --------------------------------------- | -------------------- | ----------------------------------------------------------------------------------- |
| **`df /` usado**                        | **47 G (98 %)**      | **39 G (82 %)**                                                                     |
| **Libre**                               | **~1,3 G**           | **~9,0 G**                                                                          |
| **Imágenes Docker (recuento / tamaño)** | 47 imágenes, ~38,4 G | **33 imágenes**, ~29,7 G                                                            |
| **Reclamado (mensaje Docker prune)**    | —                    | **~1,99 G** (el alivio en `df` puede ser mayor por capas compartidas / caché de FS) |

**Estado:** uso **por debajo del 90 %**; margen operativo recuperado. Sigue habiendo espacio “reclamable” en `docker system df` por capas/imágenes aún referenciadas; ver `docs/HEAVY-SERVICES-DECISION.md` si hace falta mover Ollama/OpenClaw.

## Referencias

- Limpieza automatizada: `docs/OPS-CLEANUP-PROCEDURES.md`, `scripts/vps-cleanup-robust.sh`
- Política: `docs/RETENTION-POLICY.md`
- Servicios pesados: `docs/HEAVY-SERVICES-DECISION.md`
