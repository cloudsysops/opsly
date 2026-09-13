import { describe, expect, it } from 'vitest';
import {
  constructBuilding,
  createTechnoliaProgression,
  buildTechnoliaMachine,
  evaluateCyberDefense,
  getAstralArenaMissions,
  getAstralTechSpecialization,
  resolveAstralAffinity,
  TECHNOLIA_BUILDINGS,
  TECHNOLIA_MAP,
  STARSHIP_MODULES,
} from './index.js';

describe('Astral Arena', () => {
  it('registers the canonical Season 1 mission arc', () => {
    const missions = getAstralArenaMissions();
    expect(missions.length).toBe(16);
    expect(missions[0]?.id).toBe('awakening-sisters-001');
    expect(missions.at(-1)?.id).toBe('umbra-memory-001');
    expect(missions.every((mission) => mission.universeWorldId === 'astral-arena')).toBe(true);
  });

  it('derives a fictional elemental affinity from birth date', () => {
    const aries = resolveAstralAffinity('2017-03-25');
    expect(aries.sign).toBe('ARIES');
    expect(aries.element).toBe('FIRE');
    expect(aries.baseTechniques.length).toBe(3);

    const aquarius = resolveAstralAffinity('2017-02-01');
    expect(aquarius.sign).toBe('AQUARIUS');
    expect(aquarius.element).toBe('AIR');
    expect(getAstralTechSpecialization('AIR').architectureFocus).toContain('networking');
  });
});

describe('Cyber Arena', () => {
  it('requires the matching defensive architecture', () => {
    const incomplete = evaluateCyberDefense('cyber-001-bot-swarm', ['OBSERVABILITY']);
    expect(incomplete.passed).toBe(false);
    expect(incomplete.missingDefenses).toContain('RATE_LIMIT_SHIELD');

    const defended = evaluateCyberDefense('cyber-001-bot-swarm', [
      'RATE_LIMIT_SHIELD',
      'OBSERVABILITY',
    ]);
    expect(defended.passed).toBe(true);
  });
});

describe('Technolia progression', () => {
  it('enforces build order and produces machines from built infrastructure', () => {
    let state = createTechnoliaProgression();
    expect(() => constructBuilding(state, 'identity-citadel')).toThrow('BUILDING_LOCKED');

    state = constructBuilding(state, 'nexus-core');
    state = constructBuilding(state, 'portal-gateway');
    state = buildTechnoliaMachine(state, 'zephyr-scout');

    expect(state.buildings).toContain('nexus-core');
    expect(state.buildings).toContain('portal-gateway');
    expect(state.machines).toContain('zephyr-scout');
  });

  it('exposes a full civilization, map, and starship progression', () => {
    expect(TECHNOLIA_BUILDINGS.length).toBeGreaterThanOrEqual(10);
    expect(TECHNOLIA_MAP.some((region) => region.id === 'stellar-frontier')).toBe(true);
    expect(STARSHIP_MODULES.some((module) => module.id === 'wing-drive')).toBe(true);
  });
});
