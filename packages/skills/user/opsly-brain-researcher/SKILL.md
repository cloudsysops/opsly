---
name: opsly-brain-researcher
description: >
  opsly-brain-researcher
status: draft
owner: operations
last_review: 2026-05-24
type: package-doc
tags:
  - opsly/package
---

# opsly-brain-researcher

**Research Agent** — Agentes que investigan automáticamente el Obsidian Brain.

## Capacidades

- 🔍 **Multi-search:** fulltext + semantic
- 📖 **Auto-read:** notas relevantes
- 🔗 **Follow-up:** grafo de conocimiento
- 🧠 **Synthesis:** respuestas basadas en evidencia
- 🔄 **Iterative:** decide cuándo profundizar

## Uso

```typescript
import { ResearchAgent } from '@opsly/brain-researcher';

const agent = new ResearchAgent({
  maxIterations: 5,
  confidenceThreshold: 0.8,
});

const result = await agent.investigate('¿Cómo está diseñado el tenant isolation?');

// {
//   question: '...',
//   searchResults: [...],
//   sources: ['architecture/multi-tenant.md', ...],
//   answer: '...',
//   confidence: 0.92,
//   iterations: 3
// }
```

## Flujo

1. **Query Expansion** — buscar variaciones de la pregunta
2. **Multi-Search** — fulltext + semantic en paralelo
3. **Rank & Filter** — top N resultados por relevancia
4. **Read & Extract** — leer notas, extraer hechos
5. **Link Following** — explorar grafo si necesario
6. **Synthesis** — LLM + retrieved facts → respuesta
7. **Confidence Check** — ¿necesita más investigación?
8. **Repeat** o **Return**

## Config

```typescript
{
  maxIterations: 5,        // max búsquedas
  confidenceThreshold: 0.8, // cuando parar
  timeout: 30000,          // 30s max
  llmModel: 'claude-haiku', // para síntesis
  searchDepth: 2,          // grafo hops
}
```

## Triggers

- "investigar X"
- "research X"
- "¿cómo funciona X?"
- "explica X" (con context memory)
- "busca en el brain"

## Output

```json
{
  "question": "...",
  "answer": "...",
  "sources": ["path/to/note.md", ...],
  "confidence": 0.92,
  "iterations": 3,
  "relatedTopics": ["topic1", "topic2"],
  "nextSteps": ["explore X", "...]
}
```

---

## Enlaces relacionados

- [[packages/skills/README|skills]]
- [[README|Inicio]]
