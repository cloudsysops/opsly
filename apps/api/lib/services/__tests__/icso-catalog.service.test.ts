import { mkdirSync, writeFileSync } from 'node:fs';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { CommercialCatalog, EditableCatalogFields } from '../icso-catalog.service';

vi.mock('../../tools-execute', () => ({
  resolveOpslyRepoRoot: vi.fn(),
}));

import { resolveOpslyRepoRoot } from '../../tools-execute';
import {
  assertReferentialIntegrity,
  computeEtag,
  findModuleReferences,
  findPackageReferences,
  readCatalog,
  saveCatalog,
} from '../icso-catalog.service';

const baseCatalog: CommercialCatalog = {
  version: '1.0.0',
  updated: '2026-01-01',
  owner: 'icso',
  currency: 'USD',
  disclaimer: 'Test disclaimer',
  source_docs: ['docs/example.md'],
  sales_pitch_es: 'Pitch de prueba',
  repeat_commands: { list: 'echo list' },
  modules: [
    {
      id: 'lead-capture',
      label: 'Lead Capture',
      label_es: 'Captura',
      mvp_default: true,
      risk: 'low',
      summary: 'Forms',
    },
    {
      id: 'follow-up',
      label: 'Follow-up',
      label_es: 'Seguimiento',
      mvp_default: true,
      risk: 'medium',
      summary: 'Reminders',
    },
  ],
  packages: [
    {
      id: 'basic-setup',
      name: 'Basic Setup',
      name_es: 'Arranque',
      ideal_for: 'SMB',
      setup_range_usd: { min: 400, max: 900 },
      ops_monthly_usd: null,
      highlighted: false,
      module_ids: ['lead-capture'],
      includes: ['Discovery'],
      excludes: ['WhatsApp'],
    },
  ],
  verticals: [
    {
      id: 'swim-school',
      label: 'Natación',
      reference_tenant: 'peskids',
      status: 'live',
      recommended_package_id: 'basic-setup',
    },
  ],
};

function editableFromCatalog(catalog: CommercialCatalog): EditableCatalogFields {
  return {
    modules: catalog.modules,
    packages: catalog.packages,
    verticals: catalog.verticals,
    disclaimer: catalog.disclaimer,
    sales_pitch_es: catalog.sales_pitch_es,
    currency: catalog.currency,
  };
}

function writeCatalogFile(repoRoot: string, catalog: CommercialCatalog): string {
  const configDir = path.join(repoRoot, 'config');
  mkdirSync(configDir, { recursive: true });
  const filePath = path.join(configDir, 'commercial-catalog.json');
  const raw = `${JSON.stringify(catalog, null, 2)}\n`;
  writeFileSync(filePath, raw, 'utf8');
  return raw;
}

describe('icso-catalog.service', () => {
  let repoRoot = '';

  beforeEach(async () => {
    repoRoot = await mkdtemp(path.join(os.tmpdir(), 'icso-catalog-'));
    vi.mocked(resolveOpslyRepoRoot).mockReturnValue(repoRoot);
    writeCatalogFile(repoRoot, structuredClone(baseCatalog));
  });

  afterEach(async () => {
    await rm(repoRoot, { recursive: true, force: true });
    vi.clearAllMocks();
  });

  it('reads and validates a valid catalog with etag', () => {
    const raw = writeCatalogFile(repoRoot, structuredClone(baseCatalog));
    const { catalog, etag } = readCatalog();

    expect(catalog.version).toBe('1.0.0');
    expect(catalog.modules).toHaveLength(2);
    expect(etag).toBe(computeEtag(raw));
  });

  it('rejects invalid zod shape on read', () => {
    const broken = { ...structuredClone(baseCatalog), modules: [{ id: '' }] };
    writeCatalogFile(repoRoot, broken as CommercialCatalog);
    expect(() => readCatalog()).toThrow(/modules\.0\.id/);
  });

  it('reports referential integrity violations', () => {
    const broken = structuredClone(baseCatalog);
    broken.packages[0].module_ids = ['missing-module'];
    expect(assertReferentialIntegrity(broken)).toEqual([
      'package "basic-setup" references unknown module "missing-module"',
    ]);
  });

  it('finds module and package references', () => {
    expect(findModuleReferences(baseCatalog, 'lead-capture')).toEqual(['package "basic-setup"']);
    expect(findPackageReferences(baseCatalog, 'basic-setup')).toEqual(['vertical "swim-school"']);
  });

  it('returns stale when etag mismatches', () => {
    const { etag } = readCatalog();
    const editable = editableFromCatalog(baseCatalog);
    editable.disclaimer = 'Updated disclaimer';

    const result = saveCatalog(editable, `${etag}-stale`);
    expect(result).toEqual({ ok: false, reason: 'stale' });
  });

  it('blocks deleting a module still referenced by a package', () => {
    const { etag } = readCatalog();
    const editable = editableFromCatalog(baseCatalog);
    editable.modules = editable.modules.filter((mod) => mod.id !== 'lead-capture');

    const result = saveCatalog(editable, etag);
    expect(result).toEqual({
      ok: false,
      reason: 'referenced',
      details: ['package "basic-setup" references removed module "lead-capture"'],
    });
  });

  it('blocks deleting a package still referenced by a vertical', () => {
    const { etag } = readCatalog();
    const editable = editableFromCatalog(baseCatalog);
    editable.packages = [];

    const result = saveCatalog(editable, etag);
    expect(result).toEqual({
      ok: false,
      reason: 'referenced',
      details: ['vertical "swim-school" references removed package "basic-setup"'],
    });
  });

  it('saves successfully, updates etag and updated date', async () => {
    const { etag } = readCatalog();
    const editable = editableFromCatalog(baseCatalog);
    editable.disclaimer = 'Nuevo disclaimer comercial';

    const result = saveCatalog(editable, etag);
    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    const raw = await readFile(path.join(repoRoot, 'config', 'commercial-catalog.json'), 'utf8');
    const saved = JSON.parse(raw) as CommercialCatalog;

    expect(saved.disclaimer).toBe('Nuevo disclaimer comercial');
    expect(saved.updated).toBe(new Date().toISOString().slice(0, 10));
    expect(saved.version).toBe('1.0.0');
    expect(saved.repeat_commands).toEqual(baseCatalog.repeat_commands);
    expect(result.etag).toBe(computeEtag(raw));

    const reread = readCatalog();
    expect(reread.etag).toBe(result.etag);
  });

  it('returns invalid for malformed editable payload', () => {
    const { etag } = readCatalog();
    const editable = editableFromCatalog(baseCatalog);
    editable.currency = '';

    const result = saveCatalog(editable, etag);
    expect(result).toEqual({
      ok: false,
      reason: 'invalid',
      message: 'currency: String must contain at least 1 character(s)',
    });
  });
});
