import { describe, expect, it } from 'vitest';
import { createPlayBrowserStorage, PLAY_STORAGE_KEY } from '../browser-storage';
import { STORAGE_KEY } from '@intcloudsysops/game-web';

describe('play browser storage', () => {
  it('uses the versioned Game Core play key', () => {
    expect(PLAY_STORAGE_KEY).toBe(STORAGE_KEY);
  });

  it('persists JSON across load', () => {
    const memory = new Map<string, string>();
    const storage = createPlayBrowserStorage({
      getItem: (key) => memory.get(key) ?? null,
      setItem: (key, value) => {
        memory.set(key, value);
      },
      removeItem: (key) => {
        memory.delete(key);
      },
    });
    storage.save({ schemaVersion: '1.0.0', screen: 'complete' });
    expect((storage.load() as { screen: string }).screen).toBe('complete');
    storage.clear();
    expect(storage.load()).toBeNull();
  });
});
