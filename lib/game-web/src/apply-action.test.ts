import { describe, expect, it } from 'vitest';
import { ALLOWED_PALETTES } from '@intcloudsysops/game-core';
import { applyPlayAction, viewFromSave } from './apply-action.js';
import { ExplorerFormSchema, assertNoForbiddenExplorerFields } from './schemas.js';
import { createMemoryStorage } from './storage.js';
import { emptySave } from './types.js';

const explorer = {
  displayName: 'Explorer NovaBlue',
  palette: ALLOWED_PALETTES[0],
  avatarVariant: 'ring' as const,
};

describe('explorer form child-safety', () => {
  it('accepts a pseudonymous alias only', () => {
    expect(ExplorerFormSchema.parse(explorer).displayName).toBe('Explorer NovaBlue');
  });

  it('rejects PII field names', () => {
    expect(() =>
      assertNoForbiddenExplorerFields({ ...explorer, email: 'kid@school.test' }),
    ).toThrow(/email/);
    expect(() => ExplorerFormSchema.parse({ ...explorer, email: 'a@b.c' })).toThrow();
  });

  it('rejects emails as aliases', () => {
    expect(() => ExplorerFormSchema.parse({ ...explorer, displayName: 'ada@school.test' })).toThrow();
  });
});

describe('First Portal play adapter', () => {
  it('runs begin → explorer → nexus → portal retry → complete → persist', () => {
    const storage = createMemoryStorage();
    let save = emptySave();
    save = applyPlayAction(save, { type: 'begin' }).save;
    expect(save.runtime?.events.some((event) => event.type === 'session.started')).toBe(true);
    save = applyPlayAction(save, { type: 'create-explorer', explorer }).save;
    expect(save.screen).toBe('nexus');
    save = applyPlayAction(save, { type: 'advance-dialogue' }).save;
    expect(save.screen).toBe('dialogue');
    expect(save.runtime?.player.explorer?.displayName).toBe('Explorer NovaBlue');
    while (save.screen === 'dialogue') {
      save = applyPlayAction(save, { type: 'advance-dialogue' }).save;
    }
    save = applyPlayAction(save, { type: 'enter-first-portal' }).save;
    expect(save.screen).toBe('portal');
    expect(save.runtime?.events.some((event) => event.type === 'mission.started')).toBe(true);
    save = applyPlayAction(save, {
      type: 'connect',
      from: 'node-output',
      to: 'node-input',
    }).save;
    expect(save.runtime?.events.some((event) => event.type === 'mission.retried')).toBe(true);
    expect(save.retryMessage).toMatch(/Not yet/);
    save = applyPlayAction(save, {
      type: 'connect',
      from: 'node-input',
      to: 'node-process',
    }).save;
    save = applyPlayAction(save, {
      type: 'connect',
      from: 'node-process',
      to: 'node-output',
    }).save;
    expect(save.screen).toBe('complete');
    expect(save.runtime?.events.some((event) => event.type === 'mission.completed')).toBe(true);
    expect(save.runtime?.events.some((event) => event.type === 'collectible.earned')).toBe(true);
    expect(save.runtime?.events.some((event) => event.type === 'map-fragment.earned')).toBe(true);
    storage.save(save);
    const reloaded = viewFromSave(storage.load());
    expect(reloaded.save.screen).toBe('complete');
    expect(reloaded.view.inventory.map((item) => item.family)).toEqual(
      expect.arrayContaining(['knowledge-fragment', 'map-fragment']),
    );
    const nexus = applyPlayAction(reloaded.save, { type: 'return-to-nexus' });
    expect(nexus.save.screen).toBe('nexus');
    expect(nexus.view.portals.some((portal) => portal.id === 'wild' && portal.status === 'available')).toBe(
      true,
    );
    expect(nexus.view.nova.id).toBe('nova');
    expect(nexus.view.traveler.id).toBe('traveler');
    expect(nexus.view.worldName).toBe('NEXUS');
  });

  it('migrates a First Portal v1 save and plays WILD through to a Bit Card', () => {
    const first = applyPlayAction(emptySave(), { type: 'begin' }).save;
    const created = applyPlayAction(first, { type: 'create-explorer', explorer }).save;
    let save = created;
    save = applyPlayAction(save, { type: 'advance-dialogue' }).save;
    while (save.screen === 'dialogue') {
      save = applyPlayAction(save, { type: 'advance-dialogue' }).save;
    }
    save = applyPlayAction(save, { type: 'enter-first-portal' }).save;
    save = applyPlayAction(save, { type: 'connect', from: 'node-input', to: 'node-process' }).save;
    save = applyPlayAction(save, { type: 'connect', from: 'node-process', to: 'node-output' }).save;
    const legacy = {
      schemaVersion: '1.0.0',
      screen: 'complete',
      dialogueIndex: 4,
      avatarVariant: 'ring',
      runtime: {
        ...save.runtime,
        discoveredWorlds: undefined,
        unlockedWorlds: undefined,
        bits: undefined,
        bonds: undefined,
        cards: undefined,
        mapFragments: undefined,
      },
    };
    const migrated = viewFromSave(legacy);
    expect(migrated.save.schemaVersion).toBe('1.1.0');
    expect(migrated.save.runtime?.unlockedWorlds).toContain('wild');
    expect(migrated.view.storageKey).toBe('opsly.universe.player.v1');
    let wild = applyPlayAction(migrated.save, { type: 'return-to-nexus' }).save;
    wild = applyPlayAction(wild, { type: 'enter-wild' }).save;
    expect(wild.screen).toBe('wild');
    expect(wild.runtime?.events.some((event) => event.type === 'portal.entered')).toBe(true);
    wild = applyPlayAction(wild, { type: 'continue-wild' }).save;
    expect(wild.screen).toBe('first-bit');
    wild = applyPlayAction(wild, { type: 'apply-wild-choice', choice: 'approach' }).save;
    expect(wild.retryMessage).toMatch(/Dewthread hid/);
    wild = applyPlayAction(wild, { type: 'apply-wild-choice', choice: 'observe' }).save;
    wild = applyPlayAction(wild, { type: 'apply-wild-choice', choice: 'build-help' }).save;
    expect(wild.screen).toBe('connection');
    expect(wild.runtime?.bits).toContain('dewthread');
    wild = applyPlayAction(wild, { type: 'continue-wild' }).save;
    expect(wild.screen).toBe('bit-card');
    const storage = createMemoryStorage();
    storage.save(wild);
    const reloaded = viewFromSave(storage.load());
    expect(reloaded.view.card?.title).toBe('Dewthread');
    expect(reloaded.view.bondState).toBe('connected');
    expect(reloaded.view.maya?.id).toBe('maya');
    const home = applyPlayAction(reloaded.save, { type: 'return-to-nexus' });
    expect(home.save.screen).toBe('nexus');
    expect(home.view.portals.find((portal) => portal.id === 'wild')?.status).toBe('available');
  });
});
