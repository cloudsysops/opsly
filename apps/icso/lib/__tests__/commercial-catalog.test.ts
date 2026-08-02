import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  buildDiscoveryMailto,
  buildPackageInquiryMessage,
  buildPackageSow,
  formatSetupPrice,
  getCatalogPackage,
  modulesForPackage,
  mvpModules,
  packagesIncludingModule,
  type CommercialCatalog,
} from '@/lib/commercial-catalog';

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(here, '../../../..');

function loadFixtureCatalog(): CommercialCatalog {
  const configPath = join(repoRoot, 'config/commercial-catalog.json');
  return JSON.parse(readFileSync(configPath, 'utf8')) as CommercialCatalog;
}

describe('commercial catalog helpers', () => {
  const catalog = loadFixtureCatalog();

  it('exposes Hybrid as highlighted sell package', () => {
    const hybrid = getCatalogPackage(catalog, 'hybrid-opsly');
    expect(hybrid).toBeDefined();
    expect(hybrid?.highlighted).toBe(true);
    expect(formatSetupPrice(hybrid!)).toContain('1,200');
  });

  it('maps package module ids to known modules', () => {
    const hybrid = getCatalogPackage(catalog, 'hybrid-opsly');
    expect(hybrid).toBeDefined();
    const mods = modulesForPackage(catalog, hybrid!);
    expect(mods.length).toBe(hybrid!.module_ids.length);
    expect(mvpModules(catalog).length).toBeGreaterThanOrEqual(5);
  });

  it('lists live/ready verticals for sales', () => {
    const liveOrReady = catalog.verticals.filter(
      (v) => v.status === 'live' || v.status === 'ready'
    );
    expect(liveOrReady.map((v) => v.id)).toEqual(
      expect.arrayContaining(['swim-school', 'whatsapp-first'])
    );
  });

  it('builds discovery mailto with package brief', () => {
    const href = buildDiscoveryMailto(catalog, {
      to: 'hello@intcloudsysops.com',
      packageId: 'hybrid-opsly',
      verticalId: 'swim-school',
    });
    expect(href.startsWith('mailto:hello@intcloudsysops.com?')).toBe(true);
    const decoded = decodeURIComponent(href.replace(/\+/g, ' '));
    expect(decoded).toContain('Hybrid Opsly');
    expect(decoded).toContain('Natación');
    const message = buildPackageInquiryMessage(catalog, 'hybrid-opsly', 'swim-school');
    expect(message).toContain('hybrid-opsly');
    expect(message).toContain(catalog.sales_pitch_es);
  });

  it('builds one-page SOW text for Hybrid + swim-school', () => {
    const sow = buildPackageSow(catalog, 'hybrid-opsly', 'swim-school');
    expect(sow).not.toBeNull();
    expect(sow!.plainText).toContain('Hybrid Opsly');
    expect(sow!.plainText).toContain('Natación');
    expect(sow!.modules.length).toBeGreaterThan(0);
    expect(packagesIncludingModule(catalog, 'lead-capture').map((pkg) => pkg.id)).toEqual(
      expect.arrayContaining(['hybrid-opsly', 'basic-setup'])
    );
  });

  it('includes module focus in inquiry message', () => {
    const message = buildPackageInquiryMessage(catalog, null, null, 'approval-queue');
    expect(message).toContain('approval-queue');
  });

  it('keeps modules/[id] open to dynamicParams for CMS-added modules', () => {
    const pagePath = join(here, '../../app/modules/[id]/page.tsx');
    const source = readFileSync(pagePath, 'utf8');
    expect(source).toMatch(/export const dynamicParams\s*=\s*true/);
  });
});
