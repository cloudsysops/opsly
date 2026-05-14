---
status: canon
owner: operations
last_review: 2026-05-10
type: dashboard
tags:
  - opsly/brain
  - dashboard
  - moc
---

# Brain Dashboard

Entrada principal para trabajar Opsly desde Obsidian. Este tablero convierte el
grafo en rutas de navegacion: producto, codigo, agentes, tenants, workflows y
operacion.

## Ahora

- Norte: [[01-development/VISION|Vision]] y [[01-development/ROADMAP|Roadmap]]
- Estado operativo: [[../AGENTS|AGENTS]] y [[03-agents/AGENTS|Agents Session]]
- Ciclo documental: [[01-development/DOCUMENTATION-LIFECYCLE|Documentation Lifecycle]]
- Guardrails: [[03-agents/AGENT-GUARDRAILS|Agent Guardrails]]
- Contrato cerebral: [[03-agents/AGENT-BRAIN-CONTRACT|Agent Brain Contract]]

## Hubs

| Hub | Pregunta que responde |
| --- | --- |
| [[brain/modules/README|Modules]] | Que modulo toca esta tarea y donde vive? |
| [[brain/agents/README|Agents]] | Que agente puede ejecutar o supervisar? |
| [[brain/tenants/README|Tenants]] | A que cliente/tenant afecta? |
| [[brain/workflows/README|Workflows]] | Que automatizacion o cola lo mueve? |
| [[brain/architecture/README|Architecture]] | Que decision/ADR gobierna esto? |

## Camino de trabajo para agentes

1. Leer [[../AGENTS|AGENTS]].
2. Leer [[01-development/VISION|Vision]].
3. Leer [[03-agents/AGENT-BRAIN-CONTRACT|Agent Brain Contract]].
4. Abrir el hub correspondiente en `docs/brain/`.
5. Tocar codigo solo despues de ubicar modulo, contrato y validacion.
6. Cerrar con pruebas y actualizar docs en la carpeta duena.

## Grafo recomendado

En Graph View del vault `docs/`:

- Activar filtros por color.
- Ocultar orphans para planificacion diaria.
- Usar busquedas por dominio:
  - `path:brain/modules`
  - `path:03-agents OR path:brain/agents`
  - `path:tenants OR path:brain/tenants`
  - `path:00-architecture OR path:adr OR path:brain/architecture`

## Consultas utiles

```query
tag:#opsly/brain
```

```query
path:brain/modules
```

```query
path:03-agents "local-agents"
```

```query
path:04-infrastructure "Traefik" OR "Redis"
```

