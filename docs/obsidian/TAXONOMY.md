---
status: canon
owner: operations
last_review: 2026-05-22
type: moc
tags:
  - opsly/obsidian
  - taxonomy
  - moc
---

# Obsidian Taxonomy

Taxonomia canonica para organizar nodos del vault y evitar que el cerebro se
vuelva una caja de notas sueltas.

## Objetivo

- Mantener una sola idea por nota.
- Separar fuente, claim, patron, decision y operacion.
- Facilitar que agentes y humanos recorran el vault sin duplicar contextos.

## Tipos de nodo

| Tipo | Proposito | Donde vive | Ejemplo |
| --- | --- | --- | --- |
| `source-note` | Fuente verificable | `docs/obsidian/sources/` | documento, repo, benchmark, paper |
| `claim` | Afirmacion atómica | `docs/obsidian/research/` | "X mejora Y" |
| `pattern` | Forma reusable | `docs/obsidian/research/` o `docs/brain/*` | runtime, workflow, security pattern |
| `moc` | Mapa de contenido | `docs/obsidian/*/MOC.md`, `docs/brain/*/README.md` | entrypoints del dominio |
| `decision` | Decision fija / ADR | `docs/adr/`, `docs/brain/architecture/` | reglas, límites, guardrails |
| `operational` | Proceso vivo | `docs/runbooks/`, `docs/brain/workflows/` | smoke, sync, bootstrap |
| `tenant` | Contexto de cliente | `docs/brain/tenants/` | Peskids, Legalvial, etc. |
| `agent` | Rol/capacidad de agente | `docs/brain/agents/` | Cursor, Claude, Hermes |

## Regla de promoción

```mermaid
flowchart LR
  Inbox["inbox"] --> Source["source-note"]
  Source --> Claim["claim"]
  Claim --> Pattern["pattern"]
  Pattern --> MOC["MOC / brain hub"]
  MOC --> Decision["decision / ADR"]
  Decision --> Startup["Agent startup"]
```

## Carpetas y uso

### `docs/obsidian/inbox/`
Captura rápida, sin pulir. Todo lo nuevo entra aquí antes de clasificarse.

### `docs/obsidian/sources/`
Una nota por fuente. Si viene de un repo, paper o documento largo, primero va
aquí.

### `docs/obsidian/research/`
Síntesis atómicas: claims, patrones, comparativas y aprendizajes verificables.

### `docs/brain/`
Notas operativas y MOCs del cerebro principal. Solo entra lo que ya sirve para
trabajo recurrente.

### `docs/adr/`
Decisiones que ya quedaron fijas.

## Regla de enlace

Toda nota nueva debería enlazar:

1. Su fuente o contexto.
2. Un MOC del dominio.
3. Un nodo padre en `docs/brain/` si aplica.
4. `[[obsidian/index]]` como entrada del vault.

## Nodos que conviene buscar primero

- `source`
- `claim`
- `pattern`
- `runtime`
- `evaluation`
- `budget`
- `audit`
- `approval`
- `tenant`
- `workflow`
- `extract`
- `security`
- `training`

