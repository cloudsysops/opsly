import { describe, it, expect } from 'vitest';
import { loadModuleCatalog, getModuleDefinition, isModuleAutomatable } from '../catalog';

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

  it('does not resolve Object.prototype members as modules', () => {
    // 'constructor' is the only prototype member that passes ModuleIdParamSchema.
    expect(getModuleDefinition('constructor')).toBeNull();
    expect(getModuleDefinition('toString')).toBeNull();
    expect(getModuleDefinition('hasOwnProperty')).toBeNull();
    expect(Object.getPrototypeOf(loadModuleCatalog())).toBeNull();
  });
});

describe('isModuleAutomatable', () => {
  it('is false for modules backed by a bootstrap script', () => {
    const catalog = loadModuleCatalog();
    for (const id of ['twenty', 'wacrm']) {
      expect(catalog[id].bootstrap_script).toBeTruthy();
      expect(isModuleAutomatable(catalog[id])).toBe(false);
    }
  });

  it('is true for modules with no bootstrap script', () => {
    const catalog = loadModuleCatalog();
    for (const id of ['n8n', 'llm', 'uptime']) {
      expect(catalog[id].bootstrap_script).toBeNull();
      expect(isModuleAutomatable(catalog[id])).toBe(true);
    }
  });
});
