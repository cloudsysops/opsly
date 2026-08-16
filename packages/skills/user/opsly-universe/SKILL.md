---
name: opsly-universe
description: >
  Canon de personajes, mundos, Visual DNA y contratos de historia de OPSLY Universe.
  Usar cuando un agente genere imagen, video, diálogo, story o contenido con NØVA, Kai,
  Traveler, Lyra, Orion, Atlas, Maya, Echo o Wavo. No reinventar personajes.
status: canon
owner: operations
last_review: 2026-08-16
type: skill
tags:
  - opsly/universe
  - opsly/content
  - opsly/ip
---

# Opsly Universe

> **Triggers:** `NØVA`, `Nova`, `Traveler`, `Kai`, `Lyra`, `Orion`, `Atlas`, `Maya`, `Echo`, `Wavo`, `OPSLY Universe`, `Visual DNA`, `character registry`, `universe.getContext`
> **Priority:** HIGH
> **Relacionados:** `opsly-modularity`, `opsly-context`

## Cuándo usar

Cualquier agente (Codex, Claude, OpenClaw, YouTube, Peskids, image/video/story) que mencione personajes del universo **debe** leer este módulo en vez de inventar identidad.

## Protocolo

```bash
npm run universe -- show nova
npm run universe -- context --characters nova,kai --topic swimming --audience kids --tenant peskids
```

```ts
import { universe } from '@intcloudsysops/universe';

const context = universe.getContext({
  characters: ['nova', 'kai'],
  topic: 'robots',
  audience: 'kids',
  format: 'youtube-short',
});
```

## Capabilities

- `universe.character.lookup`
- `universe.character.compose`
- `universe.story.compose`
- `universe.prompt.image`
- `universe.prompt.video`
- `universe.prompt.dialogue`
- `universe.world.lookup`

## Reglas

- No mutar canon global desde un tenant (Peskids adapta setting, no identidad).
- No presentar espiritualidad / numerología / geometría sagrada como ciencia demostrada.
- Echo y Traveler no son omniscientes.
- Orion enseña deporte; Wavo no lo reemplaza.
- Inyectar Visual DNA en todo prompt de imagen/video.

## Código

- Lib: `lib/universe`
- JSON: `config/universe/`
- Doc: `docs/00-architecture/OPSLY-UNIVERSE.md`
