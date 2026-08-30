import { describe, expect, it } from 'vitest';
import type { Territory } from '../src/types.js';
import {
  findExclusiveTerritoryConflicts,
  haversineMeters,
  territoriesOverlap,
  territoryTypeFromGeo,
  validateTerritory,
} from '../src/territory.js';

function baseTerritory(overrides: Partial<Territory> = {}): Territory {
  return {
    id: '11111111-1111-4111-8111-111111111111',
    tenantId: 'peskids',
    name: 'Zona Rionegro',
    type: 'radius',
    status: 'active',
    exclusive: true,
    exclusiveFor: 'home_service',
    serviceModel: 'domicilio',
    validFrom: '2026-01-01T00:00:00.000Z',
    validTo: '2027-01-01T00:00:00.000Z',
    geo: { kind: 'radius', center: { lat: 6.15, lng: -75.37 }, radiusMeters: 5_000 },
    createdAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('haversineMeters', () => {
  it('computes ~0m for identical coordinates', () => {
    const a = { lat: 6.15, lng: -75.37 };
    expect(haversineMeters(a, a)).toBeLessThan(1);
  });

  it('computes a plausible distance between two points (~111km per degree of lat)', () => {
    const d = haversineMeters({ lat: 0, lng: 0 }, { lat: 1, lng: 0 });
    expect(d).toBeGreaterThan(110_000);
    expect(d).toBeLessThan(112_000);
  });
});

describe('territoriesOverlap', () => {
  it('reports radius overlap when circles intersect', () => {
    const a = baseTerritory();
    const b = baseTerritory({
      id: '22222222-2222-4222-8222-222222222222',
      geo: { kind: 'radius', center: { lat: 6.17, lng: -75.37 }, radiusMeters: 5_000 },
    });
    const outcome = territoriesOverlap(a, b);
    expect(outcome.overlapping).toBe(true);
    expect(outcome.confidence).toBe('high');
  });

  it('reports no overlap for distant circles', () => {
    const a = baseTerritory();
    const b = baseTerritory({
      id: '22222222-2222-4222-8222-222222222222',
      geo: { kind: 'radius', center: { lat: 7.5, lng: -75.37 }, radiusMeters: 5_000 },
    });
    expect(territoriesOverlap(a, b).overlapping).toBe(false);
  });

  it('ignores non-exclusive territories', () => {
    const a = baseTerritory({ exclusive: false });
    const b = baseTerritory({ id: '22222222-2222-4222-8222-222222222222' });
    expect(territoriesOverlap(a, b).overlapping).toBe(false);
  });

  it('does not conflict across delivery models', () => {
    const a = baseTerritory({ exclusiveFor: 'fixed_location' });
    const b = baseTerritory({
      id: '22222222-2222-4222-8222-222222222222',
      exclusiveFor: 'home_service',
    });
    expect(territoriesOverlap(a, b).overlapping).toBe(false);
  });

  it('does not conflict across different service models', () => {
    const a = baseTerritory({ serviceModel: 'domicilio' });
    const b = baseTerritory({
      id: '22222222-2222-4222-8222-222222222222',
      serviceModel: 'sede',
    });
    expect(territoriesOverlap(a, b).overlapping).toBe(false);
  });

  it('does not conflict on non-overlapping date windows', () => {
    const a = baseTerritory({ validTo: '2026-06-01T00:00:00.000Z' });
    const b = baseTerritory({
      id: '22222222-2222-4222-8222-222222222222',
      validFrom: '2026-07-01T00:00:00.000Z',
    });
    expect(territoriesOverlap(a, b).overlapping).toBe(false);
  });

  it('reports unknown confidence for municipality geometry', () => {
    const a = baseTerritory({
      geo: { kind: 'municipality', code: '05001', name: 'Rionegro' },
    });
    const b = baseTerritory({
      id: '22222222-2222-4222-8222-222222222222',
      geo: { kind: 'municipality', code: '05002', name: 'El Retiro' },
    });
    const outcome = territoriesOverlap(a, b);
    expect(outcome.confidence).toBe('unknown');
  });
});

describe('findExclusiveTerritoryConflicts', () => {
  it('finds overlapping exclusive pairs and skips same-unit pairs', () => {
    const a = baseTerritory({ unitId: 'u1' });
    const b = baseTerritory({ id: '22222222-2222-4222-8222-222222222222', unitId: 'u1' });
    const c = baseTerritory({
      id: '33333333-3333-4333-8333-333333333333',
      unitId: 'u2',
      geo: { kind: 'radius', center: { lat: 7.5, lng: -75.37 }, radiusMeters: 5_000 },
    });
    const conflicts = findExclusiveTerritoryConflicts([a, b, c]);
    expect(conflicts).toHaveLength(0);
  });

  it('detects a real conflict between different units', () => {
    const a = baseTerritory({ unitId: 'u1' });
    const b = baseTerritory({
      id: '22222222-2222-4222-8222-222222222222',
      unitId: 'u2',
      geo: { kind: 'radius', center: { lat: 6.17, lng: -75.37 }, radiusMeters: 5_000 },
    });
    const conflicts = findExclusiveTerritoryConflicts([a, b]);
    expect(conflicts).toHaveLength(1);
    expect(conflicts[0].confidence).toBe('high');
  });
});

describe('validateTerritory + territoryTypeFromGeo', () => {
  it('validates a well-formed territory', () => {
    expect(validateTerritory(baseTerritory()).valid).toBe(true);
  });

  it('flags exclusive territory without exclusiveFor', () => {
    const result = validateTerritory(baseTerritory({ exclusiveFor: null }));
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('exclusive_territory_needs_exclusiveFor');
  });

  it('flags inverted date range', () => {
    const result = validateTerritory(
      baseTerritory({ validFrom: '2027-01-01T00:00:00.000Z', validTo: '2026-01-01T00:00:00.000Z' })
    );
    expect(result.valid).toBe(false);
  });

  it('maps geo kinds to territory types', () => {
    expect(
      territoryTypeFromGeo({ kind: 'radius', center: { lat: 0, lng: 0 }, radiusMeters: 100 })
    ).toBe('radius');
    expect(
      territoryTypeFromGeo({
        kind: 'polygon',
        vertices: [
          { lat: 0, lng: 0 },
          { lat: 1, lng: 0 },
          { lat: 1, lng: 1 },
        ],
      })
    ).toBe('polygon');
    expect(territoryTypeFromGeo({ kind: 'municipality', code: 'X' })).toBe('municipality');
  });
});
