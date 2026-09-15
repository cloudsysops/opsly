---
status: draft
owner: operations
last_review: 2026-09-09
type: architecture
tags:
  - opsly/content
  - opsly/pc-gamer
---

# Content vendor research (fuera del monorepo)

Los clones OSS para Mauro + Dragon Cyber + Content Studio **no viven en** `cloudsysops/opsly`. Workspace sibling:

```text
/Users/dragon/cboteros/proyectos/opsly-content-research/
```

Índice y auditoría: `README.md`, `AUDIT.md`. SHAs: `vendor/SHAS.txt`.

## Clonado (2026-09-09)

| Vendor | Uso en Opsly | Licencia |
| --- | --- | --- |
| Auto-clipper | patrones highlight → `ClipCandidate` | MIT |
| OpenCut (`floomhq/opencut`) | timeline TS / captions / formatos | MIT + Remotion |
| remotion-clip (Clip Factory) | largo → shorts `candidates.json` | MIT + Remotion |
| TwitchDownloader (`lay295`) | CLI VOD/clip/chat | MIT |
| remotion-studio | scaffold headless | MIT + Remotion |
| Remotion core | **npm**, no clone (~4.1 GB) | company license |

No se clonó [OpenCut-app/OpenCut](https://github.com/OpenCut-app/OpenCut) (CapCut GUI). No se copia `vendor/` a este repo.

## Regla

Opsly es dueño de la arquitectura (`lib/content-studio/src/content-engine/`). Extraer patrones; no embeber seis apps. Remotion en prod exige ADR + aprobación de costo (gratis ≤3 personas; automación ≈ Automators $100/mes min). https://www.remotion.dev/docs/license

## Demo objetivo

1 sesión Mauro → 20 momentos → 5 aprobados → 5 clips → 1 Dragon Cyber → paquete Shorts.

## Enlaces relacionados

- [[00-architecture/CONTENT-STUDIO-ARCHITECTURE|CONTENT-STUDIO-ARCHITECTURE]]
- [[00-architecture/CONTENT-PRODUCTION-MVP|CONTENT-PRODUCTION-MVP]]
