export const PLAY_STORAGE_KEY = 'opsly.universe.player.v1';
export const LEGACY_PLAY_STORAGE_KEY = 'opsly.universe.first-portal.v1';

export interface PlayBrowserStorage {
  load(): unknown | null;
  save(value: unknown): void;
  clear(): void;
}

function readJson(storage: Pick<Storage, 'getItem'>, key: string): unknown | null {
  const raw = storage.getItem(key);
  if (!raw) {
    return null;
  }
  try {
    return JSON.parse(raw) as unknown;
  } catch {
    return null;
  }
}

export function createPlayBrowserStorage(
  storage: Pick<Storage, 'getItem' | 'setItem' | 'removeItem'> | null,
  key: string = PLAY_STORAGE_KEY,
): PlayBrowserStorage {
  return {
    load(): unknown | null {
      if (!storage) {
        return null;
      }
      return readJson(storage, key) ?? readJson(storage, LEGACY_PLAY_STORAGE_KEY);
    },
    save(value: unknown): void {
      if (!storage) {
        return;
      }
      storage.setItem(key, JSON.stringify(value));
    },
    clear(): void {
      storage?.removeItem(key);
      storage?.removeItem(LEGACY_PLAY_STORAGE_KEY);
    },
  };
}
