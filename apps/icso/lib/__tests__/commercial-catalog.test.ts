import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  buildDiscoveryMailto,
  buildPackageInquiryMessage,
  buildPackageSow,
  commercialCatalog,
  formatSetupPrice,
  getCatalogPackage,
  modulesForPackage,
  mvpModules,
  packagesIncludingModule,
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

  it('builds discovery mailto with package brief', () => {
    const href = buildDiscoveryMailto({
      to: 'hello@intcloudsysops.com',
      packageId: 'hybrid-opsly',
      verticalId: 'swim-school',
    });
    expect(href.startsWith('mailto:hello@intcloudsysops.com?')).toBe(true);
    const decoded = decodeURIComponent(href.replace(/\+/g, ' '));
    expect(decoded).toContain('Hybrid Opsly');
    expect(decoded).toContain('Natación');
    const message = buildPackageInquiryMessage('hybrid-opsly', 'swim-school');
    expect(message).toContain('hybrid-opsly');
    expect(message).toContain(commercialCatalog.sales_pitch_es);
  });

  it('builds one-page SOW text for Hybrid + swim-school', () => {
    const sow = buildPackageSow('hybrid-opsly', 'swim-school');
    expect(sow).not.toBeNull();
    expect(sow!.plainText).toContain('Hybrid Opsly');
    expect(sow!.plainText).toContain('Natación');
    expect(sow!.modules.length).toBeGreaterThan(0);
    expect(packagesIncludingModule('lead-capture').map((pkg) => pkg.id)).toEqual(
      expect.arrayContaining(['hybrid-opsly', 'basic-setup'])
    );
  });

  it('includes module focus in inquiry message', () => {
    const message = buildPackageInquiryMessage(null, null, 'approval-queue');
    expect(message).toContain('approval-queue');
    expect(message).toContain('Approval Queue');
  });
});
