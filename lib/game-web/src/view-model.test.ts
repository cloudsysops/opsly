import { describe, expect, it } from 'vitest';
import { emptySave } from './types.js';
import { buildPlayView } from './view-model.js';

describe('play view projects Universe canon', () => {
  it('resolves NØVA, Traveler, and NEXUS without local character tables', () => {
    const view = buildPlayView(emptySave());
    expect(view.nova.id).toBe('nova');
    expect(view.nova.name).toBe('NØVA');
    expect(view.traveler.id).toBe('traveler');
    expect(view.traveler.name).toBe('THE TRAVELER');
    expect(view.worldName).toBe('NEXUS');
    expect(view.explorerOptions.palettes.length).toBeGreaterThan(0);
    expect(view.storageKey).toMatch(/first-portal/);
  });
});
