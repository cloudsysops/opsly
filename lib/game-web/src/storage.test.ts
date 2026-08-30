import { describe, expect, it } from 'vitest';
import { emptySave } from './types.js';
import { createMemoryStorage } from './storage.js';

describe('PlayerStateStorage memory adapter', () => {
  it('round-trips a versioned save', () => {
    const storage = createMemoryStorage();
    expect(storage.load()).toBeNull();
    const save = emptySave();
    storage.save(save);
    expect(storage.load()?.schemaVersion).toBe(save.schemaVersion);
    storage.clear();
    expect(storage.load()).toBeNull();
  });
});
