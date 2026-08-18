import type { PlayerStateStorage, PlaySave } from './types.js';

export function createMemoryStorage(): PlayerStateStorage {
  let current: PlaySave | null = null;
  return {
    load: () => (current ? structuredClone(current) : null),
    save: (value) => {
      current = structuredClone(value);
    },
    clear: () => {
      current = null;
    },
  };
}
