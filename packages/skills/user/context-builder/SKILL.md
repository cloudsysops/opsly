# Context Builder Skill

> **Triggers:** `context-builder`, `contexto`, `rag`, `memoria`, `knowledge-index`, `repo-first`
> **Priority:** MEDIUM
> **Skills relacionados:** `opsly-context`, `opsly-llm`, `opsly-orchestrator`

## Cuando usar

Usar al trabajar con construccion de contexto operativo, memoria por tenant, indice de conocimiento del repo, continuidad entre sesiones o integracion de `apps/context-builder` con agentes OpenClaw.

## Objetivo

Construir contexto trazable y util para agentes sin duplicar sistemas de memoria ni saltarse el flujo OpenClaw. El contexto debe salir del repo, Redis, Supabase o fuentes documentadas, y cada consulta operativa debe conservar `tenant_slug` y `request_id` cuando aplique.

## Flujo recomendado

1. Leer `AGENTS.md`, `VISION.md` y la documentacion relacionada antes de cambiar comportamiento.
2. Revisar `apps/context-builder`, `config/knowledge-index.json` y `scripts/index-knowledge.sh`.
3. Si se agregan muchos `.md`, regenerar el indice:

```bash
npm run index-knowledge
```

4. Para VPS, ejecutar desde la raiz real del repo:

```bash
OPSLY_ROOT=/opt/opsly ./scripts/index-knowledge.sh
```

5. Mantener el Context Builder como servicio/cliente existente. No crear un segundo builder embebido en orchestrator sin ADR.

## Reglas

- Todo contexto de agente debe ser trazable a fuentes del repo, Redis, Supabase o docs canonicas.
- No incluir secretos ni valores completos de tokens en contexto.
- No hacer llamadas LLM directas; usar LLM Gateway.
- No duplicar `apps/context-builder` dentro de otro servicio.
- Preservar `tenant_slug` y `request_id` en jobs y logs.

## Errores comunes

| Error | Causa | Solucion |
| ----- | ----- | -------- |
| Planner sin docs nuevas | No se regenero `config/knowledge-index.json` | Ejecutar `npm run index-knowledge` |
| Contexto con secretos | Se copio `.env` o salida Doppler completa | Registrar solo nombres/longitudes |
| Segundo builder | Implementacion paralela en orchestrator | Integrar como cliente del servicio existente |
