# `@intcloudsysops/game-core`

Smallest playable Opsly Universe loop: session → explorer → First Portal →
INPUT/PROCESS/OUTPUT mission → collectible → observation events.

This package is **not** a game server, Docker image, or client renderer.

```ts
import { createGameRuntime } from '@intcloudsysops/game-core';

const game = createGameRuntime();
const session = game.startSession({ tenantSlug: 'opsly' });
game.chooseExplorer(session.id, { displayName: 'Explorer' });
game.enterPortal(session.id, 'first-portal');
game.startMission(session.id, 'first-portal-ipo-001');
game.connectNodes(session.id, 'node-input', 'node-process');
game.connectNodes(session.id, 'node-process', 'node-output');
```

See `docs/universe/GAME-CORE.md` and `docs/universe/GAME-VISION.md`.
