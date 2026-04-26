# Auditoría disco y seguridad — VPS (`vps-dragon`)

Runbook para **espacio en disco**, **Trivy** y **higiene** sin duplicar el script `scripts/cleanup-vps.sh`.

## Snapshot (ejemplo — volver a ejecutar en el servidor)

Comandos de referencia (en el VPS):

```bash
df -h /
sudo du -xh --max-depth=1 / 2>/dev/null | sort -hr | head -15
sudo du -sh /var/lib/docker /var/log /opt/opsly
du -sh /opt/opsly/node_modules 2>/dev/null
journalctl --disk-usage
docker system df
docker ps -a --format '{{.Image}}' | sort -u
```

### Hallazgos típicos (Opsly)

| Área                          | Notas                                                                                                       |
| ----------------------------- | ----------------------------------------------------------------------------------------------------------- |
| **`/var/lib/docker`**         | Suele ser el mayor consumidor; `docker system df` muestra imágenes reclamables.                             |
| **`journalctl`**              | A menudo moderado; `--vacuum-time=7d` ayuda si crece.                                                       |
| **`/opt/opsly/node_modules`** | En el host (si existe `npm ci` en disco) puede ser ~1 GB+; no borrar a ciegas si el deploy depende de ello. |
| **Imágenes GHCR**             | Varias etiquetas `latest`; prune libera capas viejas.                                                       |

---

## OBJETIVO 1 — Trivy (vulnerabilidades y secretos)

### Instalación

En el VPS **no** suele venir preinstalado. Opciones:

**A) Paquete (si el repo Trivy está añadido en Ubuntu):**

```bash
sudo apt-get update
sudo apt-get install -y wget gnupg
# Seguir documentación actual: https://aquasecurity.github.io/trivy/latest/getting-started/installation/
# Ejemplo (verificar URL de clave actual):
# wget -qO - https://aquasecurity.github.io/trivy-repo/deb/public.key | sudo gpg --dearmor -o /usr/share/keyrings/trivy.gpg
# echo "deb [signed-by=/usr/share/keyrings/trivy.gpg] https://aquasecurity.github.io/trivy-repo/deb generic main" | sudo tee /etc/apt/sources.list.d/trivy.list
# sudo apt-get update && sudo apt-get install -y trivy
```

**B) Sin instalar — contenedor (recomendado para pruebas):**

```bash
docker run --rm -v /:/host:ro -v /var/run/docker.sock:/var/run/docker.sock \
  aquasec/trivy:latest image --severity HIGH,CRITICAL ghcr.io/cloudsysops/intcloudsysops-api:latest
```

**Filesystem OS + secretos (ejemplo):**

```bash
sudo mkdir -p /tmp/trivy-cache
docker run --rm -v /:/host:ro -v /tmp/trivy-cache:/root/.cache \
  aquasec/trivy:latest fs --severity HIGH,CRITICAL --scanners vuln,secret /host
```

> Los escaneos de **todo `/`** pueden ser lentos y ruidosos; acotar rutas (`/etc`, `/opt/opsly` sin `node_modules`) si hace falta.

### Reporte

Guardar salida:

```bash
docker run --rm ... aquasec/trivy:latest image ... 2>&1 | tee "/tmp/trivy-images-$(date +%Y%m%d).txt"
```

Interpretación: priorizar **CRITICAL/HIGH** en bases de imágenes; **rotar secretos** si Trivy marca archivos con API keys.

---

## OBJETIVO 2 — Limpieza controlada

Script interactivo con confirmaciones:

```bash
sudo bash /opt/opsly/scripts/cleanup-vps.sh
# o, solo simulación:
bash /opt/opsly/scripts/cleanup-vps.sh --dry-run
```

**Importante:** el paso 1 usa **`docker image prune -a`** (no `docker system prune -a`). Este último **elimina contenedores parados** y puede borrar stacks `compose` detenidos antes de limpiar imágenes; luego hay que **`compose pull` + `up -d`** para recuperar la plataforma.

Existe también `scripts/vps-cleanup-robust.sh` (perfiles `--light` / `--aggressive`).

---

## Checklist post-cambio

- [ ] UFW: SSH solo Tailscale (`docs` seguridad / `scripts/vps-secure.sh`).
- [ ] Tras `prune`, comprobar `docker compose up -d` en `/opt/opsly/infra` si algún servicio no arranca.
- [ ] No publicar reportes Trivy con secretos en repos o chats.
