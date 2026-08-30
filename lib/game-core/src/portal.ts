import { getWorld } from '@intcloudsysops/universe';
import { FIRST_PORTAL_ID, FIRST_PORTAL_WORLD_ID, GAME_SCHEMA_VERSION } from './constants.js';
import { recordEvent } from './events.js';
import { newId } from './ids.js';
import { WorldInstanceSchema } from './schemas.js';
import type { GameStore } from './store.js';
import type { WorldInstance } from './types.js';

export function resolvePortalWorldId(portalId: string): string {
  if (portalId === FIRST_PORTAL_ID) {
    return FIRST_PORTAL_WORLD_ID;
  }
  throw new Error(`Unknown portal: ${portalId}`);
}

export function enterPortal(
  store: GameStore,
  sessionId: string,
  portalId: string,
  now: () => Date,
): WorldInstance {
  const universeWorldId = resolvePortalWorldId(portalId);
  getWorld(universeWorldId);
  const instance = WorldInstanceSchema.parse({
    schemaVersion: GAME_SCHEMA_VERSION,
    id: newId('world'),
    sessionId,
    portalId,
    universeWorldId,
    status: 'open',
  });
  const state = store.get(sessionId);
  if (!state.player.explorer) {
    throw new Error('Choose an explorer before entering a portal');
  }
  state.world = instance;
  state.session = { ...state.session, portalId, worldInstanceId: instance.id };
  store.put(state);
  recordEvent(store, {
    sessionId,
    type: 'portal.entered',
    evidence: `Explorer entered ${portalId} into Universe world ${universeWorldId}`,
    context: { portalId, universeWorldId },
    now,
  });
  return instance;
}
