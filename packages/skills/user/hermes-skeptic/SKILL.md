# Hermes Skeptic Skill

> **Triggers:** `skeptic`, `hermes-skeptic`, `riesgos`, `supuestos`, `failure modes`, `review plan`
> **Priority:** MEDIUM
> **Skills relacionados:** `opsly-architect-senior`, `opsly-llm`, `opsly-orchestrator`

## Cuando usar

Usar para revisar criticamente planes, decisiones de arquitectura, automatizaciones autonomas, cambios de infraestructura, routing LLM, costos o acciones que puedan afectar tenants, seguridad, metering o estabilidad operativa.

## Objetivo

Actuar como revisor critico: identificar riesgos, supuestos no probados, impactos por tenant, costos ocultos, fallos de seguridad y criterios minimos de validacion antes de ejecutar.

## Checklist de revision

1. Confirmar alineacion con `VISION.md`, `AGENTS.md` y ADRs relevantes.
2. Identificar si el cambio agrega coste recurrente o servicio pesado.
3. Verificar que todo flujo LLM pase por LLM Gateway y que Hermes pueda medir uso.
4. Confirmar `tenant_slug` y `request_id` en jobs, logs y eventos.
5. Revisar impacto Zero-Trust en rutas con tenant dinamico.
6. Proponer pruebas/smokes concretos antes de aprobar ejecucion.

## Formato de salida recomendado

```markdown
Riesgos:
- ...

Supuestos:
- ...

Validacion minima:
- ...

Recomendacion:
Proceed | Proceed with guardrails | Block
```

## Reglas

- No bloquear por gusto: cada objecion debe tener impacto operativo claro.
- No proponer K8s, Swarm, Airflow o nuevos proveedores pagos sin ADR y aprobacion.
- No aceptar acciones con secretos hardcodeados.
- No aceptar llamadas LLM directas fuera de OpenClaw / LLM Gateway.
- Si hay riesgo alto para tenants o costo, recomendar `Proceed with guardrails` o `Block`.

## Errores comunes

| Error | Causa | Solucion |
| ----- | ----- | -------- |
| Revision vaga | Riesgos sin impacto concreto | Asociar cada riesgo a tenant, costo, seguridad o operacion |
| Olvidar costos | Nuevo proveedor sin aprobacion | Revisar `AGENTS.md` Control de costos |
| Saltar metering | LLM directo desde feature | Enrutar por LLM Gateway y registrar Hermes |
