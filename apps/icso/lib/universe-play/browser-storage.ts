export const PLAY_STORAGE_KEY = 'opsly.universe.first-portal.v1';

export interface PlayBrowserStorage {
  load(): unknown | null;
  save(value: unknown): void;
  clear(): void;
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
      const raw = storage.getItem(key);
      if (!raw) {
        return null;
      }
      try {
        return JSON.parse(raw) as unknown;
      } catch {
        return null;
      }
    },
    save(value: unknown): void {
      if (!storage) {
        return;
      }
      storage.setItem(key, JSON.stringify(value));
    },
    clear(): void {
      storage?.removeItem(key);
    },
  };
}
