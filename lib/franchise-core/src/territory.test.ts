import { describe, expect, it } from 'vitest';
import { findTerritoryConflicts } from './territory.js';
import type { Territory } from './types.js';

function base(partial: Partial<Territory> & Pick<Territory, 'id' | 'name' | 'geometry' | 'exclusiveFor'>): Territory {
  return {
    tenantId: 'tenant-a',
    status: 'active',
    exclusive: true,
    validFrom: '2026-01-01',
    validTo: null,
    unitId: null,
    ...partial,
  };
}

describe('territories', () => {
  it('allows sede vs domicilio exclusivity to coexist on the same city', () => {
    const sede = base({
      id: 't-sede',
      name: 'Llanogrande sede',
      exclusiveFor: 'fixed_location',
      geometry: { kind: 'municipality', countryCode: 'CO', adminName: 'Rionegro' },
    });
    const mobile = base({
      id: 't-dom',
      name: 'Domicilios',
      exclusiveFor: 'home_service',
      geometry: { kind: 'municipality', countryCode: 'CO', adminName: 'Rionegro' },
    });
    expect(findTerritoryConflicts([sede, mobile])).toEqual([]);
  });

  it('detects overlapping exclusive radius territories', () => {
    const a = base({
      id: 'a',
      name: 'A',
      exclusiveFor: 'both',
      geometry: { kind: 'radius', center: { lat: 6.15, lng: -75.42 }, radiusKm: 8 },
    });
    const b = base({
      id: 'b',
      name: 'B',
      exclusiveFor: 'fixed_location',
      geometry: { kind: 'radius', center: { lat: 6.16, lng: -75.42 }, radiusKm: 8 },
    });
    expect(findTerritoryConflicts([a, b])).toHaveLength(1);
  });

  it('does not conflict across tenants', () => {
    const a = base({
      id: 'a',
      name: 'A',
      exclusiveFor: 'both',
      geometry: { kind: 'municipality', countryCode: 'CO', adminName: 'Envigado' },
    });
    const b: Territory = {
      ...a,
      id: 'b',
      tenantId: 'tenant-b',
      name: 'B',
    };
    expect(findTerritoryConflicts([a, b])).toEqual([]);
  });
});
