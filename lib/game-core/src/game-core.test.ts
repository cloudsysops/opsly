import { describe, expect, it } from 'vitest';
import {
  FIRST_PORTAL_ID,
  FIRST_PORTAL_MISSION_ID,
  IPO_INPUT_NODE,
  IPO_OUTPUT_NODE,
  IPO_PROCESS_NODE,
  KNOWLEDGE_FRAGMENT_IPO_ID,
  MAP_FRAGMENT_FIRST_PORTAL_ID,
  createGameRuntime,
  getFirstPortalMission,
} from './index.js';

describe('game-core First Portal loop', () => {
  it('runs session → explorer → portal → IPO mission → collectibles', () => {
    const game = createGameRuntime({ now: () => new Date('2026-08-17T00:00:00.000Z') });
    const session = game.startSession({ tenantSlug: 'opsly' });
    game.chooseExplorer(session.id, {
      displayName: 'Explorer',
      companionCharacterId: 'wavo',
    });
    const world = game.enterPortal(session.id, FIRST_PORTAL_ID);
    expect(world.universeWorldId).toBe('nexus');
    expect(getFirstPortalMission().guideCharacterId).toBe('nova');
    game.startMission(session.id, FIRST_PORTAL_MISSION_ID);
    game.connectNodes(session.id, IPO_OUTPUT_NODE, IPO_INPUT_NODE);
    const done = game.connectNodes(session.id, IPO_INPUT_NODE, IPO_PROCESS_NODE);
    expect(done.status).toBe('in-progress');
    const completed = game.connectNodes(session.id, IPO_PROCESS_NODE, IPO_OUTPUT_NODE);
    expect(completed.status).toBe('completed');
    const ids = game.getInventory(session.id).items.map((item) => item.id);
    expect(ids).toContain(KNOWLEDGE_FRAGMENT_IPO_ID);
    expect(ids).toContain(MAP_FRAGMENT_FIRST_PORTAL_ID);
    const types = game.getEvents(session.id).map((event) => event.type);
    expect(types).toContain('session.started');
    expect(types).toContain('mission.retried');
    expect(types).toContain('mission.completed');
    expect(types).toContain('collectible.earned');
    expect(types.every((type) => !/^(diagnosis|iq|destiny)\./.test(type))).toBe(true);
  });

  it('rejects contact identity as playerId', () => {
    const game = createGameRuntime();
    expect(() => game.startSession({ tenantSlug: 'opsly', playerId: 'kid@example.com' })).toThrow(
      /pseudonymous/,
    );
  });

  it('requires an explorer before entering a portal', () => {
    const game = createGameRuntime();
    const session = game.startSession({ tenantSlug: 'opsly' });
    expect(() => game.enterPortal(session.id, FIRST_PORTAL_ID)).toThrow(/explorer/i);
  });

  it('restores a snapshot into a new runtime', () => {
    const original = createGameRuntime({ now: () => new Date('2026-08-17T00:00:00.000Z') });
    const session = original.startSession({ tenantSlug: 'opsly' });
    original.chooseExplorer(session.id, { displayName: 'Explorer' });
    const snapshot = original.exportSnapshot(session.id);
    const restored = createGameRuntime({ now: () => new Date('2026-08-17T00:00:00.000Z') });
    restored.restoreSnapshot(snapshot);
    expect(restored.getState(session.id).player.explorer?.displayName).toBe('Explorer');
  });
});
