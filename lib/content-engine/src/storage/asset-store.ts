import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import type { Asset, AssetType } from '../domain/types.js';
import { newAssetId } from '../domain/ids.js';
import { resolveAssetPath } from './paths.js';

export class AssetNotFoundError extends Error {
  constructor(public readonly tenantId: string, public readonly relativePath: string) {
    super(`Asset "${relativePath}" not found under tenant "${tenantId}"`);
    this.name = 'AssetNotFoundError';
  }
}

/**
 * Registers a manually-supplied asset already present on disk under the
 * tenant's data/content/tenants/<tenant>/assets/ directory. Computes a real
 * checksum from file bytes — does not trust caller-supplied metadata.
 */
export function registerAsset(params: {
  tenantId: string;
  projectId: string;
  type: AssetType;
  relativePath: string;
  source?: Asset['source'];
  license?: string;
  metadata?: Record<string, unknown>;
}): Asset {
  const absolutePath = resolveAssetPath(params.tenantId, params.relativePath);
  if (!existsSync(absolutePath)) {
    throw new AssetNotFoundError(params.tenantId, params.relativePath);
  }
  const bytes = readFileSync(absolutePath);
  const checksum = createHash('sha256').update(bytes).digest('hex');

  return {
    id: newAssetId(),
    tenantId: params.tenantId,
    projectId: params.projectId,
    type: params.type,
    path: params.relativePath,
    source: params.source ?? 'manual',
    license: params.license ?? 'unspecified',
    checksum,
    metadata: params.metadata ?? {},
  };
}

/** Returns the absolute filesystem path for an asset, enforcing tenant isolation. */
export function assetAbsolutePath(asset: Asset): string {
  return resolveAssetPath(asset.tenantId, asset.path);
}

export function assetExists(asset: Asset): boolean {
  try {
    return existsSync(assetAbsolutePath(asset));
  } catch {
    return false;
  }
}
