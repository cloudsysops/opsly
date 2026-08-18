import { recordEvent } from './events.js';
import type { GameStore } from './store.js';
import type { Collectible } from './types.js';

function rememberMapFragment(store: GameStore, sessionId: string, item: Collectible): void {
  const state = store.get(sessionId);
  if (item.family === 'map-fragment' && !state.mapFragments.includes(item.id)) {
    state.mapFragments = [...state.mapFragments, item.id];
  }
  store.put(state);
}

export function grantCollectibles(
  store: GameStore,
  sessionId: string,
  now: () => Date,
  items: Collectible[],
): Collectible[] {
  const granted: Collectible[] = [];
  for (const item of items) {
    const state = store.get(sessionId);
    if (state.inventory.items.some((existing) => existing.id === item.id)) {
      continue;
    }
    state.inventory.items.push(item);
    store.put(state);
    rememberMapFragment(store, sessionId, item);
    const eventType = item.family === 'map-fragment' ? 'map-fragment.earned' : 'collectible.earned';
    recordEvent(store, {
      sessionId,
      type: eventType,
      missionId: store.get(sessionId).mission?.missionId,
      evidence: `Explorer earned ${item.name}`,
      context: { collectibleId: item.id, family: item.family },
      now,
    });
    granted.push(item);
  }
  return granted;
}
