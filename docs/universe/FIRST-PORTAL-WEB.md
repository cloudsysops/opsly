---
status: draft
owner: product
last_review: 2026-08-16
---

# First Portal — web client

Playable browser slice for Opsly Universe. Host: ICSO marketing app, route
`/universe/play`. Not Peskids. Not Moon / Mission Control.

## Dependency direction

`@intcloudsysops/universe` → `@intcloudsysops/game-core` → `@intcloudsysops/game-web` → ICSO UI

The React tree does not own characters, worlds, or mission success. It posts
player actions to `POST /api/universe/play`, which calls Game Core and returns
a view-model.

## Persistence

Versioned JSON in `localStorage` key `opsly.universe.first-portal.v1`, behind
`createPlayBrowserStorage`. The API can later replace that blob with a session
store without changing screens.

## Not in this slice

Phaser, Three.js, multiplayer, chat, parent portal, payments, Docker
`game-runtime` / `game-engineer`, public deploy.
