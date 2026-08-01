import { describe, it, expect } from 'vitest';
import { loadModuleCatalog, getModuleDefinition } from '../catalog';

describe('tenant module catalog', () => {
  it('loads the real catalog file with known modules', () => {
    const catalog = loadModuleCatalog();
    expect(catalog.twenty).toBeDefined();
    expect(catalog.twenty.bootstrap_script).toContain('bootstrap-twenty.sh');
  });

  it('returns null for an unknown module id', () => {
    expect(getModuleDefinition('does-not-exist')).toBeNull();
  });

  it('returns the wacrm module with its "requires" dependency on twenty', () => {
    const wacrm = getModuleDefinition('wacrm');
    expect(wacrm?.requires).toEqual(['twenty']);
  });
});
