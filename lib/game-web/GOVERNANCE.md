---
title: "lib/game-web Governance"
description: "Play adapter for Opsly Universe First Portal"
---

# lib/game-web Governance

- **Owner:** operations / game systems
- **Consumes:** `@intcloudsysops/game-core`, `@intcloudsysops/universe`
- **Must not own:** characters, worlds, mission results, growth diagnoses
- **Must not depend on:** Peskids, admin/Moon, YouTube, Docker

This package turns Game Core snapshots into a playable view-model.
Persistence adapters (localStorage, later API) live at the app edge.
