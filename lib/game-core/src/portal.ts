import { getWorld } from '@intcloudsysops/universe';
import {
  FIRST_PORTAL_ID,
  FIRST_PORTAL_WORLD_ID,
  GAME_SCHEMA_VERSION,
  MAP_FRAGMENT_FIRST_PORTAL_ID,
  WILD_PORTAL_ID,
  WILD_WORLD_ID,
} from './constants.js';
import { recordEvent } from './events.js';
import { newId } from './ids.js';
import { WorldInstanceSchema } from './schemas.js';
import type { GameStore } from './store.js';
import type { WorldInstance } from './types.js';

export function resolvePortalWorldId(portalId: string): string {
  if (portalId === FIRST_PORTAL_ID) return FIRST_PORTAL_WORLD_ID;
  if (portalId === WILD_PORTAL_ID) return WILD_WORLD_ID;
  throw new Error(`Unknown portal: ${portalId}`);
}

function assertPortalUnlocked(store: GameStore, sessionId: string, portalId: string): void {
  if (portalId === FIRST_PORTAL_ID) return;
  const state = store.get(sessionId);
  const worldId = resolvePortalWorldId(portalId);
  const unlocked = state.unlockedWorlds.includes(worldId);
  const hasKey = state.inventory.items.some((item) => item.id === MAP_FRAGMENT_FIRST_PORTAL_ID);
  if (!unlocked && !hasKey) {
    throw new Error(`Portal ${portalId} is still locked`);
  }
}

function rememberWorld(store: GameStore, sessionId: string, worldId: string): void {
  const state = store.get(sessionId);
  if (!state.discoveredWorlds.includes(worldId)) {
    state.discoveredWorlds = [...state.discoveredWorlds, worldId];
  }
  store.put(state);
}

export function enterPortal(
  store: GameStore,
  sessionId: string,
  portalId: string,
  now: () => Date,
): WorldInstance {
  assertPortalUnlocked(store, sessionId, portalId);
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
  rememberWorld(store, sessionId, universeWorldId);
  recordEvent(store, {
    sessionId,
    type: 'portal.entered',
    evidence: `Explorer entered ${portalId} into Universe world ${universeWorldId}`,
    context: { portalId, universeWorldId },
    now,
  });
  return instance;
}
