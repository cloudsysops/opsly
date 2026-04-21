# Opsly QA Skill

> **Triggers:** `qa`, `testing`, `test`, `audit`, `smoke`, `regresión`, `playwright`, `vitest`, `validación`
> **Priority:** MEDIUM
> **Skills relacionados:** `opsly-frontend`, `opsly-api`, `opsly-infra`, `opsly-orchestrator`

## Cuándo usar

Al validar cambios antes de release, reproducir bugs, ejecutar smoke tests de staging o preparar reportes de calidad para Go/No-Go.

## Cobertura recomendada por defecto

1. Type-check workspace(s) afectados.
2. Test unitarios (Vitest/Jest según workspace).
3. Smoke de endpoints críticos (`/api/health`, `/api/portal/*`, `/api/admin/*`).
4. Validación UI de rutas principales (Portal/Admin).
5. Verificación de errores runtime (hydration, hooks, auth, 404 críticos).

## Flujo QA rápido

```bash
# 1) Base quality
npm run type-check
npm run test

# 2) Si hay frontend sensible
npm run test:e2e --workspace=@intcloudsysops/portal

# 3) Si hay contratos API
npm run validate-openapi
```

## Formato de hallazgos

- `CRITICAL`: bloquea release o flujo core
- `HIGH`: rompe valor principal pero hay workaround
- `MEDIUM`: degradación visible o riesgo creciente
- `LOW`: deuda o inconsistencia no bloqueante

Cada hallazgo debe incluir:
- Ruta/endpoint
- esperado vs actual
- evidencia reproducible
- hipótesis de causa raíz

## Reglas

- No marcar "PASSED" sin evidencia ejecutada.
- No mezclar hallazgos de producto con fallos de infraestructura sin separar.
- Probar happy path y path de error.
- Si el bug es de auth, validar con y sin token.
- Si falla un test flaky, anotar patrón de flake, no ocultarlo.

## Errores comunes

| Error | Causa | Solución |
|-------|-------|----------|
| "Todo OK" sin comando ejecutado | Falta disciplina de verificación | Adjuntar comandos y resultado |
| 401 generalizado | Token no propagado desde frontend | Revisar `api-client`/headers de auth |
| 404 endpoint esperado | Ruta no desplegada o mal documentada | Reconcilia código, OpenAPI y deploy |
| React hook/hydration errors en prod | Patrón incorrecto de render | Corregir hooks/SSR y revalidar en build |
