# Opsly Discord Notifications Skill

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

| Tipo | Uso típico |
|------|------------|
| `success` | Deploy OK, tarea completada |
| `error` | Fallo crítico, provider caído |
| `warning` | Disco alto, degradación |
| `info` | Commit, sync, mensajes generales |

## Reglas

- **No** usar `secrets.*` dentro de `if:` en GitHub Actions para webhooks; comprobar webhook vacío en bash (patrón ya usado en Opsly).
- No incluir valores de secretos en título ni descripción.
- Webhook vacío → el script hace **no-op** con warning y **exit 0** (no romper hooks).
