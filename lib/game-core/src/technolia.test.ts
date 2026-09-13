import { describe, expect, it } from 'vitest';
import {
  constructBuilding,
  createTechnoliaProgression,
  discoverTechnoliaRegion,
  researchTechnology,
} from './technolia.js';

describe('Technolia progression', () => {
  it('keeps the canonical technology/building path economically reachable', () => {
    let state = createTechnoliaProgression();
    state = constructBuilding(state, 'nexus-core');
    state = constructBuilding(state, 'portal-gateway');
    state = constructBuilding(state, 'memory-vault');
    state = researchTechnology(state, 'structured-requests');
    state = discoverTechnoliaRegion(state, 'echo-ridge');
    state = discoverTechnoliaRegion(state, 'data-canyon');
    state = constructBuilding(state, 'identity-citadel');
    state = constructBuilding(state, 'api-forge');
    state = constructBuilding(state, 'dragon-queue');
    state = researchTechnology(state, 'trust-boundaries');
    state = researchTechnology(state, 'event-driven-systems');
    state = discoverTechnoliaRegion(state, 'dragon-docks');
    state = constructBuilding(state, 'nx-foundry');
    state = constructBuilding(state, 'observatory');
    state = researchTechnology(state, 'observability-first');
    state = discoverTechnoliaRegion(state, 'shadow-boundary');
    state = constructBuilding(state, 'threat-lab');
    state = researchTechnology(state, 'secure-delivery');
    state = discoverTechnoliaRegion(state, 'starship-basin');
    state = constructBuilding(state, 'shipyard');
    state = constructBuilding(state, 'backup-archive');
    state = constructBuilding(state, 'resilience-grid');
    state = researchTechnology(state, 'distributed-resilience');
    state = discoverTechnoliaRegion(state, 'stellar-frontier');
    state = constructBuilding(state, 'stellar-distributed-core');
    expect(state.era).toBe('STELLAR_ERA');
  });

  it('enforces the explicit region adjacency graph', () => {
    const state = {
      ...createTechnoliaProgression(),
      technologies: ['distributed-resilience'],
    };
    expect(() => discoverTechnoliaRegion(state, 'stellar-frontier')).toThrow(
      'REGION_LOCKED:stellar-frontier',
    );
  });
});
