import { GAME_SCHEMA_VERSION } from './constants.js';
import { recordEvent } from './events.js';
import { newId } from './ids.js';
import { GameSessionSchema, PlayerProfileSchema } from './schemas.js';
import { assertPseudonymousId } from './safety.js';
import type { GameStore } from './store.js';
import type { GameSession, StartSessionInput } from './types.js';

export function startSession(
  store: GameStore,
  input: StartSessionInput,
  now: () => Date,
): GameSession {
  const playerId = input.playerId ?? newId('player');
  assertPseudonymousId(playerId, 'playerId');
  const session = GameSessionSchema.parse({
    schemaVersion: GAME_SCHEMA_VERSION,
    id: newId('session'),
    playerId,
    tenantSlug: input.tenantSlug,
    status: 'active',
    startedAt: now().toISOString(),
  });
  store.put({
    session,
    player: PlayerProfileSchema.parse({
      schemaVersion: GAME_SCHEMA_VERSION,
      playerId,
      tenantSlug: input.tenantSlug,
    }),
    edges: [],
    inventory: {
      schemaVersion: GAME_SCHEMA_VERSION,
      playerId,
      items: [],
    },
    events: [],
    discoveredWorlds: ['nexus'],
    unlockedWorlds: ['nexus'],
    bits: [],
    bonds: [],
    cards: [],
    mapFragments: [],
  });
  recordEvent(store, {
    sessionId: session.id,
    type: 'session.started',
    evidence: 'Explorer opened a game session',
    now,
  });
  return store.get(session.id).session;
}
