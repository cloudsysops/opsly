import { describe, expect, it } from 'vitest';
import { createPlayBrowserStorage, LEGACY_PLAY_STORAGE_KEY, PLAY_STORAGE_KEY } from '../browser-storage';
import { LEGACY_STORAGE_KEY, STORAGE_KEY } from '@intcloudsysops/game-web';

describe('play browser storage', () => {
  it('uses the versioned player save key', () => {
    expect(PLAY_STORAGE_KEY).toBe(STORAGE_KEY);
    expect(LEGACY_PLAY_STORAGE_KEY).toBe(LEGACY_STORAGE_KEY);
  });

  it('reads a legacy First Portal snapshot when the new key is empty', () => {
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
    memory.set(LEGACY_PLAY_STORAGE_KEY, JSON.stringify({ schemaVersion: '1.0.0', screen: 'complete' }));
    expect((storage.load() as { screen: string }).screen).toBe('complete');
    storage.save({ schemaVersion: '1.1.0', screen: 'nexus' });
    expect(memory.get(PLAY_STORAGE_KEY)).toContain('nexus');
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
    storage.save({ schemaVersion: '1.1.0', screen: 'complete' });
    expect((storage.load() as { screen: string }).screen).toBe('complete');
    storage.clear();
    expect(storage.load()).toBeNull();
  });
});
