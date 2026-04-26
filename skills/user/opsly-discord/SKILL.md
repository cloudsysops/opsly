# Opsly Discord Notifications Skill

> **Triggers:** `discord`, `notificación`, `webhook`, `alerta`, `deploy`, `commit`, `error`
> **Priority:** MEDIUM
> **Skills relacionados:** `opsly-bash`, `opsly-tenant`, `opsly-quantum`

## Cuándo usar

Al notificar eventos operativos (deploy, errores, commits, monitor) sin filtrar secretos.

## Uso

```bash
./scripts/notify-discord.sh \
  "Título del evento" \
  "Descripción detallada (sin tokens ni passwords)" \
  "success|error|warning|info"
```

## Tipos

| Tipo      | Uso típico                       |
| --------- | -------------------------------- |
| `success` | Deploy OK, tarea completada      |
| `error`   | Fallo crítico, provider caído    |
| `warning` | Disco alto, degradación          |
| `info`    | Commit, sync, mensajes generales |

## Reglas

- **No** usar `secrets.*` dentro de `if:` en GitHub Actions para webhooks; comprobar webhook vacío en bash (patrón ya usado en Opsly).
- No incluir valores de secretos en título ni descripción.
- Webhook vacío → el script hace **no-op** con warning y **exit 0** (no romper hooks).

## Errores comunes

| Error                  | Causa              | Solución                          |
| ---------------------- | ------------------ | --------------------------------- |
| curl: (3) URL rejected | Webhook vacío      | Script hace no-op, no es error    |
| 400 Bad Request        | Embed > 6000 chars | Acortar descripción               |
| Action failed          | secrets en if:     | Comprobar en bash, no en workflow |

## Testing

```bash
# Test notification
DISCORD_WEBHOOK_URL="https://discord.com/api/webhooks/test" \
  ./scripts/notify-discord.sh "Test" "Description" "info"

# Verificar no-op con webhook vacío
DISCORD_WEBHOOK_URL="" ./scripts/notify-discord.sh "Test" "Desc" "info" && echo "noop OK"
```
