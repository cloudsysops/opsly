import { describe, expect, it } from 'vitest';
import {
  FIRST_BIT_ID,
  FIRST_PORTAL_ID,
  FIRST_PORTAL_MISSION_ID,
  IPO_INPUT_NODE,
  IPO_OUTPUT_NODE,
  IPO_PROCESS_NODE,
  KNOWLEDGE_FRAGMENT_IPO_ID,
  MAP_FRAGMENT_FIRST_PORTAL_ID,
  MAP_FRAGMENT_WILD_ID,
  WILD_MISSION_ID,
  WILD_PORTAL_ID,
  WILD_WORLD_ID,
  createGameRuntime,
  getFirstPortalMission,
  getWildMission,
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

function completeFirstPortal(game: ReturnType<typeof createGameRuntime>, sessionId: string): void {
  game.enterPortal(sessionId, FIRST_PORTAL_ID);
  game.startMission(sessionId, FIRST_PORTAL_MISSION_ID);
  game.connectNodes(sessionId, IPO_INPUT_NODE, IPO_PROCESS_NODE);
  game.connectNodes(sessionId, IPO_PROCESS_NODE, IPO_OUTPUT_NODE);
}

describe('game-core WILD Dewthread loop', () => {
  it('unlocks WILD after First Portal and forms a connection without capture', () => {
    const game = createGameRuntime({ now: () => new Date('2026-08-18T00:00:00.000Z') });
    const session = game.startSession({ tenantSlug: 'opsly' });
    game.chooseExplorer(session.id, { displayName: 'Explorer' });
    completeFirstPortal(game, session.id);
    expect(game.getState(session.id).unlockedWorlds).toContain(WILD_WORLD_ID);
    expect(getWildMission().guideCharacterId).toBe('maya');
    const wild = game.enterPortal(session.id, WILD_PORTAL_ID);
    expect(wild.universeWorldId).toBe('wild');
    game.startMission(session.id, WILD_MISSION_ID);
    const rushed = game.applyWildChoice(session.id, 'approach');
    expect(rushed.status).toBe('in-progress');
    expect(game.getEvents(session.id).some((event) => event.type === 'mission.retried')).toBe(true);
    game.applyWildChoice(session.id, 'observe');
    const connected = game.applyWildChoice(session.id, 'build-help');
    expect(connected.status).toBe('completed');
    const state = game.getState(session.id);
    expect(state.bits).toContain(FIRST_BIT_ID);
    expect(state.bonds.find((bond) => bond.bitId === FIRST_BIT_ID)?.state).toBe('connected');
    expect(state.cards.some((card) => card.bitId === FIRST_BIT_ID)).toBe(true);
    expect(state.mapFragments).toContain(MAP_FRAGMENT_WILD_ID);
    const types = game.getEvents(session.id).map((event) => event.type);
    expect(types).toEqual(
      expect.arrayContaining([
        'portal.entered',
        'bit.encountered',
        'choice.made',
        'bond.connected',
        'card.unlocked',
        'collectible.earned',
        'map-fragment.earned',
        'mission.completed',
      ]),
    );
    expect(types.every((type) => !/^(diagnosis|iq|destiny|career|personality)\./.test(type))).toBe(
      true,
    );
    const again = game.applyWildChoice(session.id, 'build-help');
    expect(again.status).toBe('completed');
    const wildItems = game
      .getInventory(session.id)
      .items.filter((item) => item.id === MAP_FRAGMENT_WILD_ID);
    expect(wildItems).toHaveLength(1);
  });

  it('accepts observe then approach, and ask-maya then build-help', () => {
    const observePath = createGameRuntime({ now: () => new Date('2026-08-18T00:00:00.000Z') });
    const sessionA = observePath.startSession({ tenantSlug: 'opsly' });
    observePath.chooseExplorer(sessionA.id, { displayName: 'Explorer' });
    completeFirstPortal(observePath, sessionA.id);
    observePath.enterPortal(sessionA.id, WILD_PORTAL_ID);
    observePath.startMission(sessionA.id, WILD_MISSION_ID);
    observePath.applyWildChoice(sessionA.id, 'observe');
    expect(observePath.applyWildChoice(sessionA.id, 'approach').status).toBe('completed');

    const mayaPath = createGameRuntime({ now: () => new Date('2026-08-18T00:00:00.000Z') });
    const sessionB = mayaPath.startSession({ tenantSlug: 'opsly' });
    mayaPath.chooseExplorer(sessionB.id, { displayName: 'Explorer' });
    completeFirstPortal(mayaPath, sessionB.id);
    mayaPath.enterPortal(sessionB.id, WILD_PORTAL_ID);
    mayaPath.startMission(sessionB.id, WILD_MISSION_ID);
    mayaPath.applyWildChoice(sessionB.id, 'ask-maya');
    expect(mayaPath.getState(sessionB.id).wild?.mayaHint).toMatch(/Dewthread is stuck/);
    expect(mayaPath.applyWildChoice(sessionB.id, 'build-help').status).toBe('completed');
    expect(
      mayaPath
        .getState(sessionB.id)
        .bonds.find((bond) => bond.bitId === FIRST_BIT_ID)
        ?.experiences,
    ).toEqual(expect.arrayContaining(['requested-guide-information', 'chose-construction-solution']));
  });

  it('keeps WILD locked until First Portal awards the map fragment', () => {
    const game = createGameRuntime();
    const session = game.startSession({ tenantSlug: 'opsly' });
    game.chooseExplorer(session.id, { displayName: 'Explorer' });
    expect(() => game.enterPortal(session.id, WILD_PORTAL_ID)).toThrow(/locked/i);
  });
});
