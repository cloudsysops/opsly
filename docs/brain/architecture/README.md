---
status: canon
owner: architecture
last_review: 2026-05-10
type: moc
tags:
  - opsly/brain
  - opsly/architecture
---

# Architecture MOC

Mapa de decisiones y estructuras tecnicas.

## Hubs

- [[brain/architecture/system-map|System Map]]
- [[brain/architecture/knowledge-graph|Knowledge Graph]]
- [[00-architecture/ARCHITECTURE|Architecture]]
- [[00-architecture/OPENCLAW-ARCHITECTURE|OpenClaw Architecture]]
- [[00-architecture/LLM-GATEWAY|LLM Gateway]]
- [[adr/README|ADRs]]

## Reglas fijas

- Docker Compose + Traefik para control plane.
- Supabase schema `platform`.
- OpenClaw + LLM Gateway como paso obligatorio para IA.
- No K8s para control plane sin ADR nuevo.

