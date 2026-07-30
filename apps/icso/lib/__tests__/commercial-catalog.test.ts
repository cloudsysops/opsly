import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  commercialCatalog,
  formatSetupPrice,
  getCatalogPackage,
  modulesForPackage,
  mvpModules,
} from '@/lib/commercial-catalog';

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(here, '../../../..');

describe('commercial catalog', () => {
  it('keeps ICSO content copy identical to config source of truth', () => {
    const configPath = join(repoRoot, 'config/commercial-catalog.json');
    const appPath = join(repoRoot, 'apps/icso/content/commercial-catalog.json');
    const configRaw = readFileSync(configPath, 'utf8');
    const appRaw = readFileSync(appPath, 'utf8');
    expect(JSON.parse(appRaw)).toEqual(JSON.parse(configRaw));
  });

  it('exposes Hybrid as highlighted sell package', () => {
    const hybrid = getCatalogPackage('hybrid-opsly');
    expect(hybrid).toBeDefined();
    expect(hybrid?.highlighted).toBe(true);
    expect(formatSetupPrice(hybrid!)).toContain('1,200');
  });

  it('maps package module ids to known modules', () => {
    const hybrid = getCatalogPackage('hybrid-opsly');
    expect(hybrid).toBeDefined();
    const mods = modulesForPackage(hybrid!);
    expect(mods.length).toBe(hybrid!.module_ids.length);
    expect(mvpModules().length).toBeGreaterThanOrEqual(5);
  });

  it('lists live/ready verticals for sales', () => {
    const liveOrReady = commercialCatalog.verticals.filter(
      (v) => v.status === 'live' || v.status === 'ready'
    );
    expect(liveOrReady.map((v) => v.id)).toEqual(
      expect.arrayContaining(['swim-school', 'whatsapp-first'])
    );
  });
});
