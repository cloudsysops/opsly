# Optimización de flujo de trabajo (Claude / Cursor / agentes)

Diez técnicas para **reducir tiempo de ciclo y retrabajo** en el monorepo Opsly (~orden de magnitud: hasta **~70% menos fricción** cuando se aplican de forma consistente; el ahorro real depende del tipo de tarea).

## 1. Cargar contexto en orden fijo

Leer **`VISION.md`** una vez por épica, **`AGENTS.md`** cada sesión, luego **`config/opsly.config.json`** para datos no secretos. Evita decisiones que contradigan fase o infra fija.

## 2. Una tarea concreta por sesión o por commit

Acotar el prompt a un objetivo medible (un endpoint, un script, un doc). Los handoffs en `AGENTS.md` deben dejar **un solo** “próximo paso inmediato”.

## 3. Dry-run antes de tocar producción

Scripts bash: usar **`--dry-run`** cuando exista (`validate-config`, `vps-refresh-api-env`, `sync-and-test-invite-flow`, etc.). No ejecutar `doppler secrets set` con valores en argv si hay alternativa por stdin.

## 4. Buscar antes de leer archivos grandes

**Ripgrep / búsqueda semántica** para localizar símbolos; abrir solo los fragmentos necesarios. Reduce tokens y evita contexto obsoleto.

## 5. Mantener tipos estrictos

Sin `any` en TypeScript (regla Opsly). Fallar en type-check local antes que en CI; corrige el costo de contexto en PR.

## 6. Handoff explícito para el siguiente agente

Al cerrar sesión: bloque **---HANDOFF---** con archivos tocados, bloqueantes y comando exacto siguiente. La URL raw de `AGENTS.md` acorta la rampa del siguiente modelo.

## 7. No repetir herramientas fallidas sin nueva hipótesis

Si un comando falla, cambiar estrategia (otra ruta, otro flag, leer log). Evita bucles que queman presupuesto y tiempo humano.

## 8. Validar configuración antes de deploy

**`./scripts/validate-config.sh`** antes de `vps-bootstrap` o refresh de entorno. La línea final **Invitaciones (Resend)** resume si el flujo de invites está listo.

## 9. Documentar bloqueantes al momento

Si algo queda bloqueado (secretos, permisos GHCR, Resend), actualizar **`AGENTS.md`** sección bloqueantes en la misma sesión. Menos reuniones de “¿qué pasó?”.

## 10. Paralelizar solo cuando sea seguro

Exploración de código en paralelo (subagentes) cuando las rutas no compiten por el mismo archivo. Para git: **un** commit lógico por cambio para evitar conflictos en `.github/AGENTS.md` y hooks.

## Checklist rápido (copiar en PR)

- [ ] `AGENTS.md` / handoff actualizado si afecta operación
- [ ] `npm run type-check` verde
- [ ] Sin secretos en diff
- [ ] Scripts nuevos: `set -euo pipefail` y `--dry-run` si aplica

## Referencias

- `.cursor/rules/opsly.mdc` — reglas Cursor Opsly
- `agents/prompts/cursor-executor.md` — plantilla ejecutor
