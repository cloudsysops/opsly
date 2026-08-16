import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { assetAbsolutePath, AssetNotFoundError, registerAsset } from '../storage/asset-store.js';
import { resolveAssetPath, tenantAssetsDir } from '../storage/paths.js';
import type { Asset } from '../domain/types.js';

let root: string;

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), 'content-engine-asset-store-test-'));
  process.env.CONTENT_ENGINE_ROOT_OVERRIDE = root;
});

afterEach(() => {
  delete process.env.CONTENT_ENGINE_ROOT_OVERRIDE;
  rmSync(root, { recursive: true, force: true });
});

describe('resolveAssetPath — tenant isolation', () => {
  it('resolves a plain relative path inside the tenant asset dir', () => {
    const resolved = resolveAssetPath('tenant-a', 'proj/scene-01.png');
    expect(resolved).toBe(join(tenantAssetsDir('tenant-a'), 'proj', 'scene-01.png'));
  });

  it('blocks a path traversal attempt that escapes the tenant asset dir', () => {
    expect(() => resolveAssetPath('tenant-a', '../tenant-b/secret.png')).toThrow(/cross-tenant/);
  });

  it('blocks a deeper traversal attempt reaching outside content/ entirely', () => {
    expect(() => resolveAssetPath('tenant-a', '../../../../etc/passwd')).toThrow(/cross-tenant/);
  });

  it('allows the tenant asset root itself', () => {
    expect(() => resolveAssetPath('tenant-a', '.')).not.toThrow();
  });
});

describe('registerAsset', () => {
  it('computes a real sha256 checksum from file bytes, not caller-supplied metadata', () => {
    const dir = tenantAssetsDir('tenant-a');
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, 'img.png'), 'hello-world-bytes', 'utf8');

    const asset = registerAsset({ tenantId: 'tenant-a', projectId: 'p1', type: 'image', relativePath: 'img.png' });
    expect(asset.checksum).toHaveLength(64); // sha256 hex
    expect(asset.checksum).not.toBe('hello-world-bytes');
  });

  it('two different files produce two different checksums', () => {
    const dir = tenantAssetsDir('tenant-a');
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, 'a.png'), 'content-a', 'utf8');
    writeFileSync(join(dir, 'b.png'), 'content-b', 'utf8');

    const assetA = registerAsset({ tenantId: 'tenant-a', projectId: 'p1', type: 'image', relativePath: 'a.png' });
    const assetB = registerAsset({ tenantId: 'tenant-a', projectId: 'p1', type: 'image', relativePath: 'b.png' });
    expect(assetA.checksum).not.toBe(assetB.checksum);
  });

  it('throws AssetNotFoundError when the file does not exist on disk', () => {
    expect(() =>
      registerAsset({ tenantId: 'tenant-a', projectId: 'p1', type: 'image', relativePath: 'ghost.png' })
    ).toThrow(AssetNotFoundError);
  });

  it('defaults source to "manual" and honors an explicit override', () => {
    const dir = tenantAssetsDir('tenant-a');
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, 'p.png'), 'x', 'utf8');
    const manual = registerAsset({ tenantId: 'tenant-a', projectId: 'p1', type: 'image', relativePath: 'p.png' });
    expect(manual.source).toBe('manual');
    const placeholder = registerAsset({
      tenantId: 'tenant-a',
      projectId: 'p1',
      type: 'image',
      relativePath: 'p.png',
      source: 'placeholder',
    });
    expect(placeholder.source).toBe('placeholder');
  });
});

describe('assetAbsolutePath', () => {
  it('re-derives the absolute path through the same tenant-isolation check', () => {
    const dir = tenantAssetsDir('tenant-a');
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, 'x.png'), 'x', 'utf8');
    const asset: Asset = {
      id: 'a1',
      tenantId: 'tenant-a',
      projectId: 'p1',
      type: 'image',
      path: 'x.png',
      source: 'manual',
      license: 'x',
      checksum: 'x',
      metadata: {},
    };
    expect(assetAbsolutePath(asset)).toBe(join(dir, 'x.png'));
  });

  it('throws if a stored asset record has been tampered with to point outside its tenant', () => {
    const asset: Asset = {
      id: 'a1',
      tenantId: 'tenant-a',
      projectId: 'p1',
      type: 'image',
      path: '../tenant-b/x.png',
      source: 'manual',
      license: 'x',
      checksum: 'x',
      metadata: {},
    };
    expect(() => assetAbsolutePath(asset)).toThrow(/cross-tenant/);
  });
});
