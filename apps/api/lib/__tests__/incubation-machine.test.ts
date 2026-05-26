import { describe, expect, it } from 'vitest';
import { getIncubationMachineSnapshot } from '../incubation-machine';

describe('getIncubationMachineSnapshot', () => {
  it('builds a default incubator plan for the pilot tenant', async () => {
    const snapshot = await getIncubationMachineSnapshot();

    expect(snapshot.selected_tenant_slug).toBe('peskids');
    expect(snapshot.bundle.components.length).toBeGreaterThan(0);
    expect(snapshot.steps.length).toBeGreaterThanOrEqual(4);
    expect(snapshot.gates.some((gate) => gate.id === 'extraction-prep')).toBe(true);
    expect(snapshot.summary.length).toBeGreaterThan(0);
  });

  it('resolves a tenant-specific incubation plan when requested', async () => {
    const snapshot = await getIncubationMachineSnapshot({ tenantSlug: 'legalvial' });

    expect(snapshot.selected_tenant_slug).toBe('legalvial');
    expect(snapshot.selected_tenant?.slug).toBe('legalvial');
    expect(snapshot.candidates.some((candidate) => candidate.slug === 'peskids')).toBe(true);
  });
});
