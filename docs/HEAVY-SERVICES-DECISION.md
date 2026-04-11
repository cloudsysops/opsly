# Decisión: servicios pesados en el VPS (48 GB)

## Contexto

El disco raíz es **48 GB**. Con **Ollama (~9–10 GB imagen)**, **OpenClaw (~4–5 GB)**, varias instancias **n8n/Uptime**, stack **Grafana/Prometheus** y las imágenes **Opsly**, el margen es bajo. Tras un **`docker image prune -a`**, el objetivo operativo es mantener **uso &lt;90 %** y **varios GB libres** para pulls y logs.

## Principio

- **VPS:** control plane, tenants (n8n/uptime), Traefik, Redis, API/orchestrator según despliegue.
- **Modelos LLM locales y cargas experimentales:** preferir **otro nodo** (Mac dedicada, otra VM, proveedor) si el disco o la RAM aprietan.

## Opciones (sin comprometer el producto)

| Opción | Descripción | Pros | Contras |
|--------|-------------|------|---------|
| **A — Desacoplar Ollama** | Ejecutar Ollama solo donde haga falta inferencia local; no en el mismo disco que producción multi-tenant | Libera la imagen más pesada si no se usa | Hay que apuntar clientes/workers al nuevo host |
| **B — OpenClaw en otro host** | Mover el contenedor OpenClaw a máquina con más espacio (p. ej. Mac 2011 en LAN/Tailscale) | Reduce GB en VPS | Latencia y firewall; un nodo más que vigilar |
| **C — VM / cloud dedicada** | Stack “AI/labs” en GCP/AWS/DO separado | Aislamiento y escalado | Coste y operación |
| **D — Ampliar volumen** | Aumentar disco en DigitalOcean | Menos reingeniería | Coste mensual |

## Recomendación práctica

1. **Mantener en VPS** lo que el cliente paga (rutas HTTPS, n8n, Uptime, API, Redis, Traefik, imágenes Opsly desplegadas).
2. **No acumular** imágenes duplicadas: una tag **n8n** estable por entorno; `docker image prune -a` periódico (ya automatizado en `scripts/vps-cleanup-robust.sh`).
3. Si **Ollama/OpenClaw** son solo pruebas: **parar stack**, `docker compose down`, luego `docker rmi` de esas imágenes **solo** cuando el negocio confirme que no se usan en ese host.
4. Si el disco vuelve a **&gt;90 %** tras podas: **ampliar volumen** o mover cargas pesadas (tabla arriba).

## Plan de migración (cuando se decida mover un servicio)

1. Ventana de mantenimiento y aviso a stakeholders.
2. Exportar volúmenes/config necesarios (`docker inspect`, backups de volumen).
3. Levantar en el nuevo host con la misma versión de imagen.
4. Validar conectividad (Tailscale, firewall, DNS interno).
5. En el VPS: `docker compose down`, `docker rmi`, comprobar `df` y `docker system df`.

## Referencias

- `docs/DISK-USAGE-REPORT.md`
- `docs/OPS-CLEANUP-PROCEDURES.md`
