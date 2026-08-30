import { recordEvent } from './events.js';
import { FIRST_PORTAL_COLLECTIBLES } from './first-portal.js';
import type { GameStore } from './store.js';
import type { Collectible } from './types.js';

export function grantCollectibles(
  store: GameStore,
  sessionId: string,
  now: () => Date,
): Collectible[] {
  const state = store.get(sessionId);
  const granted: Collectible[] = [];
  for (const item of FIRST_PORTAL_COLLECTIBLES) {
    if (state.inventory.items.some((existing) => existing.id === item.id)) {
      continue;
    }
    state.inventory.items.push(item);
    granted.push(item);
    const eventType = item.family === 'map-fragment' ? 'map-fragment.earned' : 'collectible.earned';
    recordEvent(store, {
      sessionId,
      type: eventType,
      missionId: state.mission?.missionId,
      evidence: `Explorer earned ${item.name}`,
      context: { collectibleId: item.id, family: item.family },
      now,
    });
  }
  store.put(state);
  return granted;
}
