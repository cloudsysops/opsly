# ACTIVE-PROMPT — Espejo para n8n Agents

**Archivo sincronizado automáticamente desde la raíz del repo.**

Este archivo es leído por el servicio `billy-prompt-monitor` cada 30s en el VPS para ejecutar tareas autónomas.

## Última actualización
```bash
# Ver fecha de modificación
stat -c %y /opt/opsly/docs/ACTIVE-PROMPT.md
```

## Formato

Solo las líneas que **no** empiezan por `#` ni `---` se ejecutan como shell.

```bash
# Ejemplo de tarea válida:
npm run lint --workspace=@intcloudsysops/api
docker ps --format '{{.Names}} {{.Status}}'
./scripts/validate-config.sh
```

## Tareas Actuales

```bash
# (Este contenido se sincroniza desde docs/ACTIVE-PROMPT.md)
```

## Referencias

- **Monitor**: `scripts/billy-prompt-monitor.sh`
- **Servicio**: `infra/systemd/billy-prompt-monitor.service`
- **Logs**: `/opt/opsly/runtime/logs/billy-prompt-monitor.log`
- **Documentación**: `docs/ACTIVE-PROMPT.md`

## ⚠️ Riesgo RCE

Solo editar este archivo si eres el dueño del repo. Un atacante con acceso de escritura podría ejecutar comandos arbitrarios vía n8n → GitHub → VPS.

**Mitigación**: Mantener repo privado o validar contenido via n8n `Validate Message` node.
