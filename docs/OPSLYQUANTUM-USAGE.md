# Uso del skill Opsly Quantum

## Ubicación

- **Skill:** `skills/user/opsly-quantum/SKILL.md`
- **Manifiesto:** `skills/user/opsly-quantum/manifest.json` (opcional para `validate-skills`)

## Para agentes (Claude / Cursor)

1. Cargar **`opsly-context`** primero (protocolo de sesión).
2. Si la tarea es transversal (arquitectura + scripts + diagnóstico), seguir **`opsly-quantum`**: leer `SKILL.md` y usar **solo** comandos que existan en el repo.

## CLI opcional

Desde la raíz del monorepo:

```bash
./scripts/opsly-quantum.sh help
./scripts/opsly-quantum.sh context
./scripts/opsly-quantum.sh status
./scripts/opsly-quantum.sh smoke
./scripts/opsly-quantum.sh skills
```

| Comando   | Efecto                                                                         |
| --------- | ------------------------------------------------------------------------------ |
| `context` | Resumen de rutas clave y recordatorios (sin secretos).                         |
| `status`  | `npm run type-check` (Turbo).                                                  |
| `smoke`   | `./scripts/verify-platform-smoke.sh` (requiere red/SSH según `API_URL` / VPS). |
| `skills`  | Lista directorios en `skills/user/`.                                           |

## Ejemplos de diálogo

### “¿Cómo está el proyecto?”

1. Leer `AGENTS.md` (sección estado / próximo paso).
2. Ejecutar `./scripts/opsly-quantum.sh status`.
3. Si hay que validar plataforma: `./scripts/opsly-quantum.sh smoke` (consciente de red).

### “La API está lenta”

1. Revisar `docs/SECURITY_CHECKLIST.md` y rutas de métricas si aplica.
2. Logs en VPS (SSH Tailscale) **sin** pegar tokens.
3. No inventar `opslyquantum diagnose --service api` si no está en el script; usar `docker logs` según runbook.

### “Documenta el cambio”

1. Actualizar `AGENTS.md` al cierre de sesión (protocolo Opsly).
2. ADR si hay decisión de arquitectura (`docs/adr/`).

## Validación

```bash
npm run validate-skills
```

## Diseño

Ver `docs/OPSLYQUANTUM-SKILL-DESIGN.md`.
