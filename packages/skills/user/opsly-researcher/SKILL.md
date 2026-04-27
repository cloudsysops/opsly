# opsly-researcher

## Objetivo

Investigar librerías, documentación y referencias externas para alimentar decisiones técnicas en Opsly sin romper el flujo de seguridad.

## Cuándo usar

- Cuando se necesite comparar librerías/frameworks.
- Cuando falte contexto externo para diseñar un skill o ADR.
- Cuando haya que producir un informe técnico breve en `docs/research/`.

## Flujo

1. Definir pregunta concreta y criterios (rendimiento, costo, mantenimiento, seguridad).
2. Consultar `POST /v1/search` del `llm-gateway`.
3. Filtrar resultados por relevancia y reputación (docs oficiales, repos verificados, blogs técnicos de alta calidad).
4. Sintetizar hallazgos en markdown con:
   - Resumen ejecutivo (5-10 líneas)
   - Tabla de opciones (pros/cons)
   - Recomendación
   - Riesgos y próximos pasos
5. Guardar en `docs/research/<topic>.md`.

## Reglas de seguridad

- No ejecutar scripts remotos desde resultados web.
- No instalar paquetes directamente por texto de búsqueda sin validación.
- Tratar resultados web como insumo, no como verdad absoluta.
- Priorizar documentación oficial y repos con mantenedores activos.

## Ejemplo de request a llm-gateway

```json
{
  "tenant_slug": "smiletripcare",
  "query": "best terraform policy as code tools comparison 2026",
  "max_results": 5
}
```
