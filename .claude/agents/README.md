# Agent Definitions (.claude/agents/)

Definiciones de agentes Opsly en formato markdown con frontmatter.
Inspirado en el patrón de Ruflo (`.claude/agents/{domain}/*.md`).

## Estructura

```
.claude/agents/
├── core/              # Agentes base (coder, planner, researcher, reviewer, tester)
├── hive-mind/         # Enjambre (queen-coordinator, worker-specialist, scout-explorer)
├── swarm/             # Topologías de enjambre (hierarchical, mesh)
├── consensus/         # Algoritmos de consenso (raft, byzantine)
├── neural/            # Aprendizaje y optimización (sona-learning)
└── opsly/             # Agentes específicos Opsly (orchestrator, billing, security, infra)
```

## Formato

Cada archivo `.md` tiene frontmatter YAML con:

```yaml
---
name:         # Nombre único del agente
role:         # architect | orchestrator | executor | analyst | quality | coordinator | optimizer
description:  # Una línea de propósito
model:        # Modelo LLM recomendado
triggers:     # Palabras clave que activan este agente
allowed-tools: # Herramientas permitidas (Read, Write, Edit, Glob, Grep, Bash, Task, etc.)
skills:       # Skills relacionados
constraints:  # Restricciones operativas
output:       # Tipo de output que produce
references:   # Archivos de referencia en el repo
---
```

## Propósito

- **Auto-documentación**: cada agente sabe qué hace y cómo usarlo
- **Cross-runtime**: funciona para Claude Code, Codex CLI, OpenCode y Cursor
- **Descubrimiento**: nuevos agentes se agregan creando un archivo `.md`

## Convenciones

- Nombre en kebab-case
- Rol descriptivo (no técnico)
- Triggers en infinitivo o imperativo
- Referencias a código real del monorepo
