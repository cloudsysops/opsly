# Notion MCP Server for Opsly

> **MCP** = Model Context Protocol. Permite que agentes (Claude, Cursor, etc.) lean y escriban en Notion; los humanos ven los mismos datos en el navegador en tiempo real.

## Objetivo

- **Una base de verdad** compartida (Notion).
- Agentes y CI pueden actualizar estado; tú ves tableros, Gantt y métricas sin duplicar fuentes.

## Arquitectura

```
┌──────────────────────────────────────────────────┐
│          NOTION (base de verdad compartida)       │
│  Tasks · Sprints · Daily Standup · Quality · KPI │
└────────────┬───────────────────────────────────────┘
             │
    ┌────────┴────────┬──────────────┬──────────────┐
    ▼                 ▼              ▼              ▼
 notion-mcp      GitHub Actions   Cursor        Humano
 (HTTP/MCP)      (CI)             (agente)      (browser)
```

**Implementación en repo:** `apps/notion-mcp/` — servidor HTTP que envuelve la API oficial de Notion (`@notionhq/client`). No sustituye a un servidor MCP stdio de Cursor; puedes exponer los mismos contratos vía **HTTP** y, si hace falta, envolver con un adaptador MCP stdio en otro paquete.

## Layout del paquete

```
apps/notion-mcp/
├── package.json
├── tsconfig.json
├── .env.example
└── src/
    ├── index.ts           # Express: /health + rutas /mcp/*
    ├── notion-client.ts   # Cliente Notion tipado
    ├── constants.ts       # Nombres de propiedades esperados en Notion
    ├── types.ts
    └── handlers/
        ├── list-tasks.ts
        ├── create-task.ts
        ├── update-task.ts
        ├── add-standup.ts
        └── quality-gate.ts
```

## Bases de datos Notion (setup manual)

Las propiedades deben coincidir con los nombres configurados en `apps/notion-mcp/src/constants.ts` (o amplía ese archivo si usas otros nombres).

### 1. Tasks

| Propiedad      | Tipo         |
| -------------- | ------------ |
| Name           | title        |
| Sprint         | select       |
| Status         | select       |
| Owner          | people       |
| Assignee       | people       |
| DueDate        | date         |
| EstimatedHours | number       |
| ActualHours    | number       |
| Priority       | select       |
| PR Link        | url          |
| Description    | rich_text    |
| Tags           | multi_select |

### 2. Sprints

| Name, Phase, StartDate, EndDate, Status, Tasks (relation), Progress (formula opcional), Velocity |

### 3. Daily Standup

| Date, Author, Tasks Completed (relation), Blockers, Commits, Tests Passing, Coverage, Notes |

### 4. Quality Gates

| Check Name (title), Component, Status, Details |

### 5. Metrics

| Date, Sprint (relation), TasksCompleted, TasksPlanned, Commits, PRsMerged, TestCoverage, fórmulas opcionales |

## Variables de entorno

Ver `apps/notion-mcp/.env.example`:

- `NOTION_TOKEN` — integración interna (secret\_…)
- `NOTION_DATABASE_*` — IDs de cada base
- `MCP_PORT` — puerto HTTP (por defecto **3013**)

## Endpoints HTTP (v1)

| Método | Ruta                       | Descripción                                  |
| ------ | -------------------------- | -------------------------------------------- |
| GET    | `/health`                  | Liveness                                     |
| POST   | `/mcp/tasks/list`          | Listar tareas (body: `{ sprint?, status? }`) |
| POST   | `/mcp/tasks/create`        | Crear tarea                                  |
| POST   | `/mcp/tasks/update`        | Actualizar tarea                             |
| POST   | `/mcp/standup/add`         | Registrar standup                            |
| POST   | `/mcp/quality-gate/record` | Registrar quality gate                       |

## Integración con el control plane (opcional)

Desde `apps/api` u otro servicio, llamar a `NOTION_MCP_URL` (p. ej. `http://notion-mcp:3013` en Compose) en lugar de duplicar lógica Notion en el API Gateway.

## CI (ejemplo)

Un workflow puede hacer `curl -X POST "$NOTION_MCP_URL/mcp/quality-gate/record"` tras tests; el servidor debe ser **alcanzable** desde el runner (self-hosted runner o túnel), no desde `localhost` en GitHub-hosted sin pasos extra.

## Sincronización bidireccional avanzada

Webhooks de Notion → tu API → GitHub/Slack quedan **fuera del alcance** de este paquete base; documentados aquí como evolución.

## Documentación relacionada

- [SETUP-NOTION-MCP.md](./SETUP-NOTION-MCP.md) — paso a paso integración y pruebas.
